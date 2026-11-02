-- ============================================================================
-- Chantier « questions-tspe-espace », lot 6b (plans, représentations paramétriques, équations
-- cartésiennes) : nœud et tags de 4 modèles
-- ============================================================================
--   les 4 brouillons du lot 6b, créés sans nœud ni tag, vont sur un nœud EXISTANT, tag posé :
--   8767110f (Lieux géométriques) → TSPE-358 ;
--   86efd357 (Reconnaître un plan par son équation) → TSPE-368 ;
--     ces deux sur « Orthogonalité et distances dans l'espace > vecteur normal et équation
--     cartésienne », nœud de leurs points ;
--   0027cea7 (Coordonnées d'un vecteur dans une base) → TSPE-566, « Espace > vecteurs de
--     l'espace » (point sur la notion « Espace », qui a des sous-notions ; comme M1 du lot 6a) ;
--   833cf1f1 (Interpréter les solutions d'un système) → TSPE-568, « Espace > positions relatives
--     et intersections » (nœud du point).
-- Branche : « Géométrie ». Aucune sous-notion neuve. question_template_points_check_rules
-- accepte un tag dont le point est sur le nœud du modèle OU sur sa notion, et au plus UN point par
-- programme (ADR 0020).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-02 (journal docs/wip/questions-tspe-espace-progress.md,
-- § Lot 6b). Les modèles ont été créés en brouillon le 2026-11-02 par scripts/create-questions.ts
-- (scripts/questions/tspe-6b-plans-systemes/, #2254), qui ne pose ni nœud ni tag. Relevé de la
-- prod du 2026-11-02 (MCP) : 4 brouillons en [T_SPE], sans nœud ni tag ; nœuds des 4 points
-- vérifiés le même jour.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (4 modèles). Elle est prouvée par
-- tests/integration/questions-tspe-lot6b-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Gardes (avant toute écriture) : chaque modèle doit être encore SANS nœud et SANS aucun tag
-- (relevé du 2026-11-02), sinon un rangement fait depuis à la main serait écrasé. Nœuds désignés
-- par leur chemin, résolus STRICTEMENT ; chaque point doit être sur le nœud de son modèle ou sur sa
-- notion.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (brouillons : admin et prof ; leurs tags, pas leur
-- contenu, lisibles par tout compte connecté, comme avant). Question posée avec la phase 0 du lot
-- 6b, « je valide » de David le 2026-11-02. Aucune règle (policy) ne change. Les élèves ne voient
-- les modèles qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 4 tags et rend les modèles sans nœud. Garde : il
-- refuse si un modèle n'est plus sur le nœud laissé par la migration ou porte d'autres tags. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._qtl6b_retour;
-- create temporary table _qtl6b_retour (
-- 	id uuid primary key, branche text not null, notion text not null, sous_notion text,
-- 	grade text not null, code text not null, noeud uuid
-- );
-- insert into _qtl6b_retour values
-- 	('8767110f-dedc-4315-bed7-7023c2d219ec', 'Géométrie', 'Orthogonalité et distances dans l''espace', 'vecteur normal et équation cartésienne', 'T_SPE', 'TSPE-358', null),
-- 	('86efd357-5bf1-440d-b42f-447a31e513c5', 'Géométrie', 'Orthogonalité et distances dans l''espace', 'vecteur normal et équation cartésienne', 'T_SPE', 'TSPE-368', null),
-- 	('0027cea7-3d39-4958-b524-f09c575b8771', 'Géométrie', 'Espace', 'vecteurs de l''espace', 'T_SPE', 'TSPE-566', null),
-- 	('833cf1f1-8a3f-4319-806c-1893e30ef2dd', 'Géométrie', 'Espace', 'positions relatives et intersections', 'T_SPE', 'TSPE-568', null);
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _qtl6b_retour order by id;
-- select 1 from public.question_templates where id in (select id from _qtl6b_retour) order by id for update;
-- update _qtl6b_retour r set noeud = s.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--   join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion and r.sous_notion is not null and s.name = r.sous_notion;
-- update _qtl6b_retour r set noeud = n.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion and r.sous_notion is null;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer;
-- begin
-- 	if exists (select 1 from _qtl6b_retour where noeud is null) then
-- 		raise exception 'rollback : nœuds introuvables : %', (select count(*) from _qtl6b_retour where noeud is null);
-- 	end if;
-- 	select count(*), count(*) filter (where q.classification_node_id = r.noeud)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q join _qtl6b_retour r on r.id = q.id;
-- 	if v_presents not in (0, 4) then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 4', v_presents;
-- 	end if;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur % ne sont plus sur le nœud de la migration', v_presents - v_intacts, v_presents;
-- 	end if;
-- 	select count(*), count(*) filter (where p.grade = r.grade and p.code = r.code)
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join _qtl6b_retour r on r.id = q.template_id
-- 	  join public.curriculum_points p on p.id = q.point_id;
-- 	if v_tags <> v_total or v_total <> v_presents then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, v_presents;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using _qtl6b_retour r where q.template_id = r.id;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (select id from _qtl6b_retour);
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- drop table _qtl6b_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires ----------------------------------------------
drop table if exists pg_temp._qtl6b_tags;
drop table if exists pg_temp._qtl6b_modeles;
create temporary table _qtl6b_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text  -- null : le modèle va sur la notion (qui n'a pas de sous-notion)
);
insert into _qtl6b_modeles values
	('8767110f-dedc-4315-bed7-7023c2d219ec', 'Géométrie', 'Orthogonalité et distances dans l''espace', 'vecteur normal et équation cartésienne'),
	('86efd357-5bf1-440d-b42f-447a31e513c5', 'Géométrie', 'Orthogonalité et distances dans l''espace', 'vecteur normal et équation cartésienne'),
	('0027cea7-3d39-4958-b524-f09c575b8771', 'Géométrie', 'Espace', 'vecteurs de l''espace'),
	('833cf1f1-8a3f-4319-806c-1893e30ef2dd', 'Géométrie', 'Espace', 'positions relatives et intersections');
create temporary table _qtl6b_tags (
	id uuid not null references _qtl6b_modeles (id),
	grade text not null,
	code text not null,
	primary key (id, grade)
);
insert into _qtl6b_tags values
	('8767110f-dedc-4315-bed7-7023c2d219ec', 'T_SPE', 'TSPE-358'),
	('86efd357-5bf1-440d-b42f-447a31e513c5', 'T_SPE', 'TSPE-368'),
	('0027cea7-3d39-4958-b524-f09c575b8771', 'T_SPE', 'TSPE-566'),
	('833cf1f1-8a3f-4319-806c-1893e30ef2dd', 'T_SPE', 'TSPE-568');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qtl6b_modeles order by id;
select 1 from public.question_templates where id in (select id from _qtl6b_modeles) order by id for update;

-- ---- 2. Gardes (avant toute écriture) : présence TOUT ou RIEN, sans nœud, sans tag ---------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qtl6b_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 4) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 4', v_presents;
	end if;
	select count(*) into v_ranges from _qtl6b_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qtl6b_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 3. Résolution STRICTE des chemins et des points -----------------------------------
-- Le nœud est la sous-notion désignée, ou la notion quand aucune sous-notion n'est donnée ; chaque
-- point doit être sur ce nœud ou sur sa notion
alter table _qtl6b_modeles add column noeud uuid;
alter table _qtl6b_modeles add column notion_id uuid;
alter table _qtl6b_tags add column point_id uuid;
update _qtl6b_modeles r set noeud = s.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is not null and s.name = r.sous_notion;
update _qtl6b_modeles r set noeud = n.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qtl6b_tags t set point_id = p.id
  from _qtl6b_modeles r, public.curriculum_points p
 where r.id = t.id and p.grade = t.grade and p.code = t.code and p.archived_at is null
   and p.node_id in (r.noeud, r.notion_id);
do $resolution$
begin
	if exists (select 1 from _qtl6b_modeles where noeud is null)
	   or exists (select 1 from _qtl6b_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qtl6b_modeles where noeud is null),
			(select count(*) from _qtl6b_tags where point_id is null);
	end if;
	-- Une notion désignée sans sous-notion ne doit en avoir AUCUNE (sinon le modèle irait par erreur
	-- sur la notion au lieu d'une de ses sous-notions)
	if exists (select 1 from _qtl6b_modeles r
	             join public.classification_nodes s on s.parent_id = r.notion_id
	              and s.kind = 'subnotion' and s.archived_at is null
	            where r.sous_notion is null) then
		raise exception 'notion visée sans sous-notion, mais elle en a : % modèle(s)',
			(select count(*) from _qtl6b_modeles r
			  where r.sous_notion is null
			    and exists (select 1 from public.classification_nodes s where s.parent_id = r.notion_id
			                  and s.kind = 'subnotion' and s.archived_at is null));
	end if;
end $resolution$;

-- ---- 4. Rangement, puis tags (le trigger des tags lit le nœud du modèle) -----------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qtl6b_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.id, t.point_id
  from _qtl6b_tags t
  join public.question_templates q on q.id = t.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_attendus integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qtl6b_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qtl6b_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*) into v_attendus from _qtl6b_tags t join public.question_templates q on q.id = t.id;
	select count(*), count(*) filter (where exists (select 1 from _qtl6b_tags t
	                                                where t.id = q.template_id and t.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qtl6b_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_attendus or v_total <> v_attendus then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_attendus, v_total;
	end if;
end $check$;

drop table _qtl6b_tags;
drop table _qtl6b_modeles;
