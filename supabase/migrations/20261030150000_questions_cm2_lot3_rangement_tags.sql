-- ============================================================================
-- Chantier « questions-cm2 », lot 3 (calcul) : nœud et tag de 5 modèles neufs, CM2 ajouté à 3 modèles du CM1
-- ============================================================================
-- A. 5 brouillons neufs, rangés sur la sous-notion de leur point et tagués :
--   - a4cf5fc5 (Compléter une multiplication à trou) → CM2-149, « Nombres et calculs > Entiers : multiplication > tables » ;
--   - 116f68ad (Ajouter 9, 19, …, 99) → CM2-045, « Nombres et calculs > Entiers : addition et soustraction > calcul astucieux » ;
--   - da5fdca4 (Soustraire 9, 19, …, 99) → CM2-150, « Nombres et calculs > Entiers : addition et soustraction > calcul astucieux » ;
--   - 1f2d5097 (Diviser par 4) → CM2-050, « Nombres et calculs > Entiers : division > calcul réfléchi » ;
--   - 3b691903 (Diviser par 8) → CM2-151, « Nombres et calculs > Entiers : division > calcul réfléchi ».
-- B. 3 modèles PUBLIÉS du CM1, repris tels quels au CM2 : niveaux {CM1} → {CM1,CM2}, tag CM1 gardé,
--    tag CM2 ajouté (même nœud, qui est aussi celui du point CM2) :
--   - 8fee3492 (Tables d'addition) : CM1-035 + CM2-035 ;
--   - f24bb468 (Trouver le terme manquant) : CM1-161 + CM2-148 ;
--   - 50a9d91c (Tables de multiplication) : CM1-036 + CM2-036.
-- Un point par programme (ADR 0020) : chaque modèle porte au plus un point du CM2. Ni le contenu ni
-- le statut ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-10-30 (journal docs/wip/questions-cm2-progress.md § 8 et § 8.1).
-- Les brouillons ont été créés le 2026-10-30 par scripts/create-questions.ts (scripts/questions/cm2-3/,
-- PR #2005), qui ne pose ni nœud ni tag. Relevé de la prod du 2026-10-30 (MCP) : 5 brouillons [CM2]
-- sans nœud ni tag ; 3 modèles publiés [CM1], chacun sur le nœud de ses deux points et portant son
-- seul tag CM1.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle et
-- ses vérifications le tolèrent ; elle exige TOUT ou RIEN (8 modèles). Elle est prouvée par
-- tests/integration/questions-cm2-lot3-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (état du relevé) puis rejoue CE fichier.
--
-- Gardes (sinon une saisie faite depuis le relevé serait écrasée) : A encore SANS nœud et SANS tag ;
-- B encore au nœud relevé, aux niveaux {CM1}, publiés, et portant EXACTEMENT leur tag CM1. Nœuds
-- désignés par leur chemin, résolus STRICTEMENT, et égaux à celui du point.
--
-- Données d'élèves : aucune n'est lue ni écrite (A : brouillons neufs ; B : seuls les niveaux et
-- les tags changent, les réponses et révisions existantes ne sont pas touchées).
--
-- Accès : la question a été posée à David AVANT le SQL et tranchée en phase 0 (journal § 8) : les
-- élèves et le prof du CM2 voient 3 modèles publiés de plus (B), ceux du CM1 n'en perdent aucun ;
-- les brouillons (A) ne sont vus de personne d'autre que l'admin avant leur publication par David.
-- Aucune règle (policy) ne change.
--
-- Rollback (aucune donnée d'élève). Il retire les 8 tags CM2 posés, rend A sans nœud et B au seul
-- niveau CM1. Garde : il refuse si un modèle n'a plus EXACTEMENT le nœud, les niveaux et les tags
-- laissés par la migration (sinon une saisie faite depuis serait écrasée en silence). Bloc éprouvé
-- par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou
-- l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- create temporary table _qcm2l3_retour (id uuid primary key, chemin text not null, grades text[] not null, tags text[] not null) on commit drop;
-- insert into _qcm2l3_retour values
-- 	('a4cf5fc5-313c-405a-8f8f-88d0c507395f', 'Nombres et calculs > Entiers : multiplication > tables', array['CM2'], array['CM2-149']),
-- 	('116f68ad-0bef-4c64-9ceb-441da5173c83', 'Nombres et calculs > Entiers : addition et soustraction > calcul astucieux', array['CM2'], array['CM2-045']),
-- 	('da5fdca4-fa2a-41d2-ae5e-e29bba2c35cc', 'Nombres et calculs > Entiers : addition et soustraction > calcul astucieux', array['CM2'], array['CM2-150']),
-- 	('1f2d5097-9ae3-4914-814a-5cfea9c568fe', 'Nombres et calculs > Entiers : division > calcul réfléchi', array['CM2'], array['CM2-050']),
-- 	('3b691903-fb8c-42e6-82d0-c643bda733ce', 'Nombres et calculs > Entiers : division > calcul réfléchi', array['CM2'], array['CM2-151']),
-- 	('8fee3492-87df-4227-a6f5-77d70a715b77', 'Nombres et calculs > Entiers : addition et soustraction > tables', array['CM1', 'CM2'], array['CM1-035', 'CM2-035']),
-- 	('f24bb468-6194-4dfa-b9b8-3eeb29086adc', 'Nombres et calculs > Entiers : addition et soustraction > tables', array['CM1', 'CM2'], array['CM1-161', 'CM2-148']),
-- 	('50a9d91c-9647-4b98-bec1-5a7b939e3180', 'Nombres et calculs > Entiers : multiplication > tables', array['CM1', 'CM2'], array['CM1-036', 'CM2-036']);
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _qcm2l3_retour order by id;
-- select 1 from public.question_templates where id in (select id from _qcm2l3_retour) order by id for update;
-- do $garde_retour$
-- declare v_presents integer; v_ecarts integer;
-- begin
-- 	select count(*) into v_presents from _qcm2l3_retour r join public.question_templates q on q.id = r.id;
-- 	if v_presents not in (0, 8) then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 8', v_presents;
-- 	end if;
-- 	select count(*) into v_ecarts
-- 	  from _qcm2l3_retour r
-- 	  join public.question_templates q on q.id = r.id
-- 	  left join public.classification_nodes s on s.id = q.classification_node_id
-- 	  left join public.classification_nodes n on n.id = s.parent_id
-- 	  left join public.classification_nodes b on b.id = n.parent_id
-- 	 where q.grades is distinct from r.grades
-- 	    or coalesce(b.name || ' > ' || n.name || ' > ' || s.name, '') <> r.chemin
-- 	    or coalesce((select array_agg(p.code order by p.code)
-- 	                   from public.question_template_points t
-- 	                   join public.curriculum_points p on p.id = t.point_id
-- 	                  where t.template_id = r.id), '{}') <> r.tags;
-- 	if v_ecarts <> 0 then
-- 		raise exception 'rollback : % modèle(s) n''ont plus le nœud, les niveaux et les tags laissés par la migration', v_ecarts;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points t
--  using public.curriculum_points p, _qcm2l3_retour r
--  where t.template_id = r.id and p.id = t.point_id and p.grade = 'CM2';
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('a4cf5fc5-313c-405a-8f8f-88d0c507395f',
--               '116f68ad-0bef-4c64-9ceb-441da5173c83',
--               'da5fdca4-fa2a-41d2-ae5e-e29bba2c35cc',
--               '1f2d5097-9ae3-4914-814a-5cfea9c568fe',
--               '3b691903-fb8c-42e6-82d0-c643bda733ce');
-- update public.question_templates set grades = array['CM1']
--  where id in ('8fee3492-87df-4227-a6f5-77d70a715b77',
--               'f24bb468-6194-4dfa-b9b8-3eeb29086adc',
--               '50a9d91c-9647-4b98-bec1-5a7b939e3180');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
-- code_cm1 : tag CM1 relevé (B, gardé) ; nul pour les brouillons neufs (A).
drop table if exists pg_temp._qcm2l3_modeles;
create temporary table _qcm2l3_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text not null,
	code text not null,
	code_cm1 text
);
insert into _qcm2l3_modeles values
	('a4cf5fc5-313c-405a-8f8f-88d0c507395f', 'Nombres et calculs', 'Entiers : multiplication', 'tables', 'CM2-149', null),
	('116f68ad-0bef-4c64-9ceb-441da5173c83', 'Nombres et calculs', 'Entiers : addition et soustraction', 'calcul astucieux', 'CM2-045', null),
	('da5fdca4-fa2a-41d2-ae5e-e29bba2c35cc', 'Nombres et calculs', 'Entiers : addition et soustraction', 'calcul astucieux', 'CM2-150', null),
	('1f2d5097-9ae3-4914-814a-5cfea9c568fe', 'Nombres et calculs', 'Entiers : division', 'calcul réfléchi', 'CM2-050', null),
	('3b691903-fb8c-42e6-82d0-c643bda733ce', 'Nombres et calculs', 'Entiers : division', 'calcul réfléchi', 'CM2-151', null),
	('8fee3492-87df-4227-a6f5-77d70a715b77', 'Nombres et calculs', 'Entiers : addition et soustraction', 'tables', 'CM2-035', 'CM1-035'),
	('f24bb468-6194-4dfa-b9b8-3eeb29086adc', 'Nombres et calculs', 'Entiers : addition et soustraction', 'tables', 'CM2-148', 'CM1-161'),
	('50a9d91c-9647-4b98-bec1-5a7b939e3180', 'Nombres et calculs', 'Entiers : multiplication', 'tables', 'CM2-036', 'CM1-036');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qcm2l3_modeles order by id;
select 1 from public.question_templates where id in (select id from _qcm2l3_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- La sous-notion désignée doit être le nœud du point CM2 (et du point CM1 pour B).
alter table _qcm2l3_modeles add column noeud uuid, add column point_id uuid, add column point_cm1 uuid;
update _qcm2l3_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qcm2l3_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = 'CM2' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
update _qcm2l3_modeles r set point_cm1 = p.id
  from public.curriculum_points p
 where p.grade = 'CM1' and p.code = r.code_cm1 and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qcm2l3_modeles
	            where noeud is null or point_id is null or (code_cm1 is not null and point_cm1 is null)) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qcm2l3_modeles where noeud is null),
			(select count(*) from _qcm2l3_modeles where point_id is null)
			+ (select count(*) from _qcm2l3_modeles where code_cm1 is not null and point_cm1 is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, état du relevé ---------------------------------
do $garde$
declare v_presents integer; v_neufs integer; v_repris integer;
begin
	select count(*) into v_presents from _qcm2l3_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 8) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 8', v_presents;
	end if;
	-- A : sans nœud, sans aucun tag
	select count(*) into v_neufs from _qcm2l3_modeles r
	  join public.question_templates q on q.id = r.id
	 where r.code_cm1 is null
	   and (q.classification_node_id is not null
	        or exists (select 1 from public.question_template_points t where t.template_id = r.id));
	if v_neufs <> 0 then
		raise exception 'modèles neufs déjà rangés ou tagués depuis le relevé : %', v_neufs;
	end if;
	-- B : nœud relevé, niveaux {CM1}, publié, tags EXACTEMENT {point CM1}
	select count(*) into v_repris from _qcm2l3_modeles r
	  join public.question_templates q on q.id = r.id
	 where r.code_cm1 is not null
	   and (q.classification_node_id is distinct from r.noeud
	        or q.grades is distinct from array['CM1']
	        or q.status is distinct from 'published'
	        or coalesce((select array_agg(t.point_id) from public.question_template_points t
	                      where t.template_id = r.id), '{}') <> array[r.point_cm1]);
	if v_repris <> 0 then
		raise exception 'modèles du CM1 changés depuis le relevé (nœud, niveaux, statut ou tags) : %', v_repris;
	end if;
end $garde$;

-- ---- 4. Rangement (A), niveaux (B), puis tags CM2 -----------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qcm2l3_modeles r
 where q.id = r.id and r.code_cm1 is null;
update public.question_templates q set grades = array['CM1', 'CM2']
  from _qcm2l3_modeles r
 where q.id = r.id and r.code_cm1 is not null;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qcm2l3_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_ok integer;
begin
	select count(*) into v_presents from _qcm2l3_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_ok from _qcm2l3_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id = r.noeud
	   and q.grades = case when r.code_cm1 is null then array['CM2'] else array['CM1', 'CM2'] end
	   and (select array_agg(t.point_id order by t.point_id) from public.question_template_points t
	         where t.template_id = r.id)
	       = (select array_agg(x order by x) from unnest(array[r.point_id, r.point_cm1]) x where x is not null);
	if v_ok <> v_presents then
		raise exception 'lot incohérent : % modèle(s) conformes sur %', v_ok, v_presents;
	end if;
end $check$;

drop table _qcm2l3_modeles;
