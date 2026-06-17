-- ============================================================================
-- Migration: Remove ::INTEGER cast in award_weekly_best_bonuses
-- Date: 2026-03-14
-- ============================================================================
-- The delta column in gidouilles_activity and gidouilles in profiles are both
-- numeric. The ::INTEGER cast was truncating decimal rewards (e.g. 3.63 → 3).
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
      v_record.best_theoretical_reward,
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
        ROUND(v_record.best_theoretical_reward, 2),
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
