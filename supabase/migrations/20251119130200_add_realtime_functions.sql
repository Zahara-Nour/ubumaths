-- Migration: Add real-time synchronization functions for Minesweeper multiplayer
-- Created: 2025-11-19
-- Description: Functions for updating and retrieving match state during gameplay

-- Function 1: Update player's game state during match
-- Security: DEFINER (runs with elevated privileges, requires auth check)
-- Purpose: Update cells_revealed, flags_used, time_elapsed, and last_action
CREATE OR REPLACE FUNCTION public.update_game_state(
  p_match_id UUID,
  p_cells_revealed INTEGER,
  p_flags_used INTEGER,
  p_time_elapsed INTEGER,
  p_last_action JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID := auth.uid();
  v_match_status TEXT;
BEGIN
  -- Validate authenticated
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify match exists and player is participant
  SELECT status INTO v_match_status
  FROM minesweeper_multiplayer_matches
  WHERE id = p_match_id
    AND (player1_id = v_student_id OR player2_id = v_student_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found or you are not a participant';
  END IF;

  -- Check match is in progress
  IF v_match_status NOT IN ('countdown', 'in_progress') THEN
    RAISE EXCEPTION 'Match is not in progress (status: %)', v_match_status;
  END IF;

  -- Validate bounds
  IF p_cells_revealed < 0 OR p_cells_revealed > 480 THEN
    RAISE EXCEPTION 'Invalid cells_revealed: %', p_cells_revealed;
  END IF;

  IF p_flags_used < 0 OR p_flags_used > 99 THEN
    RAISE EXCEPTION 'Invalid flags_used: %', p_flags_used;
  END IF;

  IF p_time_elapsed < 0 OR p_time_elapsed > 7200 THEN
    RAISE EXCEPTION 'Invalid time_elapsed: %', p_time_elapsed;
  END IF;

  -- Update or insert game state
  INSERT INTO minesweeper_multiplayer_game_state (
    match_id,
    player_id,
    cells_revealed,
    flags_used,
    time_elapsed,
    last_action,
    updated_at
  ) VALUES (
    p_match_id,
    v_student_id,
    p_cells_revealed,
    p_flags_used,
    p_time_elapsed,
    COALESCE(p_last_action, jsonb_build_object(
      'timestamp', EXTRACT(EPOCH FROM NOW())
    )),
    NOW()
  )
  ON CONFLICT (match_id, player_id) DO UPDATE
  SET cells_revealed = EXCLUDED.cells_revealed,
      flags_used = EXCLUDED.flags_used,
      time_elapsed = EXCLUDED.time_elapsed,
      last_action = EXCLUDED.last_action,
      updated_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'match_id', p_match_id,
    'player_id', v_student_id,
    'cells_revealed', p_cells_revealed,
    'time_elapsed', p_time_elapsed
  );
END;
$$;

-- Function 2: Transition match from 'countdown' to 'in_progress'
-- Security: DEFINER (runs with elevated privileges, requires auth check)
-- Purpose: Mark match as started when countdown completes
CREATE OR REPLACE FUNCTION public.start_match(
  p_match_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID := auth.uid();
  v_match_status TEXT;
BEGIN
  -- Validate authenticated
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify match exists and player is participant
  SELECT status INTO v_match_status
  FROM minesweeper_multiplayer_matches
  WHERE id = p_match_id
    AND (player1_id = v_student_id OR player2_id = v_student_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found or you are not a participant';
  END IF;

  -- Can only start from countdown
  IF v_match_status != 'countdown' THEN
    RAISE EXCEPTION 'Match cannot be started (current status: %)', v_match_status;
  END IF;

  -- Update match status
  UPDATE minesweeper_multiplayer_matches
  SET status = 'in_progress',
      started_at = NOW()
  WHERE id = p_match_id;

  RETURN jsonb_build_object(
    'success', true,
    'match_id', p_match_id,
    'status', 'in_progress',
    'started_at', NOW()
  );
END;
$$;

-- Function 3: Get current state of both players in a match
-- Security: DEFINER (runs with elevated privileges, requires auth check)
-- Purpose: Retrieve complete match state for real-time synchronization
CREATE OR REPLACE FUNCTION public.get_match_state(
  p_match_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID := auth.uid();
  v_match RECORD;
  v_player1_state RECORD;
  v_player2_state RECORD;
BEGIN
  -- Validate authenticated
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get match info
  SELECT
    m.id,
    m.match_type,
    m.difficulty,
    m.seed,
    m.status,
    m.player1_id,
    m.player2_id,
    m.started_at,
    p1.firstname AS player1_firstname,
    p1.lastname AS player1_lastname,
    p2.firstname AS player2_firstname,
    p2.lastname AS player2_lastname
  INTO v_match
  FROM minesweeper_multiplayer_matches m
  JOIN profiles p1 ON p1.id = m.player1_id
  JOIN profiles p2 ON p2.id = m.player2_id
  WHERE m.id = p_match_id
    AND (m.player1_id = v_student_id OR m.player2_id = v_student_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found or you are not a participant';
  END IF;

  -- Get player 1 state
  SELECT cells_revealed, flags_used, time_elapsed, updated_at
  INTO v_player1_state
  FROM minesweeper_multiplayer_game_state
  WHERE match_id = p_match_id AND player_id = v_match.player1_id;

  -- Get player 2 state
  SELECT cells_revealed, flags_used, time_elapsed, updated_at
  INTO v_player2_state
  FROM minesweeper_multiplayer_game_state
  WHERE match_id = p_match_id AND player_id = v_match.player2_id;

  RETURN jsonb_build_object(
    'match', jsonb_build_object(
      'id', v_match.id,
      'match_type', v_match.match_type,
      'difficulty', v_match.difficulty,
      'seed', v_match.seed,
      'status', v_match.status,
      'started_at', v_match.started_at
    ),
    'player1', jsonb_build_object(
      'id', v_match.player1_id,
      'firstname', v_match.player1_firstname,
      'lastname', v_match.player1_lastname,
      'cells_revealed', COALESCE(v_player1_state.cells_revealed, 0),
      'flags_used', COALESCE(v_player1_state.flags_used, 0),
      'time_elapsed', COALESCE(v_player1_state.time_elapsed, 0),
      'updated_at', v_player1_state.updated_at
    ),
    'player2', jsonb_build_object(
      'id', v_match.player2_id,
      'firstname', v_match.player2_firstname,
      'lastname', v_match.player2_lastname,
      'cells_revealed', COALESCE(v_player2_state.cells_revealed, 0),
      'flags_used', COALESCE(v_player2_state.flags_used, 0),
      'time_elapsed', COALESCE(v_player2_state.time_elapsed, 0),
      'updated_at', v_player2_state.updated_at
    ),
    'your_player_number', CASE
      WHEN v_match.player1_id = v_student_id THEN 1
      ELSE 2
    END
  );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.update_game_state(UUID, INTEGER, INTEGER, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_match(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_match_state(UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.update_game_state IS 'Update player game state during active match (real-time sync)';
COMMENT ON FUNCTION public.start_match IS 'Transition match from countdown to in_progress status';
COMMENT ON FUNCTION public.get_match_state IS 'Get complete match state for both players (real-time sync)';
