-- ============================================================================
-- ADD 'requested' ACTION TO VIP CARDS ACTIVITY
-- ============================================================================
--
-- PURPOSE:
-- --------
-- Track when students request activation of VIP cards with actions.
-- Previously, request-activation only updated the profile JSONB without
-- logging to vip_cards_activity, losing traceability of the full
-- request -> approve/reject flow.
--
-- CHANGES:
--   1. CHECK constraint: add 'requested' action
--   2. Trigger: log_vip_cards_to_events skips 'requested' (intermediate state)
-- ============================================================================


-- ============================================================================
-- STEP 1: Add 'requested' to vip_cards_activity CHECK constraint
-- ============================================================================

ALTER TABLE public.vip_cards_activity
DROP CONSTRAINT IF EXISTS vip_cards_activity_action_check;

ALTER TABLE public.vip_cards_activity
ADD CONSTRAINT vip_cards_activity_action_check
CHECK (action IN ('gained', 'used', 'removed', 'traded', 'approved', 'rejected', 'requested'));

COMMENT ON COLUMN public.vip_cards_activity.action IS
'Action type: gained, used, removed, traded, approved, rejected, or requested';


-- ============================================================================
-- STEP 2: Update log_vip_cards_to_events to skip 'requested'
-- ============================================================================
-- Like 'approved' and 'rejected', 'requested' is an intermediate state.

CREATE OR REPLACE FUNCTION public.log_vip_cards_to_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_type public.reward_event_type;
    v_card_name TEXT;
    v_description TEXT;
    v_class_id UUID;
BEGIN
    -- Skip if already logged
    IF EXISTS (
        SELECT 1 FROM public.reward_events
        WHERE source_table = 'vip_cards_activity'
        AND source_id = NEW.id
    ) THEN
        RETURN NEW;
    END IF;

    -- Map action to event type
    -- 'approved', 'rejected', and 'requested' are intermediate states: skip logging
    CASE NEW.action
        WHEN 'gained' THEN v_event_type := 'earned';
        WHEN 'used' THEN v_event_type := 'used';
        WHEN 'removed' THEN v_event_type := 'removed';
        WHEN 'traded' THEN v_event_type := 'traded';
        WHEN 'approved' THEN RETURN NEW;
        WHEN 'rejected' THEN RETURN NEW;
        WHEN 'requested' THEN RETURN NEW;
        ELSE v_event_type := 'earned';
    END CASE;

    -- Get card name from template
    SELECT name INTO v_card_name
    FROM public.vip_card_templates
    WHERE id = NEW.card_template_id;

    v_card_name := COALESCE(v_card_name, NEW.card_template_id);

    -- Build description
    v_description := CASE NEW.action
        WHEN 'gained' THEN 'Carte VIP obtenue : ' || v_card_name
        WHEN 'used' THEN 'Carte VIP utilisée : ' || v_card_name
        WHEN 'removed' THEN 'Carte VIP retirée : ' || v_card_name
        WHEN 'traded' THEN 'Carte VIP échangée : ' || v_card_name
        ELSE 'Carte VIP : ' || v_card_name
    END;

    -- Get class_id from student's active membership
    SELECT cm.class_id INTO v_class_id
    FROM public.class_members cm
    WHERE cm.student_id = NEW.student_id
    AND cm.status = 'active'
    LIMIT 1;

    INSERT INTO public.reward_events (
        student_id,
        item_type,
        event_type,
        item_name,
        description,
        metadata,
        source_table,
        source_id,
        class_id,
        created_by,
        created_at
    ) VALUES (
        NEW.student_id,
        'vip_card',
        v_event_type,
        v_card_name,
        v_description,
        COALESCE(NEW.metadata, '{}') || jsonb_build_object(
            'card_instance_id', NEW.card_instance_id,
            'card_template_id', NEW.card_template_id,
            'action', NEW.action
        ),
        'vip_cards_activity',
        NEW.id,
        v_class_id,
        NULLIF(NEW.metadata->>'removed_by', '')::UUID,
        NEW.created_at
    );

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.log_vip_cards_to_events() IS
'Trigger function that maps vip_cards_activity rows to reward_events.
Maps: gained->earned, used->used, removed->removed, traded->traded.
Skips: approved, rejected, requested (intermediate states, not final reward events).';


-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================================';
  RAISE NOTICE 'Migration completed: Add requested action to vip_cards_activity';
  RAISE NOTICE '=========================================================';
  RAISE NOTICE '';
  RAISE NOTICE '  1. CHECK constraint: added ''requested'' action';
  RAISE NOTICE '  2. Trigger: log_vip_cards_to_events skips ''requested''';
  RAISE NOTICE '=========================================================';
END $$;
