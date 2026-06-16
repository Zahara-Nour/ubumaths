-- Migration: Add RPC function for managing student bonus (rewards)
-- Created: 2025-11-11
--
-- This migration adds a bonus column and secure RPC function that allows teachers
-- to update their students' bonus (additional reward points) safely without granting
-- direct UPDATE permissions on the profiles table.
--
-- BACKGROUND:
-- This replicates the exact pattern used for gidouilles (see migration 024).
-- Bonus works identically to gidouilles - it's a separate currency/points system.
--
-- SECURITY MODEL:
-- ---------------
-- Teachers should NOT have direct UPDATE access to the profiles table, as it
-- contains sensitive fields (role, school_id, etc.). Instead, we create a
-- SECURITY DEFINER function that:
-- 1. Verifies the teacher owns the class containing the student
-- 2. Only modifies the bonus field (nothing else)
-- 3. Enforces business rules (minimum 0 bonus)
--
-- FUNCTION CREATED:
-- -----------------
-- update_student_bonus(student_id, delta)
--    - Updates bonus for a single student
--    - Verifies teacher-student relationship via class membership

-- ============================================================================
-- STEP 1: Add bonus column to profiles table
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bonus INTEGER DEFAULT 0 NOT NULL;

-- Add comment explaining the new field
COMMENT ON COLUMN profiles.bonus IS 'Student bonus points for rewards system (separate from gidouilles)';

-- ============================================================================
-- STEP 2: Create update_student_bonus RPC function
-- ============================================================================
-- Updates the bonus count for a single student.
--
-- PARAMETERS:
--   p_student_id (UUID): The student's profile ID
--   p_delta (INTEGER): Amount to add/subtract (can be negative)
--
-- RETURNS:
--   INTEGER: New bonus count after update
--
-- SECURITY:
--   - SECURITY DEFINER: Runs with creator's permissions (bypasses RLS)
--   - Verifies caller is a teacher via is_teacher_or_admin()
--   - Verifies student is in one of the teacher's classes
--   - Prevents bonus from going below 0
--
-- USAGE:
--   SELECT update_student_bonus('student-uuid', 5);  -- Add 5
--   SELECT update_student_bonus('student-uuid', -2); -- Remove 2
--
-- ERRORS:
--   - 'Unauthorized: Only teachers can update bonus'
--   - 'Unauthorized: Student is not in your classes'
--   - 'Invalid operation: Bonus cannot be negative'

CREATE OR REPLACE FUNCTION update_student_bonus(
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
  v_new_bonus INTEGER;
BEGIN
  -- Get the current user's ID (the teacher calling this function)
  v_teacher_id := auth.uid();

  -- Check if caller is a teacher or admin
  v_is_teacher := is_teacher_or_admin();

  IF NOT v_is_teacher THEN
    RAISE EXCEPTION 'Unauthorized: Only teachers can update bonus';
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

  -- Update the bonus field ONLY (atomic operation with built-in minimum enforcement)
  -- GREATEST(0, bonus + p_delta) ensures the result is never negative
  UPDATE profiles
  SET bonus = GREATEST(0, bonus + p_delta),
      updated_at = NOW()
  WHERE id = p_student_id
  RETURNING bonus INTO v_new_bonus;

  -- Return the new value
  RETURN v_new_bonus;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_student_bonus(UUID, INTEGER) TO authenticated;

-- Add function comment for documentation
COMMENT ON FUNCTION update_student_bonus(UUID, INTEGER) IS
'Securely updates a student''s bonus count. Only teachers who have the student in their classes can call this. Enforces minimum of 0 bonus.';

-- ============================================================================
-- STEP 3: Add CHECK constraint to enforce bonus >= 0 at database level
-- ============================================================================
-- This provides defense in depth - even if the function logic has a bug,
-- the database will prevent negative bonus values.

ALTER TABLE profiles ADD CONSTRAINT profiles_bonus_non_negative CHECK (bonus >= 0);
