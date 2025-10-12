-- Migration: Add RPC functions for managing student gidouilles (rewards)
-- Created: 2025-10-12
--
-- This migration adds secure RPC functions that allow teachers to update
-- their students' gidouilles (reward points) safely without granting direct
-- UPDATE permissions on the profiles table.
--
-- SECURITY MODEL:
-- ---------------
-- Teachers should NOT have direct UPDATE access to the profiles table, as it
-- contains sensitive fields (role, school_id, etc.). Instead, we create
-- SECURITY DEFINER functions that:
-- 1. Verify the teacher owns the class containing the student
-- 2. Only modify the gidouilles field (nothing else)
-- 3. Enforce business rules (minimum 0 gidouilles)
--
-- FUNCTIONS CREATED:
-- ------------------
-- 1. update_student_gidouilles(student_id, delta)
--    - Updates gidouilles for a single student
--    - Verifies teacher-student relationship via class membership
--
-- 2. update_class_gidouilles(class_id, delta)
--    - Updates gidouilles for all students in a class
--    - Verifies teacher owns the class
--    - Returns count of students updated

-- ============================================================================
-- FUNCTION 1: update_student_gidouilles
-- ============================================================================
-- Updates the gidouilles count for a single student.
--
-- PARAMETERS:
--   p_student_id (UUID): The student's profile ID
--   p_delta (INTEGER): Amount to add/subtract (can be negative)
--
-- RETURNS:
--   INTEGER: New gidouilles count after update
--
-- SECURITY:
--   - SECURITY DEFINER: Runs with creator's permissions (bypasses RLS)
--   - Verifies caller is a teacher via is_teacher_or_admin()
--   - Verifies student is in one of the teacher's classes
--   - Prevents gidouilles from going below 0
--
-- USAGE:
--   SELECT update_student_gidouilles('student-uuid', 5);  -- Add 5
--   SELECT update_student_gidouilles('student-uuid', -2); -- Remove 2
--
-- ERRORS:
--   - 'Unauthorized: Only teachers can update gidouilles'
--   - 'Unauthorized: Student is not in your classes'
--   - 'Invalid operation: Gidouilles cannot be negative'

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
  v_current_gidouilles INTEGER;
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

  -- Get current gidouilles count
  SELECT gidouilles INTO v_current_gidouilles
  FROM profiles
  WHERE id = p_student_id;

  -- Calculate new value
  v_new_gidouilles := v_current_gidouilles + p_delta;

  -- Enforce minimum of 0
  IF v_new_gidouilles < 0 THEN
    RAISE EXCEPTION 'Invalid operation: Gidouilles cannot be negative (current: %, delta: %)',
      v_current_gidouilles, p_delta;
  END IF;

  -- Update the gidouilles field ONLY
  UPDATE profiles
  SET gidouilles = v_new_gidouilles,
      updated_at = NOW()
  WHERE id = p_student_id;

  -- Return the new value
  RETURN v_new_gidouilles;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_student_gidouilles(UUID, INTEGER) TO authenticated;

-- Add function comment for documentation
COMMENT ON FUNCTION update_student_gidouilles(UUID, INTEGER) IS
'Securely updates a student''s gidouilles count. Only teachers who have the student in their classes can call this. Enforces minimum of 0 gidouilles.';


-- ============================================================================
-- FUNCTION 2: update_class_gidouilles
-- ============================================================================
-- Updates the gidouilles count for ALL students in a class.
--
-- PARAMETERS:
--   p_class_id (UUID): The class ID
--   p_delta (INTEGER): Amount to add/subtract for each student
--
-- RETURNS:
--   INTEGER: Number of students updated
--
-- SECURITY:
--   - SECURITY DEFINER: Runs with creator's permissions (bypasses RLS)
--   - Verifies caller is the teacher who owns the class
--   - Only updates students where new value would be >= 0
--
-- USAGE:
--   SELECT update_class_gidouilles('class-uuid', 10);  -- Add 10 to all
--   SELECT update_class_gidouilles('class-uuid', -5);  -- Remove 5 from all
--
-- ERRORS:
--   - 'Unauthorized: Only teachers can update gidouilles'
--   - 'Unauthorized: You are not the teacher of this class'
--
-- NOTE:
--   If p_delta is negative and would cause some students to go below 0,
--   those students are SKIPPED (their gidouilles stay at current value).
--   The function returns the count of students actually updated.

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
  v_updated_count INTEGER;
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

  -- Update all students in the class
  -- Only update if the new value would be >= 0 (prevent negative gidouilles)
  UPDATE profiles
  SET gidouilles = gidouilles + p_delta,
      updated_at = NOW()
  WHERE id IN (
    SELECT student_id
    FROM class_members
    WHERE class_id = p_class_id
  )
  AND (gidouilles + p_delta) >= 0; -- Safety check: don't go negative

  -- Get count of rows updated
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- Return count of students updated
  RETURN v_updated_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_class_gidouilles(UUID, INTEGER) TO authenticated;

-- Add function comment for documentation
COMMENT ON FUNCTION update_class_gidouilles(UUID, INTEGER) IS
'Securely updates gidouilles for all students in a class. Only the class teacher can call this. Skips students where the update would result in negative gidouilles.';
