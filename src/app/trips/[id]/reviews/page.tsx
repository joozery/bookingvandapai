import PublicTripReviews from '@/components/PublicTripReviews';

export default async function TripReviewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PublicTripReviews key={id} tripId={id} />;
}
