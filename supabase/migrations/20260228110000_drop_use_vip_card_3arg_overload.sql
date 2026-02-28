-- Migration: Drop old 3-arg use_vip_card overload
-- Purpose: PostgREST cannot resolve between use_vip_card(UUID, TEXT, TEXT) and
--          use_vip_card(UUID, TEXT, TEXT, JSONB). Drop the old 3-arg version
--          since the 4-arg version has p_metadata JSONB DEFAULT NULL.
-- Date: 2026-02-28

DROP FUNCTION IF EXISTS public.use_vip_card(UUID, TEXT, TEXT);

-- Verify only the 4-arg version remains
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM pg_proc
    WHERE proname = 'use_vip_card'
    AND pronamespace = 'public'::regnamespace;

    IF v_count = 1 THEN
        RAISE NOTICE 'Migration completed: use_vip_card overload resolved (1 version remains)';
    ELSE
        RAISE EXCEPTION 'Expected 1 version of use_vip_card, found %', v_count;
    END IF;
END $$;
