-- Migration: Create weekly_rewards table
-- Purpose: Audit trail of weekly rewards (1 gidouille for no warnings)
-- Date: 2025-11-13

-- Create the weekly_rewards table
CREATE TABLE IF NOT EXISTS public.weekly_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    gidouilles_awarded INTEGER DEFAULT 1,
    reason TEXT DEFAULT 'no_warnings',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE public.weekly_rewards IS 'Audit trail of weekly rewards (1 gidouille for no warnings)';
COMMENT ON COLUMN public.weekly_rewards.week_start IS 'Start date of the week (Monday)';
COMMENT ON COLUMN public.weekly_rewards.week_end IS 'End date of the week (Sunday)';
COMMENT ON COLUMN public.weekly_rewards.gidouilles_awarded IS 'Number of gidouilles awarded (default: 1)';
COMMENT ON COLUMN public.weekly_rewards.reason IS 'Reason for reward (default: no_warnings)';

-- Create indexes for efficient querying
CREATE INDEX idx_weekly_rewards_student ON public.weekly_rewards(student_id, week_start DESC);
CREATE INDEX idx_weekly_rewards_class ON public.weekly_rewards(class_id, week_start DESC);
CREATE INDEX idx_weekly_rewards_week ON public.weekly_rewards(week_start, week_end);
CREATE UNIQUE INDEX idx_weekly_rewards_unique ON public.weekly_rewards(student_id, class_id, week_start);

-- Enable Row Level Security
ALTER TABLE public.weekly_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can view all rewards
CREATE POLICY "Admins can view all weekly rewards"
ON public.weekly_rewards
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- RLS Policy: Students can view their own rewards
CREATE POLICY "Students can view their own weekly rewards"
ON public.weekly_rewards
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- RLS Policy: Teachers can view rewards for their students
CREATE POLICY "Teachers can view weekly rewards for their students"
ON public.weekly_rewards
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'teacher'
    )
    AND EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.id = weekly_rewards.class_id
        AND c.teacher_id = auth.uid()
    )
);

-- RLS Policy: System can insert rewards (for cron jobs)
-- FIX (Issue #7): Allow service_role for cron jobs
CREATE POLICY "System can insert weekly rewards"
ON public.weekly_rewards
FOR INSERT
TO authenticated, service_role
WITH CHECK (
    -- Allow service_role (for cron jobs) OR authenticated users with proper permissions
    current_setting('role', true) = 'service_role'
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'teacher')
    )
);

-- Create function to award weekly rewards
CREATE OR REPLACE FUNCTION public.award_weekly_reward(
    p_student_id UUID,
    p_class_id UUID,
    p_week_start DATE,
    p_week_end DATE,
    p_gidouilles INTEGER DEFAULT 1,
    p_reason TEXT DEFAULT 'no_warnings'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reward_id UUID;
    v_caller_role TEXT;
BEGIN
    -- SECURITY CHECK (Issue #1): Get caller's role to enforce authorization
    -- SECURITY DEFINER functions bypass RLS, so we must check permissions explicitly
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = auth.uid();

    -- Authorization: Only admins, teachers of the class, or service_role can award rewards
    IF auth.uid() IS NOT NULL AND NOT (
        v_caller_role = 'admin'
        OR (v_caller_role = 'teacher' AND EXISTS (
            SELECT 1 FROM public.classes
            WHERE id = p_class_id
            AND teacher_id = auth.uid()
        ))
    ) THEN
        RAISE EXCEPTION 'Unauthorized: You do not have permission to award rewards for this class';
    END IF;

    -- FIX (Issue #6): Use atomic INSERT with WHERE NOT EXISTS to prevent race condition
    -- Insert the reward record only if student had no warnings that week
    INSERT INTO public.weekly_rewards (
        student_id,
        class_id,
        week_start,
        week_end,
        gidouilles_awarded,
        reason
    )
    SELECT p_student_id, p_class_id, p_week_start, p_week_end, p_gidouilles, p_reason
    WHERE NOT EXISTS (
        SELECT 1 FROM public.student_warnings
        WHERE student_id = p_student_id
        AND class_id = p_class_id
        AND DATE(created_at) BETWEEN p_week_start AND p_week_end
        AND deleted_at IS NULL
    )
    ON CONFLICT (student_id, class_id, week_start) DO NOTHING
    RETURNING id INTO v_reward_id;

    -- Only update gidouilles if we actually inserted a new record
    IF v_reward_id IS NOT NULL THEN
        -- Update student's gidouilles (and log in history)
        PERFORM public.update_student_gidouilles(
            p_student_id,
            p_class_id,
            p_gidouilles,
            p_reason,
            NULL  -- System-generated
        );
    END IF;

    RETURN v_reward_id;
END;
$$;

-- Create function to process weekly rewards for all eligible students
CREATE OR REPLACE FUNCTION public.process_weekly_rewards(
    p_week_start DATE,
    p_week_end DATE,
    p_class_ids UUID[] DEFAULT NULL
)
RETURNS TABLE(
    student_id UUID,
    class_id UUID,
    awarded BOOLEAN,
    reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_role TEXT;
    v_inserted_count INTEGER;
BEGIN
    -- SECURITY CHECK (Issue #1): Get caller's role to enforce authorization
    -- SECURITY DEFINER functions bypass RLS, so we must check permissions explicitly
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = auth.uid();

    -- Authorization: Only admins, teachers, or service_role can process rewards
    IF auth.uid() IS NOT NULL AND v_caller_role NOT IN ('admin', 'teacher') THEN
        RAISE EXCEPTION 'Unauthorized: You do not have permission to process weekly rewards';
    END IF;

    -- FIX (Issue #11): Use batch INSERT instead of looping for better performance
    -- Batch insert rewards for all eligible students without warnings
    WITH eligible_no_warnings AS (
        SELECT cm.student_id, cm.class_id
        FROM public.class_members cm
        WHERE cm.status = 'active'
        AND (p_class_ids IS NULL OR cm.class_id = ANY(p_class_ids))
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = cm.student_id
            AND p.role = 'student'
            AND NOT COALESCE(p.is_test, FALSE)
        )
        AND NOT EXISTS (
            SELECT 1 FROM public.student_warnings sw
            WHERE sw.student_id = cm.student_id
            AND sw.class_id = cm.class_id
            AND DATE(sw.created_at) BETWEEN p_week_start AND p_week_end
            AND sw.deleted_at IS NULL
        )
    )
    INSERT INTO public.weekly_rewards (student_id, class_id, week_start, week_end, gidouilles_awarded, reason)
    SELECT student_id, class_id, p_week_start, p_week_end, 1, 'no_warnings'
    FROM eligible_no_warnings
    ON CONFLICT (student_id, class_id, week_start) DO NOTHING;

    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
    RAISE NOTICE 'Inserted % weekly reward records', v_inserted_count;

    -- Now batch update gidouilles for all students who received rewards
    -- This uses the gidouilles_history table for audit trail
    WITH new_rewards AS (
        SELECT wr.student_id, wr.class_id, wr.gidouilles_awarded
        FROM public.weekly_rewards wr
        WHERE wr.week_start = p_week_start
        AND wr.week_end = p_week_end
        AND (p_class_ids IS NULL OR wr.class_id = ANY(p_class_ids))
    )
    INSERT INTO public.gidouilles_history (student_id, class_id, delta, reason, created_by)
    SELECT student_id, class_id, gidouilles_awarded, 'no_warnings', NULL
    FROM new_rewards;

    -- Update profiles.gidouilles in batch
    UPDATE public.profiles p
    SET gidouilles = GREATEST(0, COALESCE(p.gidouilles, 0) + nr.gidouilles_awarded)
    FROM (
        SELECT wr.student_id, SUM(wr.gidouilles_awarded) as gidouilles_awarded
        FROM public.weekly_rewards wr
        WHERE wr.week_start = p_week_start
        AND wr.week_end = p_week_end
        AND (p_class_ids IS NULL OR wr.class_id = ANY(p_class_ids))
        GROUP BY wr.student_id
    ) nr
    WHERE p.id = nr.student_id;

    -- Return summary of all students
    RETURN QUERY
    WITH eligible_students AS (
        SELECT DISTINCT
            cm.student_id,
            cm.class_id
        FROM public.class_members cm
        WHERE cm.status = 'active'
        AND (p_class_ids IS NULL OR cm.class_id = ANY(p_class_ids))
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = cm.student_id
            AND p.role = 'student'
            AND NOT COALESCE(p.is_test, FALSE)
        )
    ),
    weekly_warnings AS (
        SELECT
            sw.student_id,
            sw.class_id,
            COUNT(*) as warning_count
        FROM public.student_warnings sw
        WHERE DATE(sw.created_at) BETWEEN p_week_start AND p_week_end
        AND sw.deleted_at IS NULL
        AND (p_class_ids IS NULL OR sw.class_id = ANY(p_class_ids))
        GROUP BY sw.student_id, sw.class_id
    )
    SELECT
        es.student_id,
        es.class_id,
        CASE
            WHEN ww.warning_count IS NULL OR ww.warning_count = 0 THEN TRUE
            ELSE FALSE
        END as awarded,
        CASE
            WHEN ww.warning_count IS NULL OR ww.warning_count = 0 THEN 'no_warnings'
            ELSE 'has_warnings'
        END as reason
    FROM eligible_students es
    LEFT JOIN weekly_warnings ww
        ON es.student_id = ww.student_id
        AND es.class_id = ww.class_id;
END;
$$;

-- Grant necessary permissions
GRANT SELECT ON public.weekly_rewards TO authenticated;
GRANT INSERT ON public.weekly_rewards TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_weekly_reward TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_weekly_rewards TO authenticated;

-- Verification
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: weekly_rewards table created with RLS policies';
    RAISE NOTICE 'Indexes created: idx_weekly_rewards_student, idx_weekly_rewards_class, idx_weekly_rewards_week, idx_weekly_rewards_unique';
    RAISE NOTICE 'Function created: award_weekly_reward()';
    RAISE NOTICE 'Function created: process_weekly_rewards()';
END $$;
