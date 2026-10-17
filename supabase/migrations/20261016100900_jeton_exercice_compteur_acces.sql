-- ============================================================================
-- Jeton de partage d'exercice : le compteur d'accès compte enfin
-- ============================================================================
-- `get_exercise_by_share_token` mettait à jour `last_accessed_at` mais jamais
-- `access_count` : la page du professeur affichait « 0 accès » pour tous ses
-- liens. On incrémente le compteur dans la même UPDATE.
--
-- Question d'accès (tranchée par David le 2026-10-12) : personne ne gagne
-- d'accès nouveau. Même signature, même SECURITY DEFINER, même search_path,
-- même garde (jeton exact, actif, non expiré) ; CREATE OR REPLACE conserve les
-- droits EXECUTE (anon, authenticated, service_role).
--
-- Test : tests/integration/security-share-tokens.test.ts (« incrémente
-- access_count »), rouge sans cette migration.
--
-- ROLLBACK (définition précédente, 20260902101000 + search_path 20261003210000) :
--
-- CREATE OR REPLACE FUNCTION public.get_exercise_by_share_token(p_token text)
-- RETURNS SETOF public.exercises
-- LANGUAGE plpgsql
-- VOLATILE
-- SECURITY DEFINER
-- SET search_path = public, pg_temp
-- AS $$
-- DECLARE
-- 	v_exercise_id uuid;
-- BEGIN
-- 	SELECT exercise_id INTO v_exercise_id
-- 	FROM public.exercise_share_tokens
-- 	WHERE token = p_token
-- 	  AND is_active = true
-- 	  AND (expires_at IS NULL OR expires_at > now());
--
-- 	IF v_exercise_id IS NULL THEN
-- 		RETURN;
-- 	END IF;
--
-- 	UPDATE public.exercise_share_tokens
-- 	SET last_accessed_at = now()
-- 	WHERE token = p_token;
--
-- 	RETURN QUERY SELECT * FROM public.exercises WHERE id = v_exercise_id;
-- END;
-- $$;
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_exercise_by_share_token(p_token text)
RETURNS SETOF public.exercises
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
	v_exercise_id uuid;
BEGIN
	-- Le jeton exact, actif et non expiré, sinon rien.
	SELECT exercise_id INTO v_exercise_id
	FROM public.exercise_share_tokens
	WHERE token = p_token
	  AND is_active = true
	  AND (expires_at IS NULL OR expires_at > now());

	IF v_exercise_id IS NULL THEN
		RETURN; -- aucune ligne : jeton inconnu, révoqué ou expiré
	END IF;

	-- Comptage des accès (incrément atomique dans l'UPDATE).
	UPDATE public.exercise_share_tokens
	SET last_accessed_at = now(),
		access_count = coalesce(access_count, 0) + 1
	WHERE token = p_token;

	RETURN QUERY SELECT * FROM public.exercises WHERE id = v_exercise_id;
END;
$$;
