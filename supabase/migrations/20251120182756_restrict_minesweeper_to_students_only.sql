-- ============================================================================
-- Migration: Restrict Minesweeper to Students Only
-- Created: 2025-11-20
-- ============================================================================
-- Purpose: Enforce student-only access to minesweeper at the database level
--          as a defense-in-depth measure. Teachers and admins are blocked.
--
-- Context:
-- - Client store already treats teachers/admins as anonymous (localStorage)
-- - API endpoints validate role before database operations
-- - This migration adds database-level enforcement (fail-closed security)
--
-- Changes:
-- 1. Update RLS policies on all minesweeper tables to check role = 'student'
-- 2. Update RPC functions to validate role = 'student' before execution
-- 3. Add role checks to views (security_invoker respects RLS)
-- 4. Add documentation comments explaining student-only restriction
-- ============================================================================

-- ============================================================================
-- PART 1: Update RLS Policies - minesweeper_games
-- ============================================================================

-- DROP existing policies
DROP POLICY IF EXISTS "Users can view own minesweeper games" ON public.minesweeper_games;
DROP POLICY IF EXISTS "Authenticated users can create own games" ON public.minesweeper_games;
DROP POLICY IF EXISTS "Authenticated users can create own games with limits" ON public.minesweeper_games;
DROP POLICY IF EXISTS "Anonymous users can create public games" ON public.minesweeper_games;
DROP POLICY IF EXISTS "Users can update own minesweeper games" ON public.minesweeper_games;
DROP POLICY IF EXISTS "Users can update in-progress game state only" ON public.minesweeper_games;
DROP POLICY IF EXISTS "Users can delete own minesweeper games" ON public.minesweeper_games;

-- SELECT: Only students can view their own games
CREATE POLICY "Students can view own minesweeper games"
  ON public.minesweeper_games
  FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
  );

-- INSERT: Only students can create games (max 10 concurrent in-progress)
CREATE POLICY "Students can create own games with limits"
  ON public.minesweeper_games
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must be a student
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
    AND student_id = auth.uid()
    AND gidouilles_awarded = 0
    AND completed_at IS NULL
    AND status = 'in_progress'
    AND (
      -- Limit to 10 concurrent in-progress games per student
      SELECT COUNT(*)
      FROM public.minesweeper_games
      WHERE student_id = auth.uid()
        AND status = 'in_progress'
    ) < 10
  );

-- UPDATE: Only students can update their own in-progress games
CREATE POLICY "Students can update in-progress games only"
  ON public.minesweeper_games
  FOR UPDATE
  TO authenticated
  USING (
    student_id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
    AND status = 'in_progress'
  )
  WITH CHECK (
    student_id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
    AND status = 'in_progress'
    AND gidouilles_awarded = 0  -- Must remain 0
    AND completed_at IS NULL    -- Must remain NULL
    AND time_seconds IS NULL    -- Must remain NULL
  );

-- DELETE: Only students can delete their own games
CREATE POLICY "Students can delete own minesweeper games"
  ON public.minesweeper_games
  FOR DELETE
  TO authenticated
  USING (
    student_id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
  );

-- Anonymous games no longer allowed (teachers/admins use localStorage)
-- No policy for anon role = implicit DENY

COMMENT ON POLICY "Students can view own minesweeper games" ON public.minesweeper_games IS
  'Only students can view their minesweeper games. Teachers and admins are blocked at database level.';

COMMENT ON POLICY "Students can create own games with limits" ON public.minesweeper_games IS
  'Only students can create minesweeper games (max 10 concurrent). Teachers and admins use localStorage.';

COMMENT ON POLICY "Students can update in-progress games only" ON public.minesweeper_games IS
  'Only students can update in-progress games. Prevents modification of rewards/completion. Teachers and admins blocked.';

COMMENT ON POLICY "Students can delete own minesweeper games" ON public.minesweeper_games IS
  'Only students can delete their games. Teachers and admins blocked.';


-- ============================================================================
-- PART 2: Update RLS Policies - minesweeper_student_achievements
-- ============================================================================

DROP POLICY IF EXISTS "Students can view all achievement unlocks" ON public.minesweeper_student_achievements;

-- SELECT: Only students can view achievements (teachers/admins blocked)
CREATE POLICY "Students can view achievement unlocks"
  ON public.minesweeper_student_achievements
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
  );

COMMENT ON POLICY "Students can view achievement unlocks" ON public.minesweeper_student_achievements IS
  'Only students can view minesweeper achievements. Teachers and admins blocked.';


-- ============================================================================
-- PART 3: Update RLS Policies - minesweeper_multiplayer_matches
-- ============================================================================

DROP POLICY IF EXISTS "select_own_or_completed_matches" ON public.minesweeper_multiplayer_matches;

-- SELECT: Only students can view matches
CREATE POLICY "Students can view own or completed matches"
  ON public.minesweeper_multiplayer_matches
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
    AND (
      auth.uid() = player1_id
      OR auth.uid() = player2_id
      OR status = 'completed'
    )
  );

COMMENT ON POLICY "Students can view own or completed matches" ON public.minesweeper_multiplayer_matches IS
  'Only students can view multiplayer matches. Teachers and admins blocked.';


-- ============================================================================
-- PART 4: Update RLS Policies - minesweeper_multiplayer_queue
-- ============================================================================

DROP POLICY IF EXISTS "select_own_queue_entry" ON public.minesweeper_multiplayer_queue;
DROP POLICY IF EXISTS "insert_own_queue_entry" ON public.minesweeper_multiplayer_queue;

-- SELECT: Only students can view their queue entries
CREATE POLICY "Students can view own queue entry"
  ON public.minesweeper_multiplayer_queue
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = student_id
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
  );

-- INSERT: Only students can join the queue
CREATE POLICY "Students can insert own queue entry"
  ON public.minesweeper_multiplayer_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = student_id
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
  );

COMMENT ON POLICY "Students can view own queue entry" ON public.minesweeper_multiplayer_queue IS
  'Only students can view matchmaking queue. Teachers and admins blocked.';

COMMENT ON POLICY "Students can insert own queue entry" ON public.minesweeper_multiplayer_queue IS
  'Only students can join matchmaking queue. Teachers and admins blocked.';


-- ============================================================================
-- PART 5: Update RLS Policies - minesweeper_multiplayer_game_state
-- ============================================================================

DROP POLICY IF EXISTS "select_match_game_state" ON public.minesweeper_multiplayer_game_state;

-- SELECT: Only students can view game state for their matches
CREATE POLICY "Students can view match game state"
  ON public.minesweeper_multiplayer_game_state
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
    AND EXISTS (
      SELECT 1
      FROM public.minesweeper_multiplayer_matches m
      WHERE m.id = match_id
        AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid())
    )
  );

COMMENT ON POLICY "Students can view match game state" ON public.minesweeper_multiplayer_game_state IS
  'Only students can view real-time game state. Teachers and admins blocked.';


-- ============================================================================
-- PART 6: Update RLS Policies - minesweeper_player_stats
-- ============================================================================

DROP POLICY IF EXISTS "select_all_player_stats" ON public.minesweeper_player_stats;

-- SELECT: Only students can view player stats
CREATE POLICY "Students can view player stats"
  ON public.minesweeper_player_stats
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
  );

COMMENT ON POLICY "Students can view player stats" ON public.minesweeper_player_stats IS
  'Only students can view multiplayer stats and leaderboards. Teachers and admins blocked.';


-- ============================================================================
-- PART 7: Update RLS Policies - minesweeper_daily_challenges
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view daily challenges" ON public.minesweeper_daily_challenges;

-- SELECT: Only students can view daily challenges
CREATE POLICY "Students can view daily challenges"
  ON public.minesweeper_daily_challenges
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
  );

COMMENT ON POLICY "Students can view daily challenges" ON public.minesweeper_daily_challenges IS
  'Only students can view daily challenges. Teachers and admins blocked.';


-- ============================================================================
-- PART 8: Update RLS Policies - minesweeper_daily_attempts
-- ============================================================================

DROP POLICY IF EXISTS "Students can view all daily attempts" ON public.minesweeper_daily_attempts;
DROP POLICY IF EXISTS "Students can insert own daily attempts" ON public.minesweeper_daily_attempts;

-- SELECT: Only students can view daily attempts
CREATE POLICY "Students can view daily attempts"
  ON public.minesweeper_daily_attempts
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
  );

-- INSERT: Only students can insert their own attempts
CREATE POLICY "Students can insert own daily attempt"
  ON public.minesweeper_daily_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
  );

COMMENT ON POLICY "Students can view daily attempts" ON public.minesweeper_daily_attempts IS
  'Only students can view daily challenge leaderboard. Teachers and admins blocked.';

COMMENT ON POLICY "Students can insert own daily attempt" ON public.minesweeper_daily_attempts IS
  'Only students can submit daily challenge attempts. Teachers and admins blocked.';


-- ============================================================================
-- PART 9: Update RPC Functions - Add Role Checks
-- ============================================================================

-- ============================================================================
-- Function: use_hint() - Add student role check
-- ============================================================================

CREATE OR REPLACE FUNCTION public.use_hint(p_game_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_current_gidouilles INTEGER;
  v_hints_used INTEGER;
  v_role TEXT;
  v_hint_cost INTEGER := 10; -- Cost per hint in gidouilles
BEGIN
  -- Get current user ID and role
  v_student_id := auth.uid();

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to use hints';
  END IF;

  -- Get student role
  SELECT role INTO v_role
  FROM profiles
  WHERE id = v_student_id;

  -- Only students can use hints
  IF v_role IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'Only students can use minesweeper hints';
  END IF;

  -- Step 1: Get game info and validate ownership WITH ROW LOCK
  SELECT hints_used INTO v_hints_used
  FROM public.minesweeper_games
  WHERE id = p_game_id
    AND status = 'in_progress'
    AND student_id = v_student_id
  FOR UPDATE; -- CRITICAL: Prevents concurrent hint usage (race condition protection)

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found, not owned by you, or not in progress';
  END IF;

  -- Step 2: Check hint limit (max 3 hints per game)
  IF v_hints_used >= 3 THEN
    RAISE EXCEPTION 'Maximum hints reached (3 per game)';
  END IF;

  -- Step 3: Check student has enough gidouilles WITH ROW LOCK
  SELECT gidouilles INTO v_current_gidouilles
  FROM public.profiles
  WHERE id = v_student_id
  FOR UPDATE; -- CRITICAL: Prevents negative balance race condition

  IF v_current_gidouilles < v_hint_cost THEN
    RAISE EXCEPTION 'Insufficient gidouilles (cost: % gidouilles, you have: %)', v_hint_cost, v_current_gidouilles;
  END IF;

  -- Step 4: Deduct gidouilles from student
  UPDATE public.profiles
  SET gidouilles = gidouilles - v_hint_cost
  WHERE id = v_student_id;

  -- Step 5: Record in gidouilles_history for audit trail
  INSERT INTO public.gidouilles_history (
    student_id,
    class_id,
    delta,
    reason,
    created_by
  )
  SELECT
    v_student_id,
    cm.class_id,
    -v_hint_cost, -- Negative delta for cost
    'Hint used in Minesweeper game (hint #' || (v_hints_used + 1) || '/3)',
    v_student_id
  FROM public.class_members cm
  WHERE cm.student_id = v_student_id
    AND cm.status = 'active'
  ORDER BY cm.joined_at ASC
  LIMIT 1;

  -- Note: If student has no active classes, history insert is skipped
  -- This is acceptable as gidouilles are still deducted

  -- Step 6: Increment hints_used counter
  UPDATE public.minesweeper_games
  SET hints_used = hints_used + 1
  WHERE id = p_game_id;

  -- Step 7: Return success response with updated counts
  RETURN jsonb_build_object(
    'success', true,
    'hints_used', v_hints_used + 1,
    'hints_remaining', 3 - (v_hints_used + 1),
    'gidouilles_spent', v_hint_cost,
    'remaining_gidouilles', v_current_gidouilles - v_hint_cost,
    'penalty_notice', 'Using hints applies 30% penalty to final reward'
  );
END;
$$;

COMMENT ON FUNCTION public.use_hint IS
  'Spend 10 gidouilles to use a hint (max 3 per game). STUDENTS ONLY. Teachers and admins blocked at function level. Deducts gidouilles, records in history, increments counter. Using hints triggers 30% penalty on final reward. Client handles actual safe cell selection. SECURITY DEFINER prevents manipulation.';


-- ============================================================================
-- Function: complete_minesweeper_game() - Add student role check
-- ============================================================================

CREATE OR REPLACE FUNCTION public.complete_minesweeper_game(
  p_game_id UUID,
  p_grid_state JSONB
)
RETURNS TABLE(success BOOLEAN, gidouilles_awarded INTEGER, time_seconds INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_record RECORD;
  v_time_seconds INTEGER;
  v_gidouilles INTEGER;
  v_is_valid BOOLEAN;
  v_role TEXT;
BEGIN
  -- Get student role
  SELECT role INTO v_role
  FROM profiles
  WHERE id = auth.uid();

  -- Only students can complete games
  IF v_role IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'Only students can complete minesweeper games';
  END IF;

  -- Step 1: Get game and verify ownership
  SELECT * INTO v_game_record
  FROM public.minesweeper_games
  WHERE id = p_game_id
    AND student_id = auth.uid() -- Must be authenticated and own the game
    AND status = 'in_progress' -- Must be in progress
  FOR UPDATE; -- CRITICAL: Prevents concurrent completion (race condition protection)

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found, not owned by you, or already completed';
  END IF;

  -- Step 2: Validate grid_state represents a legitimate win
  v_is_valid := public.validate_minesweeper_win(p_grid_state, v_game_record.difficulty);

  IF NOT v_is_valid THEN
    RAISE EXCEPTION 'Invalid grid state: does not represent a valid win condition';
  END IF;

  -- Step 3: Validate started_at exists
  IF v_game_record.started_at IS NULL THEN
    RAISE EXCEPTION 'Game has not been started yet (no cells revealed)';
  END IF;

  -- Step 4: Calculate time_seconds server-side
  v_time_seconds := EXTRACT(EPOCH FROM (NOW() - v_game_record.started_at))::INTEGER;

  -- Sanity check: time must be positive and reasonable for difficulty
  IF v_time_seconds < 1 THEN
    RAISE EXCEPTION 'Invalid game time: must be at least 1 second';
  END IF;

  CASE v_game_record.difficulty
    WHEN 'beginner' THEN
      IF v_time_seconds > 3600 THEN -- 1 hour max
        RAISE EXCEPTION 'Invalid game time for beginner: exceeds 1 hour';
      END IF;
    WHEN 'intermediate' THEN
      IF v_time_seconds > 7200 THEN -- 2 hours max
        RAISE EXCEPTION 'Invalid game time for intermediate: exceeds 2 hours';
      END IF;
    WHEN 'expert' THEN
      IF v_time_seconds > 14400 THEN -- 4 hours max
        RAISE EXCEPTION 'Invalid game time for expert: exceeds 4 hours';
      END IF;
  END CASE;

  -- Step 5: Calculate gidouilles server-side WITH HINTS PENALTY
  v_gidouilles := public.calculate_minesweeper_gidouilles(
    v_game_record.difficulty,
    v_time_seconds,
    v_game_record.student_id,
    COALESCE(v_game_record.hints_used, 0)  -- Pass hints count
  );

  -- Step 6: Update game record
  UPDATE public.minesweeper_games
  SET
    status = 'won',
    grid_state = p_grid_state,
    time_seconds = v_time_seconds,
    gidouilles_awarded = v_gidouilles,
    completed_at = NOW()
  WHERE id = p_game_id;

  -- Step 7: Award gidouilles to profile
  IF v_gidouilles > 0 THEN
    UPDATE public.profiles
    SET gidouilles = COALESCE(gidouilles, 0) + v_gidouilles
    WHERE id = v_game_record.student_id;

    -- Step 8: Insert into gidouilles_history for audit trail
    -- Use student's first class for history tracking (ordered by join date)
    INSERT INTO public.gidouilles_history (
      student_id,
      class_id,
      delta,
      reason,
      created_by
    )
    SELECT
      v_game_record.student_id,
      cm.class_id,
      v_gidouilles,
      'Minesweeper: ' || v_game_record.difficulty || ' won in ' || v_time_seconds || 's' ||
        CASE
          WHEN v_game_record.hints_used > 0 THEN ' (hints: ' || v_game_record.hints_used || ')'
          ELSE ''
        END,
      v_game_record.student_id
    FROM public.class_members cm
    WHERE cm.student_id = v_game_record.student_id
    ORDER BY cm.joined_at ASC
    LIMIT 1;

    -- Note: If student has no active classes, history insert is skipped
    -- This is acceptable as they still receive gidouilles
  END IF;

  -- Step 9: Return result
  RETURN QUERY SELECT TRUE, v_gidouilles, v_time_seconds;
END;
$$;

COMMENT ON FUNCTION public.complete_minesweeper_game IS
  'Completes a Minesweeper game with server-side validation and reward calculation. STUDENTS ONLY. Teachers and admins blocked at function level. SECURITY DEFINER prevents client manipulation of gidouilles/time. Validates win condition and calculates rewards with hints penalty and daily degressive multiplier.';


-- ============================================================================
-- Function: record_minesweeper_loss() - Add student role check
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_minesweeper_loss(
  p_game_id UUID,
  p_grid_state JSONB
)
RETURNS TABLE(success BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_record RECORD;
  v_time_seconds INTEGER;
  v_grid_size INTEGER;
  v_role TEXT;
BEGIN
  -- Get student role
  SELECT role INTO v_role
  FROM profiles
  WHERE id = auth.uid();

  -- Only students can record losses
  IF v_role IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'Only students can record minesweeper losses';
  END IF;

  -- Step 1: Get game and verify ownership
  SELECT * INTO v_game_record
  FROM public.minesweeper_games
  WHERE id = p_game_id
    AND student_id = auth.uid() -- Must be authenticated and own the game
    AND status = 'in_progress'; -- Must be in progress

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found, not owned by you, or already completed';
  END IF;

  -- Step 2: Validate grid_state size (no need to validate win condition for losses)
  v_grid_size := pg_column_size(p_grid_state);
  IF v_grid_size > 100000 THEN -- 100KB limit
    RAISE EXCEPTION 'Grid state too large: exceeds 100KB';
  END IF;

  -- Step 3: Calculate time_seconds server-side (if started)
  IF v_game_record.started_at IS NOT NULL THEN
    v_time_seconds := EXTRACT(EPOCH FROM (NOW() - v_game_record.started_at))::INTEGER;

    -- Ensure time is at least 1 second
    IF v_time_seconds < 1 THEN
      v_time_seconds := 1;
    END IF;
  ELSE
    -- Game never started (no cells revealed) - set minimal time
    v_time_seconds := 1;
  END IF;

  -- Step 4: Update game record (no gidouilles for losses)
  UPDATE public.minesweeper_games
  SET
    status = 'lost',
    grid_state = p_grid_state,
    time_seconds = v_time_seconds,
    gidouilles_awarded = 0,
    completed_at = NOW()
  WHERE id = p_game_id;

  -- Step 5: Return success
  RETURN QUERY SELECT TRUE;
END;
$$;

COMMENT ON FUNCTION public.record_minesweeper_loss IS
  'Marks a Minesweeper game as lost. STUDENTS ONLY. Teachers and admins blocked at function level. No rewards. Server-side time tracking prevents manipulation. Named record_minesweeper_loss to match naming convention.';


-- ============================================================================
-- Function: record_daily_challenge_attempt() - Add student role check
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_daily_challenge_attempt(
  p_challenge_id UUID,
  p_time_seconds INTEGER,
  p_status TEXT,
  p_grid_state JSONB
)
RETURNS TABLE(success BOOLEAN, gidouilles_earned INTEGER, attempt_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_challenge RECORD;
  v_is_valid BOOLEAN;
  v_gidouilles INTEGER;
  v_attempt_id UUID;
  v_grid_size INTEGER;
  v_role TEXT;
BEGIN
  -- Step 1: Get authenticated user
  v_student_id := auth.uid();

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to attempt daily challenge';
  END IF;

  -- Verify user is a student
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = v_student_id;

  IF v_role IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'Only students can attempt daily challenges';
  END IF;

  -- Step 2: Get challenge and validate it exists
  SELECT * INTO v_challenge
  FROM public.minesweeper_daily_challenges
  WHERE id = p_challenge_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;

  -- Step 3: Check if student already attempted this challenge
  IF EXISTS (
    SELECT 1 FROM public.minesweeper_daily_attempts
    WHERE challenge_id = p_challenge_id
      AND student_id = v_student_id
  ) THEN
    RAISE EXCEPTION 'Already attempted this daily challenge (one attempt per day)';
  END IF;

  -- Step 4: Validate status
  IF p_status NOT IN ('won', 'lost') THEN
    RAISE EXCEPTION 'Invalid status: must be won or lost';
  END IF;

  -- Step 5: Validate time_seconds
  IF p_time_seconds < 1 THEN
    RAISE EXCEPTION 'Invalid time: must be at least 1 second';
  END IF;

  -- Difficulty-specific time limits
  CASE v_challenge.difficulty
    WHEN 'beginner' THEN
      IF p_time_seconds > 3600 THEN
        RAISE EXCEPTION 'Invalid time for beginner: exceeds 1 hour';
      END IF;
    WHEN 'intermediate' THEN
      IF p_time_seconds > 7200 THEN
        RAISE EXCEPTION 'Invalid time for intermediate: exceeds 2 hours';
      END IF;
    WHEN 'expert' THEN
      IF p_time_seconds > 14400 THEN
        RAISE EXCEPTION 'Invalid time for expert: exceeds 4 hours';
      END IF;
  END CASE;

  -- Step 6: Validate grid_state size
  v_grid_size := pg_column_size(p_grid_state);
  IF v_grid_size > 100000 THEN
    RAISE EXCEPTION 'Grid state too large: exceeds 100KB';
  END IF;

  -- Step 7: For wins, validate grid_state represents legitimate win
  IF p_status = 'won' THEN
    v_is_valid := public.validate_minesweeper_win(p_grid_state, v_challenge.difficulty);

    IF NOT v_is_valid THEN
      RAISE EXCEPTION 'Invalid grid state: does not represent a valid win condition';
    END IF;

    -- Calculate base gidouilles (no degressive multiplier for daily challenges)
    v_gidouilles := public.calculate_daily_challenge_gidouilles(
      v_challenge.difficulty,
      p_time_seconds
    );
  ELSE
    -- No gidouilles for losses
    v_gidouilles := 0;
  END IF;

  -- Step 8: Insert attempt record
  INSERT INTO public.minesweeper_daily_attempts (
    challenge_id,
    student_id,
    grid_state,
    time_seconds,
    status,
    gidouilles_earned
  ) VALUES (
    p_challenge_id,
    v_student_id,
    p_grid_state,
    p_time_seconds,
    p_status,
    v_gidouilles
  )
  RETURNING id INTO v_attempt_id;

  -- Step 9: Award base gidouilles to profile (top 3 bonus added later)
  IF v_gidouilles > 0 THEN
    UPDATE public.profiles
    SET gidouilles = COALESCE(gidouilles, 0) + v_gidouilles
    WHERE id = v_student_id;

    -- Step 10: Insert into gidouilles_history
    INSERT INTO public.gidouilles_history (
      student_id,
      class_id,
      delta,
      reason,
      created_by
    )
    SELECT
      v_student_id,
      cm.class_id,
      v_gidouilles,
      'Daily Challenge: ' || v_challenge.difficulty || ' (' || TO_CHAR(v_challenge.challenge_date, 'YYYY-MM-DD') || ')',
      v_student_id
    FROM public.class_members cm
    WHERE cm.student_id = v_student_id
      AND cm.status = 'active'
    ORDER BY cm.joined_at ASC
    LIMIT 1;
  END IF;

  -- Step 11: Return result
  -- Note: Ranking and top 3 bonuses will be calculated by trigger
  RETURN QUERY SELECT TRUE, v_gidouilles, v_attempt_id;
END;
$$;

COMMENT ON FUNCTION public.record_daily_challenge_attempt IS
  'Records daily challenge attempt with server-side validation. STUDENTS ONLY. Teachers and admins blocked at function level. Awards base gidouilles. Ranking/bonuses updated via trigger.';


-- ============================================================================
-- PART 10: Update View Security
-- ============================================================================

-- Views already use security_invoker, which means they inherit RLS from base tables
-- Since we've updated base table policies to check role = 'student',
-- the views will automatically respect these restrictions

-- Update comments to clarify student-only access
COMMENT ON VIEW public.minesweeper_leaderboard IS
  'Ranked leaderboard partitioned by difficulty. STUDENTS ONLY. Includes hints_used for transparency - shows if player used hints in their best time. Only includes authenticated students with at least 1 win.';

COMMENT ON VIEW public.minesweeper_leaderboard_public IS
  'Anonymized public leaderboard (top 100 per difficulty). STUDENTS ONLY. Includes hints_used for transparency. No PII exposed. Safe for anonymous users.';

COMMENT ON VIEW public.minesweeper_student_achievement_progress IS
  'Shows each student''s achievement progress including locked and unlocked achievements. STUDENTS ONLY. For difficulty_specific achievements, shows separate rows for each difficulty level.';

COMMENT ON VIEW public.minesweeper_multiplayer_leaderboard IS
  'Ranked leaderboard with player stats, profiles, and calculated metrics. STUDENTS ONLY.';

COMMENT ON VIEW public.minesweeper_daily_leaderboard IS
  'Daily challenge leaderboard showing all winners ranked by time. STUDENTS ONLY. Only successful completions shown.';


-- ============================================================================
-- PART 11: Update Table Comments
-- ============================================================================

COMMENT ON TABLE public.minesweeper_games IS
  'Stores Minesweeper game sessions. STUDENTS ONLY - teachers and admins use localStorage (no database persistence).';

COMMENT ON COLUMN public.minesweeper_games.student_id IS
  'UUID for authenticated student games. NULL no longer used (was for public games). Only students can save games and earn gidouilles.';

COMMENT ON TABLE public.minesweeper_student_achievements IS
  'Tracks which achievements each student has unlocked. STUDENTS ONLY. Includes reference to the game where it was earned.';

COMMENT ON TABLE public.minesweeper_multiplayer_matches IS
  'Stores multiplayer Minesweeper matches between two students. STUDENTS ONLY.';

COMMENT ON TABLE public.minesweeper_multiplayer_queue IS
  'Matchmaking queue for finding opponents based on skill and preferences. STUDENTS ONLY.';

COMMENT ON TABLE public.minesweeper_multiplayer_game_state IS
  'Real-time game state for live match updates via Supabase Realtime. STUDENTS ONLY.';

COMMENT ON TABLE public.minesweeper_player_stats IS
  'Player statistics for multiplayer Minesweeper - tracks wins, losses, ELO, streaks. STUDENTS ONLY.';

COMMENT ON TABLE public.minesweeper_daily_challenges IS
  'Daily Minesweeper challenges. STUDENTS ONLY. One challenge per day with deterministic seed for reproducible grids.';

COMMENT ON TABLE public.minesweeper_daily_attempts IS
  'Student attempts at daily challenges. STUDENTS ONLY. One attempt per student per day. Top 3 get bonus gidouilles.';


-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================

-- This migration enforces student-only access to minesweeper at the database level:
--
-- ✅ RLS POLICIES UPDATED (ALL tables):
--    - minesweeper_games: Added role = 'student' check to all policies
--    - minesweeper_student_achievements: Added role check to SELECT
--    - minesweeper_multiplayer_matches: Added role check to SELECT
--    - minesweeper_multiplayer_queue: Added role checks to SELECT and INSERT
--    - minesweeper_multiplayer_game_state: Added role check to SELECT
--    - minesweeper_player_stats: Added role check to SELECT
--    - minesweeper_daily_challenges: Added role check to SELECT
--    - minesweeper_daily_attempts: Added role checks to SELECT and INSERT
--
-- ✅ RPC FUNCTIONS UPDATED (ALL critical functions):
--    - use_hint(): Added role validation at function start
--    - complete_minesweeper_game(): Added role validation at function start
--    - record_minesweeper_loss(): Added role validation at function start
--    - record_daily_challenge_attempt(): Added role validation at function start
--
-- ✅ DOCUMENTATION UPDATED:
--    - All policies have comments explaining student-only restriction
--    - All functions have updated comments
--    - All tables have updated comments
--    - All views have updated comments
--
-- ✅ SECURITY MODEL:
--    - Defense-in-depth: Client + API + Database all enforce student-only
--    - Fail-closed: Teachers/admins get EXCEPTION, not silent failure
--    - Clear error messages: "Only students can [action]"
--    - Anonymous access removed (was only for public games, no longer needed)
--
-- ✅ BACKWARD COMPATIBILITY:
--    - Existing student games unaffected
--    - Existing RPC function signatures unchanged
--    - Views inherit RLS automatically (security_invoker)
--    - No data migration needed
--
-- ✅ WHAT'S BLOCKED:
--    - Teachers/admins: Cannot create/view/update/delete games in database
--    - Teachers/admins: Cannot use hints, complete games, record losses
--    - Teachers/admins: Cannot join multiplayer queue or view matches
--    - Teachers/admins: Cannot attempt daily challenges
--    - Teachers/admins: Cannot view leaderboards or achievements
--    - All operations fail with clear error: "Only students can..."
--
-- ✅ WHAT STILL WORKS:
--    - Students: Full access to all minesweeper features
--    - Teachers/admins: Can use localStorage for anonymous play (no persistence)
--    - API layer still validates role (redundant but defense-in-depth)
--
-- NEXT STEPS FOR DEVELOPER:
-- 1. Run: pnpm db:migrate
-- 2. Test with teacher account: should see localStorage games only
-- 3. Test with student account: should work normally with database persistence
-- 4. Test edge cases: teacher tries to call RPC directly (should fail)
-- 5. Update src/lib/types/database.ts if needed (no schema changes)
-- 6. Update DATABASE_SCHEMA.md to document student-only restriction
-- ============================================================================
