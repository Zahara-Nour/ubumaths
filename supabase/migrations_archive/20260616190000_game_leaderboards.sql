-- =============================================================================
-- Migration A — Game leaderboards (3 scopes: class / grade / school)
-- =============================================================================
-- Purpose : expose a per-game, school-bounded leaderboard for the 3 games
--           (2048, mathemo, minesweeper) via:
--             1. view  public.game_scores_unified  — normalises the 3 score
--                sources into (game, user_id, score, updated_at);
--             2. fn    public.game_leaderboard(p_game, p_scope, p_limit)
--                — SECURITY DEFINER, ranks the CALLER's scope (auth.uid() only).
--
-- ADDITIVE / SAFE TO PUSH : creates only new objects (view, function, one index).
--   No DROP, no destructive change. The destructive drop of
--   minesweeper_leaderboard_public is a separate later migration (Migration B),
--   pushed in lockstep with the release. David can push this one immediately.
--
-- Depends on : public.my_school() (migration 20260616160000_school_scoped_social).
--   Verified live on EU (cnevnzsvixxpnurautls, 2026-06-16): my_school() + same_school()
--   exist, history records 160000 + 180000 (latest), so this 190000 applies next cleanly.
--
-- After push : David runs `pnpm db:migrate` then `pnpm db:types` to regenerate
--   src/lib/types/database.ts (the GameLeaderboardRow alias goes in
--   database-helpers.ts, never in the generated file).
--
-- SECURITY (audited 2026-06-16, security-auditor Opus — verdict: safe once my_school()
--   confirmed live, which it is): all 3 scopes are school-bounded via my_school()
--   (incl. class scope, defense-in-depth F1). Teacher reference row is school-bounded
--   and is_test-filtered (F9b); the live teacher has a non-null school_id (verified),
--   so the fail-closed bound does not hide it. Output exposes firstname+avatar+score only.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Normalising view : one row per (game, user).
--    security_invoker = true keeps the Supabase "security definer view" advisor
--    quiet. It is NEVER read directly by clients (no GRANT to authenticated/anon
--    below) — it is read only from inside game_leaderboard(), which is
--    SECURITY DEFINER and runs as the view OWNER, so it still sees all rows.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.game_scores_unified
WITH (security_invoker = true) AS
	SELECT
		'2048'::text          AS game,
		g.user_id             AS user_id,
		g.best_score::numeric  AS score,
		g.updated_at          AS updated_at
	FROM public.game_2048_scores g
	UNION ALL
	SELECT
		'mathemo'::text       AS game,
		m.user_id             AS user_id,
		m.total_score         AS score,
		m.updated_at          AS updated_at
	FROM public.mathemo_scores m
	UNION ALL
	SELECT
		'minesweeper'::text   AS game,
		ml.student_id         AS user_id,
		ml.total_points::numeric AS score,
		(
			SELECT max(mg.completed_at)
			FROM public.minesweeper_games mg
			WHERE mg.student_id = ml.student_id
			  AND mg.status = 'won'
		)                     AS updated_at
	FROM public.minesweeper_leaderboard ml;

COMMENT ON VIEW public.game_scores_unified IS
	'UNION ALL of game_2048_scores / mathemo_scores / minesweeper_leaderboard, one row per (game, user_id). security_invoker = true; NOT granted to clients — read only from public.game_leaderboard() (SECURITY DEFINER, runs as owner).';

-- -----------------------------------------------------------------------------
-- 2. Ranking function. Ranks the CALLER's scope (auth.uid() ONLY).
--    Students ranked via dense_rank() (ties share a rank, no gap). The single
--    teacher (if a score exists AND same school) is appended to every scope with
--    rank = NULL, is_teacher = true, NOT limit-bound. Admin never appears.
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
	ORDER BY score DESC, rank NULLS LAST, firstname;
END;
$$;

COMMENT ON FUNCTION public.game_leaderboard(text, text, int) IS
	'Ranks the caller (auth.uid()) scope for p_game in {2048,mathemo,minesweeper}, p_scope in {class,grade,school}, p_limit clamped [1,200]. dense_rank among students (role=student, is_test=false); single teacher of same school appended as rank=NULL reference row (not limit-bound); admin excluded. School-bounded via my_school() — no cross-school leakage.';

GRANT EXECUTE ON FUNCTION public.game_leaderboard(text, text, int) TO authenticated;

-- -----------------------------------------------------------------------------
-- 3. Indexes (perf of scope joins / ranks).
--    SKIPPED: class_members(student_id, status) — already exists as
--             idx_class_members_student_status (verified in EU, 2026-06-16).
--    CREATED: profiles(school_id, grade) — no equivalent composite exists
--             (only idx_profiles_school_id and idx_profiles_role_school).
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_school_grade
	ON public.profiles (school_id, grade);
