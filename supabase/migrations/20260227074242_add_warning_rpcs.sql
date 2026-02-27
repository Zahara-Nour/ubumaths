-- Migration: Add RPC functions for warning management
-- Purpose: Atomic single and bulk warning insertion with count return
-- Date: 2026-02-27

-- ============================================================================
-- RPC: add_warning (single)
-- ============================================================================
-- Atomically inserts one warning and returns updated counts.
-- Replaces the previous pattern of INSERT + re-fetch all class warnings.

CREATE OR REPLACE FUNCTION public.add_warning(
    p_student_id UUID,
    p_class_id UUID,
    p_academic_period_id UUID,
    p_warning_type TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total INTEGER;
    v_counts JSON;
BEGIN
    -- Auth check: caller must be teacher of this class
    IF NOT is_class_teacher(p_class_id) THEN
        RETURN json_build_object('success', false, 'error', 'Unauthorized: you do not teach this class');
    END IF;

    -- Validate warning type
    IF p_warning_type NOT IN ('C', 'M', 'R', 'T') THEN
        RETURN json_build_object('success', false, 'error', 'Invalid warning type: ' || p_warning_type);
    END IF;

    -- Serialize concurrent additions for the same student+class+period
    PERFORM pg_advisory_xact_lock(hashtext(p_student_id::text || p_class_id::text || p_academic_period_id::text));

    -- Count current active warnings
    SELECT COUNT(*) INTO v_total
    FROM student_warnings
    WHERE student_id = p_student_id
      AND class_id = p_class_id
      AND academic_period_id = p_academic_period_id
      AND deleted_at IS NULL;

    -- Enforce max 20
    IF v_total >= 20 THEN
        RETURN json_build_object('success', false, 'error', 'Student already has 20 warnings');
    END IF;

    -- Insert warning
    INSERT INTO student_warnings (student_id, class_id, academic_period_id, warning_type, created_by)
    VALUES (p_student_id, p_class_id, p_academic_period_id, p_warning_type, auth.uid());

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

    RETURN json_build_object('success', true, 'counts', v_counts);
END;
$$;

COMMENT ON FUNCTION public.add_warning(UUID, UUID, UUID, TEXT)
    IS 'Atomically add a single warning and return updated counts for the student';
GRANT EXECUTE ON FUNCTION public.add_warning(UUID, UUID, UUID, TEXT) TO authenticated;

-- ============================================================================
-- RPC: add_warnings_bulk (multiple warnings for same student)
-- ============================================================================
-- Atomically inserts multiple warnings and returns updated counts.
-- Useful for rapid-fire UI where multiple types are accumulated then sent at once.

CREATE OR REPLACE FUNCTION public.add_warnings_bulk(
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
    v_total INTEGER;
    v_to_add INTEGER;
    v_type TEXT;
    v_counts JSON;
BEGIN
    -- Auth check: caller must be teacher of this class
    IF NOT is_class_teacher(p_class_id) THEN
        RETURN json_build_object('success', false, 'error', 'Unauthorized: you do not teach this class');
    END IF;

    -- Validate input array
    v_to_add := COALESCE(array_length(p_warning_types, 1), 0);
    IF v_to_add = 0 THEN
        RETURN json_build_object('success', false, 'error', 'No warning types provided');
    END IF;

    IF v_to_add > 20 THEN
        RETURN json_build_object('success', false, 'error', 'Cannot add more than 20 warnings at once');
    END IF;

    -- Validate each warning type
    FOREACH v_type IN ARRAY p_warning_types LOOP
        IF v_type NOT IN ('C', 'M', 'R', 'T') THEN
            RETURN json_build_object('success', false, 'error', 'Invalid warning type: ' || v_type);
        END IF;
    END LOOP;

    -- Serialize concurrent additions for the same student+class+period
    PERFORM pg_advisory_xact_lock(hashtext(p_student_id::text || p_class_id::text || p_academic_period_id::text));

    -- Count current active warnings
    SELECT COUNT(*) INTO v_total
    FROM student_warnings
    WHERE student_id = p_student_id
      AND class_id = p_class_id
      AND academic_period_id = p_academic_period_id
      AND deleted_at IS NULL;

    -- Enforce max 20
    IF v_total + v_to_add > 20 THEN
        RETURN json_build_object(
            'success', false,
            'error', format('Would exceed 20 warnings (current: %s, adding: %s)', v_total, v_to_add)
        );
    END IF;

    -- Insert all warnings in one statement
    INSERT INTO student_warnings (student_id, class_id, academic_period_id, warning_type, created_by)
    SELECT p_student_id, p_class_id, p_academic_period_id, unnest(p_warning_types), auth.uid();

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

    RETURN json_build_object('success', true, 'counts', v_counts, 'added', v_to_add);
END;
$$;

COMMENT ON FUNCTION public.add_warnings_bulk(UUID, UUID, UUID, TEXT[])
    IS 'Atomically add multiple warnings for the same student and return updated counts';
GRANT EXECUTE ON FUNCTION public.add_warnings_bulk(UUID, UUID, UUID, TEXT[]) TO authenticated;

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
BEGIN
    -- Verify both functions exist
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_warning' AND pronamespace = 'public'::regnamespace)
       AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_warnings_bulk' AND pronamespace = 'public'::regnamespace)
    THEN
        RAISE NOTICE 'Migration completed: add_warning and add_warnings_bulk RPCs created';
    ELSE
        RAISE EXCEPTION 'Migration failed: RPCs not created correctly';
    END IF;
END $$;
