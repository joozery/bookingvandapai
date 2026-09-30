const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/tripCalendar.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: exportsObject, Intl, Date });
const { calendarTrips, parseCalendarDay, dayKey, monthDays, shiftMonth } = exportsObject;
const { calendarWeeks } = exportsObject;
const trip = (id, departureDate, durationDays, extra = {}) => ({ id, name: id, departureDate, durationDays, status: 'active', cost: 1500, ...extra });

test('multi-day trips include departure and final day across month/year boundaries', () => {
  const events = calendarTrips([trip('new-year', '2026-12-31', 3), trip('one-day', '2027-01-01', 1)]);
  assert.equal(dayKey(events[0].end), '2027-01-02');
  assert.equal(events[1].start, events[1].end);
  const jan = monthDays('2027-01');
  assert.equal(events.filter(t => t.start <= jan.last && t.end >= jan.first).length, 2);
  const first = parseCalendarDay('2027-01-01');
  assert.equal(events.filter(t => t.start <= first && t.end >= first).length, 2);
  assert.equal(events.filter(t => t.start <= first + 2 && t.end >= first + 2).length, 0);
});

test('overlapping rounds and sold-out trips remain separate; completed trips are excluded', () => {
  const events = calendarTrips([
    trip('round-1', '2026-10-12', 3, { name: 'Same trip', availableSeats: 0 }),
    trip('round-2', '2026-10-13', 2, { name: 'Same trip' }),
    trip('round-3', '2026-10-13', 1),
    trip('completed', '2026-10-12', 4, { status: 'completed' }),
  ]);
  const day = parseCalendarDay('2026-10-13');
  assert.equal(events.filter(t => t.start <= day && t.end >= day).length, 3);
  assert.equal(events[0].availableSeats, 0);
});

test('calendar handles leap years, six-row months, and year navigation', () => {
  const feb = monthDays('2028-02');
  assert.equal(dayKey(feb.last), '2028-02-29');
  assert.equal(monthDays('2026-08').cells.length, 42);
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(shiftMonth('2027-01', -1), '2026-12');
  assert.equal(dayKey(calendarTrips([trip('leap', '2028-02-28', 3)])[0].end), '2028-03-01');
});

test('invalid dates/durations do not create misleading calendar events', () => {
  assert.equal(parseCalendarDay('2026-02-29'), null);
  assert.equal(parseCalendarDay('2026-13-01'), null);
  assert.equal(calendarTrips([trip('bad', 'unknown', 2), trip('zero', '2026-10-01', 0), trip('fraction', '2026-10-01', 1.5)]).length, 0);
  assert.equal(dayKey(parseCalendarDay('2026-10-01T00:00:00+07:00')), '2026-10-01');
});

test('continuous bars split at week boundaries and retain their lane', () => {
  const events = calendarTrips([trip('long', '2026-10-02', 5), trip('overlap', '2026-10-03', 3)]);
  const weeks = calendarWeeks('2026-10', events);
  const segments = weeks.flatMap(week => week.segments);
  const long = segments.filter(segment => segment.event.id === 'long');
  assert.equal(long.length, 2);
  assert.equal(long[0].column, 6);
  assert.equal(long[0].span, 2);
  assert.equal(long[0].continuesAfter, true);
  assert.equal(long[1].column, 1);
  assert.equal(long[1].span, 3);
  assert.equal(long[1].continuesBefore, true);
  assert.equal(long[0].lane, long[1].lane);
  for (const week of weeks) {
    for (const a of week.segments) for (const b of week.segments) {
      if (a === b || a.lane !== b.lane) continue;
      assert.ok(a.end < b.start || b.end < a.start, 'same-lane bars must not overlap');
    }
  }
});

test('bars clip to month edges; overflow trips still have lanes', () => {
  const events = calendarTrips([
    trip('cross-month', '2026-09-30', 3),
    ...Array.from({ length: 4 }, (_, i) => trip(`overlap-${i}`, '2026-10-01', 1)),
  ]);
  const first = calendarWeeks('2026-10', events)[0];
  const crossing = first.segments.find(segment => segment.event.id === 'cross-month');
  assert.equal(dayKey(crossing.start), '2026-10-01');
  assert.equal(crossing.span, 2);
  assert.equal(crossing.continuesBefore, true);
  assert.equal(first.segments.length, 5);
  assert.equal(new Set(first.segments.map(segment => segment.lane)).size, 5);
});
