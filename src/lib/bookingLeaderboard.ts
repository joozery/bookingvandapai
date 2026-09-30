export interface LeaderboardBooking {
  lineUserId: string;
  tripId: string;
  nickname: string;
  status: string;
  createdAt: string;
}

export function leaderboardPeople(bookings: LeaderboardBooking[]) {
  const people = new Map<string, { nickname: string; latest: string; trips: Set<string> }>();
  for (const booking of bookings) {
    if (booking.status !== 'approved' || !booking.lineUserId || !booking.tripId) continue;
    const person = people.get(booking.lineUserId) || { nickname: '', latest: '', trips: new Set<string>() };
    person.trips.add(booking.tripId);
    if (booking.nickname?.trim() && booking.createdAt >= person.latest) {
      person.nickname = booking.nickname.trim();
      person.latest = booking.createdAt;
    }
    people.set(booking.lineUserId, person);
  }
  return [...people.entries()].map(([lineUserId, person]) => ({ lineUserId, nickname: person.nickname || 'นักเดินทาง', tripCount: person.trips.size }))
    .sort((a, b) => b.tripCount - a.tripCount || a.nickname.localeCompare(b.nickname, 'th'));
}

export function bookingLeaderboard(bookings: LeaderboardBooking[], hiddenUsers = new Set<string>()) {
  const sorted = leaderboardPeople(bookings).filter(person => !hiddenUsers.has(person.lineUserId));
  let rank = 0;
  return sorted.map((person, index) => {
    if (index === 0 || person.tripCount !== sorted[index - 1].tripCount) rank = index + 1;
    return { rank, nickname: person.nickname, tripCount: person.tripCount };
  });
}
