-- Migration: Fix race conditions in gidouilles RPC functions
-- Created: 2025-11-11
--
-- This migration fixes critical race conditions in the existing gidouilles
-- update functions. The original implementation had a SELECT-then-UPDATE pattern
-- which is vulnerable to race conditions when multiple requests happen concurrently.
--
-- RACE CONDITION EXAMPLE (Original Code):
-- Time | Request A                    | Request B
-- ----------------------------------------------------------------
-- T1   | SELECT bonus (gets 10)       |
-- T2   |                              | SELECT bonus (gets 10)
-- T3   | UPDATE bonus = 10 + 5 = 15   |
-- T4   |                              | UPDATE bonus = 10 + 3 = 13 ❌
-- Result: Lost update! Should be 18, but is 13.
--
-- FIX:
-- Replace SELECT-then-UPDATE with atomic UPDATE using GREATEST():
--   UPDATE profiles SET bonus = GREATEST(0, bonus + delta)
--
-- This ensures:
-- 1. The read and write happen atomically (no race condition)
-- 2. The minimum value of 0 is enforced at database level
-- 3. Simpler code (no separate validation needed)
--
-- FUNCTIONS UPDATED:
-- ------------------
-- 1. update_student_gidouilles() - Single student update
-- 2. update_class_gidouilles() - Batch update for entire class
--
-- CONSTRAINTS ADDED:
-- ------------------
-- - profiles_gidouilles_non_negative: CHECK constraint for defense in depth

-- ============================================================================
-- FUNCTION 1: update_student_gidouilles (FIXED)
-- ============================================================================
-- Updates the gidouilles count for a single student using atomic UPDATE.
--
-- CHANGES FROM ORIGINAL:
-- - Removed v_current_gidouilles variable (no longer needed)
-- - Removed SELECT + IF validation (replaced with GREATEST())
-- - UPDATE now uses: GREATEST(0, gidouilles + p_delta)
-- - Added RETURNING clause to get new value atomically
--
-- SECURITY: All original security checks preserved
-- - SECURITY DEFINER with search_path = public
-- - Teacher verification via is_teacher_or_admin()
-- - Student-in-class verification via JOIN
--
-- PARAMETERS:
--   p_student_id (UUID): The student's profile ID
--   p_delta (INTEGER): Amount to add/subtract (can be negative)
--
-- RETURNS:
--   INTEGER: New gidouilles count after update (minimum 0)
--
-- USAGE:
--   SELECT update_student_gidouilles('student-uuid', 5);  -- Add 5
--   SELECT update_student_gidouilles('student-uuid', -2); -- Remove 2
--   SELECT update_student_gidouilles('student-uuid', -999); -- Returns 0 (clamped)

CREATE OR REPLACE FUNCTION update_student_gidouilles(
  p_student_id UUID,
  p_delta INTEGER
)
RETURNS INTEGER
SECURITY DEFINER -- Run with function creator's permissions
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_teacher_id UUID;
  v_is_teacher BOOLEAN;
  v_student_in_class BOOLEAN;
  v_new_gidouilles INTEGER;
BEGIN
  -- Get the current user's ID (the teacher calling this function)
  v_teacher_id := auth.uid();

  -- Check if caller is a teacher or admin
  v_is_teacher := is_teacher_or_admin();

  IF NOT v_is_teacher THEN
    RAISE EXCEPTION 'Unauthorized: Only teachers can update gidouilles';
  END IF;

  -- Check if student is in one of the teacher's classes
  -- This query checks if there exists a class_member record where:
  -- - The student is p_student_id
  -- - The class is owned by the current teacher
  SELECT EXISTS (
    SELECT 1
    FROM class_members cm
    INNER JOIN classes c ON c.id = cm.class_id
    WHERE cm.student_id = p_student_id
      AND c.teacher_id = v_teacher_id
  ) INTO v_student_in_class;

  IF NOT v_student_in_class THEN
    RAISE EXCEPTION 'Unauthorized: Student is not in your classes';
  END IF;

  -- Update the gidouilles field ONLY (atomic operation with built-in minimum enforcement)
  -- GREATEST(0, gidouilles + p_delta) ensures the result is never negative
  UPDATE profiles
  SET gidouilles = GREATEST(0, gidouilles + p_delta),
      updated_at = NOW()
  WHERE id = p_student_id
  RETURNING gidouilles INTO v_new_gidouilles;

  -- Return the new value
  RETURN v_new_gidouilles;
END;
$$;

-- Function permissions and documentation (unchanged from original)
GRANT EXECUTE ON FUNCTION update_student_gidouilles(UUID, INTEGER) TO authenticated;

COMMENT ON FUNCTION update_student_gidouilles(UUID, INTEGER) IS
'Securely updates a student''s gidouilles count using atomic UPDATE (race-condition safe). Only teachers who have the student in their classes can call this. Enforces minimum of 0 gidouilles.';


-- ============================================================================
-- FUNCTION 2: update_class_gidouilles (FIXED)
-- ============================================================================
-- Updates the gidouilles count for ALL students in a class using atomic UPDATE.
--
-- CHANGES FROM ORIGINAL:
-- - UPDATE now uses: GREATEST(0, gidouilles + p_delta)
-- - Removed the WHERE clause safety check (now handled by GREATEST())
-- - All students are updated (those who would go negative are clamped to 0)
-- - Simpler logic, same result
--
-- SECURITY: All original security checks preserved
-- - SECURITY DEFINER with search_path = public
-- - Teacher verification via is_teacher_or_admin()
-- - Class ownership verification
--
-- PARAMETERS:
--   p_class_id (UUID): The class ID
--   p_delta (INTEGER): Amount to add/subtract for each student
--
-- RETURNS:
--   INTEGER: Number of students updated
--
-- USAGE:
--   SELECT update_class_gidouilles('class-uuid', 10);  -- Add 10 to all
--   SELECT update_class_gidouilles('class-uuid', -5);  -- Remove 5 from all (min 0)
--
-- NOTE:
--   All students are updated. If p_delta would cause a student to go below 0,
--   their gidouilles are set to 0 (via GREATEST()).

CREATE OR REPLACE FUNCTION update_class_gidouilles(
  p_class_id UUID,
  p_delta INTEGER
)
RETURNS INTEGER
SECURITY DEFINER -- Run with function creator's permissions
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_teacher_id UUID;
  v_is_teacher BOOLEAN;
  v_owns_class BOOLEAN;
  v_affected_rows INTEGER;
BEGIN
  -- Get the current user's ID (the teacher calling this function)
  v_teacher_id := auth.uid();

  -- Check if caller is a teacher or admin
  v_is_teacher := is_teacher_or_admin();

  IF NOT v_is_teacher THEN
    RAISE EXCEPTION 'Unauthorized: Only teachers can update gidouilles';
  END IF;

  -- Check if the teacher owns this class
  SELECT EXISTS (
    SELECT 1
    FROM classes
    WHERE id = p_class_id
      AND teacher_id = v_teacher_id
  ) INTO v_owns_class;

  IF NOT v_owns_class THEN
    RAISE EXCEPTION 'Unauthorized: You are not the teacher of this class';
  END IF;

  -- Update all active students in the class (atomic operation)
  -- GREATEST(0, gidouilles + p_delta) ensures no student goes below 0
  UPDATE profiles
  SET gidouilles = GREATEST(0, gidouilles + p_delta),
      updated_at = NOW()
  WHERE id IN (
    SELECT cm.student_id
    FROM class_members cm
    WHERE cm.class_id = p_class_id
      AND cm.status = 'active'
  );

  -- Get count of rows updated
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;

  -- Return count of students updated
  RETURN v_affected_rows;
END;
$$;

-- Function permissions and documentation (unchanged from original)
GRANT EXECUTE ON FUNCTION update_class_gidouilles(UUID, INTEGER) TO authenticated;

COMMENT ON FUNCTION update_class_gidouilles(UUID, INTEGER) IS
'Securely updates gidouilles for all active students in a class using atomic UPDATE (race-condition safe). Only the class teacher can call this. Students who would go negative are clamped to 0.';


-- ============================================================================
-- STEP 3: Add CHECK constraint to enforce gidouilles >= 0 at database level
-- ============================================================================
-- This provides defense in depth - even if the function logic has a bug,
-- the database will prevent negative gidouilles values.
--
-- NOTE: This constraint may already exist if the table was created with it.
-- We use IF NOT EXISTS equivalent (DO block) to avoid errors on re-run.

DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_gidouilles_non_negative'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_gidouilles_non_negative CHECK (gidouilles >= 0);
  END IF;
END $$;
