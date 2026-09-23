const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function api(trip, reviews, fail = false) {
  const calls = [];
  const supabase = { from(table) {
    let fields = [];
    let filters = [];
    let start = 0;
    let end = Infinity;
    const query = {
      select(value) { fields = value.split(',').map(x => x.trim()); calls.push([table, 'select', fields]); return query; },
      eq(key, value) { filters.push([key, value]); calls.push([table, 'eq', key, value]); return query; },
      maybeSingle() { return query; }, order() { return query; },
      range(from, to) { start = from; end = to; return query; },
      then(resolve, reject) {
        let data = table === 'trips' ? trip : reviews.filter(row => filters.every(([key, value]) => row[key] === value)).slice(start, end + 1).map(row => Object.fromEntries(fields.map(key => [key, row[key]])));
        return Promise.resolve({ data, error: fail ? { message: 'Database unavailable' } : null }).then(resolve, reject);
      },
    };
    return query;
  }};
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('src/app/api/reviews/public/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, URL, require: name => {
    if (name === '@/lib/supabase') return { supabase };
    if (name === 'next/server') return { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200, headers: options?.headers }) } };
    throw new Error(`Unexpected dependency: ${name}`);
  }});
  return { ...exports, calls };
}
const trip = { id: 'trip-1', status: 'completed', name: 'Completed trip' };
const review = (id, rating, isHidden = false, tripId = 'trip-1') => ({ id, rating, isHidden, tripId, comment: `comment-${id}`, createdAt: '2026-01-01T00:00:00Z', lineUserId: 'private-line-id', reviewerName: 'Private name' });
const request = (params = 'tripId=trip-1') => ({ url: `http://localhost/api/reviews/public?${params}` });

test('anonymous public reads omit hidden reviews and identities and average visible scores only', async () => {
  const routes = api(trip, [review('visible-1', 5), review('visible-2', 3), review('hidden', 1, true), review('other-trip', 1, false, 'trip-2')]);
  const result = await routes.GET(request());
  assert.equal(result.status, 200);
  assert.equal(result.body.count, 2);
  assert.equal(result.body.average, 4);
  assert.equal(result.body.reviews.length, 2);
  assert.equal(JSON.stringify(result.body).includes('comment-hidden'), false);
  assert.equal(JSON.stringify(result.body).includes('private-line-id'), false);
  assert.equal(JSON.stringify(result.body).includes('Private name'), false);
  assert.equal(result.headers['Cache-Control'], 'no-store');
});
test('restoring a review restores its contribution; all-hidden results have no average', async () => {
  const hidden = review('one', 2, true);
  let result = await api(trip, [hidden]).GET(request());
  assert.equal(result.body.count, 0);
  assert.equal(result.body.average, null);
  result = await api(trip, [{ ...hidden, isHidden: false }]).GET(request());
  assert.equal(result.body.count, 1);
  assert.equal(result.body.average, 2);
});
test('unfinished, reopened and missing trips cannot expose reviews', async () => {
  for (const value of [null, { ...trip, status: 'active' }]) {
    const routes = api(value, [review('visible', 5)]);
    assert.equal((await routes.GET(request())).status, 404);
    assert.equal(routes.calls.some(call => call[0] === 'trip_reviews'), false);
  }
});
test('averages span every page, including datasets larger than the database row limit', async () => {
  const rows = Array.from({ length: 1001 }, (_, index) => review(String(index), index === 1000 ? 1 : 5));
  const result = await api(trip, rows).GET(request('tripId=trip-1&page=101'));
  assert.equal(result.body.count, 1001);
  assert.equal(result.body.average, 5001 / 1001);
  assert.equal(result.body.reviews.length, 1);
  assert.equal(result.body.pageCount, 101);
});
test('reject invalid input and handle database failure without exposing details', async () => {
  assert.equal((await api(trip, []).GET(request('page=1'))).status, 400);
  assert.equal((await api(trip, []).GET(request('tripId=trip-1&page=-1'))).status, 400);
  assert.equal((await api(trip, [], true).GET(request())).status, 500);
});
