import { createHash } from 'node:crypto';
import { supabase } from './supabase';
import type { LeaderboardBooking } from './bookingLeaderboard';

const folder = 'settings/leaderboard-hidden';
export const leaderboardKey = (userId: string) => createHash('sha256').update(userId).digest('hex');

export async function loadLeaderboardBookings() {
  const bookings: LeaderboardBooking[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from('bookings')
      .select('lineUserId, tripId, nickname, status, createdAt, lineUserProfilePic')
      .eq('status', 'approved').order('id').range(offset, offset + 999);
    if (error) throw error;
    bookings.push(...(data || []));
    if (!data || data.length < 1000) return bookings;
  }
}

export async function loadHiddenLeaderboardKeys() {
  const keys = new Set<string>();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from('images').list(folder, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw error; // Never re-expose hidden people on a storage failure.
    for (const file of data || []) if (/^[a-f0-9]{64}\.json$/.test(file.name)) keys.add(file.name.slice(0, -5));
    if (!data || data.length < 1000) return keys;
  }
}

export async function setLeaderboardHidden(key: string, hidden: boolean) {
  if (!/^[a-f0-9]{64}$/.test(key)) throw new Error('Invalid key');
  const path = `${folder}/${key}.json`;
  // One marker per person avoids lost updates when two admins edit different people.
  const { error } = hidden
    ? await supabase.storage.from('images').upload(path, '{"hidden":true}', { contentType: 'application/json', cacheControl: '0', upsert: true })
    : await supabase.storage.from('images').remove([path]);
  if (error) throw error;
}
