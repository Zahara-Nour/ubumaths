-- ============================================================================
-- SECURITY — Vague 1 (voir docs/wip/security-audit-2026-08.md)
-- Finding H8 : le modèle de share-token est cassé au niveau RLS.
-- ============================================================================
-- Deux policies PUBLIC (aucune clause TO) :
--   * "Anyone can read exercises with valid share token" ON exercises
--     USING (exercise_has_valid_share_token(id)) — cette fonction ne regarde
--     JAMAIS le token présenté, seulement si l'exercice a UN token actif.
--     → GET /rest/v1/exercises?select=* (anon) renvoie tout exercice jamais
--       partagé, solution_md incluse.
--   * "Anyone can read valid tokens" ON exercise_share_tokens
--     → GET /rest/v1/exercise_share_tokens?select=* (anon) dump tous les tokens.
--
-- Correctif : l'accès partagé passe par une RPC SECURITY DEFINER prenant le TOKEN
-- en argument (donc il faut CONNAÎTRE le token — pas d'énumération, pas de dump),
-- et on supprime les deux policies blanket. La policy propriétaire
-- "Teachers can manage their exercise tokens" et "Anyone can read public
-- exercises" (is_public) restent en place.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_exercise_by_share_token(p_token text)
RETURNS SETOF public.exercises
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_exercise_id uuid;
BEGIN
	-- Resolve the token to an exercise, only if the exact token is valid.
	SELECT exercise_id INTO v_exercise_id
	FROM public.exercise_share_tokens
	WHERE token = p_token
	  AND is_active = true
	  AND (expires_at IS NULL OR expires_at > now());

	IF v_exercise_id IS NULL THEN
		RETURN; -- no rows: invalid / revoked / expired token
	END IF;

	-- Fire-and-forget access accounting (was a silent no-op for anon before, no
	-- UPDATE policy; the definer context makes it actually work).
	UPDATE public.exercise_share_tokens
	SET last_accessed_at = now()
	WHERE token = p_token;

	RETURN QUERY SELECT * FROM public.exercises WHERE id = v_exercise_id;
END;
$$;

COMMENT ON FUNCTION public.get_exercise_by_share_token(text) IS
	'Returns the shared exercise for a valid share token (H8). Token is required, so no enumeration/dump. SECURITY DEFINER: replaces the dropped blanket RLS policies.';

REVOKE EXECUTE ON FUNCTION public.get_exercise_by_share_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_exercise_by_share_token(text) TO anon, authenticated, service_role;

-- Drop the two over-broad blanket policies.
DROP POLICY IF EXISTS "Anyone can read exercises with valid share token" ON public.exercises;
DROP POLICY IF EXISTS "Anyone can read valid tokens" ON public.exercise_share_tokens;
