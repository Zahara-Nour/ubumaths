-- ============================================================================
-- Migration: Weekly rewards - check all warning button steps
-- Date: 2026-03-14
-- ============================================================================
-- The warning button has 3 escalating steps:
--   Step 1: Remove gidouille (logged in gidouilles_activity, reason='Retiré suite à un avertissement')
--   Step 2: Remove VIP card (logged in vip_cards_activity, action='removed', metadata.reason='warning')
--   Step 3: Add warning C (logged in student_warnings)
--
-- Previously, run_weekly_rewards only checked student_warnings (step 3).
-- Now it checks all 3 sources so any click on the warning button
-- disqualifies the student from the weekly reward.
--
-- Also adds p_reason parameter to remove_vip_card RPC to distinguish
-- warning-triggered removals from manual teacher removals.
-- ============================================================================

-- ============================================================================
-- PART 1: Add p_reason parameter to remove_vip_card
-- ============================================================================

-- Drop existing function signatures to avoid overload conflicts
DROP FUNCTION IF EXISTS public.remove_vip_card(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.remove_vip_card(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.remove_vip_card(
    p_student_id UUID,
    p_card_id TEXT DEFAULT NULL,
    p_instance_id TEXT DEFAULT NULL,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher_id UUID;
  v_vip_cards JSONB;
  v_instance_id TEXT;
  v_card_data JSONB;
  v_card_id TEXT;
  v_template RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_oldest_instance_id TEXT;
  v_oldest_date TIMESTAMPTZ;
  v_loop_key TEXT;
  v_metadata JSONB;
BEGIN
  v_teacher_id := auth.uid();

  IF NOT is_teacher_or_admin() THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Unauthorized: Only teachers can remove VIP cards'
    );
  END IF;

  -- Verify student is in one of the teacher's ACTIVE classes
  IF NOT EXISTS (
    SELECT 1
    FROM class_members cm
    INNER JOIN classes c ON c.id = cm.class_id
    WHERE cm.student_id = p_student_id
      AND c.teacher_id = v_teacher_id
      AND cm.status = 'active'
  ) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Unauthorized: Student is not in your active classes'
    );
  END IF;

  IF p_instance_id IS NULL AND p_card_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Either p_instance_id or p_card_id must be provided'
    );
  END IF;

  SELECT vip_cards INTO v_vip_cards
  FROM profiles
  WHERE id = p_student_id
  FOR UPDATE;

  IF v_vip_cards IS NULL THEN
    v_vip_cards := '{}'::JSONB;
  END IF;

  IF p_instance_id IS NOT NULL THEN
    v_instance_id := p_instance_id;
  ELSE
    FOR v_loop_key IN
      SELECT key FROM jsonb_each(v_vip_cards)
    LOOP
      DECLARE
        v_loop_data JSONB;
        v_loop_card_id TEXT;
        v_loop_used_at TEXT;
        v_loop_earned_at TIMESTAMPTZ;
      BEGIN
        v_loop_data := v_vip_cards->v_loop_key;
        v_loop_card_id := v_loop_data->>'cardId';
        v_loop_used_at := v_loop_data->>'usedAt';

        IF v_loop_card_id = p_card_id AND v_loop_used_at IS NULL THEN
          v_loop_earned_at := (v_loop_data->>'earnedAt')::TIMESTAMPTZ;

          IF v_oldest_date IS NULL OR v_loop_earned_at < v_oldest_date THEN
            v_oldest_date := v_loop_earned_at;
            v_oldest_instance_id := v_loop_key;
          END IF;
        END IF;
      END;
    END LOOP;

    IF v_oldest_instance_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'No unused instance found for card: ' || COALESCE(p_card_id, 'unknown')
      );
    END IF;

    v_instance_id := v_oldest_instance_id;
  END IF;

  v_card_data := v_vip_cards->v_instance_id;

  IF v_card_data IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Card instance not found: ' || v_instance_id
    );
  END IF;

  IF v_card_data->>'usedAt' IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Cannot remove a card that has already been used'
    );
  END IF;

  v_card_id := v_card_data->>'cardId';

  SELECT id, name INTO v_template
  FROM vip_card_templates
  WHERE id = v_card_id;

  v_vip_cards := v_vip_cards - v_instance_id;

  -- Build metadata with optional reason
  v_metadata := jsonb_build_object(
    'removed_by', v_teacher_id::TEXT,
    'removed_at', to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
  IF p_reason IS NOT NULL THEN
    v_metadata := v_metadata || jsonb_build_object('reason', p_reason);
  END IF;

  INSERT INTO public.vip_cards_activity (
    student_id, card_instance_id, card_template_id, action, metadata
  ) VALUES (
    p_student_id, v_instance_id, v_card_id, 'removed', v_metadata
  );

  UPDATE profiles
  SET vip_cards = v_vip_cards, updated_at = v_now
  WHERE id = p_student_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'cardName', COALESCE(v_template.name, v_card_id),
    'instanceId', v_instance_id,
    'cardId', v_card_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_vip_card(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_vip_card(UUID, TEXT, TEXT, TEXT) TO service_role;

-- ============================================================================
-- PART 2: Update run_weekly_rewards to check all 3 warning steps
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
    v_has_warning_action BOOLEAN;
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
                FOR v_member IN
                    SELECT cm.student_id
                    FROM class_members cm
                    WHERE cm.class_id = v_class.class_id
                      AND cm.status = 'active'
                LOOP
                    -- Check all 3 warning button steps:
                    SELECT EXISTS (
                        -- Step 3: actual warning in student_warnings
                        SELECT 1 FROM student_warnings sw
                        WHERE sw.student_id = v_member.student_id
                          AND sw.class_id = v_class.class_id
                          AND sw.deleted_at IS NULL
                          AND sw.created_at >= v_week_start_ts
                        UNION ALL
                        -- Step 1: gidouille removed due to warning
                        SELECT 1 FROM gidouilles_activity ga
                        WHERE ga.student_id = v_member.student_id
                          AND ga.class_id = v_class.class_id
                          AND ga.reason = 'Retiré suite à un avertissement'
                          AND ga.created_at >= v_week_start_ts
                        UNION ALL
                        -- Step 2: VIP card removed due to warning (metadata.reason = 'warning')
                        SELECT 1 FROM vip_cards_activity va
                        WHERE va.student_id = v_member.student_id
                          AND va.action = 'removed'
                          AND va.metadata->>'reason' = 'warning'
                          AND va.created_at >= v_week_start_ts
                    ) INTO v_has_warning_action;

                    IF NOT v_has_warning_action THEN
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

COMMENT ON FUNCTION public.run_weekly_rewards() IS
    'pg_cron job that awards 1 gidouille to students with no warning actions during the week.
     Checks all 3 warning button steps: student_warnings (step 3),
     gidouilles_activity with reason "Retiré suite à un avertissement" (step 1),
     and vip_cards_activity with action "removed" and metadata.reason "warning" (step 2).
     Runs 2x/day, processes each class when it''s their rewards day (6th day = first_day + 5)
     AND afternoon (hour >= 12) locally.';
