-- Migration: Rebuild exercise functions to read tags from the junction table
-- Created: 2026-05-09
--
-- Follows up the tag-normalization migration (20260509094828) which dropped
-- exercises.tags. Four SECURITY DEFINER functions defined in
-- 20260105125031_rename_grade_levels_to_grades.sql still referenced `e.tags`
-- in their SELECT bodies. PostgreSQL doesn't revalidate function bodies on
-- DROP COLUMN, so the functions silently became broken: any call would error
-- with "column tags does not exist".
--
-- Rebuild each function to reconstruct `tags TEXT[]` from the new junction
-- (exercise_tags + tags catalog). The return signature is preserved, so
-- application code consuming these functions doesn't change.
--
-- Performance: each row triggers a small lateral subquery; OK for typical
-- assignment lists (≤ a few hundred rows). If volume grows, swap to a JOIN
-- on a materialised view aggregating tag names per exercise.

-- ============================================================================
-- Helper inline (Postgres ARRAY subselect over the junction)
-- ============================================================================
-- Each function below uses:
--
--   COALESCE(
--     ARRAY(
--       SELECT t.name FROM exercise_tags et
--       JOIN tags t ON t.id = et.tag_id
--       WHERE et.exercise_id = e.id
--       ORDER BY t.name
--     ),
--     '{}'::TEXT[]
--   ) AS tags
--
-- to keep the same TEXT[] shape the callers expect.

-- ============================================================================
-- 1. get_student_exercises (orig: 20260105125031, lines 112-176)
-- ============================================================================

DROP FUNCTION IF EXISTS get_student_exercises(UUID);
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
        COALESCE(
            ARRAY(
                SELECT t.name FROM exercise_tags et
                JOIN tags t ON t.id = et.tag_id
                WHERE et.exercise_id = e.id
                ORDER BY t.name
            ),
            '{}'::TEXT[]
        ) AS tags,
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
        e.is_public = TRUE
        OR ea.id IS NOT NULL
    ORDER BY
        CASE WHEN ea.id IS NOT NULL AND ec.completed_at IS NULL THEN 0 ELSE 1 END,
        ec.last_viewed_at DESC NULLS LAST,
        ea.assigned_at DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_exercises(uuid) TO authenticated;

-- ============================================================================
-- 2. get_my_exercise_assignments (orig: 20260105125031, lines 183-262)
-- ============================================================================

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
        COALESCE(
            ARRAY(
                SELECT t.name FROM exercise_tags et
                JOIN tags t ON t.id = et.tag_id
                WHERE et.exercise_id = e.id
                ORDER BY t.name
            ),
            '{}'::TEXT[]
        ) AS tags,
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
            ea.student_id = auth.uid()
            OR ea.class_id IN (
                SELECT class_id FROM class_members WHERE student_id = auth.uid()
            )
            OR ea.assigned_to_type = 'public'
        );
$$;

GRANT EXECUTE ON FUNCTION public.get_my_exercise_assignments() TO authenticated;

-- ============================================================================
-- 3. get_teacher_exercise_assignments (orig: 20260105125031, lines 266-336)
-- ============================================================================

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
        COALESCE(
            ARRAY(
                SELECT t.name FROM exercise_tags et
                JOIN tags t ON t.id = et.tag_id
                WHERE et.exercise_id = e.id
                ORDER BY t.name
            ),
            '{}'::TEXT[]
        ) AS tags,
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
        AND ea.assigned_by = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_teacher_exercise_assignments() TO authenticated;

-- ============================================================================
-- 4. get_all_exercise_assignments (orig: 20260105125031, lines 340-413)
-- ============================================================================

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
        COALESCE(
            ARRAY(
                SELECT t.name FROM exercise_tags et
                JOIN tags t ON t.id = et.tag_id
                WHERE et.exercise_id = e.id
                ORDER BY t.name
            ),
            '{}'::TEXT[]
        ) AS tags,
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

GRANT EXECUTE ON FUNCTION public.get_all_exercise_assignments() TO authenticated;
