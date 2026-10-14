-- ⛔ DESTRUCTIVE — retrait de l'ancien système « snapshot + versions » (ADR 0029, étape 5B)
-- ==============================================================================
--
-- Accord explicite de David le 2026-10-14, après explication de ce qui est perdu
-- (journal docs/wip/refonte-modeles-chapitre-progress.md § Étape 5). Jouée APRÈS le
-- déploiement de v0.35.0, qui ne lit ni n'écrit plus aucun de ces objets.
--
-- CE QUI EST PERDU (mesuré en prod le 2026-10-15, sauvegardé avant dans
-- ~/chiphre-sauvegardes/modeles-etape5b/avant-suppression-2026-10-15.json) :
--   - `chapter_template_versions` : 1 ligne, la « v1 » figée du modèle quadratique ;
--   - `chapter_templates.content_snapshot` (1 modèle : 4 titres de documents et
--     d'anciennes adresses `storage://`, sans usage) et `current_version` ;
--   - `chapter_template_instantiations.template_version`, `current_template_version`,
--     `last_migrated_at` (2 chapitres liés, valeurs 1 / 1 / null : jamais migrés) ;
--   - le déclencheur `create_initial_version_trigger` qui écrivait une « v1 » ;
--   - la règle de stockage élève « Students can read visible chapter documents »
--     (créée hors migration, prod seulement).
-- Aucune donnée d'élève. Le contenu des modèles vit dans les tables de contenu
-- (rapprochement : le modèle quadratique y a ses 4 documents et 6 sections).
--
-- QUI NE POURRA PLUS LIRE CE QU'IL LISAIT : les élèves perdent l'accès DIRECT au
-- stockage `chapters/<chapitre>/…` de leurs chapitres visibles — accès qui laissait
-- lister et télécharger les fichiers NON publiés (fuite constatée le 2026-10-14).
-- Ils gardent tout ce qui est publié, servi par le serveur après la garde de
-- publication (`/api/documents/[id]`, lien de consultation). Mesuré en prod le
-- 2026-10-14 : 0 document publié sous `chapters/`, 8 sous `templates/`.
-- QUI POURRA LIRE CE QU'IL NE LISAIT PAS : personne.
--
-- Inventaire des usages (grep du 2026-10-15, src/scripts/tests, chaînes et Zod) :
-- dans `src`, plus que des commentaires ; tests et script de semis mis à jour
-- dans la même PR ; en base, seules `link_chapter_to_template` (réécrite ici) et
-- `create_initial_template_version` (supprimée ici) les nommaient.
--
-- ROLLBACK:BEGIN
-- Les DONNÉES ne reviennent pas (voir la sauvegarde JSON). Structure seulement :
-- alter table public.chapter_templates add column content_snapshot jsonb not null default '{}'::jsonb,
--   add column current_version integer not null default 1;
-- alter table public.chapter_template_instantiations add column template_version integer not null default 1,
--   add column current_template_version integer, add column last_migrated_at timestamptz;
-- -- recréer chapter_template_versions, create_initial_template_version et son
-- -- déclencheur depuis le baseline (20260616220000), puis rejouer
-- -- link_chapter_to_template de 20261016103300 (section 4).
-- -- La règle de stockage élève n'est PAS à recréer (elle laissait fuir le non publié).
-- ROLLBACK:END

-- 1. Le déclencheur qui écrivait une « version 1 » à chaque modèle.
drop trigger if exists create_initial_version_trigger on public.chapter_templates;
drop function if exists public.create_initial_template_version();

-- 2. Lier un chapitre : sans numéro de version (sinon identique à 20261016103300 §4).
create or replace function public.link_chapter_to_template(p_chapter_id uuid, p_template_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
	v_inst public.chapter_template_instantiations;
	t text;
begin
	select * into v_inst from public.chapter_template_instantiations
	where chapter_id = p_chapter_id;

	if v_inst.id is null then
		insert into public.chapter_template_instantiations (template_id, chapter_id)
		select ct.id, p_chapter_id
		from public.chapter_templates ct
		where ct.id = p_template_id;
		if not found then
			raise exception 'Modèle introuvable.' using errcode = 'no_data_found';
		end if;
	elsif v_inst.template_id is distinct from p_template_id or v_inst.is_detached then
		raise exception 'Ce chapitre est déjà rattaché à un autre modèle, ou détaché.'
			using errcode = 'check_violation';
	end if;

	insert into public.chapter_sections (chapter_id, source_id)
	select p_chapter_id, s.id from public.chapter_sections s
	where s.template_id = p_template_id
	on conflict do nothing;

	foreach t in array array[
		'chapter_documents', 'chapter_checklist_items', 'chapter_exercises',
		'chapter_worksheets', 'chapter_series'
	] loop
		execute format(
			'insert into public.%I (chapter_id, source_id)
			 select $1, e.id from public.%I e
			 where e.template_id = $2 and e.retired_at is null
			 on conflict do nothing',
			t, t
		) using p_chapter_id, p_template_id;
	end loop;
end;
$$;

-- 3. Les objets de l'ancien système.
drop table public.chapter_template_versions;

alter table public.chapter_templates
	drop column content_snapshot,
	drop column current_version;

alter table public.chapter_template_instantiations
	drop column template_version,
	drop column current_template_version,
	drop column last_migrated_at;

-- 4. La règle de stockage élève de prod (absente des migrations : `if exists`).
drop policy if exists "Students can read visible chapter documents" on storage.objects;
