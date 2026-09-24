ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS "reviewTitle" text;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS "reviewDescription" text;
NOTIFY pgrst, 'reload schema';
