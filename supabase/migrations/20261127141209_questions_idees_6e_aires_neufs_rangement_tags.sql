-- ============================================================================
-- Lot idees-6e-aires-neufs : nœud et tag de 7 modèle(s)
-- ============================================================================
--   57720668 « Les relations entre m², dm² et cm² » (n1-relations-unites-aire.json) → 6-150, sur « Grandeurs et mesures > Aires > unités et conversions »
--   36b7d2e8 « Aire en cm² sur un quadrillage » (n3-aire-sur-quadrillage.json) → 6-201, sur « Grandeurs et mesures > Aires > rectangle »
--   9c9c7081 « Comparer des aires sans mesurer » (n4-comparer-aires-sans-mesurer.json) → CM2-071, sur « Grandeurs et mesures > Aires »
--   533bb8d0 « La formule de l'aire du carré » (n5-formule-aire-carre.json) → 6-151, sur « Grandeurs et mesures > Aires > carré »
--   6aef6255 « La formule de l'aire du rectangle » (n5-formule-aire-rectangle.json) → 6-200, sur « Grandeurs et mesures > Aires > rectangle »
--   7a8294a4 « Aire et périmètre d'un rectangle » (n6-aire-et-perimetre-rectangle.json) → 6-201, sur « Grandeurs et mesures > Aires > rectangle »
--   3e3c05d6 « Rectangles accolés » (n8-rectangles-accoles.json) → 6-200, sur « Grandeurs et mesures > Aires > rectangle »
--   Chaque modèle rangé porte au plus UN point (ADR 0020), posé sur son nœud ou sur la notion de ce
--   nœud (question_template_points_check_rules). Ni le contenu, ni le statut ne changent :
--   `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Fichier GÉNÉRÉ par scripts/questions/migration-rangement.ts — ne pas éditer à la main.
-- Source : scripts/questions/idees-6e-aires-neufs. État relevé en prod le 2026-11-27.
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
--   from (values ('57720668-5451-43ed-b965-cbe225a1b257'::uuid), ('36b7d2e8-5709-4b2e-a015-16406434cbd2'::uuid), ('9c9c7081-addb-4c56-a1ed-fb8710dfd892'::uuid), ('533bb8d0-4964-42cb-b1c4-340fcfeec547'::uuid), ('6aef6255-ece6-456a-a90f-c249a60a48d6'::uuid), ('7a8294a4-fdfc-4528-a65d-eb6e7da4b85f'::uuid), ('3e3c05d6-29a2-4d69-93b0-62ddde23b74e'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('57720668-5451-43ed-b965-cbe225a1b257'::uuid, '6-150'),
-- 	('36b7d2e8-5709-4b2e-a015-16406434cbd2'::uuid, '6-201'),
-- 	('9c9c7081-addb-4c56-a1ed-fb8710dfd892'::uuid, 'CM2-071'),
-- 	('533bb8d0-4964-42cb-b1c4-340fcfeec547'::uuid, '6-151'),
-- 	('6aef6255-ece6-456a-a90f-c249a60a48d6'::uuid, '6-200'),
-- 	('7a8294a4-fdfc-4528-a65d-eb6e7da4b85f'::uuid, '6-201'),
-- 	('3e3c05d6-29a2-4d69-93b0-62ddde23b74e'::uuid, '6-200')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates t set classification_node_id = null
--   from (values
-- 	('57720668-5451-43ed-b965-cbe225a1b257'::uuid, 'Grandeurs et mesures', 'Aires', 'unités et conversions'::text),
-- 	('36b7d2e8-5709-4b2e-a015-16406434cbd2'::uuid, 'Grandeurs et mesures', 'Aires', 'rectangle'::text),
-- 	('9c9c7081-addb-4c56-a1ed-fb8710dfd892'::uuid, 'Grandeurs et mesures', 'Aires', null::text),
-- 	('533bb8d0-4964-42cb-b1c4-340fcfeec547'::uuid, 'Grandeurs et mesures', 'Aires', 'carré'::text),
-- 	('6aef6255-ece6-456a-a90f-c249a60a48d6'::uuid, 'Grandeurs et mesures', 'Aires', 'rectangle'::text),
-- 	('7a8294a4-fdfc-4528-a65d-eb6e7da4b85f'::uuid, 'Grandeurs et mesures', 'Aires', 'rectangle'::text),
-- 	('3e3c05d6-29a2-4d69-93b0-62ddde23b74e'::uuid, 'Grandeurs et mesures', 'Aires', 'rectangle'::text)
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
	('57720668-5451-43ed-b965-cbe225a1b257', 'Grandeurs et mesures', 'Aires', 'unités et conversions', '6-150'),
	('36b7d2e8-5709-4b2e-a015-16406434cbd2', 'Grandeurs et mesures', 'Aires', 'rectangle', '6-201'),
	('9c9c7081-addb-4c56-a1ed-fb8710dfd892', 'Grandeurs et mesures', 'Aires', null, 'CM2-071'),
	('533bb8d0-4964-42cb-b1c4-340fcfeec547', 'Grandeurs et mesures', 'Aires', 'carré', '6-151'),
	('6aef6255-ece6-456a-a90f-c249a60a48d6', 'Grandeurs et mesures', 'Aires', 'rectangle', '6-200'),
	('7a8294a4-fdfc-4528-a65d-eb6e7da4b85f', 'Grandeurs et mesures', 'Aires', 'rectangle', '6-201'),
	('3e3c05d6-29a2-4d69-93b0-62ddde23b74e', 'Grandeurs et mesures', 'Aires', 'rectangle', '6-200');

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
	if v_presents not in (0, 7) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 7', v_presents;
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
