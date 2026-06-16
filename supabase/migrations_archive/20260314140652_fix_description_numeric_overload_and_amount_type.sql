-- ============================================================================
-- Migration: Fix numeric overload of generate_reward_event_description
--            and change reward_events.amount to numeric
-- Date: 2026-03-14
-- ============================================================================
-- 1. The trigger on gidouilles_activity passes a NUMERIC delta, which matches
--    the (text, text, numeric) overload, not the (text, text, integer) one
--    that was updated with 'weekly_best_game_bonus'. Fix the numeric overload.
-- 2. reward_events.amount is INTEGER but rewards can be decimal (e.g. 3.63).
--    Change to NUMERIC to preserve decimal values.
-- 3. Drop the INTEGER overload to avoid future confusion.
-- 4. Fix the 4 reward_events entries that have wrong description/amount.
-- ============================================================================

-- PART 1: Update the numeric overload with weekly_best_game_bonus
CREATE OR REPLACE FUNCTION public.generate_reward_event_description(
    p_source_table TEXT,
    p_reason TEXT,
    p_delta NUMERIC DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- Handle gidouilles_activity (renamed from gidouilles_history)
    IF p_source_table IN ('gidouilles_history', 'gidouilles_activity') THEN
        IF p_reason IS NULL OR p_reason = '' THEN
            IF p_delta IS NOT NULL AND p_delta > 0 THEN
                RETURN 'Gidouilles gagnées';
            ELSIF p_delta IS NOT NULL AND p_delta < 0 THEN
                RETURN 'Gidouilles dépensées';
            ELSE
                RETURN 'Modification de gidouilles';
            END IF;
        END IF;

        -- Translate common reasons
        CASE p_reason
            WHEN 'weekly_no_warning' THEN RETURN 'Récompense hebdomadaire (0 avertissement)';
            WHEN 'weekly_best_game_bonus' THEN RETURN 'Récompense hebdomadaire pour le jeu Démineur.';
            WHEN 'minesweeper_victory' THEN RETURN 'Victoire au démineur';
            WHEN 'minesweeper_hint' THEN RETURN 'Indice démineur';
            WHEN 'daily_game_reward:minesweeper' THEN RETURN 'Démineur : récompense quotidienne';
            WHEN 'daily_game_reward:riddle' THEN RETURN 'Énigme : récompense quotidienne';
            WHEN 'shop_purchase' THEN RETURN 'Achat en boutique';
            WHEN 'Modifié par professeur' THEN RETURN 'Modifié par professeur';
            ELSE RETURN p_reason;
        END CASE;
    END IF;

    -- Handle bonus_history
    IF p_source_table = 'bonus_history' THEN
        IF p_reason IS NULL OR p_reason = '' THEN
            IF p_delta IS NOT NULL AND p_delta > 0 THEN
                RETURN 'Bonus gagné';
            ELSIF p_delta IS NOT NULL AND p_delta < 0 THEN
                RETURN 'Bonus utilisé';
            ELSE
                RETURN 'Modification de bonus';
            END IF;
        END IF;
        RETURN p_reason;
    END IF;

    -- Handle vip_cards_activity
    IF p_source_table = 'vip_cards_activity' THEN
        CASE p_reason
            WHEN 'drawn' THEN RETURN 'Carte VIP obtenue';
            WHEN 'used' THEN RETURN 'Carte VIP utilisée';
            WHEN 'traded' THEN RETURN 'Carte VIP échangée';
            WHEN 'gained' THEN RETURN 'Carte VIP reçue';
            ELSE RETURN COALESCE(p_reason, 'Activité carte VIP');
        END CASE;
    END IF;

    -- Default: return reason or generic message
    RETURN COALESCE(p_reason, 'Événement de récompense');
END;
$$;

-- PART 2: Drop the INTEGER overload to avoid future confusion
DROP FUNCTION IF EXISTS public.generate_reward_event_description(TEXT, TEXT, INTEGER);

-- PART 3: Change reward_events.amount from INTEGER to NUMERIC
ALTER TABLE reward_events ALTER COLUMN amount TYPE NUMERIC;

-- PART 4: Fix the 4 entries created with wrong description and truncated amount
UPDATE reward_events re
SET
    description = 'Récompense hebdomadaire pour le jeu Démineur.',
    amount = ga.delta
FROM gidouilles_activity ga
WHERE re.source_table = 'gidouilles_activity'
  AND re.source_id = ga.id
  AND ga.reason = 'weekly_best_game_bonus'
  AND re.description = 'weekly_best_game_bonus';
