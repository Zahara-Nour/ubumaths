-- ============================================================================
-- SECURITY INCIDENT — Vague 0 (voir docs/wip/security-audit-2026-08.md)
-- ============================================================================
-- Findings C1 / C5 / C7 : des fonctions SECURITY DEFINER sensibles étaient
-- exécutables par `anon` et `authenticated` via PostgREST (clé anon publique
-- livrée au navigateur → appelables par n'importe qui avec curl).
--
-- Ces trois fonctions ne sont JAMAIS appelées par un client anon/authenticated
-- côté application : elles tournent exclusivement via le client service-role
--   - delete_user_account            → api/account/delete (createServiceRoleClient)
--   - check_and_increment_rate_limit → src/lib/server/rateLimiter.ts (getServiceRoleClient)
--   - cleanup_expired_rate_limits    → maintenance service-role
-- Le service-role bypasse les GRANT, donc révoquer anon+authenticated+PUBLIC est
-- sans impact fonctionnel et ferme complètement la surface d'attaque non authentifiée.
--
-- Attaques fermées :
--   C1 lockout : anon posait expires_at = now()+1 an sur n'importe quel compte
--   C5         : anon effaçait irréversiblement les données de n'importe qui
-- ============================================================================

-- ⚠️ EXECUTE is granted to PUBLIC by default on function creation, so revoking
-- from anon/authenticated alone leaves the PUBLIC grant (anon ∈ PUBLIC). We
-- revoke PUBLIC too, then re-GRANT service_role explicitly — its access also came
-- via PUBLIC, and the app calls all three exclusively through the service-role
-- client, which must keep working.

REVOKE EXECUTE ON FUNCTION public.delete_user_account(uuid)
	FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, integer, integer)
	FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, integer, integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_rate_limits()
	FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_rate_limits() TO service_role;
