-- ============================================================================
-- Catalogue de tags unifié (phase 3 du chantier de référencement) — ADDITIVE
-- ============================================================================
-- Cinq vocabulaires cohabitaient : le catalogue `tags` + jonction pour les
-- exercices, un catalogue `python_tags` au schéma IDENTIQUE pour les exercices
-- Python, et des colonnes `text[]` libres sur `constructions`, `worksheets` et
-- `parody_evaluations`. Chercher « toutes mes ressources sur les fractions »
-- imposait donc d'interroger cinq formes différentes.
--
-- Décision produit (David, 2026-09-08) : **folksonomie normalisée**, pas de
-- vocabulaire fermé. Le vocabulaire contrôlé existe déjà — c'est le référentiel
-- curriculum — et en avoir deux serait un de trop. Ce qui menace une folksonomie
-- à un seul auteur n'est pas la divergence entre contributeurs mais
-- `algebre` / `algèbre` / `Algebre`. C'est un problème de données : on le règle
-- par un `slug` normalisé et un index unique.
--
-- QUESTION D'ACCÈS : **personne ne gagne d'accès en lecture sur du contenu**.
-- `resource_tags` ne contient que des associations (type, id, tag) ; ses
-- policies calquent celles du catalogue `tags` : lecture pour tout compte
-- connecté, écriture réservée au prof et à l'admin. Connaître le nom d'un tag
-- n'a jamais été sensible — le catalogue `tags` est déjà lisible ainsi.
--
-- ⚠️ MIGRATION VOLONTAIREMENT ADDITIVE. Elle CRÉE et RECOPIE, elle ne supprime
-- rien : ni `exercise_tags`, ni `python_tags`, ni les colonnes `text[]`. Le
-- nettoyage est une migration destructive distincte, qui demande un accord
-- explicite (règle absolue du CLAUDE.md). Tant qu'il n'a pas eu lieu, les deux
-- représentations coexistent et l'ancienne reste la source d'écriture.
--
-- ROLLBACK :
--   drop table if exists public.resource_tags;
--   drop index if exists public.idx_tags_slug;
--   alter table public.tags drop column if exists slug;
--   drop function if exists public.tag_slug(text);
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Normalisation des noms de tags
-- ---------------------------------------------------------------------------
-- `immutable` est exigé pour indexer la colonne générée. `unaccent()` ne l'est
-- pas (son dictionnaire est chargeable à chaud), on ne peut donc PAS s'en servir
-- ici : la translittération est faite à la main sur les caractères réellement
-- utilisés en français. C'est moins élégant qu'`unaccent` et c'est le prix de
-- l'immutabilité.
create or replace function public.tag_slug(p_name text)
returns text
language sql
immutable
strict
set search_path = public
as $$
	select nullif(
		regexp_replace(
			regexp_replace(
				lower(translate(
					btrim(p_name),
					'àáâãäåÀÁÂÃÄÅèéêëÈÉÊËìíîïÌÍÎÏòóôõöÒÓÔÕÖùúûüÙÚÛÜçÇñÑ',
					-- ⚠️ Les deux chaînes doivent faire EXACTEMENT la même longueur (50) :
					-- `translate()` apparie caractère par caractère, et une seule espace
					-- parasite décale tout ce qui suit. Une première version avait 51
					-- caractères ici, ce qui donnait ç→U, ù→O, ñ→C : « leçon » devenait
					-- `leuon` et le slug redevenait sensible à la casse.
					'aaaaaaAAAAAAeeeeEEEEiiiiIIIIoooooOOOOOuuuuUUUUcCnN'
				)),
				'[^a-z0-9]+', '-', 'g'
			),
			'^-+|-+$', '', 'g'
		),
		''
	);
$$;

comment on function public.tag_slug(text) is
	'Forme canonique d''un nom de tag : sans accent, minuscules, kebab-case. IMMUTABLE (donc indexable), d''où la translittération manuelle plutôt qu''unaccent(), qui ne l''est pas.';

-- Colonne générée : impossible de la désynchroniser du nom.
alter table public.tags
	add column if not exists slug text generated always as (public.tag_slug(name)) stored;

comment on column public.tags.slug is
	'Forme canonique du nom, unique. « Algèbre », « algebre » et « ALGEBRE » retombent sur la même ligne ; le libellé affiché reste celui qui a été saisi.';

-- ⚠️ Index unique créé SANS `concurrently` : la table `tags` est un petit
-- catalogue (quelques centaines de lignes au plus) et `concurrently` est
-- interdit dans une migration transactionnelle. Si des doublons existent déjà,
-- la migration ÉCHOUE ici — c'est voulu : mieux vaut refuser que fusionner des
-- tags sans que personne l'ait décidé. Le cas échéant, dédoublonner d'abord.
create unique index if not exists idx_tags_slug on public.tags (slug);

-- ---------------------------------------------------------------------------
-- 2. La jonction polymorphe
-- ---------------------------------------------------------------------------
-- Pas de clé étrangère vers la ressource : elle pointe vers cinq tables
-- différentes. C'est le compromis assumé du polymorphisme — en échange, une
-- seule table remplace les jonctions par couple (conteneur × type), qui
-- explosaient en combinatoire.
--
-- L'intégrité côté tag, elle, est réelle : `tag_id` est une vraie FK.
create table if not exists public.resource_tags (
	resource_kind text not null,
	resource_id uuid not null,
	tag_id uuid not null references public.tags(id) on delete cascade,
	created_at timestamptz not null default now(),
	primary key (resource_kind, resource_id, tag_id),
	constraint resource_tags_valid_kind check (
		resource_kind = any (array[
			'exercise', 'question', 'assessment', 'chapter', 'document',
			'python_exercise', 'construction', 'worksheet', 'parody_evaluation'
		])
	)
);

comment on table public.resource_tags is
	'Association tag ↔ ressource, tous types confondus. Remplace à terme exercise_tags, python_exercise_tags et les colonnes tags text[]. Pas de FK vers la ressource : elle est polymorphe. Phase 3 du chantier de référencement.';

create index if not exists idx_resource_tags_tag on public.resource_tags (tag_id);
create index if not exists idx_resource_tags_resource on public.resource_tags (resource_kind, resource_id);

-- ---------------------------------------------------------------------------
-- 3. Reprise des données existantes
-- ---------------------------------------------------------------------------
-- Recopie, jamais déplacement. Les sources restent intactes.

-- 3a. Exercices : la jonction existe déjà, le catalogue est le bon.
insert into public.resource_tags (resource_kind, resource_id, tag_id)
select 'exercise', et.exercise_id, et.tag_id
from public.exercise_tags et
on conflict do nothing;

-- 3b. Exercices Python : catalogue distinct, au schéma identique. Les noms sont
-- rapatriés dans `tags` (sur le slug, donc « Boucles » et « boucles » fusionnent),
-- puis la jonction est réécrite vers les nouveaux identifiants.
insert into public.tags (name)
select distinct on (public.tag_slug(pt.name)) pt.name
from public.python_tags pt
where public.tag_slug(pt.name) is not null
	and not exists (
		select 1 from public.tags t where t.slug = public.tag_slug(pt.name)
	)
order by public.tag_slug(pt.name), pt.created_at;

insert into public.resource_tags (resource_kind, resource_id, tag_id)
select 'python_exercise', pet.exercise_id, t.id
from public.python_exercise_tags pet
join public.python_tags pt on pt.id = pet.tag_id
join public.tags t on t.slug = public.tag_slug(pt.name)
on conflict do nothing;

-- 3c. Les colonnes `text[]` libres : chaque valeur devient une entrée de
-- catalogue si elle n'existe pas déjà, puis une association.
do $$
declare
	src record;
begin
	for src in
		select * from (values
			('constructions', 'construction'),
			('worksheets', 'worksheet'),
			('parody_evaluations', 'parody_evaluation')
		) as t(table_name, kind)
	loop
		execute format($fmt$
			insert into public.tags (name)
			select distinct on (public.tag_slug(tag_name)) tag_name
			from (
				select unnest(tags) as tag_name from public.%I where tags is not null
			) raw
			where public.tag_slug(tag_name) is not null
				and not exists (select 1 from public.tags t where t.slug = public.tag_slug(tag_name))
			order by public.tag_slug(tag_name);
		$fmt$, src.table_name);

		execute format($fmt$
			insert into public.resource_tags (resource_kind, resource_id, tag_id)
			select %L, r.id, t.id
			from public.%I r
			cross join lateral unnest(r.tags) as tag_name
			join public.tags t on t.slug = public.tag_slug(tag_name)
			where r.tags is not null
			on conflict do nothing;
		$fmt$, src.kind, src.table_name);
	end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------
-- Calquée sur le catalogue `tags` : un tag est une étiquette de contenu, pas une
-- donnée personnelle. Lire les associations ne révèle aucun contenu — il faut
-- encore passer les RLS de la table de la ressource pour l'ouvrir.
alter table public.resource_tags enable row level security;

-- ⚠️ Point de vigilance pour plus tard : `using (true)` est sans risque tant que
-- la table ne contient que du contenu rédigé par le prof. Le jour où le type
-- `assessment` sera peuplé, cette policy donnerait à chaque élève l'énumération
-- de TOUTES les évaluations, brouillons compris, et de leurs thèmes — un
-- contrôle à venir se lit dans ses tags. Reposer la question à ce moment-là.
drop policy if exists "Authenticated users can read resource tags" on public.resource_tags;
create policy "Authenticated users can read resource tags"
	on public.resource_tags for select
	to authenticated
	using (true);

drop policy if exists "Teachers and admins manage resource tags" on public.resource_tags;
create policy "Teachers and admins manage resource tags"
	on public.resource_tags for all
	to authenticated
	using (public.is_teacher_or_admin())
	with check (public.is_teacher_or_admin());

-- `authenticated` doit être révoqué lui aussi : le même
-- `ALTER DEFAULT PRIVILEGES ... GRANT ALL ON TABLES` du baseline le vise
-- (20260616220000:46145), et `ALL` inclut TRUNCATE — qui, lui, IGNORE la RLS.
-- Sans cette révocation, les `grant` ci-dessous donneraient l'illusion d'un
-- moindre privilège calibré alors qu'ils n'enlèvent rien.
-- `update` n'est pas accordé : la table n'a que sa clé primaire et `created_at`,
-- et l'upsert du miroir passe par ON CONFLICT DO NOTHING.
revoke all on public.resource_tags from public, anon, authenticated;
grant select, insert, delete on public.resource_tags to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Résolution des noms de tags — côté base, sur le slug
-- ---------------------------------------------------------------------------
-- L'unicité porte sur `slug`, mais le code applicatif appariait les noms sur
-- `name`. Conséquence : un nom dont le slug existe déjà sous une autre
-- orthographe fait échouer l'insert, la relecture par `name` ne le retrouve pas
-- (c'est l'autre orthographe qui est en base), et le nom est silencieusement
-- filtré. L'enseignant enregistre alors son exercice avec MOINS de tags qu'il
-- n'en a saisi, sans aucun message.
--
-- Le slug n'étant calculable qu'ici, la résolution appartient à la base.
create or replace function public.resolve_tag_ids(p_names text[])
returns table (id uuid, name text)
language plpgsql
security invoker
set search_path = public
as $$
begin
	-- Créer ce qui manque, en dédoublonnant d'abord sur le slug pour qu'un même
	-- appel contenant « Algèbre » et « algebre » n'essaie pas d'insérer deux fois.
	insert into public.tags (name)
	select distinct on (public.tag_slug(n)) n
	from unnest(p_names) as n
	where public.tag_slug(n) is not null
		and not exists (select 1 from public.tags t where t.slug = public.tag_slug(n))
	order by public.tag_slug(n), n;

	-- Relire sur le SLUG, seule clé qui apparie les orthographes voisines.
	return query
		select t.id, t.name
		from public.tags t
		where t.slug = any (select public.tag_slug(n) from unnest(p_names) as n);
end;
$$;

comment on function public.resolve_tag_ids(text[]) is
	'Résout des noms de tags en identifiants, en créant ce qui manque. L''appariement se fait sur le slug canonique, pas sur le libellé : c''est ce qui empêche de perdre silencieusement un tag dont une variante orthographique existe déjà.';

revoke all on function public.resolve_tag_ids(text[]) from public, anon;
grant execute on function public.resolve_tag_ids(text[]) to authenticated;
