-- Migration: Add RPC function for bulk warning removal
-- Purpose: Atomic bulk soft-delete of warnings with count return
-- Date: 2026-02-27

-- ============================================================================
-- RPC: remove_warnings_bulk (soft-delete multiple warnings for same student)
-- ============================================================================
-- For each type in the array, soft-deletes the most recent active warning of
-- that type. Skips types with no active warnings. Returns updated counts.
-- Mirrors add_warnings_bulk pattern (auth, advisory lock, counts return).

CREATE OR REPLACE FUNCTION public.remove_warnings_bulk(
    p_student_id UUID,
    p_class_id UUID,
    p_academic_period_id UUID,
    p_warning_types TEXT[]
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
            SET deleted_at = NOW(), deleted_by = auth.uid()
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

COMMENT ON FUNCTION public.remove_warnings_bulk(UUID, UUID, UUID, TEXT[])
    IS 'Atomically soft-delete multiple warnings (most recent per type) and return updated counts';
GRANT EXECUTE ON FUNCTION public.remove_warnings_bulk(UUID, UUID, UUID, TEXT[]) TO authenticated;

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'remove_warnings_bulk' AND pronamespace = 'public'::regnamespace)
    THEN
        RAISE NOTICE 'Migration completed: remove_warnings_bulk RPC created';
    ELSE
        RAISE EXCEPTION 'Migration failed: RPC not created correctly';
    END IF;
END $$;
