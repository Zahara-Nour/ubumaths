-- ============================================================================
-- Migration: Fix daily_game_reward description in French
-- Created: 2026-03-11
-- ============================================================================
-- The reason 'daily_game_reward:minesweeper' was not translated by
-- generate_reward_event_description(), so it appeared raw in the journal.
-- ============================================================================

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

COMMENT ON FUNCTION public.generate_reward_event_description(TEXT, TEXT, NUMERIC) IS
'Generate human-readable description for reward events. Used by gidouilles_activity trigger. Accepts NUMERIC delta for decimal gidouilles.';

-- Backfill: Update existing reward_events with raw reason
UPDATE public.reward_events
SET description = 'Démineur : récompense quotidienne'
WHERE source_table = 'gidouilles_activity'
  AND description = 'daily_game_reward:minesweeper';

UPDATE public.reward_events
SET description = 'Énigme : récompense quotidienne'
WHERE source_table = 'gidouilles_activity'
  AND description = 'daily_game_reward:riddle';
