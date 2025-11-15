-- Fix google_course_id in google_classroom_coursework table
--
-- Issue: Due to a bug in sync.ts, coursework was synced with UUID values
-- in google_course_id instead of Google Classroom's text course IDs.
--
-- This migration updates all coursework records to use the correct
-- google_course_id from the courses table.

-- Step 1: Create temporary table to store the correct mappings
CREATE TEMP TABLE coursework_fixes AS
SELECT
    cw.id as coursework_id,
    c.google_course_id as correct_course_id
FROM google_classroom_coursework cw
-- Try to find the course by matching the UUID pattern in google_course_id
-- We know that wrong values are UUIDs (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
INNER JOIN google_classroom_courses c ON c.id::text = cw.google_course_id
WHERE
    -- Only fix records where google_course_id looks like a UUID
    cw.google_course_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Step 2: Update the coursework records with correct google_course_id
UPDATE google_classroom_coursework cw
SET
    google_course_id = cf.correct_course_id,
    updated_at = now()
FROM coursework_fixes cf
WHERE cw.id = cf.coursework_id;

-- Log the number of records fixed
DO $$
DECLARE
    fixed_count integer;
BEGIN
    SELECT COUNT(*) INTO fixed_count FROM coursework_fixes;
    RAISE NOTICE 'Fixed % coursework records with incorrect google_course_id', fixed_count;
END $$;
