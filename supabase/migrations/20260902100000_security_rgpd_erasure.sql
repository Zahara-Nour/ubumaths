-- ============================================================================
-- SECURITY — Vague 1 RGPD (voir docs/wip/security-audit-2026-08.md)
-- Findings H14 (pending_students jamais purgé) + H15 (FK moderation_logs bloque
-- la suppression de compte staff).
-- ============================================================================

-- H15 — moderation_logs.moderator_id : NO ACTION (défaut) → supprimer un prof/admin
-- ayant modéré fait échouer TOUTE la transaction d'effacement (Art. 17 impossible).
-- La table sœur message_moderation_logs utilise déjà ON DELETE. On garde le log
-- (safeguarding) en anonymisant le modérateur : SET NULL, ce qui exige que la
-- colonne soit nullable (elle est NOT NULL aujourd'hui).
ALTER TABLE public.moderation_logs ALTER COLUMN moderator_id DROP NOT NULL;
ALTER TABLE public.moderation_logs
	DROP CONSTRAINT IF EXISTS moderation_logs_moderator_id_fkey;
ALTER TABLE public.moderation_logs
	ADD CONSTRAINT moderation_logs_moderator_id_fkey
	FOREIGN KEY (moderator_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- H14 — pending_students conserve email/parent_email/noms en clair indéfiniment :
-- l'activation ne faisait que `is_activated = TRUE` (jamais DELETE), et
-- delete_user_account ne la touchait pas → PII de chaque mineur importé (+ email
-- parent) retenue pour toujours après effacement, et clé de ré-identification.
--
-- On supprime la ligne pending_students dès qu'un vrai profil existe pour cet email
-- (l'activation), via un trigger AFTER INSERT sur profiles — sans toucher au trigger
-- de signup handle_new_user (fragile). handle_new_user lit pending_students AVANT
-- de créer le profil, donc les données sont déjà copiées ; son `UPDATE … is_activated`
-- ultérieur devient un no-op inoffensif (ligne déjà supprimée).
-- Reste (retention des lignes JAMAIS activées) → job cron, différé (M19).
CREATE OR REPLACE FUNCTION public.purge_pending_student_on_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
	-- The real profile now holds the data; drop the redundant pending_students PII.
	DELETE FROM public.pending_students
	WHERE lower(email) = lower(NEW.email);
	RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.purge_pending_student_on_activation() IS
	'RGPD (H14): deletes the redundant pending_students PII row once a real profile exists for that email.';

DROP TRIGGER IF EXISTS purge_pending_student_on_activation_trg ON public.profiles;
CREATE TRIGGER purge_pending_student_on_activation_trg
	AFTER INSERT ON public.profiles
	FOR EACH ROW
	EXECUTE FUNCTION public.purge_pending_student_on_activation();

-- Backfill: purge pending_students rows that already have a matching profile
-- (previously activated imports whose PII was never removed).
DELETE FROM public.pending_students ps
WHERE EXISTS (
	SELECT 1 FROM public.profiles p WHERE lower(p.email) = lower(ps.email)
);
