-- ============================================================================
-- Chantier « questions-6 », lot 4 « Fractions » : nœud et tag de 10 brouillons, 3 modèles de 5e passés en 6e
-- ============================================================================
--   - 10 brouillons neufs (sans nœud ni tag) vont sur le nœud de leur point et le reçoivent :
--     5077e030 (6-130), c9c3a8a3 (6-131), 378aa770 (6-136), afebbb91 (6-133), 7ff1ac44 (6-203),
--     83c835bb (6-134), c360d588 (6-204), ddf5d292 (6-205), 5cd25c2b (6-137, sur la NOTION
--     « Fractions : calculs » : le point n'a pas de sous-notion), c99be374 (6-135) ;
--   - 3 modèles publiés de 5e, sans point, qui décrivent 6-131 : 0be55013 (« b/c de n »), 9293eb9a
--     (« b/c × n »), 8ffdbdb1 (fraction entière) passent en 6e (`grades` [5] → [6]) et reçoivent
--     6-131. Ils sont déjà sur son nœud (« Fractions : calculs > fraction d'une quantité ») : il ne
--     bouge pas.
-- Chaque modèle va sur le nœud de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point) et porte UN point (ADR 0020 : au plus un point par programme).
-- Ni le contenu ni le statut ne changent : `updated_at` est PRÉSERVÉ. Le contenu de e3d87166 est
-- corrigé par la migration précédente (20261028140000_questions_6_fractions_contenu).
-- ============================================================================
-- Décisions de David le 2026-10-28 (journal docs/wip/questions-6-progress.md § 11, « oui » aux trois
-- recos). Les 10 brouillons ont été créés le 2026-10-28 par scripts/create-questions.ts
-- (scripts/questions/6-fractions/, lancé par David), qui ne pose ni nœud ni tag. Relevé de la prod
-- (MCP, 2026-10-28) : 10 brouillons, niveaux [6], sans nœud, sans tag ; 3 modèles publiés, niveaux
-- [5], sur le nœud de 6-131, sans tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (13 modèles). Elle est prouvée par
-- tests/integration/questions-6-fractions-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (état relevé) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore au nœud (aucun pour les brouillons), aux niveaux et au
-- statut relevés, et ne porter aucun tag, sinon une saisie faite depuis serait écrasée. Nœud
-- désigné par son chemin, résolu STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (brouillons neufs ; relevé du 2026-10-28 sur les 3 modèles de 5e :
-- 0 carte SRS, 0 tentative de compétence ou d'évaluation, 0 activité de journal).
--
-- Accès (questions tranchées par David le 2026-10-28) : les 10 brouillons, personne (visibles des
-- seuls admin et auteur jusqu'à leur publication) ; les 3 modèles publiés, les élèves et le prof
-- de 6e les voient, ceux de 5e ne les voient plus (aucun point de 5e ne les portait). Aucune règle
-- (policy) ne change.
--
-- Rollback (aucune donnée d'élève). Il retire les 13 tags, rend les 10 brouillons sans nœud et
-- les 3 modèles à la 5e. Garde : il refuse si un modèle n'est plus en 6e, rangé, au statut posé,
-- avec son seul tag (une saisie faite depuis serait écrasée en silence). Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('0be55013-6c7d-447b-98f4-bdfa574ad506'::uuid),
--                ('378aa770-4d92-4c21-aa2f-05d8f9cc4fb4'::uuid),
--                ('5077e030-ab90-4660-91a7-25cb48281445'::uuid),
--                ('5cd25c2b-1def-492c-a81f-998255ea4f1d'::uuid),
--                ('7ff1ac44-8099-472a-b688-a331f91be9c5'::uuid),
--                ('83c835bb-5534-4b1a-afc2-2d3430622f9e'::uuid),
--                ('8ffdbdb1-4688-47d6-89c1-f3c33e147311'::uuid),
--                ('9293eb9a-8b9a-43c1-b6bf-d2f71134dd44'::uuid),
--                ('afebbb91-4d08-46f0-8640-77fe4e6f4e62'::uuid),
--                ('c360d588-3e4f-4ea5-8d27-1f671fe47bcd'::uuid),
--                ('c99be374-4d52-4a9c-bcd4-03b71f45f717'::uuid),
--                ('c9c3a8a3-575a-4d8d-b278-cc22d348f274'::uuid),
--                ('ddf5d292-d792-41d9-9136-2018e73cff9d'::uuid)) as r(id)
--  order by r.id;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_tags integer;
-- begin
-- 	perform 1 from public.question_templates where id in ('0be55013-6c7d-447b-98f4-bdfa574ad506', '378aa770-4d92-4c21-aa2f-05d8f9cc4fb4', '5077e030-ab90-4660-91a7-25cb48281445', '5cd25c2b-1def-492c-a81f-998255ea4f1d', '7ff1ac44-8099-472a-b688-a331f91be9c5', '83c835bb-5534-4b1a-afc2-2d3430622f9e', '8ffdbdb1-4688-47d6-89c1-f3c33e147311', '9293eb9a-8b9a-43c1-b6bf-d2f71134dd44', 'afebbb91-4d08-46f0-8640-77fe4e6f4e62', 'c360d588-3e4f-4ea5-8d27-1f671fe47bcd', 'c99be374-4d52-4a9c-bcd4-03b71f45f717', 'c9c3a8a3-575a-4d8d-b278-cc22d348f274', 'ddf5d292-d792-41d9-9136-2018e73cff9d') order by id for update;
-- 	-- Intact : en 6e, rangé, au statut posé (brouillons pas publiés depuis, 3 de 5e toujours publiés)
-- 	select count(*), count(*) filter (where q.grades = array['6'] and q.classification_node_id is not null
-- 	                                     and q.status = case when q.id in ('0be55013-6c7d-447b-98f4-bdfa574ad506', '9293eb9a-8b9a-43c1-b6bf-d2f71134dd44', '8ffdbdb1-4688-47d6-89c1-f3c33e147311') then 'published' else 'draft' end)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q
-- 	 where q.id in ('0be55013-6c7d-447b-98f4-bdfa574ad506', '378aa770-4d92-4c21-aa2f-05d8f9cc4fb4', '5077e030-ab90-4660-91a7-25cb48281445', '5cd25c2b-1def-492c-a81f-998255ea4f1d', '7ff1ac44-8099-472a-b688-a331f91be9c5', '83c835bb-5534-4b1a-afc2-2d3430622f9e', '8ffdbdb1-4688-47d6-89c1-f3c33e147311', '9293eb9a-8b9a-43c1-b6bf-d2f71134dd44', 'afebbb91-4d08-46f0-8640-77fe4e6f4e62', 'c360d588-3e4f-4ea5-8d27-1f671fe47bcd', 'c99be374-4d52-4a9c-bcd4-03b71f45f717', 'c9c3a8a3-575a-4d8d-b278-cc22d348f274', 'ddf5d292-d792-41d9-9136-2018e73cff9d');
-- 	select count(*) into v_tags from public.question_template_points
-- 	 where template_id in ('0be55013-6c7d-447b-98f4-bdfa574ad506', '378aa770-4d92-4c21-aa2f-05d8f9cc4fb4', '5077e030-ab90-4660-91a7-25cb48281445', '5cd25c2b-1def-492c-a81f-998255ea4f1d', '7ff1ac44-8099-472a-b688-a331f91be9c5', '83c835bb-5534-4b1a-afc2-2d3430622f9e', '8ffdbdb1-4688-47d6-89c1-f3c33e147311', '9293eb9a-8b9a-43c1-b6bf-d2f71134dd44', 'afebbb91-4d08-46f0-8640-77fe4e6f4e62', 'c360d588-3e4f-4ea5-8d27-1f671fe47bcd', 'c99be374-4d52-4a9c-bcd4-03b71f45f717', 'c9c3a8a3-575a-4d8d-b278-cc22d348f274', 'ddf5d292-d792-41d9-9136-2018e73cff9d');
-- 	if v_intacts <> v_presents or v_tags <> v_presents then
-- 		raise exception 'rollback : état changé depuis la migration (% intact(s) sur %, % tag(s))', v_intacts, v_presents, v_tags;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('5077e030-ab90-4660-91a7-25cb48281445'::uuid, '6-130'),
-- 	('c9c3a8a3-575a-4d8d-b278-cc22d348f274'::uuid, '6-131'),
-- 	('378aa770-4d92-4c21-aa2f-05d8f9cc4fb4'::uuid, '6-136'),
-- 	('afebbb91-4d08-46f0-8640-77fe4e6f4e62'::uuid, '6-133'),
-- 	('7ff1ac44-8099-472a-b688-a331f91be9c5'::uuid, '6-203'),
-- 	('83c835bb-5534-4b1a-afc2-2d3430622f9e'::uuid, '6-134'),
-- 	('c360d588-3e4f-4ea5-8d27-1f671fe47bcd'::uuid, '6-204'),
-- 	('ddf5d292-d792-41d9-9136-2018e73cff9d'::uuid, '6-205'),
-- 	('5cd25c2b-1def-492c-a81f-998255ea4f1d'::uuid, '6-137'),
-- 	('c99be374-4d52-4a9c-bcd4-03b71f45f717'::uuid, '6-135'),
-- 	('0be55013-6c7d-447b-98f4-bdfa574ad506'::uuid, '6-131'),
-- 	('9293eb9a-8b9a-43c1-b6bf-d2f71134dd44'::uuid, '6-131'),
-- 	('8ffdbdb1-4688-47d6-89c1-f3c33e147311'::uuid, '6-131')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '6' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('5077e030-ab90-4660-91a7-25cb48281445',
--               'c9c3a8a3-575a-4d8d-b278-cc22d348f274',
--               '378aa770-4d92-4c21-aa2f-05d8f9cc4fb4',
--               'afebbb91-4d08-46f0-8640-77fe4e6f4e62',
--               '7ff1ac44-8099-472a-b688-a331f91be9c5',
--               '83c835bb-5534-4b1a-afc2-2d3430622f9e',
--               'c360d588-3e4f-4ea5-8d27-1f671fe47bcd',
--               'ddf5d292-d792-41d9-9136-2018e73cff9d',
--               '5cd25c2b-1def-492c-a81f-998255ea4f1d',
--               'c99be374-4d52-4a9c-bcd4-03b71f45f717');
-- update public.question_templates set grades = array['5']
--  where id in ('0be55013-6c7d-447b-98f4-bdfa574ad506',
--               '9293eb9a-8b9a-43c1-b6bf-d2f71134dd44',
--               '8ffdbdb1-4688-47d6-89c1-f3c33e147311');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._q6f_modeles;
create temporary table _q6f_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null,
	-- Relevé : déjà sur le nœud du point (les 3 de 5e) ou sans nœud (les brouillons)
	deja_range boolean not null,
	grades_avant text[] not null,
	grades_apres text[] not null,
	statut text not null
);
insert into _q6f_modeles values
	('5077e030-ab90-4660-91a7-25cb48281445', 'Nombres et calculs', 'Fractions : sens et écritures', 'forme décimale', '6-130', false, array['6'], array['6'], 'draft'),
	('c9c3a8a3-575a-4d8d-b278-cc22d348f274', 'Nombres et calculs', 'Fractions : calculs', 'fraction d''une quantité', '6-131', false, array['6'], array['6'], 'draft'),
	('378aa770-4d92-4c21-aa2f-05d8f9cc4fb4', 'Nombres et calculs', 'Fractions : calculs', 'multiplication', '6-136', false, array['6'], array['6'], 'draft'),
	('afebbb91-4d08-46f0-8640-77fe4e6f4e62', 'Nombres et calculs', 'Fractions : sens et écritures', 'ordre', '6-133', false, array['6'], array['6'], 'draft'),
	('7ff1ac44-8099-472a-b688-a331f91be9c5', 'Nombres et calculs', 'Fractions : sens et écritures', 'ordre', '6-203', false, array['6'], array['6'], 'draft'),
	('83c835bb-5534-4b1a-afc2-2d3430622f9e', 'Nombres et calculs', 'Fractions : sens et écritures', 'ordre', '6-134', false, array['6'], array['6'], 'draft'),
	('c360d588-3e4f-4ea5-8d27-1f671fe47bcd', 'Nombres et calculs', 'Fractions : sens et écritures', 'ordre', '6-204', false, array['6'], array['6'], 'draft'),
	('ddf5d292-d792-41d9-9136-2018e73cff9d', 'Nombres et calculs', 'Fractions : calculs', 'addition et soustraction', '6-205', false, array['6'], array['6'], 'draft'),
	('5cd25c2b-1def-492c-a81f-998255ea4f1d', 'Nombres et calculs', 'Fractions : calculs', null, '6-137', false, array['6'], array['6'], 'draft'),
	('c99be374-4d52-4a9c-bcd4-03b71f45f717', 'Nombres et calculs', 'Fractions : calculs', 'addition et soustraction', '6-135', false, array['6'], array['6'], 'draft'),
	('0be55013-6c7d-447b-98f4-bdfa574ad506', 'Nombres et calculs', 'Fractions : calculs', 'fraction d''une quantité', '6-131', true, array['5'], array['6'], 'published'),
	('9293eb9a-8b9a-43c1-b6bf-d2f71134dd44', 'Nombres et calculs', 'Fractions : calculs', 'fraction d''une quantité', '6-131', true, array['5'], array['6'], 'published'),
	('8ffdbdb1-4688-47d6-89c1-f3c33e147311', 'Nombres et calculs', 'Fractions : calculs', 'fraction d''une quantité', '6-131', true, array['5'], array['6'], 'published');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q6f_modeles order by id;
select 1 from public.question_templates where id in (select id from _q6f_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _q6f_modeles add column noeud uuid, add column point_id uuid;
update _q6f_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _q6f_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _q6f_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = '6' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _q6f_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _q6f_modeles where noeud is null),
			(select count(*) from _q6f_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, nœud, niveaux et statut relevés, aucun tag ---------
do $garde$
declare v_presents integer; v_ecarts integer; v_niveaux integer; v_statuts integer; v_tags integer;
begin
	select count(*) into v_presents from _q6f_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 13) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 13', v_presents;
	end if;
	select count(*) into v_ecarts from _q6f_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is distinct from case when r.deja_range then r.noeud end;
	if v_ecarts <> 0 then
		raise exception 'modèles rangés ou déplacés depuis le relevé : %', v_ecarts;
	end if;
	select count(*) into v_niveaux from _q6f_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.grades is distinct from r.grades_avant;
	if v_niveaux <> 0 then
		raise exception 'niveaux changés depuis le relevé : %', v_niveaux;
	end if;
	select count(*) into v_statuts from _q6f_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.status is distinct from r.statut;
	if v_statuts <> 0 then
		raise exception 'statuts changés depuis le relevé : %', v_statuts;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _q6f_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, niveaux, puis tags ------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q6f_modeles r
 where q.id = r.id and q.classification_node_id is distinct from r.noeud;
update public.question_templates q set grades = r.grades_apres
  from _q6f_modeles r
 where q.id = r.id and q.grades is distinct from r.grades_apres;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _q6f_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_niveaux integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _q6f_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q6f_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*) into v_niveaux from _q6f_modeles r
	  join public.question_templates q on q.id = r.id and q.grades = r.grades_apres;
	select count(*), count(*) filter (where exists (select 1 from _q6f_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q6f_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_niveaux <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, niveaux %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_niveaux, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _q6f_modeles;
