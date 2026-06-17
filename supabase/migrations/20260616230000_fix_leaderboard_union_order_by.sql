-- =============================================================================
-- Fix — ORDER BY d'UNION invalide dans les 2 RPC de classements (rank → rk)
-- =============================================================================
-- Bug commun à game_leaderboard() ET minesweeper_scoped_leaderboard() : chaque
--   fonction déclare RETURNS TABLE(rank int, ...) mais sa requête finale est un
--   UNION ALL dont les branches aliasent la colonne de rang en `rk`
--   (SELECT r.rk ...). Le `ORDER BY ... rank ...` y référence `rank`, INCONNU
--   dans le namespace de sortie de l'union (c'est `rk`). Postgres l'interprète
--   comme une expression → interdit dans un ORDER BY d'UNION → erreur 0A000 :
--   « invalid UNION/INTERSECT/EXCEPT ORDER BY clause ».
--
-- Symptôme : tout appelant authentifié réel (auth.uid() non NULL) déclenche
--   l'erreur ; le garde `IF auth.uid() IS NULL THEN RETURN` masquait le bug aux
--   smoke-tests EU exécutés sans contexte d'auth. Détecté par le test d'intégration
--   tests/integration/game-leaderboards.test.ts (débloqué par le baseline local
--   20260616220000). Échec au plan (PG17), indépendant des données.
--
-- Correctif : `rank` → `rk` dans le ORDER BY final des deux fonctions (seul
--   changement). CREATE OR REPLACE conserve les GRANT existants. ADDITIF /
--   SAFE TO PUSH (remplace deux fonctions cassées par leur version corrigée).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. game_leaderboard(p_game, p_scope, p_limit)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.game_leaderboard(
	p_game  text,
	p_scope text,
	p_limit int DEFAULT 50
)
RETURNS TABLE(
	rank       int,
	user_id    uuid,
	firstname  text,
	avatar_url text,
	score      numeric,
	is_me      boolean,
	is_teacher boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
	v_uid    uuid := auth.uid();
	v_limit  int  := least(greatest(coalesce(p_limit, 50), 1), 200);  -- clamp [1,200]
BEGIN
	-- Guard: authenticated caller + valid game + valid scope, else empty.
	IF v_uid IS NULL
	   OR p_game  NOT IN ('2048', 'mathemo', 'minesweeper')
	   OR p_scope NOT IN ('class', 'grade', 'school')
	THEN
		RETURN;
	END IF;

	RETURN QUERY
	WITH
	-- Students inside the caller's scope (real students only), joined to scores.
	scoped_students AS (
		SELECT p.id, p.firstname, p.avatar_url, gsu.score
		FROM public.profiles p
		JOIN public.game_scores_unified gsu
		  ON gsu.user_id = p.id AND gsu.game = p_game
		WHERE p.role = 'student'
		  AND coalesce(p.is_test, false) = false
		  AND (
		    -- class: my active classmates (self-join on shared class), school-bounded
		    -- by construction (defense-in-depth: a class spanning two schools could
		    -- not leak cross-school rows even if the data invariant broke).
		    ( p_scope = 'class'
		         AND public.my_school() IS NOT NULL
		         AND p.school_id = public.my_school()
		         AND p.id IN (
		        SELECT cm2.student_id
		        FROM public.class_members cm1
		        JOIN public.class_members cm2 USING (class_id)
		        WHERE cm1.student_id = v_uid
		          AND cm1.status = 'active'
		          AND cm2.status = 'active'
		      ) )
		    -- grade: same grade ∩ my school (requires my grade NOT NULL).
		    OR ( p_scope = 'grade'
		         AND (SELECT grade FROM public.profiles WHERE id = v_uid) IS NOT NULL
		         AND p.grade = (SELECT grade FROM public.profiles WHERE id = v_uid)
		         AND p.school_id = public.my_school() )
		    -- school: my school (requires my_school() NOT NULL).
		    OR ( p_scope = 'school'
		         AND public.my_school() IS NOT NULL
		         AND p.school_id = public.my_school() )
		  )
	),
	-- dense_rank among students only (ties share rank, no gap).
	ranked AS (
		SELECT ss.id, ss.firstname, ss.avatar_url, ss.score,
		       dense_rank() OVER (ORDER BY ss.score DESC)::int AS rk
		FROM scoped_students ss
	),
	-- Single teacher reference row, school-bounded, NOT limit-bound. Admin excluded.
	teacher AS (
		SELECT NULL::int AS rk, p.id, p.firstname, p.avatar_url, gsu.score
		FROM public.profiles p
		JOIN public.game_scores_unified gsu
		  ON gsu.user_id = p.id AND gsu.game = p_game
		WHERE p.role = 'teacher'
		  AND coalesce(p.is_test, false) = false
		  AND p.school_id = public.my_school()
	)
	SELECT r.rk, r.id, r.firstname, r.avatar_url, r.score,
	       (r.id = v_uid) AS is_me, false AS is_teacher
	FROM ranked r
	WHERE r.rk <= v_limit
	UNION ALL
	SELECT t.rk, t.id, t.firstname, t.avatar_url, t.score,
	       (t.id = v_uid) AS is_me, true AS is_teacher
	FROM teacher t
	-- Teacher interleaved by score; on a tie with a student, teacher comes after.
	-- firstname is the final tiebreak so equal-score rows have a stable order.
	-- FIX : `rk` (alias de sortie de l'union), pas `rank` (inconnu ici).
	ORDER BY score DESC, rk NULLS LAST, firstname;
END;
$$;

COMMENT ON FUNCTION public.game_leaderboard(text, text, int) IS
	'Ranks the caller (auth.uid()) scope for p_game in {2048,mathemo,minesweeper}, p_scope in {class,grade,school}, p_limit clamped [1,200]. dense_rank among students (role=student, is_test=false); single teacher of same school appended as rank=NULL reference row (not limit-bound); admin excluded. School-bounded via my_school() — no cross-school leakage.';

-- -----------------------------------------------------------------------------
-- 2. minesweeper_scoped_leaderboard(p_scope, p_limit)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.minesweeper_scoped_leaderboard(
	p_scope text,
	p_limit int DEFAULT 50
)
RETURNS TABLE(
	rank            int,
	user_id         uuid,
	firstname       text,
	avatar_url      text,
	avg_top_10      numeric,
	top_games_count int,
	total_points    numeric,
	is_me           boolean,
	is_teacher      boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
	v_uid   uuid := auth.uid();
	v_limit int  := least(greatest(coalesce(p_limit, 50), 1), 200);  -- clamp [1,200]
BEGIN
	IF v_uid IS NULL OR p_scope NOT IN ('class', 'grade', 'school') THEN
		RETURN;
	END IF;

	RETURN QUERY
	WITH
	-- Students inside the caller's scope (real students only). Same filters as
	-- game_leaderboard: all 3 scopes school-bounded via my_school().
	scoped_students AS (
		SELECT p.id, p.firstname, p.avatar_url
		FROM public.profiles p
		WHERE p.role = 'student'
		  AND coalesce(p.is_test, false) = false
		  AND (
		    ( p_scope = 'class'
		         AND public.my_school() IS NOT NULL
		         AND p.school_id = public.my_school()
		         AND p.id IN (
		        SELECT cm2.student_id
		        FROM public.class_members cm1
		        JOIN public.class_members cm2 USING (class_id)
		        WHERE cm1.student_id = v_uid
		          AND cm1.status = 'active'
		          AND cm2.status = 'active'
		      ) )
		    OR ( p_scope = 'grade'
		         AND (SELECT grade FROM public.profiles WHERE id = v_uid) IS NOT NULL
		         AND p.grade = (SELECT grade FROM public.profiles WHERE id = v_uid)
		         AND p.school_id = public.my_school() )
		    OR ( p_scope = 'school'
		         AND public.my_school() IS NOT NULL
		         AND p.school_id = public.my_school() )
		  )
	),
	-- Minesweeper stats for those students (from the existing aggregate view).
	base AS (
		SELECT s.id, s.firstname, s.avatar_url,
		       ml.avg_top_10,
		       ml.top_games_count::int   AS top_games_count,
		       ml.total_points::numeric  AS total_points
		FROM scoped_students s
		JOIN public.minesweeper_leaderboard ml ON ml.student_id = s.id
	),
	-- Ranked: >= 10 qualifying games. dense_rank among students only.
	ranked AS (
		SELECT b.*,
		       dense_rank() OVER (ORDER BY b.avg_top_10 DESC, b.total_points DESC)::int AS rk
		FROM base b
		WHERE b.top_games_count >= 10
	),
	-- Provisional: < 10 games → rank NULL (shown apart by the UI).
	provisional AS (
		SELECT b.*, NULL::int AS rk
		FROM base b
		WHERE b.top_games_count < 10
	),
	-- Single teacher reference row (school-bounded, is_test-excluded, NOT limit-bound).
	teacher AS (
		SELECT p.id, p.firstname, p.avatar_url,
		       ml.avg_top_10,
		       ml.top_games_count::int  AS top_games_count,
		       ml.total_points::numeric AS total_points,
		       NULL::int AS rk
		FROM public.profiles p
		JOIN public.minesweeper_leaderboard ml ON ml.student_id = p.id
		WHERE p.role = 'teacher'
		  AND coalesce(p.is_test, false) = false
		  AND p.school_id = public.my_school()
	)
	SELECT r.rk, r.id, r.firstname, r.avatar_url, r.avg_top_10, r.top_games_count, r.total_points,
	       (r.id = v_uid) AS is_me, false AS is_teacher
	FROM ranked r
	WHERE r.rk <= v_limit
	UNION ALL
	SELECT p.rk, p.id, p.firstname, p.avatar_url, p.avg_top_10, p.top_games_count, p.total_points,
	       (p.id = v_uid) AS is_me, false AS is_teacher
	FROM provisional p
	UNION ALL
	SELECT t.rk, t.id, t.firstname, t.avatar_url, t.avg_top_10, t.top_games_count, t.total_points,
	       (t.id = v_uid) AS is_me, true AS is_teacher
	FROM teacher t
	-- Ranked (>=10) first by avg, then provisional/teacher; firstname stable tiebreak.
	-- FIX : `rk` (alias de sortie de l'union), pas `rank` (inconnu ici).
	ORDER BY rk NULLS LAST, avg_top_10 DESC, firstname;
END;
$$;

COMMENT ON FUNCTION public.minesweeper_scoped_leaderboard(text, int) IS
	'School-bounded minesweeper detailed leaderboard (avg_top_10). Same scoping/teacher/admin/is_test rules as game_leaderboard. Ranks students with >= 10 qualifying games via dense_rank; < 10 games returned as provisional (rank NULL); teacher appended as rank=NULL reference. firstname+avatar only.';
