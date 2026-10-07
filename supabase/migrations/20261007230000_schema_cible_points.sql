-- ============================================================================
-- Schéma cible ADR 0020 — points → nœuds, parcours, références contraintes
-- ============================================================================
-- Spécification validée par David le 2026-10-07 (B1-B7 + C1-C27) :
-- docs/wip/arbre-notions/schema-cible-points… voir schema-cible-spec.md.
--
--   1. `curriculum_points` : `node_id` (nœud de l'arbre, notion ou sous-notion),
--      `grade` (porté par le point), `rubrique` (sommaire du BO, en texte),
--      `objective_id` devient FACULTATIF (un point neuf n'a pas d'objectif) ;
--      `kind` accepte `algorithme` (B3). `rang` est IGNORÉ par la cible (B1) :
--      aucun point neuf n'en recevra, retrait à l'étape destructive.
--   2. `grade_predecessors` : les parcours (prédécesseurs directs), avec la
--      clôture transitive `grade_ancestors()` et un garde anti-cycle (B5).
--   3. `curriculum_point_automatismes` : contrainte de parcours (règle David du
--      2026-10-07) — une référence vise un point des années PRÉCÉDENTES du
--      parcours du grade, ou du grade lui-même ; jamais une voie parallèle ;
--      jamais un point sans grade (ancienne génération, C4/C5).
--   4. Accès (B6) : lecture ANONYME des points, des références et des parcours
--      (contenu public des BO ; aucune donnée d'élève dans ces tables) ;
--      écriture des parcours par l'admin seul ; écriture des points inchangée
--      (prof + admin, les routes `api/teacher/curriculum/*` en dépendent).
--
-- MIGRATION ADDITIVE : aucun point existant n'est modifié (C5 — les 1 007
-- points des anciens seeds restent intouchés, colonnes neuves à NULL).
--
-- Rollback :
--   drop trigger if exists curriculum_point_automatismes_parcours on public.curriculum_point_automatismes;
--   drop function if exists public.curriculum_point_automatismes_check_parcours();
--   drop trigger if exists curriculum_points_node_kind on public.curriculum_points;
--   drop trigger if exists grade_predecessors_no_cycle on public.grade_predecessors;
--   drop function if exists public.grade_predecessors_check_no_cycle();
--   drop function if exists public.grade_ancestors(text);
--   drop table if exists public.grade_predecessors;
--   drop policy if exists "Anyone can read curriculum points" on public.curriculum_points;
--   drop policy if exists "Anyone can read curriculum point automatismes" on public.curriculum_point_automatismes;
--   alter table public.curriculum_points drop constraint curriculum_points_valid_kind;
--   alter table public.curriculum_points add constraint curriculum_points_valid_kind
--     check (kind = any (array['connaissance', 'savoir_faire', 'demonstration']));
--   alter table public.curriculum_points
--     drop column if exists rubrique, drop column if exists grade, drop column if exists node_id;
--   alter table public.curriculum_points alter column objective_id set not null;
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. curriculum_points : nœud, grade, rubrique, kind étendu
-- ----------------------------------------------------------------------------

-- Un point neuf (C4) n'a pas d'objectif : la hiérarchie themes/objectives est
-- remplacée par (grade, rubrique, node_id) et part à l'étape destructive.
alter table public.curriculum_points
	alter column objective_id drop not null;

alter table public.curriculum_points
	add column node_id uuid null references public.classification_nodes (id) on delete restrict,
	add column grade text null,
	add column rubrique text null;

alter table public.curriculum_points
	add constraint curriculum_points_valid_grade check (
		grade is null
		or grade = any (array[
			'CP', 'CE1', 'CE2', 'CM1', 'CM2',
			'6', '5', '4', '3',
			'2', '1_GEN', 'T_GEN', '1_SPE', 'T_SPE', 'T_EXP', 'T_COMP', '1_TECHNO', 'T_TECHNO'
		])
	);

-- B3 : `algorithme` pour les « Exemples d'algorithme » / « Situations
-- algorithmiques » des BO (aujourd'hui noyés dans savoir_faire).
alter table public.curriculum_points
	drop constraint curriculum_points_valid_kind;
alter table public.curriculum_points
	add constraint curriculum_points_valid_kind
		check (kind = any (array['connaissance', 'savoir_faire', 'demonstration', 'algorithme']));

create index curriculum_points_node_id_idx
	on public.curriculum_points (node_id)
	where node_id is not null;

create index curriculum_points_grade_idx
	on public.curriculum_points (grade)
	where grade is not null;

-- C1-C3 : même garde que les rangements de la PR 1 (notion ou sous-notion,
-- jamais une branche, jamais un nœud archivé pour un NOUVEAU rattachement).
create trigger curriculum_points_node_kind
	before insert or update of node_id on public.curriculum_points
	for each row execute function public.classification_target_is_leafish('node_id');

comment on column public.curriculum_points.node_id is
	'Nœud de l''arbre (notion ou sous-notion) auquel le point se rattache (ADR 0020). NULL = point d''ancienne génération (C5).';
comment on column public.curriculum_points.grade is
	'Programme d''appartenance, porté par le point (C4). NULL = point d''ancienne génération (grade via son thème).';
comment on column public.curriculum_points.rubrique is
	'Sommaire du BO pour l''affichage (« Analyse > Trigonométrie »), sur les points neufs (B2).';

-- ----------------------------------------------------------------------------
-- 2. grade_predecessors : les parcours
-- ----------------------------------------------------------------------------

create table public.grade_predecessors (
	grade text not null,
	previous_grade text not null,
	created_at timestamptz not null default now(),
	primary key (grade, previous_grade),
	constraint grade_predecessors_distinct check (grade <> previous_grade),
	constraint grade_predecessors_valid_grade check (
		grade = any (array[
			'CP', 'CE1', 'CE2', 'CM1', 'CM2',
			'6', '5', '4', '3',
			'2', '1_GEN', 'T_GEN', '1_SPE', 'T_SPE', 'T_EXP', 'T_COMP', '1_TECHNO', 'T_TECHNO'
		])
	),
	constraint grade_predecessors_valid_previous check (
		previous_grade = any (array[
			'CP', 'CE1', 'CE2', 'CM1', 'CM2',
			'6', '5', '4', '3',
			'2', '1_GEN', 'T_GEN', '1_SPE', 'T_SPE', 'T_EXP', 'T_COMP', '1_TECHNO', 'T_TECHNO'
		])
	)
);

comment on table public.grade_predecessors is
	'Prédécesseurs DIRECTS de chaque grade (B5). Le parcours antérieur = clôture transitive (grade_ancestors). Permet de vérifier la règle des références d''automatismes (C14-C15).';

-- Le parcours antérieur complet d'un grade (clôture transitive).
create or replace function public.grade_ancestors(p_grade text)
returns setof text
language sql
stable
set search_path = public, pg_temp
as $$
	with recursive anc(g) as (
		select previous_grade from public.grade_predecessors where grade = p_grade
		union
		select gp.previous_grade
		from public.grade_predecessors gp
		join anc on gp.grade = anc.g
	)
	select g from anc;
$$;

comment on function public.grade_ancestors(text) is
	'Tous les grades du parcours ANTÉRIEUR de p_grade (clôture transitive de grade_predecessors). Lecture publique : les parcours sont des données de structure.';

-- C19 : un cycle rendrait la clôture transitive infinie.
create or replace function public.grade_predecessors_check_no_cycle()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
	if exists (
		select 1 from public.grade_ancestors(new.previous_grade) as t(g) where t.g = new.grade
	) then
		raise exception 'Cycle de parcours : « % » est déjà dans le parcours antérieur de « % ».',
			new.grade, new.previous_grade
			using errcode = 'check_violation';
	end if;
	return new;
end;
$$;

create trigger grade_predecessors_no_cycle
	before insert or update on public.grade_predecessors
	for each row execute function public.grade_predecessors_check_no_cycle();

-- Les parcours réels (C18, C20, C21) : primaire → collège → 2de, la 2de se
-- divise en trois voies ; T_EXP descend de 1_SPE (T_SPE est CONCOMITANTE) ;
-- T_GEN (sans programme de maths) reste hors parcours.
insert into public.grade_predecessors (grade, previous_grade) values
	('CE1', 'CP'),
	('CE2', 'CE1'),
	('CM1', 'CE2'),
	('CM2', 'CM1'),
	('6', 'CM2'),
	('5', '6'),
	('4', '5'),
	('3', '4'),
	('2', '3'),
	('1_SPE', '2'),
	('1_GEN', '2'),
	('1_TECHNO', '2'),
	('T_SPE', '1_SPE'),
	('T_COMP', '1_SPE'),
	('T_EXP', '1_SPE'),
	('T_TECHNO', '1_TECHNO');

-- ----------------------------------------------------------------------------
-- 3. curriculum_point_automatismes : contrainte de parcours
-- ----------------------------------------------------------------------------
-- ⚠️ Le trigger lit `curriculum_points` et les parcours avec les droits de
-- l'APPELANT : ne pas restreindre leur lecture sans revoir ce garde (un point
-- masqué tomberait dans la branche « FK s'en chargera » et la vérification du
-- parcours serait sautée en silence — cf. le même avertissement dans la PR 1).

create or replace function public.curriculum_point_automatismes_check_parcours()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
	v_point_grade text;
	v_point_exists boolean;
begin
	select grade, true into v_point_grade, v_point_exists
	from public.curriculum_points where id = new.point_id;

	-- Point inexistant : la clé étrangère le refusera (23503).
	if v_point_exists is not true then
		return new;
	end if;

	-- C4/C5 : un point d'ancienne génération (sans grade) ne se référence pas.
	if v_point_grade is null then
		raise exception 'Un point sans grade (ancienne génération) ne peut pas être référencé par une liste d''automatismes.'
			using errcode = 'check_violation';
	end if;

	-- C13 (auto-référence permise), C14-C15, C21 : le point visé appartient au
	-- parcours antérieur du grade référenceur, ou au grade lui-même.
	if v_point_grade <> new.grade and not exists (
		select 1 from public.grade_ancestors(new.grade) as t(g) where t.g = v_point_grade
	) then
		raise exception 'Référence hors parcours : le programme « % » ne peut pas référencer un point de « % » (voie parallèle ou grade postérieur).',
			new.grade, v_point_grade
			using errcode = 'check_violation';
	end if;

	return new;
end;
$$;

create trigger curriculum_point_automatismes_parcours
	before insert or update on public.curriculum_point_automatismes
	for each row execute function public.curriculum_point_automatismes_check_parcours();

-- ----------------------------------------------------------------------------
-- 4. Droits et RLS
-- ----------------------------------------------------------------------------

-- Fonctions de trigger : EXECUTE fermé (audit sécurité 2026-08 ; un trigger ne
-- vérifie pas EXECUTE chez celui qui déclenche l'écriture). `grade_ancestors`
-- reste exécutable : lecture de données publiques, utilisée par le code et les
-- tests.
revoke execute on function public.grade_predecessors_check_no_cycle() from public, anon, authenticated;
revoke execute on function public.curriculum_point_automatismes_check_parcours() from public, anon, authenticated;

-- grade_predecessors : on repart de zéro (pattern PR 1) — anon lit seulement
-- (une écriture rend 42501 avant même la RLS), authenticated écrit sous RLS.
revoke all on public.grade_predecessors from anon, authenticated;
grant select on public.grade_predecessors to anon;
grant select, insert, update, delete on public.grade_predecessors to authenticated;

alter table public.grade_predecessors enable row level security;

create policy "Anyone can read grade predecessors"
	on public.grade_predecessors for select
	to anon, authenticated
	using (true);

create policy "Admins can insert grade predecessors"
	on public.grade_predecessors for insert
	to authenticated
	with check (public.is_admin());

create policy "Admins can update grade predecessors"
	on public.grade_predecessors for update
	to authenticated
	using (public.is_admin())
	with check (public.is_admin());

create policy "Admins can delete grade predecessors"
	on public.grade_predecessors for delete
	to authenticated
	using (public.is_admin());

-- B6 — LA question d'accès (tranchée par David le 2026-10-07) : les points et
-- les listes d'automatismes deviennent lisibles par les visiteurs non
-- connectés (contenu des BO, documents publics ; aucune donnée d'élève).
-- L'écriture ne change pas : prof + admin (policies « Teachers manage »
-- existantes), et `student_point_state` reste élève + prof (C27).
-- Le rôle anon n'a AUCUN privilège sur ces tables (audit 2026-08) : le GRANT
-- SELECT est nécessaire en plus de la policy.
grant select on public.curriculum_points to anon;
grant select on public.curriculum_point_automatismes to anon;

create policy "Anyone can read curriculum points"
	on public.curriculum_points for select
	to anon
	using (true);

create policy "Anyone can read curriculum point automatismes"
	on public.curriculum_point_automatismes for select
	to anon
	using (true);
