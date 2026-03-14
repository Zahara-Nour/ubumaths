-- ============================================================================
-- Migration: Fix broken references in weekly reward functions
-- Date: 2026-03-14
-- ============================================================================
-- BUG 1: run_weekly_rewards() references cm.is_test which no longer exists
--         in class_members table. The status = 'active' filter is sufficient.
--
-- BUG 2: award_weekly_best_bonuses() references gidouilles_history which was
--         renamed to gidouilles_activity in migration 20260103235000.
--
-- Both bugs only manifest on the actual rewards day (Friday afternoon in
-- school timezone) because non-matching days skip before hitting the broken
-- code. The EXCEPTION handler's RAISE causes a full transaction rollback,
-- erasing the error from background_job_runs — making the failures invisible.
-- ============================================================================

-- ============================================================================
-- FIX 1: run_weekly_rewards - remove cm.is_test reference
-- ============================================================================

CREATE OR REPLACE FUNCTION public.run_weekly_rewards()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_run_id UUID;
    v_class RECORD;
    v_member RECORD;
    v_processed_classes INTEGER := 0;
    v_skipped_classes INTEGER := 0;
    v_total_rewards INTEGER := 0;
    v_class_rewards INTEGER;
    v_current_day INTEGER;
    v_current_hour INTEGER;
    v_rewards_day INTEGER;
    v_first_day INTEGER;
    v_today DATE;
    v_current_week_start DATE;
    v_days_since_week_start INTEGER;
    v_timezone TEXT;
    v_has_warnings BOOLEAN;
    v_week_start_ts TIMESTAMPTZ;
    v_class_name TEXT;
BEGIN
    -- Start job run tracking
    v_run_id := start_job_run('weekly_rewards', '{}'::jsonb);

    BEGIN
        -- Process each active class with its school info
        FOR v_class IN
            SELECT
                c.id as class_id,
                c.name as class_name,
                c.school_id,
                s.timezone,
                COALESCE((s.timetable->'week_config'->>'first_day')::INTEGER, 1) as first_day
            FROM classes c
            JOIN schools s ON c.school_id = s.id
            WHERE c.is_active = true
              AND s.timezone IS NOT NULL
        LOOP
            v_timezone := v_class.timezone;
            v_first_day := v_class.first_day;
            v_class_name := v_class.class_name;

            -- Calculate rewards day (6th day of week = first day of weekend)
            v_rewards_day := (v_first_day + 5) % 7;

            -- Get current day and hour in school's timezone
            v_current_day := EXTRACT(DOW FROM NOW() AT TIME ZONE v_timezone)::INTEGER;
            v_current_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE v_timezone)::INTEGER;

            -- Check if it's rewards day AND afternoon
            IF v_current_day = v_rewards_day AND v_current_hour >= 12 THEN
                -- Calculate today's date in school's timezone
                v_today := (NOW() AT TIME ZONE v_timezone)::DATE;

                -- Calculate days since current week started
                v_days_since_week_start := (v_current_day - v_first_day + 7) % 7;

                -- Current week start
                v_current_week_start := v_today - v_days_since_week_start;

                -- Convert to timestamptz for proper comparison
                v_week_start_ts := (v_current_week_start::TIMESTAMP AT TIME ZONE v_timezone);

                v_class_rewards := 0;

                -- Process each active student in the class
                -- FIX: removed cm.is_test (column no longer exists), status='active' is sufficient
                FOR v_member IN
                    SELECT cm.student_id
                    FROM class_members cm
                    WHERE cm.class_id = v_class.class_id
                      AND cm.status = 'active'
                LOOP
                    -- Check if student has any active warnings this week
                    SELECT EXISTS (
                        SELECT 1 FROM student_warnings sw
                        WHERE sw.student_id = v_member.student_id
                          AND sw.class_id = v_class.class_id
                          AND sw.deleted_at IS NULL
                          AND sw.created_at >= v_week_start_ts
                    ) INTO v_has_warnings;

                    IF NOT v_has_warnings THEN
                        -- Award 1 gidouille using RPC
                        PERFORM update_student_gidouilles(
                            v_member.student_id,
                            v_class.class_id,
                            1,
                            'weekly_no_warning',
                            NULL  -- system-generated
                        );

                        -- Insert into weekly_rewards table
                        INSERT INTO weekly_rewards (
                            student_id,
                            class_id,
                            week_start,
                            week_end,
                            gidouilles_awarded
                        ) VALUES (
                            v_member.student_id,
                            v_class.class_id,
                            v_current_week_start,
                            v_today,
                            1
                        );

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
                            'Recompense hebdomadaire',
                            format(
                                E'Recompense hebdomadaire - %s\n\n' ||
                                E'Bravo ! Tu as recu 1 gidouille pour avoir passe la semaine ' ||
                                E'du %s au %s sans avertissement.\n\n' ||
                                E'Continue comme ca !',
                                v_class_name,
                                TO_CHAR(v_current_week_start, 'DD/MM/YYYY'),
                                TO_CHAR(v_today, 'DD/MM/YYYY')
                            ),
                            'success',
                            true,
                            'weekly_reward',
                            'users',
                            ARRAY[v_member.student_id]
                        );

                        v_class_rewards := v_class_rewards + 1;
                    END IF;
                END LOOP;

                v_total_rewards := v_total_rewards + v_class_rewards;
                v_processed_classes := v_processed_classes + 1;

                RAISE NOTICE 'Class %: awarded % weekly rewards', v_class_name, v_class_rewards;
            ELSE
                v_skipped_classes := v_skipped_classes + 1;
            END IF;
        END LOOP;

        -- Complete job run with success
        PERFORM complete_job_run(
            v_run_id,
            'success',
            NULL,
            jsonb_build_object(
                'classes_processed', v_processed_classes,
                'classes_skipped', v_skipped_classes,
                'total_rewards_awarded', v_total_rewards
            )
        );

        RAISE NOTICE 'Weekly rewards complete: % classes processed, % skipped, % rewards awarded',
            v_processed_classes, v_skipped_classes, v_total_rewards;

    EXCEPTION WHEN OTHERS THEN
        -- Complete job run with failure
        PERFORM complete_job_run(
            v_run_id,
            'failed',
            SQLERRM,
            jsonb_build_object(
                'classes_processed', v_processed_classes,
                'classes_skipped', v_skipped_classes,
                'total_rewards_awarded', v_total_rewards
            )
        );
        RAISE;
    END;
END;
$$;

-- ============================================================================
-- FIX 2: award_weekly_best_bonuses - gidouilles_history -> gidouilles_activity
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

    -- FIX: Log in gidouilles_activity (was gidouilles_history, renamed in 20260103235000)
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

    v_bonus_count := v_bonus_count + 1;
  END LOOP;

  RETURN v_bonus_count;
END;
$$;
