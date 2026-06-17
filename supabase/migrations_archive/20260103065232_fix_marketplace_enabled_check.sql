-- Fix check_marketplace_enabled to support class-level configs
-- Previously only checked school-level configs (school_id IS NOT NULL)
-- Now checks class-level configs first (class_id IS NOT NULL)

CREATE OR REPLACE FUNCTION public.check_marketplace_enabled(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_class_id UUID;
    v_class_enabled BOOLEAN;
BEGIN
    -- Get student's class
    SELECT cm.class_id INTO v_class_id
    FROM public.class_members cm
    WHERE cm.student_id = p_student_id
    LIMIT 1;

    IF v_class_id IS NULL THEN
        RETURN false;
    END IF;

    -- Check class-level config (new approach: config per class)
    SELECT mc.enabled_for_class INTO v_class_enabled
    FROM public.marketplace_config mc
    WHERE mc.class_id = v_class_id;

    -- If class config exists, use its enabled_for_class value
    IF v_class_enabled IS NOT NULL THEN
        RETURN v_class_enabled;
    END IF;

    -- No class config found - marketplace is disabled by default
    RETURN false;
END;
$$;

COMMENT ON FUNCTION public.check_marketplace_enabled IS 'Check if marketplace is enabled for a student based on their class config';
