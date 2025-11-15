-- Change google_course_id from UUID to TEXT in google_classroom_coursework
--
-- Issue: The column was incorrectly defined as UUID, but Google Classroom
-- course IDs are text strings (e.g., "123456789"), not UUIDs.
--
-- This migration:
-- 1. Changes the column type from UUID to TEXT
-- 2. Fixes existing data by replacing UUID values with correct course IDs

-- Step 1: Add a temporary column to store the correct course IDs
ALTER TABLE google_classroom_coursework
ADD COLUMN google_course_id_temp TEXT;

-- Step 2: Populate the temp column with correct course IDs
-- (for records that have UUID values, match them to the courses table)
UPDATE google_classroom_coursework cw
SET google_course_id_temp = c.google_course_id
FROM google_classroom_courses c
WHERE c.id::text = cw.google_course_id::text
  AND cw.google_course_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- For records that already have non-UUID values (shouldn't exist, but just in case)
UPDATE google_classroom_coursework
SET google_course_id_temp = google_course_id::text
WHERE google_course_id_temp IS NULL;

-- Step 3: Drop the old UUID column
ALTER TABLE google_classroom_coursework
DROP COLUMN google_course_id;

-- Step 4: Rename the temp column to the original name
ALTER TABLE google_classroom_coursework
RENAME COLUMN google_course_id_temp TO google_course_id;

-- Step 5: Add NOT NULL constraint
ALTER TABLE google_classroom_coursework
ALTER COLUMN google_course_id SET NOT NULL;

-- Step 6: Add index for performance (if it existed before)
CREATE INDEX IF NOT EXISTS idx_google_classroom_coursework_google_course_id
ON google_classroom_coursework(google_course_id);

-- Log completion
DO $$
DECLARE
    fixed_count integer;
BEGIN
    SELECT COUNT(*) INTO fixed_count FROM google_classroom_coursework;
    RAISE NOTICE 'Migrated % coursework records to use TEXT google_course_id', fixed_count;
END $$;
