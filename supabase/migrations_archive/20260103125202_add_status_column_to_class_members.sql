-- Migration: Add status column to class_members table
-- Purpose: Enable tracking of membership history (active vs archived students)
-- Date: 2026-01-03
--
-- CONTEXT:
-- --------
-- Multiple migrations have "fixed" functions by removing `status = 'active'` checks
-- because the column didn't exist. This was the wrong fix - the column should exist.
--
-- This migration properly adds the column and updates all affected functions
-- to correctly filter by active membership.
--
-- BENEFITS:
-- ---------
-- 1. Historical tracking: Keep records when students leave a class
-- 2. Year-to-year history: Students can see their past classes
-- 3. Teacher insights: View former students
-- 4. Data integrity: Related data (gidouilles_history, warnings) stays connected

-- ============================================================================
-- PART 1: Add status column to class_members
-- ============================================================================

-- Add the status column with default 'active'
ALTER TABLE public.class_members
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Add CHECK constraint for valid values
ALTER TABLE public.class_members
DROP CONSTRAINT IF EXISTS class_members_status_check;

ALTER TABLE public.class_members
ADD CONSTRAINT class_members_status_check
CHECK (status IN ('active', 'archived'));

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_class_members_status
ON public.class_members(status);

-- Create composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_class_members_class_status
ON public.class_members(class_id, status);

CREATE INDEX IF NOT EXISTS idx_class_members_student_status
ON public.class_members(student_id, status);

COMMENT ON COLUMN public.class_members.status IS
  'Membership status: active = currently enrolled, archived = left the class (keeps history)';

-- ============================================================================
-- PART 2: Update get_student_teachers function
-- ============================================================================

-- Drop existing function to allow return type change
DROP FUNCTION IF EXISTS get_student_teachers(UUID);

CREATE OR REPLACE FUNCTION get_student_teachers(student_uuid UUID)
RETURNS TABLE(teacher_id UUID)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT c.teacher_id
  FROM class_members cm
  JOIN classes c ON c.id = cm.class_id
  WHERE cm.student_id = student_uuid
    AND cm.status = 'active'
    AND c.archived = FALSE;
END;
$$;

COMMENT ON FUNCTION get_student_teachers IS
  'Returns all teachers for a given student based on ACTIVE class membership';

-- ============================================================================
-- PART 3: Update get_teacher_students function
-- ============================================================================

-- Drop existing function to allow return type change
DROP FUNCTION IF EXISTS get_teacher_students(UUID);

CREATE OR REPLACE FUNCTION get_teacher_students(teacher_uuid UUID)
RETURNS TABLE(student_id UUID)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT cm.student_id
  FROM class_members cm
  JOIN classes c ON c.id = cm.class_id
  WHERE c.teacher_id = teacher_uuid
    AND cm.status = 'active'
    AND c.archived = FALSE;
END;
$$;

COMMENT ON FUNCTION get_teacher_students IS
  'Returns all ACTIVE students for a given teacher based on class membership';

-- ============================================================================
-- PART 4: Update get_students_in_class function
-- ============================================================================

-- Drop existing function to allow return type change
DROP FUNCTION IF EXISTS get_students_in_class(UUID);

CREATE OR REPLACE FUNCTION get_students_in_class(class_uuid UUID)
RETURNS TABLE(student_id UUID)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT cm.student_id
  FROM class_members cm
  JOIN classes c ON c.id = cm.class_id
  WHERE c.id = class_uuid
    AND cm.status = 'active'
    AND c.archived = FALSE;
END;
$$;

COMMENT ON FUNCTION get_students_in_class IS
  'Returns all ACTIVE students in a specific class';

-- ============================================================================
-- PART 5: Update update_student_gidouilles function
-- ============================================================================

DROP FUNCTION IF EXISTS public.update_student_gidouilles(UUID, UUID, INTEGER, TEXT, UUID);
DROP FUNCTION IF EXISTS public.update_student_gidouilles(UUID, UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.update_student_gidouilles(UUID, UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.update_student_gidouilles(
    p_student_id UUID,
    p_class_id UUID,
    p_delta INTEGER,
    p_reason TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_gidouilles INTEGER;
    v_caller_role TEXT;
BEGIN
    -- SECURITY CHECK: Get caller's role to enforce authorization
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = auth.uid();

    -- Authorization: Only admins, teachers of the student, or system (NULL caller) can update
    IF auth.uid() IS NOT NULL AND NOT (
        v_caller_role = 'admin'
        OR (v_caller_role = 'teacher' AND EXISTS (
            SELECT 1 FROM public.class_members cm
            JOIN public.classes c ON c.id = cm.class_id
            WHERE cm.student_id = p_student_id
            AND cm.class_id = p_class_id
            AND cm.status = 'active'
            AND c.teacher_id = auth.uid()
        ))
    ) THEN
        RAISE EXCEPTION 'Unauthorized: You do not have permission to update gidouilles for this student';
    END IF;

    -- VALIDATION: Validate delta bounds
    IF p_delta < -10000 OR p_delta > 10000 THEN
        RAISE EXCEPTION 'Invalid delta: must be between -10000 and 10000, got %', p_delta;
    END IF;

    -- VALIDATION: Require reason for large changes
    IF (ABS(p_delta) > 100) AND (p_reason IS NULL OR p_reason = '') THEN
        RAISE EXCEPTION 'Reason required for large point changes (|delta| = %)', ABS(p_delta);
    END IF;

    -- Verify that the student is an ACTIVE member of this class
    IF NOT EXISTS (
        SELECT 1 FROM public.class_members
        WHERE student_id = p_student_id
        AND class_id = p_class_id
        AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Student % is not an active member of class %', p_student_id, p_class_id;
    END IF;

    -- Update the gidouilles count
    UPDATE public.profiles
    SET gidouilles = GREATEST(0, COALESCE(gidouilles, 0) + p_delta)
    WHERE id = p_student_id
    RETURNING gidouilles INTO v_new_gidouilles;

    -- Log the change in history
    INSERT INTO public.gidouilles_history (
        student_id,
        class_id,
        delta,
        reason,
        created_by
    ) VALUES (
        p_student_id,
        p_class_id,
        p_delta,
        p_reason,
        COALESCE(p_created_by, auth.uid())
    );

    RETURN v_new_gidouilles;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_student_gidouilles(UUID, UUID, INTEGER, TEXT, UUID) TO authenticated;

COMMENT ON FUNCTION public.update_student_gidouilles(UUID, UUID, INTEGER, TEXT, UUID) IS
  'Updates gidouilles for a student. Only works for ACTIVE class members.';

-- ============================================================================
-- PART 6: Update update_class_gidouilles function
-- ============================================================================

CREATE OR REPLACE FUNCTION update_class_gidouilles(
  p_class_id UUID,
  p_delta INTEGER
)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_teacher_id UUID;
  v_is_teacher BOOLEAN;
  v_owns_class BOOLEAN;
  v_affected_rows INTEGER;
BEGIN
  v_teacher_id := auth.uid();
  v_is_teacher := is_teacher_or_admin();

  IF NOT v_is_teacher THEN
    RAISE EXCEPTION 'Unauthorized: Only teachers can update gidouilles';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM classes
    WHERE id = p_class_id
      AND teacher_id = v_teacher_id
  ) INTO v_owns_class;

  IF NOT v_owns_class THEN
    RAISE EXCEPTION 'Unauthorized: You are not the teacher of this class';
  END IF;

  -- Update all ACTIVE students in the class
  UPDATE profiles
  SET gidouilles = GREATEST(0, gidouilles + p_delta),
      updated_at = NOW()
  WHERE id IN (
    SELECT cm.student_id
    FROM class_members cm
    WHERE cm.class_id = p_class_id
      AND cm.status = 'active'
  );

  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  RETURN v_affected_rows;
END;
$$;

GRANT EXECUTE ON FUNCTION update_class_gidouilles(UUID, INTEGER) TO authenticated;

COMMENT ON FUNCTION update_class_gidouilles(UUID, INTEGER) IS
  'Updates gidouilles for all ACTIVE students in a class.';

-- ============================================================================
-- PART 7: Update update_student_bonus function
-- ============================================================================

DROP FUNCTION IF EXISTS public.update_student_bonus(UUID, UUID, INTEGER, TEXT, UUID);
DROP FUNCTION IF EXISTS public.update_student_bonus(UUID, UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.update_student_bonus(UUID, UUID, INTEGER);
DROP FUNCTION IF EXISTS public.update_student_bonus(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.update_student_bonus(
    p_student_id UUID,
    p_class_id UUID,
    p_delta INTEGER,
    p_reason TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_bonus INTEGER;
    v_caller_role TEXT;
BEGIN
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF auth.uid() IS NOT NULL AND NOT (
        v_caller_role = 'admin'
        OR (v_caller_role = 'teacher' AND EXISTS (
            SELECT 1 FROM public.class_members cm
            JOIN public.classes c ON c.id = cm.class_id
            WHERE cm.student_id = p_student_id
            AND cm.class_id = p_class_id
            AND cm.status = 'active'
            AND c.teacher_id = auth.uid()
        ))
    ) THEN
        RAISE EXCEPTION 'Unauthorized: You do not have permission to update bonus for this student';
    END IF;

    IF p_delta < -10000 OR p_delta > 10000 THEN
        RAISE EXCEPTION 'Invalid delta: must be between -10000 and 10000, got %', p_delta;
    END IF;

    IF (ABS(p_delta) > 100) AND (p_reason IS NULL OR p_reason = '') THEN
        RAISE EXCEPTION 'Reason required for large bonus changes (|delta| = %)', ABS(p_delta);
    END IF;

    -- Verify ACTIVE membership
    IF NOT EXISTS (
        SELECT 1 FROM public.class_members
        WHERE student_id = p_student_id
        AND class_id = p_class_id
        AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Student % is not an active member of class %', p_student_id, p_class_id;
    END IF;

    UPDATE public.profiles
    SET bonus = GREATEST(0, COALESCE(bonus, 0) + p_delta)
    WHERE id = p_student_id
    RETURNING bonus INTO v_new_bonus;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bonus_history') THEN
        INSERT INTO public.bonus_history (
            student_id,
            class_id,
            delta,
            reason,
            created_by
        ) VALUES (
            p_student_id,
            p_class_id,
            p_delta,
            p_reason,
            COALESCE(p_created_by, auth.uid())
        );
    END IF;

    RETURN v_new_bonus;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_student_bonus(UUID, UUID, INTEGER, TEXT, UUID) TO authenticated;

COMMENT ON FUNCTION public.update_student_bonus(UUID, UUID, INTEGER, TEXT, UUID) IS
  'Updates bonus for a student. Only works for ACTIVE class members.';

-- ============================================================================
-- PART 8: Update complete_minesweeper_game function
-- ============================================================================

DROP FUNCTION IF EXISTS public.complete_minesweeper_game(UUID, JSONB);

CREATE OR REPLACE FUNCTION public.complete_minesweeper_game(
  p_game_id UUID,
  p_grid_state JSONB
)
RETURNS TABLE(
  gidouilles_earned NUMERIC(10,2),
  achievements JSONB,
  points_earned INTEGER,
  breakdown JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_record RECORD;
  v_user_role TEXT;
  v_time_seconds INTEGER;
  v_gidouilles NUMERIC(10,2);
  v_points INTEGER;
  v_is_valid BOOLEAN;
  v_grid_size INTEGER;
  v_unlocked_achievements JSONB;
  v_hints_from_items INTEGER;

  v_student_grade TEXT;
  v_cycle TEXT;
  v_school_id UUID;

  v_base_reward NUMERIC(10,2);
  v_reference_time INTEGER;
  v_time_ratio NUMERIC;
  v_time_mult NUMERIC;
  v_hints_gidouilles INTEGER;
  v_hints_items INTEGER;
  v_hint_penalty NUMERIC;
  v_breakdown JSONB;

  v_theoretical_reward NUMERIC(10,2);
  v_actual_reward NUMERIC(10,2);
  v_is_first_win BOOLEAN;
  v_week_best_reward NUMERIC(10,2);
  v_daily_result RECORD;

  v_gidouilles_penalties NUMERIC[] := ARRAY[0.0, 0.10, 0.22, 0.35];
  v_item_penalties NUMERIC[] := ARRAY[0.0, 0.05, 0.11, 0.17];
BEGIN
  -- Step 1: Get game and verify ownership
  SELECT * INTO v_game_record
  FROM public.minesweeper_games
  WHERE id = p_game_id
    AND student_id = auth.uid()
    AND status = 'in_progress';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found, not owned by you, or already completed';
  END IF;

  -- Step 2: Get user role and grade
  SELECT role, grade INTO v_user_role, v_student_grade
  FROM public.profiles
  WHERE id = v_game_record.student_id;

  v_cycle := public.get_cycle_for_grade(v_student_grade);

  -- Get school_id for daily limit calculation (from ACTIVE membership)
  SELECT DISTINCT c.school_id INTO v_school_id
  FROM public.class_members cm
  JOIN public.classes c ON c.id = cm.class_id
  WHERE cm.student_id = v_game_record.student_id
    AND cm.status = 'active'
  LIMIT 1;

  -- Step 3: Validate grid_state represents a legitimate win
  v_is_valid := public.validate_minesweeper_win(p_grid_state, v_game_record.difficulty);

  IF NOT v_is_valid THEN
    RAISE EXCEPTION 'Invalid grid state: does not represent a valid win condition';
  END IF;

  -- Step 4: Validate grid_state size
  v_grid_size := pg_column_size(p_grid_state);
  IF v_grid_size > 100000 THEN
    RAISE EXCEPTION 'Grid state too large: exceeds 100KB';
  END IF;

  -- Step 5: Calculate time_seconds server-side
  IF v_game_record.started_at IS NOT NULL THEN
    v_time_seconds := GREATEST(1, EXTRACT(EPOCH FROM (NOW() - v_game_record.started_at))::INTEGER);
  ELSE
    v_time_seconds := 1;
  END IF;

  CASE v_game_record.difficulty
    WHEN 'beginner' THEN v_time_seconds := LEAST(v_time_seconds, 3600);
    WHEN 'intermediate' THEN v_time_seconds := LEAST(v_time_seconds, 7200);
    WHEN 'expert' THEN v_time_seconds := LEAST(v_time_seconds, 14400);
  END CASE;

  v_hints_from_items := COALESCE(v_game_record.hints_from_items, 0);

  -- Step 6a: Determine base reward
  CASE v_game_record.difficulty
    WHEN 'beginner' THEN v_base_reward := 1.0;
    WHEN 'intermediate' THEN v_base_reward := 3.0;
    WHEN 'expert' THEN v_base_reward := 6.0;
    ELSE v_base_reward := 0.0;
  END CASE;

  -- Step 6b: Get dynamic reference time
  IF v_cycle IS NOT NULL THEN
    BEGIN
      v_reference_time := public.get_minesweeper_reference_time(v_cycle, v_game_record.difficulty);
    EXCEPTION
      WHEN raise_exception THEN
        v_reference_time := CASE v_game_record.difficulty
          WHEN 'beginner' THEN 180
          WHEN 'intermediate' THEN 600
          WHEN 'expert' THEN 1200
        END;
    END;
  ELSE
    v_reference_time := CASE v_game_record.difficulty
      WHEN 'beginner' THEN 180
      WHEN 'intermediate' THEN 600
      WHEN 'expert' THEN 1200
    END;
  END IF;

  -- Step 6c: Calculate time multiplier
  v_time_ratio := v_time_seconds::NUMERIC / v_reference_time;
  v_time_mult := 1.3 - 0.5 * LEAST(1.0, v_time_ratio);
  v_time_mult := GREATEST(0.8, v_time_mult);
  v_time_mult := ROUND(v_time_mult, 2);

  -- Step 6d: Calculate hint penalty
  v_hints_items := COALESCE(v_hints_from_items, 0);
  v_hints_gidouilles := COALESCE(v_game_record.hints_used, 0) - v_hints_items;
  v_hints_gidouilles := GREATEST(0, v_hints_gidouilles);
  v_hints_items := GREATEST(0, v_hints_items);

  v_hint_penalty := 0.0;
  IF v_hints_gidouilles > 0 THEN
    v_hint_penalty := v_hint_penalty + v_gidouilles_penalties[LEAST(v_hints_gidouilles, 3) + 1];
  END IF;
  IF v_hints_items > 0 THEN
    v_hint_penalty := v_hint_penalty + v_item_penalties[LEAST(v_hints_items, 3) + 1];
  END IF;
  v_hint_penalty := LEAST(0.50, v_hint_penalty);
  v_hint_penalty := ROUND(v_hint_penalty, 2);

  -- Calculate theoretical reward
  IF v_user_role = 'student' AND v_cycle IS NOT NULL THEN
    v_theoretical_reward := v_base_reward * v_time_mult * (1.0 - v_hint_penalty);
    v_theoretical_reward := GREATEST(0.30, v_theoretical_reward);
    v_theoretical_reward := LEAST(8.00, v_theoretical_reward);
    v_theoretical_reward := ROUND(v_theoretical_reward, 2);
  ELSE
    v_theoretical_reward := 0.0;
  END IF;

  -- Call record_game_reward to get actual reward
  IF v_user_role = 'student' AND v_theoretical_reward > 0 AND v_school_id IS NOT NULL THEN
    SELECT * INTO v_daily_result
    FROM public.record_game_reward(
      v_game_record.student_id,
      'minesweeper',
      p_game_id,
      v_theoretical_reward,
      v_school_id
    );

    v_actual_reward := COALESCE(v_daily_result.actual_reward, 0);
    v_is_first_win := COALESCE(v_daily_result.is_first_win, FALSE);
    v_week_best_reward := COALESCE(v_daily_result.week_best_reward, v_theoretical_reward);
    v_gidouilles := v_actual_reward;
  ELSE
    v_actual_reward := 0;
    v_is_first_win := FALSE;
    v_week_best_reward := 0;
    v_gidouilles := 0;
  END IF;

  v_breakdown := jsonb_build_object(
    'cycle', v_cycle,
    'base_reward', v_base_reward,
    'reference_time', v_reference_time,
    'time_seconds', v_time_seconds,
    'time_mult', v_time_mult,
    'hints_used', COALESCE(v_game_record.hints_used, 0),
    'hints_from_items', v_hints_from_items,
    'hint_penalty', v_hint_penalty,
    'theoretical_reward', v_theoretical_reward,
    'actual_reward', v_actual_reward,
    'is_first_win_of_day', v_is_first_win,
    'week_best_reward', v_week_best_reward
  );

  -- Step 7: Calculate points
  v_points := public.calculate_minesweeper_points(
    v_game_record.difficulty,
    v_time_seconds,
    COALESCE(v_game_record.hints_used, 0),
    v_game_record.student_id
  );

  -- Step 8: Update game record
  UPDATE public.minesweeper_games
  SET
    status = 'won',
    completed_at = NOW(),
    time_seconds = v_time_seconds,
    gidouilles_awarded = v_actual_reward,
    points_earned = v_points,
    grid_state = p_grid_state
  WHERE id = p_game_id;

  -- Step 9: Check and unlock achievements
  v_unlocked_achievements := public.check_and_unlock_achievements(p_game_id);

  RETURN QUERY SELECT v_gidouilles, v_unlocked_achievements, v_points, v_breakdown;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_minesweeper_game TO authenticated;

COMMENT ON FUNCTION public.complete_minesweeper_game(UUID, JSONB) IS
  'Completes Minesweeper game. Uses ACTIVE class membership for school lookup.';

-- ============================================================================
-- PART 9: Update log_vip_cards_to_events trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_vip_cards_to_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_type public.reward_event_type;
    v_card_name TEXT;
    v_description TEXT;
    v_class_id UUID;
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.reward_events
        WHERE source_table = 'vip_cards_activity'
        AND source_id = NEW.id
    ) THEN
        RETURN NEW;
    END IF;

    CASE NEW.action
        WHEN 'gained' THEN v_event_type := 'earned';
        WHEN 'used' THEN v_event_type := 'used';
        WHEN 'removed' THEN v_event_type := 'removed';
        ELSE v_event_type := 'earned';
    END CASE;

    v_card_name := NEW.card_template_id;

    -- Get student's ACTIVE class for context
    SELECT class_id INTO v_class_id
    FROM public.class_members
    WHERE student_id = NEW.student_id
      AND status = 'active'
    ORDER BY joined_at DESC
    LIMIT 1;

    v_description := generate_reward_event_description(
        'vip_card'::public.reward_type,
        v_event_type,
        NULL,
        v_card_name,
        NEW.metadata
    );

    INSERT INTO public.reward_events (
        student_id,
        reward_type,
        event_type,
        item_name,
        description,
        metadata,
        source_table,
        source_id,
        class_id,
        created_by,
        created_at
    ) VALUES (
        NEW.student_id,
        'vip_card',
        v_event_type,
        v_card_name,
        v_description,
        COALESCE(NEW.metadata, '{}') || jsonb_build_object(
            'card_instance_id', NEW.card_instance_id,
            'card_template_id', NEW.card_template_id,
            'action', NEW.action
        ),
        'vip_cards_activity',
        NEW.id,
        v_class_id,
        NULLIF(NEW.metadata->>'removed_by', '')::UUID,
        NEW.created_at
    );

    RETURN NEW;
END;
$$;

-- ============================================================================
-- PART 10: Update log_achievements_to_events trigger (if exists)
-- ============================================================================

-- Check if function exists and update it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_achievements_to_events') THEN
    EXECUTE $func$
    CREATE OR REPLACE FUNCTION public.log_achievements_to_events()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $body$
    DECLARE
        v_achievement_name TEXT;
        v_description TEXT;
        v_class_id UUID;
    BEGIN
        IF EXISTS (
            SELECT 1 FROM public.reward_events
            WHERE source_table = 'student_achievements'
            AND source_id = NEW.id
        ) THEN
            RETURN NEW;
        END IF;

        SELECT name INTO v_achievement_name
        FROM public.achievements
        WHERE id = NEW.achievement_id;

        -- Get student's ACTIVE class
        SELECT class_id INTO v_class_id
        FROM public.class_members
        WHERE student_id = NEW.student_id
          AND status = 'active'
        ORDER BY joined_at DESC
        LIMIT 1;

        v_description := generate_reward_event_description(
            'achievement'::public.reward_type,
            'earned'::public.reward_event_type,
            NULL,
            v_achievement_name,
            NEW.metadata
        );

        INSERT INTO public.reward_events (
            student_id,
            reward_type,
            event_type,
            item_name,
            description,
            metadata,
            source_table,
            source_id,
            class_id,
            created_at
        ) VALUES (
            NEW.student_id,
            'achievement',
            'earned',
            v_achievement_name,
            v_description,
            COALESCE(NEW.metadata, '{}') || jsonb_build_object(
                'achievement_id', NEW.achievement_id
            ),
            'student_achievements',
            NEW.id,
            v_class_id,
            NEW.unlocked_at
        );

        RETURN NEW;
    END;
    $body$;
    $func$;
  END IF;
END;
$$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration completed: Added status column to class_members';
    RAISE NOTICE '- Column: status (TEXT, NOT NULL, DEFAULT ''active'')';
    RAISE NOTICE '- Values: active, archived';
    RAISE NOTICE '- Indexes: idx_class_members_status, idx_class_members_class_status, idx_class_members_student_status';
    RAISE NOTICE '- Updated functions: get_student_teachers, get_teacher_students, get_students_in_class';
    RAISE NOTICE '- Updated functions: update_student_gidouilles, update_class_gidouilles, update_student_bonus';
    RAISE NOTICE '- Updated functions: complete_minesweeper_game, log_vip_cards_to_events, log_achievements_to_events';
END $$;
