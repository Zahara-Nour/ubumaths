-- ============================================================================
-- D16 — parties de démineur privées ; rang calculé par le serveur
-- ============================================================================
--
-- Mesuré en prod le 2026-10-10 : deux policies SELECT rendaient lisibles par
-- N'IMPORTE QUI sans connexion (anon) et par tout compte de toute école les parties
-- terminées des élèves — 13 890 parties de 44 élèves, avec identifiant, temps, dates.
-- Prouvé par tests/integration/demineur-parties-privees.test.ts. Aucun code ne lisait
-- sans connexion ; connecté, seul le rang de l'élève sur sa page de stats en dépendait
-- (vue minesweeper_leaderboard, security_invoker).
--
-- Question d'accès posée à David (2026-10-10) — qui pourra lire les parties des autres ?
-- « Personne, rang calculé à part. » Question en miroir — qui perd quoi : anon et les
-- autres élèves perdent la lecture des parties d'autrui ; chaque élève garde les siennes
-- (« Users can view own minesweeper games », inchangée).
--
-- Aucune donnée touchée (deux policies retirées, une fonction ajoutée).
-- ⚠️ Jusqu'au déploiement du code qui appelle minesweeper_rank_in_school, l'ancienne
-- page de stats calcule le rang sur les seules parties de l'élève : rang affiché faux
-- (1), pas d'erreur.
--
-- ROLLBACK :
--   CREATE POLICY "Anonymous can view completed games for leaderboard"
--     ON public.minesweeper_games FOR SELECT TO anon
--     USING (status = ANY (ARRAY['won'::text, 'lost'::text]));
--   CREATE POLICY "Anyone can view completed games for leaderboard"
--     ON public.minesweeper_games FOR SELECT TO authenticated
--     USING (status = ANY (ARRAY['won'::text, 'lost'::text]));
--   DROP FUNCTION public.minesweeper_rank_in_school();
-- ============================================================================

DROP POLICY "Anonymous can view completed games for leaderboard" ON public.minesweeper_games;
DROP POLICY "Anyone can view completed games for leaderboard" ON public.minesweeper_games;

-- Rang de l'APPELANT parmi les élèves classés (≥ 10 parties dans le top) de SON école ;
-- NULL s'il n'est pas classé ou n'a pas d'école. Ne rend que ce nombre : aucune partie,
-- aucun identifiant d'autrui. Même calcul que l'ancienne page de stats, borné à l'école.
CREATE OR REPLACE FUNCTION public.minesweeper_rank_in_school()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
	WITH moi AS (
		SELECT l.avg_top_10, l.top_games_count, p.school_id
		FROM minesweeper_leaderboard l
		JOIN profiles p ON p.id = l.student_id
		WHERE l.student_id = auth.uid()
	)
	SELECT CASE
		WHEN (SELECT top_games_count FROM moi) >= 10
			AND (SELECT school_id FROM moi) IS NOT NULL
		THEN (
			SELECT count(*)::integer + 1
			FROM minesweeper_leaderboard l
			JOIN profiles p ON p.id = l.student_id
			WHERE l.top_games_count >= 10
			  AND l.role = 'student'
			  AND p.school_id = (SELECT school_id FROM moi)
			  AND l.avg_top_10 > (SELECT avg_top_10 FROM moi)
		)
	END;
$$;

COMMENT ON FUNCTION public.minesweeper_rank_in_school() IS
	'Rang de auth.uid() au démineur parmi les élèves classés de son école (D16, 2026-10-10) ; '
	'NULL si non classé. Ne rend que le nombre.';

REVOKE EXECUTE ON FUNCTION public.minesweeper_rank_in_school() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.minesweeper_rank_in_school() TO authenticated, service_role;
