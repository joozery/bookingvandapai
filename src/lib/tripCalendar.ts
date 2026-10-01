export interface CalendarTrip {
  id: string;
  name: string;
  status: string;
  departureDate: string;
  durationDays: number;
  cost: number;
  availableSeats?: number;
  pickupPoint?: string;
  departureTime?: string;
  guideName?: string | null;
  tripPeriod?: string;
}
const DAY = 86_400_000;

// UTC day numbers keep calendar dates independent of browser timezone and DST.
export function parseCalendarDay(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.getTime() / DAY;
}
export function dayKey(day: number): string {
  return new Date(day * DAY).toISOString().slice(0, 10);
}
export function calendarTrips(trips: CalendarTrip[]) {
  return trips.flatMap(trip => {
    const depStart = parseCalendarDay(trip.departureDate);
    const duration = Number(trip.durationDays);
    if (trip.status !== 'active' || depStart === null || !Number.isSafeInteger(duration) || duration < 1) return [];

    let isNightDeparture = false;

    if (trip.departureTime) {
      const hour = parseInt(trip.departureTime.split(':')[0], 10);
      if (!isNaN(hour) && hour >= 12) {
        isNightDeparture = true;
      }
    }

    if (trip.tripPeriod) {
      const depDateObj = new Date(depStart * DAY);
      const depDayNum = depDateObj.getUTCDate();
      const match = /^(\d{1,2})\s*-\s*(\d{1,2})/.exec(trip.tripPeriod.trim());
      if (match) {
        const periodStartDay = parseInt(match[1], 10);
        if (periodStartDay === depDayNum + 1 || (depDayNum >= 28 && periodStartDay === 1)) {
          isNightDeparture = true;
        }
      }
    }

    const depEnd = depStart + duration - 1;
    let start = depStart;
    let end = depEnd;

    if (isNightDeparture) {
      start = depStart + 1;
      end = Math.max(start, depEnd);
    }

    if (!Number.isFinite(new Date(end * DAY).getTime())) return [];
    return [{ ...trip, start, end }];
  }).sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
}
export function monthDays(month: string) {
  const first = parseCalendarDay(`${month}-01`)!;
  const date = new Date(first * DAY);
  const next = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1) / DAY;
  const offset = date.getUTCDay();
  return { first, last: next - 1, cells: Array.from({ length: Math.ceil((offset + next - first) / 7) * 7 }, (_, i) => first - offset + i) };
}
export function shiftMonth(month: string, offset: number) {
  const [year, value] = month.split('-').map(Number);
  return new Date(Date.UTC(year, value - 1 + offset, 1)).toISOString().slice(0, 7);
}
export function bangkokToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function calendarWeeks<T extends { start: number; end: number }>(month: string, events: T[]) {
  const grid = monthDays(month);
  const laneEnds: number[] = [];
  const placed = [...events].filter(event => event.start <= grid.last && event.end >= grid.first)
    .sort((a, b) => a.start - b.start || b.end - a.end).map(event => {
      let lane = laneEnds.findIndex(end => end < event.start);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = event.end;
      return { event, lane };
    });
  return Array.from({ length: grid.cells.length / 7 }, (_, index) => {
    const days = grid.cells.slice(index * 7, index * 7 + 7);
    const first = Math.max(days[0], grid.first);
    const last = Math.min(days[6], grid.last);
    const segments = placed.filter(({ event }) => event.start <= last && event.end >= first).map(({ event, lane }) => {
      const start = Math.max(event.start, first);
      const end = Math.min(event.end, last);
      return { event, lane, start, end, column: start - days[0] + 1, span: end - start + 1,
        continuesBefore: event.start < start, continuesAfter: event.end > end };
    });
    return { days, segments };
  });
}
