type TripDates = { departureDate: string; durationDays: number; status?: string | null };

// The existing trip form stores the inclusive return date as durationDays.
export function reviewOpensAt(trip: TripDates): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trip.departureDate) || !Number.isInteger(trip.durationDays) || trip.durationDays < 1) return NaN;
  return Date.parse(`${trip.departureDate}T00:00:00+07:00`) + (trip.durationDays - 1) * 86_400_000;
}

export function isTripReviewOpen(trip: TripDates, now = Date.now()): boolean {
  // Admins can mark a trip completed before the date calculation reaches the
  // return date. The completed state is the authoritative signal that the
  // journey has ended, while the date remains the fallback for old records.
  return trip.status === 'completed' || now >= reviewOpensAt(trip);
}

export interface TripReview {
  id: string;
  tripId: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: string;
  isHidden: boolean;
}
