-- ============================================================================
-- SECURITY — Vague 1 (voir docs/wip/security-audit-2026-08.md)
-- Finding H1 : sweep systémique des fonctions SECURITY DEFINER exécutables par anon.
-- ============================================================================
-- Cause racine : `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
-- GRANT ALL ON FUNCTIONS TO anon` (baseline :46134) → chaque fonction créée par
-- postgres accorde EXECUTE à anon. Résultat : ~294 fonctions SECURITY DEFINER
-- appelables par n'importe qui avec la clé anon publique via /rest/v1/rpc/.
-- La Vague 0 a fermé les plus dangereuses ; ce sweep ferme le reste et neutralise
-- la cause racine pour que les FUTURES fonctions ne ré-ouvrent pas le trou.
--
-- Modèle :
--   * On ne touche QUE les fonctions SECURITY DEFINER (elles bypassent la RLS).
--     Les fonctions SECURITY INVOKER tournent en tant qu'anon → la RLS s'applique,
--     risque faible, laissées telles quelles.
--   * REVOKE de PUBLIC **et** anon (anon ∈ PUBLIC : révoquer anon seul ne suffit
--     pas). `authenticated`/`service_role` gardent leurs GRANTs explicites par
--     fonction (293/295 en ont un direct, 1 via ACL par défaut) → accès préservé,
--     et les révocations Vague 0 (promote/delete/rate-limit = service_role only)
--     restent en place (on ne re-grant PAS authenticated).
--   * Re-grant anon UNIQUEMENT à la whitelist des 3 RPC appelées par des visiteurs
--     déconnectés (audit exhaustif des `.rpc(` en contexte anon).
-- ============================================================================

-- 1. Neutralise la cause racine (les futures fonctions n'accordent plus anon).
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;

-- 2. Révoque PUBLIC + anon sur toutes les fonctions SECURITY DEFINER (hors triggers).
DO $$
DECLARE
	r record;
BEGIN
	FOR r IN
		SELECT p.oid::regprocedure AS sig
		FROM pg_proc p
		JOIN pg_namespace n ON n.oid = p.pronamespace
		WHERE n.nspname = 'public'
		  AND p.prosecdef
		  AND p.prokind = 'f'
		  AND p.prorettype <> 'pg_catalog.trigger'::regtype
	LOOP
		EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon;', r.sig);
	END LOOP;
END $$;

-- 3. Re-grant anon à la whitelist (flux publics déconnectés) :
--    - consentement parental (page publique /consent/[token])
--    - lecture d'un exercice partagé par token (page publique /exercice/[slug])
GRANT EXECUTE ON FUNCTION public.get_consent_info(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.grant_parental_consent(uuid, inet, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_exercise_by_share_token(text) TO anon;
