-- =============================================================================
-- RPC lot 4 : hygiène — un élève ne lit plus rien sur le compte d'un autre,
-- search_path figé, tâche de maintenance réparée (fonctions SECURITY DEFINER)
-- =============================================================================
--
-- Décision de David (Q143) : un élève ne lit ni n'écrit plus rien sur le compte
-- d'un autre ; prof et admin gardent leurs écrans. Enjeu faible : compteurs,
-- rangs, statistiques, vues d'annonces.
--
-- Qui gagne quel accès : personne. Qui perd : un élève appelant ces fonctions
-- en RPC sur l'identifiant d'un AUTRE compte (refus 42501) ; tout compte
-- connecté perd les 4 fonctions sans appelant (service_role seul).
--
-- 1. GARDES (corps repris de la prod, seule la garde est ajoutée) :
--      p_user_id = auth.uid(), OU prof/admin (is_teacher_or_admin) :
--        get_user_status, get_deck_stats (le prof lit les stats de ses
--        élèves : decks/[id]/assignments), count_user_notebooks,
--        count_user_python_files, get_2048_user_rank, has_proposal_on_listing
--      p_user_id = auth.uid() seulement (messagerie, vues) :
--        get_private_messages_unread_count, record_listing_views_batch
--      prof/admin seulement : backfill_tournament_scores (page prof des
--        tournois), get_next_export_counter (route prof export-to-classroom)
--      auth.uid() NULL = client service (anon n'a pas EXECUTE) : garde la main.
--    Policies qui appellent ces fonctions, TOUTES avec auth.uid() en argument
--    (vérifié en prod le 2026-10-03) — la garde est donc toujours satisfaite :
--      profiles."Users can update own profile"   get_user_status(auth.uid())
--      python_notebooks."Users can insert own notebooks with limit"
--                                                count_user_notebooks(auth.uid())
--      python_files."Users can insert own python files"
--                                                count_user_python_files(auth.uid())
--      marketplace_listings.marketplace_listings_select_proposer
--                                                has_proposal_on_listing(id, auth.uid())
--    Trois corps ont un EXCEPTION WHEN OTHERS qui aurait avalé le refus
--    (get_user_status → NULL, count_user_* → 999, record_listing_views_batch →
--    success:false) : le corps d'origine passe dans un bloc imbriqué, la garde
--    reste devant. Deux fonctions LANGUAGE sql passent en plpgsql (RAISE
--    impossible en sql) : même requête, même volatilité.
--    md5(prosrc) d'origine, identiques en prod et en local (2026-10-03) :
--      get_private_messages_unread_count 0dcaeeb071bb921bc8f6adea46dd6a29
--      get_user_status                   166679efdf24124dd9f02b000be8670b
--      get_deck_stats                    12ee048fc49b99ee134b06c71765fa3b
--      count_user_notebooks              965ef42742b37dbf053fecaa151df4b2
--      count_user_python_files           8eebe055dfa69095cbf8be9024e4ad28
--      get_2048_user_rank                3c32ce57fe20d8f786570d138ee9445a
--      has_proposal_on_listing           0e8604a56b46e29b191c3ced145cdc9f
--      record_listing_views_batch        39d566f7d0c6f3444bc7740bbf43efaa
--      backfill_tournament_scores        ede614094a699ecbacabede5be9dcae4
--      get_next_export_counter           172749b11087a7a9bae9b62a9fe3edf5
--
-- 2. REVOKE (aucun appelant : ni code, ni policy, ni vue, ni cron ; seule
--    ensure_player_stats_exist est appelée, par join_multiplayer_queue,
--    SECURITY DEFINER propriété de postgres : pas d'impact) :
--      get_unread_count, is_user_restricted, get_mathemo_user_rank,
--      ensure_player_stats_exist.
--
-- 3. TÂCHE CASSÉE recalculate_minesweeper_reference_times (cron
--    hebdomadaire run_recalculate_minesweeper_ref_times, 4 échecs 42702 en
--    prod sur 30 jours) : ORDER BY qualifié. md5 d'origine
--    4d05f36a1f64c4785b00db1f534b1aee. ⚠️ Effet : les temps de référence du
--    démineur seront de nouveau recalculés chaque semaine (médiane bornée par
--    min_bound/max_bound), donc les gidouilles du démineur suivront.
--
-- 3 bis. BUG get_2048_user_rank (vu en écrivant les tests) : user_score
--    renvoyé en integer pour un RETURNS TABLE(... bigint) → 42804 à CHAQUE
--    appel ; la route /api/games/2048/leaderboard loguait l'erreur et
--    n'affichait jamais le rang. Correctif : ::BIGINT.
--
-- 4. search_path : les 206 fonctions SECURITY DEFINER du schéma public sans
--    pg_temp explicite en DERNIÈRE position (sans lui, pg_temp est cherché
--    EN PREMIER pour les tables : une table temporaire homonyme détournerait
--    la fonction). Configuration seulement, aucun corps touché. On AJOUTE
--    pg_temp en fin de liste sans retirer de schéma : la résolution des objets
--    existants est inchangée (public reste ; '' et pg_catalog deviennent
--    pg_catalog, pg_temp — pg_catalog y était déjà implicitement). Liste
--    identique en prod et en local (md5 6769b07f01d4b5754ea5011354feea1e).
--
-- Droits d'origine relevés en prod (proacl), identiques pour les 14 fonctions
-- des points 1 et 2 : {postgres=X, authenticated=X, service_role=X}.
--
-- ORDRE DE LIVRAISON : aucun code ne change — tous les appelants passent déjà
-- leur propre identifiant (user.id de la session), ou sont des écrans prof.
-- La migration peut partir seule, avant ou après n'importe quel déploiement.
--
-- Tests : tests/integration/rpc-lot4-hygiene.test.ts
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Gardes
-- -----------------------------------------------------------------------------
-- ---
-- get_private_messages_unread_count
-- ---
CREATE OR REPLACE FUNCTION public.get_private_messages_unread_count(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$

BEGIN
  -- Garde (lot 4, Q143) : on ne lit/n'écrit que SON compte. auth.uid() NULL =
  -- appel au client service (anon n'a pas EXECUTE).
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Accès refusé : compte d''un autre utilisateur' USING ERRCODE = '42501';
  END IF;

  RETURN (
    SELECT COUNT(*)::INT
    FROM message_inbox
    WHERE recipient_id = p_user_id
      AND read_at IS NULL
      AND deleted = FALSE
      AND status = 'inbox'
  );
END;
$function$
;

-- ---
-- get_user_status
-- ---
CREATE OR REPLACE FUNCTION public.get_user_status(user_id uuid)
 RETURNS user_status
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$

BEGIN
  -- Garde (lot 4, Q143) : SON compte, ou prof/admin (leurs écrans). auth.uid()
  -- NULL = appel au client service (anon n'a pas EXECUTE).
  IF auth.uid() IS NOT NULL AND get_user_status.user_id IS DISTINCT FROM auth.uid()
     AND NOT public.is_teacher_or_admin() THEN
    RAISE EXCEPTION 'Accès refusé : compte d''un autre utilisateur' USING ERRCODE = '42501';
  END IF;

  -- Corps d'origine, inchangé, dans un bloc imbriqué : son EXCEPTION WHEN
  -- OTHERS n'avale pas le refus ci-dessus.
  DECLARE
    v_status user_status;
  BEGIN
    SELECT status INTO v_status
    FROM public.profiles
    WHERE id = user_id
    LIMIT 1;

    RETURN v_status;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN NULL;
  END;
END;
$function$
;

-- ---
-- get_deck_stats
-- ---
CREATE OR REPLACE FUNCTION public.get_deck_stats(p_user_id uuid, p_deck_id uuid)
 RETURNS TABLE(total_cards bigint, due_count bigint, new_count bigint, learning_count bigint, review_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
BEGIN
  -- Garde (lot 4, Q143) : SON compte, ou prof/admin (leurs écrans). auth.uid()
  -- NULL = appel au client service (anon n'a pas EXECUTE).
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid()
     AND NOT public.is_teacher_or_admin() THEN
    RAISE EXCEPTION 'Accès refusé : compte d''un autre utilisateur' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_cards,
    COUNT(*) FILTER (WHERE COALESCE(s.next_review, NOW()) <= NOW())::BIGINT AS due_count,
    COUNT(*) FILTER (WHERE COALESCE(s.state, 'new') = 'new')::BIGINT AS new_count,
    COUNT(*) FILTER (WHERE COALESCE(s.state, 'new') = 'learning')::BIGINT AS learning_count,
    COUNT(*) FILTER (WHERE COALESCE(s.state, 'new') = 'review')::BIGINT AS review_count
  FROM srs_cards c
  LEFT JOIN srs_card_stats s ON (
    s.user_id = p_user_id
    AND s.card_reference_type = c.card_type
    AND (
      (c.card_type = 'template' AND s.card_reference_id::text = c.template_id::text)
      OR (c.card_type = 'custom' AND s.card_reference_id::text = c.id::text)
    )
  )
  WHERE c.deck_id = p_deck_id;
END;
$function$
;

-- ---
-- count_user_notebooks
-- ---
CREATE OR REPLACE FUNCTION public.count_user_notebooks(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$

BEGIN
  -- Garde (lot 4, Q143) : SON compte, ou prof/admin (leurs écrans). auth.uid()
  -- NULL = appel au client service (anon n'a pas EXECUTE).
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid()
     AND NOT public.is_teacher_or_admin() THEN
    RAISE EXCEPTION 'Accès refusé : compte d''un autre utilisateur' USING ERRCODE = '42501';
  END IF;

  -- Corps d'origine, inchangé, dans un bloc imbriqué : son EXCEPTION WHEN
  -- OTHERS n'avale pas le refus ci-dessus.
  DECLARE
      notebook_count INTEGER;
  BEGIN
      SELECT COUNT(*) INTO notebook_count
      FROM python_notebooks
      WHERE author_id = p_user_id;
      RETURN notebook_count;
  EXCEPTION
      WHEN OTHERS THEN
          RETURN 999; -- Return high number to prevent inserts on error
  END;
END;
$function$
;

-- ---
-- count_user_python_files
-- ---
CREATE OR REPLACE FUNCTION public.count_user_python_files(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$

BEGIN
  -- Garde (lot 4, Q143) : SON compte, ou prof/admin (leurs écrans). auth.uid()
  -- NULL = appel au client service (anon n'a pas EXECUTE).
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid()
     AND NOT public.is_teacher_or_admin() THEN
    RAISE EXCEPTION 'Accès refusé : compte d''un autre utilisateur' USING ERRCODE = '42501';
  END IF;

  -- Corps d'origine, inchangé, dans un bloc imbriqué : son EXCEPTION WHEN
  -- OTHERS n'avale pas le refus ci-dessus.
  declare
      file_count integer;
  begin
      select count(*) into file_count
      from python_files
      where owner_id = p_user_id;
      return file_count;
  exception
      when others then
          return 999; -- Return high number to prevent inserts on error
  end;
END;
$function$
;

-- ---
-- get_2048_user_rank
-- ---
CREATE OR REPLACE FUNCTION public.get_2048_user_rank(p_user_id uuid)
 RETURNS TABLE(user_rank bigint, total_players bigint, user_score bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
BEGIN
  -- Garde (lot 4, Q143) : SON compte, ou prof/admin (leurs écrans). auth.uid()
  -- NULL = appel au client service (anon n'a pas EXECUTE).
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid()
     AND NOT public.is_teacher_or_admin() THEN
    RAISE EXCEPTION 'Accès refusé : compte d''un autre utilisateur' USING ERRCODE = '42501';
  END IF;

	RETURN QUERY
	WITH ranked_scores AS (
		SELECT
			user_id,
			best_score,
			RANK() OVER (ORDER BY best_score DESC) AS rank,
			COUNT(*) OVER () AS total
		FROM game_2048_scores
	)
	SELECT
		ranked_scores.rank AS user_rank,
		COALESCE(ranked_scores.total, 0) AS total_players,
		-- Lot 4 : best_score est integer, la fonction promet bigint → 42804 à
		-- chaque appel (le rang n'apparaissait jamais au classement 2048).
		COALESCE(ranked_scores.best_score, 0)::BIGINT AS user_score
	FROM ranked_scores
	WHERE ranked_scores.user_id = p_user_id;
END;
$function$
;

-- ---
-- has_proposal_on_listing
-- ---
CREATE OR REPLACE FUNCTION public.has_proposal_on_listing(p_listing_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$

BEGIN
  -- Garde (lot 4, Q143) : SON compte, ou prof/admin (leurs écrans). auth.uid()
  -- NULL = appel au client service (anon n'a pas EXECUTE).
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid()
     AND NOT public.is_teacher_or_admin() THEN
    RAISE EXCEPTION 'Accès refusé : compte d''un autre utilisateur' USING ERRCODE = '42501';
  END IF;

  RETURN (
    SELECT EXISTS (
      SELECT 1
      FROM marketplace_proposals
      WHERE listing_id = p_listing_id
      AND proposer_id = p_user_id
    )
  );
END;
$function$
;

-- ---
-- record_listing_views_batch
-- ---
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
    v_updated_listings UUID[];
  BEGIN
    -- Bulk insert with conflict handling
    -- Only inserts if no existing record (new unique view)
    INSERT INTO marketplace_listing_views (listing_id, user_id, viewed_at)
    SELECT DISTINCT unnest(p_listing_ids), p_user_id, NOW()
    ON CONFLICT (listing_id, user_id)
    DO UPDATE SET viewed_at = NOW()
    RETURNING listing_id INTO v_updated_listings;

    GET DIAGNOSTICS v_new_views = ROW_COUNT;

    -- Update view counters only for actual new views
    -- Use the returned listing_ids to ensure we only update what was actually inserted
    IF v_new_views > 0 THEN
      UPDATE marketplace_listings ml
      SET view_count = COALESCE(view_count, 0) + 1
      WHERE id = ANY(
        SELECT listing_id
        FROM marketplace_listing_views mlv
        WHERE mlv.listing_id = ANY(p_listing_ids)
          AND mlv.user_id = p_user_id
          AND mlv.viewed_at >= NOW() - INTERVAL '1 second'
      );
    END IF;

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

-- ---
-- backfill_tournament_scores
-- ---
CREATE OR REPLACE FUNCTION public.backfill_tournament_scores(p_tournament_id uuid)
 RETURNS TABLE(updated_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  -- Garde (lot 4, Q143) : réservé au prof/admin. auth.uid() NULL = appel au
  -- client service (anon n'a pas EXECUTE).
  IF auth.uid() IS NOT NULL AND NOT public.is_teacher_or_admin() THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;

  -- Update games that have status = 'won' but score IS NULL
  WITH updated AS (
    UPDATE minesweeper_tournament_games g
    SET
      grid_3bv = calculate_3bv(g.grid_state),
      score = calculate_tournament_score(
        calculate_3bv(g.grid_state),
        g.time_seconds,
        (SELECT public.get_cycle_for_grade(p.grade) FROM profiles p WHERE p.id = g.student_id),
        (SELECT t.difficulty FROM minesweeper_tournaments t WHERE t.id = g.tournament_id)
      )
    WHERE g.tournament_id = p_tournament_id
      AND g.status = 'won'
      AND g.score IS NULL
      AND g.grid_state IS NOT NULL
      AND g.time_seconds IS NOT NULL
    RETURNING 1
  )
  SELECT COUNT(*)::INTEGER INTO v_count FROM updated;

  updated_count := v_count;
  RETURN NEXT;
END;
$function$
;

-- ---
-- get_next_export_counter
-- ---
CREATE OR REPLACE FUNCTION public.get_next_export_counter(p_class_id uuid, p_export_date date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
  v_counter integer;
BEGIN
  -- Garde (lot 4, Q143) : réservé au prof/admin. auth.uid() NULL = appel au
  -- client service (anon n'a pas EXECUTE).
  IF auth.uid() IS NOT NULL AND NOT public.is_teacher_or_admin() THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;

  -- Upsert: insert new row with counter=1, or increment existing
  INSERT INTO public.whiteboard_export_counters (class_id, export_date, counter)
  VALUES (p_class_id, p_export_date, 1)
  ON CONFLICT (class_id, export_date)
  DO UPDATE SET
    counter = whiteboard_export_counters.counter + 1,
    updated_at = now()
  RETURNING counter INTO v_counter;

  RETURN v_counter;
END;
$function$
;

REVOKE EXECUTE ON FUNCTION
  public.get_private_messages_unread_count(uuid),
  public.get_user_status(uuid),
  public.get_deck_stats(uuid, uuid),
  public.count_user_notebooks(uuid),
  public.count_user_python_files(uuid),
  public.get_2048_user_rank(uuid),
  public.has_proposal_on_listing(uuid, uuid),
  public.record_listing_views_batch(uuid[], uuid),
  public.backfill_tournament_scores(uuid),
  public.get_next_export_counter(uuid, date)
FROM PUBLIC, anon;

-- -----------------------------------------------------------------------------
-- 2. Sans appelant : service_role seul (+ postgres propriétaire)
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION
  public.get_unread_count(uuid, uuid),
  public.is_user_restricted(uuid, uuid),
  public.get_mathemo_user_rank(uuid),
  public.ensure_player_stats_exist(uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.get_unread_count(uuid, uuid),
  public.is_user_restricted(uuid, uuid),
  public.get_mathemo_user_rank(uuid),
  public.ensure_player_stats_exist(uuid)
TO service_role;

-- -----------------------------------------------------------------------------
-- 3. recalculate_minesweeper_reference_times : 42702 (cycle ambigu)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_minesweeper_reference_times()
 RETURNS TABLE(cycle text, difficulty text, old_time integer, new_time integer, sample_count integer, updated boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_week_start DATE;
  v_week_end DATE;
  v_median_time NUMERIC;
  v_count INTEGER;
  v_current_ref RECORD;
  v_new_time INTEGER;
  v_updated BOOLEAN;
BEGIN
  -- Calculate 4-week window ending yesterday
  v_week_end := CURRENT_DATE - INTERVAL '1 day';
  v_week_start := v_week_end - INTERVAL '4 weeks';

  -- Process each cycle/difficulty combination (single query, 15 rows)
  FOR v_current_ref IN
    SELECT * FROM public.minesweeper_reference_times mrt
    ORDER BY
      -- Lot 4 : colonnes qualifiées. Non qualifiées, `cycle` et `difficulty`
      -- entraient en conflit avec les colonnes de sortie (RETURNS TABLE) :
      -- erreur 42702 à chaque exécution du cron hebdomadaire.
      CASE mrt.cycle
        WHEN 'cycle_2' THEN 1
        WHEN 'cycle_3' THEN 2
        WHEN 'cycle_4' THEN 3
        WHEN 'seconde' THEN 4
        WHEN 'cycle_terminal' THEN 5
      END,
      CASE mrt.difficulty
        WHEN 'beginner' THEN 1
        WHEN 'intermediate' THEN 2
        WHEN 'expert' THEN 3
      END
  LOOP

    -- Calculate median time for this cycle/difficulty
    -- Join minesweeper_games with profiles to get the student's grade and cycle
    SELECT
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY mg.time_seconds),
      COUNT(*)
    INTO v_median_time, v_count
    FROM public.minesweeper_games mg
    JOIN public.profiles p ON mg.student_id = p.id
    WHERE mg.status = 'won'
      AND mg.student_id IS NOT NULL
      AND mg.completed_at >= v_week_start
      AND mg.completed_at < v_week_end + INTERVAL '1 day'
      AND public.get_cycle_for_grade(p.grade) = v_current_ref.cycle
      AND mg.difficulty = v_current_ref.difficulty;

    v_updated := FALSE;

    -- Only update if enough samples
    IF v_count >= v_current_ref.min_samples AND v_median_time IS NOT NULL THEN
      -- Apply bounds
      v_new_time := GREATEST(
        v_current_ref.min_bound,
        LEAST(v_current_ref.max_bound, ROUND(v_median_time)::INTEGER)
      );

      -- Update reference time
      UPDATE public.minesweeper_reference_times
      SET
        reference_time = v_new_time,
        sample_count = v_count,
        calculated_at = NOW(),
        updated_at = NOW()
      WHERE minesweeper_reference_times.cycle = v_current_ref.cycle
        AND minesweeper_reference_times.difficulty = v_current_ref.difficulty;

      -- Record history
      INSERT INTO public.minesweeper_reference_times_history
        (cycle, difficulty, reference_time, sample_count, week_start, week_end)
      VALUES
        (v_current_ref.cycle, v_current_ref.difficulty, v_new_time, v_count, v_week_start, v_week_end);

      v_updated := TRUE;
    ELSE
      v_new_time := v_current_ref.reference_time;

      -- Update sample count even if not updating reference_time
      UPDATE public.minesweeper_reference_times
      SET
        sample_count = COALESCE(v_count, 0),
        updated_at = NOW()
      WHERE minesweeper_reference_times.cycle = v_current_ref.cycle
        AND minesweeper_reference_times.difficulty = v_current_ref.difficulty;
    END IF;

    -- Return result row
    cycle := v_current_ref.cycle;
    difficulty := v_current_ref.difficulty;
    old_time := v_current_ref.reference_time;
    new_time := v_new_time;
    sample_count := COALESCE(v_count, 0);
    updated := v_updated;
    RETURN NEXT;
  END LOOP;
END;
$function$
;

-- -----------------------------------------------------------------------------
-- 4. search_path : pg_temp explicite, en dernier (configuration seule)
-- -----------------------------------------------------------------------------
ALTER FUNCTION public.abandon_tournament_game(p_game_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.accept_proposal_atomic(p_proposal_id uuid, p_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.add_buddy_xp(p_student_id uuid, p_xp integer, p_is_milestone boolean) SET search_path = public, pg_temp;
ALTER FUNCTION public.add_student_gidouilles(p_student_id uuid, p_amount integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.add_student_to_class_chat() SET search_path = public, pg_temp;
ALTER FUNCTION public.add_warning(p_student_id uuid, p_class_id uuid, p_academic_period_id uuid, p_warning_type text) SET search_path = public, pg_temp;
ALTER FUNCTION public.add_warnings_bulk(p_student_id uuid, p_class_id uuid, p_academic_period_id uuid, p_warning_types text[]) SET search_path = public, pg_temp;
ALTER FUNCTION public.app_is_anti_fraud_enabled() SET search_path = public, pg_temp;
ALTER FUNCTION public.approve_vip_card(p_student_id uuid, p_instance_id text) SET search_path = public, pg_temp;
ALTER FUNCTION public.are_classmates(p_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.audit_trigger_func() SET search_path = public, pg_temp;
ALTER FUNCTION public.auto_accept_exact_proposal(p_proposal_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.auto_activate_scheduled_tournaments() SET search_path = public, pg_temp;
ALTER FUNCTION public.auto_complete_ended_tournaments() SET search_path = public, pg_temp;
ALTER FUNCTION public.auto_expire_listings() SET search_path = public, pg_temp;
ALTER FUNCTION public.award_achievement_manual(p_student_id uuid, p_achievement_id text, p_reason text) SET search_path = public, pg_temp;
ALTER FUNCTION public.award_random_vip_card(p_student_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.award_vip_card_no_cost(p_student_id uuid, p_card_id text) SET search_path = public, pg_temp;
ALTER FUNCTION public.award_vip_card_no_cost(p_student_id uuid, p_card_id text, p_source text, p_extra_metadata jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.award_vip_cards_with_filters(p_student_id uuid, p_count integer, p_filters jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.award_weekly_best_bonuses(p_week_start date, p_week_end date) SET search_path = public, pg_temp;
ALTER FUNCTION public.award_weekly_reward(p_student_id uuid, p_class_id uuid, p_week_start date, p_week_end date, p_gidouilles integer, p_reason text) SET search_path = public, pg_temp;
ALTER FUNCTION public.backfill_tournament_scores(p_tournament_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.calculate_daily_challenge_gidouilles(p_difficulty text, p_time_seconds integer, p_student_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.calculate_minesweeper_gidouilles(p_difficulty text, p_time_seconds integer, p_student_id uuid, p_hints_used integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.calculate_minesweeper_gidouilles(p_difficulty text, p_time_seconds integer, p_student_id uuid, p_hints_used integer, p_reduced_penalty_hints integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.can_moderate_message(moderator_uuid uuid, message_uuid uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.can_participate_in_tournament(p_tournament_id uuid, p_student_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.can_view_student_profile(student_profile_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_achievement_prerequisites(p_student_id uuid, p_achievement_id text) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_and_increment_rate_limit(p_key text, p_max_count integer, p_window_seconds integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_and_unlock_achievements(p_game_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_marketplace_enabled(p_student_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_match_status() SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_abandoned_minesweeper_games() SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_account_deletion_audit() SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_expired_cache() SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_old_audit_logs(retention_days integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_old_job_runs() SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_stale_queue_entries() SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_stale_trades() SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_stuck_job_runs() SET search_path = public, pg_temp;
ALTER FUNCTION public.complete_job_run(p_run_id uuid, p_status text, p_error_message text, p_metadata jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.complete_minesweeper_game(p_game_id uuid, p_grid_state jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.complete_tournament_game(p_game_id uuid, p_status text, p_time_seconds integer, p_grid_state jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.compute_daily_summary(p_student_id uuid, p_class_id uuid, p_summary_date date) SET search_path = public, pg_temp;
ALTER FUNCTION public.count_student_active_cards(p_student_id uuid, p_card_id text, p_lock_row boolean) SET search_path = public, pg_temp;
ALTER FUNCTION public.count_user_notebooks(p_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.count_user_python_files(p_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.create_1on1_chat(p_user1_id uuid, p_user2_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.create_error_report_notification() SET search_path = public, pg_temp;
ALTER FUNCTION public.create_initial_template_version() SET search_path = public, pg_temp;
ALTER FUNCTION public.create_tournament(p_name text, p_difficulty text, p_start_date timestamp with time zone, p_end_date timestamp with time zone, p_class_ids uuid[], p_description text, p_top_x_games integer, p_podium_rewards jsonb, p_podium_places integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.delete_attachment(p_attachment_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.delete_user_account(p_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.discard_vip_cards(p_student_id uuid, p_instance_ids text[], p_metadata jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.draw_multiple_vip_cards(p_student_id uuid, p_count integer, p_payment_method text, p_gidouilles_cost integer, p_vip_card_instance_id uuid, p_force_rarity text, p_min_rarity text, p_exclude_card_ids text[], p_only_cards_with_actions boolean) SET search_path = public, pg_temp;
ALTER FUNCTION public.ensure_player_stats_exist(p_student_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.execute_trade(p_trade_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.exercise_has_valid_share_token(exercise_uuid uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.finalize_tournament(p_tournament_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_achievement_leaderboard(p_limit integer, p_context text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_all_exercise_assignments() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_allowed_recipients(p_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_class_journal_by_share_token(p_token text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_classes_by_user_grade() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_consent_info(p_token uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_conversation_participants(p_conversation_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_exercise_by_share_token(p_token text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_match_state(p_match_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_message_attachments(p_message_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_message_context_for_moderation(p_message_id uuid, p_before_count integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_message_details(p_message_id uuid, p_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_message_reaction_counts(p_message_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_message_thread(p_thread_root_id uuid, p_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_messages_paginated(p_conversation_id uuid, p_limit integer, p_before_id uuid, p_before_timestamp timestamp with time zone) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_pending_reports_count() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_private_messages_unread_count(p_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_reaction_users(p_message_id uuid, p_emoji text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_reports_for_moderation(p_status text, p_limit integer, p_offset integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_shop_item_detail(p_student_id uuid, p_template_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_shop_items(p_student_id uuid, p_category text, p_rarity text, p_search text, p_active_only boolean, p_sort_by text, p_sort_order text, p_limit integer, p_offset integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_student_week_best(p_student_id uuid, p_school_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_students_in_class(class_uuid uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_students_in_class_by_grade(target_class_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_teacher_classes_for_messaging() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_teacher_classes_with_data(p_is_test_mode boolean) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_teacher_classes_with_students(p_is_test_mode boolean) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_teacher_exercise_assignments() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_tournament_details(p_tournament_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_unread_count(p_conversation_id uuid, p_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_conversations(p_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_inbox(p_user_id uuid, p_status text, p_folder_id uuid, p_limit integer, p_offset integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_moderation_history(p_user_id uuid, p_limit integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_sent_messages(p_user_id uuid, p_limit integer, p_offset integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_status(user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_worksheet_by_share_token(p_token text, p_worksheet_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.grant_parental_consent(p_token uuid, p_ip inet, p_user_agent text) SET search_path = public, pg_temp;
ALTER FUNCTION public.grant_specific_vip_card(p_student_id uuid, p_card_id text, p_count integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.grant_vip_cards_after_action(p_student_id uuid, p_action_instance_id text, p_discard_ids text[], p_award_card_ids text[], p_source text, p_discard_metadata jsonb, p_award_metadata jsonb) SET search_path = pg_catalog, pg_temp;
ALTER FUNCTION public.guard_profile_role_change() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.has_individual_assignment(p_assignment_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_rate_limit(p_key text, p_expires_at timestamp with time zone) SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_template_instantiation_count() SET search_path = public, pg_temp;
ALTER FUNCTION public.initialize_default_categories(p_class_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.insert_tutor_messages(p_conversation_id uuid, p_user_id uuid, p_messages jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_assignment_creator(p_assignment_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_class_student(p_class_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_class_teacher(p_class_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_classmate(p_class_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_conversation_participant(p_conversation_id uuid, p_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_riddle_assigned_to_student(p_riddle_id uuid, p_student_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_riddle_of_the_day(p_riddle_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_student() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_teacher_for_shared_coursework(p_shared_coursework_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_teacher_of_class(p_class_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_teacher_of_student(p_student_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_user_restricted(p_user_id uuid, p_conversation_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.join_multiplayer_queue(p_difficulty text, p_match_type text) SET search_path = public, pg_temp;
ALTER FUNCTION public.leave_multiplayer_queue() SET search_path = public, pg_temp;
ALTER FUNCTION public.lock_cards(p_student_id uuid, p_card_ids text[], p_entity_id uuid, p_lock_type text) SET search_path = public, pg_temp;
ALTER FUNCTION public.log_achievements_to_events() SET search_path = public, pg_temp;
ALTER FUNCTION public.log_bonus_history_to_events() SET search_path = public, pg_temp;
ALTER FUNCTION public.log_gidouilles_activity_to_events() SET search_path = public, pg_temp;
ALTER FUNCTION public.log_moderation_action(p_action text, p_target_type text, p_target_id uuid, p_reason text, p_metadata jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.log_vip_card_changes() SET search_path = public, pg_temp;
ALTER FUNCTION public.log_vip_cards_to_events() SET search_path = public, pg_temp;
ALTER FUNCTION public.log_warning_added_to_events() SET search_path = public, pg_temp;
ALTER FUNCTION public.log_warning_removed_to_events() SET search_path = public, pg_temp;
ALTER FUNCTION public.mark_conversation_read(p_conversation_id uuid, p_user_id uuid, p_message_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.mark_message_as_read(p_message_id uuid, p_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.move_message_to_folder(p_message_id uuid, p_user_id uuid, p_folder_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.orphan_chapter_documents() SET search_path = public, pg_temp;
ALTER FUNCTION public.populate_shared_material_names() SET search_path = public, pg_temp;
ALTER FUNCTION public.process_achievement_event(p_event_type text, p_student_id uuid, p_event_data jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.process_weekly_rewards(p_week_start date, p_week_end date, p_class_ids uuid[]) SET search_path = public, pg_temp;
ALTER FUNCTION public.purchase_shop_item(p_student_id uuid, p_template_id uuid, p_quantity integer, p_purchase_context jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.purchase_vip_card(p_student_id uuid, p_card_id text) SET search_path = public, pg_temp;
ALTER FUNCTION public.purge_pending_student_on_activation() SET search_path = public, pg_temp;
ALTER FUNCTION public.recalculate_minesweeper_reference_times() SET search_path = public, pg_temp;
ALTER FUNCTION public.record_game_reward(p_student_id uuid, p_game_type text, p_game_id uuid, p_theoretical_reward numeric, p_school_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.record_minesweeper_loss(p_game_id uuid, p_grid_state jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.redistribute_tournament_rewards(p_tournament_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.refresh_achievement_stats() SET search_path = public, pg_temp;
ALTER FUNCTION public.refresh_achievement_stats_if_needed(p_force boolean, p_max_staleness_minutes integer, p_max_changes integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.reject_vip_card(p_student_id uuid, p_instance_id text) SET search_path = public, pg_temp;
ALTER FUNCTION public.remove_student_vip_card(p_student_id uuid, p_card_id text) SET search_path = public, pg_temp;
ALTER FUNCTION public.remove_vip_card(p_student_id uuid, p_card_id text, p_instance_id text, p_reason text) SET search_path = public, pg_temp;
ALTER FUNCTION public.remove_warnings_bulk(p_student_id uuid, p_class_id uuid, p_academic_period_id uuid, p_warning_types text[], p_deletion_context jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.reorder_worksheet_exercises(p_worksheet_id uuid, p_exercises jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.reorder_worksheet_sections(p_worksheet_id uuid, p_sections jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.report_message(p_message_id uuid, p_reason text, p_details text) SET search_path = public, pg_temp;
ALTER FUNCTION public.request_vip_card_activation(p_student_id uuid, p_instance_id text) SET search_path = public, pg_temp;
ALTER FUNCTION public.resolve_open_class_by_code(p_code text) SET search_path = public, pg_temp;
ALTER FUNCTION public.restore_vip_card_instance(p_student_id uuid, p_instance_id text, p_snapshot jsonb, p_expected_used_at text) SET search_path = pg_catalog, pg_temp;
ALTER FUNCTION public.review_report(p_report_id uuid, p_new_status text, p_review_notes text, p_delete_message boolean) SET search_path = public, pg_temp;
ALTER FUNCTION public.rls_auto_enable() SET search_path = pg_catalog, pg_temp;
ALTER FUNCTION public.run_cleanup_all() SET search_path = public, pg_temp;
ALTER FUNCTION public.run_cleanup_expired_data() SET search_path = public, pg_temp;
ALTER FUNCTION public.run_daily_summaries() SET search_path = public, pg_temp;
ALTER FUNCTION public.run_flag_stale_python_rechecks() SET search_path = public, pg_temp;
ALTER FUNCTION public.run_recalculate_minesweeper_ref_times() SET search_path = public, pg_temp;
ALTER FUNCTION public.run_weekly_best_bonuses() SET search_path = public, pg_temp;
ALTER FUNCTION public.run_weekly_rewards() SET search_path = public, pg_temp;
ALTER FUNCTION public.search_private_messages(p_user_id uuid, p_query text, p_search_in text, p_has_attachments boolean, p_sender_name text, p_date_from timestamp with time zone, p_date_to timestamp with time zone, p_limit integer, p_offset integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.search_users_unaccent(search_term text, result_limit integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.sell_vip_card(p_student_id uuid, p_card_instance_id text) SET search_path = public, pg_temp;
ALTER FUNCTION public.send_private_message(p_sender_id uuid, p_recipient_ids uuid[], p_subject text, p_content jsonb, p_is_group_message boolean, p_class_id uuid, p_parent_message_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.shares_tournament(target_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.soft_delete_message(p_message_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.soft_delete_warning(p_warning_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.start_job_run(p_job_name text, p_metadata jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.start_match(p_match_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.start_tournament_game(p_tournament_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.submit_riddle_attempt(p_riddle_id uuid, p_student_id uuid, p_submitted_answer jsonb, p_is_correct boolean) SET search_path = public, pg_temp;
ALTER FUNCTION public.teacher_owns_riddle(p_riddle_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.toggle_message_star(p_message_id uuid, p_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.toggle_reaction(p_message_id uuid, p_emoji text) SET search_path = public, pg_temp;
ALTER FUNCTION public.unlock_cards(p_entity_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_achievement_progress(p_student_id uuid, p_achievement_id text, p_delta numeric, p_context_key text) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_class_gidouilles(p_class_id uuid, p_delta integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_folder_message_count() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_game_state(p_match_id uuid, p_cells_revealed integer, p_flags_used integer, p_time_elapsed integer, p_last_action jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_message_search_index() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_message_status(p_message_id uuid, p_user_id uuid, p_status text) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_search_index_on_attachment() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_shared_material_course_name() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_shared_material_teacher_name() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_student_bonus(p_student_id uuid, p_class_id uuid, p_delta integer, p_reason text, p_created_by uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_student_gidouilles(p_student_id uuid, p_class_id uuid, p_delta integer, p_reason text, p_created_by uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_student_gidouilles(p_student_id uuid, p_delta integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_tutor_conversation_stats(p_conversation_id uuid, p_user_id uuid, p_message_count integer, p_max_help_level integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_vip_cards_history() SET search_path = public, pg_temp;
ALTER FUNCTION public.use_2048_power(p_power_type text) SET search_path = public, pg_temp;
ALTER FUNCTION public.use_detector(p_game_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.use_hint(p_game_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.use_item(p_inventory_id uuid, p_context text, p_usage_data jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.use_mathemo_power(p_power_type text) SET search_path = public, pg_temp;
ALTER FUNCTION public.use_minesweeper_undo(p_game_id uuid, p_grid_state jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.use_vip_card(p_student_id uuid, p_instance_id text, p_card_id text, p_metadata jsonb, p_context text) SET search_path = public, pg_temp;
ALTER FUNCTION public.validate_1on1_chat_creation(p_user1_id uuid, p_user2_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.validate_attachment_upload(p_message_id uuid, p_user_id uuid, p_file_size integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.validate_class_message_recipients(sender_uuid uuid, class_uuid uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.validate_message_recipients(sender_uuid uuid, recipient_uuids uuid[]) SET search_path = public, pg_temp;
ALTER FUNCTION public.validate_riddle_attempt(p_attempt_id uuid, p_is_correct boolean) SET search_path = public, pg_temp;

-- =============================================================================
-- ROLLBACK (à exécuter tel quel, dans une transaction) — retour exact à l'état
-- de la prod du 2026-10-03 : corps d'origine, droits d'origine, search_path
-- d'origine.
-- =============================================================================
-- BEGIN;
-- GRANT EXECUTE ON FUNCTION
--   public.get_unread_count(uuid, uuid),
--   public.is_user_restricted(uuid, uuid),
--   public.get_mathemo_user_rank(uuid),
--   public.ensure_player_stats_exist(uuid)
-- TO authenticated;
--
-- CREATE OR REPLACE FUNCTION public.get_private_messages_unread_count(p_user_id uuid)
--  RETURNS integer
--  LANGUAGE sql
--  SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
--   SELECT COUNT(*)::INT
--   FROM message_inbox
--   WHERE recipient_id = p_user_id
--     AND read_at IS NULL
--     AND deleted = FALSE
--     AND status = 'inbox';
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.get_user_status(user_id uuid)
--  RETURNS user_status
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- DECLARE
--   v_status user_status;
-- BEGIN
--   SELECT status INTO v_status
--   FROM public.profiles
--   WHERE id = user_id
--   LIMIT 1;
--
--   RETURN v_status;
-- EXCEPTION
--   WHEN OTHERS THEN
--     RETURN NULL;
-- END;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.get_deck_stats(p_user_id uuid, p_deck_id uuid)
--  RETURNS TABLE(total_cards bigint, due_count bigint, new_count bigint, learning_count bigint, review_count bigint)
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public', 'extensions', 'pg_temp'
-- AS $function$
-- BEGIN
--   RETURN QUERY
--   SELECT
--     COUNT(*)::BIGINT AS total_cards,
--     COUNT(*) FILTER (WHERE COALESCE(s.next_review, NOW()) <= NOW())::BIGINT AS due_count,
--     COUNT(*) FILTER (WHERE COALESCE(s.state, 'new') = 'new')::BIGINT AS new_count,
--     COUNT(*) FILTER (WHERE COALESCE(s.state, 'new') = 'learning')::BIGINT AS learning_count,
--     COUNT(*) FILTER (WHERE COALESCE(s.state, 'new') = 'review')::BIGINT AS review_count
--   FROM srs_cards c
--   LEFT JOIN srs_card_stats s ON (
--     s.user_id = p_user_id
--     AND s.card_reference_type = c.card_type
--     AND (
--       (c.card_type = 'template' AND s.card_reference_id::text = c.template_id::text)
--       OR (c.card_type = 'custom' AND s.card_reference_id::text = c.id::text)
--     )
--   )
--   WHERE c.deck_id = p_deck_id;
-- END;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.count_user_notebooks(p_user_id uuid)
--  RETURNS integer
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- DECLARE
--     notebook_count INTEGER;
-- BEGIN
--     SELECT COUNT(*) INTO notebook_count
--     FROM python_notebooks
--     WHERE author_id = p_user_id;
--     RETURN notebook_count;
-- EXCEPTION
--     WHEN OTHERS THEN
--         RETURN 999; -- Return high number to prevent inserts on error
-- END;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.count_user_python_files(p_user_id uuid)
--  RETURNS integer
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- declare
--     file_count integer;
-- begin
--     select count(*) into file_count
--     from python_files
--     where owner_id = p_user_id;
--     return file_count;
-- exception
--     when others then
--         return 999; -- Return high number to prevent inserts on error
-- end;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.get_2048_user_rank(p_user_id uuid)
--  RETURNS TABLE(user_rank bigint, total_players bigint, user_score bigint)
--  LANGUAGE plpgsql
--  STABLE SECURITY DEFINER
--  SET search_path TO 'public', 'extensions', 'pg_temp'
-- AS $function$
-- BEGIN
-- 	RETURN QUERY
-- 	WITH ranked_scores AS (
-- 		SELECT
-- 			user_id,
-- 			best_score,
-- 			RANK() OVER (ORDER BY best_score DESC) AS rank,
-- 			COUNT(*) OVER () AS total
-- 		FROM game_2048_scores
-- 	)
-- 	SELECT
-- 		ranked_scores.rank AS user_rank,
-- 		COALESCE(ranked_scores.total, 0) AS total_players,
-- 		COALESCE(ranked_scores.best_score, 0) AS user_score
-- 	FROM ranked_scores
-- 	WHERE ranked_scores.user_id = p_user_id;
-- END;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.has_proposal_on_listing(p_listing_id uuid, p_user_id uuid)
--  RETURNS boolean
--  LANGUAGE sql
--  STABLE SECURITY DEFINER
--  SET search_path TO 'public', 'extensions', 'pg_temp'
-- AS $function$
--   SELECT EXISTS (
--     SELECT 1
--     FROM marketplace_proposals
--     WHERE listing_id = p_listing_id
--     AND proposer_id = p_user_id
--   );
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.record_listing_views_batch(p_listing_ids uuid[], p_user_id uuid)
--  RETURNS json
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public', 'extensions', 'pg_temp'
-- AS $function$
-- DECLARE
--   v_new_views INTEGER := 0;
--   v_updated_listings UUID[];
-- BEGIN
--   -- Bulk insert with conflict handling
--   -- Only inserts if no existing record (new unique view)
--   INSERT INTO marketplace_listing_views (listing_id, user_id, viewed_at)
--   SELECT DISTINCT unnest(p_listing_ids), p_user_id, NOW()
--   ON CONFLICT (listing_id, user_id)
--   DO UPDATE SET viewed_at = NOW()
--   RETURNING listing_id INTO v_updated_listings;
--
--   GET DIAGNOSTICS v_new_views = ROW_COUNT;
--
--   -- Update view counters only for actual new views
--   -- Use the returned listing_ids to ensure we only update what was actually inserted
--   IF v_new_views > 0 THEN
--     UPDATE marketplace_listings ml
--     SET view_count = COALESCE(view_count, 0) + 1
--     WHERE id = ANY(
--       SELECT listing_id
--       FROM marketplace_listing_views mlv
--       WHERE mlv.listing_id = ANY(p_listing_ids)
--         AND mlv.user_id = p_user_id
--         AND mlv.viewed_at >= NOW() - INTERVAL '1 second'
--     );
--   END IF;
--
--   RETURN json_build_object(
--     'success', true,
--     'new_views', v_new_views,
--     'listing_ids', p_listing_ids
--   );
--
-- EXCEPTION
--   WHEN OTHERS THEN
--     RAISE LOG 'Error in record_listing_views_batch: %', SQLERRM;
--     RETURN json_build_object(
--       'success', false,
--       'error', 'Failed to record views',
--       'new_views', 0
--     );
-- END;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.backfill_tournament_scores(p_tournament_id uuid)
--  RETURNS TABLE(updated_count integer)
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- DECLARE
--   v_count INTEGER;
-- BEGIN
--   -- Update games that have status = 'won' but score IS NULL
--   WITH updated AS (
--     UPDATE minesweeper_tournament_games g
--     SET
--       grid_3bv = calculate_3bv(g.grid_state),
--       score = calculate_tournament_score(
--         calculate_3bv(g.grid_state),
--         g.time_seconds,
--         (SELECT public.get_cycle_for_grade(p.grade) FROM profiles p WHERE p.id = g.student_id),
--         (SELECT t.difficulty FROM minesweeper_tournaments t WHERE t.id = g.tournament_id)
--       )
--     WHERE g.tournament_id = p_tournament_id
--       AND g.status = 'won'
--       AND g.score IS NULL
--       AND g.grid_state IS NOT NULL
--       AND g.time_seconds IS NOT NULL
--     RETURNING 1
--   )
--   SELECT COUNT(*)::INTEGER INTO v_count FROM updated;
--
--   updated_count := v_count;
--   RETURN NEXT;
-- END;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.get_next_export_counter(p_class_id uuid, p_export_date date)
--  RETURNS integer
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public', 'extensions', 'pg_temp'
-- AS $function$
-- DECLARE
--   v_counter integer;
-- BEGIN
--   -- Upsert: insert new row with counter=1, or increment existing
--   INSERT INTO public.whiteboard_export_counters (class_id, export_date, counter)
--   VALUES (p_class_id, p_export_date, 1)
--   ON CONFLICT (class_id, export_date)
--   DO UPDATE SET
--     counter = whiteboard_export_counters.counter + 1,
--     updated_at = now()
--   RETURNING counter INTO v_counter;
--
--   RETURN v_counter;
-- END;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.recalculate_minesweeper_reference_times()
--  RETURNS TABLE(cycle text, difficulty text, old_time integer, new_time integer, sample_count integer, updated boolean)
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- DECLARE
--   v_week_start DATE;
--   v_week_end DATE;
--   v_median_time NUMERIC;
--   v_count INTEGER;
--   v_current_ref RECORD;
--   v_new_time INTEGER;
--   v_updated BOOLEAN;
-- BEGIN
--   -- Calculate 4-week window ending yesterday
--   v_week_end := CURRENT_DATE - INTERVAL '1 day';
--   v_week_start := v_week_end - INTERVAL '4 weeks';
--
--   -- Process each cycle/difficulty combination (single query, 15 rows)
--   FOR v_current_ref IN
--     SELECT * FROM public.minesweeper_reference_times
--     ORDER BY
--       CASE cycle
--         WHEN 'cycle_2' THEN 1
--         WHEN 'cycle_3' THEN 2
--         WHEN 'cycle_4' THEN 3
--         WHEN 'seconde' THEN 4
--         WHEN 'cycle_terminal' THEN 5
--       END,
--       CASE difficulty
--         WHEN 'beginner' THEN 1
--         WHEN 'intermediate' THEN 2
--         WHEN 'expert' THEN 3
--       END
--   LOOP
--
--     -- Calculate median time for this cycle/difficulty
--     -- Join minesweeper_games with profiles to get the student's grade and cycle
--     SELECT
--       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY mg.time_seconds),
--       COUNT(*)
--     INTO v_median_time, v_count
--     FROM public.minesweeper_games mg
--     JOIN public.profiles p ON mg.student_id = p.id
--     WHERE mg.status = 'won'
--       AND mg.student_id IS NOT NULL
--       AND mg.completed_at >= v_week_start
--       AND mg.completed_at < v_week_end + INTERVAL '1 day'
--       AND public.get_cycle_for_grade(p.grade) = v_current_ref.cycle
--       AND mg.difficulty = v_current_ref.difficulty;
--
--     v_updated := FALSE;
--
--     -- Only update if enough samples
--     IF v_count >= v_current_ref.min_samples AND v_median_time IS NOT NULL THEN
--       -- Apply bounds
--       v_new_time := GREATEST(
--         v_current_ref.min_bound,
--         LEAST(v_current_ref.max_bound, ROUND(v_median_time)::INTEGER)
--       );
--
--       -- Update reference time
--       UPDATE public.minesweeper_reference_times
--       SET
--         reference_time = v_new_time,
--         sample_count = v_count,
--         calculated_at = NOW(),
--         updated_at = NOW()
--       WHERE minesweeper_reference_times.cycle = v_current_ref.cycle
--         AND minesweeper_reference_times.difficulty = v_current_ref.difficulty;
--
--       -- Record history
--       INSERT INTO public.minesweeper_reference_times_history
--         (cycle, difficulty, reference_time, sample_count, week_start, week_end)
--       VALUES
--         (v_current_ref.cycle, v_current_ref.difficulty, v_new_time, v_count, v_week_start, v_week_end);
--
--       v_updated := TRUE;
--     ELSE
--       v_new_time := v_current_ref.reference_time;
--
--       -- Update sample count even if not updating reference_time
--       UPDATE public.minesweeper_reference_times
--       SET
--         sample_count = COALESCE(v_count, 0),
--         updated_at = NOW()
--       WHERE minesweeper_reference_times.cycle = v_current_ref.cycle
--         AND minesweeper_reference_times.difficulty = v_current_ref.difficulty;
--     END IF;
--
--     -- Return result row
--     cycle := v_current_ref.cycle;
--     difficulty := v_current_ref.difficulty;
--     old_time := v_current_ref.reference_time;
--     new_time := v_new_time;
--     sample_count := COALESCE(v_count, 0);
--     updated := v_updated;
--     RETURN NEXT;
--   END LOOP;
-- END;
-- $function$
-- ;
--
-- ALTER FUNCTION public.abandon_tournament_game(p_game_id uuid) SET search_path = public;
-- ALTER FUNCTION public.accept_proposal_atomic(p_proposal_id uuid, p_user_id uuid) SET search_path = public;
-- ALTER FUNCTION public.add_buddy_xp(p_student_id uuid, p_xp integer, p_is_milestone boolean) SET search_path = public;
-- ALTER FUNCTION public.add_student_gidouilles(p_student_id uuid, p_amount integer) SET search_path = public;
-- ALTER FUNCTION public.add_student_to_class_chat() SET search_path = public;
-- ALTER FUNCTION public.add_warning(p_student_id uuid, p_class_id uuid, p_academic_period_id uuid, p_warning_type text) SET search_path = public;
-- ALTER FUNCTION public.add_warnings_bulk(p_student_id uuid, p_class_id uuid, p_academic_period_id uuid, p_warning_types text[]) SET search_path = public;
-- ALTER FUNCTION public.app_is_anti_fraud_enabled() SET search_path = public;
-- ALTER FUNCTION public.approve_vip_card(p_student_id uuid, p_instance_id text) SET search_path = public;
-- ALTER FUNCTION public.are_classmates(p_user_id uuid) SET search_path = public;
-- ALTER FUNCTION public.audit_trigger_func() SET search_path = public;
-- ALTER FUNCTION public.auto_accept_exact_proposal(p_proposal_id uuid) SET search_path = public;
-- ALTER FUNCTION public.auto_activate_scheduled_tournaments() SET search_path = public;
-- ALTER FUNCTION public.auto_complete_ended_tournaments() SET search_path = public;
-- ALTER FUNCTION public.auto_expire_listings() SET search_path = public;
-- ALTER FUNCTION public.award_achievement_manual(p_student_id uuid, p_achievement_id text, p_reason text) SET search_path = public;
-- ALTER FUNCTION public.award_random_vip_card(p_student_id uuid) SET search_path = public;
-- ALTER FUNCTION public.award_vip_card_no_cost(p_student_id uuid, p_card_id text) SET search_path = public;
-- ALTER FUNCTION public.award_vip_card_no_cost(p_student_id uuid, p_card_id text, p_source text, p_extra_metadata jsonb) SET search_path = public;
-- ALTER FUNCTION public.award_vip_cards_with_filters(p_student_id uuid, p_count integer, p_filters jsonb) SET search_path = public;
-- ALTER FUNCTION public.award_weekly_best_bonuses(p_week_start date, p_week_end date) SET search_path = public;
-- ALTER FUNCTION public.award_weekly_reward(p_student_id uuid, p_class_id uuid, p_week_start date, p_week_end date, p_gidouilles integer, p_reason text) SET search_path = public;
-- ALTER FUNCTION public.backfill_tournament_scores(p_tournament_id uuid) SET search_path = public;
-- ALTER FUNCTION public.calculate_daily_challenge_gidouilles(p_difficulty text, p_time_seconds integer, p_student_id uuid) SET search_path = public;
-- ALTER FUNCTION public.calculate_minesweeper_gidouilles(p_difficulty text, p_time_seconds integer, p_student_id uuid, p_hints_used integer) SET search_path = public;
-- ALTER FUNCTION public.calculate_minesweeper_gidouilles(p_difficulty text, p_time_seconds integer, p_student_id uuid, p_hints_used integer, p_reduced_penalty_hints integer) SET search_path = public;
-- ALTER FUNCTION public.can_moderate_message(moderator_uuid uuid, message_uuid uuid) SET search_path = public;
-- ALTER FUNCTION public.can_participate_in_tournament(p_tournament_id uuid, p_student_id uuid) SET search_path = public;
-- ALTER FUNCTION public.can_view_student_profile(student_profile_id uuid) SET search_path = public;
-- ALTER FUNCTION public.check_achievement_prerequisites(p_student_id uuid, p_achievement_id text) SET search_path = public;
-- ALTER FUNCTION public.check_and_increment_rate_limit(p_key text, p_max_count integer, p_window_seconds integer) SET search_path = public;
-- ALTER FUNCTION public.check_and_unlock_achievements(p_game_id uuid) SET search_path = public;
-- ALTER FUNCTION public.check_marketplace_enabled(p_student_id uuid) SET search_path = public;
-- ALTER FUNCTION public.check_match_status() SET search_path = public;
-- ALTER FUNCTION public.cleanup_abandoned_minesweeper_games() SET search_path = public;
-- ALTER FUNCTION public.cleanup_account_deletion_audit() SET search_path = public;
-- ALTER FUNCTION public.cleanup_expired_cache() SET search_path = public;
-- ALTER FUNCTION public.cleanup_old_audit_logs(retention_days integer) SET search_path = public;
-- ALTER FUNCTION public.cleanup_old_job_runs() SET search_path = public;
-- ALTER FUNCTION public.cleanup_stale_queue_entries() SET search_path = public;
-- ALTER FUNCTION public.cleanup_stale_trades() SET search_path = public;
-- ALTER FUNCTION public.cleanup_stuck_job_runs() SET search_path = public;
-- ALTER FUNCTION public.complete_job_run(p_run_id uuid, p_status text, p_error_message text, p_metadata jsonb) SET search_path = public;
-- ALTER FUNCTION public.complete_minesweeper_game(p_game_id uuid, p_grid_state jsonb) SET search_path = public;
-- ALTER FUNCTION public.complete_tournament_game(p_game_id uuid, p_status text, p_time_seconds integer, p_grid_state jsonb) SET search_path = public;
-- ALTER FUNCTION public.compute_daily_summary(p_student_id uuid, p_class_id uuid, p_summary_date date) SET search_path = public;
-- ALTER FUNCTION public.count_student_active_cards(p_student_id uuid, p_card_id text, p_lock_row boolean) SET search_path = public;
-- ALTER FUNCTION public.count_user_notebooks(p_user_id uuid) SET search_path = public;
-- ALTER FUNCTION public.count_user_python_files(p_user_id uuid) SET search_path = public;
-- ALTER FUNCTION public.create_1on1_chat(p_user1_id uuid, p_user2_id uuid) SET search_path = public;
-- ALTER FUNCTION public.create_error_report_notification() SET search_path = public;
-- ALTER FUNCTION public.create_initial_template_version() SET search_path = public;
-- ALTER FUNCTION public.create_tournament(p_name text, p_difficulty text, p_start_date timestamp with time zone, p_end_date timestamp with time zone, p_class_ids uuid[], p_description text, p_top_x_games integer, p_podium_rewards jsonb, p_podium_places integer) SET search_path = public;
-- ALTER FUNCTION public.delete_attachment(p_attachment_id uuid) SET search_path = public;
-- ALTER FUNCTION public.delete_user_account(p_user_id uuid) SET search_path = public;
-- ALTER FUNCTION public.discard_vip_cards(p_student_id uuid, p_instance_ids text[], p_metadata jsonb) SET search_path = public;
-- ALTER FUNCTION public.draw_multiple_vip_cards(p_student_id uuid, p_count integer, p_payment_method text, p_gidouilles_cost integer, p_vip_card_instance_id uuid, p_force_rarity text, p_min_rarity text, p_exclude_card_ids text[], p_only_cards_with_actions boolean) SET search_path = public;
-- ALTER FUNCTION public.ensure_player_stats_exist(p_student_id uuid) SET search_path = public;
-- ALTER FUNCTION public.execute_trade(p_trade_id uuid) SET search_path = public;
-- ALTER FUNCTION public.exercise_has_valid_share_token(exercise_uuid uuid) SET search_path = public;
-- ALTER FUNCTION public.finalize_tournament(p_tournament_id uuid) SET search_path = public;
-- ALTER FUNCTION public.get_achievement_leaderboard(p_limit integer, p_context text) SET search_path = public;
-- ALTER FUNCTION public.get_all_exercise_assignments() SET search_path = public;
-- ALTER FUNCTION public.get_allowed_recipients(p_user_id uuid) SET search_path = public;
-- ALTER FUNCTION public.get_class_journal_by_share_token(p_token text) SET search_path = public;
-- ALTER FUNCTION public.get_classes_by_user_grade() SET search_path = public;
-- ALTER FUNCTION public.get_consent_info(p_token uuid) SET search_path = public;
-- ALTER FUNCTION public.get_conversation_participants(p_conversation_id uuid) SET search_path = public;
-- ALTER FUNCTION public.get_exercise_by_share_token(p_token text) SET search_path = public;
-- ALTER FUNCTION public.get_match_state(p_match_id uuid) SET search_path = public;
-- ALTER FUNCTION public.get_message_attachments(p_message_id uuid) SET search_path = public;
-- ALTER FUNCTION public.get_message_context_for_moderation(p_message_id uuid, p_before_count integer) SET search_path = public;
-- ALTER FUNCTION public.get_message_details(p_message_id uuid, p_user_id uuid) SET search_path = public;
-- ALTER FUNCTION public.get_message_reaction_counts(p_message_id uuid) SET search_path = public;
-- ALTER FUNCTION public.get_message_thread(p_thread_root_id uuid, p_user_id uuid) SET search_path = public;
-- ALTER FUNCTION public.get_messages_paginated(p_conversation_id uuid, p_limit integer, p_before_id uuid, p_before_timestamp timestamp with time zone) SET search_path = public;
-- ALTER FUNCTION public.get_pending_reports_count() SET search_path = public;
-- ALTER FUNCTION public.get_private_messages_unread_count(p_user_id uuid) SET search_path = public;
-- ALTER FUNCTION public.get_reaction_users(p_message_id uuid, p_emoji text) SET search_path = public;
-- ALTER FUNCTION public.get_reports_for_moderation(p_status text, p_limit integer, p_offset integer) SET search_path = public;
-- ALTER FUNCTION public.get_shop_item_detail(p_student_id uuid, p_template_id uuid) SET search_path = public;
-- ALTER FUNCTION public.get_shop_items(p_student_id uuid, p_category text, p_rarity text, p_search text, p_active_only boolean, p_sort_by text, p_sort_order text, p_limit integer, p_offset integer) SET search_path = public;
-- ALTER FUNCTION public.get_student_week_best(p_student_id uuid, p_school_id uuid) SET search_path = public;
-- ALTER FUNCTION public.get_students_in_class(class_uuid uuid) SET search_path = public;
-- ALTER FUNCTION public.get_students_in_class_by_grade(target_class_id uuid) SET search_path = public;
-- ALTER FUNCTION public.get_teacher_classes_for_messaging() SET search_path = public;
-- ALTER FUNCTION public.get_teacher_classes_with_data(p_is_test_mode boolean) SET search_path = public;
-- ALTER FUNCTION public.get_teacher_classes_with_students(p_is_test_mode boolean) SET search_path = public;
-- ALTER FUNCTION public.get_teacher_exercise_assignments() SET search_path = public;
-- ALTER FUNCTION public.get_tournament_details(p_tournament_id uuid) SET search_path = public;
-- ALTER FUNCTION public.get_unread_count(p_conversation_id uuid, p_user_id uuid) SET search_path = public;
-- ALTER FUNCTION public.get_user_conversations(p_user_id uuid) SET search_path = public;
-- ALTER FUNCTION public.get_user_inbox(p_user_id uuid, p_status text, p_folder_id uuid, p_limit integer, p_offset integer) SET search_path = public;
-- ALTER FUNCTION public.get_user_moderation_history(p_user_id uuid, p_limit integer) SET search_path = public;
-- ALTER FUNCTION public.get_user_sent_messages(p_user_id uuid, p_limit integer, p_offset integer) SET search_path = public;
-- ALTER FUNCTION public.get_user_status(user_id uuid) SET search_path = public;
-- ALTER FUNCTION public.get_worksheet_by_share_token(p_token text, p_worksheet_id uuid) SET search_path = public;
-- ALTER FUNCTION public.grant_parental_consent(p_token uuid, p_ip inet, p_user_agent text) SET search_path = public;
-- ALTER FUNCTION public.grant_specific_vip_card(p_student_id uuid, p_card_id text, p_count integer) SET search_path = public;
-- ALTER FUNCTION public.grant_vip_cards_after_action(p_student_id uuid, p_action_instance_id text, p_discard_ids text[], p_award_card_ids text[], p_source text, p_discard_metadata jsonb, p_award_metadata jsonb) SET search_path = '';
-- ALTER FUNCTION public.guard_profile_role_change() SET search_path = public;
-- ALTER FUNCTION public.handle_new_user() SET search_path = public;
-- ALTER FUNCTION public.has_individual_assignment(p_assignment_id uuid) SET search_path = public;
-- ALTER FUNCTION public.increment_rate_limit(p_key text, p_expires_at timestamp with time zone) SET search_path = public;
-- ALTER FUNCTION public.increment_template_instantiation_count() SET search_path = public;
-- ALTER FUNCTION public.initialize_default_categories(p_class_id uuid) SET search_path = public;
-- ALTER FUNCTION public.insert_tutor_messages(p_conversation_id uuid, p_user_id uuid, p_messages jsonb) SET search_path = public;
-- ALTER FUNCTION public.is_assignment_creator(p_assignment_id uuid) SET search_path = public;
-- ALTER FUNCTION public.is_class_student(p_class_id uuid) SET search_path = public;
-- ALTER FUNCTION public.is_class_teacher(p_class_id uuid) SET search_path = public;
-- ALTER FUNCTION public.is_classmate(p_class_id uuid) SET search_path = public;
-- ALTER FUNCTION public.is_conversation_participant(p_conversation_id uuid, p_user_id uuid) SET search_path = public;
-- ALTER FUNCTION public.is_riddle_assigned_to_student(p_riddle_id uuid, p_student_id uuid) SET search_path = public;
-- ALTER FUNCTION public.is_riddle_of_the_day(p_riddle_id uuid) SET search_path = public;
-- ALTER FUNCTION public.is_student() SET search_path = public;
-- ALTER FUNCTION public.is_teacher_for_shared_coursework(p_shared_coursework_id uuid) SET search_path = public;
-- ALTER FUNCTION public.is_teacher_of_class(p_class_id uuid) SET search_path = public;
-- ALTER FUNCTION public.is_teacher_of_student(p_student_id uuid) SET search_path = public;
-- ALTER FUNCTION public.is_user_restricted(p_user_id uuid, p_conversation_id uuid) SET search_path = public;
-- ALTER FUNCTION public.join_multiplayer_queue(p_difficulty text, p_match_type text) SET search_path = public;
-- ALTER FUNCTION public.leave_multiplayer_queue() SET search_path = public;
-- ALTER FUNCTION public.lock_cards(p_student_id uuid, p_card_ids text[], p_entity_id uuid, p_lock_type text) SET search_path = public;
-- ALTER FUNCTION public.log_achievements_to_events() SET search_path = public;
-- ALTER FUNCTION public.log_bonus_history_to_events() SET search_path = public;
-- ALTER FUNCTION public.log_gidouilles_activity_to_events() SET search_path = public;
-- ALTER FUNCTION public.log_moderation_action(p_action text, p_target_type text, p_target_id uuid, p_reason text, p_metadata jsonb) SET search_path = public;
-- ALTER FUNCTION public.log_vip_card_changes() SET search_path = public;
-- ALTER FUNCTION public.log_vip_cards_to_events() SET search_path = public;
-- ALTER FUNCTION public.log_warning_added_to_events() SET search_path = public;
-- ALTER FUNCTION public.log_warning_removed_to_events() SET search_path = public;
-- ALTER FUNCTION public.mark_conversation_read(p_conversation_id uuid, p_user_id uuid, p_message_id uuid) SET search_path = public;
-- ALTER FUNCTION public.mark_message_as_read(p_message_id uuid, p_user_id uuid) SET search_path = public;
-- ALTER FUNCTION public.move_message_to_folder(p_message_id uuid, p_user_id uuid, p_folder_id uuid) SET search_path = public;
-- ALTER FUNCTION public.orphan_chapter_documents() SET search_path = public;
-- ALTER FUNCTION public.populate_shared_material_names() SET search_path = public;
-- ALTER FUNCTION public.process_achievement_event(p_event_type text, p_student_id uuid, p_event_data jsonb) SET search_path = public;
-- ALTER FUNCTION public.process_weekly_rewards(p_week_start date, p_week_end date, p_class_ids uuid[]) SET search_path = public;
-- ALTER FUNCTION public.purchase_shop_item(p_student_id uuid, p_template_id uuid, p_quantity integer, p_purchase_context jsonb) SET search_path = public;
-- ALTER FUNCTION public.purchase_vip_card(p_student_id uuid, p_card_id text) SET search_path = public;
-- ALTER FUNCTION public.purge_pending_student_on_activation() SET search_path = public;
-- ALTER FUNCTION public.recalculate_minesweeper_reference_times() SET search_path = public;
-- ALTER FUNCTION public.record_game_reward(p_student_id uuid, p_game_type text, p_game_id uuid, p_theoretical_reward numeric, p_school_id uuid) SET search_path = public;
-- ALTER FUNCTION public.record_minesweeper_loss(p_game_id uuid, p_grid_state jsonb) SET search_path = public;
-- ALTER FUNCTION public.redistribute_tournament_rewards(p_tournament_id uuid) SET search_path = public;
-- ALTER FUNCTION public.refresh_achievement_stats() SET search_path = public;
-- ALTER FUNCTION public.refresh_achievement_stats_if_needed(p_force boolean, p_max_staleness_minutes integer, p_max_changes integer) SET search_path = public;
-- ALTER FUNCTION public.reject_vip_card(p_student_id uuid, p_instance_id text) SET search_path = public;
-- ALTER FUNCTION public.remove_student_vip_card(p_student_id uuid, p_card_id text) SET search_path = public;
-- ALTER FUNCTION public.remove_vip_card(p_student_id uuid, p_card_id text, p_instance_id text, p_reason text) SET search_path = public;
-- ALTER FUNCTION public.remove_warnings_bulk(p_student_id uuid, p_class_id uuid, p_academic_period_id uuid, p_warning_types text[], p_deletion_context jsonb) SET search_path = public;
-- ALTER FUNCTION public.reorder_worksheet_exercises(p_worksheet_id uuid, p_exercises jsonb) SET search_path = public;
-- ALTER FUNCTION public.reorder_worksheet_sections(p_worksheet_id uuid, p_sections jsonb) SET search_path = public;
-- ALTER FUNCTION public.report_message(p_message_id uuid, p_reason text, p_details text) SET search_path = public;
-- ALTER FUNCTION public.request_vip_card_activation(p_student_id uuid, p_instance_id text) SET search_path = public;
-- ALTER FUNCTION public.resolve_open_class_by_code(p_code text) SET search_path = public;
-- ALTER FUNCTION public.restore_vip_card_instance(p_student_id uuid, p_instance_id text, p_snapshot jsonb, p_expected_used_at text) SET search_path = '';
-- ALTER FUNCTION public.review_report(p_report_id uuid, p_new_status text, p_review_notes text, p_delete_message boolean) SET search_path = public;
-- ALTER FUNCTION public.rls_auto_enable() SET search_path = pg_catalog;
-- ALTER FUNCTION public.run_cleanup_all() SET search_path = public;
-- ALTER FUNCTION public.run_cleanup_expired_data() SET search_path = public;
-- ALTER FUNCTION public.run_daily_summaries() SET search_path = public;
-- ALTER FUNCTION public.run_flag_stale_python_rechecks() SET search_path = public;
-- ALTER FUNCTION public.run_recalculate_minesweeper_ref_times() SET search_path = public;
-- ALTER FUNCTION public.run_weekly_best_bonuses() SET search_path = public;
-- ALTER FUNCTION public.run_weekly_rewards() SET search_path = public;
-- ALTER FUNCTION public.search_private_messages(p_user_id uuid, p_query text, p_search_in text, p_has_attachments boolean, p_sender_name text, p_date_from timestamp with time zone, p_date_to timestamp with time zone, p_limit integer, p_offset integer) SET search_path = public;
-- ALTER FUNCTION public.search_users_unaccent(search_term text, result_limit integer) SET search_path = public;
-- ALTER FUNCTION public.sell_vip_card(p_student_id uuid, p_card_instance_id text) SET search_path = public;
-- ALTER FUNCTION public.send_private_message(p_sender_id uuid, p_recipient_ids uuid[], p_subject text, p_content jsonb, p_is_group_message boolean, p_class_id uuid, p_parent_message_id uuid) SET search_path = public;
-- ALTER FUNCTION public.shares_tournament(target_user_id uuid) SET search_path = public;
-- ALTER FUNCTION public.soft_delete_message(p_message_id uuid) SET search_path = public;
-- ALTER FUNCTION public.soft_delete_warning(p_warning_id uuid) SET search_path = public;
-- ALTER FUNCTION public.start_job_run(p_job_name text, p_metadata jsonb) SET search_path = public;
-- ALTER FUNCTION public.start_match(p_match_id uuid) SET search_path = public;
-- ALTER FUNCTION public.start_tournament_game(p_tournament_id uuid) SET search_path = public;
-- ALTER FUNCTION public.submit_riddle_attempt(p_riddle_id uuid, p_student_id uuid, p_submitted_answer jsonb, p_is_correct boolean) SET search_path = public;
-- ALTER FUNCTION public.teacher_owns_riddle(p_riddle_id uuid) SET search_path = public;
-- ALTER FUNCTION public.toggle_message_star(p_message_id uuid, p_user_id uuid) SET search_path = public;
-- ALTER FUNCTION public.toggle_reaction(p_message_id uuid, p_emoji text) SET search_path = public;
-- ALTER FUNCTION public.unlock_cards(p_entity_id uuid) SET search_path = public;
-- ALTER FUNCTION public.update_achievement_progress(p_student_id uuid, p_achievement_id text, p_delta numeric, p_context_key text) SET search_path = public;
-- ALTER FUNCTION public.update_class_gidouilles(p_class_id uuid, p_delta integer) SET search_path = public;
-- ALTER FUNCTION public.update_folder_message_count() SET search_path = public;
-- ALTER FUNCTION public.update_game_state(p_match_id uuid, p_cells_revealed integer, p_flags_used integer, p_time_elapsed integer, p_last_action jsonb) SET search_path = public;
-- ALTER FUNCTION public.update_message_search_index() SET search_path = public;
-- ALTER FUNCTION public.update_message_status(p_message_id uuid, p_user_id uuid, p_status text) SET search_path = public;
-- ALTER FUNCTION public.update_search_index_on_attachment() SET search_path = public;
-- ALTER FUNCTION public.update_shared_material_course_name() SET search_path = public;
-- ALTER FUNCTION public.update_shared_material_teacher_name() SET search_path = public;
-- ALTER FUNCTION public.update_student_bonus(p_student_id uuid, p_class_id uuid, p_delta integer, p_reason text, p_created_by uuid) SET search_path = public;
-- ALTER FUNCTION public.update_student_gidouilles(p_student_id uuid, p_class_id uuid, p_delta integer, p_reason text, p_created_by uuid) SET search_path = public;
-- ALTER FUNCTION public.update_student_gidouilles(p_student_id uuid, p_delta integer) SET search_path = public;
-- ALTER FUNCTION public.update_tutor_conversation_stats(p_conversation_id uuid, p_user_id uuid, p_message_count integer, p_max_help_level integer) SET search_path = public;
-- ALTER FUNCTION public.update_vip_cards_history() SET search_path = public;
-- ALTER FUNCTION public.use_2048_power(p_power_type text) SET search_path = public;
-- ALTER FUNCTION public.use_detector(p_game_id uuid) SET search_path = public;
-- ALTER FUNCTION public.use_hint(p_game_id uuid) SET search_path = public;
-- ALTER FUNCTION public.use_item(p_inventory_id uuid, p_context text, p_usage_data jsonb) SET search_path = public;
-- ALTER FUNCTION public.use_mathemo_power(p_power_type text) SET search_path = public;
-- ALTER FUNCTION public.use_minesweeper_undo(p_game_id uuid, p_grid_state jsonb) SET search_path = public;
-- ALTER FUNCTION public.use_vip_card(p_student_id uuid, p_instance_id text, p_card_id text, p_metadata jsonb, p_context text) SET search_path = public;
-- ALTER FUNCTION public.validate_1on1_chat_creation(p_user1_id uuid, p_user2_id uuid) SET search_path = public;
-- ALTER FUNCTION public.validate_attachment_upload(p_message_id uuid, p_user_id uuid, p_file_size integer) SET search_path = public;
-- ALTER FUNCTION public.validate_class_message_recipients(sender_uuid uuid, class_uuid uuid) SET search_path = public;
-- ALTER FUNCTION public.validate_message_recipients(sender_uuid uuid, recipient_uuids uuid[]) SET search_path = public;
-- ALTER FUNCTION public.validate_riddle_attempt(p_attempt_id uuid, p_is_correct boolean) SET search_path = public;
-- COMMIT;
