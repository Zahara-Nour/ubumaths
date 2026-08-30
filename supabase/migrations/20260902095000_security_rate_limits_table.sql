-- ============================================================================
-- SECURITY INCIDENT — Vague 0 (voir docs/wip/security-audit-2026-08.md)
-- Finding C9 (partie table) : `rate_limits` lisible par tout le monde.
-- ============================================================================
-- La policy "Allow SELECT for rate limit checks" était FOR SELECT, rôles PUBLIC
-- (aucune clause TO), USING (true) → anon ET authenticated pouvaient
-- `GET /rest/v1/rate_limits` et lire toutes les lignes. Or la colonne `key` est
-- de la PII par construction :
--   ratelimit:login:email:<email>   ratelimit:login:ip:<ip>   ratelimit:signup:email:<email>
-- Un observateur anonyme moissonnait donc, en temps réel pendant une session de
-- login de classe, les emails d'élèves et l'IP de sortie de l'établissement.
-- Le commentaire "Safe because table is only accessed server-side" était faux.
--
-- La table n'est accédée QUE via le client service-role (rateLimiter.ts,
-- tutor-rate-limiter.ts), qui bypasse la RLS. On restreint donc la lecture au
-- service_role et on révoque tout privilège de table anon/authenticated.
-- (INSERT/UPDATE/DELETE étaient déjà TO service_role.)
-- ============================================================================

DROP POLICY IF EXISTS "Allow SELECT for rate limit checks" ON public.rate_limits;

CREATE POLICY "Allow SELECT for rate limit checks"
ON public.rate_limits
FOR SELECT
TO service_role
USING (true);

REVOKE ALL ON TABLE public.rate_limits FROM anon, authenticated;
