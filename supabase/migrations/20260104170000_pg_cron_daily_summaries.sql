-- ============================================================================
-- Migration: pg_cron job for Daily Summaries
-- Purpose: Generates daily activity summaries for students
-- Date: 2026-01-04
-- ============================================================================
--
-- This job runs every hour and for each school:
-- 1. Checks if current hour in school's timezone = 18:00 (end of school day)
-- 2. If yes, processes all classes that had lessons yesterday
-- 3. Aggregates activity from 5 tables (optimized: 5 queries per class, not per student)
-- 4. Inserts into daily_summaries table
-- 5. Creates notifications with raw metadata (client formats at display)
--
-- Schedule: 0 * * * * (every hour at :00)
-- ============================================================================

-- ============================================================================
-- PART 0: Add metadata column to notifications table
-- ============================================================================

DO $$
BEGIN
    -- Add metadata column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'notifications'
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE public.notifications
        ADD COLUMN metadata JSONB DEFAULT NULL;

        COMMENT ON COLUMN public.notifications.metadata IS
            'Optional JSON metadata for notifications. Used by system notifications
             (e.g., daily_summary) to store raw data that clients format at display time.';
    END IF;
END;
$$;

-- ============================================================================
-- PART 1: Create Main Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.run_daily_summaries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_run_id UUID;
    v_school RECORD;
    v_class RECORD;
    v_summary RECORD;
    v_current_hour INTEGER;
    v_yesterday DATE;
    v_day_of_week INTEGER;
    v_day_start TIMESTAMPTZ;
    v_day_end TIMESTAMPTZ;
    v_has_schedule BOOLEAN;
    v_processed_schools INTEGER := 0;
    v_skipped_schools INTEGER := 0;
    v_processed_classes INTEGER := 0;
    v_total_summaries INTEGER := 0;
    v_class_summaries INTEGER;
BEGIN
    -- Start job run tracking
    v_run_id := start_job_run('daily_summaries', '{}'::jsonb);

    BEGIN
        -- Process each school with distinct timezone
        FOR v_school IN
            SELECT DISTINCT ON (s.id)
                s.id,
                s.name,
                s.timezone
            FROM schools s
            WHERE s.timezone IS NOT NULL
        LOOP
            -- Get current hour in school's timezone
            v_current_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE v_school.timezone)::INTEGER;

            -- Only process if it's 18:00 local time
            IF v_current_hour != 18 THEN
                v_skipped_schools := v_skipped_schools + 1;
                CONTINUE;
            END IF;

            v_processed_schools := v_processed_schools + 1;

            -- Calculate yesterday in school's timezone
            v_yesterday := ((NOW() AT TIME ZONE v_school.timezone) - INTERVAL '1 day')::DATE;
            v_day_of_week := EXTRACT(DOW FROM v_yesterday)::INTEGER;

            -- Calculate day boundaries for yesterday (timezone-aware)
            v_day_start := (v_yesterday::TIMESTAMP AT TIME ZONE v_school.timezone);
            v_day_end := ((v_yesterday + 1)::TIMESTAMP AT TIME ZONE v_school.timezone) - INTERVAL '1 microsecond';

            -- Process each active class in this school
            FOR v_class IN
                SELECT c.id, c.name
                FROM classes c
                WHERE c.school_id = v_school.id
                  AND c.is_active = true
            LOOP
                -- Check if class had a scheduled lesson yesterday
                SELECT EXISTS (
                    SELECT 1 FROM class_schedules cs
                    WHERE cs.class_id = v_class.id
                      AND cs.day_of_week = v_day_of_week
                ) INTO v_has_schedule;

                IF NOT v_has_schedule THEN
                    CONTINUE;
                END IF;

                v_class_summaries := 0;

                -- ============================================================
                -- OPTIMIZED AGGREGATION: 5 queries per class (not per student)
                -- ============================================================
                FOR v_summary IN
                    WITH students AS (
                        SELECT cm.student_id
                        FROM class_members cm
                        WHERE cm.class_id = v_class.id
                          AND cm.status = 'active'
                          AND cm.is_test = false
                    ),
                    gidouilles_agg AS (
                        SELECT
                            ga.student_id,
                            COALESCE(SUM(CASE WHEN ga.delta > 0 THEN ga.delta ELSE 0 END), 0)::INTEGER as gained,
                            COALESCE(SUM(CASE WHEN ga.delta < 0 THEN ABS(ga.delta) ELSE 0 END), 0)::INTEGER as lost
                        FROM gidouilles_activity ga
                        WHERE ga.class_id = v_class.id
                          AND ga.created_at >= v_day_start
                          AND ga.created_at <= v_day_end
                        GROUP BY ga.student_id
                    ),
                    bonus_agg AS (
                        SELECT
                            bh.student_id,
                            COALESCE(SUM(CASE WHEN bh.delta > 0 THEN bh.delta ELSE 0 END), 0)::INTEGER as gained,
                            COALESCE(SUM(CASE WHEN bh.delta < 0 THEN ABS(bh.delta) ELSE 0 END), 0)::INTEGER as lost
                        FROM bonus_history bh
                        WHERE bh.class_id = v_class.id
                          AND bh.created_at >= v_day_start
                          AND bh.created_at <= v_day_end
                        GROUP BY bh.student_id
                    ),
                    vip_agg AS (
                        SELECT
                            vca.student_id,
                            COUNT(*) FILTER (WHERE vca.action = 'gained')::INTEGER as gained,
                            COUNT(*) FILTER (WHERE vca.action = 'used')::INTEGER as used
                        FROM vip_cards_activity vca
                        WHERE vca.created_at >= v_day_start
                          AND vca.created_at <= v_day_end
                        GROUP BY vca.student_id
                    ),
                    warnings_issued_agg AS (
                        SELECT
                            sw.student_id,
                            COUNT(*)::INTEGER as issued
                        FROM student_warnings sw
                        WHERE sw.class_id = v_class.id
                          AND sw.created_at >= v_day_start
                          AND sw.created_at <= v_day_end
                        GROUP BY sw.student_id
                    ),
                    warnings_removed_agg AS (
                        SELECT
                            sw.student_id,
                            COUNT(*)::INTEGER as removed
                        FROM student_warnings sw
                        WHERE sw.class_id = v_class.id
                          AND sw.deleted_at IS NOT NULL
                          AND sw.created_at < v_day_start
                          AND sw.deleted_at >= v_day_start
                          AND sw.deleted_at <= v_day_end
                        GROUP BY sw.student_id
                    )
                    SELECT
                        s.student_id,
                        COALESCE(g.gained, 0) as gidouilles_gained,
                        COALESCE(g.lost, 0) as gidouilles_lost,
                        COALESCE(b.gained, 0) as bonus_gained,
                        COALESCE(b.lost, 0) as bonus_used,
                        COALESCE(v.gained, 0) as vip_cards_gained,
                        COALESCE(v.used, 0) as vip_cards_used,
                        COALESCE(wi.issued, 0) as warnings_issued,
                        COALESCE(wr.removed, 0) as warnings_removed
                    FROM students s
                    LEFT JOIN gidouilles_agg g ON g.student_id = s.student_id
                    LEFT JOIN bonus_agg b ON b.student_id = s.student_id
                    LEFT JOIN vip_agg v ON v.student_id = s.student_id
                    LEFT JOIN warnings_issued_agg wi ON wi.student_id = s.student_id
                    LEFT JOIN warnings_removed_agg wr ON wr.student_id = s.student_id
                    -- Only include students with at least one change
                    WHERE COALESCE(g.gained, 0) > 0
                       OR COALESCE(g.lost, 0) > 0
                       OR COALESCE(b.gained, 0) > 0
                       OR COALESCE(b.lost, 0) > 0
                       OR COALESCE(v.gained, 0) > 0
                       OR COALESCE(v.used, 0) > 0
                       OR COALESCE(wi.issued, 0) > 0
                       OR COALESCE(wr.removed, 0) > 0
                LOOP
                    -- Insert into daily_summaries
                    INSERT INTO daily_summaries (
                        student_id,
                        class_id,
                        summary_date,
                        gidouilles_gained,
                        gidouilles_lost,
                        bonus_gained,
                        bonus_used,
                        warnings_issued,
                        warnings_removed,
                        vip_cards_gained,
                        vip_cards_used
                    ) VALUES (
                        v_summary.student_id,
                        v_class.id,
                        v_yesterday,
                        v_summary.gidouilles_gained,
                        v_summary.gidouilles_lost,
                        v_summary.bonus_gained,
                        v_summary.bonus_used,
                        v_summary.warnings_issued,
                        v_summary.warnings_removed,
                        v_summary.vip_cards_gained,
                        v_summary.vip_cards_used
                    );

                    -- Create notification with raw metadata (client formats at display)
                    INSERT INTO notifications (
                        title,
                        message,
                        type,
                        is_system,
                        system_event_type,
                        target_type,
                        target_user_ids,
                        metadata
                    ) VALUES (
                        '📊 Bilan quotidien',
                        NULL,  -- Client will format from metadata
                        'info',
                        true,
                        'daily_summary',
                        'users',
                        ARRAY[v_summary.student_id],
                        jsonb_build_object(
                            'class_name', v_class.name,
                            'summary_date', v_yesterday,
                            'gidouilles_gained', v_summary.gidouilles_gained,
                            'gidouilles_lost', v_summary.gidouilles_lost,
                            'bonus_gained', v_summary.bonus_gained,
                            'bonus_used', v_summary.bonus_used,
                            'warnings_issued', v_summary.warnings_issued,
                            'warnings_removed', v_summary.warnings_removed,
                            'vip_cards_gained', v_summary.vip_cards_gained,
                            'vip_cards_used', v_summary.vip_cards_used
                        )
                    );

                    v_class_summaries := v_class_summaries + 1;
                END LOOP;

                IF v_class_summaries > 0 THEN
                    v_processed_classes := v_processed_classes + 1;
                    v_total_summaries := v_total_summaries + v_class_summaries;
                    RAISE NOTICE 'Class %: generated % summaries', v_class.name, v_class_summaries;
                END IF;
            END LOOP;
        END LOOP;

        -- Complete job run with success
        PERFORM complete_job_run(
            v_run_id,
            'success',
            NULL,
            jsonb_build_object(
                'schools_processed', v_processed_schools,
                'schools_skipped', v_skipped_schools,
                'classes_processed', v_processed_classes,
                'total_summaries', v_total_summaries
            )
        );

        RAISE NOTICE 'Daily summaries complete: % schools processed, % skipped, % classes, % summaries',
            v_processed_schools, v_skipped_schools, v_processed_classes, v_total_summaries;

    EXCEPTION WHEN OTHERS THEN
        -- Complete job run with failure
        PERFORM complete_job_run(
            v_run_id,
            'failed',
            SQLERRM,
            jsonb_build_object(
                'schools_processed', v_processed_schools,
                'schools_skipped', v_skipped_schools,
                'classes_processed', v_processed_classes,
                'total_summaries', v_total_summaries
            )
        );
        RAISE;
    END;
END;
$$;

COMMENT ON FUNCTION public.run_daily_summaries() IS
    'pg_cron job that generates daily activity summaries for students.
     Runs every hour, processes each school when it''s 18:00 local time.
     Aggregates data from gidouilles_activity, bonus_history, vip_cards_activity,
     and student_warnings. Creates notifications with raw metadata for client-side formatting.';

-- Grant execute to service_role for manual triggers
GRANT EXECUTE ON FUNCTION public.run_daily_summaries() TO service_role;

-- ============================================================================
-- PART 2: Schedule pg_cron Job (every hour at :00)
-- ============================================================================

DO $$
BEGIN
    -- Check if pg_cron extension is available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Remove existing job if any (ignore error if not exists)
        BEGIN
            PERFORM cron.unschedule('daily-summaries');
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        -- Schedule: every hour at :00
        PERFORM cron.schedule(
            'daily-summaries',
            '0 * * * *',
            'SELECT public.run_daily_summaries()'
        );

        RAISE NOTICE 'pg_cron job daily-summaries scheduled for every hour at :00';
    ELSE
        RAISE NOTICE 'pg_cron extension not enabled - enable in Supabase Dashboard';
    END IF;
END;
$$;
