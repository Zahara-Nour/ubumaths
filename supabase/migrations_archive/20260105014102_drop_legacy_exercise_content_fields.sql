-- Migration: Drop legacy statement_md and solution_md columns
-- ============================================================
--
-- These columns are no longer used by the application.
-- All exercise content now comes from the `variations` JSONB array.
--
-- The columns were kept temporarily during the migration to variations
-- to allow for rollback if needed. The migration has been validated
-- and these columns can now be safely removed.

-- First, drop the view that depends on these columns
DROP VIEW IF EXISTS assigned_exercises_with_details;

-- Drop and recreate functions that reference these columns
-- They now return `variations` and `shared` instead of statement_md/solution_md

-- Function: Get exercise assignments for current student
DROP FUNCTION IF EXISTS public.get_my_exercise_assignments();
CREATE OR REPLACE FUNCTION public.get_my_exercise_assignments()
RETURNS TABLE (
  id UUID,
  exercise_id UUID,
  assigned_by UUID,
  assigned_to_type TEXT,
  student_id UUID,
  class_id UUID,
  assigned_at TIMESTAMPTZ,
  optional_deadline TIMESTAMPTZ,
  notes TEXT,
  is_active BOOLEAN,
  exercise_title TEXT,
  variations JSONB,
  shared JSONB,
  variables JSONB,
  distribution_mode TEXT,
  exercise_is_public BOOLEAN,
  difficulty TEXT,
  tags TEXT[],
  grade_levels TEXT[],
  exercise_creator_id UUID,
  assigned_by_name TEXT,
  assigned_by_role TEXT,
  assigned_to_name TEXT,
  student_email TEXT,
  class_name TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ea.id,
    ea.exercise_id,
    ea.assigned_by,
    ea.assigned_to_type,
    ea.student_id,
    ea.class_id,
    ea.assigned_at,
    ea.optional_deadline,
    ea.notes,
    ea.is_active,
    e.title as exercise_title,
    e.variations,
    e.shared,
    e.variables,
    e.distribution_mode,
    e.is_public as exercise_is_public,
    e.difficulty,
    e.tags,
    e.grade_levels,
    e.created_by as exercise_creator_id,
    p.full_name as assigned_by_name,
    p.role as assigned_by_role,
    CASE
      WHEN ea.assigned_to_type = 'student' THEN s.full_name
      WHEN ea.assigned_to_type = 'class' THEN c.name
      ELSE 'Public'
    END as assigned_to_name,
    s.email as student_email,
    c.name as class_name
  FROM exercise_assignments ea
  JOIN exercises e ON ea.exercise_id = e.id
  JOIN profiles p ON ea.assigned_by = p.id
  LEFT JOIN profiles s ON ea.student_id = s.id
  LEFT JOIN classes c ON ea.class_id = c.id
  WHERE ea.is_active = TRUE
    AND (
      -- Direct assignment to student
      ea.student_id = auth.uid()
      -- Class assignment where student is a member
      OR ea.class_id IN (
        SELECT class_id FROM class_members WHERE student_id = auth.uid()
      )
      -- Public assignment
      OR ea.assigned_to_type = 'public'
    );
$$;

-- Function: Get exercise assignments for current teacher
DROP FUNCTION IF EXISTS public.get_teacher_exercise_assignments();
CREATE OR REPLACE FUNCTION public.get_teacher_exercise_assignments()
RETURNS TABLE (
  id UUID,
  exercise_id UUID,
  assigned_by UUID,
  assigned_to_type TEXT,
  student_id UUID,
  class_id UUID,
  assigned_at TIMESTAMPTZ,
  optional_deadline TIMESTAMPTZ,
  notes TEXT,
  is_active BOOLEAN,
  exercise_title TEXT,
  variations JSONB,
  shared JSONB,
  variables JSONB,
  distribution_mode TEXT,
  exercise_is_public BOOLEAN,
  difficulty TEXT,
  tags TEXT[],
  grade_levels TEXT[],
  exercise_creator_id UUID,
  assigned_by_name TEXT,
  assigned_by_role TEXT,
  assigned_to_name TEXT,
  student_email TEXT,
  class_name TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ea.id,
    ea.exercise_id,
    ea.assigned_by,
    ea.assigned_to_type,
    ea.student_id,
    ea.class_id,
    ea.assigned_at,
    ea.optional_deadline,
    ea.notes,
    ea.is_active,
    e.title as exercise_title,
    e.variations,
    e.shared,
    e.variables,
    e.distribution_mode,
    e.is_public as exercise_is_public,
    e.difficulty,
    e.tags,
    e.grade_levels,
    e.created_by as exercise_creator_id,
    p.full_name as assigned_by_name,
    p.role as assigned_by_role,
    CASE
      WHEN ea.assigned_to_type = 'student' THEN s.full_name
      WHEN ea.assigned_to_type = 'class' THEN c.name
      ELSE 'Public'
    END as assigned_to_name,
    s.email as student_email,
    c.name as class_name
  FROM exercise_assignments ea
  JOIN exercises e ON ea.exercise_id = e.id
  JOIN profiles p ON ea.assigned_by = p.id
  LEFT JOIN profiles s ON ea.student_id = s.id
  LEFT JOIN classes c ON ea.class_id = c.id
  WHERE ea.is_active = TRUE
    AND ea.assigned_by = auth.uid(); -- Only teacher's own assignments
$$;

-- Function: Get all exercise assignments (Admin only)
DROP FUNCTION IF EXISTS public.get_all_exercise_assignments();
CREATE OR REPLACE FUNCTION public.get_all_exercise_assignments()
RETURNS TABLE (
  id UUID,
  exercise_id UUID,
  assigned_by UUID,
  assigned_to_type TEXT,
  student_id UUID,
  class_id UUID,
  assigned_at TIMESTAMPTZ,
  optional_deadline TIMESTAMPTZ,
  notes TEXT,
  is_active BOOLEAN,
  exercise_title TEXT,
  variations JSONB,
  shared JSONB,
  variables JSONB,
  distribution_mode TEXT,
  exercise_is_public BOOLEAN,
  difficulty TEXT,
  tags TEXT[],
  grade_levels TEXT[],
  exercise_creator_id UUID,
  assigned_by_name TEXT,
  assigned_by_role TEXT,
  assigned_to_name TEXT,
  student_email TEXT,
  class_name TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ea.id,
    ea.exercise_id,
    ea.assigned_by,
    ea.assigned_to_type,
    ea.student_id,
    ea.class_id,
    ea.assigned_at,
    ea.optional_deadline,
    ea.notes,
    ea.is_active,
    e.title as exercise_title,
    e.variations,
    e.shared,
    e.variables,
    e.distribution_mode,
    e.is_public as exercise_is_public,
    e.difficulty,
    e.tags,
    e.grade_levels,
    e.created_by as exercise_creator_id,
    p.full_name as assigned_by_name,
    p.role as assigned_by_role,
    CASE
      WHEN ea.assigned_to_type = 'student' THEN s.full_name
      WHEN ea.assigned_to_type = 'class' THEN c.name
      ELSE 'Public'
    END as assigned_to_name,
    s.email as student_email,
    c.name as class_name
  FROM exercise_assignments ea
  JOIN exercises e ON ea.exercise_id = e.id
  JOIN profiles p ON ea.assigned_by = p.id
  LEFT JOIN profiles s ON ea.student_id = s.id
  LEFT JOIN classes c ON ea.class_id = c.id
  WHERE ea.is_active = TRUE
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_my_exercise_assignments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_exercise_assignments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_exercise_assignments() TO authenticated;

-- Now drop the legacy columns
ALTER TABLE exercises DROP COLUMN IF EXISTS statement_md;
ALTER TABLE exercises DROP COLUMN IF EXISTS solution_md;

-- Add comment to document the change
COMMENT ON TABLE exercises IS 'Exercise content is stored in the variations JSONB column. Legacy statement_md/solution_md columns were removed in January 2026.';
