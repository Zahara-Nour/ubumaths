-- Migration: Create bonus_history table
-- Purpose: Track all bonus changes with timestamps
-- Date: 2025-11-13

-- Create the bonus_history table
CREATE TABLE IF NOT EXISTS public.bonus_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    delta INTEGER NOT NULL,
    reason TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE public.bonus_history IS 'Tracks all bonus changes with timestamps for student activity summaries';
COMMENT ON COLUMN public.bonus_history.delta IS 'Positive for gained bonus, negative for used bonus';
COMMENT ON COLUMN public.bonus_history.reason IS 'Reason for the change (e.g., homework_bonus, behavior_reward, bonus_used)';
COMMENT ON COLUMN public.bonus_history.created_by IS 'Teacher who made the change (NULL for system-generated)';

-- Create indexes for efficient querying
CREATE INDEX idx_bonus_history_student_time ON public.bonus_history(student_id, created_at DESC);
CREATE INDEX idx_bonus_history_class_time ON public.bonus_history(class_id, created_at DESC);
CREATE INDEX idx_bonus_history_created_at ON public.bonus_history(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.bonus_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can view all history
CREATE POLICY "Admins can view all bonus history"
ON public.bonus_history
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- RLS Policy: Students can view their own history
CREATE POLICY "Students can view their own bonus history"
ON public.bonus_history
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- RLS Policy: Teachers can view history for their students
CREATE POLICY "Teachers can view bonus history for their students"
ON public.bonus_history
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'teacher'
    )
    AND EXISTS (
        SELECT 1 FROM public.class_members cm
        WHERE cm.student_id = bonus_history.student_id
        AND cm.class_id IN (
            SELECT c.id FROM public.classes c
            WHERE c.teacher_id = auth.uid()
        )
    )
);

-- Modify existing update_student_bonus function to log changes
-- This replaces the existing function with history tracking
CREATE OR REPLACE FUNCTION public.update_student_bonus(
    p_student_id UUID,
    p_class_id UUID,  -- Now required parameter (Issue #5)
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
    -- SECURITY CHECK (Issue #1): Get caller's role to enforce authorization
    -- SECURITY DEFINER functions bypass RLS, so we must check permissions explicitly
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

    -- VALIDATION (Issue #4): Validate delta bounds
    IF p_delta < -10000 OR p_delta > 10000 THEN
        RAISE EXCEPTION 'Invalid delta: must be between -10000 and 10000, got %', p_delta;
    END IF;

    -- VALIDATION (Issue #4): Require reason for large changes
    IF (ABS(p_delta) > 100) AND (p_reason IS NULL OR p_reason = '') THEN
        RAISE EXCEPTION 'Reason required for large bonus changes (|delta| = %)', ABS(p_delta);
    END IF;

    -- Verify that the student is actually in this class
    IF NOT EXISTS (
        SELECT 1 FROM public.class_members
        WHERE student_id = p_student_id
        AND class_id = p_class_id
        AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Student % is not an active member of class %', p_student_id, p_class_id;
    END IF;

    -- Update the bonus count
    UPDATE public.profiles
    SET bonus = GREATEST(0, COALESCE(bonus, 0) + p_delta)
    WHERE id = p_student_id
    RETURNING bonus INTO v_new_bonus;

    -- Log the change in history
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

    RETURN v_new_bonus;
END;
$$;

-- Grant necessary permissions
GRANT SELECT ON public.bonus_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_student_bonus TO authenticated;

-- Verification
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: bonus_history table created with RLS policies';
    RAISE NOTICE 'Indexes created: idx_bonus_history_student_time, idx_bonus_history_class_time, idx_bonus_history_created_at';
    RAISE NOTICE 'Function update_student_bonus modified to log changes';
END $$;
