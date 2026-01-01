-- ============================================================================
-- Migration: Fix generate_reward_event_description for NUMERIC gidouilles
-- Purpose: Add overload that accepts NUMERIC instead of INTEGER
-- Date: 2026-01-01
-- ============================================================================

-- Create overloaded version that accepts NUMERIC for p_amount
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
            ELSE
                RETURN format('%s gidouilles', ROUND(p_amount, 2));
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
    'Generates human-readable description for reward events. NUMERIC version for Strategy D decimal gidouilles.';
