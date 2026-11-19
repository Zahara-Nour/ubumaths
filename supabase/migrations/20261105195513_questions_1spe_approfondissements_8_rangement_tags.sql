-- ============================================================================
-- Chantier « questions-1spe-demonstrations », lot 8 (approfondissements, géométrie) : 1 sous-notion
-- neuve, nœud et tag de 6 modèles
-- ============================================================================
--   une sous-notion NEUVE, en fin de sa notion (D6) : « Géométrie > Géométrie repérée > parabole » ;
--   les 6 brouillons du lot 8, créés sans nœud ni tag, vont sur leur sous-notion, tag posé :
--   4664114e (loi des sinus) → 1SPE-324, « Produit scalaire > angles et longueurs » (où est le point) ;
--   d33f98d5 (hauteurs concourantes) → 1SPE-325, « Produit scalaire > propriétés » ;
--   d4db2207 (médianes et centre de gravité) → 1SPE-326, « Vecteurs > combinaison linéaire » ;
--   64f54fc1 (points équidistants de l'axe et d'un point) → 1SPE-334, « Géométrie repérée > parabole » ;
--   a98fd3cf (cercle et droite parallèle à un axe) → 1SPE-335, « Géométrie repérée > équation de cercle » ;
--   8cbfcf4b (parabole et droite parallèle à un axe) → 1SPE-420, « Géométrie repérée > parabole ».
-- Les points 325, 326, 334, 335 et 420 restent sur leur notion : question_template_points_check_rules
-- accepte un tag dont le point est sur le nœud du modèle OU sur sa notion, et au plus UN point par
-- programme (ADR 0020). Ni le contenu, ni les niveaux ({1_SPE}), ni le statut ne changent :
-- `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-04 (journal docs/wip/questions-1spe-demonstrations-progress.md,
-- § 9 D3) ; rangement tranché le 2026-11-05 (§ 13 D6). Les modèles ont été créés en brouillon par
-- David le 2026-11-05 avec scripts/create-questions.ts (scripts/questions/1spe-approfondissements-8/,
-- #2401), qui ne pose ni nœud ni tag. Relevé de la prod du 2026-11-05 (MCP) : 6 brouillons en
-- {1_SPE}, sans nœud ni tag ; 1SPE-324 sur « angles et longueurs », 325 sur la notion Produit
-- scalaire, 326 sur la notion Vecteurs, 334, 335 et 420 sur la notion Géométrie repérée ; aucun
-- modèle déjà tagué sur ces points ; la sous-notion « parabole » n'existe pas sous Géométrie repérée
-- (ni active, ni archivée).
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle et
-- ses vérifications le tolèrent (la sous-notion, elle, est créée partout) ; elle exige TOUT ou RIEN
-- (6 modèles). Elle est prouvée par
-- tests/integration/questions-1spe-approfondissements-8-rangement-tags.test.ts, qui fabrique des
-- copies des identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Gardes (avant toute écriture) : chaque modèle doit être encore SANS nœud et SANS aucun tag
-- (relevé du 2026-11-05), sinon un rangement fait depuis à la main serait écrasé ; la sous-notion
-- neuve ne doit pas exister (même nom, casse ignorée, sous la même notion). Nœuds désignés par leur
-- chemin, résolus STRICTEMENT ; chaque point doit être sur le nœud de son modèle ou sur sa notion.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon ; sous-notion neuve).
--
-- Accès : personne ne gagne ni ne perd d'accès (brouillons : admin et prof ; leurs tags, pas leur
-- contenu, lisibles par tout compte connecté, comme avant ; l'arbre des notions est de lecture
-- publique, la sous-notion neuve aussi, comme toutes). Question posée à David AVANT le SQL
-- (phase 0 des approfondissements, Q5), tranchée par lui le 2026-11-04 : personne. Aucune règle
-- (policy) ne change. Les élèves ne voient les modèles qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 6 tags, rend les modèles sans nœud et supprime
-- la sous-notion neuve. Garde : il refuse si un modèle n'est plus sur le nœud laissé par la
-- migration ou porte d'autres tags, ou si la sous-notion neuve porte autre chose (modèle, point,
-- enfant) que les modèles du lot. Bloc éprouvé par le test d'intégration, à jouer dans UNE
-- transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._q1a8_retour;
-- create temporary table _q1a8_retour (
-- 	id uuid primary key, branche text not null, notion text not null, sous_notion text not null,
-- 	grade text not null, code text not null, neuve boolean not null, noeud uuid
-- );
-- insert into _q1a8_retour values
-- 	('4664114e-75cb-4907-a97a-2c5be1845e99', 'Géométrie', 'Produit scalaire', 'angles et longueurs', '1_SPE', '1SPE-324', false, null),
-- 	('d33f98d5-f76d-40d2-b17d-7113ed420053', 'Géométrie', 'Produit scalaire', 'propriétés', '1_SPE', '1SPE-325', false, null),
-- 	('d4db2207-e392-4b3b-8973-3656a4ab4642', 'Géométrie', 'Vecteurs', 'combinaison linéaire', '1_SPE', '1SPE-326', false, null),
-- 	('64f54fc1-1222-4795-bcb9-305262667688', 'Géométrie', 'Géométrie repérée', 'parabole', '1_SPE', '1SPE-334', true, null),
-- 	('a98fd3cf-9e7e-4761-be91-c66ea087c34d', 'Géométrie', 'Géométrie repérée', 'équation de cercle', '1_SPE', '1SPE-335', false, null),
-- 	('8cbfcf4b-5529-4b6c-bb75-453224840ab3', 'Géométrie', 'Géométrie repérée', 'parabole', '1_SPE', '1SPE-420', true, null);
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _q1a8_retour order by id;
-- select 1 from public.question_templates where id in (select id from _q1a8_retour) order by id for update;
-- update _q1a8_retour r set noeud = s.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--   join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion and s.name = r.sous_notion;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer;
-- begin
-- 	if exists (select 1 from _q1a8_retour where noeud is null) then
-- 		raise exception 'rollback : sous-notions introuvables : %', (select count(*) from _q1a8_retour where noeud is null);
-- 	end if;
-- 	select count(*), count(*) filter (where q.classification_node_id = r.noeud)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q join _q1a8_retour r on r.id = q.id;
-- 	if v_presents not in (0, 6) then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 6', v_presents;
-- 	end if;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur % ne sont plus sur le nœud de la migration', v_presents - v_intacts, v_presents;
-- 	end if;
-- 	select count(*), count(*) filter (where p.grade = r.grade and p.code = r.code)
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join _q1a8_retour r on r.id = q.template_id
-- 	  join public.curriculum_points p on p.id = q.point_id;
-- 	if v_tags <> v_total or v_total <> v_presents then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, v_presents;
-- 	end if;
-- 	if exists (select 1 from public.question_templates q
-- 	            where q.classification_node_id in (select noeud from _q1a8_retour where neuve)
-- 	              and q.id not in (select id from _q1a8_retour))
-- 	   or exists (select 1 from public.classification_nodes c where c.parent_id in (select noeud from _q1a8_retour where neuve))
-- 	   or exists (select 1 from public.curriculum_points p where p.node_id in (select noeud from _q1a8_retour where neuve)) then
-- 		raise exception 'rollback : une sous-notion neuve porte autre chose que les modèles du lot';
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using _q1a8_retour r where q.template_id = r.id;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (select id from _q1a8_retour);
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- delete from public.classification_nodes where id in (select noeud from _q1a8_retour where neuve);
-- drop table _q1a8_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires ----------------------------------------------
drop table if exists pg_temp._q1a8_tags;
drop table if exists pg_temp._q1a8_modeles;
drop table if exists pg_temp._q1a8_neuves;
create temporary table _q1a8_neuves (
	branche text not null,
	notion text not null,
	sous_notion text not null,
	primary key (branche, notion, sous_notion)
);
insert into _q1a8_neuves values
	('Géométrie', 'Géométrie repérée', 'parabole');
create temporary table _q1a8_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text not null
);
insert into _q1a8_modeles values
	('4664114e-75cb-4907-a97a-2c5be1845e99', 'Géométrie', 'Produit scalaire', 'angles et longueurs'),
	('d33f98d5-f76d-40d2-b17d-7113ed420053', 'Géométrie', 'Produit scalaire', 'propriétés'),
	('d4db2207-e392-4b3b-8973-3656a4ab4642', 'Géométrie', 'Vecteurs', 'combinaison linéaire'),
	('64f54fc1-1222-4795-bcb9-305262667688', 'Géométrie', 'Géométrie repérée', 'parabole'),
	('a98fd3cf-9e7e-4761-be91-c66ea087c34d', 'Géométrie', 'Géométrie repérée', 'équation de cercle'),
	('8cbfcf4b-5529-4b6c-bb75-453224840ab3', 'Géométrie', 'Géométrie repérée', 'parabole');
create temporary table _q1a8_tags (
	id uuid not null references _q1a8_modeles (id),
	grade text not null,
	code text not null,
	primary key (id, grade)
);
insert into _q1a8_tags values
	('4664114e-75cb-4907-a97a-2c5be1845e99', '1_SPE', '1SPE-324'),
	('d33f98d5-f76d-40d2-b17d-7113ed420053', '1_SPE', '1SPE-325'),
	('d4db2207-e392-4b3b-8973-3656a4ab4642', '1_SPE', '1SPE-326'),
	('64f54fc1-1222-4795-bcb9-305262667688', '1_SPE', '1SPE-334'),
	('a98fd3cf-9e7e-4761-be91-c66ea087c34d', '1_SPE', '1SPE-335'),
	('8cbfcf4b-5529-4b6c-bb75-453224840ab3', '1_SPE', '1SPE-420');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q1a8_modeles order by id;
select 1 from public.question_templates where id in (select id from _q1a8_modeles) order by id for update;

-- ---- 2. Gardes (avant toute écriture) : présence TOUT ou RIEN, sans nœud, sans tag ; ---------
-- notion présente, sous-notion neuve absente
alter table _q1a8_neuves add column notion_id uuid;
update _q1a8_neuves r set notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion;
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer; v_existantes integer;
begin
	if exists (select 1 from _q1a8_neuves where notion_id is null) then
		raise exception 'notions introuvables : %', (select count(*) from _q1a8_neuves where notion_id is null);
	end if;
	select count(*) into v_existantes from _q1a8_neuves r
	  join public.classification_nodes s on s.parent_id = r.notion_id and lower(s.name) = lower(r.sous_notion);
	if v_existantes <> 0 then
		raise exception 'sous-notions déjà présentes : %', v_existantes;
	end if;
	select count(*) into v_presents from _q1a8_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 6) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 6', v_presents;
	end if;
	select count(*) into v_ranges from _q1a8_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _q1a8_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 3. La sous-notion neuve, en fin de sa notion ----------------------------------------
insert into public.classification_nodes (kind, parent_id, name, position)
select 'subnotion', r.notion_id, r.sous_notion,
       (select coalesce(max(s.position), -1) from public.classification_nodes s where s.parent_id = r.notion_id)
       + row_number() over (partition by r.notion_id order by r.sous_notion desc)
  from _q1a8_neuves r;

-- ---- 4. Résolution STRICTE des chemins et des points -----------------------------------
-- Le nœud est la sous-notion désignée ; chaque point doit être sur ce nœud ou sur sa notion
alter table _q1a8_modeles add column noeud uuid;
alter table _q1a8_modeles add column notion_id uuid;
alter table _q1a8_tags add column point_id uuid;
update _q1a8_modeles r set noeud = s.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _q1a8_tags t set point_id = p.id
  from _q1a8_modeles r, public.curriculum_points p
 where r.id = t.id and p.grade = t.grade and p.code = t.code and p.archived_at is null
   and p.node_id in (r.noeud, r.notion_id);
do $resolution$
begin
	if exists (select 1 from _q1a8_modeles where noeud is null)
	   or exists (select 1 from _q1a8_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _q1a8_modeles where noeud is null),
			(select count(*) from _q1a8_tags where point_id is null);
	end if;
end $resolution$;

-- ---- 5. Rangement, puis tags (le trigger des tags lit le nœud du modèle) -----------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q1a8_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.id, t.point_id
  from _q1a8_tags t
  join public.question_templates q on q.id = t.id;

-- ---- 6. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_attendus integer; v_total integer; v_tags integer;
        v_neuves integer;
begin
	select count(*) into v_neuves from _q1a8_neuves r
	  join public.classification_nodes s on s.parent_id = r.notion_id and s.kind = 'subnotion'
	   and s.archived_at is null and s.name = r.sous_notion;
	select count(*) into v_presents from _q1a8_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q1a8_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*) into v_attendus from _q1a8_tags t join public.question_templates q on q.id = t.id;
	select count(*), count(*) filter (where exists (select 1 from _q1a8_tags t
	                                                where t.id = q.template_id and t.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q1a8_modeles m on m.id = q.template_id;
	if v_neuves <> 1 or v_noeuds <> v_presents or v_tags <> v_attendus or v_total <> v_attendus then
		raise exception 'lot incohérent : sous-notions %/1, nœuds %/%, tags du lot %/%, tags en base %',
			v_neuves, v_noeuds, v_presents, v_tags, v_attendus, v_total;
	end if;
end $check$;

drop table _q1a8_tags;
drop table _q1a8_modeles;
drop table _q1a8_neuves;
