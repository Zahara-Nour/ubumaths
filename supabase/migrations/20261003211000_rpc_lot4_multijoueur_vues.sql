-- =============================================================================
-- RPC lot 4 bis : multijoueur du démineur et vues d'annonces réparés (Q160, Q161)
-- =============================================================================
--
-- Décisions de David : Q160 et Q161 → on répare ; Q159 (run_daily_summaries)
-- → on n'y touche pas.
--
-- Q160 — le multijoueur du démineur n'a jamais pu démarrer (3 pannes en série) :
--   * ensure_player_stats_exist : ON CONFLICT (student_id) alors que la clé est
--     (student_id, season) → 42P10. Désormais saison = TO_CHAR(NOW(),'YYYY-MM'),
--     la convention de complete_multiplayer_match / abandon_multiplayer_match.
--   * join_multiplayer_queue : lisait la colonne inexistante ranked_elo (42703),
--     sans filtre de saison → rank de la saison courante ; et gen_random_bytes
--     non préfixé alors que pgcrypto est dans extensions (42883 dès qu'un
--     adversaire est trouvé) → extensions.gen_random_bytes. Le reste du corps
--     est celui de la prod (md5 11351ef5e3a8de3762f4e257c0006bf0).
-- Q161 — record_listing_views_batch : RETURNING … INTO sur plusieurs lignes
--   (erreur avalée par EXCEPTION WHEN OTHERS) → aucune vue enregistrée dès
--   2 annonces. Corrigé ; la garde « soi seul » du lot 4 est gardée. Effet :
--   view_count se remet à compter les vues uniques (1 par élève et annonce).
--
-- Qui gagne quel accès : personne (droits inchangés ; ensure_player_stats_exist
-- reste service_role seul, appelée par join_multiplayer_queue SECURITY DEFINER).
--
-- Ordre : après 20261003210000 (le rollback ci-dessous rend l'état d'après lot
-- 4). Aucun code applicatif ne change.
--
-- Tests : tests/integration/rpc-lot4-hygiene.test.ts
-- =============================================================================

CREATE OR REPLACE FUNCTION public.ensure_player_stats_exist(p_student_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Q160 : la clé est (student_id, season) ; la saison est le mois courant,
  -- comme dans complete_multiplayer_match et abandon_multiplayer_match.
  INSERT INTO public.minesweeper_player_stats (student_id, season)
  VALUES (p_student_id, TO_CHAR(NOW(), 'YYYY-MM'))
  ON CONFLICT (student_id, season) DO NOTHING;
END;
$function$
;

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
$function$
;

CREATE OR REPLACE FUNCTION public.record_listing_views_batch(p_listing_ids uuid[], p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$

BEGIN
  -- Garde (lot 4, Q143) : on ne lit/n'écrit que SON compte. auth.uid() NULL =
  -- appel au client service (anon n'a pas EXECUTE).
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Accès refusé : compte d''un autre utilisateur' USING ERRCODE = '42501';
  END IF;

  -- Corps d'origine, inchangé, dans un bloc imbriqué : son EXCEPTION WHEN
  -- OTHERS n'avale pas le refus ci-dessus.
  DECLARE
    v_new_views INTEGER := 0;
  BEGIN
    -- Q161 : `RETURNING … INTO` sur plusieurs lignes levait « query returned
    -- more than one row », avalé par le EXCEPTION ci-dessous : dès 2 annonces,
    -- aucune vue n'était enregistrée. Désormais : on insère les vues NOUVELLES
    -- (DO NOTHING), on n'incrémente view_count que pour celles-là, puis on
    -- rafraîchit viewed_at des vues déjà connues.
    WITH nouvelles AS (
      INSERT INTO marketplace_listing_views (listing_id, user_id, viewed_at)
      SELECT DISTINCT unnest(p_listing_ids), p_user_id, NOW()
      ON CONFLICT (listing_id, user_id) DO NOTHING
      RETURNING listing_id
    ), compteurs AS (
      UPDATE marketplace_listings ml
      SET view_count = COALESCE(ml.view_count, 0) + 1
      WHERE ml.id IN (SELECT listing_id FROM nouvelles)
      RETURNING ml.id
    )
    SELECT count(*) INTO v_new_views FROM nouvelles;

    UPDATE marketplace_listing_views mlv
    SET viewed_at = NOW()
    WHERE mlv.user_id = p_user_id
      AND mlv.listing_id = ANY(p_listing_ids)
      AND mlv.viewed_at < NOW();

    RETURN json_build_object(
      'success', true,
      'new_views', v_new_views,
      'listing_ids', p_listing_ids
    );

  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG 'Error in record_listing_views_batch: %', SQLERRM;
      RETURN json_build_object(
        'success', false,
        'error', 'Failed to record views',
        'new_views', 0
      );
  END;
END;
$function$
;

-- =============================================================================
-- ROLLBACK (état d'après 20261003210000) :
-- =============================================================================
-- BEGIN;
-- CREATE OR REPLACE FUNCTION public.ensure_player_stats_exist(p_student_id uuid)
--  RETURNS void
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public', 'pg_temp'
-- AS $function$
-- BEGIN
--   INSERT INTO public.minesweeper_player_stats (student_id)
--   VALUES (p_student_id)
--   ON CONFLICT (student_id) DO NOTHING;
-- END;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.join_multiplayer_queue(p_difficulty text, p_match_type text DEFAULT 'quick'::text)
--  RETURNS jsonb
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public', 'pg_temp'
-- AS $function$
-- DECLARE
--   v_student_id UUID := auth.uid();
--   v_rank INTEGER;
--   v_opponent_record RECORD;
--   v_match_id UUID;
--   v_seed TEXT;
-- BEGIN
--   -- Validate authenticated
--   IF v_student_id IS NULL THEN
--     RAISE EXCEPTION 'Not authenticated';
--   END IF;
--
--   -- Validate difficulty
--   IF p_difficulty NOT IN ('beginner', 'intermediate', 'expert') THEN
--     RAISE EXCEPTION 'Invalid difficulty: %', p_difficulty;
--   END IF;
--
--   -- Validate match_type
--   IF p_match_type NOT IN ('quick', 'ranked') THEN
--     RAISE EXCEPTION 'Invalid match_type: %', p_match_type;
--   END IF;
--
--   -- Get player's ELO (ensure stats exist first)
--   PERFORM ensure_player_stats_exist(v_student_id);
--
--   SELECT ranked_elo INTO v_rank
--   FROM minesweeper_player_stats
--   WHERE student_id = v_student_id;
--
--   -- Check if already in queue
--   IF EXISTS (
--     SELECT 1 FROM minesweeper_multiplayer_queue
--     WHERE student_id = v_student_id
--       AND status = 'waiting'
--   ) THEN
--     RAISE EXCEPTION 'Already in queue';
--   END IF;
--
--   -- Check if already in active match
--   IF EXISTS (
--     SELECT 1 FROM minesweeper_multiplayer_matches
--     WHERE (player1_id = v_student_id OR player2_id = v_student_id)
--       AND status IN ('waiting', 'countdown', 'in_progress')
--   ) THEN
--     RAISE EXCEPTION 'Already in active match';
--   END IF;
--
--   -- Try to find opponent (within ±200 ELO, same difficulty & match_type)
--   SELECT
--     student_id,
--     rank,
--     joined_at,
--     id AS queue_id
--   INTO v_opponent_record
--   FROM minesweeper_multiplayer_queue
--   WHERE difficulty = p_difficulty
--     AND match_type = p_match_type
--     AND status = 'waiting'
--     AND student_id != v_student_id
--     AND ABS(rank - v_rank) <= 200  -- MMR tolerance
--   ORDER BY joined_at ASC  -- First come first served within MMR range
--   LIMIT 1;
--
--   IF v_opponent_record.student_id IS NOT NULL THEN
--     -- Match found! Create match
--     v_seed := encode(gen_random_bytes(16), 'hex');  -- Generate random seed
--
--     INSERT INTO minesweeper_multiplayer_matches (
--       match_type,
--       difficulty,
--       seed,
--       player1_id,
--       player2_id,
--       status
--     ) VALUES (
--       p_match_type,
--       p_difficulty,
--       v_seed,
--       v_opponent_record.student_id,  -- Opponent is player 1 (they joined first)
--       v_student_id,                  -- We are player 2
--       'countdown'                     -- Start in countdown phase
--     ) RETURNING id INTO v_match_id;
--
--     -- Mark both players as matched in queue
--     UPDATE minesweeper_multiplayer_queue
--     SET status = 'matched'
--     WHERE student_id IN (v_student_id, v_opponent_record.student_id)
--       AND status = 'waiting';
--
--     -- Initialize game state for both players
--     INSERT INTO minesweeper_multiplayer_game_state (match_id, player_id)
--     VALUES
--       (v_match_id, v_opponent_record.student_id),
--       (v_match_id, v_student_id);
--
--     RETURN jsonb_build_object(
--       'matched', true,
--       'match_id', v_match_id,
--       'opponent_id', v_opponent_record.student_id,
--       'seed', v_seed,
--       'difficulty', p_difficulty,
--       'match_type', p_match_type,
--       'player_number', 2  -- We are player 2
--     );
--   ELSE
--     -- No match found, join queue
--     INSERT INTO minesweeper_multiplayer_queue (
--       student_id,
--       difficulty,
--       match_type,
--       rank,
--       status
--     ) VALUES (
--       v_student_id,
--       p_difficulty,
--       p_match_type,
--       v_rank,
--       'waiting'
--     );
--
--     RETURN jsonb_build_object(
--       'matched', false,
--       'waiting', true,
--       'difficulty', p_difficulty,
--       'match_type', p_match_type,
--       'rank', v_rank
--     );
--   END IF;
-- END;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.record_listing_views_batch(p_listing_ids uuid[], p_user_id uuid)
--  RETURNS json
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public', 'extensions', 'pg_temp'
-- AS $function$
--
-- BEGIN
--   -- Garde (lot 4, Q143) : on ne lit/n'écrit que SON compte. auth.uid() NULL =
--   -- appel au client service (anon n'a pas EXECUTE).
--   IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
--     RAISE EXCEPTION 'Accès refusé : compte d''un autre utilisateur' USING ERRCODE = '42501';
--   END IF;
--
--   -- Corps d'origine, inchangé, dans un bloc imbriqué : son EXCEPTION WHEN
--   -- OTHERS n'avale pas le refus ci-dessus.
--   DECLARE
--     v_new_views INTEGER := 0;
--     v_updated_listings UUID[];
--   BEGIN
--     -- Bulk insert with conflict handling
--     -- Only inserts if no existing record (new unique view)
--     INSERT INTO marketplace_listing_views (listing_id, user_id, viewed_at)
--     SELECT DISTINCT unnest(p_listing_ids), p_user_id, NOW()
--     ON CONFLICT (listing_id, user_id)
--     DO UPDATE SET viewed_at = NOW()
--     RETURNING listing_id INTO v_updated_listings;
--
--     GET DIAGNOSTICS v_new_views = ROW_COUNT;
--
--     -- Update view counters only for actual new views
--     -- Use the returned listing_ids to ensure we only update what was actually inserted
--     IF v_new_views > 0 THEN
--       UPDATE marketplace_listings ml
--       SET view_count = COALESCE(view_count, 0) + 1
--       WHERE id = ANY(
--         SELECT listing_id
--         FROM marketplace_listing_views mlv
--         WHERE mlv.listing_id = ANY(p_listing_ids)
--           AND mlv.user_id = p_user_id
--           AND mlv.viewed_at >= NOW() - INTERVAL '1 second'
--       );
--     END IF;
--
--     RETURN json_build_object(
--       'success', true,
--       'new_views', v_new_views,
--       'listing_ids', p_listing_ids
--     );
--
--   EXCEPTION
--     WHEN OTHERS THEN
--       RAISE LOG 'Error in record_listing_views_batch: %', SQLERRM;
--       RETURN json_build_object(
--         'success', false,
--         'error', 'Failed to record views',
--         'new_views', 0
--       );
--   END;
-- END;
-- $function$
-- ;
-- COMMIT;
