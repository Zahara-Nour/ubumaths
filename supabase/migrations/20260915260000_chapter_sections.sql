-- Sections d'un chapitre — l'axe de rangement devient le moment du cours
-- ======================================================================
--
-- Un chapitre rangeait ses contenus par TYPE (documents, exercices, fiches,
-- objectifs, questions de quiz), chacun avec son `display_order`. Il les range
-- désormais par SECTION — « Préparation », « Le cours », « Les exercices »,
-- « Méthodes », « Résumé », « Bilan » — et une section accueille les cinq
-- types côte à côte.
--
-- DÉCISIONS de David (2026-09-14), spec `docs/wip/chapitre-sections-spec.md` :
--   · sections MODIFIABLES chapitre par chapitre (renommer, réordonner,
--     ajouter, supprimer), initialisées avec les six ci-dessus ;
--   · elles REMPLACENT les onglets par type, côté prof comme côté élève ;
--   · les CINQ types reçoivent une section, sans exception ;
--   · PAS de date de publication par section — « publier » a déjà trois sens.
--
-- QUESTION D'ACCÈS : personne ne gagne d'accès. Les élèves liront
-- `chapter_sections` sous exactement les mêmes gardes que le chapitre lui-même
-- (chapitre visible + `is_class_student`, qui filtre `status = 'active'` depuis
-- la migration 20260915220000). Aucune donnée nouvelle n'est exposée : le titre
-- d'une section est écrit par le professeur pour ses élèves.
--
-- ADDITIVE : une table neuve et deux colonnes nullables. Aucun contenu existant
-- n'est déplacé ni supprimé — tout part avec `section_id is null`, donc
-- « Non classé », affiché en fin de chapitre.
--
-- ROLLBACK :
--   alter table public.chapter_documents        drop column if exists section_id, drop column if exists section_order;
--   alter table public.chapter_exercises        drop column if exists section_id, drop column if exists section_order;
--   alter table public.chapter_checklist_items  drop column if exists section_id, drop column if exists section_order;
--   alter table public.chapter_quiz_questions   drop column if exists section_id, drop column if exists section_order;
--   alter table public.chapter_worksheets       drop column if exists section_id, drop column if exists section_order;
--   drop trigger if exists trg_class_chapters_default_sections on public.class_chapters;
--   drop function if exists public.seed_default_chapter_sections();
--   drop table if exists public.chapter_sections;
--   (⚠️ le rollback PERD le rangement : les sections et les rattachements
--    disparaissent. Les ressources, elles, sont intactes.)

-- ---------------------------------------------------------------------------
-- 1. La table
-- ---------------------------------------------------------------------------

create table if not exists public.chapter_sections (
	id uuid primary key default gen_random_uuid(),
	chapter_id uuid not null references public.class_chapters(id) on delete cascade,
	title text not null,
	display_order integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),

	constraint chapter_sections_title_not_blank check (length(btrim(title)) > 0),

	-- Cible de la clé étrangère composite posée plus bas : c'est elle qui fait
	-- garantir PAR LA BASE qu'une ressource ne pointe que vers une section de
	-- SON chapitre. Une validation applicative seule se contourne dès qu'on
	-- ajoute une route.
	constraint chapter_sections_id_chapter_unique unique (id, chapter_id)
);

create index if not exists idx_chapter_sections_chapter
	on public.chapter_sections (chapter_id, display_order);

comment on table public.chapter_sections is
	'Sections d''un chapitre (« Préparation », « Le cours »…). Propres à chaque chapitre : renommables, réordonnables, supprimables. Semées par trigger à la création du chapitre.';
comment on column public.chapter_sections.display_order is
	'Ordre d''affichage dans le chapitre. Réordonnable par le professeur.';

-- ---------------------------------------------------------------------------
-- 2. Le rattachement, sur les cinq tables de contenu
-- ---------------------------------------------------------------------------
--
-- `section_order` et NON `display_order` : les cinq types vivent dans cinq
-- tables et leur `display_order` existant est un ordre PAR TYPE. Mélanger les
-- types dans une section demande un ordre qui traverse les tables ; détourner
-- le sens d'une colonne existante est le genre de piège qui ne se voit qu'en
-- production.
--
-- `on delete set null (section_id)` (PG 15+) et surtout PAS `set null` tout
-- court : la forme sans liste viderait AUSSI `chapter_id`, qui est `not null`.
-- Et jamais `cascade` — supprimer une section effacerait les ressources
-- qu'elle contient.
--
-- ⚠️ CONSÉQUENCE À CONNAÎTRE AVANT D'ÉCRIRE DU CODE : déplacer une ressource
-- d'un chapitre à l'autre impose de vider `section_id` DANS LE MÊME `update`,
-- sinon la clé composite refuse (`23503` : la section appartient à l'ancien
-- chapitre). Aucun chemin actuel ne déplace de ressource entre chapitres —
-- vérifié — mais le glisser-déposer qui vient rend ce piège très probable.

do $$
declare
	t text;
begin
	foreach t in array array[
		'chapter_documents',
		'chapter_exercises',
		'chapter_checklist_items',
		'chapter_quiz_questions',
		'chapter_worksheets'
	] loop
		execute format(
			'alter table public.%I
				add column if not exists section_id uuid,
				add column if not exists section_order integer not null default 0',
			t
		);

		execute format(
			'alter table public.%I
				drop constraint if exists %I,
				add constraint %I
					foreign key (section_id, chapter_id)
					references public.chapter_sections(id, chapter_id)
					on delete set null (section_id)',
			t, t || '_section_fkey', t || '_section_fkey'
		);

		execute format(
			'create index if not exists %I on public.%I (section_id, section_order)',
			'idx_' || t || '_section', t
		);

		execute format(
			'comment on column public.%I.section_id is %L',
			t, 'Section du chapitre qui range ce contenu. NULL = « Non classé », affiché en fin de chapitre. La clé étrangère est composite (section_id, chapter_id) : une section d''un AUTRE chapitre est refusée par la base.'
		);
	end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Les six sections par défaut, posées par TRIGGER
-- ---------------------------------------------------------------------------
--
-- Par trigger et non par le code applicatif : un chapitre naît par au moins
-- deux chemins (création manuelle, instanciation d'un modèle), et une
-- initialisation que chaque chemin doit penser à faire finit par manquer là où
-- on l'oublie — un chapitre sans section n'afficherait rien à ranger.

create or replace function public.seed_default_chapter_sections()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
	insert into public.chapter_sections (chapter_id, title, display_order)
	values
		(new.id, 'Préparation', 1),
		(new.id, 'Le cours', 2),
		(new.id, 'Les exercices', 3),
		(new.id, 'Méthodes', 4),
		(new.id, 'Résumé', 5),
		(new.id, 'Bilan', 6);

	return new;
end;
$function$;

-- `security definer` est GARDÉ délibérément, bien que la policy du professeur
-- suffise aujourd'hui : le trigger est un AFTER INSERT dans la transaction, donc
-- une insertion refusée ANNULERAIT la création du chapitre. Un professeur qui ne
-- peut plus créer de chapitre est une panne pire que le risque théorique que
-- couvre le retrait. À revoir si un jour un chemin crée des chapitres pour le
-- compte d'un élève.
revoke execute on function public.seed_default_chapter_sections() from public, anon;

comment on function public.seed_default_chapter_sections() is
	'Sème les six sections par défaut à la création d''un chapitre. Le professeur peut ensuite les renommer, les réordonner, en ajouter ou en supprimer.';

drop trigger if exists trg_class_chapters_default_sections on public.class_chapters;
create trigger trg_class_chapters_default_sections
	after insert on public.class_chapters
	for each row
	execute function public.seed_default_chapter_sections();

-- ---------------------------------------------------------------------------
-- 4. `updated_at` qui bouge vraiment
-- ---------------------------------------------------------------------------
--
-- `chapter_documents` et `class_chapters` ont ce trigger ; sans lui,
-- `updated_at` resterait éternellement égal à `created_at`. Une colonne d'audit
-- qui ment est pire qu'une colonne absente.

drop trigger if exists update_chapter_sections_updated_at on public.chapter_sections;
create trigger update_chapter_sections_updated_at
	before update on public.chapter_sections
	for each row
	execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 5. RLS — exactement les gardes du chapitre, ni plus ni moins
-- ---------------------------------------------------------------------------

alter table public.chapter_sections enable row level security;

-- ⚠️ `pg_default_acl` accorde toujours tous les droits à `anon` sur une table
-- créée dans `public` par `postgres` : c'est la cause racine de l'audit
-- d'août 2026. La RLS bloque déjà (les policies sont `to authenticated`), mais
-- la deuxième ligne de défense ne se pose qu'ici.
revoke all on public.chapter_sections from anon;

drop policy if exists "Admins can manage all chapter sections" on public.chapter_sections;
create policy "Admins can manage all chapter sections"
	on public.chapter_sections
	for all
	to authenticated
	using (is_admin())
	with check (is_admin());

drop policy if exists "Teachers can manage sections of their chapters" on public.chapter_sections;
create policy "Teachers can manage sections of their chapters"
	on public.chapter_sections
	for all
	to authenticated
	using (
		exists (
			select 1 from public.class_chapters ch
			where ch.id = chapter_sections.chapter_id
				and is_teacher_or_admin()
		)
	)
	with check (
		exists (
			select 1 from public.class_chapters ch
			where ch.id = chapter_sections.chapter_id
				and is_teacher_or_admin()
		)
	);

-- Pas de condition de publication : une section n'en a pas (décision de David).
-- Ce sont les CONTENUS qui portent `published_at`, et une section vide de
-- contenu publié n'est pas affichée — c'est la vue qui le décide, pas la RLS.
drop policy if exists "Students can view sections of visible chapters" on public.chapter_sections;
create policy "Students can view sections of visible chapters"
	on public.chapter_sections
	for select
	to authenticated
	using (
		exists (
			select 1 from public.class_chapters ch
			where ch.id = chapter_sections.chapter_id
				and ch.is_visible = true
				and is_class_student(ch.class_id)
		)
	);
