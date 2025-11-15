-- Migration: Add alternate_link column to google_classroom_coursework
-- Purpose: Store Google Classroom URL for opening coursework directly
-- Date: 2025-11-15

-- Add alternate_link column to google_classroom_coursework
ALTER TABLE public.google_classroom_coursework
ADD COLUMN IF NOT EXISTS alternate_link TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.google_classroom_coursework.alternate_link IS 'URL to open coursework in Google Classroom web interface';

-- Note: No index needed - this is rarely queried directly
