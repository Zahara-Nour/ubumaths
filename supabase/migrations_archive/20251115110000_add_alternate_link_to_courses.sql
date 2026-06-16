-- Migration: Add alternate_link column to google_classroom_courses
-- Purpose: Store Google Classroom URL for opening course directly
-- Date: 2025-11-15

-- Add alternate_link column to google_classroom_courses
ALTER TABLE public.google_classroom_courses
ADD COLUMN IF NOT EXISTS alternate_link TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.google_classroom_courses.alternate_link IS 'URL to open course in Google Classroom web interface';

-- Note: No index needed - this is rarely queried directly
