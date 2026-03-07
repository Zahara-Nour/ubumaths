-- ============================================================================
-- Migration: Fix weekly best bonuses - use current week instead of previous
-- ============================================================================
-- Date: 2026-03-08
--
-- BUG: run_weekly_best_bonuses() was awarding bonuses for the PREVIOUS week
-- instead of the CURRENT week. The rewards_day (6th day of school week) falls
-- near the END of the current week, so we should distribute the current week's
-- bonuses, not the previous week's.
--
-- Example with first_day=0 (Sunday), rewards_day=5 (Friday):
--   - Week is Sun Mar 1 - Sat Mar 7
--   - Rewards day = Friday Mar 6
--   - OLD: awarded week Feb 22-28 (previous week) ← WRONG
--   - NEW: awarded week Mar 1-7 (current week) ← CORRECT
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
    v_current_week_end DATE;
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

            -- Calculate rewards day (6th day of week = first day of weekend)
            v_rewards_day := (v_first_day + 5) % 7;

            -- Get current day and hour in school's timezone
            v_current_day := EXTRACT(DOW FROM NOW() AT TIME ZONE v_school.timezone)::INTEGER;
            v_current_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE v_school.timezone)::INTEGER;

            -- Check if it's rewards day AND afternoon
            IF v_current_day = v_rewards_day AND v_current_hour >= 12 THEN
                -- Calculate today's date in school's timezone
                v_today := (NOW() AT TIME ZONE v_school.timezone)::DATE;

                -- Calculate days since current week started
                v_days_to_week_start := (v_current_day - v_first_day + 7) % 7;

                -- Current week boundaries
                v_current_week_start := v_today - v_days_to_week_start;
                v_current_week_end := v_current_week_start + 6;

                -- FIX: Award bonuses for the CURRENT week (not previous)
                -- The rewards_day is near the end of the school week,
                -- so the current week is the one we want to award.
                SELECT award_weekly_best_bonuses(v_current_week_start, v_current_week_end)
                INTO v_school_bonuses;

                v_total_bonuses := v_total_bonuses + COALESCE(v_school_bonuses, 0);
                v_processed_count := v_processed_count + 1;

                RAISE NOTICE 'School %: awarded % bonuses for week % to %',
                    v_school.name, v_school_bonuses, v_current_week_start, v_current_week_end;
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
     when it''s their rewards day (6th day = first_day + 5) AND afternoon (hour >= 12) locally.
     Awards bonuses for the current week (rewards day falls near end of school week).';
