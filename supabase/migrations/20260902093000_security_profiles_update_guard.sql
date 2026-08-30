-- ============================================================================
-- SECURITY INCIDENT — Vague 0 (voir docs/wip/security-audit-2026-08.md)
-- Finding C4 : élévation de privilège vers `admin` par tout élève connecté.
-- ============================================================================
-- La policy "Teachers can update student rewards in their classes" était :
--   FOR UPDATE, rôles PUBLIC, USING ((auth.uid() = id) OR (… is_teacher_or_admin()))
--   WITH CHECK = NULL
-- Postgres réutilise USING comme WITH CHECK ⇒ la branche self `auth.uid() = id`
-- laissait un élève faire `UPDATE profiles SET role='admin' WHERE id = <self>`
-- (les policies permissives sont OR'd, donc la bonne policy "Users can update
-- own profile" — qui épingle role/status — était court-circuitée).
--
-- Correctif en deux temps :
--   1. Recréer la policy SANS la branche self et AVEC un WITH CHECK qui borne la
--      cible à une ligne `student` d'une classe gérée. L'auto-update légitime
--      passe désormais uniquement par "Users can update own profile" (déjà sûre).
--   2. Trigger de défense en profondeur : tout changement de `role` par un
--      non-admin authentifié est rejeté, quelle que soit la policy.
-- ============================================================================

-- 1. Policy rewards : teacher → student uniquement, avec WITH CHECK ---------------
DROP POLICY IF EXISTS "Teachers can update student rewards in their classes" ON public.profiles;

CREATE POLICY "Teachers can update student rewards in their classes"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
	(role = 'student'::user_role)
	AND EXISTS (
		SELECT 1
		FROM class_members cm
		JOIN classes c ON c.id = cm.class_id
		WHERE cm.student_id = profiles.id
		  AND public.is_teacher_or_admin()
	)
)
WITH CHECK (
	(role = 'student'::user_role)
	AND EXISTS (
		SELECT 1
		FROM class_members cm
		JOIN classes c ON c.id = cm.class_id
		WHERE cm.student_id = profiles.id
		  AND public.is_teacher_or_admin()
	)
);

COMMENT ON POLICY "Teachers can update student rewards in their classes" ON public.profiles IS
	'Teacher/admin may update a STUDENT class member''s row (rewards). WITH CHECK pins the target to role=student so a teacher cannot escalate a student to teacher/admin. Self-updates go through "Users can update own profile". Hardened 2026-08-30 (finding C4).';

-- 2. Trigger : aucun changement de `role` par un non-admin authentifié ----------
CREATE OR REPLACE FUNCTION public.guard_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
	-- auth.uid() IS NULL ⇒ service_role / contexte interne (handle_new_user,
	-- scripts d'admin) : autorisé. Un admin authentifié : autorisé. Tout autre
	-- utilisateur authentifié modifiant `role` : rejeté.
	IF NEW.role IS DISTINCT FROM OLD.role
		AND auth.uid() IS NOT NULL
		AND NOT public.is_admin()
	THEN
		RAISE EXCEPTION 'role change requires admin privileges'
			USING ERRCODE = '42501';
	END IF;
	RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.guard_profile_role_change() IS
	'Defense-in-depth: blocks any profiles.role change by an authenticated non-admin, independent of RLS policies (finding C4).';

DROP TRIGGER IF EXISTS guard_profile_role_change_trg ON public.profiles;
CREATE TRIGGER guard_profile_role_change_trg
	BEFORE UPDATE OF role ON public.profiles
	FOR EACH ROW
	EXECUTE FUNCTION public.guard_profile_role_change();
