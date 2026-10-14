-- Masquer une section dans un chapitre (ADR 0029, décision de David du 2026-10-14)
-- ==============================================================================
--
-- Une section se masque comme un élément : « pas ce chapitre-là cette année ».
-- Masquer une section masque — donc dépublie — tout ce qu'elle contient (éléments
-- du modèle comme éléments propres à la classe) ; la réafficher fait revenir son
-- contenu, NON publié (republier reste un geste du prof). Un élément que le modèle
-- ajoute plus tard dans une section masquée arrive masqué. Une section du MODÈLE ne
-- se masque pas : le masquage est une décision de classe.
-- Journal : docs/wip/refonte-modeles-chapitre-progress.md.
--
-- QUI POURRA LIRE QUOI, QU'IL NE POUVAIT PAS LIRE AVANT : personne. Masquer une
-- section retire aux élèves de CETTE classe ce qu'elle contenait (dépublication
-- voulue par le prof) ; rien ne devient lisible. Les élèves n'écrivent pas ces
-- tables. Aucune policy ne change.
--
-- Additive : une colonne `hidden` (défaut false) sur `chapter_sections`, une
-- contrainte satisfaite par toutes les lignes existantes, un déclencheur neuf, et
-- `modele_lien_remplir` remplacée (seul ajout : un lien qui naît dans une section
-- masquée naît masqué).
--
-- ROLLBACK:BEGIN
-- -- D'ABORD rejouer `public.modele_lien_remplir()` de 20261016103300 (section 3a) :
-- -- la version ci-dessous lit `chapter_sections.hidden`.
-- drop trigger if exists section_masquee_propage on public.chapter_sections;
-- drop function if exists public.section_masquee_propage();
-- alter table public.chapter_sections drop constraint if exists chapter_sections_masque_sur_chapitre;
-- alter table public.chapter_sections drop column if exists hidden;
-- -- Les éléments masqués par une section le restent (colonne `hidden` de chaque table).
-- ROLLBACK:END

alter table public.chapter_sections
	add column hidden boolean not null default false,
	add constraint chapter_sections_masque_sur_chapitre
		check (not hidden or chapter_id is not null);

-- ---------------------------------------------------------------------------
-- 1. Masquer / réafficher une section → son contenu suit
-- ---------------------------------------------------------------------------
-- SECURITY INVOKER : les écritures passent par la RLS de l'appelant (le prof).
create function public.section_masquee_propage()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
	t text;
begin
	foreach t in array array[
		'chapter_documents', 'chapter_checklist_items', 'chapter_exercises',
		'chapter_worksheets', 'chapter_series'
	] loop
		if new.hidden then
			execute format(
				'update public.%I set hidden = true, published_at = null
				 where chapter_id = $1 and section_id = $2 and not hidden',
				t
			) using new.chapter_id, new.id;
		else
			execute format(
				'update public.%I set hidden = false
				 where chapter_id = $1 and section_id = $2 and hidden',
				t
			) using new.chapter_id, new.id;
		end if;
	end loop;
	return null;
end;
$$;

create trigger section_masquee_propage
	after update of hidden on public.chapter_sections
	for each row when (new.hidden is distinct from old.hidden)
	execute function public.section_masquee_propage();

-- ---------------------------------------------------------------------------
-- 2. Un lien qui naît dans une section masquée naît masqué
-- ---------------------------------------------------------------------------
-- Identique à 20261016103300 (section 3a), plus le masquage hérité de la section.
create or replace function public.modele_lien_remplir()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
	v_src jsonb;
	v_section uuid;
	v_section_masquee boolean;
	v_cles text[] := tg_argv || array['display_order', 'section_order'];
begin
	if new.source_id is null then
		return new;
	end if;

	execute format('select to_jsonb(s) from public.%I s where s.id = $1', tg_table_name)
		into v_src using new.source_id;

	if v_src is null or v_src->>'template_id' is null then
		raise exception 'Lien refusé : la source n''est pas un élément de modèle.'
			using errcode = 'foreign_key_violation';
	end if;

	if not exists (
		select 1 from public.chapter_template_instantiations i
		where i.chapter_id = new.chapter_id
			and i.template_id = (v_src->>'template_id')::uuid
			and not i.is_detached
	) then
		raise exception 'Lien refusé : ce chapitre n''est pas lié à ce modèle.'
			using errcode = 'insufficient_privilege';
	end if;

	new := jsonb_populate_record(
		new,
		(select jsonb_object_agg(k, v_src->k) from unnest(v_cles) k where v_src ? k)
	);

	-- La section du modèle → la ligne de lien de cette section dans le chapitre ;
	-- masquée là, l'élément naît masqué (donc non publié).
	if tg_table_name <> 'chapter_sections' and v_src->>'section_id' is not null then
		select s.id, s.hidden into v_section, v_section_masquee
		from public.chapter_sections s
		where s.chapter_id = new.chapter_id
			and s.source_id = (v_src->>'section_id')::uuid;
		new := jsonb_populate_record(new, jsonb_build_object('section_id', v_section));
		if coalesce(v_section_masquee, false) then
			new := jsonb_populate_record(
				new,
				jsonb_build_object('hidden', true, 'published_at', null)
			);
		end if;
	end if;

	return new;
end;
$$;
