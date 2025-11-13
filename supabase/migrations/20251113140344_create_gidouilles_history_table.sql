-- Migration: Create gidouilles_history table
-- Purpose: Track all gidouilles (points) changes with timestamps
-- Date: 2025-11-13

-- Create the gidouilles_history table
CREATE TABLE IF NOT EXISTS public.gidouilles_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    delta INTEGER NOT NULL,
    reason TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE public.gidouilles_history IS 'Tracks all gidouilles (points) changes with timestamps for student activity summaries';
COMMENT ON COLUMN public.gidouilles_history.delta IS 'Positive for gained points, negative for lost points';
COMMENT ON COLUMN public.gidouilles_history.reason IS 'Reason for the change (e.g., homework_completion, weekly_no_warning, behavior_penalty)';
COMMENT ON COLUMN public.gidouilles_history.created_by IS 'Teacher who made the change (NULL for system-generated)';

-- Create indexes for efficient querying
CREATE INDEX idx_gidouilles_history_student_time ON public.gidouilles_history(student_id, created_at DESC);
CREATE INDEX idx_gidouilles_history_class_time ON public.gidouilles_history(class_id, created_at DESC);
CREATE INDEX idx_gidouilles_history_created_at ON public.gidouilles_history(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.gidouilles_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can view all history
CREATE POLICY "Admins can view all gidouilles history"
ON public.gidouilles_history
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
CREATE POLICY "Students can view their own gidouilles history"
ON public.gidouilles_history
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- RLS Policy: Teachers can view history for their students
CREATE POLICY "Teachers can view gidouilles history for their students"
ON public.gidouilles_history
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
        WHERE cm.student_id = gidouilles_history.student_id
        AND cm.class_id IN (
            SELECT c.id FROM public.classes c
            WHERE c.teacher_id = auth.uid()
        )
    )
);

-- Drop all existing versions of update_student_gidouilles to avoid overload conflicts
DROP FUNCTION IF EXISTS public.update_student_gidouilles(UUID, UUID, INTEGER, TEXT, UUID);
DROP FUNCTION IF EXISTS public.update_student_gidouilles(UUID, UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.update_student_gidouilles(UUID, UUID, INTEGER);

-- Modify existing update_student_gidouilles function to log changes
-- This replaces the existing function with history tracking
CREATE OR REPLACE FUNCTION public.update_student_gidouilles(
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
    v_new_gidouilles INTEGER;
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
        RAISE EXCEPTION 'Unauthorized: You do not have permission to update gidouilles for this student';
    END IF;

    -- VALIDATION (Issue #4): Validate delta bounds
    IF p_delta < -10000 OR p_delta > 10000 THEN
        RAISE EXCEPTION 'Invalid delta: must be between -10000 and 10000, got %', p_delta;
    END IF;

    -- VALIDATION (Issue #4): Require reason for large changes
    IF (ABS(p_delta) > 100) AND (p_reason IS NULL OR p_reason = '') THEN
        RAISE EXCEPTION 'Reason required for large point changes (|delta| = %)', ABS(p_delta);
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

    -- Update the gidouilles count
    UPDATE public.profiles
    SET gidouilles = GREATEST(0, COALESCE(gidouilles, 0) + p_delta)
    WHERE id = p_student_id
    RETURNING gidouilles INTO v_new_gidouilles;

    -- Log the change in history
    INSERT INTO public.gidouilles_history (
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

    RETURN v_new_gidouilles;
END;
$$;

-- Grant necessary permissions
GRANT SELECT ON public.gidouilles_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_student_gidouilles(UUID, UUID, INTEGER, TEXT, UUID) TO authenticated;

-- Verification
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: gidouilles_history table created with RLS policies';
    RAISE NOTICE 'Indexes created: idx_gidouilles_history_student_time, idx_gidouilles_history_class_time, idx_gidouilles_history_created_at';
    RAISE NOTICE 'Function update_student_gidouilles modified to log changes';
END $$;
