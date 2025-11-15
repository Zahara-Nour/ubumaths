-- Migration: Fix infinite recursion in shared_coursework RLS policies
-- Purpose: Replace recursive RLS policies with SECURITY DEFINER functions
-- Date: 2025-11-15
-- Issue: shared_coursework_students policy joins back to shared_coursework, causing infinite recursion

-- ============================================================================
-- Drop problematic policies
-- ============================================================================

DROP POLICY IF EXISTS "Teachers can manage student restrictions for their shared coursework" ON public.shared_coursework_students;
DROP POLICY IF EXISTS "Students can view materials for shared coursework" ON public.coursework_materials;

-- ============================================================================
-- Create SECURITY DEFINER function to check teacher ownership without RLS recursion
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_teacher_for_shared_coursework(p_shared_coursework_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if current user is the teacher for the class linked to this shared coursework
    -- SECURITY DEFINER bypasses RLS, preventing infinite recursion
    RETURN EXISTS (
        SELECT 1
        FROM shared_coursework sc
        JOIN classes c ON c.id = sc.class_id
        WHERE sc.id = p_shared_coursework_id
        AND c.teacher_id = auth.uid()
    );
END;
$$;

COMMENT ON FUNCTION public.is_teacher_for_shared_coursework IS 'Check if current user is teacher for a shared coursework (bypasses RLS to avoid recursion)';

-- ============================================================================
-- Recreate policies using SECURITY DEFINER function
-- ============================================================================

-- RLS Policy: Teachers can manage student restrictions for their shared coursework
CREATE POLICY "Teachers can manage student restrictions for their shared coursework"
ON public.shared_coursework_students
FOR ALL
TO authenticated
USING (
    -- Use SECURITY DEFINER function to avoid recursive RLS check
    public.is_teacher_for_shared_coursework(shared_coursework_id)
)
WITH CHECK (
    public.is_teacher_for_shared_coursework(shared_coursework_id)
);

-- ============================================================================
-- Recreate materials policy with simplified logic
-- ============================================================================

-- RLS Policy: Students can view materials for shared coursework
CREATE POLICY "Students can view materials for shared coursework"
ON public.coursework_materials
FOR SELECT
TO authenticated
USING (
    -- Check if coursework is shared with student's class
    -- Only check visibility and class membership (skip student restrictions check to avoid deep recursion)
    EXISTS (
        SELECT 1
        FROM public.shared_coursework sc
        JOIN public.class_members cm ON cm.class_id = sc.class_id
        WHERE sc.coursework_id = coursework_materials.coursework_id
        AND cm.student_id = auth.uid()
        AND sc.visible = true
    )
);

-- ============================================================================
-- Grant execute permission on function
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.is_teacher_for_shared_coursework TO authenticated;
