-- Le recalcul d'un badge n'est plus appelable par un utilisateur
-- ===============================================================
--
-- Relevé par security-auditor (PR #498), vérifié en prod le 2026-09-28 :
-- `update_student_point_state(uuid, uuid)` (SECURITY DEFINER) était exécutable
-- par `authenticated` (privilèges par défaut du baseline). Tout utilisateur
-- connecté pouvait forcer le recalcul du badge de n'importe quel élève, ou
-- effacer l'état d'un point sans tentative. Impact faible (recalcul
-- déterministe depuis les vraies tentatives), mais aucune raison d'exposer.
--
-- Seul appelant (vérifié : grep src/scripts/tests + pg_proc) : le trigger
-- `skill_attempts_after_insert`, SECURITY DEFINER, propriétaire postgres →
-- il garde le droit d'exécution. Aucun appel RPC depuis l'application.
--
-- Question d'accès en miroir : personne ne perd de lecture ; seuls les
-- utilisateurs connectés perdent le droit d'appeler ce recalcul directement.
--
-- ⚠️ PUBLIC révoqué aussi (anon ∈ PUBLIC), puis service_role ré-autorisé
-- (même schéma que 20260902090000).
--
-- ACL en prod avant la migration (mesurée le 2026-09-28) :
--   {postgres=X, authenticated=X, service_role=X} — ni PUBLIC ni anon.
-- Propriétaire des deux fonctions (recalcul et trigger) : postgres.
--
-- Rollback (rend exactement l'ACL d'avant) :
--   GRANT EXECUTE ON FUNCTION public.update_student_point_state(uuid, uuid)
--     TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_student_point_state(uuid, uuid)
	FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_student_point_state(uuid, uuid) TO service_role;
