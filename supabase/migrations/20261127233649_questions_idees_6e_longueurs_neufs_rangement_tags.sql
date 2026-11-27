-- ============================================================================
-- Lot idees-6e-longueurs-neufs : nœud et tag de 6 modèle(s)
-- ============================================================================
--   c26b4d4c « La formule du périmètre du carré » (n1-formule-perimetre-carre.json) → 6-144, sur « Grandeurs et mesures > Périmètres > carré »
--   0d55c1de « La formule du périmètre du rectangle » (n1-formule-perimetre-rectangle.json) → 6-199, sur « Grandeurs et mesures > Périmètres > rectangle »
--   8ac28cf5 « Périmètre d'une portion de disque » (n2-perimetre-portion-disque.json) → 6-148, sur « Grandeurs et mesures > Périmètres »
--   84648b3b « Comparer des périmètres sans mesurer » (n3-comparer-perimetres-sans-mesurer.json) → 6-148, sur « Grandeurs et mesures > Périmètres »
--   0031e3ea « Le sens des préfixes » (n4-sens-des-prefixes.json) → sans tag, sur « Grandeurs et mesures > Unités et conversions > unités simples »
--   10dc7b1c « Convertir en mètre, et du mètre vers une autre unité » (n5-convertir-en-metre.json) → sans tag, sur « Grandeurs et mesures > Unités et conversions > unités simples »
--   Chaque modèle rangé porte au plus UN point (ADR 0020), posé sur son nœud ou sur la notion de ce
--   nœud (question_template_points_check_rules). Ni le contenu, ni le statut ne changent :
--   `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Fichier GÉNÉRÉ par scripts/questions/migration-rangement.ts — ne pas éditer à la main.
-- Source : scripts/questions/idees-6e-longueurs-neufs. État relevé en prod le 2026-11-27.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN. Prouvée par
-- tests/integration/migrations-rangement-tags.test.ts, qui rejoue CE fichier sur des copies
-- portant les vrais identifiants (fixture rangement-tags/).
--
-- Gardes : chaque modèle à ranger doit être encore SANS nœud et SANS aucun tag, chaque modèle qui
-- gagne un niveau doit avoir EXACTEMENT les niveaux du relevé, sinon une retouche faite depuis à la
-- main serait écrasée. Nœud désigné par son chemin, résolu STRICTEMENT.
--
-- Accès : aucune règle (policy) ne change ; personne ne gagne ni ne perd d'accès. Un brouillon
-- rangé apparaît sous son nœud dans l'admin, les élèves ne voient rien avant sa publication ; un
-- modèle publié qui gagne un niveau est aussi proposé dans ce niveau. Données d'élèves : aucune.
--
-- Rollback : retire les tags posés, rend les modèles sans nœud (gardé : seulement s'ils sont
-- encore sur le nœud posé ici), rend les niveaux d'avant (gardé : seulement si les niveaux sont
-- encore ceux posés ici). Bloc éprouvé par le test d'intégration, à
-- jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('c26b4d4c-ce49-4f6b-98ec-0df2f7c4215a'::uuid), ('0d55c1de-d67f-472f-97aa-7680fae761b4'::uuid), ('8ac28cf5-dd60-47af-b7aa-a84044ec42d4'::uuid), ('84648b3b-b4ae-417e-97cc-e088a985fba8'::uuid), ('0031e3ea-237f-4b7a-8acd-75a18ca2c5b7'::uuid), ('10dc7b1c-e3b6-4c97-9be8-17170eea29e6'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('c26b4d4c-ce49-4f6b-98ec-0df2f7c4215a'::uuid, '6-144'),
-- 	('0d55c1de-d67f-472f-97aa-7680fae761b4'::uuid, '6-199'),
-- 	('8ac28cf5-dd60-47af-b7aa-a84044ec42d4'::uuid, '6-148'),
-- 	('84648b3b-b4ae-417e-97cc-e088a985fba8'::uuid, '6-148')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates t set classification_node_id = null
--   from (values
-- 	('c26b4d4c-ce49-4f6b-98ec-0df2f7c4215a'::uuid, 'Grandeurs et mesures', 'Périmètres', 'carré'::text),
-- 	('0d55c1de-d67f-472f-97aa-7680fae761b4'::uuid, 'Grandeurs et mesures', 'Périmètres', 'rectangle'::text),
-- 	('8ac28cf5-dd60-47af-b7aa-a84044ec42d4'::uuid, 'Grandeurs et mesures', 'Périmètres', null::text),
-- 	('84648b3b-b4ae-417e-97cc-e088a985fba8'::uuid, 'Grandeurs et mesures', 'Périmètres', null::text),
-- 	('0031e3ea-237f-4b7a-8acd-75a18ca2c5b7'::uuid, 'Grandeurs et mesures', 'Unités et conversions', 'unités simples'::text),
-- 	('10dc7b1c-e3b6-4c97-9be8-17170eea29e6'::uuid, 'Grandeurs et mesures', 'Unités et conversions', 'unités simples'::text)
--  ) as r(id, branche, notion, sous_notion)
--   join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.name = r.branche
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.name = r.notion
--   left join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.name = r.sous_notion
--  where t.id = r.id
--    and t.classification_node_id = case when r.sous_notion is null then n.id else s.id end;
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qr_modeles;
create temporary table _qr_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text
);
insert into _qr_modeles values
	('c26b4d4c-ce49-4f6b-98ec-0df2f7c4215a', 'Grandeurs et mesures', 'Périmètres', 'carré', '6-144'),
	('0d55c1de-d67f-472f-97aa-7680fae761b4', 'Grandeurs et mesures', 'Périmètres', 'rectangle', '6-199'),
	('8ac28cf5-dd60-47af-b7aa-a84044ec42d4', 'Grandeurs et mesures', 'Périmètres', null, '6-148'),
	('84648b3b-b4ae-417e-97cc-e088a985fba8', 'Grandeurs et mesures', 'Périmètres', null, '6-148'),
	('0031e3ea-237f-4b7a-8acd-75a18ca2c5b7', 'Grandeurs et mesures', 'Unités et conversions', 'unités simples', null),
	('10dc7b1c-e3b6-4c97-9be8-17170eea29e6', 'Grandeurs et mesures', 'Unités et conversions', 'unités simples', null);

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qr_modeles order by id;
select 1 from public.question_templates where id in (select id from _qr_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée ; le point est sur ce nœud
-- ou sur sa notion. Un chemin ne peut désigner qu'un nœud : l'index
-- classification_nodes_sibling_name_key rend le nom unique parmi les frères.
alter table _qr_modeles add column noeud uuid, add column point_id uuid;
update _qr_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qr_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qr_modeles r set point_id = p.id
  from public.curriculum_points p, public.classification_nodes x
 where x.id = r.noeud and r.code is not null
   and p.code = r.code and p.archived_at is null
   and p.node_id in (r.noeud, case when x.kind = 'subnotion' then x.parent_id else x.id end);
do $resolution$
begin
	if exists (select 1 from _qr_modeles where noeud is null or (code is not null and point_id is null)) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qr_modeles where noeud is null),
			(select count(*) from _qr_modeles where code is not null and point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qr_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 6) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 6', v_presents;
	end if;
	select count(*) into v_ranges from _qr_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qr_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qr_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qr_modeles r
  join public.question_templates q on q.id = r.id
 where r.point_id is not null;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_attendus integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*), count(*) filter (where r.point_id is not null) into v_presents, v_attendus
	  from _qr_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qr_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qr_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qr_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_attendus or v_total <> v_attendus then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_attendus, v_total;
	end if;
end $check$;

drop table _qr_modeles;
