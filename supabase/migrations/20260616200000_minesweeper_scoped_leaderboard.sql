-- =============================================================================
-- Migration A2 — Minesweeper detailed leaderboard, school-scoped
-- =============================================================================
-- The legacy minesweeper "detailed view" (avg_top_10 ranking) was GLOBAL and
-- exposed firstname+lastname of every student, all schools — exactly what the
-- public-leaderboard removal targets. Decision (David, 2026-06-16): keep the
-- richer metric but school-bounded + firstname/avatar only.
--
-- This adds public.minesweeper_scoped_leaderboard(p_scope, p_limit), which reuses
-- the SAME scoping + teacher-as-reference pattern as public.game_leaderboard
-- (audited 2026-06-16) but returns the minesweeper-specific columns
-- (avg_top_10 / top_games_count / total_points) from the existing
-- public.minesweeper_leaderboard view.
--
-- ADDITIVE / SAFE TO PUSH : creates only one new function. No DROP.
-- After push : David runs `pnpm db:migrate` then `pnpm db:types`.
--
-- SECURITY : identical access-control posture to game_leaderboard — all 3 scopes
--   school-bounded via my_school() (incl. class scope), is_test excluded (students
--   AND teacher), teacher appended as rank=NULL reference row, admin excluded,
--   output limited to firstname+avatar+metrics. Ranked among students with
--   >= 10 qualifying games; students with < 10 games returned with rank=NULL
--   (provisional), like the legacy UI.
-- =============================================================================

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
	ORDER BY rank NULLS LAST, avg_top_10 DESC, firstname;
END;
$$;

COMMENT ON FUNCTION public.minesweeper_scoped_leaderboard(text, int) IS
	'School-bounded minesweeper detailed leaderboard (avg_top_10). Same scoping/teacher/admin/is_test rules as game_leaderboard. Ranks students with >= 10 qualifying games via dense_rank; < 10 games returned as provisional (rank NULL); teacher appended as rank=NULL reference. firstname+avatar only.';

GRANT EXECUTE ON FUNCTION public.minesweeper_scoped_leaderboard(text, int) TO authenticated;
