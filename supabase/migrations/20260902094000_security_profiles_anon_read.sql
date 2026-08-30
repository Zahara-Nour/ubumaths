-- ============================================================================
-- SECURITY INCIDENT — Vague 0 (voir docs/wip/security-audit-2026-08.md)
-- Finding C2 (partie critique) : dump anonyme de tous les profils mineurs.
-- ============================================================================
-- La policy "Anonymous can view profiles for leaderboard" (FOR SELECT TO anon
-- USING (true)) + le GRANT sur `anon` laissaient n'importe qui, SANS session,
-- faire `GET /rest/v1/profiles?select=email,firstname,lastname,grade,class_ids`
-- avec la clé anon publique → 81 mineurs (email, nom, niveau, statut de
-- consentement parental). Confirmé en prod le 2026-08-30.
--
-- Ce correctif ferme le vecteur NON AUTHENTIFIÉ (le plus grave) :
--   - suppression de l'unique policy SELECT accordée à `anon` ;
--   - révocation de tout privilège de table `anon` (défense en profondeur).
-- Aucune page déconnectée ne lit `profiles` (audit de portée confirmé), donc
-- impact client nul.
--
-- ⚠️ La policy jumelle "Anyone can view profiles for leaderboard" (TO authenticated
-- USING (true)) reste EN PLACE pour l'instant : la restreindre casse la
-- fonctionnalité "amis" (lecture de profils inter-classes côté navigateur) tant
-- qu'une policy "amis" dédiée + des RPC de classement n'existent pas. → Vague 1.
-- ============================================================================

DROP POLICY IF EXISTS "Anonymous can view profiles for leaderboard" ON public.profiles;

REVOKE ALL ON TABLE public.profiles FROM anon;
