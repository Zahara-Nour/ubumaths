-- ============================================================================
-- Migration: Fix weekly best bonus description and add notification
-- Date: 2026-03-14
-- ============================================================================
-- 1. Add 'weekly_best_game_bonus' to generate_reward_event_description
--    so the journal shows a French message instead of the raw reason string.
-- 2. Add notification in award_weekly_best_bonuses so students are informed.
-- ============================================================================

-- ============================================================================
-- PART 1: Add weekly_best_game_bonus to description generator
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_reward_event_description(
    p_source_table TEXT,
    p_reason TEXT,
    p_delta INTEGER
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

-- ============================================================================
-- PART 2: Add notification to award_weekly_best_bonuses
-- ============================================================================

CREATE OR REPLACE FUNCTION public.award_weekly_best_bonuses(
    p_week_start DATE,
    p_week_end DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_bonus_count INTEGER := 0;
  v_record RECORD;
BEGIN
  -- Security check: Only admins or service role can call this
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  IF auth.uid() IS NOT NULL AND v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can award weekly bonuses';
  END IF;

  -- Validate week boundaries
  IF p_week_end <= p_week_start THEN
    RAISE EXCEPTION 'Invalid week boundaries: end (%) must be after start (%)', p_week_end, p_week_start;
  END IF;

  -- Process each student with pending bonus
  FOR v_record IN
    SELECT
      student_id,
      best_theoretical_reward
    FROM weekly_best_rewards
    WHERE week_start = p_week_start
      AND week_end = p_week_end
      AND bonus_awarded_at IS NULL
      AND best_theoretical_reward > 0
    FOR UPDATE
  LOOP
    -- Update profile gidouilles
    UPDATE profiles
    SET gidouilles = gidouilles + v_record.best_theoretical_reward
    WHERE id = v_record.student_id;

    -- Log in gidouilles_activity (trigger creates reward_events entry)
    INSERT INTO gidouilles_activity (
      student_id,
      class_id,
      delta,
      reason,
      created_by
    ) VALUES (
      v_record.student_id,
      NULL,
      v_record.best_theoretical_reward::INTEGER,
      'weekly_best_game_bonus',
      NULL -- System-generated
    );

    -- Mark bonus as awarded
    UPDATE weekly_best_rewards
    SET
      bonus_awarded = v_record.best_theoretical_reward,
      bonus_awarded_at = NOW(),
      updated_at = NOW()
    WHERE student_id = v_record.student_id
      AND week_start = p_week_start;

    -- Create notification
    INSERT INTO notifications (
      title,
      message,
      type,
      is_system,
      system_event_type,
      target_type,
      target_user_ids
    ) VALUES (
      'Recompense hebdomadaire Demineur',
      format(
        E'Recompense hebdomadaire pour le jeu Demineur.\n\n' ||
        E'Tu as recu %s gidouille(s) pour ta meilleure performance ' ||
        E'de la semaine du %s au %s.\n\n' ||
        E'Continue comme ca !',
        v_record.best_theoretical_reward,
        TO_CHAR(p_week_start, 'DD/MM/YYYY'),
        TO_CHAR(p_week_end, 'DD/MM/YYYY')
      ),
      'success',
      true,
      'weekly_best_bonus',
      'users',
      ARRAY[v_record.student_id]
    );

    v_bonus_count := v_bonus_count + 1;
  END LOOP;

  RETURN v_bonus_count;
END;
$$;
