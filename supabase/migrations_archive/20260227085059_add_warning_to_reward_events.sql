-- Migration: Add warning type to reward_events system
-- Purpose: Log warning additions and removals in the student reward journal
-- Date: 2026-02-27

-- ============================================================================
-- 1. EXTEND REWARD_TYPE ENUM
-- ============================================================================

ALTER TYPE public.reward_type ADD VALUE IF NOT EXISTS 'warning';

-- ============================================================================
-- 2. TRIGGER: Log new warnings to reward_events
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_warning_added_to_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_description TEXT;
    v_type_label TEXT;
BEGIN
    -- Skip if already logged (deduplication)
    IF EXISTS (
        SELECT 1 FROM public.reward_events
        WHERE source_table = 'student_warnings'
        AND source_id = NEW.id
        AND event_type = 'awarded'
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

    v_description := format('Avertissement %s reçu', v_type_label);

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
        'awarded',
        v_type_label,
        v_description,
        jsonb_build_object(
            'warning_type', NEW.warning_type,
            'academic_period_id', NEW.academic_period_id
        ),
        'student_warnings',
        NEW.id,
        NEW.class_id,
        NEW.created_by,
        NEW.created_at
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_warning_added_to_events
    AFTER INSERT ON public.student_warnings
    FOR EACH ROW
    EXECUTE FUNCTION public.log_warning_added_to_events();

-- ============================================================================
-- 3. TRIGGER: Log soft-deleted warnings to reward_events
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_warning_removed_to_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_description TEXT;
    v_type_label TEXT;
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

    v_description := format('Avertissement %s retiré', v_type_label);

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
        jsonb_build_object(
            'warning_type', NEW.warning_type,
            'academic_period_id', NEW.academic_period_id,
            'deleted_by', NEW.deleted_by
        ),
        'student_warnings',
        NEW.id,
        NEW.class_id,
        NEW.deleted_by,
        NEW.deleted_at
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_warning_removed_to_events
    AFTER UPDATE OF deleted_at ON public.student_warnings
    FOR EACH ROW
    WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
    EXECUTE FUNCTION public.log_warning_removed_to_events();

-- ============================================================================
-- 4. VERIFICATION
-- ============================================================================

DO $$
BEGIN
    -- Verify enum value exists
    IF EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'reward_type' AND e.enumlabel = 'warning'
    ) THEN
        RAISE NOTICE 'Enum value warning added to reward_type';
    ELSE
        RAISE EXCEPTION 'Failed to add warning to reward_type enum';
    END IF;

    -- Verify triggers exist
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_log_warning_added_to_events')
       AND EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_log_warning_removed_to_events')
    THEN
        RAISE NOTICE 'Triggers created: trigger_log_warning_added_to_events, trigger_log_warning_removed_to_events';
    ELSE
        RAISE EXCEPTION 'Failed to create warning triggers';
    END IF;

    RAISE NOTICE 'Migration completed: warnings now log to reward_events';
END $$;
