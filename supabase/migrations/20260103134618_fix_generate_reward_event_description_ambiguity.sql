-- ============================================================================
-- Migration: Fix generate_reward_event_description ambiguous function call
-- Purpose: Remove INTEGER overload, keep only NUMERIC version
-- Date: 2026-01-03
-- ============================================================================

-- Problem: Two overloaded functions exist:
--   generate_reward_event_description(..., INTEGER, ...)
--   generate_reward_event_description(..., NUMERIC, ...)
-- When called with NULL (unknown type), PostgreSQL can't choose.

-- Solution: Keep only the NUMERIC version
-- - INTEGER arguments are implicitly cast to NUMERIC
-- - NULL has no ambiguity with a single function
-- - NUMERIC version uses ROUND() for proper decimal display

-- Drop the INTEGER version
DROP FUNCTION IF EXISTS public.generate_reward_event_description(
    public.reward_type,
    public.reward_event_type,
    INTEGER,
    TEXT,
    JSONB
);

-- Ensure the NUMERIC version exists and is up to date
CREATE OR REPLACE FUNCTION public.generate_reward_event_description(
    p_reward_type public.reward_type,
    p_event_type public.reward_event_type,
    p_amount NUMERIC,
    p_item_name TEXT,
    p_metadata JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- Gidouilles events
    IF p_reward_type = 'gidouilles' THEN
        CASE p_event_type
            WHEN 'earned' THEN
                RETURN format('Gagné %s gidouilles%s',
                    ROUND(ABS(p_amount), 2),
                    CASE WHEN p_metadata->>'reason' IS NOT NULL
                        THEN ' : ' || (p_metadata->>'reason')
                        ELSE ''
                    END);
            WHEN 'spent' THEN
                RETURN format('Dépensé %s gidouilles%s',
                    ROUND(ABS(p_amount), 2),
                    CASE WHEN p_metadata->>'reason' IS NOT NULL
                        THEN ' : ' || (p_metadata->>'reason')
                        ELSE ''
                    END);
            WHEN 'transferred_in' THEN
                RETURN format('Reçu %s gidouilles', ROUND(ABS(p_amount), 2));
            WHEN 'transferred_out' THEN
                RETURN format('Envoyé %s gidouilles', ROUND(ABS(p_amount), 2));
            WHEN 'traded' THEN
                RETURN format('Échangé %s gidouilles', ROUND(ABS(p_amount), 2));
            WHEN 'awarded' THEN
                RETURN format('Reçu %s gidouilles (récompense)', ROUND(ABS(p_amount), 2));
            WHEN 'removed' THEN
                RETURN format('Retiré %s gidouilles', ROUND(ABS(p_amount), 2));
            ELSE
                RETURN format('%s gidouilles', ROUND(p_amount, 2));
        END CASE;
    END IF;

    -- Bonus events
    IF p_reward_type = 'bonus' THEN
        CASE p_event_type
            WHEN 'earned' THEN
                RETURN format('Gagné %s bonus%s',
                    ROUND(ABS(p_amount)),
                    CASE WHEN p_metadata->>'reason' IS NOT NULL
                        THEN ' : ' || (p_metadata->>'reason')
                        ELSE ''
                    END);
            WHEN 'used' THEN
                RETURN format('Utilisé %s bonus', ROUND(ABS(p_amount)));
            WHEN 'awarded' THEN
                RETURN format('Reçu %s bonus (récompense)', ROUND(ABS(p_amount)));
            ELSE
                RETURN format('%s bonus : %s', ROUND(p_amount), p_event_type);
        END CASE;
    END IF;

    -- VIP card events
    IF p_reward_type = 'vip_card' THEN
        CASE p_event_type
            WHEN 'earned' THEN
                RETURN format('Obtenu carte VIP : %s', COALESCE(p_item_name, 'Carte'));
            WHEN 'used' THEN
                RETURN format('Utilisé carte VIP : %s', COALESCE(p_item_name, 'Carte'));
            WHEN 'removed' THEN
                RETURN format('Carte VIP retirée : %s', COALESCE(p_item_name, 'Carte'));
            ELSE
                RETURN format('Carte VIP : %s', COALESCE(p_item_name, 'Carte'));
        END CASE;
    END IF;

    -- Achievement events
    IF p_reward_type = 'achievement' THEN
        RETURN format('Achievement débloqué : %s', COALESCE(p_item_name, 'Achievement'));
    END IF;

    -- Item events
    IF p_reward_type = 'item' THEN
        CASE p_event_type
            WHEN 'purchased' THEN
                RETURN format('Acheté : %s', COALESCE(p_item_name, 'Item'));
            WHEN 'used' THEN
                RETURN format('Utilisé : %s', COALESCE(p_item_name, 'Item'));
            WHEN 'traded' THEN
                RETURN format('Échangé : %s', COALESCE(p_item_name, 'Item'));
            ELSE
                RETURN format('Item : %s', COALESCE(p_item_name, 'Item'));
        END CASE;
    END IF;

    -- Points events
    IF p_reward_type = 'points' THEN
        CASE p_event_type
            WHEN 'earned' THEN
                RETURN format('Gagné %s points%s',
                    ROUND(p_amount),
                    CASE WHEN p_metadata->>'reason' IS NOT NULL
                        THEN ' : ' || (p_metadata->>'reason')
                        ELSE ''
                    END);
            ELSE
                RETURN format('%s points', ROUND(p_amount));
        END CASE;
    END IF;

    -- Default
    RETURN format('%s: %s', p_reward_type, p_event_type);
END;
$$;

COMMENT ON FUNCTION public.generate_reward_event_description(public.reward_type, public.reward_event_type, NUMERIC, TEXT, JSONB) IS
    'Generates human-readable description for reward events. Single NUMERIC version handles both integer and decimal amounts.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Verify only one version exists
    SELECT COUNT(*) INTO v_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'generate_reward_event_description';

    IF v_count = 1 THEN
        RAISE NOTICE 'Migration completed: Only NUMERIC version remains (expected: 1, actual: %)', v_count;
    ELSE
        RAISE WARNING 'Unexpected function count: expected 1, got %', v_count;
    END IF;

    RAISE NOTICE 'INTEGER arguments will be implicitly cast to NUMERIC';
    RAISE NOTICE 'NULL arguments will now resolve without ambiguity';
END $$;
