-- ============================================================================
-- Migration: Revert student self-debit and add dedicated 2048 use_power RPC
-- Created: 2026-04-17
-- ============================================================================
-- 1. Revert update_student_gidouilles to its original form (teachers/admins only)
-- 2. Create a dedicated use_2048_power() RPC (SECURITY DEFINER) that handles
--    gidouilles debit atomically, like use_hint does for minesweeper.
-- ============================================================================

-- PART 1: Revert update_student_gidouilles (remove student self-debit)
CREATE OR REPLACE FUNCTION public.update_student_gidouilles(
    p_student_id UUID,
    p_class_id UUID,
    p_delta INTEGER,
    p_reason TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_gidouilles INTEGER;
    v_caller_role TEXT;
BEGIN
    -- SECURITY CHECK: Get caller's role to enforce authorization
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = auth.uid();

    -- Authorization: Only admins, teachers of the student, or system (NULL caller) can update
    IF auth.uid() IS NOT NULL AND NOT (
        v_caller_role = 'admin'
        OR (v_caller_role = 'teacher' AND EXISTS (
            SELECT 1 FROM public.class_members cm
            JOIN public.classes c ON c.id = cm.class_id
            WHERE cm.student_id = p_student_id
            AND cm.class_id = p_class_id
            AND cm.status = 'active'
            AND c.teacher_id = auth.uid()
        ))
    ) THEN
        RAISE EXCEPTION 'Non autorisé: seuls les professeurs de cet élève peuvent modifier ses gidouilles';
    END IF;

    -- Update gidouilles with floor at 0
    UPDATE public.profiles
    SET gidouilles = GREATEST(0, COALESCE(gidouilles, 0) + p_delta)
    WHERE id = p_student_id
    RETURNING gidouilles INTO v_new_gidouilles;

    -- Log the change in activity table
    INSERT INTO public.gidouilles_activity (
        student_id,
        class_id,
        delta,
        reason,
        created_by
    ) VALUES (
        p_student_id,
        p_class_id,
        p_delta,
        p_reason,
        COALESCE(p_created_by, auth.uid())
    );

    RETURN v_new_gidouilles;
END;
$$;

-- PART 2: Create dedicated use_2048_power RPC
CREATE OR REPLACE FUNCTION public.use_2048_power(
    p_power_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id UUID;
    v_role TEXT;
    v_cost INTEGER;
    v_current_gidouilles INTEGER;
    v_new_gidouilles INTEGER;
    v_class_id UUID;
BEGIN
    -- 1. Auth check: must be a student
    v_student_id := auth.uid();
    IF v_student_id IS NULL THEN
        RAISE EXCEPTION 'Authentification requise';
    END IF;

    SELECT role INTO v_role FROM public.profiles WHERE id = v_student_id;
    IF v_role != 'student' THEN
        RAISE EXCEPTION 'Seuls les élèves peuvent utiliser les pouvoirs';
    END IF;

    -- 2. Validate power type and get cost
    v_cost := CASE p_power_type
        WHEN 'undo' THEN 5
        WHEN 'bomb_4' THEN 3
        WHEN 'bomb_16' THEN 8
        WHEN 'bomb_64' THEN 15
        WHEN 'freeze_spawn' THEN 3
        WHEN 'fusion' THEN 15
        WHEN 'joker' THEN 10
        WHEN 'vision' THEN 3
        WHEN 'multiplier_1_5' THEN 20
        WHEN 'multiplier_2' THEN 40
        ELSE NULL
    END;

    IF v_cost IS NULL THEN
        RAISE EXCEPTION 'Type de pouvoir invalide: %', p_power_type;
    END IF;

    -- 3. Check sufficient gidouilles
    SELECT COALESCE(gidouilles, 0) INTO v_current_gidouilles
    FROM public.profiles WHERE id = v_student_id;

    IF v_current_gidouilles < v_cost THEN
        RAISE EXCEPTION 'Pas assez de gidouilles (disponible: %, requis: %)', v_current_gidouilles, v_cost;
    END IF;

    -- 4. Get student's active class
    SELECT cm.class_id INTO v_class_id
    FROM public.class_members cm
    WHERE cm.student_id = v_student_id
    AND cm.status = 'active'
    LIMIT 1;

    IF v_class_id IS NULL THEN
        RAISE EXCEPTION 'Pas de classe active trouvée';
    END IF;

    -- 5. Debit gidouilles atomically
    UPDATE public.profiles
    SET gidouilles = gidouilles - v_cost
    WHERE id = v_student_id
    AND gidouilles >= v_cost
    RETURNING gidouilles INTO v_new_gidouilles;

    IF v_new_gidouilles IS NULL THEN
        RAISE EXCEPTION 'Pas assez de gidouilles';
    END IF;

    -- 6. Log in activity
    INSERT INTO public.gidouilles_activity (
        student_id,
        class_id,
        delta,
        reason,
        created_by
    ) VALUES (
        v_student_id,
        v_class_id,
        -v_cost,
        '2048 power: ' || p_power_type,
        v_student_id
    );

    -- 7. Return result
    RETURN jsonb_build_object(
        'success', true,
        'source', 'gidouilles',
        'gidouilles_spent', v_cost,
        'gidouilles_remaining', v_new_gidouilles
    );
END;
$$;

COMMENT ON FUNCTION public.use_2048_power(TEXT) IS
    'Debit gidouilles for a 2048 power (fallback when no VIP card). SECURITY DEFINER for atomic debit + logging.';
