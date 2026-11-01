-- ============================================================================
-- Chantier « questions-ce1 », lot 6 (calcul posé et heure) : nœud et tag de 7 modèles neufs
-- ============================================================================
--   - c26cc664 (Pose et calcule une addition) → CE1-022, sur « Nombres et calculs > Entiers : addition et soustraction > calcul posé » ;
--   - 1e66bb1f (Pose et calcule une soustraction (par cassage)) → CE1-100, sur « Nombres et calculs > Entiers : addition et soustraction > calcul posé » ;
--   - 92caa903 (Pose et calcule une soustraction (par compensation)) → CE1-100, sur « Nombres et calculs > Entiers : addition et soustraction > calcul posé » ;
--   - e3d11972 (Quelle heure est-il ? (quarts et demies)) → CE1-059, sur « Grandeurs et mesures > Durées > lecture de l'heure » ;
--   - d478935f (Place les aiguilles) → CE1-060, sur « Grandeurs et mesures > Durées > lecture de l'heure » ;
--   - 24a86a39 (Combien de temps a-t-il duré ?) → CE1-063, sur « Grandeurs et mesures > Durées > calcul de durées » ;
--   - 739d58e3 (Quelle durée est la plus longue ?) → CE1-104, sur « Grandeurs et mesures > Durées > calcul de durées ».
-- Chaque modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-11-01 (journal docs/wip/questions-ce1-progress.md § 13). Les modèles
-- ont été créés en brouillon le 2026-11-01 par scripts/create-questions.ts
-- (scripts/questions/ce1-6/, lancé par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (7 modèles). Elle est prouvée par
-- tests/integration/questions-ce1-lot6-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé MCP du 2026-11-01),
-- sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-11-01 en phase 0 (§ 13), AVANT le SQL, tranchée par lui le 2026-11-01 : personne).
-- Aucune règle ne change. Effet visible : les 7 brouillons apparaissent sous leur nœud et sous leur point
-- dans l'admin ; les élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 7 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('c26cc664-8ce1-4de3-9f03-34a8e99116fb'::uuid),
--               ('1e66bb1f-2c43-4599-8dfc-4b1c4132f5bb'::uuid),
--               ('92caa903-cab9-4c74-a8bc-50cedd1cdba4'::uuid),
--               ('e3d11972-bc53-429f-93a5-a68c166785bd'::uuid),
--               ('d478935f-2f3a-4b5f-9756-647cd069d258'::uuid),
--               ('24a86a39-5f36-4ed4-829f-ee36c6ddb365'::uuid),
--               ('739d58e3-77f5-4cda-a453-cdc456d279a2'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('c26cc664-8ce1-4de3-9f03-34a8e99116fb'::uuid, 'CE1-022'),
-- 	('1e66bb1f-2c43-4599-8dfc-4b1c4132f5bb'::uuid, 'CE1-100'),
-- 	('92caa903-cab9-4c74-a8bc-50cedd1cdba4'::uuid, 'CE1-100'),
-- 	('e3d11972-bc53-429f-93a5-a68c166785bd'::uuid, 'CE1-059'),
-- 	('d478935f-2f3a-4b5f-9756-647cd069d258'::uuid, 'CE1-060'),
-- 	('24a86a39-5f36-4ed4-829f-ee36c6ddb365'::uuid, 'CE1-063'),
-- 	('739d58e3-77f5-4cda-a453-cdc456d279a2'::uuid, 'CE1-104')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CE1' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('c26cc664-8ce1-4de3-9f03-34a8e99116fb',
--               '1e66bb1f-2c43-4599-8dfc-4b1c4132f5bb',
--               '92caa903-cab9-4c74-a8bc-50cedd1cdba4',
--               'e3d11972-bc53-429f-93a5-a68c166785bd',
--               'd478935f-2f3a-4b5f-9756-647cd069d258',
--               '24a86a39-5f36-4ed4-829f-ee36c6ddb365',
--               '739d58e3-77f5-4cda-a453-cdc456d279a2');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qc_modeles;
create temporary table _qc_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qc_modeles values
	('c26cc664-8ce1-4de3-9f03-34a8e99116fb', 'Nombres et calculs', 'Entiers : addition et soustraction', 'calcul posé', 'CE1-022'),
	('1e66bb1f-2c43-4599-8dfc-4b1c4132f5bb', 'Nombres et calculs', 'Entiers : addition et soustraction', 'calcul posé', 'CE1-100'),
	('92caa903-cab9-4c74-a8bc-50cedd1cdba4', 'Nombres et calculs', 'Entiers : addition et soustraction', 'calcul posé', 'CE1-100'),
	('e3d11972-bc53-429f-93a5-a68c166785bd', 'Grandeurs et mesures', 'Durées', 'lecture de l''heure', 'CE1-059'),
	('d478935f-2f3a-4b5f-9756-647cd069d258', 'Grandeurs et mesures', 'Durées', 'lecture de l''heure', 'CE1-060'),
	('24a86a39-5f36-4ed4-829f-ee36c6ddb365', 'Grandeurs et mesures', 'Durées', 'calcul de durées', 'CE1-063'),
	('739d58e3-77f5-4cda-a453-cdc456d279a2', 'Grandeurs et mesures', 'Durées', 'calcul de durées', 'CE1-104');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qc_modeles order by id;
select 1 from public.question_templates where id in (select id from _qc_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _qc_modeles add column noeud uuid, add column point_id uuid;
update _qc_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qc_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qc_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = 'CE1' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qc_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qc_modeles where noeud is null),
			(select count(*) from _qc_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qc_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 7) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 7', v_presents;
	end if;
	select count(*) into v_ranges from _qc_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qc_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qc_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qc_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qc_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qc_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qc_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qc_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qc_modeles;
