-- ============================================================================
-- Chantier « questions-cm1 », lot 0 (corrections) : niveaux, nœuds, statut et tags de 24 modèles
-- ============================================================================
--   - 9 modèles relèvent d'un point du CM2 (e38d205a, 19323604 → CM2-042 ; 32724446, 6379fa20 →
--     CM2-117 ; 4643ed4a → CM2-046 ; e320755f, 8fa3108c → CM2-021 ; a0241952, ff3ee576 → CM2-044) :
--     niveaux [CM1] → [CM2], tag posé, nœud gardé ;
--   - aa788ca7, ac2dae38, a5d5a7a0 (multiplications à trou) : niveaux [CM1] → [CM2], tag CM2-065,
--     sur le nœud de leur point (« Algèbre > Premiers pas algébriques > égalités à trous ») ;
--   - 6a16303a, 7d57fb3b (différences de décimaux) → 6-198, 0a93ac99, 08bbf1c6 (regroupements) →
--     6-114 : niveaux [CM1] → [6], tag posé, nœud gardé ;
--   - 5d4dfd32, fe9df9ba, 08fbcd26, 17a3c039, 61baef92, 09f22a2f, 4ee04b22, cda36cc2 (aucun point
--     du CP à la 6e) : repassés en BROUILLON, niveau CM1 gardé, sans tag. Jamais supprimés.
-- Bilan : 16 niveaux changés, 3 déplacements (R2 : le point vit ailleurs ; sans quoi
-- question_template_points_check_rules refuse le tag), 16 tags posés, 8 brouillons. Le
-- contenu ne change pas ici (les 2 modèles réécrits sont dans 20261028100000_questions_cm1_contenu
-- et ne figurent pas dans celle-ci) : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décisions de David le 2026-10-28 (journal docs/wip/questions-cm1-progress.md § 5). Fichier GÉNÉRÉ
-- par docs/wip/questions/lot-rangement-cm1.py (relevé de la prod du 2026-10-28) — ne pas éditer à
-- la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (24 modèles). Elle est prouvée
-- par tests/integration/questions-cm1-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (nœud, niveaux, statut et tags d'avant) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore au nœud, aux niveaux et au statut relevés le 2026-10-28, et
-- porter EXACTEMENT les tags relevés (aucun) : sinon une saisie faite depuis serait écrasée ou
-- contredite. Les nœuds sont désignés par leur chemin, résolu STRICTEMENT.
--
-- Données d'élèves (MCP, 2026-10-28) : aucune sur ces modèles (0 carte SRS, 0 tentative de
-- compétence ou d'évaluation, 0 réponse de test, 0 activité de journal, 0 exercice, série ou fiche
-- de chapitre, 0 favori).
--
-- Accès (question tranchée par David le 2026-10-28) : personne ne gagne de lecture. Les 16 modèles
-- qui changent de niveau restent publiés : ils apparaissent au CM2 ou en 6e au lieu du CM1. Les 8
-- brouillons quittent le catalogue (admin seul). Aucune règle (policy) ne change.
--
-- Rollback (aucune donnée d'élève). Il retire les 16 tags posés, rend aux modèles leur nœud, leurs
-- niveaux et leur statut d'avant. Garde : il refuse si un modèle n'a plus EXACTEMENT le nœud, les
-- niveaux, le statut et les tags laissés par la migration (sinon une saisie faite depuis serait
-- écrasée en silence). Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._qcm1r_retour_noeuds;
-- drop table if exists pg_temp._qcm1r_retour_tags;
-- drop table if exists pg_temp._qcm1r_retour;
-- create temporary table _qcm1r_retour (
-- 	id uuid primary key,
-- 	avant_branche text not null, avant_notion text not null, avant_sous_notion text,
-- 	apres_branche text not null, apres_notion text not null, apres_sous_notion text,
-- 	grades_avant text[] not null, grades_apres text[] not null,
-- 	statut_avant text not null, statut_apres text not null
-- );
-- insert into _qcm1r_retour values
-- 	('08bbf1c6-d96c-4570-8662-4908dd5cb8ef', 'Nombres et calculs', 'Décimaux : calculs', 'addition',
-- 	 'Nombres et calculs', 'Décimaux : calculs', 'addition', array['CM1'], array['6'], 'published', 'published'),
-- 	('08fbcd26-6068-47cc-8384-8aeed96c6a78', 'Nombres et calculs', 'Entiers : addition et soustraction', 'calcul astucieux',
-- 	 'Nombres et calculs', 'Entiers : addition et soustraction', 'calcul astucieux', array['CM1'], array['CM1'], 'published', 'draft'),
-- 	('09f22a2f-9a2d-404a-b0b4-be00046b3d49', 'Nombres et calculs', 'Entiers : division', 'quotient',
-- 	 'Nombres et calculs', 'Entiers : division', 'quotient', array['CM1'], array['CM1'], 'published', 'draft'),
-- 	('0a93ac99-aa32-4471-9ce2-7180278d737b', 'Nombres et calculs', 'Décimaux : calculs', 'addition',
-- 	 'Nombres et calculs', 'Décimaux : calculs', 'addition', array['CM1'], array['6'], 'published', 'published'),
-- 	('17a3c039-744d-4108-9b47-49f0183990b7', 'Nombres et calculs', 'Entiers : addition et soustraction', 'complément',
-- 	 'Nombres et calculs', 'Entiers : addition et soustraction', 'complément', array['CM1'], array['CM1'], 'published', 'draft'),
-- 	('19323604-1e27-4b0f-8a24-1eef76ab6e59', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
-- 	 'Nombres et calculs', 'Décimaux : calculs', 'multiplication', array['CM1'], array['CM2'], 'published', 'published'),
-- 	('32724446-558b-4eea-ad4a-13d7c6afe435', 'Nombres et calculs', 'Décimaux : numération', 'encadrement',
-- 	 'Nombres et calculs', 'Décimaux : numération', 'encadrement', array['CM1'], array['CM2'], 'published', 'published'),
-- 	('4643ed4a-4cb9-456f-bc7b-a36c99b8290a', 'Nombres et calculs', 'Entiers : multiplication', 'calcul astucieux',
-- 	 'Nombres et calculs', 'Entiers : multiplication', 'calcul astucieux', array['CM1'], array['CM2'], 'published', 'published'),
-- 	('4ee04b22-c7c3-42a7-8cbf-26022ffbbc28', 'Nombres et calculs', 'Entiers : division', 'quotient',
-- 	 'Nombres et calculs', 'Entiers : division', 'quotient', array['CM1'], array['CM1'], 'published', 'draft'),
-- 	('5d4dfd32-bc56-49a5-827c-7233881a68ad', 'Nombres et calculs', 'Entiers : addition et soustraction', 'calcul astucieux',
-- 	 'Nombres et calculs', 'Entiers : addition et soustraction', 'calcul astucieux', array['CM1'], array['CM1'], 'published', 'draft'),
-- 	('61baef92-f8ff-4641-91f3-74ce63f04232', 'Nombres et calculs', 'Entiers : division', 'quotient',
-- 	 'Nombres et calculs', 'Entiers : division', 'quotient', array['CM1'], array['CM1'], 'published', 'draft'),
-- 	('6379fa20-672c-4771-9d48-6d167a7a922e', 'Nombres et calculs', 'Décimaux : numération', 'encadrement',
-- 	 'Nombres et calculs', 'Décimaux : numération', 'encadrement', array['CM1'], array['CM2'], 'published', 'published'),
-- 	('6a16303a-acb1-46c4-aed2-ebae62cb5c32', 'Nombres et calculs', 'Décimaux : calculs', 'soustraction',
-- 	 'Nombres et calculs', 'Décimaux : calculs', 'soustraction', array['CM1'], array['6'], 'published', 'published'),
-- 	('7d57fb3b-a050-4920-8231-e5ac609fa07d', 'Nombres et calculs', 'Décimaux : calculs', 'soustraction',
-- 	 'Nombres et calculs', 'Décimaux : calculs', 'soustraction', array['CM1'], array['6'], 'published', 'published'),
-- 	('8fa3108c-692b-45d1-ac2a-7d4cb8cbf798', 'Nombres et calculs', 'Fractions : calculs', 'multiplication',
-- 	 'Nombres et calculs', 'Fractions : calculs', 'multiplication', array['CM1'], array['CM2'], 'published', 'published'),
-- 	('a0241952-7930-4e8a-aa6c-2a5b8bef664a', 'Nombres et calculs', 'Décimaux : calculs', 'addition',
-- 	 'Nombres et calculs', 'Décimaux : calculs', 'addition', array['CM1'], array['CM2'], 'published', 'published'),
-- 	('a5d5a7a0-2b7f-4174-a487-4c673fee5eeb', 'Nombres et calculs', 'Entiers : multiplication', 'calcul astucieux',
-- 	 'Algèbre', 'Premiers pas algébriques', 'égalités à trous', array['CM1'], array['CM2'], 'published', 'published'),
-- 	('aa788ca7-bb32-45a3-9566-cc2d70a11d29', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
-- 	 'Algèbre', 'Premiers pas algébriques', 'égalités à trous', array['CM1'], array['CM2'], 'published', 'published'),
-- 	('ac2dae38-425e-4f10-ba6a-045c285355d0', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
-- 	 'Algèbre', 'Premiers pas algébriques', 'égalités à trous', array['CM1'], array['CM2'], 'published', 'published'),
-- 	('cda36cc2-7d9c-4340-99f0-143467c83786', 'Nombres et calculs', 'Entiers : numération', 'écritures',
-- 	 'Nombres et calculs', 'Entiers : numération', 'écritures', array['CM1'], array['CM1'], 'published', 'draft'),
-- 	('e320755f-fa1d-4230-9997-c5917e1c56ef', 'Nombres et calculs', 'Fractions : calculs', 'multiplication',
-- 	 'Nombres et calculs', 'Fractions : calculs', 'multiplication', array['CM1'], array['CM2'], 'published', 'published'),
-- 	('e38d205a-5737-4a0a-a9cd-aab742107c2b', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
-- 	 'Nombres et calculs', 'Décimaux : calculs', 'multiplication', array['CM1'], array['CM2'], 'published', 'published'),
-- 	('fe9df9ba-2017-4027-b678-bae8196c3651', 'Nombres et calculs', 'Entiers : addition et soustraction', 'calcul astucieux',
-- 	 'Nombres et calculs', 'Entiers : addition et soustraction', 'calcul astucieux', array['CM1'], array['CM1'], 'published', 'draft'),
-- 	('ff3ee576-e032-4c82-a428-9f49f046c313', 'Nombres et calculs', 'Décimaux : calculs', 'addition',
-- 	 'Nombres et calculs', 'Décimaux : calculs', 'addition', array['CM1'], array['CM2'], 'published', 'published');
-- create temporary table _qcm1r_retour_tags (template_id uuid not null, grade text not null, code text not null, avant boolean not null, apres boolean not null);
-- insert into _qcm1r_retour_tags values
-- 	('08bbf1c6-d96c-4570-8662-4908dd5cb8ef', '6', '6-114', false, true),
-- 	('0a93ac99-aa32-4471-9ce2-7180278d737b', '6', '6-114', false, true),
-- 	('19323604-1e27-4b0f-8a24-1eef76ab6e59', 'CM2', 'CM2-042', false, true),
-- 	('32724446-558b-4eea-ad4a-13d7c6afe435', 'CM2', 'CM2-117', false, true),
-- 	('4643ed4a-4cb9-456f-bc7b-a36c99b8290a', 'CM2', 'CM2-046', false, true),
-- 	('6379fa20-672c-4771-9d48-6d167a7a922e', 'CM2', 'CM2-117', false, true),
-- 	('6a16303a-acb1-46c4-aed2-ebae62cb5c32', '6', '6-198', false, true),
-- 	('7d57fb3b-a050-4920-8231-e5ac609fa07d', '6', '6-198', false, true),
-- 	('8fa3108c-692b-45d1-ac2a-7d4cb8cbf798', 'CM2', 'CM2-021', false, true),
-- 	('a0241952-7930-4e8a-aa6c-2a5b8bef664a', 'CM2', 'CM2-044', false, true),
-- 	('a5d5a7a0-2b7f-4174-a487-4c673fee5eeb', 'CM2', 'CM2-065', false, true),
-- 	('aa788ca7-bb32-45a3-9566-cc2d70a11d29', 'CM2', 'CM2-065', false, true),
-- 	('ac2dae38-425e-4f10-ba6a-045c285355d0', 'CM2', 'CM2-065', false, true),
-- 	('e320755f-fa1d-4230-9997-c5917e1c56ef', 'CM2', 'CM2-021', false, true),
-- 	('e38d205a-5737-4a0a-a9cd-aab742107c2b', 'CM2', 'CM2-042', false, true),
-- 	('ff3ee576-e032-4c82-a428-9f49f046c313', 'CM2', 'CM2-044', false, true);
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _qcm1r_retour order by id;
-- select 1 from public.question_templates where id in (select id from _qcm1r_retour) order by id for update;
-- create temporary table _qcm1r_retour_noeuds as
-- 	select r.id,
-- 	       case when r.avant_sous_notion is null then an.id else asn.id end as avant,
-- 	       case when r.apres_sous_notion is null then pn.id else psn.id end as apres
-- 	  from _qcm1r_retour r
-- 	  left join public.classification_nodes ab on ab.kind = 'branch' and ab.parent_id is null and ab.archived_at is null and ab.name = r.avant_branche
-- 	  left join public.classification_nodes an on an.kind = 'notion' and an.parent_id = ab.id and an.archived_at is null and an.name = r.avant_notion
-- 	  left join public.classification_nodes asn on asn.kind = 'subnotion' and asn.parent_id = an.id and asn.archived_at is null and asn.name = r.avant_sous_notion
-- 	  left join public.classification_nodes pb on pb.kind = 'branch' and pb.parent_id is null and pb.archived_at is null and pb.name = r.apres_branche
-- 	  left join public.classification_nodes pn on pn.kind = 'notion' and pn.parent_id = pb.id and pn.archived_at is null and pn.name = r.apres_notion
-- 	  left join public.classification_nodes psn on psn.kind = 'subnotion' and psn.parent_id = pn.id and psn.archived_at is null and psn.name = r.apres_sous_notion;
-- -- Clé : deux nœuds homonymes sous un même parent dupliqueraient les lignes et feraient échouer ici.
-- alter table _qcm1r_retour_noeuds add primary key (id);
-- alter table _qcm1r_retour_tags add column point_id uuid;
-- update _qcm1r_retour_tags t set point_id = p.id
--   from public.curriculum_points p
--  where p.grade = t.grade and p.code = t.code and p.archived_at is null;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer;
-- begin
-- 	if exists (select 1 from _qcm1r_retour_noeuds where avant is null or apres is null)
-- 	   or exists (select 1 from _qcm1r_retour_tags where point_id is null) then
-- 		raise exception 'rollback : chemins ou points introuvables';
-- 	end if;
-- 	select count(*), count(*) filter (where q.grades = r.grades_apres and q.status = r.statut_apres
-- 	                                     and q.classification_node_id = x.apres)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q
-- 	  join _qcm1r_retour r on r.id = q.id
-- 	  join _qcm1r_retour_noeuds x on x.id = q.id;
-- 	if v_presents not in (0, 24) then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 24', v_presents;
-- 	end if;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur % ont encore le nœud, les niveaux et le statut de la migration', v_intacts, v_presents;
-- 	end if;
-- 	-- Tags : exactement les 16 laissés par la migration (posés et gardés), rien d'autre (tout niveau).
-- 	select count(*), count(*) filter (where exists (select 1 from _qcm1r_retour_tags t
-- 	                                                where t.apres and t.template_id = q.template_id and t.point_id = q.point_id))
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join _qcm1r_retour r on r.id = q.template_id;
-- 	if v_tags <> v_total or v_total <> least(v_presents, 1) * 16 then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, least(v_presents, 1) * 16;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using _qcm1r_retour_tags t
--  where t.apres and not t.avant and q.template_id = t.template_id and q.point_id = t.point_id;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates q
--    set classification_node_id = x.avant, grades = r.grades_avant, status = r.statut_avant
--   from _qcm1r_retour r join _qcm1r_retour_noeuds x on x.id = r.id
--  where q.id = r.id;
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- insert into public.question_template_points (template_id, point_id)
-- select t.template_id, t.point_id
--   from _qcm1r_retour_tags t
--   join public.question_templates q on q.id = t.template_id
--  where t.avant and not t.apres;
-- do $retour$
-- declare v_presents integer; v_total integer; v_reposes integer;
-- begin
-- 	select count(*) into v_presents from _qcm1r_retour r join public.question_templates q on q.id = r.id;
-- 	select count(*), count(*) filter (where exists (select 1 from _qcm1r_retour_tags t
-- 	                                                where t.avant and t.template_id = q.template_id and t.point_id = q.point_id))
-- 	  into v_total, v_reposes
-- 	  from public.question_template_points q
-- 	  join _qcm1r_retour r on r.id = q.template_id;
-- 	if v_reposes <> v_total or v_total <> least(v_presents, 1) * 0 then
-- 		raise exception 'rollback : % tag(s) reposé(s) sur %, attendus %', v_reposes, v_total, least(v_presents, 1) * 0;
-- 	end if;
-- end $retour$;
-- drop table _qcm1r_retour_noeuds;
-- drop table _qcm1r_retour_tags;
-- drop table _qcm1r_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires ----------------------------------------------
drop table if exists pg_temp._qcm1r_modeles;
drop table if exists pg_temp._qcm1r_tags;
create temporary table _qcm1r_modeles (
	id uuid primary key,
	avant_branche text not null, avant_notion text not null, avant_sous_notion text,
	apres_branche text not null, apres_notion text not null, apres_sous_notion text,
	grades_avant text[] not null,
	grades_apres text[] not null,
	statut_avant text not null,
	statut_apres text not null
);
create temporary table _qcm1r_tags (
	template_id uuid not null,
	grade text not null,
	code text not null,
	avant boolean not null,
	apres boolean not null,
	primary key (template_id, grade, code)
);
insert into _qcm1r_modeles values
	('08bbf1c6-d96c-4570-8662-4908dd5cb8ef', 'Nombres et calculs', 'Décimaux : calculs', 'addition',
	 'Nombres et calculs', 'Décimaux : calculs', 'addition', array['CM1'], array['6'], 'published', 'published'),
	('08fbcd26-6068-47cc-8384-8aeed96c6a78', 'Nombres et calculs', 'Entiers : addition et soustraction', 'calcul astucieux',
	 'Nombres et calculs', 'Entiers : addition et soustraction', 'calcul astucieux', array['CM1'], array['CM1'], 'published', 'draft'),
	('09f22a2f-9a2d-404a-b0b4-be00046b3d49', 'Nombres et calculs', 'Entiers : division', 'quotient',
	 'Nombres et calculs', 'Entiers : division', 'quotient', array['CM1'], array['CM1'], 'published', 'draft'),
	('0a93ac99-aa32-4471-9ce2-7180278d737b', 'Nombres et calculs', 'Décimaux : calculs', 'addition',
	 'Nombres et calculs', 'Décimaux : calculs', 'addition', array['CM1'], array['6'], 'published', 'published'),
	('17a3c039-744d-4108-9b47-49f0183990b7', 'Nombres et calculs', 'Entiers : addition et soustraction', 'complément',
	 'Nombres et calculs', 'Entiers : addition et soustraction', 'complément', array['CM1'], array['CM1'], 'published', 'draft'),
	('19323604-1e27-4b0f-8a24-1eef76ab6e59', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
	 'Nombres et calculs', 'Décimaux : calculs', 'multiplication', array['CM1'], array['CM2'], 'published', 'published'),
	('32724446-558b-4eea-ad4a-13d7c6afe435', 'Nombres et calculs', 'Décimaux : numération', 'encadrement',
	 'Nombres et calculs', 'Décimaux : numération', 'encadrement', array['CM1'], array['CM2'], 'published', 'published'),
	('4643ed4a-4cb9-456f-bc7b-a36c99b8290a', 'Nombres et calculs', 'Entiers : multiplication', 'calcul astucieux',
	 'Nombres et calculs', 'Entiers : multiplication', 'calcul astucieux', array['CM1'], array['CM2'], 'published', 'published'),
	('4ee04b22-c7c3-42a7-8cbf-26022ffbbc28', 'Nombres et calculs', 'Entiers : division', 'quotient',
	 'Nombres et calculs', 'Entiers : division', 'quotient', array['CM1'], array['CM1'], 'published', 'draft'),
	('5d4dfd32-bc56-49a5-827c-7233881a68ad', 'Nombres et calculs', 'Entiers : addition et soustraction', 'calcul astucieux',
	 'Nombres et calculs', 'Entiers : addition et soustraction', 'calcul astucieux', array['CM1'], array['CM1'], 'published', 'draft'),
	('61baef92-f8ff-4641-91f3-74ce63f04232', 'Nombres et calculs', 'Entiers : division', 'quotient',
	 'Nombres et calculs', 'Entiers : division', 'quotient', array['CM1'], array['CM1'], 'published', 'draft'),
	('6379fa20-672c-4771-9d48-6d167a7a922e', 'Nombres et calculs', 'Décimaux : numération', 'encadrement',
	 'Nombres et calculs', 'Décimaux : numération', 'encadrement', array['CM1'], array['CM2'], 'published', 'published'),
	('6a16303a-acb1-46c4-aed2-ebae62cb5c32', 'Nombres et calculs', 'Décimaux : calculs', 'soustraction',
	 'Nombres et calculs', 'Décimaux : calculs', 'soustraction', array['CM1'], array['6'], 'published', 'published'),
	('7d57fb3b-a050-4920-8231-e5ac609fa07d', 'Nombres et calculs', 'Décimaux : calculs', 'soustraction',
	 'Nombres et calculs', 'Décimaux : calculs', 'soustraction', array['CM1'], array['6'], 'published', 'published'),
	('8fa3108c-692b-45d1-ac2a-7d4cb8cbf798', 'Nombres et calculs', 'Fractions : calculs', 'multiplication',
	 'Nombres et calculs', 'Fractions : calculs', 'multiplication', array['CM1'], array['CM2'], 'published', 'published'),
	('a0241952-7930-4e8a-aa6c-2a5b8bef664a', 'Nombres et calculs', 'Décimaux : calculs', 'addition',
	 'Nombres et calculs', 'Décimaux : calculs', 'addition', array['CM1'], array['CM2'], 'published', 'published'),
	('a5d5a7a0-2b7f-4174-a487-4c673fee5eeb', 'Nombres et calculs', 'Entiers : multiplication', 'calcul astucieux',
	 'Algèbre', 'Premiers pas algébriques', 'égalités à trous', array['CM1'], array['CM2'], 'published', 'published'),
	('aa788ca7-bb32-45a3-9566-cc2d70a11d29', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
	 'Algèbre', 'Premiers pas algébriques', 'égalités à trous', array['CM1'], array['CM2'], 'published', 'published'),
	('ac2dae38-425e-4f10-ba6a-045c285355d0', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
	 'Algèbre', 'Premiers pas algébriques', 'égalités à trous', array['CM1'], array['CM2'], 'published', 'published'),
	('cda36cc2-7d9c-4340-99f0-143467c83786', 'Nombres et calculs', 'Entiers : numération', 'écritures',
	 'Nombres et calculs', 'Entiers : numération', 'écritures', array['CM1'], array['CM1'], 'published', 'draft'),
	('e320755f-fa1d-4230-9997-c5917e1c56ef', 'Nombres et calculs', 'Fractions : calculs', 'multiplication',
	 'Nombres et calculs', 'Fractions : calculs', 'multiplication', array['CM1'], array['CM2'], 'published', 'published'),
	('e38d205a-5737-4a0a-a9cd-aab742107c2b', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
	 'Nombres et calculs', 'Décimaux : calculs', 'multiplication', array['CM1'], array['CM2'], 'published', 'published'),
	('fe9df9ba-2017-4027-b678-bae8196c3651', 'Nombres et calculs', 'Entiers : addition et soustraction', 'calcul astucieux',
	 'Nombres et calculs', 'Entiers : addition et soustraction', 'calcul astucieux', array['CM1'], array['CM1'], 'published', 'draft'),
	('ff3ee576-e032-4c82-a428-9f49f046c313', 'Nombres et calculs', 'Décimaux : calculs', 'addition',
	 'Nombres et calculs', 'Décimaux : calculs', 'addition', array['CM1'], array['CM2'], 'published', 'published');
insert into _qcm1r_tags values
	('08bbf1c6-d96c-4570-8662-4908dd5cb8ef', '6', '6-114', false, true),
	('0a93ac99-aa32-4471-9ce2-7180278d737b', '6', '6-114', false, true),
	('19323604-1e27-4b0f-8a24-1eef76ab6e59', 'CM2', 'CM2-042', false, true),
	('32724446-558b-4eea-ad4a-13d7c6afe435', 'CM2', 'CM2-117', false, true),
	('4643ed4a-4cb9-456f-bc7b-a36c99b8290a', 'CM2', 'CM2-046', false, true),
	('6379fa20-672c-4771-9d48-6d167a7a922e', 'CM2', 'CM2-117', false, true),
	('6a16303a-acb1-46c4-aed2-ebae62cb5c32', '6', '6-198', false, true),
	('7d57fb3b-a050-4920-8231-e5ac609fa07d', '6', '6-198', false, true),
	('8fa3108c-692b-45d1-ac2a-7d4cb8cbf798', 'CM2', 'CM2-021', false, true),
	('a0241952-7930-4e8a-aa6c-2a5b8bef664a', 'CM2', 'CM2-044', false, true),
	('a5d5a7a0-2b7f-4174-a487-4c673fee5eeb', 'CM2', 'CM2-065', false, true),
	('aa788ca7-bb32-45a3-9566-cc2d70a11d29', 'CM2', 'CM2-065', false, true),
	('ac2dae38-425e-4f10-ba6a-045c285355d0', 'CM2', 'CM2-065', false, true),
	('e320755f-fa1d-4230-9997-c5917e1c56ef', 'CM2', 'CM2-021', false, true),
	('e38d205a-5737-4a0a-a9cd-aab742107c2b', 'CM2', 'CM2-042', false, true),
	('ff3ee576-e032-4c82-a428-9f49f046c313', 'CM2', 'CM2-044', false, true);

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qcm1r_modeles order by id;
select 1 from public.question_templates where id in (select id from _qcm1r_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
drop table if exists pg_temp._qcm1r_noeuds;
create temporary table _qcm1r_noeuds as
	select r.id,
	       case when r.avant_sous_notion is null then an.id else asn.id end as avant,
	       case when r.apres_sous_notion is null then pn.id else psn.id end as apres
	  from _qcm1r_modeles r
	  left join public.classification_nodes ab on ab.kind = 'branch' and ab.parent_id is null and ab.archived_at is null and ab.name = r.avant_branche
	  left join public.classification_nodes an on an.kind = 'notion' and an.parent_id = ab.id and an.archived_at is null and an.name = r.avant_notion
	  left join public.classification_nodes asn on asn.kind = 'subnotion' and asn.parent_id = an.id and asn.archived_at is null and asn.name = r.avant_sous_notion
	  left join public.classification_nodes pb on pb.kind = 'branch' and pb.parent_id is null and pb.archived_at is null and pb.name = r.apres_branche
	  left join public.classification_nodes pn on pn.kind = 'notion' and pn.parent_id = pb.id and pn.archived_at is null and pn.name = r.apres_notion
	  left join public.classification_nodes psn on psn.kind = 'subnotion' and psn.parent_id = pn.id and psn.archived_at is null and psn.name = r.apres_sous_notion;
-- Clé : deux nœuds homonymes sous un même parent dupliqueraient les lignes et feraient échouer ici.
alter table _qcm1r_noeuds add primary key (id);
alter table _qcm1r_tags add column point_id uuid;
update _qcm1r_tags t set point_id = p.id
  from public.curriculum_points p
 where p.grade = t.grade and p.code = t.code and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from _qcm1r_noeuds where avant is null or apres is null)
	   or exists (select 1 from _qcm1r_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s) de modèle, % point(s)',
			(select count(*) from _qcm1r_noeuds where avant is null or apres is null),
			(select count(*) from _qcm1r_tags where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, nœud, niveaux et statut relevés, tags EXACTEMENT relevés ---
do $garde$
declare v_presents integer; v_ecarts integer; v_niveaux integer; v_statuts integer; v_detail text;
begin
	select count(*) into v_presents from _qcm1r_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 24) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 24', v_presents;
	end if;
	select count(*) into v_ecarts from _qcm1r_noeuds x
	  join public.question_templates q on q.id = x.id
	 where q.classification_node_id is distinct from x.avant;
	if v_ecarts <> 0 then
		raise exception 'modèles déplacés depuis le relevé : %', v_ecarts;
	end if;
	select count(*) into v_niveaux from _qcm1r_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.grades is distinct from r.grades_avant;
	if v_niveaux <> 0 then
		raise exception 'niveaux changés depuis le relevé : %', v_niveaux;
	end if;
	select count(*) into v_statuts from _qcm1r_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.status is distinct from r.statut_avant;
	if v_statuts <> 0 then
		raise exception 'statuts changés depuis le relevé : %', v_statuts;
	end if;
	-- « + » : tag en base non relevé (tout niveau) ; « - » : tag relevé absent de la base
	select string_agg(d.r, ', ' order by d.r) into v_detail from (
		(select '+' || left(q.template_id::text, 8) || ' ' || p.code as r
		   from public.question_template_points q
		   join _qcm1r_modeles m on m.id = q.template_id
		   join public.curriculum_points p on p.id = q.point_id
		  where not exists (select 1 from _qcm1r_tags t where t.template_id = q.template_id and t.point_id = q.point_id and t.avant))
		union all
		(select '-' || left(t.template_id::text, 8) || ' ' || t.code
		   from _qcm1r_tags t
		   join public.question_templates q on q.id = t.template_id
		  where t.avant
		    and not exists (select 1 from public.question_template_points u where u.template_id = t.template_id and u.point_id = t.point_id))) d;
	if v_detail is not null then
		raise exception 'tags différents du relevé : %', v_detail;
	end if;
end $garde$;

-- ---- 4. Retraits, déplacements, niveaux, statut, poses ---------------------------------
delete from public.question_template_points q
 using _qcm1r_tags t
 where q.template_id = t.template_id and q.point_id = t.point_id and t.avant and not t.apres;

-- R2 : les modèles passent sur le nœud de leur point AVANT les tags (le trigger des tags lit le
-- nœud du modèle).
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = x.apres
  from _qcm1r_noeuds x
 where q.id = x.id and q.classification_node_id is distinct from x.apres;
update public.question_templates q set grades = r.grades_apres
  from _qcm1r_modeles r
 where q.id = r.id and q.grades is distinct from r.grades_apres;
update public.question_templates q set status = r.statut_apres
  from _qcm1r_modeles r
 where q.id = r.id and q.status is distinct from r.statut_apres;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.template_id, t.point_id
  from _qcm1r_tags t
  join public.question_templates q on q.id = t.template_id
 where t.apres and not t.avant;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_niveaux integer; v_statuts integer; v_total integer; v_tags integer; v_tags_attendus integer;
begin
	select count(*) into v_presents from _qcm1r_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qcm1r_noeuds x
	  join public.question_templates q on q.id = x.id and q.classification_node_id = x.apres;
	select count(*) into v_niveaux from _qcm1r_modeles r
	  join public.question_templates q on q.id = r.id and q.grades = r.grades_apres;
	select count(*) into v_statuts from _qcm1r_modeles r
	  join public.question_templates q on q.id = r.id and q.status = r.statut_apres;
	-- tags de ces modèles (tout niveau) : tous, et ceux du lot d'après (doivent coïncider)
	select count(*), count(*) filter (where exists (select 1 from _qcm1r_tags t
	                                                where t.template_id = q.template_id and t.point_id = q.point_id and t.apres))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qcm1r_modeles m on m.id = q.template_id;
	-- Base sans les modèles (locale) : aucun tag attendu.
	v_tags_attendus := least(v_presents, 1) * 16;
	if v_noeuds <> v_presents or v_niveaux <> v_presents or v_statuts <> v_presents
	   or v_tags <> v_tags_attendus or v_total <> v_tags_attendus then
		raise exception 'lot incohérent : nœuds %/%, niveaux %/%, statuts %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_niveaux, v_presents, v_statuts, v_presents, v_tags, v_tags_attendus, v_total;
	end if;
end $check$;

drop table _qcm1r_noeuds;
drop table _qcm1r_tags;
drop table _qcm1r_modeles;
