-- ============================================================================
-- Migration: Fix ambiguous column reference in start_tournament_game
-- ============================================================================
-- The RETURN QUERY statement had ambiguous references between
-- PL/pgSQL variables and the return table columns.

CREATE OR REPLACE FUNCTION public.start_tournament_game(
  p_tournament_id UUID
)
RETURNS TABLE(game_id UUID, seed TEXT, game_number INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_tournament RECORD;
  v_game_number INTEGER;
  v_seed TEXT;
  v_game_id UUID;
  v_in_progress_count INTEGER;
BEGIN
  -- Step 1: Get authenticated user
  v_student_id := auth.uid();

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to start a tournament game';
  END IF;

  -- Step 2: Get tournament
  SELECT * INTO v_tournament
  FROM public.minesweeper_tournaments
  WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  -- Step 3: Validate tournament is active
  IF v_tournament.status != 'active' THEN
    RAISE EXCEPTION 'Tournament is not active (status: %)', v_tournament.status;
  END IF;

  -- Step 4: Validate tournament is in date range
  IF NOW() < v_tournament.start_date THEN
    RAISE EXCEPTION 'Tournament has not started yet';
  END IF;

  IF NOW() > v_tournament.end_date THEN
    RAISE EXCEPTION 'Tournament has ended';
  END IF;

  -- Step 5: Verify student can participate
  IF NOT public.can_participate_in_tournament(p_tournament_id, v_student_id) THEN
    RAISE EXCEPTION 'You are not eligible to participate in this tournament';
  END IF;

  -- Step 6: Check for existing in-progress game
  SELECT COUNT(*) INTO v_in_progress_count
  FROM public.minesweeper_tournament_games
  WHERE tournament_id = p_tournament_id
    AND student_id = v_student_id
    AND status = 'in_progress';

  IF v_in_progress_count > 0 THEN
    RAISE EXCEPTION 'You already have a game in progress for this tournament';
  END IF;

  -- Step 7: Calculate next game number
  SELECT COALESCE(MAX(mtg.game_number), 0) + 1 INTO v_game_number
  FROM public.minesweeper_tournament_games mtg
  WHERE mtg.tournament_id = p_tournament_id
    AND mtg.student_id = v_student_id;

  -- Step 8: Generate seed
  v_seed := 'tournament-' || p_tournament_id::TEXT || '-game-' || v_game_number::TEXT;

  -- Step 9: Create game record
  INSERT INTO public.minesweeper_tournament_games (
    tournament_id,
    student_id,
    game_number,
    seed,
    status
  ) VALUES (
    p_tournament_id,
    v_student_id,
    v_game_number,
    v_seed,
    'in_progress'
  )
  RETURNING id INTO v_game_id;

  -- Step 10: Return game info with explicit column aliases
  game_id := v_game_id;
  seed := v_seed;
  game_number := v_game_number;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.start_tournament_game IS
  'Starts a new game in a tournament. Validates tournament is active and student can participate. Returns game_id, seed, and game_number.';
