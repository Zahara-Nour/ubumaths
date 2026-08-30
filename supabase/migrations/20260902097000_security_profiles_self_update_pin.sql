-- ============================================================================
-- SECURITY INCIDENT — Vague 0 (voir docs/wip/security-audit-2026-08.md)
-- Finding F2 (revue sécurité) : auto-écriture de `gidouilles` / `school_id`.
-- ============================================================================
-- La policy "Users can update own profile" épinglait seulement `role` et `status`
-- dans son WITH CHECK. `authenticated` ayant le GRANT UPDATE sur profiles, un
-- élève pouvait `PATCH /rest/v1/profiles?id=eq.<self>` avec :
--   {"gidouilles": 999999}  → monnaie illimitée en une requête
--   {"school_id": "<autre>"} → franchit la frontière école (safeguarding)
--
-- Correctif : étendre le WITH CHECK.
--   * gidouilles : autorisé à rester égal ou DIMINUER, jamais augmenter. Les
--     gains légitimes passent par des fonctions SECURITY DEFINER (add_student_
--     gidouilles, draw_multiple_vip_cards…) qui s'exécutent en tant que
--     propriétaire de la table et BYPASSENT la RLS — donc non affectées. La seule
--     baisse directe côté client (api/student/buddy/change) reste permise (<=).
--   * school_id : figé (aucun flux élève ne change sa propre école ; les
--     changements admin passent par d'autres policies).
--
-- La sous-requête `(SELECT … FROM profiles WHERE id = auth.uid())` lit la valeur
-- AVANT update (snapshot de début d'instruction), exactement comme le pinning de
-- `role`/`status` déjà en place — donc NEW est comparé à OLD.
-- ⚠️ `vip_cards` n'est PAS figé ici : des flux authentifiés directs légitimes
-- l'écrivent (vip-card-actions.ts). → durcissement Vague 1 (passage en RPC).
-- ============================================================================

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
	(auth.uid() = id)
	AND (role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid()))
	AND (status = get_user_status(auth.uid()))
	-- finding F2: no self-inflation of currency, no self-move across schools.
	AND (COALESCE(gidouilles, 0) <= COALESCE((SELECT p.gidouilles FROM profiles p WHERE p.id = auth.uid()), 0))
	AND (school_id IS NOT DISTINCT FROM (SELECT p.school_id FROM profiles p WHERE p.id = auth.uid()))
);

COMMENT ON POLICY "Users can update own profile" ON public.profiles IS
	'Self-update: pins role & status (unchanged), caps gidouilles at current (award only via SECURITY DEFINER RPCs, which bypass RLS), and freezes school_id. Hardened 2026-08-30 (finding F2).';
