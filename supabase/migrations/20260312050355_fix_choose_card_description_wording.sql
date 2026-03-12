-- ============================================================================
-- Migration: Include action card name in choose_card journal description
-- Created: 2026-03-12
-- ============================================================================
-- Before: "Carte VIP choisie"
-- After:  "Carte VIP choisie (utilisation de la carte Libre choix)"
-- ============================================================================

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
    v_acquired_from TEXT;
    v_action_type TEXT;
    v_used_by TEXT;
    v_trade_id TEXT;
    v_partner_name TEXT;
    v_amount INT;
    v_payment_card_name TEXT;
    v_action_card_name TEXT;
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

    -- Extract metadata fields for contextual descriptions
    v_acquired_from := NEW.metadata->>'acquired_from';
    v_action_type := NEW.metadata->>'action_type';
    v_used_by := NEW.metadata->>'used_by';
    v_trade_id := LEFT(COALESCE(NEW.metadata->>'trade_id', ''), 8);
    v_payment_card_name := NEW.metadata->>'payment_card_name';
    v_action_card_name := NEW.metadata->>'action_card_name';

    -- Build contextual description based on action + metadata
    v_description := CASE
        -- GAINED descriptions
        WHEN NEW.action = 'gained' AND v_acquired_from = 'purchase' THEN
            'Carte VIP achetée'
        WHEN NEW.action = 'gained' AND v_acquired_from = 'draw_gidouilles' THEN
            'Carte VIP obtenue par tirage'
        WHEN NEW.action = 'gained' AND v_acquired_from = 'draw_vip_card' THEN
            'Carte VIP obtenue par tirage (carte ' || COALESCE(v_payment_card_name, 'VIP') || ')'
        WHEN NEW.action = 'gained' AND v_acquired_from = 'exchange' THEN
            'Carte VIP obtenue par échange (carte ' || COALESCE(v_action_card_name, 'VIP') || ')'
        WHEN NEW.action = 'gained' AND v_acquired_from = 'choose' THEN
            'Carte VIP choisie (utilisation de la carte ' || COALESCE(v_action_card_name, 'VIP') || ')'
        WHEN NEW.action = 'gained' AND v_acquired_from = 'teacher_award' THEN
            'Carte VIP offerte par le prof'
        WHEN NEW.action = 'gained' AND v_acquired_from = 'teacher_draw' THEN
            'Carte VIP tirée par le prof'
        WHEN NEW.action = 'gained' AND v_acquired_from = 'trade' THEN
            format('Carte reçue de %s (échange #%s)',
                COALESCE(NEW.metadata->>'received_from_name', 'un élève'),
                v_trade_id)
        WHEN NEW.action = 'gained' THEN
            'Carte VIP obtenue'

        -- USED descriptions
        WHEN NEW.action = 'used' AND v_action_type = 'draw_cards' THEN
            'Carte VIP utilisée pour tirer '
            || COALESCE((NEW.metadata->>'cards_drawn')::TEXT, '')
            || ' cartes'
        WHEN NEW.action = 'used' AND v_action_type = 'exchange_cards' THEN
            'Carte VIP utilisée pour échanger des cartes'
        WHEN NEW.action = 'used' AND v_action_type = 'remove_warnings' THEN
            'Carte VIP utilisée pour retirer '
            || COALESCE((NEW.metadata->>'warnings_removed')::TEXT, '')
            || ' avertissements'
        WHEN NEW.action = 'used' AND v_action_type = 'add_gidouilles' THEN
            'Carte VIP utilisée pour gagner '
            || COALESCE((NEW.metadata->>'gidouilles_amount')::TEXT, '')
            || ' gidouilles'
        WHEN NEW.action = 'used' AND v_action_type = 'choose_card' THEN
            'Carte VIP utilisée pour choisir des cartes'
        WHEN NEW.action = 'used' AND v_used_by = 'exchange' THEN
            'Carte VIP défaussée pour échange (carte ' || COALESCE(v_action_card_name, 'VIP') || ')'
        WHEN NEW.action = 'used' THEN
            'Carte VIP utilisée'

        -- REMOVED description
        WHEN NEW.action = 'removed' THEN
            'Carte VIP retirée par le prof'

        -- TRADED
        WHEN NEW.action = 'traded' THEN
            format('Carte donnée à %s (échange #%s)',
                COALESCE(NEW.metadata->>'traded_to_name', 'un élève'),
                v_trade_id)

        -- Fallback
        ELSE 'Carte VIP'
    END;

    -- Get class_id from student's active membership
    SELECT cm.class_id INTO v_class_id
    FROM public.class_members cm
    WHERE cm.student_id = NEW.student_id
    AND cm.status = 'active'
    LIMIT 1;

    INSERT INTO public.reward_events (
        student_id,
        reward_type,
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
        CASE
            WHEN (NEW.metadata->>'removed_by') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN (NEW.metadata->>'removed_by')::UUID
            ELSE NULL
        END,
        NEW.created_at
    );

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.log_vip_cards_to_events() IS
'Trigger function that maps vip_cards_activity rows to reward_events.
Uses payment_card_name and action_card_name from metadata for contextual descriptions.';
