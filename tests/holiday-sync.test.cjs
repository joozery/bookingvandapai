const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, Date, AbortSignal, require: name => { if (!(name in dependencies)) throw new Error(name); return dependencies[name]; }, ...globals });
  return exports;
}
const holidays = load('src/lib/thaiHolidays.ts');
const calendar = load('src/lib/tripCalendar.ts');
const feed = load('src/lib/holidayFeed.ts', { './thaiHolidays': holidays, './tripCalendar': calendar });
const event = (date, name = 'วันหยุดทดสอบ', extra = '') => `BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:${date}\r\nSUMMARY:${name}\r\nDESCRIPTION:วันหยุดนักขัตฤกษ์\r\n${extra}END:VEVENT\r\n`;
const source = extra => `BEGIN:VCALENDAR\r\n${Array.from({ length: 10 }, (_, i) => event(`202701${String(i + 1).padStart(2, '0')}`)).join('')}${extra || ''}END:VCALENDAR`;

test('unfolds names, expands exclusive end dates, excludes observances, labour and cancelled holidays', () => {
  const result = feed.parseHolidayFeed(source(
    event('20270413', 'วันสง\r\n กรานต์', 'DTEND;VALUE=DATE:20270416\r\n') +
    event('20270501', 'วันแรงงานแห่งชาติ') + event('20270120', 'ยกเลิก', 'STATUS:CANCELLED\r\n') +
    event('20270214', 'วันวาเลนไทน์').replace('DESCRIPTION:วันหยุดนักขัตฤกษ์', 'DESCRIPTION:วันสำคัญ')
  ));
  assert.equal(result.filter(h => h.name === 'วันสงกรานต์').length, 3);
  assert.ok(!result.some(h => ['2027-04-16', '2027-05-01', '2027-01-20', '2027-02-14'].includes(h.date)));
  assert.throws(() => feed.parseHolidayFeed('<html>Unavailable</html>'));
  assert.throws(() => feed.parseHolidayFeed('BEGIN:VCALENDAR\nEND:VCALENDAR'));
});

test('verified additions preserve regional scope without duplicate dates', () => {
  const merged = feed.mergeHolidayFeed([{ date: '2026-10-16', name: 'Generic holiday' }]);
  const scoped = merged.filter(h => h.date === '2026-10-16');
  assert.equal(scoped.length, 1);
  assert.ok(scoped[0].scope);
});

test('hourly refresh retains last good data during outage, persists and recovers on cold start', async () => {
  let clock = Date.parse('2026-10-01T00:00:00Z'), calls = 0, saved = null, outage = false;
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } static now() { return clock; } }
  const storage = { download: async () => saved ? { data: { text: async () => saved } } : { error: true }, upload: async (_path, body) => { saved = body; return {}; } };
  const dependencies = { './supabase': { supabase: { storage: { from: () => storage } } }, './holidayFeed': feed };
  const globals = { Date: Clock, fetch: async () => { calls++; if (outage) throw new Error('Offline'); return { ok: true, text: async () => source() }; } };
  const sync = load('src/lib/holidaySync.ts', dependencies, globals);
  const initial = await sync.getSyncedHolidays();
  assert.equal(initial.stale, false);
  assert.ok(initial.years.includes(2027));
  await sync.getSyncedHolidays();
  assert.equal(calls, 1);
  clock += 3600001;
  outage = true;
  const fallback = await sync.getSyncedHolidays();
  assert.equal(fallback.stale, true);
  assert.equal(fallback.updatedAt, initial.updatedAt);
  assert.equal(fallback.holidays.length, initial.holidays.length);
  const cold = load('src/lib/holidaySync.ts', dependencies, globals);
  assert.equal((await cold.getSyncedHolidays()).updatedAt, initial.updatedAt);
  clock += 300001; outage = false;
  assert.equal((await sync.getSyncedHolidays()).stale, false);
});
