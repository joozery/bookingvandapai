const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const moduleExports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/bookingLeaderboard.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: moduleExports });
const { bookingLeaderboard } = moduleExports;
const booking = (user, trip, extra = {}) => ({ lineUserId: user, tripId: trip, nickname: user, status: 'approved', createdAt: '2026-10-01', ...extra });

test('counts unique approved rounds per account, excluding pending and rejected bookings', () => {
  const rows = bookingLeaderboard([
    booking('A', '1'), booking('A', '1'), booking('A', '2'),
    booking('A', '3', { status: 'pending' }), booking('A', '4', { status: 'rejected' }),
    booking('A', '5', { status: 'cancel_pending' }), booking('B', '1'),
  ]);
  assert.equal(rows[0].tripCount, 2);
  assert.equal(rows[1].tripCount, 1);
});

test('ties share ranks, distinct accounts with same nickname stay separate, newest nickname wins', () => {
  const rows = bookingLeaderboard([
    booking('A', '1', { nickname: 'Old' }), booking('A', '2', { nickname: 'New', createdAt: '2026-10-02' }),
    booking('B', '1', { nickname: 'Same' }), booking('C', '1', { nickname: 'Same' }),
  ]);
  assert.equal(rows[0].nickname, 'New');
  assert.equal(rows.length, 3);
  assert.equal(rows[1].rank, 2);
  assert.equal(rows[2].rank, 2);
  for (const row of rows) assert.equal(Object.keys(row).sort().join(','), 'nickname,rank,tripCount');
});

test('empty and invalid records produce no fabricated ranking', () => {
  assert.equal(bookingLeaderboard([]).length, 0);
  assert.equal(bookingLeaderboard([booking('', '1'), booking('A', '')]).length, 0);
});

test('hidden users disappear and ranks/counts are recomputed; restoring preserves bookings', () => {
  const bookings = [booking('A', '1'), booking('A', '2'), booking('B', '1'), booking('C', '1')];
  const hidden = bookingLeaderboard(bookings, new Set(['A']));
  assert.equal(hidden.length, 2);
  assert.equal(hidden[0].rank, 1);
  assert.equal(hidden[1].rank, 1);
  const restored = bookingLeaderboard(bookings);
  assert.equal(restored[0].nickname, 'A');
  assert.equal(restored[0].tripCount, 2);
});

test('visibility markers persist independently and storage failures fail closed', async () => {
  const files = new Map();
  let fail = false;
  const storage = {
    list: async () => fail ? { error: new Error('Unavailable') } : { data: [...files.keys()].map(path => ({ name: path.split('/').pop() })) },
    upload: async (path, body) => { files.set(path, body); return { error: null }; },
    remove: async paths => { paths.forEach(path => files.delete(path)); return { error: null }; },
  };
  const store = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/leaderboardStore.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports: store, require: name => name === 'node:crypto' ? require('node:crypto') : { supabase: { storage: { from: () => storage } } } });
  const a = store.leaderboardKey('A'), b = store.leaderboardKey('B');
  await Promise.all([store.setLeaderboardHidden(a, true), store.setLeaderboardHidden(b, true)]);
  assert.equal((await store.loadHiddenLeaderboardKeys()).size, 2);
  await store.setLeaderboardHidden(a, false);
  const remaining = await store.loadHiddenLeaderboardKeys();
  assert.equal(remaining.has(a), false);
  assert.equal(remaining.has(b), true);
  fail = true;
  await assert.rejects(store.loadHiddenLeaderboardKeys());
});

test('admin endpoints reject anonymous users before accessing leaderboard records', async () => {
  const api = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/admin/leaderboard/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports: api, require: name => {
    if (name === 'next/server') return { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } };
    if (name === 'next-auth') return { getServerSession: async () => null };
    if (name.includes('auth/')) return { authOptions: {} };
    return {};
  } });
  assert.equal((await api.GET()).status, 403);
  assert.equal((await api.PATCH({ json: () => { throw new Error('Must not read payload'); } })).status, 403);
});
