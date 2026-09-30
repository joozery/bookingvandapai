ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS "guideName" text NOT NULL DEFAULT '';
NOTIFY pgrst, 'reload schema';
