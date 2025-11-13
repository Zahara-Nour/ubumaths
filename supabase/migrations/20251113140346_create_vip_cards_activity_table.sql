-- Migration: Create vip_cards_activity table
-- Purpose: Track VIP card actions (gained/used/removed)
-- Date: 2025-11-13

-- Create the vip_cards_activity table
CREATE TABLE IF NOT EXISTS public.vip_cards_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    card_instance_id TEXT NOT NULL,
    card_template_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('gained', 'used', 'removed')),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE public.vip_cards_activity IS 'Tracks all VIP card actions (gained/used/removed) with timestamps';
COMMENT ON COLUMN public.vip_cards_activity.card_instance_id IS 'The unique instance ID from profiles.vip_cards JSONB array';
COMMENT ON COLUMN public.vip_cards_activity.card_template_id IS 'The template ID (e.g., time-master, homework-pass)';
COMMENT ON COLUMN public.vip_cards_activity.action IS 'Action type: gained, used, or removed';
COMMENT ON COLUMN public.vip_cards_activity.metadata IS 'Optional additional info (who removed it, exchange details, etc.)';

-- Create indexes for efficient querying
CREATE INDEX idx_vip_cards_activity_student_time ON public.vip_cards_activity(student_id, created_at DESC);
CREATE INDEX idx_vip_cards_activity_action_time ON public.vip_cards_activity(action, created_at DESC);
CREATE INDEX idx_vip_cards_activity_card_instance ON public.vip_cards_activity(card_instance_id);

-- FIX (Issue #2): Prevent duplicate activity records due to race conditions
CREATE UNIQUE INDEX idx_vip_cards_activity_dedup
ON public.vip_cards_activity(student_id, card_instance_id, action, created_at);

-- Enable Row Level Security
ALTER TABLE public.vip_cards_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can view all activity
CREATE POLICY "Admins can view all VIP cards activity"
ON public.vip_cards_activity
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- RLS Policy: Students can view their own activity
CREATE POLICY "Students can view their own VIP cards activity"
ON public.vip_cards_activity
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- RLS Policy: Teachers can view activity for their students
CREATE POLICY "Teachers can view VIP cards activity for their students"
ON public.vip_cards_activity
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
        WHERE cm.student_id = vip_cards_activity.student_id
        AND cm.class_id IN (
            SELECT c.id FROM public.classes c
            WHERE c.teacher_id = auth.uid()
        )
    )
);

-- RLS Policy: System can insert activity records
CREATE POLICY "System can insert VIP cards activity"
ON public.vip_cards_activity
FOR INSERT
TO authenticated
WITH CHECK (
    -- Allow authenticated users to log their own actions
    student_id = auth.uid()
    OR
    -- Allow teachers to log actions for their students
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'teacher'
        AND EXISTS (
            SELECT 1 FROM public.class_members cm
            WHERE cm.student_id = vip_cards_activity.student_id
            AND cm.class_id IN (
                SELECT c.id FROM public.classes c
                WHERE c.teacher_id = auth.uid()
            )
        )
    )
);

-- Create trigger function to log VIP card changes
CREATE OR REPLACE FUNCTION public.log_vip_card_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old_cards JSONB;
    v_new_cards JSONB;
BEGIN
    -- Only process if vip_cards column changed
    IF OLD.vip_cards IS DISTINCT FROM NEW.vip_cards THEN
        v_old_cards := COALESCE(OLD.vip_cards, '[]'::JSONB);
        v_new_cards := COALESCE(NEW.vip_cards, '[]'::JSONB);

        -- FIX (Issue #2): Use set-based operations instead of nested loops to prevent race conditions

        -- Log removed cards (in OLD but not in NEW)
        INSERT INTO public.vip_cards_activity (
            student_id,
            card_instance_id,
            card_template_id,
            action,
            metadata
        )
        SELECT
            NEW.id,
            old_card->>'id',
            old_card->>'cardId',
            'removed',
            jsonb_build_object('removed_by', auth.uid())
        FROM jsonb_array_elements(v_old_cards) AS old_card
        WHERE NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements(v_new_cards) AS new_card
            WHERE new_card->>'id' = old_card->>'id'
        )
        ON CONFLICT (student_id, card_instance_id, action, created_at) DO NOTHING;

        -- Log gained cards (in NEW but not in OLD)
        INSERT INTO public.vip_cards_activity (
            student_id,
            card_instance_id,
            card_template_id,
            action,
            metadata
        )
        SELECT
            NEW.id,
            new_card->>'id',
            new_card->>'cardId',
            'gained',
            jsonb_build_object('gained_at', new_card->>'gainedAt')
        FROM jsonb_array_elements(v_new_cards) AS new_card
        WHERE NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements(v_old_cards) AS old_card
            WHERE old_card->>'id' = new_card->>'id'
        )
        ON CONFLICT (student_id, card_instance_id, action, created_at) DO NOTHING;

        -- Log status changes (cards that were marked as used)
        INSERT INTO public.vip_cards_activity (
            student_id,
            card_instance_id,
            card_template_id,
            action,
            metadata
        )
        SELECT
            NEW.id,
            new_card->>'id',
            new_card->>'cardId',
            'used',
            jsonb_build_object(
                'used_at', new_card->>'usedAt',
                'assignment_id', new_card->>'assignmentId'
            )
        FROM jsonb_array_elements(v_new_cards) AS new_card
        JOIN jsonb_array_elements(v_old_cards) AS old_card
            ON new_card->>'id' = old_card->>'id'
        WHERE (old_card->>'used')::BOOLEAN = FALSE
          AND (new_card->>'used')::BOOLEAN = TRUE
        ON CONFLICT (student_id, card_instance_id, action, created_at) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS trigger_log_vip_card_changes ON public.profiles;
CREATE TRIGGER trigger_log_vip_card_changes
    AFTER UPDATE OF vip_cards ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.log_vip_card_changes();

-- Grant necessary permissions
GRANT SELECT ON public.vip_cards_activity TO authenticated;
GRANT INSERT ON public.vip_cards_activity TO authenticated;

-- Verification
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: vip_cards_activity table created with RLS policies';
    RAISE NOTICE 'Indexes created: idx_vip_cards_activity_student_time, idx_vip_cards_activity_action_time';
    RAISE NOTICE 'Trigger trigger_log_vip_card_changes created on profiles.vip_cards';
END $$;
