import { thaiHolidays, type ThaiHoliday } from './thaiHolidays';
import { dayKey, parseCalendarDay } from './tripCalendar';

export const HOLIDAY_FEED_URL = 'https://calendar.google.com/calendar/ical/th.th%23holiday%40group.v.calendar.google.com/public/basic.ics';
export const HOLIDAY_REFRESH_MS = 60 * 60 * 1000;

export function parseHolidayFeed(ics: string): ThaiHoliday[] {
  if (!ics.includes('BEGIN:VCALENDAR') || !ics.includes('END:VCALENDAR')) throw new Error('Invalid calendar');
  const holidays = new Map<string, ThaiHoliday>();
  const unfolded = ics.replace(/\r?\n[ \t]/g, '');
  for (const block of unfolded.split('BEGIN:VEVENT').slice(1)) {
    const fields = new Map<string, string>();
    for (const line of block.split('END:VEVENT')[0].split(/\r?\n/)) {
      const separator = line.indexOf(':');
      if (separator < 0) continue;
      fields.set(line.slice(0, separator).split(';')[0], line.slice(separator + 1).replace(/\\([nN,;\\])/g, (_, char: string) => /n/i.test(char) ? '\n' : char));
    }
    const name = fields.get('SUMMARY')?.trim();
    const description = fields.get('DESCRIPTION') || '';
    // The feed also includes observances and Labour Day (not a government holiday).
    if (!name || fields.get('STATUS') === 'CANCELLED' || !description.includes('วันหยุดนักขัตฤกษ์') || /แรงงาน/.test(name)) continue;
    const date = (value?: string) => value && /^\d{8}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}` : '';
    const start = parseCalendarDay(date(fields.get('DTSTART')));
    const end = fields.has('DTEND') ? parseCalendarDay(date(fields.get('DTEND'))) : start === null ? null : start + 1;
    if (start === null || end === null || end <= start || end - start > 31) continue;
    for (let day = start; day < end; day++) {
      const key = dayKey(day);
      holidays.set(`${key}:${name}`, { date: key, name });
    }
  }
  if (holidays.size < 10) throw new Error('Incomplete holiday feed');
  return [...holidays.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function mergeHolidayFeed(remote: ThaiHoliday[]): ThaiHoliday[] {
  // Keep the verified Thai names and scoped official additions missing from the feed.
  const verifiedDates = new Set(thaiHolidays.map(holiday => holiday.date));
  return [...remote.filter(holiday => !verifiedDates.has(holiday.date)), ...thaiHolidays]
    .sort((a, b) => a.date.localeCompare(b.date));
}
