BEGIN;
ALTER TABLE public.trip_reviews ADD COLUMN IF NOT EXISTS "isHidden" boolean NOT NULL DEFAULT false;
GRANT UPDATE ("isHidden") ON public.trip_reviews TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
