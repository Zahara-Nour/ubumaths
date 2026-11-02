-- ============================================================================
-- Chantier « questions-1spe-analyse », lots A et B : nœud et tags de 9 modèles neufs, tags et
-- niveaux de 7d6cf480 (seconde, publié)
-- ============================================================================
-- Modèles neufs (brouillons), chacun sur le nœud de son point :
--   - db7bb314 (factoriser un trinôme quand c'est possible) → 1SPE-385, « Fonctions > Second degré > formes » ;
--   - aab8e41c (polynôme s'annulant en deux réels donnés) → 1SPE-252, « Fonctions > Second degré > racines » ;
--   - afe51ac4 (signe d'un trinôme sous forme factorisée) → 1SPE-251, « Fonctions > Second degré > signe » ;
--   - 5a132ffc (courbe de t ↦ e^(−kt)) → 1SPE-296, « Fonctions > Fonction exponentielle > courbe » ;
--   - a2852ea5 (courbe de t ↦ e^(kt)) → 1SPE-407, « Fonctions > Fonction exponentielle > courbe » ;
--   - aae5c0fc (le cercle trigonométrique) → 1SPE-303, « Fonctions > Fonctions trigonométriques > cercle et radians » ;
--   - ac9b1868 (longueur d'un arc) → 1SPE-408, même nœud ;
--   - 558c31a7 (placer un point sur le cercle) → 1SPE-306, même nœud ;
--   - 33dffa7a (signe d'une fonction lu sur sa courbe) → 1SPE-432, 1GEN-062, 1TECHNO-139 (points
--     jumeaux, même libellé, même nœud), « Fonctions > Généralités sur les fonctions > signe ». Ses
--     niveaux `1_SPE`, `1_GEN`, `1_TECHNO` ont été écrits à la création.
-- Modèle existant (publié, seconde, déjà rangé et tagué 2-313) :
--   - 7d6cf480 (pente d'une droite passant par deux points) : + 1SPE-434, 1GEN-064, 1TECHNO-141
--     (points du même nœud, « Fonctions > Fonctions affines > coefficient directeur et ordonnée à
--     l'origine »), et niveaux {2} → {2, 1_SPE, 1_GEN, 1_TECHNO} (le cahier de texte filtre les
--     modèles par niveau, par égalité). Nœud, tag 2-313 et contenu inchangés.
-- Au plus un point par programme et par modèle (ADR 0020). Ni le contenu ni le statut ne changent :
-- `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décisions de David le 2026-11-02 (journal docs/wip/questions-1spe-analyse-progress.md, phase 0 :
-- Q5 points jumeaux sur B4, Q6 (a) 7d6cf480 tagué et ouvert aux niveaux de 1re). Les 9 brouillons
-- ont été créés le 2026-11-02 par scripts/create-questions.ts (lancé par David), qui ne pose ni
-- nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (10 modèles). Elle est prouvée par
-- tests/integration/questions-1spe-analyse-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (état relevé) puis rejoue CE fichier.
--
-- Garde (relevé MCP du 2026-11-02) : les 9 neufs doivent être encore en BROUILLON, SANS nœud et
-- SANS aucun tag, aux niveaux relevés ; 7d6cf480 encore PUBLIÉ, sur son nœud, aux niveaux {2}, et
-- portant EXACTEMENT le tag 2-313. Sinon une saisie faite depuis serait écrasée. Nœuds désignés par
-- leur chemin, points par leur code, résolus STRICTEMENT ; chaque point doit être sur le nœud de
-- son modèle.
--
-- Données d'élèves : aucune n'est modifiée (les 9 neufs sont des brouillons ; pour 7d6cf480, seuls
-- des tags et des niveaux s'ajoutent, ses cartes et tentatives ne sont pas touchées).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David en phase 0, AVANT le SQL,
-- tranchée par lui le 2026-11-02 : personne). Aucune règle ne change. Effets visibles : les 9
-- brouillons apparaissent sous leur nœud et sous leurs points dans l'admin ; 7d6cf480 compte pour
-- 1SPE-434, 1GEN-064, 1TECHNO-141 et apparaît aux classes de 1re dans le cahier de texte.
--
-- Rollback (aucune donnée d'élève). Il retire les 14 tags posés, rend les 9 modèles sans nœud et
-- 7d6cf480 à ses niveaux {2}. Garde : il refuse si un modèle n'est plus EXACTEMENT dans l'état
-- posé par la migration. Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._q1ar_tags;
-- create temporary table _q1ar_tags (id uuid not null, grade text not null, code text not null, pose boolean not null, point uuid, primary key (id, code));
-- insert into _q1ar_tags (id, grade, code, pose) values
-- 	('db7bb314-7e6a-41e8-86e8-2f38a2a71f72', '1_SPE', '1SPE-385', true),
-- 	('aab8e41c-4539-4c90-9c1d-6ee41dc7a1cb', '1_SPE', '1SPE-252', true),
-- 	('afe51ac4-8552-454e-b45e-46f0edbd9416', '1_SPE', '1SPE-251', true),
-- 	('5a132ffc-86bd-4db2-9e06-954e49da0da3', '1_SPE', '1SPE-296', true),
-- 	('a2852ea5-ce64-4010-805b-d00874605510', '1_SPE', '1SPE-407', true),
-- 	('aae5c0fc-e220-4958-9604-01f110b6fecf', '1_SPE', '1SPE-303', true),
-- 	('ac9b1868-c019-42c3-a5fe-4b2952cce654', '1_SPE', '1SPE-408', true),
-- 	('558c31a7-cbf0-4f7f-b282-2ada6a64c9f3', '1_SPE', '1SPE-306', true),
-- 	('33dffa7a-8523-440e-99fe-304df3ced8b3', '1_SPE', '1SPE-432', true),
-- 	('33dffa7a-8523-440e-99fe-304df3ced8b3', '1_GEN', '1GEN-062', true),
-- 	('33dffa7a-8523-440e-99fe-304df3ced8b3', '1_TECHNO', '1TECHNO-139', true),
-- 	('7d6cf480-b062-4e45-a593-2e85fbeb28b3', '2', '2-313', false),
-- 	('7d6cf480-b062-4e45-a593-2e85fbeb28b3', '1_SPE', '1SPE-434', true),
-- 	('7d6cf480-b062-4e45-a593-2e85fbeb28b3', '1_GEN', '1GEN-064', true),
-- 	('7d6cf480-b062-4e45-a593-2e85fbeb28b3', '1_TECHNO', '1TECHNO-141', true);
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from (select distinct id from _q1ar_tags) r order by id;
-- select 1 from public.question_templates where id in (select id from _q1ar_tags) order by id for update;
-- do $rollback$
-- declare v_presents integer; v_conformes integer; v_total integer; v_attendus integer;
-- begin
-- 	select count(*) into v_presents from public.question_templates where id in (select id from _q1ar_tags);
-- 	if v_presents = 0 then
-- 		return;
-- 	end if;
-- 	if v_presents <> 10 then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 10', v_presents;
-- 	end if;
-- 	update _q1ar_tags t set point = p.id from public.curriculum_points p
-- 	 where p.grade = t.grade and p.code = t.code and p.archived_at is null;
-- 	if exists (select 1 from _q1ar_tags where point is null) then
-- 		raise exception 'rollback : points introuvables : %', (select count(*) from _q1ar_tags where point is null);
-- 	end if;
-- 	select count(*) into v_conformes from public.question_templates q
-- 	 where (q.id = '7d6cf480-b062-4e45-a593-2e85fbeb28b3' and q.status = 'published'
-- 	        and q.grades = array['2', '1_SPE', '1_GEN', '1_TECHNO'])
-- 	    or (q.id in (select id from _q1ar_tags where id <> '7d6cf480-b062-4e45-a593-2e85fbeb28b3')
-- 	        and q.status = 'draft'
-- 	        and q.classification_node_id = (select p.node_id from _q1ar_tags t join public.curriculum_points p on p.id = t.point
-- 	                                         where t.id = q.id and t.grade = '1_SPE'));
-- 	select count(*), count(*) filter (where exists (select 1 from _q1ar_tags t where t.id = q.template_id and t.point = q.point_id))
-- 	  into v_total, v_attendus
-- 	  from public.question_template_points q where q.template_id in (select id from _q1ar_tags);
-- 	if v_conformes <> 10 or v_total <> 15 or v_attendus <> 15 then
-- 		raise exception 'rollback : modèles changés depuis la migration (% sur 10 conformes, % tag(s) dont % attendus sur 15)',
-- 			v_conformes, v_total, v_attendus;
-- 	end if;
-- 	delete from public.question_template_points q using _q1ar_tags t
-- 	 where t.pose and q.template_id = t.id and q.point_id = t.point;
-- 	alter table public.question_templates disable trigger update_question_templates_updated_at;
-- 	update public.question_templates set classification_node_id = null
-- 	 where id in (select id from _q1ar_tags where id <> '7d6cf480-b062-4e45-a593-2e85fbeb28b3');
-- 	update public.question_templates set grades = array['2']
-- 	 where id = '7d6cf480-b062-4e45-a593-2e85fbeb28b3';
-- 	alter table public.question_templates enable trigger update_question_templates_updated_at;
-- end $rollback$;
-- drop table _q1ar_tags;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires ------------------------------------------------
drop table if exists pg_temp._q1a_modeles;
create temporary table _q1a_modeles (
	id uuid primary key,
	chemin text not null,
	statut text not null,
	-- Le modèle est-il neuf (sans nœud ni tag au relevé) ?
	neuf boolean not null,
	grades_avant text[] not null,
	grades_apres text[] not null
);
insert into _q1a_modeles values
	('db7bb314-7e6a-41e8-86e8-2f38a2a71f72', 'Fonctions > Second degré > formes', 'draft', true, array['1_SPE'], array['1_SPE']),
	('aab8e41c-4539-4c90-9c1d-6ee41dc7a1cb', 'Fonctions > Second degré > racines', 'draft', true, array['1_SPE'], array['1_SPE']),
	('afe51ac4-8552-454e-b45e-46f0edbd9416', 'Fonctions > Second degré > signe', 'draft', true, array['1_SPE'], array['1_SPE']),
	('5a132ffc-86bd-4db2-9e06-954e49da0da3', 'Fonctions > Fonction exponentielle > courbe', 'draft', true, array['1_SPE'], array['1_SPE']),
	('a2852ea5-ce64-4010-805b-d00874605510', 'Fonctions > Fonction exponentielle > courbe', 'draft', true, array['1_SPE'], array['1_SPE']),
	('aae5c0fc-e220-4958-9604-01f110b6fecf', 'Fonctions > Fonctions trigonométriques > cercle et radians', 'draft', true, array['1_SPE'], array['1_SPE']),
	('ac9b1868-c019-42c3-a5fe-4b2952cce654', 'Fonctions > Fonctions trigonométriques > cercle et radians', 'draft', true, array['1_SPE'], array['1_SPE']),
	('558c31a7-cbf0-4f7f-b282-2ada6a64c9f3', 'Fonctions > Fonctions trigonométriques > cercle et radians', 'draft', true, array['1_SPE'], array['1_SPE']),
	('33dffa7a-8523-440e-99fe-304df3ced8b3', 'Fonctions > Généralités sur les fonctions > signe', 'draft', true,
	 array['1_SPE', '1_GEN', '1_TECHNO'], array['1_SPE', '1_GEN', '1_TECHNO']),
	('7d6cf480-b062-4e45-a593-2e85fbeb28b3', 'Fonctions > Fonctions affines > coefficient directeur et ordonnée à l''origine', 'published', false,
	 array['2'], array['2', '1_SPE', '1_GEN', '1_TECHNO']);

-- Tags visés, un par ligne ; `releve` = déjà posé au relevé (gardé tel quel).
drop table if exists pg_temp._q1a_tags;
create temporary table _q1a_tags (
	id uuid not null,
	grade text not null,
	code text not null,
	releve boolean not null,
	primary key (id, code)
);
insert into _q1a_tags values
	('db7bb314-7e6a-41e8-86e8-2f38a2a71f72', '1_SPE', '1SPE-385', false),
	('aab8e41c-4539-4c90-9c1d-6ee41dc7a1cb', '1_SPE', '1SPE-252', false),
	('afe51ac4-8552-454e-b45e-46f0edbd9416', '1_SPE', '1SPE-251', false),
	('5a132ffc-86bd-4db2-9e06-954e49da0da3', '1_SPE', '1SPE-296', false),
	('a2852ea5-ce64-4010-805b-d00874605510', '1_SPE', '1SPE-407', false),
	('aae5c0fc-e220-4958-9604-01f110b6fecf', '1_SPE', '1SPE-303', false),
	('ac9b1868-c019-42c3-a5fe-4b2952cce654', '1_SPE', '1SPE-408', false),
	('558c31a7-cbf0-4f7f-b282-2ada6a64c9f3', '1_SPE', '1SPE-306', false),
	('33dffa7a-8523-440e-99fe-304df3ced8b3', '1_SPE', '1SPE-432', false),
	('33dffa7a-8523-440e-99fe-304df3ced8b3', '1_GEN', '1GEN-062', false),
	('33dffa7a-8523-440e-99fe-304df3ced8b3', '1_TECHNO', '1TECHNO-139', false),
	('7d6cf480-b062-4e45-a593-2e85fbeb28b3', '2', '2-313', true),
	('7d6cf480-b062-4e45-a593-2e85fbeb28b3', '1_SPE', '1SPE-434', false),
	('7d6cf480-b062-4e45-a593-2e85fbeb28b3', '1_GEN', '1GEN-064', false),
	('7d6cf480-b062-4e45-a593-2e85fbeb28b3', '1_TECHNO', '1TECHNO-141', false);

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q1a_modeles order by id;
select 1 from public.question_templates where id in (select id from _q1a_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Chemin complet de chaque nœud non archivé (ancêtres non archivés compris).
drop table if exists pg_temp._q1a_chemins;
create temporary table _q1a_chemins as
with recursive c(id, chemin) as (
	select n.id, n.name::text from public.classification_nodes n
	 where n.parent_id is null and n.archived_at is null
	union all
	select n.id, c.chemin || ' > ' || n.name
	  from public.classification_nodes n join c on n.parent_id = c.id
	 where n.archived_at is null
)
select id, chemin from c;

alter table _q1a_modeles add column noeud uuid;
update _q1a_modeles r set noeud = (select c.id from _q1a_chemins c where c.chemin = r.chemin)
 where (select count(*) from _q1a_chemins c where c.chemin = r.chemin) = 1;

-- Le point doit être sur le nœud de son modèle.
alter table _q1a_tags add column point uuid;
update _q1a_tags t set point = p.id
  from public.curriculum_points p, _q1a_modeles r
 where r.id = t.id and p.grade = t.grade and p.code = t.code and p.archived_at is null
   and p.node_id = r.noeud;

-- ---- 3. Gardes : présence TOUT ou RIEN, état du relevé ----------------------------------
do $garde$
declare v_presents integer; v_conformes integer; v_total integer; v_releve integer; v_attendus integer;
begin
	select count(*) into v_presents from _q1a_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	if v_presents <> 10 then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 10', v_presents;
	end if;
	if exists (select 1 from _q1a_modeles where noeud is null) or exists (select 1 from _q1a_tags where point is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _q1a_modeles where noeud is null),
			(select count(*) from _q1a_tags where point is null);
	end if;
	-- Neufs : sans nœud ; existant : sur son nœud. Statut et niveaux du relevé.
	select count(*) into v_conformes from _q1a_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.status = r.statut and q.grades = r.grades_avant
	   and ((r.neuf and q.classification_node_id is null)
	        or (not r.neuf and q.classification_node_id = r.noeud));
	if v_conformes <> 10 then
		raise exception 'modèles changés depuis le relevé (statut, nœud ou niveaux) : % sur 10 conformes', v_conformes;
	end if;
	select count(*), count(*) filter (where exists (select 1 from _q1a_tags t
	                                               where t.releve and t.id = q.template_id and t.point = q.point_id))
	  into v_total, v_releve
	  from public.question_template_points q
	  join _q1a_modeles r on r.id = q.template_id;
	select count(*) into v_attendus from _q1a_tags where releve;
	if v_total <> v_attendus or v_releve <> v_attendus then
		raise exception 'tags différents du relevé : % tag(s) dont % du relevé, attendus %', v_total, v_releve, v_attendus;
	end if;
end $garde$;

-- ---- 4. Rangement, niveaux, puis tags --------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q1a_modeles r
 where q.id = r.id and r.neuf;
update public.question_templates q set grades = r.grades_apres
  from _q1a_modeles r
 where q.id = r.id and r.grades_apres is distinct from r.grades_avant;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.id, t.point
  from _q1a_tags t
  join public.question_templates q on q.id = t.id
 where not t.releve;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_conformes integer; v_total integer; v_tags integer; v_attendus integer;
begin
	select count(*) into v_presents from _q1a_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	select count(*) into v_conformes from _q1a_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.status = r.statut and q.classification_node_id = r.noeud and q.grades = r.grades_apres;
	select count(*), count(*) filter (where exists (select 1 from _q1a_tags t
	                                               where t.id = q.template_id and t.point = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q1a_modeles r on r.id = q.template_id;
	select count(*) into v_attendus from _q1a_tags;
	if v_conformes <> 10 or v_tags <> v_attendus or v_total <> v_attendus then
		raise exception 'lot incohérent : modèles conformes %/10, tags du lot %/%, tags en base %',
			v_conformes, v_tags, v_attendus, v_total;
	end if;
end $check$;

drop table _q1a_chemins;
drop table _q1a_tags;
drop table _q1a_modeles;
