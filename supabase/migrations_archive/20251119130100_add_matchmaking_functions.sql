-- Migration: Add matchmaking functions for Minesweeper multiplayer
-- Created: 2025-11-19
-- Description: Functions for joining queue, leaving queue, and checking match status

-- Function 1: Join multiplayer queue (with matchmaking logic)
CREATE OR REPLACE FUNCTION public.join_multiplayer_queue(
  p_difficulty TEXT,
  p_match_type TEXT DEFAULT 'quick'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID := auth.uid();
  v_rank INTEGER;
  v_opponent_record RECORD;
  v_match_id UUID;
  v_seed TEXT;
BEGIN
  -- Validate authenticated
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate difficulty
  IF p_difficulty NOT IN ('beginner', 'intermediate', 'expert') THEN
    RAISE EXCEPTION 'Invalid difficulty: %', p_difficulty;
  END IF;

  -- Validate match_type
  IF p_match_type NOT IN ('quick', 'ranked') THEN
    RAISE EXCEPTION 'Invalid match_type: %', p_match_type;
  END IF;

  -- Get player's ELO (ensure stats exist first)
  PERFORM ensure_player_stats_exist(v_student_id);

  SELECT ranked_elo INTO v_rank
  FROM minesweeper_player_stats
  WHERE student_id = v_student_id;

  -- Check if already in queue
  IF EXISTS (
    SELECT 1 FROM minesweeper_multiplayer_queue
    WHERE student_id = v_student_id
      AND status = 'waiting'
  ) THEN
    RAISE EXCEPTION 'Already in queue';
  END IF;

  -- Check if already in active match
  IF EXISTS (
    SELECT 1 FROM minesweeper_multiplayer_matches
    WHERE (player1_id = v_student_id OR player2_id = v_student_id)
      AND status IN ('waiting', 'countdown', 'in_progress')
  ) THEN
    RAISE EXCEPTION 'Already in active match';
  END IF;

  -- Try to find opponent (within ±200 ELO, same difficulty & match_type)
  SELECT
    student_id,
    rank,
    joined_at,
    id AS queue_id
  INTO v_opponent_record
  FROM minesweeper_multiplayer_queue
  WHERE difficulty = p_difficulty
    AND match_type = p_match_type
    AND status = 'waiting'
    AND student_id != v_student_id
    AND ABS(rank - v_rank) <= 200  -- MMR tolerance
  ORDER BY joined_at ASC  -- First come first served within MMR range
  LIMIT 1;

  IF v_opponent_record.student_id IS NOT NULL THEN
    -- Match found! Create match
    v_seed := encode(gen_random_bytes(16), 'hex');  -- Generate random seed

    INSERT INTO minesweeper_multiplayer_matches (
      match_type,
      difficulty,
      seed,
      player1_id,
      player2_id,
      status
    ) VALUES (
      p_match_type,
      p_difficulty,
      v_seed,
      v_opponent_record.student_id,  -- Opponent is player 1 (they joined first)
      v_student_id,                  -- We are player 2
      'countdown'                     -- Start in countdown phase
    ) RETURNING id INTO v_match_id;

    -- Mark both players as matched in queue
    UPDATE minesweeper_multiplayer_queue
    SET status = 'matched'
    WHERE student_id IN (v_student_id, v_opponent_record.student_id)
      AND status = 'waiting';

    -- Initialize game state for both players
    INSERT INTO minesweeper_multiplayer_game_state (match_id, player_id)
    VALUES
      (v_match_id, v_opponent_record.student_id),
      (v_match_id, v_student_id);

    RETURN jsonb_build_object(
      'matched', true,
      'match_id', v_match_id,
      'opponent_id', v_opponent_record.student_id,
      'seed', v_seed,
      'difficulty', p_difficulty,
      'match_type', p_match_type,
      'player_number', 2  -- We are player 2
    );
  ELSE
    -- No match found, join queue
    INSERT INTO minesweeper_multiplayer_queue (
      student_id,
      difficulty,
      match_type,
      rank,
      status
    ) VALUES (
      v_student_id,
      p_difficulty,
      p_match_type,
      v_rank,
      'waiting'
    );

    RETURN jsonb_build_object(
      'matched', false,
      'waiting', true,
      'difficulty', p_difficulty,
      'match_type', p_match_type,
      'rank', v_rank
    );
  END IF;
END;
$$;

-- Function 2: Leave multiplayer queue
CREATE OR REPLACE FUNCTION public.leave_multiplayer_queue()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID := auth.uid();
  v_deleted_count INTEGER;
BEGIN
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Mark as cancelled (don't delete for analytics)
  UPDATE minesweeper_multiplayer_queue
  SET status = 'cancelled'
  WHERE student_id = v_student_id
    AND status = 'waiting';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'removed', v_deleted_count > 0
  );
END;
$$;

-- Function 3: Check match status (for polling)
CREATE OR REPLACE FUNCTION public.check_match_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID := auth.uid();
  v_match RECORD;
BEGIN
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check for active match
  SELECT
    m.id,
    m.match_type,
    m.difficulty,
    m.seed,
    m.status,
    CASE
      WHEN m.player1_id = v_student_id THEN m.player2_id
      ELSE m.player1_id
    END AS opponent_id,
    CASE
      WHEN m.player1_id = v_student_id THEN 1
      ELSE 2
    END AS player_number
  INTO v_match
  FROM minesweeper_multiplayer_matches m
  WHERE (m.player1_id = v_student_id OR m.player2_id = v_student_id)
    AND m.status IN ('countdown', 'in_progress')
  ORDER BY m.created_at DESC
  LIMIT 1;

  IF v_match.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'in_match', true,
      'match_id', v_match.id,
      'opponent_id', v_match.opponent_id,
      'seed', v_match.seed,
      'difficulty', v_match.difficulty,
      'match_type', v_match.match_type,
      'status', v_match.status,
      'player_number', v_match.player_number
    );
  ELSE
    RETURN jsonb_build_object(
      'in_match', false
    );
  END IF;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.join_multiplayer_queue(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_multiplayer_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_match_status() TO authenticated;
