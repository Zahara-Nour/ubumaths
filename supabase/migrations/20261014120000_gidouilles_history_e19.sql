-- ============================================================================
-- E19 — récompenses de tournoi et de multijoueur ; récompenses automatiques et
--       lecture seule
-- ============================================================================
--
-- gidouilles_history a été renommée gidouilles_activity (20260103235000), mais quatre
-- fonctions vivantes y écrivaient encore → 42P01 (prouvé par
-- tests/integration/gidouilles-tournois-multijoueur.test.ts). Mesuré en prod le
-- 2026-10-10 : aucun tournoi finalisé depuis le renommage (3 l'avaient été le 02/01),
-- aucun match multijoueur jamais joué → personne n'a été lésé ; le prochain tournoi
-- aurait échoué.
--
-- Les deux matchs multijoueur n'écrivaient QUE dans le journal (colonnes amount et
-- description, inexistantes) : on ajoute le crédit du solde, comme les tournois.
-- (update_student_gidouilles n'est pas utilisable ici : sa garde refuse un élève.)
--
-- Décision de David (2026-10-10, A2) : les récompenses AUTOMATIQUES sautent les élèves
-- en lecture seule — run_weekly_rewards et award_weekly_best_bonuses filtrent par
-- has_full_access (créée par 20261014110000). Le prof peut toujours en donner à la main.
--
-- Les deux matchs avaient un second défaut : sans statistiques de saison, le classement
-- par défaut était posé par ROW(1500), qui perd le nom du champ rank → 42703. Remplacé
-- par SELECT 1500 AS rank INTO ….
--
-- Hors périmètre, à trancher : process_weekly_rewards et purchase_shop_item écrivent
-- aussi dans gidouilles_history mais n'ont AUCUN appelant (ni code, ni cron) ; les
-- supprimer est destructif → question à David.
--
-- Toutes les définitions sont reprises de la prod (md5 identique au local, vérifié le
-- 2026-10-10), seules les lignes commentées « E19 » / « Lecture seule » changent.
--
-- Additive : redéfinitions de fonctions, aucune donnée touchée.
-- ROLLBACK : recréer chaque fonction depuis sa définition précédente
--   (pg_get_functiondef avant migration, ou le baseline + migrations antérieures).
-- ============================================================================

-- finalize_tournament : journal dans gidouilles_activity (le solde était déjà crédité).
CREATE OR REPLACE FUNCTION public.finalize_tournament(p_tournament_id uuid)
 RETURNS TABLE(success boolean, rewards_distributed integer, reference_updates integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_tournament RECORD;
  v_standing RECORD;
  v_reward INTEGER;
  v_rewards_count INTEGER := 0;
  v_reference_count INTEGER := 0;
BEGIN
  -- Step 1: Get and validate tournament
  SELECT * INTO v_tournament
  FROM public.minesweeper_tournaments
  WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  -- Only creator or admin can finalize
  IF v_tournament.creator_id != auth.uid() THEN
    -- Check if admin
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Only tournament creator or admin can finalize';
    END IF;
  END IF;

  -- Check tournament is active or past end date
  IF v_tournament.status NOT IN ('active', 'scheduled') THEN
    RAISE EXCEPTION 'Tournament already finalized or cancelled';
  END IF;

  -- Step 2: Distribute rewards to podium
  FOR v_standing IN
    SELECT s.student_id, s.position
    FROM public.minesweeper_tournament_standings s
    WHERE s.tournament_id = p_tournament_id
      AND s.position <= v_tournament.podium_places
    ORDER BY s.position
  LOOP
    -- Get reward amount for this position
    v_reward := (v_tournament.podium_rewards->>v_standing.position::TEXT)::INTEGER;

    IF v_reward IS NOT NULL AND v_reward > 0 THEN
      -- Award gidouilles
      UPDATE public.profiles
      SET gidouilles = COALESCE(gidouilles, 0) + v_reward
      WHERE id = v_standing.student_id;

      -- Record in history
      INSERT INTO public.gidouilles_activity (student_id, delta, reason)
      VALUES (
        v_standing.student_id,
        v_reward,
        'Tournament ' || v_tournament.name || ' - Position #' || v_standing.position
      );

      v_rewards_count := v_rewards_count + 1;
    END IF;
  END LOOP;

  -- Step 3: Update 3BV reference values with tournament data
  WITH tournament_stats AS (
    SELECT
      public.get_cycle_for_grade(p.grade) AS cycle,
      t.difficulty,
      AVG(g.grid_3bv::NUMERIC / GREATEST(1, g.time_seconds)) AS avg_3bvs,
      COUNT(*) AS new_samples
    FROM public.minesweeper_tournament_games g
    JOIN public.minesweeper_tournaments t ON t.id = g.tournament_id
    JOIN public.profiles p ON p.id = g.student_id
    WHERE g.tournament_id = p_tournament_id
      AND g.status = 'won'
      AND g.grid_3bv IS NOT NULL
      AND g.time_seconds IS NOT NULL
      AND public.get_cycle_for_grade(p.grade) IS NOT NULL
    GROUP BY public.get_cycle_for_grade(p.grade), t.difficulty
  ),
  updated AS (
    UPDATE public.minesweeper_tournament_3bv_reference ref
    SET
      reference_3bvs = CASE
        WHEN ref.sample_count + ts.new_samples > 0 THEN
          (ref.reference_3bvs * ref.sample_count + ts.avg_3bvs * ts.new_samples)
          / (ref.sample_count + ts.new_samples)
        ELSE ref.reference_3bvs
      END,
      sample_count = ref.sample_count + ts.new_samples,
      updated_at = NOW()
    FROM tournament_stats ts
    WHERE ref.cycle = ts.cycle AND ref.difficulty = ts.difficulty
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_reference_count FROM updated;

  -- Step 4: Mark tournament as completed
  UPDATE public.minesweeper_tournaments
  SET status = 'completed', updated_at = NOW()
  WHERE id = p_tournament_id;

  -- Return results
  success := TRUE;
  rewards_distributed := v_rewards_count;
  reference_updates := v_reference_count;
  RETURN NEXT;
END;
$function$;

-- redistribute_tournament_rewards : journal dans gidouilles_activity (le solde était déjà crédité).
CREATE OR REPLACE FUNCTION public.redistribute_tournament_rewards(p_tournament_id uuid)
 RETURNS TABLE(success boolean, rewards_distributed integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_tournament RECORD;
  v_standing RECORD;
  v_reward INTEGER;
  v_rewards_count INTEGER := 0;
BEGIN
  -- Get tournament
  SELECT * INTO v_tournament
  FROM public.minesweeper_tournaments
  WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  -- Only creator or admin can redistribute
  IF v_tournament.creator_id != auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Only tournament creator or admin can redistribute rewards';
    END IF;
  END IF;

  -- Check tournament is completed
  IF v_tournament.status != 'completed' THEN
    RAISE EXCEPTION 'Can only redistribute rewards for completed tournaments';
  END IF;

  -- Check if rewards were already distributed (check gidouilles_activity)
  IF EXISTS (
    SELECT 1 FROM public.gidouilles_activity
    WHERE reason LIKE 'Tournament ' || v_tournament.name || ' - Position #%'
  ) THEN
    RAISE EXCEPTION 'Rewards have already been distributed for this tournament';
  END IF;

  -- Distribute rewards to podium
  FOR v_standing IN
    SELECT s.student_id, s.position
    FROM public.minesweeper_tournament_standings s
    WHERE s.tournament_id = p_tournament_id
      AND s.position <= v_tournament.podium_places
    ORDER BY s.position
  LOOP
    -- Get reward amount for this position
    v_reward := (v_tournament.podium_rewards->>v_standing.position::TEXT)::INTEGER;

    IF v_reward IS NOT NULL AND v_reward > 0 THEN
      -- Award gidouilles
      UPDATE public.profiles
      SET gidouilles = COALESCE(gidouilles, 0) + v_reward
      WHERE id = v_standing.student_id;

      -- Record in history
      INSERT INTO public.gidouilles_activity (student_id, delta, reason)
      VALUES (
        v_standing.student_id,
        v_reward,
        'Tournament ' || v_tournament.name || ' - Position #' || v_standing.position
      );

      v_rewards_count := v_rewards_count + 1;
    END IF;
  END LOOP;

  success := TRUE;
  rewards_distributed := v_rewards_count;
  RETURN NEXT;
END;
$function$;

-- complete_multiplayer_match
CREATE OR REPLACE FUNCTION public.complete_multiplayer_match(p_match_id uuid, p_time_seconds integer, p_grid_state jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
  v_student_id UUID;
  v_match RECORD;
  v_opponent_id UUID;
  v_base_gidouilles INTEGER;
  v_bonus_gidouilles INTEGER := 0;
  v_total_gidouilles INTEGER;
  v_elo_change INTEGER;
  v_winner_stats RECORD;
  v_loser_stats RECORD;
  v_season TEXT;
  v_difficulty_config RECORD;
BEGIN
  -- Get authenticated student ID
  v_student_id := auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  -- Fetch match details WITH LOCK to prevent race condition
  SELECT * INTO v_match
  FROM minesweeper_multiplayer_matches
  WHERE id = p_match_id
  FOR UPDATE;  -- CRITICAL: Locks row until transaction completes

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match introuvable';
  END IF;

  -- Verify player is a participant
  IF v_match.player1_id != v_student_id AND v_match.player2_id != v_student_id THEN
    RAISE EXCEPTION 'Vous ne participez pas à ce match';
  END IF;

  -- Verify match is in progress
  IF v_match.status != 'in_progress' THEN
    RAISE EXCEPTION 'Le match n''est pas en cours (status: %)', v_match.status;
  END IF;

  -- Verify match hasn't already been completed
  IF v_match.winner_id IS NOT NULL THEN
    RAISE EXCEPTION 'Le match est déjà terminé';
  END IF;

  -- Validate time bounds (min 10s, max 2 hours)
  IF p_time_seconds < 10 OR p_time_seconds > 7200 THEN
    RAISE EXCEPTION 'Temps invalide: %s secondes', p_time_seconds;
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
    RAISE EXCEPTION 'La grille soumise n''est pas une victoire valide';
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

  -- Get current ELO ratings (filter by current season)
  SELECT rank INTO v_winner_stats
  FROM minesweeper_player_stats
  WHERE student_id = v_student_id AND season = v_season;

  SELECT rank INTO v_loser_stats
  FROM minesweeper_player_stats
  WHERE student_id = v_opponent_id AND season = v_season;

  -- Default ELO if no stats exist yet
  IF v_winner_stats IS NULL THEN
    -- E19 : ROW(1500) perdait le nom du champ rank (42703).
    SELECT 1500 AS rank INTO v_winner_stats;
  END IF;
  IF v_loser_stats IS NULL THEN
    -- E19 : ROW(1500) perdait le nom du champ rank (42703).
    SELECT 1500 AS rank INTO v_loser_stats;
  END IF;

  -- Calculate ELO change (only for ranked matches)
  IF v_match.match_type = 'ranked' THEN
    v_elo_change := calculate_elo_change(
      v_winner_stats.rank,
      v_loser_stats.rank
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

  -- Award gidouilles to winner
  -- E19 : crédit du solde ET journal (l'ancienne version n'écrivait qu'un journal
  -- disparu, avec des colonnes qui n'ont jamais existé : le solde ne bougeait pas).
  UPDATE profiles
  SET gidouilles = COALESCE(gidouilles, 0) + v_total_gidouilles
  WHERE id = v_student_id;

  INSERT INTO gidouilles_activity (student_id, delta, reason)
  VALUES (v_student_id, v_total_gidouilles, 'minesweeper_multiplayer_win');

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
    COALESCE(v_winner_stats.rank, 1500) + v_elo_change,
    1
  )
  ON CONFLICT (student_id, season) DO UPDATE
  SET
    games_played = minesweeper_player_stats.games_played + 1,
    games_won = minesweeper_player_stats.games_won + 1,
    rank = EXCLUDED.rank, -- Use pre-calculated rank directly (already includes ELO change)
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
    GREATEST(0, COALESCE(v_loser_stats.rank, 1500) - v_elo_change), -- Can't go below 0
    0
  )
  ON CONFLICT (student_id, season) DO UPDATE
  SET
    games_played = minesweeper_player_stats.games_played + 1,
    rank = EXCLUDED.rank, -- Use pre-calculated rank directly (already includes ELO loss and floor at 0)
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
    'new_elo', COALESCE(v_winner_stats.rank, 1500) + v_elo_change,
    'time_seconds', p_time_seconds
  );
END;
$function$;

-- abandon_multiplayer_match
CREATE OR REPLACE FUNCTION public.abandon_multiplayer_match(p_match_id uuid, p_reason text DEFAULT 'player_quit'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
  v_student_id UUID;
  v_match RECORD;
  v_opponent_id UUID;
  v_opponent_reward INTEGER;
  v_elo_change INTEGER;
  v_abandoner_stats RECORD;
  v_opponent_stats RECORD;
  v_season TEXT;
BEGIN
  -- Get authenticated student ID
  v_student_id := auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  -- Fetch match details WITH LOCK to prevent race condition
  SELECT * INTO v_match
  FROM minesweeper_multiplayer_matches
  WHERE id = p_match_id
  FOR UPDATE;  -- CRITICAL: Locks row until transaction completes

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match introuvable';
  END IF;

  -- Verify player is a participant
  IF v_match.player1_id != v_student_id AND v_match.player2_id != v_student_id THEN
    RAISE EXCEPTION 'Vous ne participez pas à ce match';
  END IF;

  -- Verify match can be abandoned (in_progress or countdown)
  IF v_match.status NOT IN ('in_progress', 'countdown') THEN
    RAISE EXCEPTION 'Le match ne peut pas être abandonné (status: %)', v_match.status;
  END IF;

  -- Determine opponent
  IF v_match.player1_id = v_student_id THEN
    v_opponent_id := v_match.player2_id;
  ELSE
    v_opponent_id := v_match.player1_id;
  END IF;

  -- Get current season
  v_season := TO_CHAR(NOW(), 'YYYY-MM');

  -- Get ELO ratings
  SELECT rank INTO v_abandoner_stats
  FROM minesweeper_player_stats
  WHERE student_id = v_student_id AND season = v_season;

  SELECT rank INTO v_opponent_stats
  FROM minesweeper_player_stats
  WHERE student_id = v_opponent_id AND season = v_season;

  -- Default ELO
  IF v_abandoner_stats.rank IS NULL THEN
    -- E19 : ROW(1500) perdait le nom du champ rank (42703).
    SELECT 1500 AS rank INTO v_abandoner_stats;
  END IF;
  IF v_opponent_stats.rank IS NULL THEN
    -- E19 : ROW(1500) perdait le nom du champ rank (42703).
    SELECT 1500 AS rank INTO v_opponent_stats;
  END IF;

  -- Calculate ELO change (opponent wins, abandoner loses)
  IF v_match.match_type = 'ranked' THEN
    v_elo_change := calculate_elo_change(
      v_opponent_stats.rank,
      v_abandoner_stats.rank
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

  -- Award gidouilles to opponent
  -- E19 : crédit du solde ET journal (l'ancienne version n'écrivait qu'un journal
  -- disparu, avec des colonnes qui n'ont jamais existé : le solde ne bougeait pas).
  UPDATE profiles
  SET gidouilles = COALESCE(gidouilles, 0) + v_opponent_reward
  WHERE id = v_opponent_id;

  INSERT INTO gidouilles_activity (student_id, delta, reason)
  VALUES (v_opponent_id, v_opponent_reward, 'minesweeper_multiplayer_opponent_quit');

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
    v_opponent_stats.rank + v_elo_change,
    1
  )
  ON CONFLICT (student_id, season) DO UPDATE
  SET
    games_played = minesweeper_player_stats.games_played + 1,
    games_won = minesweeper_player_stats.games_won + 1,
    rank = EXCLUDED.rank, -- Use pre-calculated rank directly (already includes ELO change)
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
    GREATEST(0, v_abandoner_stats.rank - v_elo_change),
    0
  )
  ON CONFLICT (student_id, season) DO UPDATE
  SET
    games_played = minesweeper_player_stats.games_played + 1,
    rank = EXCLUDED.rank, -- Use pre-calculated rank directly (already includes ELO loss and floor at 0)
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
$function$;

-- run_weekly_rewards (cron weekly-rewards) : saute les élèves en lecture seule.
CREATE OR REPLACE FUNCTION public.run_weekly_rewards()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_run_id UUID;
    v_class RECORD;
    v_member RECORD;
    v_processed_classes INTEGER := 0;
    v_skipped_classes INTEGER := 0;
    v_total_rewards INTEGER := 0;
    v_class_rewards INTEGER;
    v_current_day INTEGER;
    v_current_hour INTEGER;
    v_rewards_day INTEGER;
    v_first_day INTEGER;
    v_today DATE;
    v_current_week_start DATE;
    v_days_since_week_start INTEGER;
    v_timezone TEXT;
    v_has_warning_action BOOLEAN;
    v_week_start_ts TIMESTAMPTZ;
    v_class_name TEXT;
BEGIN
    v_run_id := start_job_run('weekly_rewards', '{}'::jsonb);

    BEGIN
        FOR v_class IN
            SELECT
                c.id as class_id,
                c.name as class_name,
                c.school_id,
                s.timezone,
                COALESCE((s.timetable->'week_config'->>'first_day')::INTEGER, 1) as first_day
            FROM classes c
            JOIN schools s ON c.school_id = s.id
            WHERE c.is_active = true
              AND s.timezone IS NOT NULL
        LOOP
            v_timezone := v_class.timezone;
            v_first_day := v_class.first_day;
            v_class_name := v_class.class_name;

            v_rewards_day := (v_first_day + 5) % 7;
            v_current_day := EXTRACT(DOW FROM NOW() AT TIME ZONE v_timezone)::INTEGER;
            v_current_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE v_timezone)::INTEGER;

            IF v_current_day = v_rewards_day AND v_current_hour >= 12 THEN
                v_today := (NOW() AT TIME ZONE v_timezone)::DATE;
                v_days_since_week_start := (v_current_day - v_first_day + 7) % 7;
                v_current_week_start := v_today - v_days_since_week_start;
                v_week_start_ts := (v_current_week_start::TIMESTAMP AT TIME ZONE v_timezone);
                v_class_rewards := 0;

                FOR v_member IN
                    SELECT cm.student_id
                    FROM class_members cm
                    WHERE cm.class_id = v_class.class_id
                      AND cm.status = 'active'
                      -- Lecture seule (décision du 2026-10-10) : pas de récompense
                      -- automatique ; le prof peut toujours en donner à la main.
                      AND public.has_full_access(cm.student_id)
                LOOP
                    SELECT EXISTS (
                        SELECT 1 FROM student_warnings sw
                        WHERE sw.student_id = v_member.student_id
                          AND sw.class_id = v_class.class_id
                          AND sw.deleted_at IS NULL
                          AND sw.created_at >= v_week_start_ts
                        UNION ALL
                        SELECT 1 FROM gidouilles_activity ga
                        WHERE ga.student_id = v_member.student_id
                          AND ga.class_id = v_class.class_id
                          AND ga.reason = 'Retiré suite à un avertissement'
                          AND ga.created_at >= v_week_start_ts
                        UNION ALL
                        SELECT 1 FROM vip_cards_activity va
                        WHERE va.student_id = v_member.student_id
                          AND va.action = 'removed'
                          AND va.metadata->>'reason' = 'warning'
                          AND va.created_at >= v_week_start_ts
                    ) INTO v_has_warning_action;

                    IF NOT v_has_warning_action THEN
                        PERFORM update_student_gidouilles(
                            v_member.student_id,
                            v_class.class_id,
                            1,
                            'weekly_no_warning',
                            NULL
                        );

                        INSERT INTO weekly_rewards (
                            student_id, class_id, week_start, week_end, gidouilles_awarded
                        ) VALUES (
                            v_member.student_id, v_class.class_id,
                            v_current_week_start, v_today, 1
                        );

                        INSERT INTO notifications (
                            title, message, type, is_system,
                            system_event_type, target_type, target_user_ids
                        ) VALUES (
                            'Recompense hebdomadaire',
                            format(
                                E'Recompense hebdomadaire - %s\n\n' ||
                                E'Bravo ! Tu as recu 1 gidouille pour avoir passe la semaine ' ||
                                E'du %s au %s sans avertissement.\n\n' ||
                                E'Continue comme ca !',
                                v_class_name,
                                TO_CHAR(v_current_week_start, 'DD/MM/YYYY'),
                                TO_CHAR(v_today, 'DD/MM/YYYY')
                            ),
                            'info',
                            true,
                            'weekly_reward',
                            'users',
                            ARRAY[v_member.student_id]
                        );

                        v_class_rewards := v_class_rewards + 1;
                    END IF;
                END LOOP;

                v_total_rewards := v_total_rewards + v_class_rewards;
                v_processed_classes := v_processed_classes + 1;

                RAISE NOTICE 'Class %: awarded % weekly rewards', v_class_name, v_class_rewards;
            ELSE
                v_skipped_classes := v_skipped_classes + 1;
            END IF;
        END LOOP;

        PERFORM complete_job_run(
            v_run_id, 'success', NULL,
            jsonb_build_object(
                'classes_processed', v_processed_classes,
                'classes_skipped', v_skipped_classes,
                'total_rewards_awarded', v_total_rewards
            )
        );

    EXCEPTION WHEN OTHERS THEN
        PERFORM complete_job_run(
            v_run_id, 'failed', SQLERRM,
            jsonb_build_object(
                'classes_processed', v_processed_classes,
                'classes_skipped', v_skipped_classes,
                'total_rewards_awarded', v_total_rewards
            )
        );
        RAISE;
    END;
END;
$function$;

-- award_weekly_best_bonuses (cron weekly-best-bonuses) : idem.
CREATE OR REPLACE FUNCTION public.award_weekly_best_bonuses(p_week_start date, p_week_end date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_caller_role TEXT;
  v_bonus_count INTEGER := 0;
  v_record RECORD;
  v_class_id UUID;
  -- Notification grouping
  v_notif_data JSONB := '{}'::JSONB;
  v_student_id UUID;
  v_game_entry RECORD;
  v_total_reward NUMERIC;
  v_game_label TEXT;
  v_message TEXT;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  IF auth.uid() IS NOT NULL AND v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can award weekly bonuses';
  END IF;

  IF p_week_end <= p_week_start THEN
    RAISE EXCEPTION 'Invalid week boundaries: end (%) must be after start (%)', p_week_end, p_week_start;
  END IF;

  FOR v_record IN
    SELECT student_id, best_reward_game_type, best_theoretical_reward
    FROM weekly_best_rewards
    WHERE week_start = p_week_start
      AND week_end = p_week_end
      AND bonus_awarded_at IS NULL
      AND best_theoretical_reward > 0
      -- Lecture seule (décision du 2026-10-10) : pas de bonus automatique.
      AND public.has_full_access(student_id)
    ORDER BY student_id, best_reward_game_type
    FOR UPDATE
  LOOP
    SELECT cm.class_id INTO v_class_id
    FROM class_members cm
    WHERE cm.student_id = v_record.student_id
      AND cm.status = 'active'
    LIMIT 1;

    UPDATE profiles
    SET gidouilles = gidouilles + v_record.best_theoretical_reward
    WHERE id = v_record.student_id;

    INSERT INTO gidouilles_activity (
      student_id, class_id, delta, reason, created_by
    ) VALUES (
      v_record.student_id, v_class_id,
      v_record.best_theoretical_reward,
      'weekly_best_game_bonus:' || v_record.best_reward_game_type, NULL
    );

    UPDATE weekly_best_rewards
    SET bonus_awarded = v_record.best_theoretical_reward,
        bonus_awarded_at = NOW(),
        updated_at = NOW()
    WHERE student_id = v_record.student_id
      AND week_start = p_week_start
      AND best_reward_game_type = v_record.best_reward_game_type;

    IF NOT v_notif_data ? v_record.student_id::TEXT THEN
      v_notif_data := v_notif_data || jsonb_build_object(
        v_record.student_id::TEXT,
        jsonb_build_array(jsonb_build_object(
          'game', v_record.best_reward_game_type,
          'reward', v_record.best_theoretical_reward
        ))
      );
    ELSE
      v_notif_data := jsonb_set(
        v_notif_data,
        ARRAY[v_record.student_id::TEXT],
        (v_notif_data -> v_record.student_id::TEXT) || jsonb_build_array(jsonb_build_object(
          'game', v_record.best_reward_game_type,
          'reward', v_record.best_theoretical_reward
        ))
      );
    END IF;

    v_bonus_count := v_bonus_count + 1;
  END LOOP;

  FOR v_student_id IN
    SELECT key::UUID FROM jsonb_each(v_notif_data) AS kv(key, value)
  LOOP
    v_total_reward := 0;
    v_message := E'Récompenses hebdomadaires pour tes jeux :\n\n';

    FOR v_game_entry IN
      SELECT value FROM jsonb_array_elements(v_notif_data -> v_student_id::TEXT) AS value
    LOOP
      -- CHANGED: added 'mathemo' label
      v_game_label := CASE (v_game_entry.value ->> 'game')
        WHEN 'minesweeper' THEN 'Démineur'
        WHEN 'riddle' THEN 'Énigme'
        WHEN '2048' THEN '2048'
        WHEN 'mathemo' THEN 'Mathémo'
        ELSE (v_game_entry.value ->> 'game')
      END;
      v_message := v_message || format(
        E'  • %s : %s gidouille(s)\n',
        v_game_label,
        ROUND((v_game_entry.value ->> 'reward')::NUMERIC, 2)
      );
      v_total_reward := v_total_reward + (v_game_entry.value ->> 'reward')::NUMERIC;
    END LOOP;

    v_message := v_message || format(
      E'\nTotal : %s gidouille(s) pour la semaine du %s au %s.\nContinue comme ça !',
      ROUND(v_total_reward, 2),
      TO_CHAR(p_week_start, 'DD/MM/YYYY'),
      TO_CHAR(p_week_end, 'DD/MM/YYYY')
    );

    INSERT INTO notifications (
      title, message, type, is_system,
      system_event_type, target_type, target_user_ids
    ) VALUES (
      'Récompense hebdomadaire Jeux',
      v_message,
      'info',
      true,
      'weekly_best_bonus',
      'users',
      ARRAY[v_student_id]
    );
  END LOOP;

  RETURN v_bonus_count;
END;
$function$;
