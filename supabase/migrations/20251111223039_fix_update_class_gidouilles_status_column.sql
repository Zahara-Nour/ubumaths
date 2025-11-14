-- Migration: Fix update_class_gidouilles function - remove non-existent status column reference
-- Created: 2025-11-11
--
-- PROBLEM:
-- --------
-- The update_class_gidouilles() function in migration 20251111173411 references
-- a non-existent column `cm.status = 'active'` in the class_members table.
--
-- The class_members table only has these columns:
-- - id (UUID)
-- - class_id (UUID)
-- - student_id (UUID)
-- - joined_at (TIMESTAMPTZ)
--
-- There is NO status column.
--
-- FIX:
-- ----
-- Recreate the function WITHOUT the status column reference.
-- This restores the WHERE clause to match the original working version
-- from migration 024_add_gidouilles_rpc_functions.sql while keeping
-- all the race condition fixes (GREATEST, atomic UPDATE).
--
-- BEFORE (BROKEN):
--   WHERE id IN (
--     SELECT cm.student_id
--     FROM class_members cm
--     WHERE cm.class_id = p_class_id
--       AND cm.status = 'active'  -- ❌ Column doesn't exist
--   );
--
-- AFTER (FIXED):
--   WHERE id IN (
--     SELECT cm.student_id
--     FROM class_members cm
--     WHERE cm.class_id = p_class_id
--   );

-- ============================================================================
-- FUNCTION: update_class_gidouilles (FIXED - FINAL VERSION)
-- ============================================================================
-- Updates the gidouilles count for ALL students in a class using atomic UPDATE.
--
-- CHANGES FROM 20251111173411:
-- - Removed non-existent `cm.status = 'active'` condition
-- - Keeps all race condition fixes (GREATEST, atomic UPDATE)
--
-- CHANGES FROM ORIGINAL (024_add_gidouilles_rpc_functions.sql):
-- - UPDATE now uses: GREATEST(0, gidouilles + p_delta)
-- - Removed the WHERE clause safety check (now handled by GREATEST())
-- - All students are updated (those who would go negative are clamped to 0)
--
-- SECURITY: All security checks preserved
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

  -- Update all students in the class (atomic operation)
  -- GREATEST(0, gidouilles + p_delta) ensures no student goes below 0
  -- ✅ FIXED: Removed non-existent 'cm.status = active' condition
  UPDATE profiles
  SET gidouilles = GREATEST(0, gidouilles + p_delta),
      updated_at = NOW()
  WHERE id IN (
    SELECT cm.student_id
    FROM class_members cm
    WHERE cm.class_id = p_class_id
  );

  -- Get count of rows updated
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;

  -- Return count of students updated
  RETURN v_affected_rows;
END;
$$;

-- Function permissions (unchanged)
GRANT EXECUTE ON FUNCTION update_class_gidouilles(UUID, INTEGER) TO authenticated;

-- Updated function comment
COMMENT ON FUNCTION update_class_gidouilles(UUID, INTEGER) IS
'Securely updates gidouilles for all students in a class using atomic UPDATE (race-condition safe). Only the class teacher can call this. Students who would go negative are clamped to 0.';
