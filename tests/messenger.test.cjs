const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');

function load(file, dependencies = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, Buffer, Response, URL, AbortSignal, console, ...globals, require: name => {
    if (!(name in dependencies)) throw new Error(`Unexpected import ${name}`);
    return dependencies[name];
  }});
  return exports;
}
const dates = load('src/lib/dateFormat.ts');
const helpers = load('src/lib/messenger.ts', { 'node:crypto': crypto, './dateFormat': dates });
const contacts = load('src/lib/contact.ts');
const availability = load('src/lib/seatAvailability.ts');
const logging = load('src/lib/messengerLogging.ts', { 'node:crypto': crypto }, { console: { info() {}, error() {} } });

test('reply formats real price and zero availability, omitting missing or invalid optional data', () => {
  const trip = { name: 'Trip', departureDate: '2026-09-23', status: 'active' };
  for (const cost of [3990, '3990']) assert.ok(helpers.tripReply({ ...trip, cost }).includes('ราคา 3,990 บาท/ท่าน'));
  assert.ok(helpers.tripReply({ ...trip, cost: 0 }).includes('ราคา 0 บาท/ท่าน'));
  for (const cost of [undefined, null, '', ' ', 'invalid', NaN, Infinity, -1, true]) {
    assert.ok(!helpers.tripReply({ ...trip, cost }).includes('ราคา'));
  }
  for (const availableSeats of [7, 0]) {
    assert.ok(helpers.tripReply({ ...trip, availableSeats }).includes(`ที่นั่งว่าง ${availableSeats} ที่นั่ง`));
  }
  for (const availableSeats of [undefined, null, NaN, Infinity, -1, 1.5]) {
    const reply = helpers.tripReply({ ...trip, availableSeats });
    assert.ok(!reply.includes('ที่นั่งว่าง'));
    assert.ok(!/undefined|null|NaN/.test(reply));
  }
  const completed = { ...trip, status: 'completed' };
  assert.equal(helpers.tripReply({ ...completed, cost: 3990, availableSeats: 7 }), helpers.tripReply(completed));
  const optionalMissing = helpers.tripReply(trip);
  assert.ok(!optionalMissing.includes('เวลา '));
  assert.ok(!optionalMissing.includes('สถานที่ขึ้นรถ:'));
});

test('shared booking availability counts available customer/staff and extra seats across vans', () => {
  const seat = (type, status, extra = {}) => ({ type, status, ...extra });
  const vans = [{ seats: [seat('driver', 'available'), seat('customer', 'booked'), seat('staff', 'available'), seat('customer', 'pending')] },
    { seats: [seat('customer', 'available', { id: 'van-seat-extra' }), seat('customer', 'available')] }];
  assert.equal(availability.countAvailableSeats(vans), 3);
  vans[0].seats[1].status = 'available'; // Cancellation/rejection releases the stored seat.
  assert.equal(availability.countAvailableSeats(vans), 4);
  assert.equal(availability.countAvailableSeats([{ seats: [seat('customer', 'booked')] }]), 0);
  assert.equal(availability.countAvailableSeats([]), 0);
  assert.equal(availability.countAvailableSeats([{ seats: [seat('customer', 'blocked'), seat('customer', 'available')] }]), 1);
  assert.equal(availability.countAvailableSeats([{ seats: [seat('customer', 'blocked')] }]), 0);
  for (const invalid of [null, undefined, [{}], [{ seats: null }], [{ seats: [null] }], [{ seats: [{ type: 'customer' }] }]]) {
    assert.equal(availability.countAvailableSeats(invalid), null);
  }
});

test('webhook uses current van availability and still replies if optional lookup fails', async () => {
  const env = { MESSENGER_APP_SECRET: 'test-secret', MESSENGER_PAGE_ACCESS_TOKEN: 'test-token', MESSENGER_PAGE_ID: '123', MESSENGER_GRAPH_API_VERSION: 'v99.0' };
  for (const scenario of ['available', 'full', 'missing', 'error', 'throws', 'completed', 'not_found']) {
    const sent = [];
    let vanLookups = 0;
    const route = load('src/app/api/messenger/webhook/route.ts', {
      '@/lib/messenger': helpers, '@/lib/messengerLogging': logging, '@/lib/seatAvailability': availability,
      '@/lib/supabase': { supabase: { from(table) {
        return { select(fields) {
          if (table === 'trips') assert.ok(fields.includes('cost'));
          return this;
        }, eq(field, id) {
          assert.equal(id, 'one');
          if (table === 'trips') return this;
          assert.equal(table, 'vans'); assert.equal(field, 'tripId'); vanLookups++;
          if (scenario === 'throws') throw new Error('Unavailable');
          return { data: scenario === 'missing' ? null : [{ seats: [{ type: 'customer', status: scenario === 'full' ? 'booked' : 'available' }] }], error: scenario === 'error' ? { message: 'Unavailable' } : null };
        }, async maybeSingle() {
          return { data: scenario === 'not_found' ? null : { name: 'Trip', departureDate: '2026-09-23', cost: 3990, status: scenario === 'completed' ? 'completed' : 'active' } };
        } };
      } } },
    }, { process: { env }, fetch: async (url, options) => { sent.push(JSON.parse(options.body).message.text); return { ok: true, status: 200 }; } });
    const body = JSON.stringify({ object: 'page', entry: [{ id: '123', messaging: [{ sender: { id: '456' }, recipient: { id: '123' }, referral: { ref: 'trip:one' } }] }] });
    const signature = 'sha256=' + crypto.createHmac('sha256', env.MESSENGER_APP_SECRET).update(body).digest('hex');
    assert.equal((await route.POST(new Request('https://example.com/', { method: 'POST', body, headers: { 'x-hub-signature-256': signature } }))).status, 200);
    assert.equal(sent.length, 1);
    if (['available', 'full'].includes(scenario)) assert.ok(sent[0].includes(`ที่นั่งว่าง ${scenario === 'full' ? 0 : 1} ที่นั่ง`));
    else assert.ok(!sent[0].includes('ที่นั่งว่าง'));
    if (['completed', 'not_found'].includes(scenario)) assert.equal(vanLookups, 0);
    else assert.ok(sent[0].includes('ราคา 3,990 บาท/ท่าน'));
  }
});

test('card links preserve the exact trip ID', () => {
  assert.equal(new URL(contacts.tripMessengerUrl('trip-a & b')).searchParams.get('ref'), 'trip:trip-a & b');
});
test('signature rejects missing, wrong and tampered requests', () => {
  const raw = '{"object":"page"}';
  const sig = 'sha256=' + crypto.createHmac('sha256', 'secret').update(raw).digest('hex');
  assert.ok(helpers.verifyMessengerSignature(raw, sig, 'secret'));
  assert.equal(helpers.verifyMessengerSignature(raw + ' ', sig, 'secret'), false);
  assert.equal(helpers.verifyMessengerSignature(raw, null, 'secret'), false);
  assert.equal(helpers.verifyMessengerSignature(raw, 'sha256=123', 'secret'), false);
});
test('direct referrals and initial postbacks are supported; echoes ignored', () => {
  const ref = 'trip:trip-1790143030544';
  assert.equal(helpers.referralTripId({ referral: { ref } }), 'trip-1790143030544');
  assert.equal(helpers.referralTripId({ postback: { referral: { ref } } }), 'trip-1790143030544');
  for (const invalid of ['trip:', 'trip:   ', 'trip: one', 'trip:one ', 'trip:' + 'a'.repeat(201)]) {
    assert.equal(helpers.referralTripId({ referral: { ref: invalid } }), null);
  }
  assert.equal(helpers.referralTripId({ referral: { ref: 'trip:one' } }), 'one');
  assert.equal(helpers.referralTripId({ postback: { referral: { ref: 'trip:two' } } }), 'two');
  assert.equal(helpers.referralTripId({ message: { is_echo: true }, referral: { ref: 'trip:one' } }), null);
  assert.equal(helpers.referralTripId({ referral: { ref: 'other' } }), null);
});
test('reply has trip details, Thai date, and handles closed/missing trips', () => {
  const trip = { name: 'Chiang Dao', departureDate: '2026-09-23', departureTime: '06:00', pickupPoint: 'Pickup A', status: 'active' };
  const reply = helpers.tripReply(trip);
  for (const value of ['Chiang Dao', '2569', '06:00', 'Pickup A']) assert.ok(reply.includes(value));
  assert.ok(!helpers.tripReply({ ...trip, status: 'completed' }).includes('06:00'));
  const completedReply = helpers.tripReply({ ...trip, status: 'completed' });
  for (const value of ['Chiang Dao', '2569']) assert.ok(completedReply.includes(value));
  assert.ok(helpers.tripReply(null));
});
test('webhook verifies challenge and sends only signed trip referrals for the configured page', async () => {
  const env = { MESSENGER_VERIFY_TOKEN: 'verify', MESSENGER_APP_SECRET: 'secret', MESSENGER_PAGE_ACCESS_TOKEN: 'test-only', MESSENGER_PAGE_ID: '123', MESSENGER_GRAPH_API_VERSION: 'v99.0' };
  const calls = [];
  const query = { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: { name: 'Trip', status: 'active', departureDate: '2026-09-23' } }; } };
  const route = load('src/app/api/messenger/webhook/route.ts', {
    '@/lib/supabase': { supabase: { from: () => query } }, '@/lib/messenger': helpers,
    '@/lib/messengerLogging': logging,
    '@/lib/seatAvailability': availability,
  }, { process: { env }, fetch: async (url, options) => { calls.push(JSON.parse(options.body)); return { ok: true }; } });
  const challenge = await route.GET(new Request('https://example.com/?hub.mode=subscribe&hub.verify_token=verify&hub.challenge=12345'));
  assert.equal(await challenge.text(), '12345');
  assert.equal((await route.GET(new Request('https://example.com/'))).status, 403);
  async function post(entry, signed = true) {
    const body = JSON.stringify({ object: 'page', entry });
    const signature = 'sha256=' + crypto.createHmac('sha256', 'secret').update(body).digest('hex');
    return route.POST(new Request('https://example.com/', { method: 'POST', body, headers: signed ? { 'x-hub-signature-256': signature } : {} }));
  }
  const event = { sender: { id: '456' }, recipient: { id: '123' }, referral: { ref: 'trip:one' } };
  assert.equal((await post([{ id: '123', messaging: [event] }], false)).status, 403);
  await post([{ id: '999', messaging: [event] }]);
  assert.equal(calls.length, 0);
  assert.equal((await post([{ id: '123', messaging: [event] }])).status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].recipient.id, '456');
  assert.equal(calls[0].messaging_type, 'RESPONSE');
});

test('diagnostics preserve status/flow and redact secrets from Meta and database errors', async () => {
  const env = { MESSENGER_VERIFY_TOKEN: 'fake-verify-sensitive', MESSENGER_APP_SECRET: 'fake-app-sensitive', MESSENGER_PAGE_ACCESS_TOKEN: 'fake-page-sensitive', MESSENGER_PAGE_ID: '123', MESSENGER_GRAPH_API_VERSION: 'v99.0', SUPABASE_SERVICE_ROLE_KEY: 'fake-db-sensitive' };
  for (const scenario of ['success', 'missing_trip', 'meta_error', 'database_error', 'network_error', 'invalid_signature', 'wrong_page', 'wrong_recipient', 'invalid_ref', 'postback_referral', 'postback_only']) {
    const logs = [];
    const diagnostic = load('src/lib/messengerLogging.ts', { 'node:crypto': crypto }, { console: { info: line => logs.push(JSON.parse(line)), error: line => logs.push(JSON.parse(line)) } });
    let lookups = 0;
    let sends = 0;
    const privateSender = '987654321098765';
    const hostileError = { message: `${env.MESSENGER_PAGE_ACCESS_TOKEN} ${env.MESSENGER_APP_SECRET} ${env.MESSENGER_VERIFY_TOKEN} ${env.SUPABASE_SERVICE_ROLE_KEY} ${privateSender} Bearer unknown-sensitive https://example.com/?token=hidden`, type: 'OAuthException', code: 190, error_subcode: 463, fbtrace_id: 'trace-example', credentials: 'never-log-this', details: 'never-log-this' };
    const query = { select() { return this; }, eq() { return this; }, async maybeSingle() {
      lookups++;
      return { data: scenario === 'missing_trip' ? null : { name: 'Trip', status: 'active', departureDate: '2026-09-23' }, error: scenario === 'database_error' ? hostileError : null };
    } };
    const route = load('src/app/api/messenger/webhook/route.ts', {
      '@/lib/supabase': { supabase: { from: () => query } }, '@/lib/messenger': helpers, '@/lib/messengerLogging': diagnostic,
      '@/lib/seatAvailability': availability,
    }, { process: { env }, fetch: async () => {
      sends++;
      if (scenario === 'network_error') throw new Error(`Network failure ${env.MESSENGER_PAGE_ACCESS_TOKEN}`);
      return { ok: scenario !== 'meta_error', status: scenario === 'meta_error' ? 400 : 200, json: async () => ({ error: hostileError }) };
    } });
    const event = { sender: { id: privateSender }, recipient: { id: scenario === 'wrong_recipient' ? '999' : '123' }, referral: { ref: scenario === 'invalid_ref' ? 'other' : 'trip:one' } };
    if (scenario.startsWith('postback')) {
      event.postback = { payload: 'GET_STARTED', ...(scenario === 'postback_referral' ? { referral: event.referral } : {}) };
      delete event.referral;
    }
    const body = JSON.stringify({ object: 'page', entry: [{ id: scenario === 'wrong_page' ? '999' : '123', messaging: [event] }] });
    const signature = 'sha256=' + crypto.createHmac('sha256', env.MESSENGER_APP_SECRET).update(body).digest('hex');
    const result = await route.POST(new Request('https://example.com/', { method: 'POST', body, headers: scenario === 'invalid_signature' ? {} : { 'x-hub-signature-256': signature } }));
    const expectedStatus = scenario === 'invalid_signature' ? 403 : ['meta_error', 'database_error', 'network_error'].includes(scenario) ? 500 : 200;
    assert.equal(result.status, expectedStatus, scenario);
    const serialized = JSON.stringify(logs);
    for (const sensitive of [env.MESSENGER_PAGE_ACCESS_TOKEN, env.MESSENGER_APP_SECRET, env.MESSENGER_VERIFY_TOKEN, env.SUPABASE_SERVICE_ROLE_KEY, privateSender, signature, 'unknown-sensitive', 'never-log-this', '?token=hidden']) assert.ok(!serialized.includes(sensitive), `${scenario}: redaction`);
    assert.equal(logs[0].stage, 'post_received');
    assert.ok(logs.every(log => log.requestId === logs[0].requestId && !Number.isNaN(Date.parse(log.timestamp))));
    if (['wrong_page', 'wrong_recipient', 'invalid_signature', 'invalid_ref', 'postback_only'].includes(scenario)) {
      assert.equal(sends, 0); assert.equal(lookups, 0);
    }
    if (scenario === 'meta_error') {
      const failure = logs.find(log => log.stage === 'send_response_failed');
      assert.equal(failure.code, 190); assert.equal(failure.error_subcode, 463); assert.equal(failure.fbtrace_id, 'trace-example');
      assert.equal(failure.httpStatus, 400);
    }
    if (scenario === 'missing_trip') assert.equal(logs.find(log => log.stage === 'trip_lookup_result').found, false);
    if (scenario === 'success' || scenario === 'postback_referral') assert.ok(logs.some(log => log.stage === 'send_response_success'));
    if (scenario === 'wrong_page') assert.ok(logs.some(log => log.reason === 'page_id_mismatch'));
    if (scenario === 'wrong_recipient') assert.ok(logs.some(log => log.reason === 'recipient_page_id_mismatch'));
  }
});
