-- ============================================================================
-- Migration: pg_cron job for Weekly Rewards (no warnings bonus)
-- Purpose: Awards 1 gidouille to students with no warnings during the week
-- Date: 2026-01-04
-- ============================================================================
--
-- This job runs twice daily (00:00 and 12:00 UTC) and for each class:
-- 1. Gets school timezone and week_config
-- 2. Checks if current day = rewards day (6th day = first_day + 5) AND hour >= 12
-- 3. If both conditions true, awards 1 gidouille to students with no warnings
--    from current_week_start until now
--
-- Schedule: 0 0,12 * * * (00:00 and 12:00 UTC daily)
-- ============================================================================

-- ============================================================================
-- PART 1: Create Main Function
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
                -- On rewards day (day 5), this is always 5
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
                      AND cm.is_test = false
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
                            '🏆 Récompense hebdomadaire',
                            format(
                                E'🏆 Récompense hebdomadaire - %s\n\n' ||
                                E'Bravo ! Tu as reçu 1 gidouille pour avoir passé la semaine ' ||
                                E'du %s au %s sans avertissement.\n\n' ||
                                E'Continue comme ça ! 💪',
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
    'pg_cron job that awards 1 gidouille to students with no warnings during the week.
     Runs 2x/day, processes each class when it''s their rewards day (6th day = first_day + 5)
     AND afternoon (hour >= 12) locally. Checks warnings from current_week_start until now.';

-- Grant execute to service_role for manual triggers
GRANT EXECUTE ON FUNCTION public.run_weekly_rewards() TO service_role;

-- ============================================================================
-- PART 2: Schedule pg_cron Job (00:00 and 12:00 UTC daily)
-- ============================================================================

DO $$
BEGIN
    -- Check if pg_cron extension is available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Remove existing job if any (ignore error if not exists)
        BEGIN
            PERFORM cron.unschedule('weekly-rewards');
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        -- Schedule: twice daily at 00:00 and 12:00 UTC
        PERFORM cron.schedule(
            'weekly-rewards',
            '0 0,12 * * *',
            'SELECT public.run_weekly_rewards()'
        );

        RAISE NOTICE 'pg_cron job weekly-rewards scheduled for 00:00 and 12:00 UTC daily';
    ELSE
        RAISE NOTICE 'pg_cron extension not enabled - enable in Supabase Dashboard';
    END IF;
END;
$$;
