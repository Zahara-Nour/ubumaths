-- ============================================================================
-- Chantier « blockly », lot 11 de la 5e (programmes en blocs) : nœud et tag de 6 modèles neufs
-- ============================================================================
--   - 5768bed7 (Séquencer des instructions (tortue)) → 5-100, sur « Algorithmique > Variables et instructions » ;
--   - 4cf28652 (Écrire une formule en blocs) → 5-102, sur « Algorithmique > Variables et instructions » ;
--   - 57bf8629 (Programme de calcul en étapes) → 5-103, sur « Algorithmique > Variables et instructions » ;
--   - 6bf5ca7e (Modifier un programme de calcul) → 5-105, sur « Algorithmique > Variables et instructions » ;
--   - 7cb0e200 (Modifier un tracé) → 5-105, sur « Algorithmique > Variables et instructions » ;
--   - 51636342 (Répéter des instructions (tortue)) → 5-106, sur « Algorithmique > Boucles > boucle bornée ».
-- Chaque modèle va sur le nœud de son point (la notion « Variables et instructions », qui a 4
-- sous-notions sans rapport avec ces points, ou la sous-notion « boucle bornée ») et porte UN point
-- (ADR 0020 : au plus un point par programme). Ni le contenu, ni les niveaux (écrits à la création),
-- ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-11-14 (journal docs/wip/blockly-progress.md § Premiers modèles :
-- nœud par défaut « Variables et instructions », 5-106 sur « Boucles > boucle bornée »). Les
-- modèles ont été créés en brouillon par David le 2026-11-15 avec scripts/create-questions.ts
-- (scripts/questions/5-lot11/, #2667), qui ne pose ni nœud ni tag. Relevé de la prod du
-- 2026-11-15 (MCP) : 6 brouillons en {5}, sans nœud ni tag ; 5-100, 102, 103 et 105 sur la notion
-- « Variables et instructions » (sous-notions : variables et affectation, types, instructions
-- conditionnelles, blocs personnalisés) ; 5-106 sur « Boucles > boucle bornée ».
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (6 modèles). Elle est prouvée par
-- tests/integration/questions-5-lot11-blockly-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-11-15),
-- sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point ; la notion visée ne doit pas avoir gagné de
-- sous-notion depuis le relevé.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question d'accès du lot, journal § Premiers
-- modèles : « rien de neuf (rattachement de modèles à un nœud et à un point) », David le 2026-11-14).
-- Aucune règle ne change. Effet visible : les 6 brouillons apparaissent sous leur nœud et sous leur
-- point dans l'admin ; les élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 6 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--               ('5768bed7-0b51-4b6c-84e6-23a7d0042cc9'::uuid),
--               ('4cf28652-900a-4cd3-8b22-f421b8226361'::uuid),
--               ('57bf8629-cfce-4060-848e-32da91823010'::uuid),
--               ('6bf5ca7e-36d7-48b0-bc75-c1760b0d1923'::uuid),
--               ('7cb0e200-b026-4731-9113-8bf6e55e48ca'::uuid),
--               ('51636342-7294-407b-9fd0-42f9ede6e8a9'::uuid))
--  as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('5768bed7-0b51-4b6c-84e6-23a7d0042cc9'::uuid, '5-100'),
-- 	('4cf28652-900a-4cd3-8b22-f421b8226361'::uuid, '5-102'),
-- 	('57bf8629-cfce-4060-848e-32da91823010'::uuid, '5-103'),
-- 	('6bf5ca7e-36d7-48b0-bc75-c1760b0d1923'::uuid, '5-105'),
-- 	('7cb0e200-b026-4731-9113-8bf6e55e48ca'::uuid, '5-105'),
-- 	('51636342-7294-407b-9fd0-42f9ede6e8a9'::uuid, '5-106')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '5' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               '5768bed7-0b51-4b6c-84e6-23a7d0042cc9',
--               '4cf28652-900a-4cd3-8b22-f421b8226361',
--               '57bf8629-cfce-4060-848e-32da91823010',
--               '6bf5ca7e-36d7-48b0-bc75-c1760b0d1923',
--               '7cb0e200-b026-4731-9113-8bf6e55e48ca',
--               '51636342-7294-407b-9fd0-42f9ede6e8a9');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._q511_modeles;
create temporary table _q511_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null,
	-- sous-notions que la notion a le droit d'avoir quand le modèle va sur elle (les 4 du relevé du
	-- 2026-11-15 : une sous-notion ajoutée depuis demanderait de revoir le rangement)
	sous_notions_admises text[]
);
insert into _q511_modeles values
	('5768bed7-0b51-4b6c-84e6-23a7d0042cc9', 'Algorithmique', 'Variables et instructions', null, '5-100', array['variables et affectation', 'types', 'instructions conditionnelles', 'blocs personnalisés']),
	('4cf28652-900a-4cd3-8b22-f421b8226361', 'Algorithmique', 'Variables et instructions', null, '5-102', array['variables et affectation', 'types', 'instructions conditionnelles', 'blocs personnalisés']),
	('57bf8629-cfce-4060-848e-32da91823010', 'Algorithmique', 'Variables et instructions', null, '5-103', array['variables et affectation', 'types', 'instructions conditionnelles', 'blocs personnalisés']),
	('6bf5ca7e-36d7-48b0-bc75-c1760b0d1923', 'Algorithmique', 'Variables et instructions', null, '5-105', array['variables et affectation', 'types', 'instructions conditionnelles', 'blocs personnalisés']),
	('7cb0e200-b026-4731-9113-8bf6e55e48ca', 'Algorithmique', 'Variables et instructions', null, '5-105', array['variables et affectation', 'types', 'instructions conditionnelles', 'blocs personnalisés']),
	('51636342-7294-407b-9fd0-42f9ede6e8a9', 'Algorithmique', 'Boucles', 'boucle bornée', '5-106', null);

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q511_modeles order by id;
select 1 from public.question_templates where id in (select id from _q511_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _q511_modeles add column noeud uuid, add column point_id uuid;
update _q511_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _q511_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _q511_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = '5' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _q511_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _q511_modeles where noeud is null),
			(select count(*) from _q511_modeles where point_id is null);
	end if;
	if exists (select 1 from _q511_modeles r
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
	select count(*) into v_presents from _q511_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 6) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 6', v_presents;
	end if;
	select count(*) into v_ranges from _q511_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _q511_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q511_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _q511_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _q511_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q511_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _q511_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q511_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _q511_modeles;
