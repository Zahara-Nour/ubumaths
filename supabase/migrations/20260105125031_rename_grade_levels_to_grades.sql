-- ============================================================================
-- MIGRATION: Rename grade_levels to grades
-- ============================================================================
-- Description: Standardize column naming for grade arrays
-- Convention:
--   - 'grade' (singular) for single grade (GradeCode)
--   - 'grades' (plural) for multiple grades (GradeCode[])
--
-- Tables affected:
-- - exercises: grade_levels -> grades
-- - worksheets: grade_levels -> grades
-- - rag_documents: grade_levels -> grades
--
-- Functions affected:
-- - get_student_exercises
-- - get_my_exercise_assignments
-- - get_teacher_exercise_assignments
-- - get_all_exercise_assignments
--
-- This migration is IDEMPOTENT - safe to run multiple times
-- ============================================================================

-- ============================================================================
-- SECTION 1: Rename column in exercises table
-- ============================================================================

-- Drop existing constraint (uses old column name)
ALTER TABLE public.exercises
DROP CONSTRAINT IF EXISTS exercises_valid_grade_levels;

-- Drop existing index
DROP INDEX IF EXISTS public.idx_exercises_grade_levels;

-- Rename the column
ALTER TABLE public.exercises
RENAME COLUMN grade_levels TO grades;

-- Recreate the index with new name
CREATE INDEX IF NOT EXISTS idx_exercises_grades ON public.exercises USING GIN(grades);

-- Recreate the constraint with new name
ALTER TABLE public.exercises
ADD CONSTRAINT exercises_valid_grades CHECK (
    public.is_valid_grade_array(grades)
);

-- Update comment
COMMENT ON COLUMN public.exercises.grades IS
    'Applicable grade levels using canonical GradeCode values: CP, CE1, CE2, CM1, CM2, 6, 5, 4, 3, 2, 1_GEN, T_GEN, 1_SPE, T_SPE, T_EXP, T_COMP, 1_STMG, T_STMG';

-- ============================================================================
-- SECTION 2: Rename column in worksheets table
-- ============================================================================

-- Drop existing index
DROP INDEX IF EXISTS public.idx_worksheets_grade_levels;

-- Rename the column
ALTER TABLE public.worksheets
RENAME COLUMN grade_levels TO grades;

-- Recreate the index with new name
CREATE INDEX IF NOT EXISTS idx_worksheets_grades ON public.worksheets USING GIN(grades);

-- Add constraint (worksheets didn't have one before)
ALTER TABLE public.worksheets
DROP CONSTRAINT IF EXISTS worksheets_valid_grades;

ALTER TABLE public.worksheets
ADD CONSTRAINT worksheets_valid_grades CHECK (
    public.is_valid_grade_array(grades)
);

-- Update comment
COMMENT ON COLUMN public.worksheets.grades IS
    'Applicable grade levels using canonical GradeCode values: CP, CE1, CE2, CM1, CM2, 6, 5, 4, 3, 2, 1_GEN, T_GEN, 1_SPE, T_SPE, T_EXP, T_COMP, 1_STMG, T_STMG';

-- ============================================================================
-- SECTION 3: Rename column in rag_documents table
-- ============================================================================

-- Drop existing index
DROP INDEX IF EXISTS public.idx_rag_documents_grade_levels;

-- Rename the column
ALTER TABLE public.rag_documents
RENAME COLUMN grade_levels TO grades;

-- Recreate the index with new name
CREATE INDEX IF NOT EXISTS idx_rag_documents_grades ON public.rag_documents USING GIN(grades);

-- Add constraint
ALTER TABLE public.rag_documents
DROP CONSTRAINT IF EXISTS rag_documents_valid_grades;

ALTER TABLE public.rag_documents
ADD CONSTRAINT rag_documents_valid_grades CHECK (
    public.is_valid_grade_array(grades)
);

-- Update comment
COMMENT ON COLUMN public.rag_documents.grades IS
    'Applicable grade levels using canonical GradeCode values: CP, CE1, CE2, CM1, CM2, 6, 5, 4, 3, 2, 1_GEN, T_GEN, 1_SPE, T_SPE, T_EXP, T_COMP, 1_STMG, T_STMG';

-- ============================================================================
-- SECTION 4: Update functions that reference grade_levels
-- ============================================================================

-- 4.1 Drop and recreate get_student_exercises
DROP FUNCTION IF EXISTS public.get_student_exercises(uuid);

CREATE OR REPLACE FUNCTION get_student_exercises(p_student_id UUID)
RETURNS TABLE (
    exercise_id UUID,
    exercise_title TEXT,
    variations JSONB,
    shared JSONB,
    variables JSONB,
    distribution_mode TEXT,
    difficulty TEXT,
    tags TEXT[],
    grades TEXT[],
    assignment_id UUID,
    assignment_type TEXT,
    assigned_at TIMESTAMPTZ,
    optional_deadline TIMESTAMPTZ,
    notes TEXT,
    assigned_by_name TEXT,
    completed_at TIMESTAMPTZ,
    last_viewed_at TIMESTAMPTZ,
    view_count INTEGER
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT
        e.id as exercise_id,
        e.title as exercise_title,
        e.variations,
        e.shared,
        e.variables,
        e.distribution_mode,
        e.difficulty,
        e.tags,
        e.grades,
        ea.id as assignment_id,
        ea.assigned_to_type as assignment_type,
        ea.assigned_at,
        ea.optional_deadline,
        ea.notes,
        p.full_name as assigned_by_name,
        ec.completed_at,
        ec.last_viewed_at,
        ec.view_count
    FROM exercises e
    LEFT JOIN exercise_assignments ea ON e.id = ea.exercise_id
        AND ea.is_active = TRUE
        AND (
            ea.student_id = p_student_id
            OR ea.class_id IN (SELECT class_id FROM class_members WHERE student_id = p_student_id)
            OR ea.assigned_to_type = 'public'
        )
    LEFT JOIN profiles p ON ea.assigned_by = p.id
    LEFT JOIN exercise_completions ec ON e.id = ec.exercise_id
        AND ec.student_id = p_student_id
    WHERE
        -- Student has access via public status or assignment
        e.is_public = TRUE
        OR ea.id IS NOT NULL
    ORDER BY
        -- Prioritize: incomplete assigned, then recent views, then assigned_at
        CASE WHEN ea.id IS NOT NULL AND ec.completed_at IS NULL THEN 0 ELSE 1 END,
        ec.last_viewed_at DESC NULLS LAST,
        ea.assigned_at DESC NULLS LAST;
$$;

COMMENT ON FUNCTION get_student_exercises IS
    'Returns all exercises accessible by a student with assignment and completion details. Ordered by incomplete assignments first, then recent activity.';

-- 4.2 Recreate get_my_exercise_assignments with grades instead of grade_levels
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
  grades TEXT[],
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
    e.grades,
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

-- 4.3 Recreate get_teacher_exercise_assignments with grades instead of grade_levels
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
  grades TEXT[],
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
    e.grades,
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

-- 4.4 Recreate get_all_exercise_assignments with grades instead of grade_levels
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
  grades TEXT[],
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
    e.grades,
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
GRANT EXECUTE ON FUNCTION public.get_student_exercises(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_exercise_assignments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_exercise_assignments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_exercise_assignments() TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
--
-- Summary:
-- 1. Renamed grade_levels -> grades in exercises, worksheets, rag_documents
-- 2. Updated indexes to use new column name
-- 3. Added/updated CHECK constraints
-- 4. Updated column comments
-- 5. Updated functions: get_student_exercises, get_my_exercise_assignments,
--    get_teacher_exercise_assignments, get_all_exercise_assignments
--
-- Next steps:
-- 1. Run: pnpm db:migrate
-- 2. Run: pnpm db:types (regenerate TypeScript types)
-- 3. Update application code to use 'grades' instead of 'grade_levels'
-- ============================================================================
