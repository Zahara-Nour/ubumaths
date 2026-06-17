-- ============================================================================
-- Migration: Add class_id to award_weekly_best_bonuses
-- Date: 2026-03-14
-- ============================================================================
-- reward_events with class_id = NULL are not visible to teachers via RLS.
-- Resolve class_id from class_members for each student.
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
  v_class_id UUID;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  IF auth.uid() IS NOT NULL AND v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can award weekly bonuses';
  END IF;

  IF p_week_end <= p_week_start THEN
    RAISE EXCEPTION 'Invalid week boundaries: end (%) must be after start (%)', p_week_end, p_week_start;
  END IF;

  FOR v_record IN
    SELECT student_id, best_theoretical_reward
    FROM weekly_best_rewards
    WHERE week_start = p_week_start
      AND week_end = p_week_end
      AND bonus_awarded_at IS NULL
      AND best_theoretical_reward > 0
    FOR UPDATE
  LOOP
    -- Resolve class_id from class_members (first active class)
    SELECT cm.class_id INTO v_class_id
    FROM class_members cm
    WHERE cm.student_id = v_record.student_id
      AND cm.status = 'active'
    LIMIT 1;

    UPDATE profiles
    SET gidouilles = gidouilles + v_record.best_theoretical_reward
    WHERE id = v_record.student_id;

    INSERT INTO gidouilles_activity (
      student_id, class_id, delta, reason, created_by
    ) VALUES (
      v_record.student_id, v_class_id,
      v_record.best_theoretical_reward,
      'weekly_best_game_bonus', NULL
    );

    UPDATE weekly_best_rewards
    SET bonus_awarded = v_record.best_theoretical_reward,
        bonus_awarded_at = NOW(),
        updated_at = NOW()
    WHERE student_id = v_record.student_id
      AND week_start = p_week_start;

    INSERT INTO notifications (
      title, message, type, is_system,
      system_event_type, target_type, target_user_ids
    ) VALUES (
      'Recompense hebdomadaire Demineur',
      format(
        E'Recompense hebdomadaire pour le jeu Demineur.\n\n' ||
        E'Tu as recu %s gidouille(s) pour ta meilleure performance ' ||
        E'de la semaine du %s au %s.\n\n' ||
        E'Continue comme ca !',
        ROUND(v_record.best_theoretical_reward, 2),
        TO_CHAR(p_week_start, 'DD/MM/YYYY'),
        TO_CHAR(p_week_end, 'DD/MM/YYYY')
      ),
      'info',
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

-- Fix the 4 existing entries: set class_id from class_members
UPDATE reward_events re
SET class_id = (
    SELECT cm.class_id
    FROM class_members cm
    WHERE cm.student_id = re.student_id
      AND cm.status = 'active'
    LIMIT 1
)
WHERE re.source_table = 'gidouilles_activity'
  AND re.description = 'Récompense hebdomadaire pour le jeu Démineur.'
  AND re.class_id IS NULL;
