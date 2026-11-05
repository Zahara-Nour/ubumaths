-- ============================================================================
-- Chantier « questions-ce2 », lot 8 (figures planes et symétrie) : nœud et tag de 9 modèles neufs
-- ============================================================================
--   - c2eb20cb (Quelle est cette figure ? Carré, rectangle, losange, triangles) → CE2-068, sur « Géométrie > Figures planes > propriétés »;
--   - c7ee1250 (Décrire le carré, le rectangle, le losange : côtés et angles droits) → CE2-095, sur « Géométrie > Figures planes > propriétés »;
--   - 949dd113 (Propriétés du carré, du rectangle et du losange) → CE2-069, sur « Géométrie > Figures planes > propriétés »;
--   - ecf4f632 (Le bon mot : diagonale, rayon, diamètre, longueur, largeur ; polygones) → CE2-067, sur « Géométrie > Figures planes > propriétés »;
--   - 77728742 (Le code des longueurs égales) → CE2-081, sur « Géométrie > Figures planes > propriétés »;
--   - 29c06264 (Utiliser le code de l'angle droit) → CE2-071, sur « Géométrie > Figures planes > angles droits »;
--   - 79e8e279 (Est-ce un axe de symétrie ?) → CE2-072, sur « Géométrie > Symétrie axiale »;
--   - b307a9f9 (Combien d'axes de symétrie ?) → CE2-072, sur « Géométrie > Symétrie axiale »;
--   - 49b8dc0b (Compléter une figure par symétrie sur quadrillage) → CE2-073, sur « Géométrie > Symétrie axiale »;
-- Chaque modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point), et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-11-05 (journal docs/wip/questions-ce2-progress.md § 14). Les modèles
-- ont été créés en brouillon par scripts/create-questions.ts
-- (scripts/questions/ce2-8/, lancé par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (9 modèles). Elle est prouvée par
-- tests/integration/questions-ce2-lot8-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- CE2-072 et CE2-073 sont posés par le programme sur la NOTION « Symétrie axiale », qui n'a aucune
-- sous-notion (relevé du 2026-11-05) : 07, 08 et 09 y vont (décision 2 du § 14) ; garde : aucune
-- sous-notion admise, la notion doit en être encore dépourvue.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé MCP du 2026-11-05, après la création),
-- sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-11-05 en phase 0 (§ 14), AVANT le SQL, tranchée par lui le 2026-11-05 : personne).
-- Aucune règle ne change. Effet visible : les 9 brouillons apparaissent sous leur nœud et sous leur point
-- dans l'admin ; les élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 9 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--               ('c2eb20cb-4746-4676-8457-745d044ed39a'::uuid),
--               ('c7ee1250-55dc-4fb5-b045-274bfd110504'::uuid),
--               ('949dd113-8aa4-4c0c-95ba-e5220c45e262'::uuid),
--               ('ecf4f632-9f60-4842-ad26-69dfaca93ac3'::uuid),
--               ('77728742-3539-42b6-a372-292da75ca420'::uuid),
--               ('29c06264-12fd-453a-a55c-da666963edb8'::uuid),
--               ('79e8e279-921f-48d1-872a-d9e279d4672a'::uuid),
--               ('b307a9f9-a6f1-46d5-8cef-fee8aca98782'::uuid),
--               ('49b8dc0b-bab2-4f58-8b3c-1545b9967ffd'::uuid))
--  as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('c2eb20cb-4746-4676-8457-745d044ed39a'::uuid, 'CE2-068'),
-- 	('c7ee1250-55dc-4fb5-b045-274bfd110504'::uuid, 'CE2-095'),
-- 	('949dd113-8aa4-4c0c-95ba-e5220c45e262'::uuid, 'CE2-069'),
-- 	('ecf4f632-9f60-4842-ad26-69dfaca93ac3'::uuid, 'CE2-067'),
-- 	('77728742-3539-42b6-a372-292da75ca420'::uuid, 'CE2-081'),
-- 	('29c06264-12fd-453a-a55c-da666963edb8'::uuid, 'CE2-071'),
-- 	('79e8e279-921f-48d1-872a-d9e279d4672a'::uuid, 'CE2-072'),
-- 	('b307a9f9-a6f1-46d5-8cef-fee8aca98782'::uuid, 'CE2-072'),
-- 	('49b8dc0b-bab2-4f58-8b3c-1545b9967ffd'::uuid, 'CE2-073')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'CE2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               'c2eb20cb-4746-4676-8457-745d044ed39a',
--               'c7ee1250-55dc-4fb5-b045-274bfd110504',
--               '949dd113-8aa4-4c0c-95ba-e5220c45e262',
--               'ecf4f632-9f60-4842-ad26-69dfaca93ac3',
--               '77728742-3539-42b6-a372-292da75ca420',
--               '29c06264-12fd-453a-a55c-da666963edb8',
--               '79e8e279-921f-48d1-872a-d9e279d4672a',
--               'b307a9f9-a6f1-46d5-8cef-fee8aca98782',
--               '49b8dc0b-bab2-4f58-8b3c-1545b9967ffd');
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
	code text not null,
	-- sous-notions que la notion a le droit d'avoir quand le modèle va sur elle (relevé du 2026-11-05)
	sous_notions_admises text[]
);
insert into _qc_modeles values
	('c2eb20cb-4746-4676-8457-745d044ed39a', 'Géométrie', 'Figures planes', 'propriétés', 'CE2-068', null),
	('c7ee1250-55dc-4fb5-b045-274bfd110504', 'Géométrie', 'Figures planes', 'propriétés', 'CE2-095', null),
	('949dd113-8aa4-4c0c-95ba-e5220c45e262', 'Géométrie', 'Figures planes', 'propriétés', 'CE2-069', null),
	('ecf4f632-9f60-4842-ad26-69dfaca93ac3', 'Géométrie', 'Figures planes', 'propriétés', 'CE2-067', null),
	('77728742-3539-42b6-a372-292da75ca420', 'Géométrie', 'Figures planes', 'propriétés', 'CE2-081', null),
	('29c06264-12fd-453a-a55c-da666963edb8', 'Géométrie', 'Figures planes', 'angles droits', 'CE2-071', null),
	('79e8e279-921f-48d1-872a-d9e279d4672a', 'Géométrie', 'Symétrie axiale', null, 'CE2-072', null),
	('b307a9f9-a6f1-46d5-8cef-fee8aca98782', 'Géométrie', 'Symétrie axiale', null, 'CE2-072', null),
	('49b8dc0b-bab2-4f58-8b3c-1545b9967ffd', 'Géométrie', 'Symétrie axiale', null, 'CE2-073', null);

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
 where p.grade = 'CE2' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qc_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qc_modeles where noeud is null),
			(select count(*) from _qc_modeles where point_id is null);
	end if;
	if exists (select 1 from _qc_modeles r
	            join public.classification_nodes s on s.parent_id = r.noeud
	             and s.kind = 'subnotion' and s.archived_at is null
	           where r.sous_notion is null
	             and s.name <> all (coalesce(r.sous_notions_admises, '{}'))) then
		raise exception 'notion visée sans sous-notion, mais elle en a une non admise';
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qc_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 9) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 9', v_presents;
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
