-- Migration: Fix infinite recursion in assessments / assessment_assignments RLS
-- Purpose: Eliminate `42P17: infinite recursion detected in policy for relation
--          "assessments"` errors in Postgres logs.
--
-- Root cause (from migration 082_create_assessment_system.sql):
--   - assessments policy "Students can view assigned assessments" does
--     `EXISTS (SELECT FROM assessment_assignments ...)`.
--   - assessment_assignments policies "Teachers can view/create/delete
--     assignments for their assessments" do `EXISTS (SELECT FROM assessments ...)`.
--   - Permissive policies are OR'd, so Postgres must evaluate every applicable
--     policy regardless of which one would match the caller — the two tables'
--     cross-references form a cycle.
--
-- Fix (same pattern as 20260408110846_fix_listings_proposer_policy_recursion.sql):
--   Wrap each cross-table existence check in a SECURITY DEFINER function. The
--   function runs as its owner and bypasses RLS on the inner SELECT, breaking
--   the cycle. The caller's auth.uid() is still visible inside the function,
--   so authorization semantics are preserved.
--
-- Behavioral guarantee: same users see the same rows as before. Only the
-- internal RLS mechanism changes.

-- ============================================================================
-- PART 1: SECURITY DEFINER helper functions
-- ============================================================================

-- True iff the current user owns the given assessment.
-- Used by assessment_assignments policies to avoid re-entering assessments RLS.
CREATE OR REPLACE FUNCTION public.is_assessment_owner(p_assessment_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.assessments a
    WHERE a.id = p_assessment_id
      AND a.created_by = auth.uid()
  );
$$;

-- True iff the current student has an assignment (direct or via class) for
-- the given assessment. Used by the assessments student-SELECT policy to
-- avoid re-entering assessment_assignments RLS.
CREATE OR REPLACE FUNCTION public.student_has_assignment_for_assessment(p_assessment_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.assessment_assignments aa
    WHERE aa.assessment_id = p_assessment_id
      AND (
        aa.student_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.class_members cm
          WHERE cm.class_id = aa.class_id
            AND cm.student_id = auth.uid()
        )
      )
  );
$$;

COMMENT ON FUNCTION public.is_assessment_owner(uuid) IS
'RLS helper: true iff auth.uid() created the assessment. SECURITY DEFINER to
bypass RLS on assessments — used by assessment_assignments policies to avoid
infinite recursion with the assessments student-SELECT policy.';

COMMENT ON FUNCTION public.student_has_assignment_for_assessment(uuid) IS
'RLS helper: true iff auth.uid() has an assessment_assignment (direct or via
class membership) for the given assessment. SECURITY DEFINER to bypass RLS on
assessment_assignments — used by the assessments student-SELECT policy to
avoid infinite recursion.';

-- Defense-in-depth: lock execute to authenticated only. For anon callers
-- auth.uid() is NULL and the helpers return false anyway, but pulling exec
-- from PUBLIC matches the pattern of is_admin() (20251105000000) and limits
-- the attack surface for any future role.
REVOKE EXECUTE ON FUNCTION public.is_assessment_owner(uuid),
                           public.student_has_assignment_for_assessment(uuid)
    FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_assessment_owner(uuid),
                          public.student_has_assignment_for_assessment(uuid)
    TO authenticated;

-- ============================================================================
-- PART 2: Recreate the 4 recursive policies (and 2 admin policies for
-- consistency with the codebase's is_admin() pattern)
-- ============================================================================

-- --- assessments --------------------------------------------------------------

DROP POLICY IF EXISTS "Students can view assigned assessments"
  ON public.assessments;
CREATE POLICY "Students can view assigned assessments"
  ON public.assessments
  FOR SELECT
  USING (
    status = 'published'
    AND public.student_has_assignment_for_assessment(id)
  );

DROP POLICY IF EXISTS "Admins can manage all assessments"
  ON public.assessments;
CREATE POLICY "Admins can manage all assessments"
  ON public.assessments
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --- assessment_assignments ---------------------------------------------------

DROP POLICY IF EXISTS "Teachers can view assignments for their assessments"
  ON public.assessment_assignments;
CREATE POLICY "Teachers can view assignments for their assessments"
  ON public.assessment_assignments
  FOR SELECT
  USING (public.is_assessment_owner(assessment_id));

DROP POLICY IF EXISTS "Teachers can create assignments for their assessments"
  ON public.assessment_assignments;
CREATE POLICY "Teachers can create assignments for their assessments"
  ON public.assessment_assignments
  FOR INSERT
  WITH CHECK (
    -- Must be assignment creator
    assigned_by = auth.uid()
    -- Assessment must be owned by teacher (bypasses assessments RLS)
    AND public.is_assessment_owner(assessment_id)
    -- If assigning to class, must be teacher of that class
    AND (
      class_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.id = assessment_assignments.class_id
          AND c.teacher_id = auth.uid()
      )
    )
    -- If assigning to student, student must be in teacher's class
    AND (
      student_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.class_members cm
        JOIN public.classes c ON c.id = cm.class_id
        WHERE cm.student_id = assessment_assignments.student_id
          AND c.teacher_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Teachers can delete assignments for their assessments"
  ON public.assessment_assignments;
CREATE POLICY "Teachers can delete assignments for their assessments"
  ON public.assessment_assignments
  FOR DELETE
  USING (public.is_assessment_owner(assessment_id));

DROP POLICY IF EXISTS "Admins can manage all assignments"
  ON public.assessment_assignments;
CREATE POLICY "Admins can manage all assignments"
  ON public.assessment_assignments
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
