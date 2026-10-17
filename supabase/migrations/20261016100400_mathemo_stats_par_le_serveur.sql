-- Statistiques Mathémo enregistrées par le serveur — étape 1 sur 2.
--
-- Constat (audit de #1147, mesuré en prod le 2026-10-12) : `upsert_mathemo_score` est
-- exécutable par tout compte connecté et la route l'appelait avec le client de l'élève.
-- La fonction ajoute `p_score` au total sans borne : un élève qui l'appelle lui-même
-- gonfle son classement à volonté (la route, elle, calcule et borne le score). Et
-- `NULL != x` vaut NULL : un appel sans `auth.uid()` passait la garde.
--
-- Question d'accès (tranchée par David, 2026-10-12) : comme pour 2048, les statistiques
-- de Mathémo sont enregistrées par le serveur, jamais par l'élève.
--
-- Étape 1 (ici, compatible avec le code en prod) : la garde n'accepte plus que le
-- serveur (`service_role`) ou l'élève lui-même, et refuse l'appel sans identité. Corps
-- identique à la prod (md5 4b8468bbdf5bb1240bee016f16161e3c) sauf ces trois lignes.
-- Étape 2 (APRÈS le deploy:prod du code qui passe par le client service) :
--   REVOKE EXECUTE ON FUNCTION public.upsert_mathemo_score(uuid, integer, boolean, boolean, numeric)
--     FROM authenticated;
--
-- Qui perd quoi : l'appel sans identité (aucun usage légitime). Élèves, prof, admin :
-- rien à cette étape.
--
-- Rollback : remettre la garde d'origine dans le même corps :
--   IF auth.uid() != p_user_id THEN
--       RAISE EXCEPTION 'Unauthorized: You can only update your own scores';
--   END IF;

CREATE OR REPLACE FUNCTION public.upsert_mathemo_score(p_user_id uuid, p_word_length integer, p_won boolean, p_found_first_try boolean, p_score numeric DEFAULT 0)
 RETURNS TABLE(games_played integer, games_won integer, best_word_length integer, first_try_count integer, total_score numeric, is_new_best_length boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
    v_new_best integer;
BEGIN
    -- Security check: Verify caller is the user
    IF coalesce((SELECT auth.role()), '') <> 'service_role'
       AND (SELECT auth.uid()) IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION 'Unauthorized: You can only update your own scores';
    END IF;

    INSERT INTO mathemo_scores (
        user_id,
        games_played,
        games_won,
        best_word_length,
        first_try_count,
        total_score
    )
    VALUES (
        p_user_id,
        1,
        CASE WHEN p_won THEN 1 ELSE 0 END,
        CASE WHEN p_won THEN p_word_length ELSE 0 END,
        CASE WHEN p_found_first_try THEN 1 ELSE 0 END,
        CASE WHEN p_won THEN p_score ELSE 0 END
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
        games_played = mathemo_scores.games_played + 1,
        games_won = mathemo_scores.games_won + CASE WHEN p_won THEN 1 ELSE 0 END,
        best_word_length = CASE WHEN p_won
            THEN GREATEST(mathemo_scores.best_word_length, p_word_length)
            ELSE mathemo_scores.best_word_length
        END,
        first_try_count = mathemo_scores.first_try_count + CASE WHEN p_found_first_try THEN 1 ELSE 0 END,
        total_score = mathemo_scores.total_score + CASE WHEN p_won THEN p_score ELSE 0 END
    RETURNING
        mathemo_scores.games_played,
        mathemo_scores.games_won,
        mathemo_scores.best_word_length,
        mathemo_scores.first_try_count,
        mathemo_scores.total_score
    INTO games_played, games_won, v_new_best, first_try_count, total_score;

    best_word_length := v_new_best;
    is_new_best_length := (p_won AND p_word_length >= v_new_best);

    RETURN NEXT;
END;
$function$;
