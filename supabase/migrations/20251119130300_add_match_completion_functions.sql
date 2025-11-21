-- Migration: Add match completion and rewards system for multiplayer minesweeper
-- Created: 2025-11-19
-- Description: Functions for completing matches, calculating ELO, distributing rewards

-- ============================================================================
-- FUNCTION: calculate_elo_change
-- Calculate ELO rating change based on match outcome
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_elo_change(
  p_winner_elo INTEGER,
  p_loser_elo INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_k_factor INTEGER := 32; -- Standard K-factor for moderate volatility
  v_expected_score NUMERIC;
  v_elo_change INTEGER;
BEGIN
  -- Calculate expected score for winner using ELO formula
  -- E = 1 / (1 + 10^((R_opponent - R_player) / 400))
  v_expected_score := 1.0 / (1.0 + POWER(10.0, (p_loser_elo - p_winner_elo)::NUMERIC / 400.0));

  -- Calculate ELO change: K * (actual_score - expected_score)
  -- Winner gets actual_score = 1, so: K * (1 - expected_score)
  v_elo_change := ROUND(v_k_factor * (1.0 - v_expected_score))::INTEGER;

  -- Ensure minimum change of 1 point
  IF v_elo_change < 1 THEN
    v_elo_change := 1;
  END IF;

  RETURN v_elo_change;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- FUNCTION: complete_multiplayer_match
-- Complete a multiplayer match with win validation and rewards
-- ============================================================================

CREATE OR REPLACE FUNCTION public.complete_multiplayer_match(
  p_match_id UUID,
  p_time_seconds INTEGER,
  p_grid_state JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_student_id UUID;
  v_match RECORD;
  v_opponent_id UUID;
  v_base_gidouilles INTEGER;
  v_bonus_gidouilles INTEGER := 0;
  v_total_gidouilles INTEGER;
  v_elo_change INTEGER;
  v_winner_elo INTEGER := 1500; -- Default ELO for new players
  v_loser_elo INTEGER := 1500;   -- Default ELO for new players
  v_season TEXT;
  v_difficulty_config RECORD;
BEGIN
  -- Get authenticated student ID
  v_student_id := auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch match details WITH LOCK to prevent race condition
  SELECT * INTO v_match
  FROM minesweeper_multiplayer_matches
  WHERE id = p_match_id
  FOR UPDATE;  -- CRITICAL: Locks row until transaction completes

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  -- Verify player is a participant
  IF v_match.player1_id != v_student_id AND v_match.player2_id != v_student_id THEN
    RAISE EXCEPTION 'You are not a participant in this match';
  END IF;

  -- Verify match is in progress
  IF v_match.status != 'in_progress' THEN
    RAISE EXCEPTION 'Match not in correct state (status: %)', v_match.status;
  END IF;

  -- Verify match hasn't already been completed
  IF v_match.winner_id IS NOT NULL THEN
    RAISE EXCEPTION 'Match already completed';
  END IF;

  -- Validate time bounds (min 10s, max 2 hours)
  IF p_time_seconds < 10 OR p_time_seconds > 7200 THEN
    RAISE EXCEPTION 'Invalid time: %s seconds', p_time_seconds;
  END IF;

  -- Get current season (needed for ELO queries)
  v_season := TO_CHAR(NOW(), 'YYYY-MM');

  -- SERVER-SIDE WIN VALIDATION
  -- Reuse the existing validate_minesweeper_win function
  -- This function checks:
  -- 1. All non-mine cells are revealed
  -- 2. No mines are revealed
  -- 3. Grid dimensions match difficulty
  IF NOT EXISTS (
    SELECT 1 FROM public.validate_minesweeper_win(
      p_grid_state,
      v_match.difficulty
    )
  ) THEN
    RAISE EXCEPTION 'Invalid grid state: does not represent a valid win';
  END IF;

  -- Determine opponent
  IF v_match.player1_id = v_student_id THEN
    v_opponent_id := v_match.player2_id;
  ELSE
    v_opponent_id := v_match.player1_id;
  END IF;

  -- Get difficulty configuration for rewards
  SELECT * INTO v_difficulty_config
  FROM (VALUES
    ('beginner', 9, 9, 10, 20, 25, 180),
    ('intermediate', 16, 16, 40, 50, 60, 600),
    ('expert', 16, 30, 99, 100, 120, 1200)
  ) AS configs(difficulty, rows, cols, mines, quick_reward, ranked_reward, base_time)
  WHERE difficulty = v_match.difficulty;

  -- Calculate base gidouilles based on match type
  IF v_match.match_type = 'quick' THEN
    v_base_gidouilles := v_difficulty_config.quick_reward;
  ELSIF v_match.match_type = 'ranked' THEN
    v_base_gidouilles := v_difficulty_config.ranked_reward;
  ELSE
    v_base_gidouilles := v_difficulty_config.quick_reward; -- Default to quick
  END IF;

  -- Speed bonus: +20% if under base_time / 2
  IF p_time_seconds < (v_difficulty_config.base_time / 2) THEN
    v_bonus_gidouilles := ROUND(v_base_gidouilles * 0.2);
  END IF;

  v_total_gidouilles := v_base_gidouilles + v_bonus_gidouilles;

  -- Get current ELO ratings with COALESCE for NULL safety (filter by current season)
  SELECT COALESCE(rank, 1500) INTO v_winner_elo
  FROM minesweeper_player_stats
  WHERE student_id = v_student_id AND season = v_season;

  -- If no record exists, v_winner_elo keeps default 1500
  IF NOT FOUND THEN
    v_winner_elo := 1500;
  END IF;

  SELECT COALESCE(rank, 1500) INTO v_loser_elo
  FROM minesweeper_player_stats
  WHERE student_id = v_opponent_id AND season = v_season;

  -- If no record exists, v_loser_elo keeps default 1500
  IF NOT FOUND THEN
    v_loser_elo := 1500;
  END IF;

  -- Calculate ELO change (only for ranked matches)
  IF v_match.match_type = 'ranked' THEN
    v_elo_change := calculate_elo_change(
      v_winner_elo,
      v_loser_elo
    );
  ELSE
    v_elo_change := 0; -- No ELO change for quick/challenge matches
  END IF;

  -- Update match record
  UPDATE minesweeper_multiplayer_matches
  SET
    status = 'completed',
    winner_id = v_student_id,
    completed_at = NOW(),
    duration_seconds = p_time_seconds,
    winner_reward = v_total_gidouilles,
    loser_reward = 0, -- Loser gets nothing in competitive mode
    elo_change = v_elo_change
  WHERE id = p_match_id;

  -- Award gidouilles to winner WITH PROPER AUDIT TRAIL
  INSERT INTO gidouilles_history (
    student_id,
    class_id,
    delta,
    reason,
    created_by
  )
  SELECT
    v_student_id,
    cm.class_id,
    v_total_gidouilles,
    'Minesweeper multiplayer: ' || v_match.difficulty || ' ' || v_match.match_type || ' won in ' || p_time_seconds || 's',
    v_student_id
  FROM class_members cm
  WHERE cm.student_id = v_student_id
    AND cm.status = 'active'
  ORDER BY cm.joined_at ASC
  LIMIT 1;

  -- If student has no active class, insert with NULL class_id (acceptable fallback)
  IF NOT FOUND THEN
    INSERT INTO gidouilles_history (
      student_id,
      class_id,
      delta,
      reason,
      created_by
    ) VALUES (
      v_student_id,
      NULL,
      v_total_gidouilles,
      'Minesweeper multiplayer: ' || v_match.difficulty || ' ' || v_match.match_type || ' won in ' || p_time_seconds || 's',
      v_student_id
    );
  END IF;

  -- Update winner stats
  INSERT INTO minesweeper_player_stats (
    student_id,
    season,
    games_played,
    games_won,
    rank,
    win_streak
  ) VALUES (
    v_student_id,
    v_season,
    1,
    1,
    v_winner_elo + v_elo_change, -- Use calculated ELO variable
    1
  )
  ON CONFLICT (student_id, season) DO UPDATE
  SET
    games_played = minesweeper_player_stats.games_played + 1,
    games_won = minesweeper_player_stats.games_won + 1,
    rank = GREATEST(0, v_winner_elo + v_elo_change), -- Use calculated ELO variable with floor at 0
    win_streak = minesweeper_player_stats.win_streak + 1,
    best_win_streak = GREATEST(
      minesweeper_player_stats.best_win_streak,
      minesweeper_player_stats.win_streak + 1
    ),
    updated_at = NOW();

  -- Update loser stats
  INSERT INTO minesweeper_player_stats (
    student_id,
    season,
    games_played,
    games_won,
    rank,
    win_streak
  ) VALUES (
    v_opponent_id,
    v_season,
    1,
    0,
    GREATEST(0, v_loser_elo - v_elo_change), -- Use calculated ELO variable, can't go below 0
    0
  )
  ON CONFLICT (student_id, season) DO UPDATE
  SET
    games_played = minesweeper_player_stats.games_played + 1,
    rank = GREATEST(0, v_loser_elo - v_elo_change), -- Use calculated ELO variable with floor at 0
    win_streak = 0, -- Reset streak
    updated_at = NOW();

  -- Return success with rewards info
  RETURN jsonb_build_object(
    'success', true,
    'winner_id', v_student_id,
    'gidouilles', v_total_gidouilles,
    'base_reward', v_base_gidouilles,
    'speed_bonus', v_bonus_gidouilles,
    'elo_change', v_elo_change,
    'new_elo', v_winner_elo + v_elo_change, -- Use calculated ELO variable
    'time_seconds', p_time_seconds
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: abandon_multiplayer_match
-- Handle match abandonment (disconnect, timeout, manual forfeit)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.abandon_multiplayer_match(
  p_match_id UUID,
  p_reason TEXT DEFAULT 'player_quit'
)
RETURNS JSONB AS $$
DECLARE
  v_student_id UUID;
  v_match RECORD;
  v_opponent_id UUID;
  v_opponent_reward INTEGER;
  v_elo_change INTEGER;
  v_abandoner_elo INTEGER := 1500; -- Default ELO for new players
  v_opponent_elo INTEGER := 1500;   -- Default ELO for new players
  v_season TEXT;
BEGIN
  -- Get authenticated student ID
  v_student_id := auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch match details WITH LOCK to prevent race condition
  SELECT * INTO v_match
  FROM minesweeper_multiplayer_matches
  WHERE id = p_match_id
  FOR UPDATE;  -- CRITICAL: Locks row until transaction completes

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  -- Verify player is a participant
  IF v_match.player1_id != v_student_id AND v_match.player2_id != v_student_id THEN
    RAISE EXCEPTION 'You are not a participant in this match';
  END IF;

  -- Verify match can be abandoned (in_progress or countdown)
  IF v_match.status NOT IN ('in_progress', 'countdown') THEN
    RAISE EXCEPTION 'Match not in correct state for abandonment (status: %)', v_match.status;
  END IF;

  -- Determine opponent
  IF v_match.player1_id = v_student_id THEN
    v_opponent_id := v_match.player2_id;
  ELSE
    v_opponent_id := v_match.player1_id;
  END IF;

  -- Get current season
  v_season := TO_CHAR(NOW(), 'YYYY-MM');

  -- Get ELO ratings with COALESCE for NULL safety
  SELECT COALESCE(rank, 1500) INTO v_abandoner_elo
  FROM minesweeper_player_stats
  WHERE student_id = v_student_id AND season = v_season;

  -- If no record exists, v_abandoner_elo keeps default 1500
  IF NOT FOUND THEN
    v_abandoner_elo := 1500;
  END IF;

  SELECT COALESCE(rank, 1500) INTO v_opponent_elo
  FROM minesweeper_player_stats
  WHERE student_id = v_opponent_id AND season = v_season;

  -- If no record exists, v_opponent_elo keeps default 1500
  IF NOT FOUND THEN
    v_opponent_elo := 1500;
  END IF;

  -- Calculate ELO change (opponent wins, abandoner loses)
  IF v_match.match_type = 'ranked' THEN
    v_elo_change := calculate_elo_change(
      v_opponent_elo,
      v_abandoner_elo
    );
  ELSE
    v_elo_change := 0;
  END IF;

  -- Small reward for opponent (half of normal quick match reward)
  v_opponent_reward := CASE v_match.difficulty
    WHEN 'beginner' THEN 10
    WHEN 'intermediate' THEN 25
    WHEN 'expert' THEN 50
    ELSE 10
  END;

  -- Update match record
  UPDATE minesweeper_multiplayer_matches
  SET
    status = 'abandoned',
    winner_id = v_opponent_id,
    completed_at = NOW(),
    winner_reward = v_opponent_reward,
    loser_reward = 0,
    elo_change = v_elo_change
  WHERE id = p_match_id;

  -- Award gidouilles to opponent WITH PROPER AUDIT TRAIL
  INSERT INTO gidouilles_history (
    student_id,
    class_id,
    delta,
    reason,
    created_by
  )
  SELECT
    v_opponent_id,
    cm.class_id,
    v_opponent_reward,
    'Minesweeper multiplayer: ' || v_match.difficulty || ' ' || v_match.match_type || ' won by abandonment',
    v_opponent_id
  FROM class_members cm
  WHERE cm.student_id = v_opponent_id
    AND cm.status = 'active'
  ORDER BY cm.joined_at ASC
  LIMIT 1;

  -- If opponent has no active class, insert with NULL class_id (acceptable fallback)
  IF NOT FOUND THEN
    INSERT INTO gidouilles_history (
      student_id,
      class_id,
      delta,
      reason,
      created_by
    ) VALUES (
      v_opponent_id,
      NULL,
      v_opponent_reward,
      'Minesweeper multiplayer: ' || v_match.difficulty || ' ' || v_match.match_type || ' won by abandonment',
      v_opponent_id
    );
  END IF;

  -- Update opponent stats (win by forfeit)
  INSERT INTO minesweeper_player_stats (
    student_id,
    season,
    games_played,
    games_won,
    rank,
    win_streak
  ) VALUES (
    v_opponent_id,
    v_season,
    1,
    1,
    v_opponent_elo + v_elo_change, -- Use calculated ELO variable
    1
  )
  ON CONFLICT (student_id, season) DO UPDATE
  SET
    games_played = minesweeper_player_stats.games_played + 1,
    games_won = minesweeper_player_stats.games_won + 1,
    rank = GREATEST(0, v_opponent_elo + v_elo_change), -- Use calculated ELO variable with floor at 0
    win_streak = minesweeper_player_stats.win_streak + 1,
    best_win_streak = GREATEST(
      minesweeper_player_stats.best_win_streak,
      minesweeper_player_stats.win_streak + 1
    ),
    updated_at = NOW();

  -- Update abandoner stats (loss by forfeit)
  INSERT INTO minesweeper_player_stats (
    student_id,
    season,
    games_played,
    games_won,
    rank,
    win_streak
  ) VALUES (
    v_student_id,
    v_season,
    1,
    0,
    GREATEST(0, v_abandoner_elo - v_elo_change), -- Use calculated ELO variable, can't go below 0
    0
  )
  ON CONFLICT (student_id, season) DO UPDATE
  SET
    games_played = minesweeper_player_stats.games_played + 1,
    rank = GREATEST(0, v_abandoner_elo - v_elo_change), -- Use calculated ELO variable with floor at 0
    win_streak = 0,
    updated_at = NOW();

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'abandoned_by', v_student_id,
    'winner_id', v_opponent_id,
    'reason', p_reason,
    'elo_change', v_elo_change
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.calculate_elo_change TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_multiplayer_match TO authenticated;
GRANT EXECUTE ON FUNCTION public.abandon_multiplayer_match TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.calculate_elo_change IS 'Calculate ELO rating change for winner (K-factor 32)';
COMMENT ON FUNCTION public.complete_multiplayer_match IS 'Complete multiplayer match with win validation and rewards distribution';
COMMENT ON FUNCTION public.abandon_multiplayer_match IS 'Handle match abandonment with automatic win for opponent';
