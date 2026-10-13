-- Figures géométriques stockées (ADR 0027)
-- ==============================================================================
--
-- Une figure = un script du DSL de géométrie (`geometry-core`), enregistré pour
-- être retrouvé, filtré (niveaux, tags) et partagé. Distincte des constructions
-- animées (`constructions`, constructions-v2) : décision de David du 2026-10-13.
--
-- QUI POURRA LIRE QUOI, QU'IL NE POUVAIT PAS LIRE AVANT (tranché par David) :
--   - tout le monde, même sans compte (`anon`), lit les figures PUBLIQUES
--     (`is_public`) : titre, description, script, niveaux. Une figure ne contient
--     rien de personnel ; c'est ce qui rend un lien vers elle lisible depuis le
--     cahier de texte partagé ;
--   - l'auteur lit en plus ses figures privées ;
--   - seuls le prof et l'admin créent ; chacun ne modifie et ne supprime QUE ses
--     propres figures (l'admin ne touche pas à celles du prof, et inversement) ;
--   - les élèves ne font que lire les figures publiques.
--   - Tags : `resource_tags` accepte le type `geometry_figure`. Sa policy de
--     lecture existante (`authenticated`, `true`) laisse tout utilisateur
--     connecté lire les liens de tag d'une figure, même privée (le tag et
--     l'identifiant, jamais le titre ni le script) : accepté par David, comme
--     pour les exercices. `anon` ne lit pas ces liens.
--
-- Additive : une table neuve ; la contrainte `resource_tags_valid_kind` est
-- recréée avec UN type de plus (aucune ligne existante ne peut la violer).
--
-- Rollback :
--   drop trigger if exists geometry_figures_drop_tags on public.geometry_figures;
--   drop function if exists public.geometry_figures_drop_tags();
--   drop table if exists public.geometry_figures;
--   delete from public.resource_tags where resource_kind = 'geometry_figure';
--   alter table public.resource_tags drop constraint resource_tags_valid_kind;
--   alter table public.resource_tags add constraint resource_tags_valid_kind check (
--     resource_kind = any (array[
--       'exercise', 'question', 'assessment', 'chapter', 'document',
--       'python_exercise', 'construction', 'worksheet', 'parody_evaluation'
--     ]));

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------

create table public.geometry_figures (
	id uuid primary key default gen_random_uuid(),
	-- Supprimer le compte de l'auteur supprime ses figures (effacement RGPD).
	author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
	title text not null check (length(trim(title)) between 1 and 200),
	description text check (description is null or length(description) <= 2000),
	-- 100 000 = MAX_DSL_SOURCE_LENGTH de l'interpréteur (le flocon de Koch en fait 77 000).
	dsl_script text not null check (length(trim(dsl_script)) between 1 and 100000),
	grades text[] not null default '{}' check (public.is_valid_grade_array(grades)),
	is_public boolean not null default false,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

comment on table public.geometry_figures is
	'Figures géométriques stockées : script du DSL geometry-core (ADR 0027). Publique = lisible par tous, même sans compte.';

create index idx_geometry_figures_author on public.geometry_figures (author_id);
create index idx_geometry_figures_public on public.geometry_figures (updated_at desc) where is_public;
create index idx_geometry_figures_grades on public.geometry_figures using gin (grades);

create trigger update_geometry_figures_updated_at
	before update on public.geometry_figures
	for each row execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 2. Tags : le type `geometry_figure`, et le ménage à la suppression
-- ---------------------------------------------------------------------------

alter table public.resource_tags drop constraint resource_tags_valid_kind;
alter table public.resource_tags add constraint resource_tags_valid_kind check (
	resource_kind = any (array[
		'exercise', 'question', 'assessment', 'chapter', 'document',
		'python_exercise', 'construction', 'worksheet', 'parody_evaluation',
		'geometry_figure'
	])
);

-- `resource_tags` n'a pas de FK vers la ressource (polymorphe) : sans ce
-- trigger, supprimer une figure laisserait ses liens de tag orphelins.
-- SECURITY DEFINER : la suppression d'un COMPTE (auth.admin.deleteUser) arrive
-- ici en cascade sous `supabase_auth_admin`, qui n'a pas DELETE sur
-- `resource_tags` ; en SECURITY INVOKER elle échouait (audit du 2026-10-13,
-- test 14). La fonction n'efface que les liens de la figure supprimée, et
-- refuse un appelant connecté qui n'est ni prof ni admin (garde avant toute
-- lecture, comme les triggers de 20261013120000_tags_modeles_points).
create function public.geometry_figures_drop_tags()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
	if coalesce(auth.role(), '') in ('anon', 'authenticated') and not public.is_teacher_or_admin() then
		raise exception 'Suppression refusée : droits insuffisants.' using errcode = 'insufficient_privilege';
	end if;
	delete from public.resource_tags
	where resource_kind = 'geometry_figure' and resource_id = old.id;
	return old;
end;
$$;

create trigger geometry_figures_drop_tags
	after delete on public.geometry_figures
	for each row execute function public.geometry_figures_drop_tags();

-- ---------------------------------------------------------------------------
-- 3. Droits et RLS
-- ---------------------------------------------------------------------------

revoke all on public.geometry_figures from anon, authenticated;
grant select on public.geometry_figures to anon;
grant select, insert, delete on public.geometry_figures to authenticated;
-- UPDATE colonne par colonne : ni `id` (ses liens de tag deviendraient orphelins), ni
-- `author_id`, ni les dates (`updated_at` est posé par le trigger).
grant update (title, description, dsl_script, grades, is_public) on public.geometry_figures to authenticated;

alter function public.geometry_figures_drop_tags() owner to postgres;
revoke execute on function public.geometry_figures_drop_tags() from public, anon, authenticated;

alter table public.geometry_figures enable row level security;

create policy "Anyone can read public geometry figures"
	on public.geometry_figures for select
	to anon, authenticated
	using (is_public);

create policy "Authors read their own geometry figures"
	on public.geometry_figures for select
	to authenticated
	using (author_id = (select auth.uid()));

create policy "Teachers and admins create their own geometry figures"
	on public.geometry_figures for insert
	to authenticated
	with check ((select public.is_teacher_or_admin()) and author_id = (select auth.uid()));

create policy "Authors update their own geometry figures"
	on public.geometry_figures for update
	to authenticated
	using ((select public.is_teacher_or_admin()) and author_id = (select auth.uid()))
	with check ((select public.is_teacher_or_admin()) and author_id = (select auth.uid()));

create policy "Authors delete their own geometry figures"
	on public.geometry_figures for delete
	to authenticated
	using ((select public.is_teacher_or_admin()) and author_id = (select auth.uid()));
