-- Migration: Fix update_student_bonus function - remove invalid status column reference
-- Description: The class_members table doesn't have a 'status' column
-- This caused: "column 'status' does not exist" error when updating bonus
-- Date: 2025-12-08

-- Drop all existing versions of update_student_bonus to avoid overload conflicts
DROP FUNCTION IF EXISTS public.update_student_bonus(UUID, UUID, INTEGER, TEXT, UUID);
DROP FUNCTION IF EXISTS public.update_student_bonus(UUID, UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.update_student_bonus(UUID, UUID, INTEGER);
DROP FUNCTION IF EXISTS public.update_student_bonus(UUID, INTEGER);

-- Recreate the function without the status column check
CREATE OR REPLACE FUNCTION public.update_student_bonus(
    p_student_id UUID,
    p_class_id UUID,
    p_delta INTEGER,
    p_reason TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_bonus INTEGER;
    v_caller_role TEXT;
BEGIN
    -- SECURITY CHECK: Get caller's role to enforce authorization
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = auth.uid();

    -- Authorization: Only admins, teachers of the student, or system (NULL caller) can update
    IF auth.uid() IS NOT NULL AND NOT (
        v_caller_role = 'admin'
        OR (v_caller_role = 'teacher' AND EXISTS (
            SELECT 1 FROM public.class_members cm
            JOIN public.classes c ON c.id = cm.class_id
            WHERE cm.student_id = p_student_id
            AND cm.class_id = p_class_id
            AND c.teacher_id = auth.uid()
        ))
    ) THEN
        RAISE EXCEPTION 'Unauthorized: You do not have permission to update bonus for this student';
    END IF;

    -- VALIDATION: Validate delta bounds
    IF p_delta < -10000 OR p_delta > 10000 THEN
        RAISE EXCEPTION 'Invalid delta: must be between -10000 and 10000, got %', p_delta;
    END IF;

    -- VALIDATION: Require reason for large changes
    IF (ABS(p_delta) > 100) AND (p_reason IS NULL OR p_reason = '') THEN
        RAISE EXCEPTION 'Reason required for large bonus changes (|delta| = %)', ABS(p_delta);
    END IF;

    -- Verify that the student is actually in this class (without status check)
    IF NOT EXISTS (
        SELECT 1 FROM public.class_members
        WHERE student_id = p_student_id
        AND class_id = p_class_id
    ) THEN
        RAISE EXCEPTION 'Student % is not a member of class %', p_student_id, p_class_id;
    END IF;

    -- Update the bonus count
    UPDATE public.profiles
    SET bonus = GREATEST(0, COALESCE(bonus, 0) + p_delta)
    WHERE id = p_student_id
    RETURNING bonus INTO v_new_bonus;

    -- Log the change in history (only if bonus_history table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bonus_history') THEN
        INSERT INTO public.bonus_history (
            student_id,
            class_id,
            delta,
            reason,
            created_by
        ) VALUES (
            p_student_id,
            p_class_id,
            p_delta,
            p_reason,
            COALESCE(p_created_by, auth.uid())
        );
    END IF;

    RETURN v_new_bonus;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.update_student_bonus(UUID, UUID, INTEGER, TEXT, UUID) TO authenticated;

-- Verification
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: update_student_bonus function fixed (removed invalid status column reference)';
END $$;
