-- ============================================================================
-- Migration: students can see their class teacher's profile
-- ----------------------------------------------------------------------------
-- The existing policies on `profiles` let:
-- - a user see their own profile
-- - a teacher see their students' profiles
-- - students see their classmates' profiles (via `are_classmates`)
-- - admins see everyone
--
-- BUT there is no policy that lets a student see the profile of the *teacher*
-- of their own class. This breaks any UI that needs to display the teacher's
-- name (the kanban assignee picker, future class chat headers, etc.).
--
-- This migration adds a complementary SELECT policy: a user can see a profile
-- if that profile is the teacher of a class the user is enrolled in.
-- ============================================================================

-- Security-definer helper to avoid recursion (mirrors the pattern of
-- `are_classmates`, `is_class_teacher`, etc.).
CREATE OR REPLACE FUNCTION public.is_class_teacher_of(p_teacher_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
    -- Does the target user teach at least one class the current user is enrolled in?
    RETURN EXISTS (
        SELECT 1
        FROM public.class_members cm
        JOIN public.classes c ON c.id = cm.class_id
        WHERE cm.student_id = auth.uid()
          AND c.teacher_id = p_teacher_id
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_class_teacher_of(UUID) TO authenticated;

CREATE POLICY "students_view_class_teacher_profile"
    ON profiles FOR SELECT
    TO authenticated
    USING (is_class_teacher_of(id));

COMMENT ON FUNCTION public.is_class_teacher_of(UUID) IS
    'True if the given profile is the teacher of at least one class the current user is enrolled in. Lets students see their teacher''s display name (e.g. in the kanban assignee picker).';
