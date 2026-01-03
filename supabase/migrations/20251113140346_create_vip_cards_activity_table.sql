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

-- ============================================================================
-- TRIGGER FUNCTION: Log VIP card removals ONLY
-- ============================================================================
-- ARCHITECTURE:
--   - 'gained' actions: Logged by RPC functions (purchase_vip_card, award_vip_card_no_cost)
--   - 'used' actions: Logged by RPC functions (use_consumable_card)
--   - 'removed' actions: Logged by THIS TRIGGER (catches admin/manual deletions)
--
-- This separation ensures:
--   1. No duplicate inserts (no race condition between trigger and RPC)
--   2. Rich metadata from RPCs that know the context
--   3. Safety net for manual removals via trigger
--
-- IMPORTANT: Uses jsonb_each() because vip_cards is stored as an OBJECT:
--   {"uuid1": {"cardId": "...", ...}, "uuid2": {...}}
-- NOT as an ARRAY: [{"id": "...", "cardId": "..."}, ...]

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
        -- Default to empty object (not array!) if null
        v_old_cards := COALESCE(OLD.vip_cards, '{}'::JSONB);
        v_new_cards := COALESCE(NEW.vip_cards, '{}'::JSONB);

        -- Log ONLY removed cards (in OLD but not in NEW)
        -- This catches admin deletions, exchanges, and any direct SQL modifications
        INSERT INTO public.vip_cards_activity (
            student_id,
            card_instance_id,
            card_template_id,
            action,
            metadata
        )
        SELECT
            NEW.id,
            old_cards.instance_id,
            old_cards.card_data->>'cardId',
            'removed',
            jsonb_build_object(
                'removed_by', COALESCE(auth.uid()::TEXT, 'system'),
                'removed_at', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                'was_used', (old_cards.card_data->>'usedAt') IS NOT NULL
            )
        FROM jsonb_each(v_old_cards) AS old_cards(instance_id, card_data)
        WHERE NOT EXISTS (
            SELECT 1
            FROM jsonb_each(v_new_cards) AS new_cards(instance_id, card_data)
            WHERE new_cards.instance_id = old_cards.instance_id
        );

        -- NOTE: 'gained' and 'used' actions are NOT logged here.
        -- They are handled by their respective RPC functions with richer metadata.
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
