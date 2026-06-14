-- Migration: Create question-images Storage bucket (drift fix)
-- Description: The `question-images` bucket (the largest bucket, ~254 objects)
-- was created via the Supabase Dashboard on 2025-11-27 and was NEVER captured by
-- a migration. A fresh `db push` (or a new project, e.g. the EU migration) would
-- therefore NOT recreate it -> images broken. This migration removes that drift
-- so the bucket is reproducible from source control.
--
-- Cause racine (c) du plan docs/wip/supabase-eu-migration-plan.md (§10).
--
-- Idempotent : no-op sur la prod actuelle (le bucket existe déjà, `on conflict
-- do nothing`), création sur tout projet neuf.
--
-- Définition reproduite à l'identique de la prod (mesurée le 2026-06-14) :
--   public = true, file_size_limit = 5 MB, allowed_mime_types = null (libre).
-- Pas de policy RLS spécifique : lecture publique via le chemin public ; les
-- uploads d'images de question passent par le service_role côté serveur.
--
-- Note pg_cron : l'extension pg_cron reste activée à la main (Dashboard / API)
-- AVANT le push — volontairement PAS dans une migration (convention existante du
-- projet + Phase 1 du plan de migration EU). Seuls les buckets sont rapatriés ici.

insert into storage.buckets (id, name, public, file_size_limit)
values ('question-images', 'question-images', true, 5242880)
on conflict (id) do nothing;
