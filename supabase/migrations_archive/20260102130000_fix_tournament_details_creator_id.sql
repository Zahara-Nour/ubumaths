-- ============================================================================
-- Migration: Fix get_tournament_details to include creator_id
-- ============================================================================
-- The original function was missing creator_id in the return object,
-- which caused 403 errors when teachers tried to view their own tournaments.

CREATE OR REPLACE FUNCTION public.get_tournament_details(
  p_tournament_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tournament RECORD;
  v_classes JSONB;
  v_my_stats JSONB;
  v_top_players JSONB;
BEGIN
  v_user_id := auth.uid();

  -- Get tournament
  SELECT * INTO v_tournament
  FROM public.minesweeper_tournaments
  WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Get participating classes
  SELECT jsonb_agg(jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'teacher_name', p.firstname || ' ' || p.lastname
  ))
  INTO v_classes
  FROM public.minesweeper_tournament_classes tc
  JOIN public.classes c ON c.id = tc.class_id
  JOIN public.profiles p ON p.id = c.teacher_id
  WHERE tc.tournament_id = p_tournament_id;

  -- Get current user's stats (if student)
  SELECT jsonb_build_object(
    'position', s.position,
    'games_won', s.games_won,
    'average_time', s.average_time,
    'total_games', (
      SELECT COUNT(*) FROM public.minesweeper_tournament_games
      WHERE tournament_id = p_tournament_id AND student_id = v_user_id
    )
  )
  INTO v_my_stats
  FROM public.minesweeper_tournament_standings s
  WHERE s.tournament_id = p_tournament_id
    AND s.student_id = v_user_id;

  -- Get top 10 players
  SELECT jsonb_agg(jsonb_build_object(
    'position', s.position,
    'student_id', s.student_id,
    'firstname', p.firstname,
    'lastname', p.lastname,
    'games_won', s.games_won,
    'average_time', s.average_time
  ) ORDER BY s.position)
  INTO v_top_players
  FROM (
    SELECT * FROM public.minesweeper_tournament_standings
    WHERE tournament_id = p_tournament_id
    ORDER BY position
    LIMIT 10
  ) s
  JOIN public.profiles p ON p.id = s.student_id;

  -- Return tournament details with creator_id included
  RETURN jsonb_build_object(
    'id', v_tournament.id,
    'creator_id', v_tournament.creator_id,
    'name', v_tournament.name,
    'description', v_tournament.description,
    'difficulty', v_tournament.difficulty,
    'scope', v_tournament.scope,
    'status', v_tournament.status,
    'start_date', v_tournament.start_date,
    'end_date', v_tournament.end_date,
    'top_x_games', v_tournament.top_x_games,
    'podium_rewards', v_tournament.podium_rewards,
    'podium_places', v_tournament.podium_places,
    'classes', COALESCE(v_classes, '[]'::JSONB),
    'my_stats', v_my_stats,
    'top_players', COALESCE(v_top_players, '[]'::JSONB)
  );
END;
$$;

COMMENT ON FUNCTION public.get_tournament_details IS
  'Gets full tournament details including creator_id, participating classes, current user stats, and top 10 leaderboard.';
