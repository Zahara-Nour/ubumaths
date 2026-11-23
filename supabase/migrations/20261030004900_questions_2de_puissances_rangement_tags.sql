-- ============================================================================
-- Chantier « questions-2de », lot 3 (puissances, racines, fractions) : nœud et tag de 8 modèles neufs
-- ============================================================================
--   - 04b1cc7f (puissance d'un produit) → 2-260, sur « Nombres et calculs > Puissances : calculs » ;
--   - 33d8874a (écritures fractionnaires) → 2-272, sur « Algèbre > Calcul littéral > expressions fractionnaires » ;
--   - 37ef27bc (√a² = |a|) → 2-423, sur « Nombres et calculs > Racines carrées : calculs > propriétés » ;
--   - 634b55b8 (enchaîner les règles) → 2-260, sur « Nombres et calculs > Puissances : calculs » ;
--   - 73514cdb (puissance d'un quotient) → 2-260, sur « Nombres et calculs > Puissances : calculs » ;
--   - 777c5d31 (calcul littéral) → 2-270, sur « Nombres et calculs > Puissances : calculs » ;
--   - b0c57a57 (forme irréductible) → 2-238, sur « Nombres et calculs > Fractions : sens et écritures > simplification » ;
--   - fab2680b (calcul numérique) → 2-270, sur « Nombres et calculs > Puissances : calculs » ;
-- Chaque modèle va sur le nœud de son point (notion ou sous-notion : question_template_points_check_rules
-- refuse un tag hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- 2-260 et 2-270 sont rangés sur la notion « Puissances : calculs » : leurs 5 modèles y vont, sans
-- sous-notion (décision L3-a). Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne
-- changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-10-29 (journal docs/wip/questions-2de-progress.md § 19). Les modèles
-- ont été créés en brouillon le 2026-10-29 par scripts/create-questions.ts
-- (scripts/questions/2de-puissances/, lancé par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (8 modèles). Elle est prouvée par
-- tests/integration/questions-2de-puissances-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-10-29), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-10-29 en phase 0 du
-- lot, AVANT le SQL, tranchée par lui le 2026-10-29 : personne). Aucune règle ne change. Effet
-- visible : les 8 brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les
-- élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 8 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--                ('04b1cc7f-8630-4ff2-981c-95c2f57d1161'::uuid),
--                ('33d8874a-8443-4323-8a87-000f0a8dba41'::uuid),
--                ('37ef27bc-d17f-4dd2-8825-2a655032b676'::uuid),
--                ('634b55b8-c626-4689-96e0-4fce37a14218'::uuid),
--                ('73514cdb-b018-4aa9-b379-586fa8cd1d74'::uuid),
--                ('777c5d31-83df-4b8f-90dd-f6baa3fb6b1f'::uuid),
--                ('b0c57a57-f732-4c5d-9ef3-6f8f45e745d5'::uuid),
--                ('fab2680b-9473-4c70-92cc-b63f3f138e69'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('04b1cc7f-8630-4ff2-981c-95c2f57d1161'::uuid, '2-260'),
-- 	('33d8874a-8443-4323-8a87-000f0a8dba41'::uuid, '2-272'),
-- 	('37ef27bc-d17f-4dd2-8825-2a655032b676'::uuid, '2-423'),
-- 	('634b55b8-c626-4689-96e0-4fce37a14218'::uuid, '2-260'),
-- 	('73514cdb-b018-4aa9-b379-586fa8cd1d74'::uuid, '2-260'),
-- 	('777c5d31-83df-4b8f-90dd-f6baa3fb6b1f'::uuid, '2-270'),
-- 	('b0c57a57-f732-4c5d-9ef3-6f8f45e745d5'::uuid, '2-238'),
-- 	('fab2680b-9473-4c70-92cc-b63f3f138e69'::uuid, '2-270')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               '04b1cc7f-8630-4ff2-981c-95c2f57d1161',
--               '33d8874a-8443-4323-8a87-000f0a8dba41',
--               '37ef27bc-d17f-4dd2-8825-2a655032b676',
--               '634b55b8-c626-4689-96e0-4fce37a14218',
--               '73514cdb-b018-4aa9-b379-586fa8cd1d74',
--               '777c5d31-83df-4b8f-90dd-f6baa3fb6b1f',
--               'b0c57a57-f732-4c5d-9ef3-6f8f45e745d5',
--               'fab2680b-9473-4c70-92cc-b63f3f138e69');
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
	('04b1cc7f-8630-4ff2-981c-95c2f57d1161', 'Nombres et calculs', 'Puissances : calculs', null, '2-260'),
	('33d8874a-8443-4323-8a87-000f0a8dba41', 'Algèbre', 'Calcul littéral', 'expressions fractionnaires', '2-272'),
	('37ef27bc-d17f-4dd2-8825-2a655032b676', 'Nombres et calculs', 'Racines carrées : calculs', 'propriétés', '2-423'),
	('634b55b8-c626-4689-96e0-4fce37a14218', 'Nombres et calculs', 'Puissances : calculs', null, '2-260'),
	('73514cdb-b018-4aa9-b379-586fa8cd1d74', 'Nombres et calculs', 'Puissances : calculs', null, '2-260'),
	('777c5d31-83df-4b8f-90dd-f6baa3fb6b1f', 'Nombres et calculs', 'Puissances : calculs', null, '2-270'),
	('b0c57a57-f732-4c5d-9ef3-6f8f45e745d5', 'Nombres et calculs', 'Fractions : sens et écritures', 'simplification', '2-238'),
	('fab2680b-9473-4c70-92cc-b63f3f138e69', 'Nombres et calculs', 'Puissances : calculs', null, '2-270');

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
 where p.grade = '2' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
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
	if v_presents not in (0, 8) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 8', v_presents;
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
