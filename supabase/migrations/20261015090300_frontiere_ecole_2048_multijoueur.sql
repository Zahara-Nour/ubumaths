-- ============================================================================
-- D18 — frontière d'école : scores 2048 privés, multijoueur borné à l'école
-- ============================================================================
--
-- Mesuré en prod le 2026-10-10 :
--   * « Authenticated users can view 2048 leaderboard » (USING true) : tout compte
--     connecté, de toute école, lisait les scores 2048 de tous (identifiant, meilleur
--     score, parties). Seuls la page du jeu (son propre score) et le classement unifié
--     (game_leaderboard, SECURITY DEFINER, borné à l'école) s'en servent ; la route
--     /api/games/2048/leaderboard qui lisait tout n'avait aucun appelant (supprimée
--     dans la même PR).
--   * join_multiplayer_queue appariait deux élèves sans regarder leur école.
-- Prouvé par tests/integration/frontiere-ecole-2048-multijoueur.test.ts.
--
-- Questions d'accès posées à David (2026-10-10) :
--   * « qui pourra lire les scores 2048 des autres ? » → personne (route retirée) ;
--   * « borner le multijoueur à l'école ? » → oui.
-- En miroir — qui perd quoi : tout compte perd la lecture des scores 2048 d'autrui ;
-- chacun garde le sien (lecture, insertion, mise à jour) ; un élève n'est plus apparié
-- avec un élève d'une autre école.
--
-- Aucune donnée touchée. Définition de join_multiplayer_queue reprise de la prod (md5
-- vérifié le 2026-10-10), une condition ajoutée.
--
-- ROLLBACK :
--   DROP POLICY "Users can view own 2048 scores" ON public.game_2048_scores;
--   CREATE POLICY "Authenticated users can view 2048 leaderboard"
--     ON public.game_2048_scores FOR SELECT TO authenticated USING (true);
--   join_multiplayer_queue : recréer depuis pg_get_functiondef en retirant la ligne
--     « AND public.same_school(student_id) ».
-- ============================================================================

DROP POLICY "Authenticated users can view 2048 leaderboard" ON public.game_2048_scores;

CREATE POLICY "Users can view own 2048 scores"
	ON public.game_2048_scores FOR SELECT TO authenticated
	USING (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.join_multiplayer_queue(p_difficulty text, p_match_type text DEFAULT 'quick'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

  -- Q160 : la colonne s'appelle rank (ranked_elo n'existe pas → 42703), et on
  -- lit la saison courante, celle que crée ensure_player_stats_exist.
  SELECT rank INTO v_rank
  FROM minesweeper_player_stats
  WHERE student_id = v_student_id
    AND season = TO_CHAR(NOW(), 'YYYY-MM');

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
    -- Lecture seule (A2) : un adversaire passé en lecture seule pendant son attente ne
    -- doit pas faire échouer le matchmaking de tous les suivants.
    AND public.has_full_access(student_id)
    -- Frontière d'école (ADR 0002, D18) : seulement un adversaire de la même école.
    AND public.same_school(student_id)
  ORDER BY joined_at ASC  -- First come first served within MMR range
  LIMIT 1;

  IF v_opponent_record.student_id IS NOT NULL THEN
    -- Match found! Create match
    -- Q160 : pgcrypto vit dans le schéma extensions, hors du search_path (42883).
    v_seed := encode(extensions.gen_random_bytes(16), 'hex');  -- Generate random seed

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
$function$;
