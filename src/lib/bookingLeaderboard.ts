export interface LeaderboardBooking {
  lineUserId: string;
  tripId: string;
  nickname: string;
  status: string;
  createdAt: string;
  lineUserProfilePic?: string;
}

function compareTripTimes(a: unknown, b: unknown) {
  const toMillis = (value: unknown) => {
    if (typeof value === 'number') return value;
    const millis = Date.parse(String(value ?? ''));
    return Number.isNaN(millis) ? null : millis;
  };
  const aMillis = toMillis(a);
  const bMillis = toMillis(b);
  if (aMillis !== null && bMillis !== null && aMillis !== bMillis) return aMillis - bMillis;
  return String(a ?? '').localeCompare(String(b ?? ''));
}

export function leaderboardPeople(bookings: LeaderboardBooking[]) {
  const people = new Map<string, { nickname: string; pictureUrl: string; latest: string; trips: Set<string> }>();
  for (const booking of bookings) {
    if (booking.status !== 'approved' || !booking.lineUserId || !booking.tripId) continue;
    const person = people.get(booking.lineUserId) || { nickname: '', pictureUrl: '', latest: '', trips: new Set<string>() };
    person.trips.add(booking.tripId);
    if (booking.createdAt >= person.latest) {
      if (booking.nickname?.trim()) person.nickname = booking.nickname.trim();
      if (booking.lineUserProfilePic?.trim()) person.pictureUrl = booking.lineUserProfilePic.trim();
      person.latest = booking.createdAt;
    } else if (!person.pictureUrl && booking.lineUserProfilePic?.trim()) {
      person.pictureUrl = booking.lineUserProfilePic.trim();
    }
    people.set(booking.lineUserId, person);
  }
  return [...people.entries()].map(([lineUserId, person]) => ({
    lineUserId,
    nickname: person.nickname || 'นักเดินทาง',
    pictureUrl: person.pictureUrl || '',
    tripCount: person.trips.size,
    latestTripAt: person.latest
  })).sort((a, b) =>
    b.tripCount - a.tripCount ||
    compareTripTimes(a.latestTripAt, b.latestTripAt) ||
    a.nickname.localeCompare(b.nickname, 'th')
  );
}

export function bookingLeaderboard(bookings: LeaderboardBooking[], hiddenUsers = new Set<string>()) {
  const sorted = leaderboardPeople(bookings).filter(person => !hiddenUsers.has(person.lineUserId));
  return sorted.map((person, index) => ({
    rank: index + 1,
    nickname: person.nickname,
    pictureUrl: person.pictureUrl,
    tripCount: person.tripCount,
  }));
}
