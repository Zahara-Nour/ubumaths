-- Remove title and description columns from marketplace_listings
-- These fields are no longer used - listings display their content directly
ALTER TABLE public.marketplace_listings DROP COLUMN IF EXISTS title;
ALTER TABLE public.marketplace_listings DROP COLUMN IF EXISTS description;
