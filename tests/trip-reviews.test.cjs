const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, URL, require: name => {
    if (!(name in dependencies)) throw new Error(`Unexpected import: ${name}`);
    return dependencies[name];
  }});
  return exports;
}
const dates = load('src/lib/tripReview.ts');
test('reviews open at the start of the inclusive return date in Bangkok', () => {
  const trip = { departureDate: '2027-03-10', durationDays: 5 };
  assert.equal(dates.isTripReviewOpen(trip, Date.parse('2027-03-13T23:59:59.999+07:00')), false);
  assert.equal(dates.isTripReviewOpen(trip, Date.parse('2027-03-14T00:00:00+07:00')), true);
  assert.equal(dates.isTripReviewOpen(trip, Date.parse('2027-03-14T12:00:00+07:00')), true);
});
test('single-day trips, year boundaries and leap years', () => {
  assert.equal(dates.reviewOpensAt({ departureDate: '2026-12-31', durationDays: 1 }), Date.parse('2026-12-31T00:00:00+07:00'));
  assert.equal(dates.reviewOpensAt({ departureDate: '2026-12-31', durationDays: 2 }), Date.parse('2027-01-01T00:00:00+07:00'));
  assert.equal(dates.reviewOpensAt({ departureDate: '2028-02-28', durationDays: 2 }), Date.parse('2028-02-29T00:00:00+07:00'));
  assert.equal(dates.isTripReviewOpen({ departureDate: '', durationDays: 0 }), false);
});
function api(session, results = {}) {
  const calls = [];
  const supabase = { from(table) {
    const query = { then(resolve, reject) { return Promise.resolve(results[table] || { data: null, error: null }).then(resolve, reject); } };
    for (const method of ['select', 'eq', 'maybeSingle', 'single', 'limit', 'order', 'range', 'insert', 'update']) query[method] = (...args) => { calls.push([table, method, ...args]); return query; };
    return query;
  }};
  return { calls, ...load('src/app/api/reviews/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    'next-auth': { getServerSession: async () => session },
    '../auth/[...nextauth]/route': { authOptions: {} },
    '@/lib/supabase': { supabase }, '@/lib/tripReview': dates,
  }) };
}
const request = (body, url = 'http://localhost/api/reviews?tripId=trip-1') => ({ url, json: async () => body });
const user = { user: { id: 'actual-user' } };
test('only currently authorized admins can hide or restore reviews', async () => {
  const body = { id: '00000000-0000-0000-0000-000000000001', isHidden: true };
  assert.equal((await api(null).PATCH(request(body))).status, 401);
  assert.equal((await api(user).PATCH(request(body))).status, 403);
  const admin = { user: { id: 'admin-1', role: 'admin' } };
  for (const record of [{ username: 'staff', permissions: [] }, { username: 'admin', isBlocked: true }]) {
    const routes = api(admin, { admins: { data: record } });
    assert.equal((await routes.PATCH(request(body))).status, 403);
    assert.equal(routes.calls.some(call => call[1] === 'update'), false);
  }
  const results = { admins: { data: { username: 'staff', permissions: ['reviews'], isBlocked: false } }, trip_reviews: { data: body } };
  for (const isHidden of [true, false]) {
    const routes = api(admin, results);
    assert.equal((await routes.PATCH(request({ ...body, isHidden, rating: 1, comment: 'overwrite' }))).status, 200);
    const update = routes.calls.find(call => call[1] === 'update')[2];
    assert.deepEqual(Object.keys(update), ['isHidden']);
    assert.equal(update.isHidden, isHidden);
  }
  assert.equal((await api(admin, results).PATCH(request({ ...body, isHidden: 'false' }))).status, 400);
  assert.equal((await api(admin, results).PATCH(request({ ...body, id: 'invalid' }))).status, 400);
  assert.equal((await api(admin, { ...results, trip_reviews: { data: null } }).PATCH(request(body))).status, 404);
});
const expired = { data: { id: 'trip-1', departureDate: '2020-01-01', durationDays: 1 } };
test('unauthenticated visitors cannot read or submit reviews', async () => {
  const routes = api(null);
  assert.equal((await routes.GET(request())).status, 401);
  assert.equal((await routes.POST(request({}))).status, 401);
  assert.equal(routes.calls.length, 0);
});
test('customers and admins without current permission cannot read all reviews', async () => {
  assert.equal((await api(user).GET(request(null, 'http://localhost/api/reviews?admin=1'))).status, 403);
  const routes = api({ user: { id: 'admin-1', role: 'admin' } }, { admins: { data: { username: 'staff', permissions: [], isBlocked: false } } });
  assert.equal((await routes.GET(request(null, 'http://localhost/api/reviews?admin=1'))).status, 403);
});
test('reject invalid ratings, oversized comments, unfinished trips and nonparticipants', async () => {
  for (const body of [null, { tripId: 'trip-1', rating: 0, comment: '' }, { tripId: 'trip-1', rating: 1.5, comment: '' }, { tripId: 'trip-1', rating: 5, comment: 'x'.repeat(2001) }]) assert.equal((await api(user).POST(request(body))).status, 400);
  const body = { tripId: 'trip-1', rating: 5, comment: '' };
  assert.equal((await api(user, { trips: { data: { departureDate: '2099-01-01', durationDays: 1 } } }).POST(request(body))).status, 409);
  assert.equal((await api(user, { trips: expired, bookings: { data: [] } }).POST(request(body))).status, 403);
});
test('submission uses session identity, trims comment, and rejects database uniqueness conflicts', async () => {
  const results = { trips: expired, bookings: { data: [{ nickname: 'Traveller' }] }, trip_reviews: { data: { id: 'review-1' } } };
  const routes = api(user, results);
  const body = { tripId: 'trip-1', lineUserId: 'forged-user', rating: 4, comment: ' good ' };
  assert.equal((await routes.POST(request(body))).status, 201);
  const insert = routes.calls.find(call => call[1] === 'insert')[2];
  assert.equal(insert.lineUserId, 'actual-user');
  assert.equal(insert.comment, 'good');
  assert.equal((await api(user, { ...results, trip_reviews: { error: { code: '23505' } } }).POST(request(body))).status, 409);
});
