-- Migration: Add google_classroom_course_id to classes table
-- Purpose: Allow associating a UbuMaths class with a Google Classroom course
-- for simplified export workflow

-- Add google_classroom_course_id to classes table
ALTER TABLE public.classes
ADD COLUMN google_classroom_course_id uuid REFERENCES public.google_classroom_courses(id) ON DELETE SET NULL;

-- Ensure one class can only be linked to one course (partial unique index)
-- This allows multiple NULL values but enforces uniqueness for non-NULL values
CREATE UNIQUE INDEX classes_google_course_unique
ON public.classes(google_classroom_course_id)
WHERE google_classroom_course_id IS NOT NULL;

-- Index for faster lookups when querying classes by their Google Classroom course
CREATE INDEX idx_classes_google_course ON public.classes(google_classroom_course_id);

-- Comment for documentation
COMMENT ON COLUMN public.classes.google_classroom_course_id IS 'Optional link to a Google Classroom course for simplified whiteboard export';
