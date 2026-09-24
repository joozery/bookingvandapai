// Shared by the booking trip list and Messenger; van seat state is authoritative.
export function countAvailableSeats(vans: unknown): number | null {
  if (!Array.isArray(vans)) return null;
  let available = 0;
  for (const van of vans) {
    if (!van || !Array.isArray(van.seats)) return null;
    for (const seat of van.seats) {
      if (!seat || !['driver', 'customer', 'staff'].includes(seat.type)
        || !['available', 'pending', 'booked', 'blocked'].includes(seat.status)) return null;
      if ((seat.type === 'customer' || seat.type === 'staff') && seat.status === 'available') available++;
    }
  }
  return available;
}
