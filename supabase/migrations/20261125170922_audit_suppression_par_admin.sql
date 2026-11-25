-- Suppression d'un compte élève par l'admin : qui l'a demandée
-- ==========================================================
--
-- L'admin peut désormais supprimer définitivement un élève depuis la page Users
-- (route /api/admin/users/[id]/delete). Le journal des suppressions doit dire que la
-- demande vient de lui et non de l'élève : null = l'élève lui-même (page Profil),
-- sinon l'identifiant de l'admin.
--
-- Accès (tranché par David le 2026-11-25) : inchangé. account_deletion_audit a la RLS
-- active et aucune policy : seul le client service la lit et l'écrit. Aucune donnée
-- touchée (colonne nulle par défaut).
--
-- La clé étrangère passe à NULL si le compte de l'admin disparaît : elle ne bloque
-- jamais la suppression d'un compte.
--
-- Tests : tests/integration/suppression-eleve-par-admin.test.ts
--
-- Rollback :
--   alter table public.account_deletion_audit drop column requested_by;

alter table public.account_deletion_audit
	add column requested_by uuid references public.profiles (id) on delete set null;

comment on column public.account_deletion_audit.requested_by is
	'Admin qui a demandé la suppression ; null = demandée par l''élève lui-même.';
