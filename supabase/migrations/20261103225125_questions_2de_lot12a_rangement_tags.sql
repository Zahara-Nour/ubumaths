-- ============================================================================
-- Chantier « questions-2de », lot 12 a (inégalités, comparaisons, algèbre) : nœud et tag de 14 modèles neufs
-- ============================================================================
--   - 57585d68 (ajouter des inégalités) → 2-263, sur « Algèbre > Inégalités > règles de calcul » ;
--   - d15b096f (multiplier une inégalité par un réel) → 2-424, sur « Algèbre > Inégalités > règles de calcul » ;
--   - 9660771f (comparer deux nombres par leur différence) → 2-264, sur « Algèbre > Inégalités > comparaison et encadrement » ;
--   - d8b9e814 (comparer deux nombres positifs par leur rapport) → 2-425, sur « Algèbre > Inégalités > comparaison et encadrement » ;
--   - 5ffcde13 (comparer deux quantités par leur différence) → 2-276, sur « Algèbre > Inégalités > comparaison et encadrement » ;
--   - 313ae1a2 (comparer deux quantités par leur rapport) → 2-427, sur « Algèbre > Inégalités > comparaison et encadrement » ;
--   - 52516a54 (interpréter une différence) → 2-277, sur « Algèbre > Inégalités > comparaison et encadrement » ;
--   - 1d25a492 (interpréter un rapport) → 2-428, sur « Algèbre > Inégalités > comparaison et encadrement » ;
--   - 9ed8c72e (résoudre une équation quotient) → 2-269, sur « Algèbre > Équations : produit et quotient > équation quotient » ;
--   - ec690625 (isoler une grandeur dans une formule) → 2-273, sur « Algèbre > Calcul littéral > isoler une variable » ;
--   - d7aa3f33 (exprimer une variable en fonction de l'autre) → 2-274, sur « Algèbre > Calcul littéral > isoler une variable » ;
--   - 610a25fb (choisir la forme adaptée d'une expression) → 2-275, sur « Algèbre > Calcul littéral > factorisation » ;
--   - ab668c94 (mettre un problème en inéquation) → 2-278, sur « Algèbre > Inéquations : premier degré > ax + b < c » (« mettre en inéquation », facette, est archivée ; décision de David du 2026-11-03) ;
--   - 36a37542 (calcul littéral multiplicatif) → 2-489, sur « Algèbre > Calcul littéral > écriture simplifiée » ;
-- Chaque modèle va sur la sous-notion de la phase 0 et porte UN point (ADR 0020). Le point est sur
-- ce nœud, ou sur sa NOTION pour 2-275, 2-278 et 2-489 (points rangés sur « Calcul littéral » et
-- « Inéquations : premier degré ») : question_template_points_check_rules admet un point sur le
-- nœud du modèle ou sur la notion de ce nœud.
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-03 (journal docs/wip/questions-2de-progress.md § 71). Les
-- modèles ont été créés en brouillon le 2026-11-03 par scripts/create-questions.ts (lots 12 a-1 et
-- 12 a-2, lancés par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (14 modèles). Elle est prouvée par
-- tests/integration/questions-2de-lot12a-rangement-tags.test.ts, qui fabrique des copies
-- des identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-11-03), sinon
-- un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT ; le point doit être sur ce nœud ou sur sa notion.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question d'accès de la phase 0, § 71, tranchée par
-- David le 2026-11-03 : personne). Aucune règle ne change. Effet visible : les 14 brouillons
-- apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne les voient qu'une
-- fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 14 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--                ('57585d68-65d1-42ce-b146-99b924b517b3'::uuid),
--                ('d15b096f-50d8-49c5-9b5b-9d9363d55f1d'::uuid),
--                ('9660771f-b3e2-47ad-8f11-9afc4a0f3927'::uuid),
--                ('d8b9e814-6dd9-4719-bc1f-a14d1bbfcdc2'::uuid),
--                ('5ffcde13-e2e7-43a6-8cfb-0004e7f2295d'::uuid),
--                ('313ae1a2-1bfb-4da6-bcdd-8487bc4a84a2'::uuid),
--                ('52516a54-40e9-48e9-ac86-8a91d388dd46'::uuid),
--                ('1d25a492-f7c9-4108-bbf7-5fbd512c0813'::uuid),
--                ('9ed8c72e-60b7-4960-bbbc-fa766f11fd66'::uuid),
--                ('ec690625-2ca4-443e-ac1f-563c99219df6'::uuid),
--                ('d7aa3f33-53fb-4529-98da-c8a64a3f0281'::uuid),
--                ('610a25fb-c317-4790-857b-6f9dd3b91648'::uuid),
--                ('ab668c94-7f69-4cb9-9d50-cdeec974af6c'::uuid),
--                ('36a37542-6efd-473d-9d2b-37227e1bcc2f'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('57585d68-65d1-42ce-b146-99b924b517b3'::uuid, '2-263'),
-- 	('d15b096f-50d8-49c5-9b5b-9d9363d55f1d'::uuid, '2-424'),
-- 	('9660771f-b3e2-47ad-8f11-9afc4a0f3927'::uuid, '2-264'),
-- 	('d8b9e814-6dd9-4719-bc1f-a14d1bbfcdc2'::uuid, '2-425'),
-- 	('5ffcde13-e2e7-43a6-8cfb-0004e7f2295d'::uuid, '2-276'),
-- 	('313ae1a2-1bfb-4da6-bcdd-8487bc4a84a2'::uuid, '2-427'),
-- 	('52516a54-40e9-48e9-ac86-8a91d388dd46'::uuid, '2-277'),
-- 	('1d25a492-f7c9-4108-bbf7-5fbd512c0813'::uuid, '2-428'),
-- 	('9ed8c72e-60b7-4960-bbbc-fa766f11fd66'::uuid, '2-269'),
-- 	('ec690625-2ca4-443e-ac1f-563c99219df6'::uuid, '2-273'),
-- 	('d7aa3f33-53fb-4529-98da-c8a64a3f0281'::uuid, '2-274'),
-- 	('610a25fb-c317-4790-857b-6f9dd3b91648'::uuid, '2-275'),
-- 	('ab668c94-7f69-4cb9-9d50-cdeec974af6c'::uuid, '2-278'),
-- 	('36a37542-6efd-473d-9d2b-37227e1bcc2f'::uuid, '2-489')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '2' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               '57585d68-65d1-42ce-b146-99b924b517b3',
--               'd15b096f-50d8-49c5-9b5b-9d9363d55f1d',
--               '9660771f-b3e2-47ad-8f11-9afc4a0f3927',
--               'd8b9e814-6dd9-4719-bc1f-a14d1bbfcdc2',
--               '5ffcde13-e2e7-43a6-8cfb-0004e7f2295d',
--               '313ae1a2-1bfb-4da6-bcdd-8487bc4a84a2',
--               '52516a54-40e9-48e9-ac86-8a91d388dd46',
--               '1d25a492-f7c9-4108-bbf7-5fbd512c0813',
--               '9ed8c72e-60b7-4960-bbbc-fa766f11fd66',
--               'ec690625-2ca4-443e-ac1f-563c99219df6',
--               'd7aa3f33-53fb-4529-98da-c8a64a3f0281',
--               '610a25fb-c317-4790-857b-6f9dd3b91648',
--               'ab668c94-7f69-4cb9-9d50-cdeec974af6c',
--               '36a37542-6efd-473d-9d2b-37227e1bcc2f');
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
	('57585d68-65d1-42ce-b146-99b924b517b3', 'Algèbre', 'Inégalités', 'règles de calcul', '2-263'),
	('d15b096f-50d8-49c5-9b5b-9d9363d55f1d', 'Algèbre', 'Inégalités', 'règles de calcul', '2-424'),
	('9660771f-b3e2-47ad-8f11-9afc4a0f3927', 'Algèbre', 'Inégalités', 'comparaison et encadrement', '2-264'),
	('d8b9e814-6dd9-4719-bc1f-a14d1bbfcdc2', 'Algèbre', 'Inégalités', 'comparaison et encadrement', '2-425'),
	('5ffcde13-e2e7-43a6-8cfb-0004e7f2295d', 'Algèbre', 'Inégalités', 'comparaison et encadrement', '2-276'),
	('313ae1a2-1bfb-4da6-bcdd-8487bc4a84a2', 'Algèbre', 'Inégalités', 'comparaison et encadrement', '2-427'),
	('52516a54-40e9-48e9-ac86-8a91d388dd46', 'Algèbre', 'Inégalités', 'comparaison et encadrement', '2-277'),
	('1d25a492-f7c9-4108-bbf7-5fbd512c0813', 'Algèbre', 'Inégalités', 'comparaison et encadrement', '2-428'),
	('9ed8c72e-60b7-4960-bbbc-fa766f11fd66', 'Algèbre', 'Équations : produit et quotient', 'équation quotient', '2-269'),
	('ec690625-2ca4-443e-ac1f-563c99219df6', 'Algèbre', 'Calcul littéral', 'isoler une variable', '2-273'),
	('d7aa3f33-53fb-4529-98da-c8a64a3f0281', 'Algèbre', 'Calcul littéral', 'isoler une variable', '2-274'),
	('610a25fb-c317-4790-857b-6f9dd3b91648', 'Algèbre', 'Calcul littéral', 'factorisation', '2-275'),
	('ab668c94-7f69-4cb9-9d50-cdeec974af6c', 'Algèbre', 'Inéquations : premier degré', 'ax + b < c', '2-278'),
	('36a37542-6efd-473d-9d2b-37227e1bcc2f', 'Algèbre', 'Calcul littéral', 'écriture simplifiée', '2-489');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qc_modeles order by id;
select 1 from public.question_templates where id in (select id from _qc_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée ; le point est sur ce nœud ou sur sa notion
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
  from public.curriculum_points p, public.classification_nodes x
 where x.id = r.noeud
   and p.grade = '2' and p.code = r.code and p.archived_at is null
   and p.node_id in (r.noeud, case when x.kind = 'subnotion' then x.parent_id else x.id end);
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
	if v_presents not in (0, 14) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 14', v_presents;
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
