-- Migration: Strategic Denormalization for Course and Teacher Names
-- Purpose: Eliminate RLS circular dependency by storing course_name and teacher_name in shared_coursework
-- Benefits: Better performance, simpler queries, no RLS complexity
-- Trade-off: Controlled denormalization (course names rarely change)
-- Date: 2025-11-15

-- ============================================================================
-- STEP 1: Add denormalized columns to shared_coursework
-- ============================================================================

ALTER TABLE public.shared_coursework
ADD COLUMN IF NOT EXISTS course_name TEXT,
ADD COLUMN IF NOT EXISTS teacher_name TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.shared_coursework.course_name IS 'Denormalized course name from google_classroom_courses (eliminates RLS circular dependency)';
COMMENT ON COLUMN public.shared_coursework.teacher_name IS 'Denormalized teacher name from profiles (eliminates extra JOIN)';

-- ============================================================================
-- STEP 2: Backfill existing data
-- ============================================================================

-- Update existing shared_coursework records with course and teacher names
-- SAFE: Uses service role context within migration
UPDATE public.shared_coursework
SET
    course_name = (
        SELECT gcc.name
        FROM public.google_classroom_coursework gcw
        JOIN public.google_classroom_courses gcc ON gcc.id = gcw.google_course_id
        WHERE gcw.id = shared_coursework.coursework_id
    ),
    teacher_name = (
        SELECT CONCAT(p.firstname, ' ', p.lastname)
        FROM public.profiles p
        WHERE p.id = shared_coursework.shared_by
    )
WHERE shared_coursework.course_name IS NULL OR shared_coursework.teacher_name IS NULL;

-- ============================================================================
-- STEP 3: Create trigger to maintain denormalized data on INSERT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.populate_shared_coursework_names()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS to fetch names
AS $$
DECLARE
    v_course_name TEXT;
    v_teacher_name TEXT;
BEGIN
    -- Fetch course name through the relationship
    SELECT gcc.name INTO v_course_name
    FROM public.google_classroom_coursework gcw
    JOIN public.google_classroom_courses gcc ON gcc.id = gcw.google_course_id
    WHERE gcw.id = NEW.coursework_id;

    -- Fetch teacher name
    SELECT CONCAT(firstname, ' ', lastname) INTO v_teacher_name
    FROM public.profiles
    WHERE id = NEW.shared_by;

    -- Set the denormalized values
    NEW.course_name := COALESCE(v_course_name, 'Unknown Course');
    NEW.teacher_name := COALESCE(v_teacher_name, 'Unknown Teacher');

    RETURN NEW;
END;
$$;

-- Create trigger for new inserts
DROP TRIGGER IF EXISTS trigger_populate_shared_coursework_names ON public.shared_coursework;
CREATE TRIGGER trigger_populate_shared_coursework_names
    BEFORE INSERT ON public.shared_coursework
    FOR EACH ROW
    EXECUTE FUNCTION public.populate_shared_coursework_names();

-- ============================================================================
-- STEP 4: Create trigger to handle course name updates (rare but important)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_shared_coursework_on_course_rename()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only proceed if the name actually changed
    IF NEW.name IS DISTINCT FROM OLD.name THEN
        -- Update all shared coursework that references this course
        UPDATE public.shared_coursework sc
        SET course_name = NEW.name
        FROM public.google_classroom_coursework gcw
        WHERE sc.coursework_id = gcw.id
        AND gcw.google_course_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger for course updates
DROP TRIGGER IF EXISTS trigger_update_shared_coursework_on_course_rename ON public.google_classroom_courses;
CREATE TRIGGER trigger_update_shared_coursework_on_course_rename
    AFTER UPDATE ON public.google_classroom_courses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_shared_coursework_on_course_rename();

-- ============================================================================
-- STEP 5: Create trigger to handle teacher name updates (also rare)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_shared_coursework_on_teacher_rename()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only proceed if the name actually changed
    IF (NEW.firstname IS DISTINCT FROM OLD.firstname) OR (NEW.lastname IS DISTINCT FROM OLD.lastname) THEN
        -- Update all shared coursework created by this teacher
        UPDATE public.shared_coursework
        SET teacher_name = CONCAT(NEW.firstname, ' ', NEW.lastname)
        WHERE shared_by = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger for profile updates
DROP TRIGGER IF EXISTS trigger_update_shared_coursework_on_teacher_rename ON public.profiles;
CREATE TRIGGER trigger_update_shared_coursework_on_teacher_rename
    AFTER UPDATE ON public.profiles
    FOR EACH ROW
    WHEN (NEW.role = 'teacher')
    EXECUTE FUNCTION public.update_shared_coursework_on_teacher_rename();

-- ============================================================================
-- STEP 6: Add index for performance
-- ============================================================================

-- Index for filtering by course name (if needed in the future)
CREATE INDEX IF NOT EXISTS idx_shared_coursework_course_name
ON public.shared_coursework(course_name)
WHERE course_name IS NOT NULL;

-- ============================================================================
-- STEP 7: Add RLS policy for students (simple, no circular dependency!)
-- ============================================================================

-- Drop the problematic policy that caused infinite recursion
DROP POLICY IF EXISTS "Students can view courses from shared coursework" ON public.google_classroom_courses;

-- Students now get course names directly from shared_coursework table
-- No need to access google_classroom_courses table at all!

-- Add a new simpler policy: Students can only see courses if explicitly needed
-- (e.g., for viewing course details page - not needed for listing coursework)
CREATE POLICY "Students can view courses they have explicit access to"
ON public.google_classroom_courses
FOR SELECT
TO authenticated
USING (
    -- This policy is intentionally restrictive
    -- Students don't need direct course access for viewing shared coursework
    -- They get course names from the denormalized field
    FALSE
);

-- Comment on the approach
COMMENT ON POLICY "Students can view courses they have explicit access to" ON public.google_classroom_courses IS
    'Intentionally restrictive - students get course names from denormalized shared_coursework.course_name field';

-- ============================================================================
-- VERIFICATION QUERIES (commented out, for testing)
-- ============================================================================

/*
-- Verify all shared coursework has names populated
SELECT
    COUNT(*) as total,
    COUNT(course_name) as with_course_name,
    COUNT(teacher_name) as with_teacher_name
FROM public.shared_coursework;

-- Test the denormalized data
SELECT
    sc.id,
    sc.course_name,
    sc.teacher_name,
    gcw.title as coursework_title
FROM public.shared_coursework sc
JOIN public.google_classroom_coursework gcw ON gcw.id = sc.coursework_id
LIMIT 10;
*/

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================

-- This migration implements strategic denormalization to solve the RLS circular
-- dependency problem. The denormalized fields (course_name, teacher_name) are
-- automatically maintained by triggers, ensuring data consistency.
--
-- Benefits:
-- 1. Eliminates RLS complexity completely
-- 2. Better query performance (no JOINs needed)
-- 3. Simpler code in the application layer
-- 4. No service role bypass needed
--
-- Trade-offs:
-- 1. Minor data duplication (acceptable for rarely-changing data)
-- 2. Triggers add slight overhead on writes (negligible)
--
-- The triggers ensure that:
-- - New shares get names populated automatically
-- - Course renames propagate to all shared coursework
-- - Teacher name changes propagate to all their shares