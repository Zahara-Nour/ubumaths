-- ============================================================================
-- Migration: pg_cron job for Weekly Best Game Bonuses
-- Purpose: Awards bonus gidouilles = best theoretical game reward of the week
-- Date: 2026-01-04
-- ============================================================================
--
-- This job runs twice daily (00:00 and 12:00 UTC) and for each school:
-- 1. Checks if current day in school's timezone = rewards day (day after last_day)
-- 2. Checks if current hour >= 12 (afternoon)
-- 3. If both conditions are true, calculates previous week range and awards bonuses
--
-- This ensures each school is processed exactly once, in their afternoon,
-- regardless of their timezone or week configuration.
--
-- Schedule: 0 0,12 * * * (00:00 and 12:00 UTC daily)
-- ============================================================================

-- ============================================================================
-- PART 1: Create Wrapper Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.run_weekly_best_bonuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_run_id UUID;
    v_school RECORD;
    v_processed_count INTEGER := 0;
    v_skipped_count INTEGER := 0;
    v_total_bonuses INTEGER := 0;
    v_school_bonuses INTEGER;
    v_current_day INTEGER;
    v_current_hour INTEGER;
    v_rewards_day INTEGER;
    v_first_day INTEGER;
    v_last_day INTEGER;
    v_today DATE;
    v_current_week_start DATE;
    v_previous_week_start DATE;
    v_previous_week_end DATE;
    v_days_to_week_start INTEGER;
BEGIN
    -- Start job run tracking
    v_run_id := start_job_run('weekly_best_bonuses', '{}'::jsonb);

    BEGIN
        -- Process each school with distinct timezone/week_config
        FOR v_school IN
            SELECT DISTINCT ON (s.id)
                s.id,
                s.name,
                s.timezone,
                COALESCE((s.timetable->'week_config'->>'first_day')::INTEGER, 0) as first_day,
                COALESCE((s.timetable->'week_config'->>'last_day')::INTEGER, 6) as last_day
            FROM schools s
            WHERE s.timezone IS NOT NULL
        LOOP
            v_first_day := v_school.first_day;
            v_last_day := v_school.last_day;

            -- Calculate rewards day (day after last_day, with wrap-around)
            v_rewards_day := (v_last_day + 1) % 7;

            -- Get current day and hour in school's timezone
            v_current_day := EXTRACT(DOW FROM NOW() AT TIME ZONE v_school.timezone)::INTEGER;
            v_current_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE v_school.timezone)::INTEGER;

            -- Check if it's rewards day AND afternoon
            IF v_current_day = v_rewards_day AND v_current_hour >= 12 THEN
                -- Calculate today's date in school's timezone
                v_today := (NOW() AT TIME ZONE v_school.timezone)::DATE;

                -- Calculate days since current week started
                -- (current_day - first_day + 7) % 7
                v_days_to_week_start := (v_current_day - v_first_day + 7) % 7;

                -- Current week start
                v_current_week_start := v_today - v_days_to_week_start;

                -- Previous week range (7 days before current week)
                v_previous_week_start := v_current_week_start - 7;
                v_previous_week_end := v_previous_week_start + 6;

                -- Call existing RPC to award bonuses for this week
                SELECT award_weekly_best_bonuses(v_previous_week_start, v_previous_week_end)
                INTO v_school_bonuses;

                v_total_bonuses := v_total_bonuses + COALESCE(v_school_bonuses, 0);
                v_processed_count := v_processed_count + 1;

                RAISE NOTICE 'School %: awarded % bonuses for week % to %',
                    v_school.name, v_school_bonuses, v_previous_week_start, v_previous_week_end;
            ELSE
                v_skipped_count := v_skipped_count + 1;
            END IF;
        END LOOP;

        -- Complete job run with success
        PERFORM complete_job_run(
            v_run_id,
            'success',
            NULL,
            jsonb_build_object(
                'schools_processed', v_processed_count,
                'schools_skipped', v_skipped_count,
                'total_bonuses_awarded', v_total_bonuses
            )
        );

        RAISE NOTICE 'Weekly best bonuses complete: % schools processed, % skipped, % bonuses awarded',
            v_processed_count, v_skipped_count, v_total_bonuses;

    EXCEPTION WHEN OTHERS THEN
        -- Complete job run with failure
        PERFORM complete_job_run(
            v_run_id,
            'failed',
            SQLERRM,
            jsonb_build_object(
                'schools_processed', v_processed_count,
                'schools_skipped', v_skipped_count,
                'total_bonuses_awarded', v_total_bonuses
            )
        );
        RAISE;
    END;
END;
$$;

COMMENT ON FUNCTION public.run_weekly_best_bonuses() IS
    'pg_cron job that awards weekly best game bonuses. Runs 2x/day, processes each school
     when it''s their rewards day (day after last_day) AND afternoon (hour >= 12) locally.';

-- Grant execute to service_role for manual triggers
GRANT EXECUTE ON FUNCTION public.run_weekly_best_bonuses() TO service_role;

-- ============================================================================
-- PART 2: Schedule pg_cron Job (00:00 and 12:00 UTC daily)
-- ============================================================================

DO $$
BEGIN
    -- Check if pg_cron extension is available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Remove existing job if any (ignore error if not exists)
        BEGIN
            PERFORM cron.unschedule('weekly-best-bonuses');
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        -- Schedule: twice daily at 00:00 and 12:00 UTC
        -- This ensures all timezones get processed in their afternoon
        PERFORM cron.schedule(
            'weekly-best-bonuses',
            '0 0,12 * * *',
            'SELECT public.run_weekly_best_bonuses()'
        );

        RAISE NOTICE 'pg_cron job weekly-best-bonuses scheduled for 00:00 and 12:00 UTC daily';
    ELSE
        RAISE NOTICE 'pg_cron extension not enabled - enable in Supabase Dashboard';
    END IF;
END;
$$;
