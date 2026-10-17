-- ============================================================================
-- Classement des énigmes : fonction serveur bornée à l'école (prénom + score)
-- ============================================================================
--
-- Mesuré pendant D18 (2026-10-11) : la page /dashboard/student/riddles/leaderboard lit la
-- vue `riddle_progress` (security_invoker) ; la RLS de `riddle_attempts` ne montre à
-- l'élève que ses propres tentatives, donc tous ses camarades apparaissent à 0 — et
-- toutes écoles confondues, puisque la vue liste tous les profils élèves. Pas de fuite,
-- mais un classement faux.
--
-- Décision de David (2026-10-11) : une fonction serveur bornée à l'école ; les camarades
-- de la même école voient le prénom et le score des énigmes (gidouilles gagnées,
-- énigmes réussies). Ni nom, ni avatar, ni tentatives. Les comptes de test sont exclus, et
-- seuls apparaissent les élèves qui ont tenté au moins une énigme (comme les autres
-- classements : pas d'annuaire de l'école).
--
-- Qui gagne quoi : un compte connecté lit, pour les élèves de SA école, prénom,
-- gidouilles des énigmes et nombre d'énigmes réussies — qu'il ne pouvait pas lire avant.
-- anon : rien (EXECUTE révoqué). Un compte sans école : liste vide.
--
-- Prouvé par tests/integration/classement-enigmes-ecole.test.ts.
--
-- Additive : aucune table, aucune policy, aucune donnée touchée.
--
-- ROLLBACK :
--   DROP FUNCTION public.riddle_school_leaderboard(integer);
-- ============================================================================

CREATE FUNCTION public.riddle_school_leaderboard(p_limit integer DEFAULT 50)
RETURNS TABLE (
	rank integer,
	student_id uuid,
	firstname text,
	riddles_gidouilles bigint,
	riddles_completed bigint,
	is_me boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
	v_uid    uuid := auth.uid();
	v_school uuid := public.my_school();
	v_limit  int  := least(greatest(coalesce(p_limit, 50), 1), 200);  -- borné à [1, 200]
BEGIN
	IF v_uid IS NULL OR v_school IS NULL THEN
		RETURN;
	END IF;

	RETURN QUERY
	WITH scores AS (
		SELECT p.id,
		       p.firstname,
		       coalesce(sum(ra.gidouilles_awarded), 0)::bigint AS gidouilles,
		       count(DISTINCT ra.riddle_id) FILTER (WHERE ra.is_correct)::bigint AS completed
		FROM public.profiles p
		LEFT JOIN public.riddle_attempts ra ON ra.student_id = p.id
		WHERE p.role = 'student'
		  AND coalesce(p.is_test, false) = false
		  AND p.school_id = v_school
		GROUP BY p.id, p.firstname
		HAVING count(ra.id) > 0  -- pas d'annuaire : seuls les élèves qui ont tenté une énigme
	)
	SELECT rank() OVER (ORDER BY s.gidouilles DESC)::int,
	       s.id,
	       s.firstname,
	       s.gidouilles,
	       s.completed,
	       s.id = v_uid
	FROM scores s
	ORDER BY s.gidouilles DESC, s.firstname
	LIMIT v_limit;
END;
$function$;

REVOKE ALL ON FUNCTION public.riddle_school_leaderboard(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.riddle_school_leaderboard(integer) TO authenticated, service_role;
