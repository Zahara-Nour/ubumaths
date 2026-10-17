-- Suppression d'un compte : date à laquelle ses fichiers ont été retirés du storage
-- ================================================================================
--
-- Le SQL ne peut pas retirer un fichier du storage (déclencheur protect_objects_delete
-- de Supabase, pas de pg_net). La purge de conservation (run_retention_c11) se contente
-- donc de consigner les chemins dans account_deletion_audit.cleanup_result, et la route
-- de suppression d'un compte les retire « au mieux », sans seconde chance si le retrait
-- échoue. Une tâche hebdomadaire (cron Vercel, PR suivante) reprendra chaque suppression
-- terminée dont les fichiers ne sont pas encore retirés ; cette colonne dit lesquelles.
--
-- Accès : inchangé. account_deletion_audit a la RLS active et aucune policy : seul le
-- client service la lit et l'écrit. Aucune donnée touchée (colonne nulle par défaut).
--
-- Tests : tests/integration/suppression-compte-art17.test.ts
--
-- Rollback :
--   alter table public.account_deletion_audit drop column storage_removed_at;

alter table public.account_deletion_audit
	add column storage_removed_at timestamptz;

comment on column public.account_deletion_audit.storage_removed_at is
	'Fichiers du compte (cleanup_result.storage_paths) retirés du storage ; null = à retirer.';
