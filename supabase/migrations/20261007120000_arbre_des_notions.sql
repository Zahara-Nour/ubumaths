-- ============================================================================
-- Arbre des notions : branche > notion > sous-notion (ADR 0019) — PR 1, base seule
-- ============================================================================
--
-- Migration ADDITIVE : deux tables neuves, une table de liaison, deux colonnes
-- nullables. Aucune donnée existante n'est modifiée ; `exercises.topic`,
-- `exercises.source`, `question_templates.theme / domain / subdomain` restent
-- intacts. Aucun remplissage : la correspondance ancien → nouveau sera validée
-- à part par David.
--
-- Accès (tranché par David le 2026-10-07) :
--   - arbre et types de source : lecture par TOUS (anon compris, archivés
--     compris) ; écriture par l'admin seul ;
--   - rangement d'un exercice : lisible si l'exercice l'est ; écrit avec les
--     droits de modification de l'exercice (policy « Teachers can update own
--     exercises » : rôle teacher ET auteur) ;
--   - `question_templates.classification_node_id` : aucune policy neuve (droits
--     de la table inchangés : admin).
--   Personne ne perd d'accès.
--
-- Aucune fonction SECURITY DEFINER : les triggers de validation tournent avec
-- les droits de l'appelant, qui peut lire l'arbre (lecture publique).
--
-- ----------------------------------------------------------------------------
-- ROLLBACK (à exécuter tel quel, dans cet ordre ; les tables sont neuves, rien
-- d'antérieur n'est perdu — seules les données saisies depuis le seraient) :
--
--   drop trigger if exists question_templates_classification_node_kind on public.question_templates;
--   alter table public.question_templates drop column if exists classification_node_id;
--   alter table public.exercises drop column if exists source_type_id;
--   drop table if exists public.exercise_classifications;
--   drop table if exists public.source_types;
--   drop table if exists public.classification_nodes;
--   drop function if exists public.classification_nodes_validate();
--   drop function if exists public.classification_nodes_check_children();
--   drop function if exists public.classification_target_is_leafish();
-- ----------------------------------------------------------------------------

-- ============================================================================
-- 1. classification_nodes
-- ============================================================================

create table public.classification_nodes (
	id uuid primary key default gen_random_uuid(),
	kind text not null,
	-- RESTRICT : un nœud qui a des enfants ne se supprime pas (il s'archive).
	parent_id uuid null references public.classification_nodes (id) on delete restrict,
	name text not null,
	position integer not null default 0,
	archived_at timestamptz null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),

	constraint classification_nodes_kind_check
		check (kind in ('branch', 'notion', 'subnotion')),
	constraint classification_nodes_name_not_blank
		check (btrim(name) <> ''),
	-- Forme de chaque genre. Le genre du PARENT est vérifié par trigger.
	-- L'arbre ne porte AUCUN niveau scolaire (ADR 0020) : les niveaux se
	-- dérivent des points du programme qui pointent le nœud.
	constraint classification_nodes_shape_check check (
		(kind = 'branch' and parent_id is null)
		or (kind in ('notion', 'subnotion') and parent_id is not null)
	)
);

comment on table public.classification_nodes is
	'Arbre de classement des contenus (ADR 0019, 0020) : branche > notion > sous-notion, sans niveaux scolaires. Lecture publique, écriture admin.';
comment on column public.classification_nodes.archived_at is
	'Nœud retiré des listes sans être supprimé (il peut encore être référencé). Interdit tant qu''un enfant est actif.';

-- Nom unique parmi les frères, casse ignorée ; les branches (parent null) sont
-- frères entre elles, d'où le coalesce vers l'uuid nul.
create unique index classification_nodes_sibling_name_key
	on public.classification_nodes (
		coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
		lower(name)
	);

-- Recherche des enfants (triggers, FK RESTRICT, affichage de l'arbre).
create index classification_nodes_parent_id_idx
	on public.classification_nodes (parent_id);

create trigger classification_nodes_updated_at
	before update on public.classification_nodes
	for each row execute function public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Validation d'une ligne : genre immuable, genre du parent, pas d'enfant
-- actif sous un parent archivé.
-- ----------------------------------------------------------------------------
create or replace function public.classification_nodes_validate()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
	v_parent public.classification_nodes%rowtype;
begin
	-- Le genre ne change pas : changer une notion en branche invaliderait ses
	-- enfants et les contenus rangés. On recrée le nœud à la place.
	if tg_op = 'UPDATE' and new.kind is distinct from old.kind then
		raise exception 'Le genre d''un nœud (%) ne peut pas être modifié.', old.kind
			using errcode = 'check_violation';
	end if;

	if new.parent_id is null then
		-- Racine : la contrainte de forme impose déjà kind = branch.
		return new;
	end if;

	select * into v_parent from public.classification_nodes where id = new.parent_id;
	if not found then
		-- La clé étrangère le refusera avec son propre code (23503).
		return new;
	end if;

	if new.kind = 'notion' and v_parent.kind <> 'branch' then
		raise exception 'Une notion doit avoir une branche pour parent (parent de genre %).', v_parent.kind
			using errcode = 'check_violation';
	end if;

	if new.kind = 'subnotion' and v_parent.kind <> 'notion' then
		raise exception 'Une sous-notion doit avoir une notion pour parent (parent de genre %) : trois niveaux au plus.', v_parent.kind
			using errcode = 'check_violation';
	end if;

	-- Un nœud actif sous un parent archivé casserait l'invariant
	-- « un nœud archivé n'a pas d'enfant actif ».
	if new.archived_at is null and v_parent.archived_at is not null then
		raise exception 'Un nœud actif ne peut pas être placé sous un nœud archivé.'
			using errcode = 'check_violation';
	end if;

	return new;
end;
$$;

create trigger classification_nodes_validate
	before insert or update on public.classification_nodes
	for each row execute function public.classification_nodes_validate();

-- ----------------------------------------------------------------------------
-- Effets sur les enfants d'une modification du parent : archivage.
-- ----------------------------------------------------------------------------
create or replace function public.classification_nodes_check_children()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
	v_child_name text;
begin
	if new.archived_at is not null and old.archived_at is null then
		select c.name into v_child_name
		from public.classification_nodes c
		where c.parent_id = new.id and c.archived_at is null
		limit 1;
		if found then
			raise exception 'Impossible d''archiver « % » : l''enfant « % » est encore actif.', new.name, v_child_name
				using errcode = 'check_violation';
		end if;
	end if;

	return new;
end;
$$;

create trigger classification_nodes_check_children
	before update of archived_at on public.classification_nodes
	for each row execute function public.classification_nodes_check_children();

-- ============================================================================
-- 2. source_types
-- ============================================================================

create table public.source_types (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	position integer not null default 0,
	archived_at timestamptz null,
	created_at timestamptz not null default now(),

	constraint source_types_name_not_blank check (btrim(name) <> '')
);

comment on table public.source_types is
	'Liste fermée des types de source d''exercice (Bac, Brevet, Concours, Manuel…). Lecture publique, écriture admin.';

-- Unicité casse ignorée : « Bac » et « BAC » seraient un doublon pour le filtre.
create unique index source_types_name_key on public.source_types (lower(name));

-- ============================================================================
-- 3. exercises.source_type_id (le texte libre `source` ne bouge pas)
-- ============================================================================

alter table public.exercises
	add column source_type_id uuid null
		references public.source_types (id) on delete restrict;

comment on column public.exercises.source_type_id is
	'Type de source (liste fermée, pour filtrer). Complète le texte libre `source`.';

create index exercises_source_type_id_idx
	on public.exercises (source_type_id)
	where source_type_id is not null;

-- ============================================================================
-- 4. Cible d'un rangement : notion ou sous-notion seulement
-- ============================================================================
-- Fonction de trigger commune : le nom de la colonne visée est passé en
-- argument (TG_ARGV[0]).

create or replace function public.classification_target_is_leafish()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
	v_node_id uuid;
	v_kind text;
	v_archived_at timestamptz;
begin
	v_node_id := (to_jsonb(new) ->> tg_argv[0])::uuid;
	if v_node_id is null then
		return new;
	end if;

	-- `UPDATE OF col` se déclenche dès que la colonne figure dans le SET, même
	-- à valeur égale : seul un NOUVEAU rangement est vérifié. Un rangement
	-- existant reste valide si son nœud a été archivé après coup.
	if tg_op = 'UPDATE' and v_node_id is not distinct from (to_jsonb(old) ->> tg_argv[0])::uuid then
		return new;
	end if;

	select kind, archived_at into v_kind, v_archived_at
	from public.classification_nodes where id = v_node_id;
	-- Nœud inexistant : la clé étrangère le refusera (23503).
	if not found then
		return new;
	end if;

	if v_kind not in ('notion', 'subnotion') then
		raise exception 'Un contenu se range dans une notion ou une sous-notion, pas dans une branche.'
			using errcode = 'check_violation';
	end if;

	if v_archived_at is not null then
		raise exception 'Un contenu ne se range pas dans un nœud archivé.'
			using errcode = 'check_violation';
	end if;

	return new;
end;
$$;

-- ============================================================================
-- 5. exercise_classifications
-- ============================================================================

create table public.exercise_classifications (
	exercise_id uuid not null references public.exercises (id) on delete cascade,
	node_id uuid not null references public.classification_nodes (id) on delete restrict,
	is_primary boolean not null default false,
	position integer not null default 0,
	created_at timestamptz not null default now(),
	primary key (exercise_id, node_id)
);

comment on table public.exercise_classifications is
	'Rangement d''un exercice dans un ou plusieurs nœuds (notion ou sous-notion) de l''arbre ; au plus un principal.';

-- Au plus un rangement principal par exercice.
create unique index exercise_classifications_one_primary
	on public.exercise_classifications (exercise_id)
	where is_primary;

-- « Quels exercices dans ce nœud ? » et vérification de la FK RESTRICT.
create index exercise_classifications_node_id_idx
	on public.exercise_classifications (node_id);

create trigger exercise_classifications_node_kind
	before insert or update of node_id on public.exercise_classifications
	for each row execute function public.classification_target_is_leafish('node_id');

-- ============================================================================
-- 6. question_templates.classification_node_id
-- ============================================================================

alter table public.question_templates
	add column classification_node_id uuid null
		references public.classification_nodes (id) on delete restrict;

comment on column public.question_templates.classification_node_id is
	'Nœud de l''arbre (notion ou sous-notion) où le modèle est rangé. Remplacera theme/domain/subdomain.';

create index question_templates_classification_node_id_idx
	on public.question_templates (classification_node_id)
	where classification_node_id is not null;

create trigger question_templates_classification_node_kind
	before insert or update of classification_node_id on public.question_templates
	for each row execute function public.classification_target_is_leafish('classification_node_id');

-- ============================================================================
-- 7. Droits de table
-- ============================================================================
-- Les privilèges par défaut du schéma donnent TOUT à anon et authenticated sur
-- une table neuve. On repart de zéro : anon lit seulement (une écriture rend
-- alors 42501 « permission denied », sans même atteindre la RLS) ;
-- authenticated garde l'écriture, filtrée par la RLS.

revoke all on public.classification_nodes, public.source_types, public.exercise_classifications
	from anon, authenticated;

grant select on public.classification_nodes, public.source_types, public.exercise_classifications
	to anon;
grant select, insert, update, delete
	on public.classification_nodes, public.source_types, public.exercise_classifications
	to authenticated;

-- Les fonctions de trigger ne s'appellent pas directement : personne n'en a
-- besoin, on ferme EXECUTE à PUBLIC, anon ET authenticated (cf. audit sécurité
-- 2026-08). Un trigger ne vérifie pas EXECUTE chez celui qui déclenche
-- l'écriture : les triggers restent actifs (prouvé par les tests d'intégration).
revoke execute on function public.classification_nodes_validate() from public, anon, authenticated;
revoke execute on function public.classification_nodes_check_children() from public, anon, authenticated;
revoke execute on function public.classification_target_is_leafish() from public, anon, authenticated;

-- ============================================================================
-- 8. RLS
-- ============================================================================

alter table public.classification_nodes enable row level security;
alter table public.source_types enable row level security;
alter table public.exercise_classifications enable row level security;

-- --- classification_nodes : lecture publique, écriture admin ---------------

-- ⚠️ Ne pas restreindre cette lecture sans revoir les triggers : ils lisent
-- l'arbre avec les droits de l'appelant, et un parent ou un nœud masqué
-- tomberait dans leur branche `if not found then return new` — la vérification
-- du genre (parent, cible d'un rangement) serait alors sautée en silence.
create policy "Anyone can read classification nodes"
	on public.classification_nodes for select
	to anon, authenticated
	using (true);

create policy "Admins can insert classification nodes"
	on public.classification_nodes for insert
	to authenticated
	with check (public.is_admin());

create policy "Admins can update classification nodes"
	on public.classification_nodes for update
	to authenticated
	using (public.is_admin())
	with check (public.is_admin());

create policy "Admins can delete classification nodes"
	on public.classification_nodes for delete
	to authenticated
	using (public.is_admin());

-- --- source_types : lecture publique, écriture admin -----------------------

create policy "Anyone can read source types"
	on public.source_types for select
	to anon, authenticated
	using (true);

create policy "Admins can insert source types"
	on public.source_types for insert
	to authenticated
	with check (public.is_admin());

create policy "Admins can update source types"
	on public.source_types for update
	to authenticated
	using (public.is_admin())
	with check (public.is_admin());

create policy "Admins can delete source types"
	on public.source_types for delete
	to authenticated
	using (public.is_admin());

-- --- exercise_classifications ----------------------------------------------
-- Lecture : la sous-requête sur `exercises` s'exécute SOUS la RLS de
-- `exercises` (pas de SECURITY DEFINER) : on voit le rangement exactement
-- quand on voit l'exercice (public, auteur, élève affecté).

create policy "Read classifications of readable exercises"
	on public.exercise_classifications for select
	to anon, authenticated
	using (
		exists (
			select 1 from public.exercises e
			where e.id = exercise_classifications.exercise_id
		)
	);

-- Écriture : reproduit « Teachers can update own exercises » (rôle teacher ET
-- auteur de l'exercice), sans l'élargir — l'admin n'y figure pas non plus.

create policy "Teachers can insert classifications of own exercises"
	on public.exercise_classifications for insert
	to authenticated
	with check (
		exists (
			select 1 from public.profiles p
			where p.id = auth.uid() and p.role = 'teacher'::public.user_role
		)
		and exists (
			select 1 from public.exercises e
			where e.id = exercise_classifications.exercise_id
				and e.created_by = auth.uid()
		)
	);

create policy "Teachers can update classifications of own exercises"
	on public.exercise_classifications for update
	to authenticated
	using (
		exists (
			select 1 from public.profiles p
			where p.id = auth.uid() and p.role = 'teacher'::public.user_role
		)
		and exists (
			select 1 from public.exercises e
			where e.id = exercise_classifications.exercise_id
				and e.created_by = auth.uid()
		)
	)
	with check (
		exists (
			select 1 from public.exercises e
			where e.id = exercise_classifications.exercise_id
				and e.created_by = auth.uid()
		)
	);

create policy "Teachers can delete classifications of own exercises"
	on public.exercise_classifications for delete
	to authenticated
	using (
		exists (
			select 1 from public.profiles p
			where p.id = auth.uid() and p.role = 'teacher'::public.user_role
		)
		and exists (
			select 1 from public.exercises e
			where e.id = exercise_classifications.exercise_id
				and e.created_by = auth.uid()
		)
	);
