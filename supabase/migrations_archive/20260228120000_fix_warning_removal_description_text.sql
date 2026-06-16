-- Migration: Fix warning removal description text
-- Purpose: Change "Retiré grâce à la carte VIP X" to "Retiré grâce à une carte X"
-- Date: 2026-02-28

CREATE OR REPLACE FUNCTION public.log_warning_removed_to_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_description TEXT;
    v_type_label TEXT;
    v_source TEXT;
    v_card_name TEXT;
    v_metadata JSONB;
BEGIN
    -- Only fire when deleted_at transitions from NULL to a value
    IF OLD.deleted_at IS NOT NULL OR NEW.deleted_at IS NULL THEN
        RETURN NEW;
    END IF;

    -- Skip if already logged (deduplication)
    IF EXISTS (
        SELECT 1 FROM public.reward_events
        WHERE source_table = 'student_warnings'
        AND source_id = NEW.id
        AND event_type = 'removed'
    ) THEN
        RETURN NEW;
    END IF;

    -- Map warning_type to French label
    CASE NEW.warning_type
        WHEN 'C' THEN v_type_label := 'Comportement';
        WHEN 'M' THEN v_type_label := 'Matériel';
        WHEN 'R' THEN v_type_label := 'Retard';
        WHEN 'T' THEN v_type_label := 'Travail';
        ELSE v_type_label := NEW.warning_type;
    END CASE;

    -- Build description from deletion_context
    v_source := NEW.deletion_context->>'source';
    v_card_name := NEW.deletion_context->>'card_name';

    IF v_source = 'vip_card' AND v_card_name IS NOT NULL THEN
        v_description := format('Retiré grâce à une carte %s', v_card_name);
    ELSE
        v_description := 'Retiré par le professeur';
    END IF;

    -- Build metadata with deletion_context included
    v_metadata := jsonb_build_object(
        'warning_type', NEW.warning_type,
        'academic_period_id', NEW.academic_period_id,
        'deleted_by', NEW.deleted_by
    );

    IF NEW.deletion_context IS NOT NULL THEN
        v_metadata := v_metadata || jsonb_build_object('deletion_context', NEW.deletion_context);
    END IF;

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
        'warning',
        'removed',
        v_type_label,
        v_description,
        v_metadata,
        'student_warnings',
        NEW.id,
        NEW.class_id,
        NEW.deleted_by,
        NEW.deleted_at
    );

    RETURN NEW;
END;
$$;
