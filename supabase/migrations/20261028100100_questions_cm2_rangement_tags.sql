-- ============================================================================
-- Chantier « questions-cm2 », lot 0 (changements de niveau) : rangement, tags, niveaux et statut de 22 modèles
-- ============================================================================
--   - 10 modèles du CM1 passent au CM2 et sont tagués : 32724446, 6379fa20 (CM2-117) ; e38d205a,
--     19323604 (CM2-042) ; 4643ed4a (CM2-046) ; aa788ca7, ac2dae38, a5d5a7a0 (CM2-065, déplacés vers
--     Algèbre > Premiers pas algébriques > égalités à trous, où vit le point) ; 8fa3108c, e320755f (CM2-021) ;
--   - 6 modèles du CM2 passent en 6e et sont tagués : 7f0fbff0 (6-121) ; 3c40e59b, 814a46a9,
--     4b543657, 918598f5, 9826af8b (6-118) ;
--   - 2 modèles du CM2 passent en 5e et sont tagués : e81493f7 (5-010), 9c03423a (5-119) ;
--   - 4 modèles repassent en BROUILLON (niveaux, nœud, catégorie gardés) : 32351845, e58b1357,
--     e009f9d0 (CM2), 322f3479 (CM1, doublon de dd7db98e).
-- Le contenu ne change pas : `updated_at` est PRÉSERVÉ. Le 23e modèle du lot (edc5d7d4) est dans la
-- migration précédente (20261028100000_questions_cm2_contenu).
-- ============================================================================
-- Phase 0 validée par David le 2026-10-28 (journal docs/wip/questions-cm2-progress.md § 5).
-- Fichier GÉNÉRÉ par docs/wip/questions/lot-rangement-cm2-0.py — ne pas éditer à la main ; corps
-- (étapes 1 à 5) repris du lot 0 du CE1 (20261027000100_questions_ce1_rangement_tags).
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (22 modèles). Elle est prouvée
-- par tests/integration/questions-cm2-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (nœud, niveaux, statut et tags d'avant) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore au nœud, aux niveaux et au statut relevés le 2026-10-28, et
-- ne porter aucun tag (relevé). Les nœuds sont désignés par leur chemin, résolu STRICTEMENT.
--
-- Données d'élèves : aucune (relevé du 2026-10-28 : 0 carte SRS, 0 tentative de compétence ou
-- d'évaluation, 0 réponse de test, 0 activité de journal, 0 exercice de chapitre, 0 favori).
--
-- Accès (question tranchée par David le 2026-10-28) : les élèves et le prof du CM2 voient 10
-- modèles publiés de plus (11 avec edc5d7d4), ceux de 6e 6, ceux de 5e 2 ; ceux du CM1 ne voient plus
-- 11 modèles (10 passés au CM2, 322f3479 en brouillon ; 12 avec edc5d7d4), ceux du CM2 ne voient plus
-- 11 modèles (8 partis en 6e et en 5e, 3 en brouillon). Aucune règle (policy) ne change.
--
-- Rollback (aucune donnée d'élève). Il retire les 18 tags posés, rend aux modèles leur nœud,
-- leurs niveaux et leur statut d'avant (tous relevés publiés, sans tag). Garde : il refuse si un
-- modèle n'a plus EXACTEMENT le nœud, les niveaux, le statut et les tags posés par la migration
-- (sinon une saisie faite depuis serait écrasée en silence). Bloc éprouvé par le test d'intégration,
-- à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--   ('32724446-558b-4eea-ad4a-13d7c6afe435'::uuid),
--   ('6379fa20-672c-4771-9d48-6d167a7a922e'::uuid),
--   ('e38d205a-5737-4a0a-a9cd-aab742107c2b'::uuid),
--   ('19323604-1e27-4b0f-8a24-1eef76ab6e59'::uuid),
--   ('4643ed4a-4cb9-456f-bc7b-a36c99b8290a'::uuid),
--   ('aa788ca7-bb32-45a3-9566-cc2d70a11d29'::uuid),
--   ('ac2dae38-425e-4f10-ba6a-045c285355d0'::uuid),
--   ('a5d5a7a0-2b7f-4174-a487-4c673fee5eeb'::uuid),
--   ('8fa3108c-692b-45d1-ac2a-7d4cb8cbf798'::uuid),
--   ('e320755f-fa1d-4230-9997-c5917e1c56ef'::uuid),
--   ('7f0fbff0-88ee-41b7-962c-8ddeb3880a9d'::uuid),
--   ('3c40e59b-cde5-4eab-85b5-f8bd0f91ed80'::uuid),
--   ('814a46a9-2f73-4b2d-91e4-2052fc425b53'::uuid),
--   ('4b543657-6739-4183-8959-32f282fa826f'::uuid),
--   ('918598f5-d7b0-43f8-b679-f69ab2039134'::uuid),
--   ('9826af8b-0ba0-4c43-b9ed-dd6ccf552723'::uuid),
--   ('e81493f7-38fe-4028-a265-872329534ae3'::uuid),
--   ('9c03423a-38ce-44e3-ab44-20b4e90659b7'::uuid),
--   ('32351845-9672-415f-9397-fa446b6edd78'::uuid),
--   ('e58b1357-6fa8-4fce-9518-91d09d9acc49'::uuid),
--   ('e009f9d0-bc51-452e-9119-b6eff18cfe83'::uuid),
--   ('322f3479-0120-4a6d-839a-4e8df194f99e'::uuid)
--   ) as r(id)
--  order by r.id;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer;
-- begin
-- 	perform 1 from public.question_templates where id in ('32724446-558b-4eea-ad4a-13d7c6afe435', '6379fa20-672c-4771-9d48-6d167a7a922e', 'e38d205a-5737-4a0a-a9cd-aab742107c2b', '19323604-1e27-4b0f-8a24-1eef76ab6e59', '4643ed4a-4cb9-456f-bc7b-a36c99b8290a', 'aa788ca7-bb32-45a3-9566-cc2d70a11d29', 'ac2dae38-425e-4f10-ba6a-045c285355d0', 'a5d5a7a0-2b7f-4174-a487-4c673fee5eeb', '8fa3108c-692b-45d1-ac2a-7d4cb8cbf798', 'e320755f-fa1d-4230-9997-c5917e1c56ef', '7f0fbff0-88ee-41b7-962c-8ddeb3880a9d', '3c40e59b-cde5-4eab-85b5-f8bd0f91ed80', '814a46a9-2f73-4b2d-91e4-2052fc425b53', '4b543657-6739-4183-8959-32f282fa826f', '918598f5-d7b0-43f8-b679-f69ab2039134', '9826af8b-0ba0-4c43-b9ed-dd6ccf552723', 'e81493f7-38fe-4028-a265-872329534ae3', '9c03423a-38ce-44e3-ab44-20b4e90659b7', '32351845-9672-415f-9397-fa446b6edd78', 'e58b1357-6fa8-4fce-9518-91d09d9acc49', 'e009f9d0-bc51-452e-9119-b6eff18cfe83', '322f3479-0120-4a6d-839a-4e8df194f99e') order by id for update;
-- 	select count(*), count(*) filter (where q.grades = r.grades and q.status = r.statut
-- 	                                     and q.classification_node_id = s.id)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q join (values
-- 		('32724446-558b-4eea-ad4a-13d7c6afe435'::uuid, 'Nombres et calculs', 'Décimaux : numération', 'encadrement', array['CM2'], 'published'),
-- 		('6379fa20-672c-4771-9d48-6d167a7a922e'::uuid, 'Nombres et calculs', 'Décimaux : numération', 'encadrement', array['CM2'], 'published'),
-- 		('e38d205a-5737-4a0a-a9cd-aab742107c2b'::uuid, 'Nombres et calculs', 'Décimaux : calculs', 'multiplication', array['CM2'], 'published'),
-- 		('19323604-1e27-4b0f-8a24-1eef76ab6e59'::uuid, 'Nombres et calculs', 'Décimaux : calculs', 'multiplication', array['CM2'], 'published'),
-- 		('4643ed4a-4cb9-456f-bc7b-a36c99b8290a'::uuid, 'Nombres et calculs', 'Entiers : multiplication', 'calcul astucieux', array['CM2'], 'published'),
-- 		('aa788ca7-bb32-45a3-9566-cc2d70a11d29'::uuid, 'Algèbre', 'Premiers pas algébriques', 'égalités à trous', array['CM2'], 'published'),
-- 		('ac2dae38-425e-4f10-ba6a-045c285355d0'::uuid, 'Algèbre', 'Premiers pas algébriques', 'égalités à trous', array['CM2'], 'published'),
-- 		('a5d5a7a0-2b7f-4174-a487-4c673fee5eeb'::uuid, 'Algèbre', 'Premiers pas algébriques', 'égalités à trous', array['CM2'], 'published'),
-- 		('8fa3108c-692b-45d1-ac2a-7d4cb8cbf798'::uuid, 'Nombres et calculs', 'Fractions : calculs', 'multiplication', array['CM2'], 'published'),
-- 		('e320755f-fa1d-4230-9997-c5917e1c56ef'::uuid, 'Nombres et calculs', 'Fractions : calculs', 'multiplication', array['CM2'], 'published'),
-- 		('7f0fbff0-88ee-41b7-962c-8ddeb3880a9d'::uuid, 'Nombres et calculs', 'Décimaux : calculs', 'division', array['6'], 'published'),
-- 		('3c40e59b-cde5-4eab-85b5-f8bd0f91ed80'::uuid, 'Nombres et calculs', 'Décimaux : calculs', 'multiplication', array['6'], 'published'),
-- 		('814a46a9-2f73-4b2d-91e4-2052fc425b53'::uuid, 'Nombres et calculs', 'Décimaux : calculs', 'multiplication', array['6'], 'published'),
-- 		('4b543657-6739-4183-8959-32f282fa826f'::uuid, 'Nombres et calculs', 'Décimaux : calculs', 'multiplication', array['6'], 'published'),
-- 		('918598f5-d7b0-43f8-b679-f69ab2039134'::uuid, 'Nombres et calculs', 'Décimaux : calculs', 'multiplication', array['6'], 'published'),
-- 		('9826af8b-0ba0-4c43-b9ed-dd6ccf552723'::uuid, 'Nombres et calculs', 'Décimaux : calculs', 'multiplication', array['6'], 'published'),
-- 		('e81493f7-38fe-4028-a265-872329534ae3'::uuid, 'Arithmétique', 'Divisibilité', 'critères de divisibilité', array['5'], 'published'),
-- 		('9c03423a-38ce-44e3-ab44-20b4e90659b7'::uuid, 'Arithmétique', 'Divisibilité', 'critères de divisibilité', array['5'], 'published'),
-- 		('32351845-9672-415f-9397-fa446b6edd78'::uuid, 'Nombres et calculs', 'Entiers : multiplication', 'produits particuliers', array['CM2'], 'draft'),
-- 		('e58b1357-6fa8-4fce-9518-91d09d9acc49'::uuid, 'Nombres et calculs', 'Entiers : multiplication', 'produits particuliers', array['CM2'], 'draft'),
-- 		('e009f9d0-bc51-452e-9119-b6eff18cfe83'::uuid, 'Nombres et calculs', 'Entiers : multiplication', 'produits particuliers', array['CM2'], 'draft'),
-- 		('322f3479-0120-4a6d-839a-4e8df194f99e'::uuid, 'Nombres et calculs', 'Fractions : sens et écritures', 'forme décimale', array['CM1'], 'draft')
-- 	  ) as r(id, branche, notion, sous_notion, grades, statut) on r.id = q.id
-- 	  left join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
-- 	  left join public.classification_nodes n on n.kind = 'notion' and n.parent_id = b.id and n.archived_at is null and n.name = r.notion
-- 	  left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = n.id and s.archived_at is null and s.name = r.sous_notion;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur % ont encore le nœud, les niveaux et le statut de la migration', v_intacts, v_presents;
-- 	end if;
-- 	-- Tags : exactement les 18 posés par la migration, rien d'autre.
-- 	select count(*), count(*) filter (where r.id is not null)
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join public.curriculum_points p on p.id = q.point_id
-- 	  left join (values
-- 		('32724446-558b-4eea-ad4a-13d7c6afe435'::uuid, 'CM2', 'CM2-117'),
-- 		('6379fa20-672c-4771-9d48-6d167a7a922e'::uuid, 'CM2', 'CM2-117'),
-- 		('e38d205a-5737-4a0a-a9cd-aab742107c2b'::uuid, 'CM2', 'CM2-042'),
-- 		('19323604-1e27-4b0f-8a24-1eef76ab6e59'::uuid, 'CM2', 'CM2-042'),
-- 		('4643ed4a-4cb9-456f-bc7b-a36c99b8290a'::uuid, 'CM2', 'CM2-046'),
-- 		('aa788ca7-bb32-45a3-9566-cc2d70a11d29'::uuid, 'CM2', 'CM2-065'),
-- 		('ac2dae38-425e-4f10-ba6a-045c285355d0'::uuid, 'CM2', 'CM2-065'),
-- 		('a5d5a7a0-2b7f-4174-a487-4c673fee5eeb'::uuid, 'CM2', 'CM2-065'),
-- 		('8fa3108c-692b-45d1-ac2a-7d4cb8cbf798'::uuid, 'CM2', 'CM2-021'),
-- 		('e320755f-fa1d-4230-9997-c5917e1c56ef'::uuid, 'CM2', 'CM2-021'),
-- 		('7f0fbff0-88ee-41b7-962c-8ddeb3880a9d'::uuid, '6', '6-121'),
-- 		('3c40e59b-cde5-4eab-85b5-f8bd0f91ed80'::uuid, '6', '6-118'),
-- 		('814a46a9-2f73-4b2d-91e4-2052fc425b53'::uuid, '6', '6-118'),
-- 		('4b543657-6739-4183-8959-32f282fa826f'::uuid, '6', '6-118'),
-- 		('918598f5-d7b0-43f8-b679-f69ab2039134'::uuid, '6', '6-118'),
-- 		('9826af8b-0ba0-4c43-b9ed-dd6ccf552723'::uuid, '6', '6-118'),
-- 		('e81493f7-38fe-4028-a265-872329534ae3'::uuid, '5', '5-010'),
-- 		('9c03423a-38ce-44e3-ab44-20b4e90659b7'::uuid, '5', '5-119')
-- 	  ) as r(id, grade, code) on r.id = q.template_id and p.grade = r.grade and p.code = r.code
-- 	 where q.template_id in ('32724446-558b-4eea-ad4a-13d7c6afe435', '6379fa20-672c-4771-9d48-6d167a7a922e', 'e38d205a-5737-4a0a-a9cd-aab742107c2b', '19323604-1e27-4b0f-8a24-1eef76ab6e59', '4643ed4a-4cb9-456f-bc7b-a36c99b8290a', 'aa788ca7-bb32-45a3-9566-cc2d70a11d29', 'ac2dae38-425e-4f10-ba6a-045c285355d0', 'a5d5a7a0-2b7f-4174-a487-4c673fee5eeb', '8fa3108c-692b-45d1-ac2a-7d4cb8cbf798', 'e320755f-fa1d-4230-9997-c5917e1c56ef', '7f0fbff0-88ee-41b7-962c-8ddeb3880a9d', '3c40e59b-cde5-4eab-85b5-f8bd0f91ed80', '814a46a9-2f73-4b2d-91e4-2052fc425b53', '4b543657-6739-4183-8959-32f282fa826f', '918598f5-d7b0-43f8-b679-f69ab2039134', '9826af8b-0ba0-4c43-b9ed-dd6ccf552723', 'e81493f7-38fe-4028-a265-872329534ae3', '9c03423a-38ce-44e3-ab44-20b4e90659b7', '32351845-9672-415f-9397-fa446b6edd78', 'e58b1357-6fa8-4fce-9518-91d09d9acc49', 'e009f9d0-bc51-452e-9119-b6eff18cfe83', '322f3479-0120-4a6d-839a-4e8df194f99e');
-- 	if v_tags <> v_total or v_total <> least(v_presents, 1) * 18 then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, least(v_presents, 1) * 18;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('32724446-558b-4eea-ad4a-13d7c6afe435'::uuid, 'CM2', 'CM2-117'),
-- 	('6379fa20-672c-4771-9d48-6d167a7a922e'::uuid, 'CM2', 'CM2-117'),
-- 	('e38d205a-5737-4a0a-a9cd-aab742107c2b'::uuid, 'CM2', 'CM2-042'),
-- 	('19323604-1e27-4b0f-8a24-1eef76ab6e59'::uuid, 'CM2', 'CM2-042'),
-- 	('4643ed4a-4cb9-456f-bc7b-a36c99b8290a'::uuid, 'CM2', 'CM2-046'),
-- 	('aa788ca7-bb32-45a3-9566-cc2d70a11d29'::uuid, 'CM2', 'CM2-065'),
-- 	('ac2dae38-425e-4f10-ba6a-045c285355d0'::uuid, 'CM2', 'CM2-065'),
-- 	('a5d5a7a0-2b7f-4174-a487-4c673fee5eeb'::uuid, 'CM2', 'CM2-065'),
-- 	('8fa3108c-692b-45d1-ac2a-7d4cb8cbf798'::uuid, 'CM2', 'CM2-021'),
-- 	('e320755f-fa1d-4230-9997-c5917e1c56ef'::uuid, 'CM2', 'CM2-021'),
-- 	('7f0fbff0-88ee-41b7-962c-8ddeb3880a9d'::uuid, '6', '6-121'),
-- 	('3c40e59b-cde5-4eab-85b5-f8bd0f91ed80'::uuid, '6', '6-118'),
-- 	('814a46a9-2f73-4b2d-91e4-2052fc425b53'::uuid, '6', '6-118'),
-- 	('4b543657-6739-4183-8959-32f282fa826f'::uuid, '6', '6-118'),
-- 	('918598f5-d7b0-43f8-b679-f69ab2039134'::uuid, '6', '6-118'),
-- 	('9826af8b-0ba0-4c43-b9ed-dd6ccf552723'::uuid, '6', '6-118'),
-- 	('e81493f7-38fe-4028-a265-872329534ae3'::uuid, '5', '5-010'),
-- 	('9c03423a-38ce-44e3-ab44-20b4e90659b7'::uuid, '5', '5-119')
--  ) as r(id, grade, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = r.grade and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates q set classification_node_id = s.id
--   from (values
-- 	('aa788ca7-bb32-45a3-9566-cc2d70a11d29'::uuid, 'Nombres et calculs', 'Décimaux : calculs', 'multiplication'),
-- 	('ac2dae38-425e-4f10-ba6a-045c285355d0'::uuid, 'Nombres et calculs', 'Décimaux : calculs', 'multiplication'),
-- 	('a5d5a7a0-2b7f-4174-a487-4c673fee5eeb'::uuid, 'Nombres et calculs', 'Entiers : multiplication', 'calcul astucieux')
--   ) as r(id, branche, notion, sous_notion)
--   join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--   join public.classification_nodes n on n.kind = 'notion' and n.parent_id = b.id and n.archived_at is null and n.name = r.notion
--   join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = n.id and s.archived_at is null and s.name = r.sous_notion
--  where q.id = r.id;
-- update public.question_templates q set grades = r.grades
--   from (values
-- 	('32724446-558b-4eea-ad4a-13d7c6afe435'::uuid, array['CM1']),
-- 	('6379fa20-672c-4771-9d48-6d167a7a922e'::uuid, array['CM1']),
-- 	('e38d205a-5737-4a0a-a9cd-aab742107c2b'::uuid, array['CM1']),
-- 	('19323604-1e27-4b0f-8a24-1eef76ab6e59'::uuid, array['CM1']),
-- 	('4643ed4a-4cb9-456f-bc7b-a36c99b8290a'::uuid, array['CM1']),
-- 	('aa788ca7-bb32-45a3-9566-cc2d70a11d29'::uuid, array['CM1']),
-- 	('ac2dae38-425e-4f10-ba6a-045c285355d0'::uuid, array['CM1']),
-- 	('a5d5a7a0-2b7f-4174-a487-4c673fee5eeb'::uuid, array['CM1']),
-- 	('8fa3108c-692b-45d1-ac2a-7d4cb8cbf798'::uuid, array['CM1']),
-- 	('e320755f-fa1d-4230-9997-c5917e1c56ef'::uuid, array['CM1']),
-- 	('7f0fbff0-88ee-41b7-962c-8ddeb3880a9d'::uuid, array['CM2']),
-- 	('3c40e59b-cde5-4eab-85b5-f8bd0f91ed80'::uuid, array['CM2']),
-- 	('814a46a9-2f73-4b2d-91e4-2052fc425b53'::uuid, array['CM2']),
-- 	('4b543657-6739-4183-8959-32f282fa826f'::uuid, array['CM2']),
-- 	('918598f5-d7b0-43f8-b679-f69ab2039134'::uuid, array['CM2']),
-- 	('9826af8b-0ba0-4c43-b9ed-dd6ccf552723'::uuid, array['CM2']),
-- 	('e81493f7-38fe-4028-a265-872329534ae3'::uuid, array['CM2']),
-- 	('9c03423a-38ce-44e3-ab44-20b4e90659b7'::uuid, array['CM2'])
--   ) as r(id, grades)
--  where q.id = r.id;
-- update public.question_templates set status = 'published' where id in ('32351845-9672-415f-9397-fa446b6edd78', 'e58b1357-6fa8-4fce-9518-91d09d9acc49', 'e009f9d0-bc51-452e-9119-b6eff18cfe83', '322f3479-0120-4a6d-839a-4e8df194f99e');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires ----------------------------------------------
drop table if exists pg_temp._qcm2r_modeles;
drop table if exists pg_temp._qcm2r_tags;
create temporary table _qcm2r_modeles (
	id uuid primary key,
	avant_branche text not null, avant_notion text not null, avant_sous_notion text,
	apres_branche text not null, apres_notion text not null, apres_sous_notion text,
	grades_avant text[] not null,
	grades_apres text[] not null,
	statut_avant text not null,
	statut_apres text not null
);
create temporary table _qcm2r_tags (
	template_id uuid not null,
	grade text not null,
	code text not null,
	avant boolean not null,
	apres boolean not null,
	primary key (template_id, grade, code)
);
insert into _qcm2r_modeles values
	('32724446-558b-4eea-ad4a-13d7c6afe435', 'Nombres et calculs', 'Décimaux : numération', 'encadrement',
	 'Nombres et calculs', 'Décimaux : numération', 'encadrement', array['CM1'], array['CM2'], 'published', 'published'),
	('6379fa20-672c-4771-9d48-6d167a7a922e', 'Nombres et calculs', 'Décimaux : numération', 'encadrement',
	 'Nombres et calculs', 'Décimaux : numération', 'encadrement', array['CM1'], array['CM2'], 'published', 'published'),
	('e38d205a-5737-4a0a-a9cd-aab742107c2b', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
	 'Nombres et calculs', 'Décimaux : calculs', 'multiplication', array['CM1'], array['CM2'], 'published', 'published'),
	('19323604-1e27-4b0f-8a24-1eef76ab6e59', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
	 'Nombres et calculs', 'Décimaux : calculs', 'multiplication', array['CM1'], array['CM2'], 'published', 'published'),
	('4643ed4a-4cb9-456f-bc7b-a36c99b8290a', 'Nombres et calculs', 'Entiers : multiplication', 'calcul astucieux',
	 'Nombres et calculs', 'Entiers : multiplication', 'calcul astucieux', array['CM1'], array['CM2'], 'published', 'published'),
	('aa788ca7-bb32-45a3-9566-cc2d70a11d29', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
	 'Algèbre', 'Premiers pas algébriques', 'égalités à trous', array['CM1'], array['CM2'], 'published', 'published'),
	('ac2dae38-425e-4f10-ba6a-045c285355d0', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
	 'Algèbre', 'Premiers pas algébriques', 'égalités à trous', array['CM1'], array['CM2'], 'published', 'published'),
	('a5d5a7a0-2b7f-4174-a487-4c673fee5eeb', 'Nombres et calculs', 'Entiers : multiplication', 'calcul astucieux',
	 'Algèbre', 'Premiers pas algébriques', 'égalités à trous', array['CM1'], array['CM2'], 'published', 'published'),
	('8fa3108c-692b-45d1-ac2a-7d4cb8cbf798', 'Nombres et calculs', 'Fractions : calculs', 'multiplication',
	 'Nombres et calculs', 'Fractions : calculs', 'multiplication', array['CM1'], array['CM2'], 'published', 'published'),
	('e320755f-fa1d-4230-9997-c5917e1c56ef', 'Nombres et calculs', 'Fractions : calculs', 'multiplication',
	 'Nombres et calculs', 'Fractions : calculs', 'multiplication', array['CM1'], array['CM2'], 'published', 'published'),
	('7f0fbff0-88ee-41b7-962c-8ddeb3880a9d', 'Nombres et calculs', 'Décimaux : calculs', 'division',
	 'Nombres et calculs', 'Décimaux : calculs', 'division', array['CM2'], array['6'], 'published', 'published'),
	('3c40e59b-cde5-4eab-85b5-f8bd0f91ed80', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
	 'Nombres et calculs', 'Décimaux : calculs', 'multiplication', array['CM2'], array['6'], 'published', 'published'),
	('814a46a9-2f73-4b2d-91e4-2052fc425b53', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
	 'Nombres et calculs', 'Décimaux : calculs', 'multiplication', array['CM2'], array['6'], 'published', 'published'),
	('4b543657-6739-4183-8959-32f282fa826f', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
	 'Nombres et calculs', 'Décimaux : calculs', 'multiplication', array['CM2'], array['6'], 'published', 'published'),
	('918598f5-d7b0-43f8-b679-f69ab2039134', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
	 'Nombres et calculs', 'Décimaux : calculs', 'multiplication', array['CM2'], array['6'], 'published', 'published'),
	('9826af8b-0ba0-4c43-b9ed-dd6ccf552723', 'Nombres et calculs', 'Décimaux : calculs', 'multiplication',
	 'Nombres et calculs', 'Décimaux : calculs', 'multiplication', array['CM2'], array['6'], 'published', 'published'),
	('e81493f7-38fe-4028-a265-872329534ae3', 'Arithmétique', 'Divisibilité', 'critères de divisibilité',
	 'Arithmétique', 'Divisibilité', 'critères de divisibilité', array['CM2'], array['5'], 'published', 'published'),
	('9c03423a-38ce-44e3-ab44-20b4e90659b7', 'Arithmétique', 'Divisibilité', 'critères de divisibilité',
	 'Arithmétique', 'Divisibilité', 'critères de divisibilité', array['CM2'], array['5'], 'published', 'published'),
	('32351845-9672-415f-9397-fa446b6edd78', 'Nombres et calculs', 'Entiers : multiplication', 'produits particuliers',
	 'Nombres et calculs', 'Entiers : multiplication', 'produits particuliers', array['CM2'], array['CM2'], 'published', 'draft'),
	('e58b1357-6fa8-4fce-9518-91d09d9acc49', 'Nombres et calculs', 'Entiers : multiplication', 'produits particuliers',
	 'Nombres et calculs', 'Entiers : multiplication', 'produits particuliers', array['CM2'], array['CM2'], 'published', 'draft'),
	('e009f9d0-bc51-452e-9119-b6eff18cfe83', 'Nombres et calculs', 'Entiers : multiplication', 'produits particuliers',
	 'Nombres et calculs', 'Entiers : multiplication', 'produits particuliers', array['CM2'], array['CM2'], 'published', 'draft'),
	('322f3479-0120-4a6d-839a-4e8df194f99e', 'Nombres et calculs', 'Fractions : sens et écritures', 'forme décimale',
	 'Nombres et calculs', 'Fractions : sens et écritures', 'forme décimale', array['CM1'], array['CM1'], 'published', 'draft');
insert into _qcm2r_tags values
	('32724446-558b-4eea-ad4a-13d7c6afe435', 'CM2', 'CM2-117', false, true),
	('6379fa20-672c-4771-9d48-6d167a7a922e', 'CM2', 'CM2-117', false, true),
	('e38d205a-5737-4a0a-a9cd-aab742107c2b', 'CM2', 'CM2-042', false, true),
	('19323604-1e27-4b0f-8a24-1eef76ab6e59', 'CM2', 'CM2-042', false, true),
	('4643ed4a-4cb9-456f-bc7b-a36c99b8290a', 'CM2', 'CM2-046', false, true),
	('aa788ca7-bb32-45a3-9566-cc2d70a11d29', 'CM2', 'CM2-065', false, true),
	('ac2dae38-425e-4f10-ba6a-045c285355d0', 'CM2', 'CM2-065', false, true),
	('a5d5a7a0-2b7f-4174-a487-4c673fee5eeb', 'CM2', 'CM2-065', false, true),
	('8fa3108c-692b-45d1-ac2a-7d4cb8cbf798', 'CM2', 'CM2-021', false, true),
	('e320755f-fa1d-4230-9997-c5917e1c56ef', 'CM2', 'CM2-021', false, true),
	('7f0fbff0-88ee-41b7-962c-8ddeb3880a9d', '6', '6-121', false, true),
	('3c40e59b-cde5-4eab-85b5-f8bd0f91ed80', '6', '6-118', false, true),
	('814a46a9-2f73-4b2d-91e4-2052fc425b53', '6', '6-118', false, true),
	('4b543657-6739-4183-8959-32f282fa826f', '6', '6-118', false, true),
	('918598f5-d7b0-43f8-b679-f69ab2039134', '6', '6-118', false, true),
	('9826af8b-0ba0-4c43-b9ed-dd6ccf552723', '6', '6-118', false, true),
	('e81493f7-38fe-4028-a265-872329534ae3', '5', '5-010', false, true),
	('9c03423a-38ce-44e3-ab44-20b4e90659b7', '5', '5-119', false, true);

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qcm2r_modeles order by id;
select 1 from public.question_templates where id in (select id from _qcm2r_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
create temporary table _qcm2r_noeuds as
	select r.id,
	       case when r.avant_sous_notion is null then an.id else asn.id end as avant,
	       case when r.apres_sous_notion is null then pn.id else psn.id end as apres
	  from _qcm2r_modeles r
	  left join public.classification_nodes ab on ab.kind = 'branch' and ab.parent_id is null and ab.archived_at is null and ab.name = r.avant_branche
	  left join public.classification_nodes an on an.kind = 'notion' and an.parent_id = ab.id and an.archived_at is null and an.name = r.avant_notion
	  left join public.classification_nodes asn on asn.kind = 'subnotion' and asn.parent_id = an.id and asn.archived_at is null and asn.name = r.avant_sous_notion
	  left join public.classification_nodes pb on pb.kind = 'branch' and pb.parent_id is null and pb.archived_at is null and pb.name = r.apres_branche
	  left join public.classification_nodes pn on pn.kind = 'notion' and pn.parent_id = pb.id and pn.archived_at is null and pn.name = r.apres_notion
	  left join public.classification_nodes psn on psn.kind = 'subnotion' and psn.parent_id = pn.id and psn.archived_at is null and psn.name = r.apres_sous_notion;
alter table _qcm2r_tags add column point_id uuid;
update _qcm2r_tags t set point_id = p.id
  from public.curriculum_points p
 where p.grade = t.grade and p.code = t.code and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from _qcm2r_noeuds where avant is null or apres is null)
	   or exists (select 1 from _qcm2r_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s) de modèle, % point(s)',
			(select count(*) from _qcm2r_noeuds where avant is null or apres is null),
			(select count(*) from _qcm2r_tags where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, nœud, niveaux et statut relevés, tags EXACTEMENT relevés ---
do $garde$
declare v_presents integer; v_ecarts integer; v_niveaux integer; v_statuts integer; v_detail text;
begin
	select count(*) into v_presents from _qcm2r_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 22) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 22', v_presents;
	end if;
	select count(*) into v_ecarts from _qcm2r_noeuds x
	  join public.question_templates q on q.id = x.id
	 where q.classification_node_id is distinct from x.avant;
	if v_ecarts <> 0 then
		raise exception 'modèles déplacés depuis le relevé : %', v_ecarts;
	end if;
	select count(*) into v_niveaux from _qcm2r_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.grades is distinct from r.grades_avant;
	if v_niveaux <> 0 then
		raise exception 'niveaux changés depuis le relevé : %', v_niveaux;
	end if;
	select count(*) into v_statuts from _qcm2r_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.status is distinct from r.statut_avant;
	if v_statuts <> 0 then
		raise exception 'statuts changés depuis le relevé : %', v_statuts;
	end if;
	-- « + » : tag en base non relevé (tout niveau) ; « - » : tag relevé absent de la base
	select string_agg(d.r, ', ' order by d.r) into v_detail from (
		(select '+' || left(q.template_id::text, 8) || ' ' || p.code as r
		   from public.question_template_points q
		   join _qcm2r_modeles m on m.id = q.template_id
		   join public.curriculum_points p on p.id = q.point_id
		  where not exists (select 1 from _qcm2r_tags t where t.template_id = q.template_id and t.point_id = q.point_id and t.avant))
		union all
		(select '-' || left(t.template_id::text, 8) || ' ' || t.code
		   from _qcm2r_tags t
		   join public.question_templates q on q.id = t.template_id
		  where t.avant
		    and not exists (select 1 from public.question_template_points u where u.template_id = t.template_id and u.point_id = t.point_id))) d;
	if v_detail is not null then
		raise exception 'tags différents du relevé : %', v_detail;
	end if;
end $garde$;

-- ---- 4. Retraits, déplacement, niveaux, statut, poses ---------------------------------
delete from public.question_template_points q
 using _qcm2r_tags t
 where q.template_id = t.template_id and q.point_id = t.point_id and t.avant and not t.apres;

alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = x.apres
  from _qcm2r_noeuds x
 where q.id = x.id and q.classification_node_id is distinct from x.apres;
update public.question_templates q set grades = r.grades_apres
  from _qcm2r_modeles r
 where q.id = r.id and q.grades is distinct from r.grades_apres;
update public.question_templates q set status = r.statut_apres
  from _qcm2r_modeles r
 where q.id = r.id and q.status is distinct from r.statut_apres;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.template_id, t.point_id
  from _qcm2r_tags t
  join public.question_templates q on q.id = t.template_id
 where t.apres and not t.avant;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_niveaux integer; v_statuts integer; v_total integer; v_tags integer; v_tags_attendus integer;
begin
	select count(*) into v_presents from _qcm2r_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qcm2r_noeuds x
	  join public.question_templates q on q.id = x.id and q.classification_node_id = x.apres;
	select count(*) into v_niveaux from _qcm2r_modeles r
	  join public.question_templates q on q.id = r.id and q.grades = r.grades_apres;
	select count(*) into v_statuts from _qcm2r_modeles r
	  join public.question_templates q on q.id = r.id and q.status = r.statut_apres;
	-- tags de ces modèles (tout niveau) : tous, et ceux du lot d'après (doivent coïncider)
	select count(*), count(*) filter (where exists (select 1 from _qcm2r_tags t
	                                                where t.template_id = q.template_id and t.point_id = q.point_id and t.apres))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qcm2r_modeles m on m.id = q.template_id;
	-- Base sans les modèles (locale) : aucun tag attendu.
	v_tags_attendus := least(v_presents, 1) * 18;
	if v_noeuds <> v_presents or v_niveaux <> v_presents or v_statuts <> v_presents
	   or v_tags <> v_tags_attendus or v_total <> v_tags_attendus then
		raise exception 'lot incohérent : nœuds %/%, niveaux %/%, statuts %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_niveaux, v_presents, v_statuts, v_presents, v_tags, v_tags_attendus, v_total;
	end if;
end $check$;

drop table _qcm2r_noeuds;
drop table _qcm2r_tags;
drop table _qcm2r_modeles;
