-- Migration: Add deletion_context JSONB to student_warnings
-- Purpose: Store VIP card name and source when warnings are removed,
--          so the reward journal can show "Retiré grâce à la carte VIP Écrabouilleur"
-- Date: 2026-02-28

-- ============================================================================
-- 1. ADD COLUMN
-- ============================================================================

ALTER TABLE public.student_warnings
ADD COLUMN IF NOT EXISTS deletion_context JSONB DEFAULT NULL;

COMMENT ON COLUMN public.student_warnings.deletion_context
    IS 'Context of deletion: {source: "vip_card"|"teacher", card_name?: string}';

-- ============================================================================
-- 2. UPDATE RPC: remove_warnings_bulk with p_deletion_context parameter
-- ============================================================================

CREATE OR REPLACE FUNCTION public.remove_warnings_bulk(
    p_student_id UUID,
    p_class_id UUID,
    p_academic_period_id UUID,
    p_warning_types TEXT[],
    p_deletion_context JSONB DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_to_remove INTEGER;
    v_type TEXT;
    v_warning_id UUID;
    v_removed INTEGER := 0;
    v_counts JSON;
BEGIN
    -- Auth check: caller must be teacher of this class
    IF NOT is_class_teacher(p_class_id) THEN
        RETURN json_build_object('success', false, 'error', 'Unauthorized: you do not teach this class');
    END IF;

    -- Validate input array
    v_to_remove := COALESCE(array_length(p_warning_types, 1), 0);
    IF v_to_remove = 0 THEN
        RETURN json_build_object('success', false, 'error', 'No warning types provided');
    END IF;

    IF v_to_remove > 20 THEN
        RETURN json_build_object('success', false, 'error', 'Cannot remove more than 20 warnings at once');
    END IF;

    -- Validate each warning type
    FOREACH v_type IN ARRAY p_warning_types LOOP
        IF v_type NOT IN ('C', 'M', 'R', 'T') THEN
            RETURN json_build_object('success', false, 'error', 'Invalid warning type: ' || v_type);
        END IF;
    END LOOP;

    -- Serialize concurrent operations for the same student+class+period
    PERFORM pg_advisory_xact_lock(hashtext(p_student_id::text || p_class_id::text || p_academic_period_id::text));

    -- Soft-delete one warning per type entry (most recent first)
    FOREACH v_type IN ARRAY p_warning_types LOOP
        SELECT id INTO v_warning_id
        FROM student_warnings
        WHERE student_id = p_student_id
          AND class_id = p_class_id
          AND academic_period_id = p_academic_period_id
          AND warning_type = v_type
          AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_warning_id IS NOT NULL THEN
            UPDATE student_warnings
            SET deleted_at = NOW(),
                deleted_by = auth.uid(),
                deletion_context = p_deletion_context
            WHERE id = v_warning_id;

            v_removed := v_removed + 1;
        END IF;
    END LOOP;

    -- Return updated counts
    SELECT json_build_object(
        'C', COALESCE(SUM(CASE WHEN warning_type = 'C' THEN 1 ELSE 0 END), 0),
        'M', COALESCE(SUM(CASE WHEN warning_type = 'M' THEN 1 ELSE 0 END), 0),
        'R', COALESCE(SUM(CASE WHEN warning_type = 'R' THEN 1 ELSE 0 END), 0),
        'T', COALESCE(SUM(CASE WHEN warning_type = 'T' THEN 1 ELSE 0 END), 0)
    ) INTO v_counts
    FROM student_warnings
    WHERE student_id = p_student_id
      AND class_id = p_class_id
      AND academic_period_id = p_academic_period_id
      AND deleted_at IS NULL;

    RETURN json_build_object('success', true, 'counts', v_counts, 'removed', v_removed);
END;
$$;

-- Drop old function signature (4 args) if it exists, to avoid overload confusion
DROP FUNCTION IF EXISTS public.remove_warnings_bulk(UUID, UUID, UUID, TEXT[]);

COMMENT ON FUNCTION public.remove_warnings_bulk(UUID, UUID, UUID, TEXT[], JSONB)
    IS 'Atomically soft-delete multiple warnings (most recent per type) with optional deletion context, return updated counts';
GRANT EXECUTE ON FUNCTION public.remove_warnings_bulk(UUID, UUID, UUID, TEXT[], JSONB) TO authenticated;

-- ============================================================================
-- 3. UPDATE TRIGGER: log_warning_removed_to_events with deletion_context
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
        v_description := format('Retiré grâce à la carte VIP %s', v_card_name);
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

-- ============================================================================
-- 4. VERIFICATION
-- ============================================================================

DO $$
BEGIN
    -- Verify column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'student_warnings'
        AND column_name = 'deletion_context'
    ) THEN
        RAISE NOTICE 'Column deletion_context added to student_warnings';
    ELSE
        RAISE EXCEPTION 'Failed to add deletion_context column';
    END IF;

    -- Verify RPC exists with new signature
    IF EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'remove_warnings_bulk'
        AND pronamespace = 'public'::regnamespace
    ) THEN
        RAISE NOTICE 'RPC remove_warnings_bulk updated with deletion_context param';
    ELSE
        RAISE EXCEPTION 'RPC remove_warnings_bulk not found';
    END IF;

    RAISE NOTICE 'Migration completed: deletion_context support added';
END $$;
