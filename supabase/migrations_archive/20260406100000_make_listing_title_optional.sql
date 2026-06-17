-- Make listing title optional since it's now auto-generated from content
ALTER TABLE public.marketplace_listings ALTER COLUMN title DROP NOT NULL;
ALTER TABLE public.marketplace_listings ALTER COLUMN title SET DEFAULT NULL;
