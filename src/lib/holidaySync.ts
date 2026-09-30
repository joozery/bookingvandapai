import { supabase } from './supabase';
import { HOLIDAY_FEED_URL, HOLIDAY_REFRESH_MS, mergeHolidayFeed, parseHolidayFeed } from './holidayFeed';

const CACHE_FILE = 'settings/thai-holidays-cache.json';
type Snapshot = { ics: string; fetchedAt: string };
let memory: Snapshot | null = null;
let nextAttempt = 0;
let inFlight: Promise<ReturnType<typeof result>> | null = null;

function result(snapshot: Snapshot | null, stale: boolean) {
  const holidays = mergeHolidayFeed(snapshot ? parseHolidayFeed(snapshot.ics) : []);
  return { holidays, updatedAt: snapshot?.fetchedAt || null, stale,
    years: [...new Set(holidays.map(holiday => Number(holiday.date.slice(0, 4))))].sort(),
    source: 'Google Calendar + ข้อมูลราชการที่ตรวจสอบแล้ว' };
}

async function sync() {
  if (!memory) {
    try {
      const { data, error } = await supabase.storage.from('images').download(CACHE_FILE);
      if (!error && data) {
        const candidate = JSON.parse(await data.text());
        if (typeof candidate.ics === 'string' && Number.isFinite(Date.parse(candidate.fetchedAt)) && Date.parse(candidate.fetchedAt) <= Date.now()) {
          parseHolidayFeed(candidate.ics);
          memory = candidate;
        }
      }
    } catch { /* A missing/invalid cache must not prevent fetching fresh data. */ }
  }
  const fresh = memory && Date.now() - Date.parse(memory.fetchedAt) < HOLIDAY_REFRESH_MS;
  if (fresh || Date.now() < nextAttempt) return result(memory, !fresh);
  try {
    const response = await fetch(HOLIDAY_FEED_URL, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('Holiday source unavailable');
    const ics = await response.text();
    if (ics.length > 2_000_000) throw new Error('Calendar too large');
    parseHolidayFeed(ics);
    memory = { ics, fetchedAt: new Date().toISOString() };
    // Persist the last successful feed so a cold server can recover during an outage.
    try {
      await supabase.storage.from('images').upload(CACHE_FILE, JSON.stringify(memory), { contentType: 'application/json', upsert: true, cacheControl: '0' });
    } catch { /* A cache write failure does not discard the valid live response. */ }
    nextAttempt = 0;
    return result(memory, false);
  } catch {
    nextAttempt = Date.now() + 5 * 60 * 1000;
    return result(memory, true);
  }
}

export async function getSyncedHolidays() {
  if (!inFlight) inFlight = sync().finally(() => { inFlight = null; });
  return inFlight;
}
