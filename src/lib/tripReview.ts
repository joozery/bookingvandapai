type TripDates = { departureDate: string; durationDays: number };

// The existing trip form stores the inclusive return date as durationDays.
export function reviewOpensAt(trip: TripDates): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trip.departureDate) || !Number.isInteger(trip.durationDays) || trip.durationDays < 1) return NaN;
  return Date.parse(`${trip.departureDate}T00:00:00+07:00`) + (trip.durationDays - 1) * 86_400_000;
}

export function isTripReviewOpen(trip: TripDates, now = Date.now()): boolean {
  return now >= reviewOpensAt(trip);
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
