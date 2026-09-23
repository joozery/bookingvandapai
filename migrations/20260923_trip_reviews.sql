BEGIN;
CREATE TABLE IF NOT EXISTS public.trip_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tripId" text NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  "lineUserId" text NOT NULL,
  "reviewerName" text NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL DEFAULT '' CHECK (char_length(comment) <= 2000),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("tripId", "lineUserId")
);
ALTER TABLE public.trip_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.trip_reviews FROM anon, authenticated;
GRANT SELECT, INSERT ON public.trip_reviews TO service_role;
CREATE INDEX IF NOT EXISTS trip_reviews_created_at_idx ON public.trip_reviews ("createdAt" DESC);
NOTIFY pgrst, 'reload schema';
COMMIT;
