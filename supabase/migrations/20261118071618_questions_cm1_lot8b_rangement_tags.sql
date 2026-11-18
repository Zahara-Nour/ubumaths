-- ============================================================================
-- Chantier « questions-cm1 », lot 8b (aires et angles) : 1 sous-notion neuve, nœuds et tags de 6 modèles
-- ============================================================================
--   une sous-notion NEUVE, en fin de sa notion : « Grandeurs et mesures > Aires > aires sur quadrillage » ;
--   les 6 brouillons du lot 8b, créés sans nœud ni tag, vont sur leur nœud, tags posés :
--     d623374d Comparer les aires de deux figures → Aires > aires sur quadrillage (neuve), CM1-086 et CM2-071
--     31d64c00 Aire en carreaux → Aires > aires sur quadrillage (neuve), CM1-087 et CM2-072
--     614048c9 Aire en centimètres carrés → Aires > unités et conversions, CM1-088
--     8da9f669 Sommet, côtés et nature d'un angle → Angles (la notion), CM1-089 et CM2-076
--     4c1ce174 Noter un angle → Angles (la notion), CM1-090 et CM2-077
--     97f2374b Comparer des angles → Angles > comparaison, CM1-091 et CM2-078
--   Les points 086, 087, 071 et 072 restent sur la notion Aires, 089, 090, 076 et 077 sur la notion
--   Angles : un tag est accepté quand son point est sur le nœud du modèle OU sur sa notion, et au plus
--   UN point par programme (ADR 0020).
-- Bilan : 6 rangés sur un nœud, 1 sous-notion créée, 0 niveau changé, 0 tag retiré, 11 posés, 0 gardé.
-- Aucun statut ne change. Le contenu ne change pas : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-18 (journal docs/wip/questions-cm1-progress.md § 22, 22 bis,
-- 22 ter). Les 6 brouillons ont été créés le 2026-11-18 par scripts/create-questions.ts
-- (scripts/questions/cm1-8b/, #2803 et #2806), qui ne pose ni nœud ni tag. Fichier GÉNÉRÉ par
-- docs/wip/questions/lot-cm1-8b-rangement.py (relevé de la prod du 2026-11-18) — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle et
-- ses vérifications le tolèrent (la sous-notion, elle, est créée partout) ; elle exige TOUT ou RIEN (6 modèles). Elle est prouvée par
-- tests/integration/questions-cm1-lot8b-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (nœud, niveaux, statut et tags d'avant) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore au nœud (ou sans nœud), aux niveaux et au statut relevés le
-- 2026-11-18, et porter EXACTEMENT les tags relevés : sinon une saisie faite depuis serait écrasée
-- ou contredite ; la sous-notion neuve ne doit pas exister (même nom, casse ignorée, sous la même
-- notion). Les nœuds sont désignés par leur chemin, résolu STRICTEMENT.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon ; sous-notion neuve).
--
-- Accès (question tranchée par David le 2026-11-18, § 22, 22 bis, 22 ter) : personne ne gagne ni ne
-- perd d'accès. Les 6 brouillons restent lisibles par l'admin et le prof seulement ; leurs tags
-- (pas leur contenu) par tout compte connecté, comme ceux des autres modèles ; l'arbre des notions
-- est de lecture publique, la sous-notion neuve aussi, comme toutes. Aucune règle (policy) ne change.
--
-- Rollback (aucune donnée d'élève). Il retire les 11 tags posés, repose les 0 retirés, rend aux
-- modèles leur nœud (ou aucun), leurs niveaux et leur statut d'avant, puis supprime la sous-notion
-- neuve. Garde : il refuse si un modèle n'a plus EXACTEMENT le nœud, les niveaux, le statut et les
-- tags laissés par la migration (sinon une saisie faite depuis serait écrasée en silence), ou si la
-- sous-notion neuve porte autre chose (modèle hors du lot, point, enfant). Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._qcm1l8b_retour_noeuds;
-- drop table if exists pg_temp._qcm1l8b_retour_neuves;
-- drop table if exists pg_temp._qcm1l8b_retour_tags;
-- drop table if exists pg_temp._qcm1l8b_retour;
-- create temporary table _qcm1l8b_retour (
-- 	id uuid primary key,
-- 	avant_branche text, avant_notion text, avant_sous_notion text,
-- 	apres_branche text not null, apres_notion text not null, apres_sous_notion text,
-- 	grades_avant text[] not null, grades_apres text[] not null,
-- 	statut_avant text not null, statut_apres text not null
-- );
-- insert into _qcm1l8b_retour values
-- 	('31d64c00-144e-4c0f-887f-475be9ac001e', null, null, null,
-- 	 'Grandeurs et mesures', 'Aires', 'aires sur quadrillage', array['CM1', 'CM2'], array['CM1', 'CM2'], 'draft', 'draft'),
-- 	('4c1ce174-15a0-4613-9df1-d4674350459e', null, null, null,
-- 	 'Grandeurs et mesures', 'Angles', null, array['CM1', 'CM2'], array['CM1', 'CM2'], 'draft', 'draft'),
-- 	('614048c9-0e96-4577-9bd4-ce4fe1467559', null, null, null,
-- 	 'Grandeurs et mesures', 'Aires', 'unités et conversions', array['CM1'], array['CM1'], 'draft', 'draft'),
-- 	('8da9f669-17bd-46a5-a28a-098c13381fc8', null, null, null,
-- 	 'Grandeurs et mesures', 'Angles', null, array['CM1', 'CM2'], array['CM1', 'CM2'], 'draft', 'draft'),
-- 	('97f2374b-6491-4d5d-b07e-be6e2640427d', null, null, null,
-- 	 'Grandeurs et mesures', 'Angles', 'comparaison', array['CM1', 'CM2'], array['CM1', 'CM2'], 'draft', 'draft'),
-- 	('d623374d-4e14-4bfa-aa80-5a627ae44b7c', null, null, null,
-- 	 'Grandeurs et mesures', 'Aires', 'aires sur quadrillage', array['CM1', 'CM2'], array['CM1', 'CM2'], 'draft', 'draft');
-- create temporary table _qcm1l8b_retour_neuves (branche text not null, notion text not null, sous_notion text not null, noeud uuid);
-- insert into _qcm1l8b_retour_neuves values
-- 	('Grandeurs et mesures', 'Aires', 'aires sur quadrillage', null);
-- create temporary table _qcm1l8b_retour_tags (template_id uuid not null, grade text not null, code text not null, avant boolean not null, apres boolean not null);
-- insert into _qcm1l8b_retour_tags values
-- 	('31d64c00-144e-4c0f-887f-475be9ac001e', 'CM1', 'CM1-087', false, true),
-- 	('31d64c00-144e-4c0f-887f-475be9ac001e', 'CM2', 'CM2-072', false, true),
-- 	('4c1ce174-15a0-4613-9df1-d4674350459e', 'CM1', 'CM1-090', false, true),
-- 	('4c1ce174-15a0-4613-9df1-d4674350459e', 'CM2', 'CM2-077', false, true),
-- 	('614048c9-0e96-4577-9bd4-ce4fe1467559', 'CM1', 'CM1-088', false, true),
-- 	('8da9f669-17bd-46a5-a28a-098c13381fc8', 'CM1', 'CM1-089', false, true),
-- 	('8da9f669-17bd-46a5-a28a-098c13381fc8', 'CM2', 'CM2-076', false, true),
-- 	('97f2374b-6491-4d5d-b07e-be6e2640427d', 'CM1', 'CM1-091', false, true),
-- 	('97f2374b-6491-4d5d-b07e-be6e2640427d', 'CM2', 'CM2-078', false, true),
-- 	('d623374d-4e14-4bfa-aa80-5a627ae44b7c', 'CM1', 'CM1-086', false, true),
-- 	('d623374d-4e14-4bfa-aa80-5a627ae44b7c', 'CM2', 'CM2-071', false, true);
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _qcm1l8b_retour order by id;
-- select 1 from public.question_templates where id in (select id from _qcm1l8b_retour) order by id for update;
-- create temporary table _qcm1l8b_retour_noeuds as
-- 	select r.id, r.avant_branche,
-- 	       case when r.avant_branche is null then null when r.avant_sous_notion is null then an.id else asn.id end as avant,
-- 	       case when r.apres_sous_notion is null then pn.id else psn.id end as apres
-- 	  from _qcm1l8b_retour r
-- 	  left join public.classification_nodes ab on ab.kind = 'branch' and ab.parent_id is null and ab.archived_at is null and ab.name = r.avant_branche
-- 	  left join public.classification_nodes an on an.kind = 'notion' and an.parent_id = ab.id and an.archived_at is null and an.name = r.avant_notion
-- 	  left join public.classification_nodes asn on asn.kind = 'subnotion' and asn.parent_id = an.id and asn.archived_at is null and asn.name = r.avant_sous_notion
-- 	  left join public.classification_nodes pb on pb.kind = 'branch' and pb.parent_id is null and pb.archived_at is null and pb.name = r.apres_branche
-- 	  left join public.classification_nodes pn on pn.kind = 'notion' and pn.parent_id = pb.id and pn.archived_at is null and pn.name = r.apres_notion
-- 	  left join public.classification_nodes psn on psn.kind = 'subnotion' and psn.parent_id = pn.id and psn.archived_at is null and psn.name = r.apres_sous_notion;
-- -- Clé : deux nœuds homonymes sous un même parent dupliqueraient les lignes et feraient échouer ici.
-- alter table _qcm1l8b_retour_noeuds add primary key (id);
-- update _qcm1l8b_retour_neuves r set noeud = s.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--   join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion and s.name = r.sous_notion;
-- alter table _qcm1l8b_retour_tags add column point_id uuid;
-- update _qcm1l8b_retour_tags t set point_id = p.id
--   from public.curriculum_points p
--  where p.grade = t.grade and p.code = t.code and p.archived_at is null;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer;
-- begin
-- 	if exists (select 1 from _qcm1l8b_retour_noeuds where (avant is null and avant_branche is not null) or apres is null)
-- 	   or exists (select 1 from _qcm1l8b_retour_tags where point_id is null)
-- 	   or exists (select 1 from _qcm1l8b_retour_neuves where noeud is null) then
-- 		raise exception 'rollback : chemins ou points introuvables';
-- 	end if;
-- 	select count(*), count(*) filter (where q.grades = r.grades_apres and q.status = r.statut_apres
-- 	                                     and q.classification_node_id = x.apres)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q
-- 	  join _qcm1l8b_retour r on r.id = q.id
-- 	  join _qcm1l8b_retour_noeuds x on x.id = q.id;
-- 	if v_presents not in (0, 6) then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 6', v_presents;
-- 	end if;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur % ont encore le nœud, les niveaux et le statut de la migration', v_intacts, v_presents;
-- 	end if;
-- 	-- Tags : exactement les 11 laissés par la migration (posés et gardés), rien d'autre (tout niveau).
-- 	select count(*), count(*) filter (where exists (select 1 from _qcm1l8b_retour_tags t
-- 	                                                where t.apres and t.template_id = q.template_id and t.point_id = q.point_id))
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join _qcm1l8b_retour r on r.id = q.template_id;
-- 	if v_tags <> v_total or v_total <> least(v_presents, 1) * 11 then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, least(v_presents, 1) * 11;
-- 	end if;
-- 	if exists (select 1 from public.question_templates q
-- 	            where q.classification_node_id in (select noeud from _qcm1l8b_retour_neuves)
-- 	              and q.id not in (select id from _qcm1l8b_retour))
-- 	   or exists (select 1 from public.classification_nodes c where c.parent_id in (select noeud from _qcm1l8b_retour_neuves))
-- 	   or exists (select 1 from public.curriculum_points p where p.node_id in (select noeud from _qcm1l8b_retour_neuves)) then
-- 		raise exception 'rollback : une sous-notion neuve porte autre chose que les modèles du lot';
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using _qcm1l8b_retour_tags t
--  where t.apres and not t.avant and q.template_id = t.template_id and q.point_id = t.point_id;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates q
--    set classification_node_id = x.avant, grades = r.grades_avant, status = r.statut_avant
--   from _qcm1l8b_retour r join _qcm1l8b_retour_noeuds x on x.id = r.id
--  where q.id = r.id;
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- insert into public.question_template_points (template_id, point_id)
-- select t.template_id, t.point_id
--   from _qcm1l8b_retour_tags t
--   join public.question_templates q on q.id = t.template_id
--  where t.avant and not t.apres;
-- do $retour$
-- declare v_presents integer; v_total integer; v_reposes integer;
-- begin
-- 	select count(*) into v_presents from _qcm1l8b_retour r join public.question_templates q on q.id = r.id;
-- 	select count(*), count(*) filter (where exists (select 1 from _qcm1l8b_retour_tags t
-- 	                                                where t.avant and t.template_id = q.template_id and t.point_id = q.point_id))
-- 	  into v_total, v_reposes
-- 	  from public.question_template_points q
-- 	  join _qcm1l8b_retour r on r.id = q.template_id;
-- 	if v_reposes <> v_total or v_total <> least(v_presents, 1) * 0 then
-- 		raise exception 'rollback : % tag(s) reposé(s) sur %, attendus %', v_reposes, v_total, least(v_presents, 1) * 0;
-- 	end if;
-- end $retour$;
-- delete from public.classification_nodes where id in (select noeud from _qcm1l8b_retour_neuves);
-- drop table _qcm1l8b_retour_noeuds;
-- drop table _qcm1l8b_retour_neuves;
-- drop table _qcm1l8b_retour_tags;
-- drop table _qcm1l8b_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires ----------------------------------------------
drop table if exists pg_temp._qcm1l8b_modeles;
drop table if exists pg_temp._qcm1l8b_tags;
drop table if exists pg_temp._qcm1l8b_neuves;
create temporary table _qcm1l8b_neuves (
	branche text not null,
	notion text not null,
	sous_notion text not null,
	primary key (branche, notion, sous_notion)
);
insert into _qcm1l8b_neuves values

	('Grandeurs et mesures', 'Aires', 'aires sur quadrillage');
create temporary table _qcm1l8b_modeles (
	id uuid primary key,
	avant_branche text, avant_notion text, avant_sous_notion text,
	apres_branche text not null, apres_notion text not null, apres_sous_notion text,
	grades_avant text[] not null,
	grades_apres text[] not null,
	statut_avant text not null,
	statut_apres text not null
);
create temporary table _qcm1l8b_tags (
	template_id uuid not null,
	grade text not null,
	code text not null,
	avant boolean not null,
	apres boolean not null,
	primary key (template_id, grade, code)
);
insert into _qcm1l8b_modeles values
	('31d64c00-144e-4c0f-887f-475be9ac001e', null, null, null,
	 'Grandeurs et mesures', 'Aires', 'aires sur quadrillage', array['CM1', 'CM2'], array['CM1', 'CM2'], 'draft', 'draft'),
	('4c1ce174-15a0-4613-9df1-d4674350459e', null, null, null,
	 'Grandeurs et mesures', 'Angles', null, array['CM1', 'CM2'], array['CM1', 'CM2'], 'draft', 'draft'),
	('614048c9-0e96-4577-9bd4-ce4fe1467559', null, null, null,
	 'Grandeurs et mesures', 'Aires', 'unités et conversions', array['CM1'], array['CM1'], 'draft', 'draft'),
	('8da9f669-17bd-46a5-a28a-098c13381fc8', null, null, null,
	 'Grandeurs et mesures', 'Angles', null, array['CM1', 'CM2'], array['CM1', 'CM2'], 'draft', 'draft'),
	('97f2374b-6491-4d5d-b07e-be6e2640427d', null, null, null,
	 'Grandeurs et mesures', 'Angles', 'comparaison', array['CM1', 'CM2'], array['CM1', 'CM2'], 'draft', 'draft'),
	('d623374d-4e14-4bfa-aa80-5a627ae44b7c', null, null, null,
	 'Grandeurs et mesures', 'Aires', 'aires sur quadrillage', array['CM1', 'CM2'], array['CM1', 'CM2'], 'draft', 'draft');
insert into _qcm1l8b_tags values
	('31d64c00-144e-4c0f-887f-475be9ac001e', 'CM1', 'CM1-087', false, true),
	('31d64c00-144e-4c0f-887f-475be9ac001e', 'CM2', 'CM2-072', false, true),
	('4c1ce174-15a0-4613-9df1-d4674350459e', 'CM1', 'CM1-090', false, true),
	('4c1ce174-15a0-4613-9df1-d4674350459e', 'CM2', 'CM2-077', false, true),
	('614048c9-0e96-4577-9bd4-ce4fe1467559', 'CM1', 'CM1-088', false, true),
	('8da9f669-17bd-46a5-a28a-098c13381fc8', 'CM1', 'CM1-089', false, true),
	('8da9f669-17bd-46a5-a28a-098c13381fc8', 'CM2', 'CM2-076', false, true),
	('97f2374b-6491-4d5d-b07e-be6e2640427d', 'CM1', 'CM1-091', false, true),
	('97f2374b-6491-4d5d-b07e-be6e2640427d', 'CM2', 'CM2-078', false, true),
	('d623374d-4e14-4bfa-aa80-5a627ae44b7c', 'CM1', 'CM1-086', false, true),
	('d623374d-4e14-4bfa-aa80-5a627ae44b7c', 'CM2', 'CM2-071', false, true);

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qcm1l8b_modeles order by id;
select 1 from public.question_templates where id in (select id from _qcm1l8b_modeles) order by id for update;

-- ---- 2. Garde : notions présentes, sous-notion neuve ABSENTE (même nom, casse ignorée) ------
alter table _qcm1l8b_neuves add column notion_id uuid;
update _qcm1l8b_neuves r set notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion;
do $garde_neuves$
declare v_existantes integer;
begin
	if exists (select 1 from _qcm1l8b_neuves where notion_id is null) then
		raise exception 'notions introuvables : %', (select count(*) from _qcm1l8b_neuves where notion_id is null);
	end if;
	select count(*) into v_existantes from _qcm1l8b_neuves r
	  join public.classification_nodes s on s.parent_id = r.notion_id and lower(s.name) = lower(r.sous_notion);
	if v_existantes <> 0 then
		raise exception 'sous-notions déjà présentes : %', v_existantes;
	end if;
end $garde_neuves$;

-- ---- 2 bis. La sous-notion neuve, en fin de sa notion --------------------------------------
insert into public.classification_nodes (kind, parent_id, name, position)
select 'subnotion', r.notion_id, r.sous_notion,
       (select coalesce(max(s.position), -1) from public.classification_nodes s where s.parent_id = r.notion_id)
       + row_number() over (partition by r.notion_id order by r.sous_notion desc)
  from _qcm1l8b_neuves r;

-- ---- 2 ter. Résolution STRICTE des chemins et des points ---------------------------------
drop table if exists pg_temp._qcm1l8b_noeuds;
create temporary table _qcm1l8b_noeuds as
	select r.id, r.avant_branche,
	       case when r.avant_branche is null then null when r.avant_sous_notion is null then an.id else asn.id end as avant,
	       case when r.apres_sous_notion is null then pn.id else psn.id end as apres
	  from _qcm1l8b_modeles r
	  left join public.classification_nodes ab on ab.kind = 'branch' and ab.parent_id is null and ab.archived_at is null and ab.name = r.avant_branche
	  left join public.classification_nodes an on an.kind = 'notion' and an.parent_id = ab.id and an.archived_at is null and an.name = r.avant_notion
	  left join public.classification_nodes asn on asn.kind = 'subnotion' and asn.parent_id = an.id and asn.archived_at is null and asn.name = r.avant_sous_notion
	  left join public.classification_nodes pb on pb.kind = 'branch' and pb.parent_id is null and pb.archived_at is null and pb.name = r.apres_branche
	  left join public.classification_nodes pn on pn.kind = 'notion' and pn.parent_id = pb.id and pn.archived_at is null and pn.name = r.apres_notion
	  left join public.classification_nodes psn on psn.kind = 'subnotion' and psn.parent_id = pn.id and psn.archived_at is null and psn.name = r.apres_sous_notion;
-- Clé : deux nœuds homonymes sous un même parent dupliqueraient les lignes et feraient échouer ici.
alter table _qcm1l8b_noeuds add primary key (id);
alter table _qcm1l8b_tags add column point_id uuid;
update _qcm1l8b_tags t set point_id = p.id
  from public.curriculum_points p
 where p.grade = t.grade and p.code = t.code and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from _qcm1l8b_noeuds where (avant is null and avant_branche is not null) or apres is null)
	   or exists (select 1 from _qcm1l8b_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s) de modèle, % point(s)',
			(select count(*) from _qcm1l8b_noeuds where (avant is null and avant_branche is not null) or apres is null),
			(select count(*) from _qcm1l8b_tags where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, nœud, niveaux et statut relevés, tags EXACTEMENT relevés ---
do $garde$
declare v_presents integer; v_ecarts integer; v_niveaux integer; v_statuts integer; v_detail text;
begin
	select count(*) into v_presents from _qcm1l8b_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 6) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 6', v_presents;
	end if;
	select count(*) into v_ecarts from _qcm1l8b_noeuds x
	  join public.question_templates q on q.id = x.id
	 where q.classification_node_id is distinct from x.avant;
	if v_ecarts <> 0 then
		raise exception 'modèles déplacés depuis le relevé : %', v_ecarts;
	end if;
	select count(*) into v_niveaux from _qcm1l8b_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.grades is distinct from r.grades_avant;
	if v_niveaux <> 0 then
		raise exception 'niveaux changés depuis le relevé : %', v_niveaux;
	end if;
	select count(*) into v_statuts from _qcm1l8b_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.status is distinct from r.statut_avant;
	if v_statuts <> 0 then
		raise exception 'statuts changés depuis le relevé : %', v_statuts;
	end if;
	-- « + » : tag en base non relevé (tout niveau) ; « - » : tag relevé absent de la base
	select string_agg(d.r, ', ' order by d.r) into v_detail from (
		(select '+' || left(q.template_id::text, 8) || ' ' || p.code as r
		   from public.question_template_points q
		   join _qcm1l8b_modeles m on m.id = q.template_id
		   join public.curriculum_points p on p.id = q.point_id
		  where not exists (select 1 from _qcm1l8b_tags t where t.template_id = q.template_id and t.point_id = q.point_id and t.avant))
		union all
		(select '-' || left(t.template_id::text, 8) || ' ' || t.code
		   from _qcm1l8b_tags t
		   join public.question_templates q on q.id = t.template_id
		  where t.avant
		    and not exists (select 1 from public.question_template_points u where u.template_id = t.template_id and u.point_id = t.point_id))) d;
	if v_detail is not null then
		raise exception 'tags différents du relevé : %', v_detail;
	end if;
end $garde$;

-- ---- 4. Retraits, déplacements, niveaux, statut, poses ---------------------------------
delete from public.question_template_points q
 using _qcm1l8b_tags t
 where q.template_id = t.template_id and q.point_id = t.point_id and t.avant and not t.apres;

-- R2 : les modèles passent sur le nœud de leur point AVANT les tags (le trigger des tags lit le
-- nœud du modèle).
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = x.apres
  from _qcm1l8b_noeuds x
 where q.id = x.id and q.classification_node_id is distinct from x.apres;
update public.question_templates q set grades = r.grades_apres
  from _qcm1l8b_modeles r
 where q.id = r.id and q.grades is distinct from r.grades_apres;
update public.question_templates q set status = r.statut_apres
  from _qcm1l8b_modeles r
 where q.id = r.id and q.status is distinct from r.statut_apres;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.template_id, t.point_id
  from _qcm1l8b_tags t
  join public.question_templates q on q.id = t.template_id
 where t.apres and not t.avant;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_niveaux integer; v_statuts integer; v_total integer; v_tags integer; v_tags_attendus integer;
        v_neuves integer;
begin
	select count(*) into v_neuves from _qcm1l8b_neuves r
	  join public.classification_nodes s on s.parent_id = r.notion_id and s.kind = 'subnotion'
	   and s.archived_at is null and s.name = r.sous_notion;
	select count(*) into v_presents from _qcm1l8b_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qcm1l8b_noeuds x
	  join public.question_templates q on q.id = x.id and q.classification_node_id = x.apres;
	select count(*) into v_niveaux from _qcm1l8b_modeles r
	  join public.question_templates q on q.id = r.id and q.grades = r.grades_apres;
	select count(*) into v_statuts from _qcm1l8b_modeles r
	  join public.question_templates q on q.id = r.id and q.status = r.statut_apres;
	-- tags de ces modèles (tout niveau) : tous, et ceux du lot d'après (doivent coïncider)
	select count(*), count(*) filter (where exists (select 1 from _qcm1l8b_tags t
	                                                where t.template_id = q.template_id and t.point_id = q.point_id and t.apres))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qcm1l8b_modeles m on m.id = q.template_id;
	-- Base sans les modèles (locale) : aucun tag attendu.
	v_tags_attendus := least(v_presents, 1) * 11;
	if v_neuves <> 1 or v_noeuds <> v_presents or v_niveaux <> v_presents or v_statuts <> v_presents
	   or v_tags <> v_tags_attendus or v_total <> v_tags_attendus then
		raise exception 'lot incohérent : sous-notions %/1, nœuds %/%, niveaux %/%, statuts %/%, tags du lot %/%, tags en base %',
			v_neuves, v_noeuds, v_presents, v_niveaux, v_presents, v_statuts, v_presents, v_tags, v_tags_attendus, v_total;
	end if;
end $check$;

drop table _qcm1l8b_noeuds;
drop table _qcm1l8b_tags;
drop table _qcm1l8b_modeles;
drop table _qcm1l8b_neuves;
