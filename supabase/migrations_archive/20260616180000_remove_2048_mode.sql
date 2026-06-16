-- ============================================================================
-- Nettoyage : retrait du multi-mode 2048 (feature abandonnée, schéma resté)
-- ============================================================================
-- Le 2048 « multi-modes » (classic/multiplication/equations/fractions) a été
-- abandonné : le code hardcode 'classic' partout. On retire la colonne `mode`
-- (43 lignes, toutes 'classic') et on simplifie les 2 fonctions.
--
-- L'unique `unique_user_2048_scores (user_id)` et l'index
-- `idx_2048_scores_leaderboard (best_score DESC)` existent DÉJÀ → rien à recréer.
-- DROP COLUMN auto-supprime : UNIQUE(user_id,mode), index (mode,best_score), CHECK mode.
--
-- ⚠️ Après push : `pnpm db:types` pour régénérer src/lib/types/database.ts
--    (signatures de fonctions changées + fonction renommée).
-- ============================================================================

ALTER TABLE public.game_2048_scores DROP COLUMN mode;

-- Upsert sans mode (ON CONFLICT sur unique_user_2048_scores = (user_id)).
DROP FUNCTION IF EXISTS public.upsert_2048_score(uuid, text, integer, boolean, boolean);
CREATE OR REPLACE FUNCTION public.upsert_2048_score(
	p_user_id uuid,
	p_score integer,
	p_reached_2048 boolean,
	p_reached_4096 boolean
)
RETURNS TABLE(best_score integer, games_played integer, is_new_best boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
	v_existing_best_score integer;
	v_new_best_score integer;
BEGIN
	INSERT INTO game_2048_scores (
		user_id, best_score, games_played, tiles_2048_reached, tiles_4096_reached
	)
	VALUES (
		p_user_id, p_score, 1,
		CASE WHEN p_reached_2048 THEN 1 ELSE 0 END,
		CASE WHEN p_reached_4096 THEN 1 ELSE 0 END
	)
	ON CONFLICT (user_id)
	DO UPDATE SET
		best_score = GREATEST(game_2048_scores.best_score, p_score),
		games_played = game_2048_scores.games_played + 1,
		tiles_2048_reached = game_2048_scores.tiles_2048_reached + CASE WHEN p_reached_2048 THEN 1 ELSE 0 END,
		tiles_4096_reached = game_2048_scores.tiles_4096_reached + CASE WHEN p_reached_4096 THEN 1 ELSE 0 END
	RETURNING game_2048_scores.best_score, game_2048_scores.games_played
	INTO v_new_best_score, games_played;

	SELECT game_2048_scores.best_score
	INTO v_existing_best_score
	FROM game_2048_scores
	WHERE game_2048_scores.user_id = p_user_id;

	best_score := v_new_best_score;
	is_new_best := (p_score >= v_existing_best_score);
	RETURN NEXT;
END;
$function$;

-- Rang sans mode (renommé : plus de notion de mode).
DROP FUNCTION IF EXISTS public.get_user_rank_in_mode(uuid, text);
CREATE OR REPLACE FUNCTION public.get_2048_user_rank(p_user_id uuid)
RETURNS TABLE(user_rank bigint, total_players bigint, user_score bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
BEGIN
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
		COALESCE(ranked_scores.best_score, 0) AS user_score
	FROM ranked_scores
	WHERE ranked_scores.user_id = p_user_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.upsert_2048_score(uuid, integer, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_2048_user_rank(uuid) TO authenticated;
