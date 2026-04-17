-- ============================================================================
-- Migration: Allow students to debit their own gidouilles
-- Created: 2026-04-17
-- ============================================================================
-- The 2048 game powers use update_student_gidouilles to debit gidouilles
-- when a student uses a power without a VIP card. But the RPC only allowed
-- teachers and admins, so students got "Non autorisé" errors.
-- This adds a check: students can debit (negative delta) their own gidouilles.
-- ============================================================================

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

    -- Authorization:
    -- 1. Admins: always allowed
    -- 2. Teachers of the student: always allowed
    -- 3. Students: can debit (negative delta) their OWN gidouilles only
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
        OR (v_caller_role = 'student' AND auth.uid() = p_student_id AND p_delta < 0)
    ) THEN
        RAISE EXCEPTION 'Non autorisé: seuls les professeurs de cet élève peuvent modifier ses gidouilles';
    END IF;

    -- Check sufficient gidouilles for debits
    IF p_delta < 0 THEN
        DECLARE v_current INTEGER;
        BEGIN
            SELECT COALESCE(gidouilles, 0) INTO v_current
            FROM public.profiles WHERE id = p_student_id;
            IF v_current + p_delta < 0 THEN
                RAISE EXCEPTION 'Pas assez de gidouilles (disponible: %, requis: %)', v_current, -p_delta;
            END IF;
        END;
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
