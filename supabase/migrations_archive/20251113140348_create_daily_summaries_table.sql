-- Migration: Create daily_summaries table
-- Purpose: Cache computed daily summaries to avoid recalculation
-- Date: 2025-11-13

-- Create the daily_summaries table
CREATE TABLE IF NOT EXISTS public.daily_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    summary_date DATE NOT NULL,
    gidouilles_gained INTEGER DEFAULT 0,
    gidouilles_lost INTEGER DEFAULT 0,
    bonus_gained INTEGER DEFAULT 0,
    bonus_used INTEGER DEFAULT 0,
    warnings_issued INTEGER DEFAULT 0,
    warnings_removed INTEGER DEFAULT 0,
    vip_cards_gained INTEGER DEFAULT 0,
    vip_cards_used INTEGER DEFAULT 0,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE public.daily_summaries IS 'Cached daily summaries of student activity to avoid recalculation';
COMMENT ON COLUMN public.daily_summaries.summary_date IS 'The date this summary covers (YYYY-MM-DD)';
COMMENT ON COLUMN public.daily_summaries.gidouilles_gained IS 'Total gidouilles gained during the day (positive values)';
COMMENT ON COLUMN public.daily_summaries.gidouilles_lost IS 'Total gidouilles lost during the day (stored as negative number)';
COMMENT ON COLUMN public.daily_summaries.bonus_gained IS 'Total bonus gained during the day';
COMMENT ON COLUMN public.daily_summaries.bonus_used IS 'Total bonus used during the day (stored as negative number)';
COMMENT ON COLUMN public.daily_summaries.warnings_issued IS 'Number of warnings issued during the day';
COMMENT ON COLUMN public.daily_summaries.warnings_removed IS 'Number of warnings removed/deleted during the day';
COMMENT ON COLUMN public.daily_summaries.vip_cards_gained IS 'Number of VIP cards gained during the day';
COMMENT ON COLUMN public.daily_summaries.vip_cards_used IS 'Number of VIP cards used during the day';
COMMENT ON COLUMN public.daily_summaries.sent_at IS 'Timestamp when daily notification was sent (NULL = not sent yet)';

-- Create indexes for efficient querying
CREATE UNIQUE INDEX idx_daily_summaries_unique ON public.daily_summaries(student_id, class_id, summary_date);
CREATE INDEX idx_daily_summaries_date ON public.daily_summaries(summary_date DESC);
CREATE INDEX idx_daily_summaries_sent ON public.daily_summaries(sent_at);
CREATE INDEX idx_daily_summaries_student ON public.daily_summaries(student_id, summary_date DESC);
CREATE INDEX idx_daily_summaries_class ON public.daily_summaries(class_id, summary_date DESC);
CREATE INDEX idx_daily_summaries_pending ON public.daily_summaries(summary_date, sent_at)
WHERE sent_at IS NULL;

-- Enable Row Level Security
ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can view all summaries
CREATE POLICY "Admins can view all daily summaries"
ON public.daily_summaries
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- RLS Policy: Students can view their own summaries
CREATE POLICY "Students can view their own daily summaries"
ON public.daily_summaries
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- RLS Policy: Teachers can view summaries for their students
CREATE POLICY "Teachers can view daily summaries for their students"
ON public.daily_summaries
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
        WHERE c.id = daily_summaries.class_id
        AND c.teacher_id = auth.uid()
    )
);

-- RLS Policy: System can insert summaries (for cron jobs)
-- FIX (Issue #7): Allow service_role for cron jobs
CREATE POLICY "System can insert daily summaries"
ON public.daily_summaries
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

-- RLS Policy: System can update summaries (for sent_at field)
-- FIX (Issue #7): Allow service_role for cron jobs
CREATE POLICY "System can update daily summaries"
ON public.daily_summaries
FOR UPDATE
TO authenticated, service_role
USING (
    current_setting('role', true) = 'service_role'
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'teacher')
    )
)
WITH CHECK (
    current_setting('role', true) = 'service_role'
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'teacher')
    )
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_daily_summaries_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_daily_summaries_updated_at ON public.daily_summaries;
CREATE TRIGGER trigger_update_daily_summaries_updated_at
    BEFORE UPDATE ON public.daily_summaries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_daily_summaries_updated_at();

-- Create function to compute and cache daily summary
CREATE OR REPLACE FUNCTION public.compute_daily_summary(
    p_student_id UUID,
    p_class_id UUID,
    p_summary_date DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_summary_id UUID;
    v_gidouilles_gained INTEGER;
    v_gidouilles_lost INTEGER;
    v_bonus_gained INTEGER;
    v_bonus_used INTEGER;
    v_warnings_issued INTEGER;
    v_warnings_removed INTEGER;
    v_vip_cards_gained INTEGER;
    v_vip_cards_used INTEGER;
    v_caller_role TEXT;
BEGIN
    -- SECURITY CHECK (Issue #1): Get caller's role to enforce authorization
    -- SECURITY DEFINER functions bypass RLS, so we must check permissions explicitly
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = auth.uid();

    -- Authorization: Only admins, teachers of the student, or service_role can compute summaries
    IF auth.uid() IS NOT NULL AND NOT (
        v_caller_role = 'admin'
        OR (v_caller_role = 'teacher' AND EXISTS (
            SELECT 1 FROM public.classes
            WHERE id = p_class_id
            AND teacher_id = auth.uid()
        ))
    ) THEN
        RAISE EXCEPTION 'Unauthorized: You do not have permission to compute summaries for this student';
    END IF;
    -- Calculate gidouilles (positive = gained, negative = lost)
    SELECT
        COALESCE(SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN delta < 0 THEN delta ELSE 0 END), 0)
    INTO v_gidouilles_gained, v_gidouilles_lost
    FROM public.gidouilles_history
    WHERE student_id = p_student_id
    AND class_id = p_class_id
    AND DATE(created_at) = p_summary_date;

    -- Calculate bonus (positive = gained, negative = used)
    SELECT
        COALESCE(SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN delta < 0 THEN delta ELSE 0 END), 0)
    INTO v_bonus_gained, v_bonus_used
    FROM public.bonus_history
    WHERE student_id = p_student_id
    AND class_id = p_class_id
    AND DATE(created_at) = p_summary_date;

    -- Calculate warnings (issued vs removed)
    -- FIX (Issue #9): Simplify confusing logic for warning calculations
    SELECT
        COUNT(*) FILTER (WHERE deleted_at IS NULL),
        COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)
    INTO v_warnings_issued, v_warnings_removed
    FROM public.student_warnings
    WHERE student_id = p_student_id
    AND class_id = p_class_id
    AND DATE(created_at) = p_summary_date;

    -- Calculate VIP cards (gained vs used)
    SELECT
        COUNT(*) FILTER (WHERE action = 'gained'),
        COUNT(*) FILTER (WHERE action = 'used')
    INTO v_vip_cards_gained, v_vip_cards_used
    FROM public.vip_cards_activity
    WHERE student_id = p_student_id
    AND DATE(created_at) = p_summary_date;

    -- Insert or update the summary
    INSERT INTO public.daily_summaries (
        student_id,
        class_id,
        summary_date,
        gidouilles_gained,
        gidouilles_lost,
        bonus_gained,
        bonus_used,
        warnings_issued,
        warnings_removed,
        vip_cards_gained,
        vip_cards_used
    ) VALUES (
        p_student_id,
        p_class_id,
        p_summary_date,
        v_gidouilles_gained,
        v_gidouilles_lost,
        v_bonus_gained,
        v_bonus_used,
        v_warnings_issued,
        v_warnings_removed,
        v_vip_cards_gained,
        v_vip_cards_used
    )
    ON CONFLICT (student_id, class_id, summary_date)
    DO UPDATE SET
        gidouilles_gained = EXCLUDED.gidouilles_gained,
        gidouilles_lost = EXCLUDED.gidouilles_lost,
        bonus_gained = EXCLUDED.bonus_gained,
        bonus_used = EXCLUDED.bonus_used,
        warnings_issued = EXCLUDED.warnings_issued,
        warnings_removed = EXCLUDED.warnings_removed,
        vip_cards_gained = EXCLUDED.vip_cards_gained,
        vip_cards_used = EXCLUDED.vip_cards_used,
        updated_at = NOW()
    RETURNING id INTO v_summary_id;

    RETURN v_summary_id;
END;
$$;

-- Grant necessary permissions
GRANT SELECT ON public.daily_summaries TO authenticated;
GRANT INSERT, UPDATE ON public.daily_summaries TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_daily_summary TO authenticated;

-- Verification
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: daily_summaries table created with RLS policies';
    RAISE NOTICE 'Indexes created: idx_daily_summaries_unique, idx_daily_summaries_date, idx_daily_summaries_sent';
    RAISE NOTICE 'Function created: compute_daily_summary()';
    RAISE NOTICE 'Trigger created: trigger_update_daily_summaries_updated_at';
END $$;
