const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, dependencies = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => {
    if (!(name in dependencies)) throw new Error(`Unexpected import: ${name}`);
    return dependencies[name];
  }});
  return exports;
}
const helpers = load('src/lib/extraSeat.ts');
const original = [10, 9, 8].map((label, i) => ({
  id: `van-seat-${label}`, label: String(label), type: 'customer',
  status: 'available', row: 4, col: i + 1,
}));

test('extra seat is bookable, between 10 and 9, and enabling twice is idempotent', () => {
  const seats = helpers.setExtraSeat(original, 'van', true);
  assert.equal(seats.length, 4);
  assert.equal(original.length, 3);
  assert.equal(seats[3].type, 'customer');
  assert.equal(seats[3].status, 'available');
  assert.equal([...seats].sort((a, b) => a.col - b.col).map(s => s.label).join(','), '10,เสริม,9,8');
  assert.equal(helpers.setExtraSeat(seats, 'van', true).length, 4);
  assert.equal(JSON.stringify(helpers.setExtraSeat(seats, 'van', false)), JSON.stringify(original));
});

test('occupied seats cannot be removed', () => {
  for (const patch of [{ status: 'booked' }, { status: 'pending' }, { bookingId: 'booking' }]) {
    const seats = helpers.setExtraSeat(original, 'van', true);
    Object.assign(seats[3], patch);
    assert.throws(() => helpers.setExtraSeat(seats, 'van', false));
  }
});

async function request({ enabled = false, user = { role: 'admin', username: 'admin' }, bookings = [], conflict = false } = {}) {
  let written;
  const seats = helpers.setExtraSeat(original, 'van', true);
  const supabase = { from(table) {
    let updating = false;
    const query = {
      select() { return query; }, eq() { return query; }, in() { return query; },
      limit() { return Promise.resolve({ data: bookings }); },
      single() { return Promise.resolve({ data: { id: 'van', seats } }); },
      update(value) { updating = true; written = value; return query; },
      then(resolve) { return Promise.resolve({ data: updating ? (conflict ? [] : [{ id: 'van' }]) : [] }).then(resolve); },
    };
    assert.ok(['vans', 'bookings'].includes(table));
    return query;
  }};
  const route = load('src/app/api/vans/[id]/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    '@/lib/supabase': { supabase }, 'next-auth': { getServerSession: async () => user ? { user } : null },
    '../../auth/[...nextauth]/route': { authOptions: {} }, '@/lib/extraSeat': helpers,
  });
  const response = await route.PUT({ json: async () => ({ extraSeatEnabled: enabled }) }, { params: Promise.resolve({ id: 'van' }) });
  return { ...response, written };
}

test('API rejects unauthenticated and unauthorized callers', async () => {
  for (const user of [null, { role: 'admin', username: 'limited', permissions: [] }]) {
    const result = await request({ user });
    assert.equal(result.status, 403);
    assert.equal(result.written, undefined);
  }
});
test('API rejects non-boolean toggle values', async () => assert.equal((await request({ enabled: 'false' })).status, 400));
test('API blocks pending transfer even when seat is available', async () => {
  const result = await request({ bookings: [{ id: 'pending-transfer' }] });
  assert.equal(result.status, 409);
  assert.equal(result.written, undefined);
});
test('authorized staff can remove empty extra seat', async () => {
  const result = await request({ user: { role: 'admin', username: 'staff', permissions: ['vans'] } });
  assert.equal(result.status, 200);
  assert.equal(result.written.seats.length, 3);
});
test('API reports concurrent seat changes instead of success', async () => {
  assert.equal((await request({ conflict: true })).status, 409);
});
