-- Migration: Fix log_vip_card_changes trigger function
-- Description: Use jsonb_each() instead of jsonb_array_elements() since vip_cards is an object, not an array
-- Created: 2025-12-16
--
-- BUG: The trigger was using jsonb_array_elements() which expects an array,
--      but vip_cards is a JSONB object with instance IDs as keys:
--      {"uuid-1": {"cardId": "...", "earnedAt": "..."}, ...}
--
-- FIX: Use jsonb_each() to iterate over object keys/values

CREATE OR REPLACE FUNCTION public.log_vip_card_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_old_cards JSONB;
    v_new_cards JSONB;
BEGIN
    -- Only process if vip_cards column changed
    IF OLD.vip_cards IS DISTINCT FROM NEW.vip_cards THEN
        -- FIX: Use empty object '{}' not empty array '[]' as default
        v_old_cards := COALESCE(OLD.vip_cards, '{}'::JSONB);
        v_new_cards := COALESCE(NEW.vip_cards, '{}'::JSONB);

        -- Log removed cards (in OLD but not in NEW)
        -- FIX: Use jsonb_each() for objects instead of jsonb_array_elements() for arrays
        INSERT INTO public.vip_cards_activity (
            student_id,
            card_instance_id,
            card_template_id,
            action,
            metadata
        )
        SELECT
            NEW.id,
            old_entry.key,  -- instance ID is the key
            old_entry.value->>'cardId',
            'removed',
            jsonb_build_object('removed_by', auth.uid())
        FROM jsonb_each(v_old_cards) AS old_entry
        WHERE NOT EXISTS (
            SELECT 1
            FROM jsonb_each(v_new_cards) AS new_entry
            WHERE new_entry.key = old_entry.key
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
            new_entry.key,  -- instance ID is the key
            new_entry.value->>'cardId',
            'gained',
            jsonb_build_object('gained_at', new_entry.value->>'earnedAt')
        FROM jsonb_each(v_new_cards) AS new_entry
        WHERE NOT EXISTS (
            SELECT 1
            FROM jsonb_each(v_old_cards) AS old_entry
            WHERE old_entry.key = new_entry.key
        )
        ON CONFLICT (student_id, card_instance_id, action, created_at) DO NOTHING;

        -- Log status changes (cards that were marked as used)
        -- A card is "used" when usedAt changes from NULL to a timestamp
        INSERT INTO public.vip_cards_activity (
            student_id,
            card_instance_id,
            card_template_id,
            action,
            metadata
        )
        SELECT
            NEW.id,
            new_entry.key,  -- instance ID is the key
            new_entry.value->>'cardId',
            'used',
            jsonb_build_object(
                'used_at', new_entry.value->>'usedAt',
                'assignment_id', new_entry.value->>'assignmentId'
            )
        FROM jsonb_each(v_new_cards) AS new_entry
        JOIN jsonb_each(v_old_cards) AS old_entry
            ON new_entry.key = old_entry.key
        WHERE (old_entry.value->>'usedAt') IS NULL
          AND (new_entry.value->>'usedAt') IS NOT NULL
        ON CONFLICT (student_id, card_instance_id, action, created_at) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$function$;

-- Add comment
COMMENT ON FUNCTION public.log_vip_card_changes() IS
'Trigger function to log VIP card activity (gained, removed, used) when profiles.vip_cards changes.
Uses jsonb_each() to iterate over the vip_cards object (not array).
Structure: {"instance-uuid": {"cardId": "...", "earnedAt": "...", "usedAt": null|"..."}}';
