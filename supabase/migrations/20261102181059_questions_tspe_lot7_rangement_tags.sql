-- ============================================================================
-- Chantier « questions-tspe-restes », lot 7 (logique, dénombrement, suites) : nœud et tags de 6 modèles
-- ============================================================================
--   les 6 brouillons du lot 7, créés sans nœud ni tag, vont sur un nœud EXISTANT, tag posé :
--   d3cf8005 (Nier une proposition à deux quantificateurs) → TSPE-302, « Logique > Quantificateurs
--   et négation > négation d'une proposition » ;
--   043436d5 (Raisonner par équivalence) → TSPE-303, « Logique > Raisonnements > par équivalence » ;
--   ecc7bf70 (Factorielle : calculer, simplifier) → TSPE-310, « Dénombrement > Arrangements et
--   permutations > factorielle » ;
--   5063e393 (Suite croissante non majorée : limite) → TSPE-569, « Suites > Limites de suites >
--   définition » ;
--   d1aee0b9 (Récurrence sur une suite uₙ₊₁ = f(uₙ), f croissante) → TSPE-386, « Suites >
--   Raisonnement par récurrence > structure d'une récurrence » ;
--   651907b3 (Évolution en pourcentage avec apport constant) → TSPE-387, sur la NOTION « Suites >
--   Modèles d'évolution » (point sur la notion ; les 5 modèles de 1re spé sur les intérêts y sont
--   déjà ; sa seule sous-notion active, « seuil », n'est pas la sienne : décision D-M6).
-- Aucune sous-notion neuve. question_template_points_check_rules accepte un tag dont le point est
-- sur le nœud du modèle OU sur sa notion, et au plus UN point par programme (ADR 0020).
-- Ni le contenu, ni les niveaux (écrits à la création), ni le statut ne changent : `updated_at`
-- est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-02 (journal docs/wip/questions-tspe-restes-progress.md,
-- « Lot 7 : phase 0 » et D-M6). Les modèles ont été créés en brouillon le 2026-11-02 par
-- scripts/create-questions.ts (scripts/questions/tspe-7-restes/, #2238), qui ne pose ni nœud ni
-- tag. Relevé de la prod du 2026-11-02 (MCP) : 6 brouillons en [T_SPE], niveaux 3, 1, 1, 5, 3, 1,
-- sans nœud ni tag ; sous « Modèles d'évolution », seule « seuil » est active (« pourcentages »,
-- « placements », « algorithmes » archivées le 2026-10-10).
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (6 modèles). Elle est prouvée par
-- tests/integration/questions-tspe-lot7-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Gardes (avant toute écriture) : chaque modèle doit être encore SANS nœud et SANS aucun tag
-- (relevé du 2026-11-02), sinon un rangement fait depuis à la main serait écrasé. Nœuds désignés
-- par leur chemin, résolus STRICTEMENT ; chaque point doit être sur le nœud de son modèle ou sur sa
-- notion ; une notion visée sans sous-notion n'a aucune sous-notion active hors de celles admises.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (brouillons : admin et prof ; leurs tags, pas leur
-- contenu, lisibles par tout compte connecté, comme avant). Question posée avec la phase 0 du lot 7,
-- tranchée par David le 2026-11-02. Aucune règle (policy) ne change. Les élèves ne voient les
-- modèles qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 6 tags et rend les modèles sans nœud. Garde : il
-- refuse si un modèle n'est plus sur le nœud laissé par la migration ou porte d'autres tags. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._qtl7_retour;
-- create temporary table _qtl7_retour (
-- 	id uuid primary key, branche text not null, notion text not null, sous_notion text,
-- 	grade text not null, code text not null, noeud uuid
-- );
-- insert into _qtl7_retour values
-- 	('d3cf8005-825c-4213-84a8-470a7c303eb7', 'Logique', 'Quantificateurs et négation', 'négation d''une proposition', 'T_SPE', 'TSPE-302', null),
-- 	('043436d5-b6ad-4525-ab33-6b5bb0ebc48e', 'Logique', 'Raisonnements', 'par équivalence', 'T_SPE', 'TSPE-303', null),
-- 	('ecc7bf70-34d1-4ca6-8c14-bdb74b1c39e5', 'Dénombrement', 'Arrangements et permutations', 'factorielle', 'T_SPE', 'TSPE-310', null),
-- 	('5063e393-f45e-4701-afa7-fbccbfb2f070', 'Suites', 'Limites de suites', 'définition', 'T_SPE', 'TSPE-569', null),
-- 	('d1aee0b9-ccca-4e3b-bbeb-80d4fff6f53d', 'Suites', 'Raisonnement par récurrence', 'structure d''une récurrence', 'T_SPE', 'TSPE-386', null),
-- 	('651907b3-cb88-498f-92a1-d782b0a3fa1d', 'Suites', 'Modèles d''évolution', null, 'T_SPE', 'TSPE-387', null);
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _qtl7_retour order by id;
-- select 1 from public.question_templates where id in (select id from _qtl7_retour) order by id for update;
-- update _qtl7_retour r set noeud = s.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--   join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion and r.sous_notion is not null and s.name = r.sous_notion;
-- update _qtl7_retour r set noeud = n.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion and r.sous_notion is null;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer;
-- begin
-- 	if exists (select 1 from _qtl7_retour where noeud is null) then
-- 		raise exception 'rollback : nœuds introuvables : %', (select count(*) from _qtl7_retour where noeud is null);
-- 	end if;
-- 	select count(*), count(*) filter (where q.classification_node_id = r.noeud)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q join _qtl7_retour r on r.id = q.id;
-- 	if v_presents not in (0, 6) then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 6', v_presents;
-- 	end if;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur % ne sont plus sur le nœud de la migration', v_presents - v_intacts, v_presents;
-- 	end if;
-- 	select count(*), count(*) filter (where p.grade = r.grade and p.code = r.code)
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join _qtl7_retour r on r.id = q.template_id
-- 	  join public.curriculum_points p on p.id = q.point_id;
-- 	if v_tags <> v_total or v_total <> v_presents then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, v_presents;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using _qtl7_retour r where q.template_id = r.id;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (select id from _qtl7_retour);
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- drop table _qtl7_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires ----------------------------------------------
drop table if exists pg_temp._qtl7_tags;
drop table if exists pg_temp._qtl7_modeles;
create temporary table _qtl7_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,  -- null : le modèle va sur la notion
	-- Sous-notions actives que la notion a le droit d'avoir quand le modèle va sur elle (relevé du
	-- 2026-11-02) : toute autre fait échouer la migration
	sous_notions_admises text[]
);
insert into _qtl7_modeles values
	('d3cf8005-825c-4213-84a8-470a7c303eb7', 'Logique', 'Quantificateurs et négation', 'négation d''une proposition', null),
	('043436d5-b6ad-4525-ab33-6b5bb0ebc48e', 'Logique', 'Raisonnements', 'par équivalence', null),
	('ecc7bf70-34d1-4ca6-8c14-bdb74b1c39e5', 'Dénombrement', 'Arrangements et permutations', 'factorielle', null),
	('5063e393-f45e-4701-afa7-fbccbfb2f070', 'Suites', 'Limites de suites', 'définition', null),
	('d1aee0b9-ccca-4e3b-bbeb-80d4fff6f53d', 'Suites', 'Raisonnement par récurrence', 'structure d''une récurrence', null),
	('651907b3-cb88-498f-92a1-d782b0a3fa1d', 'Suites', 'Modèles d''évolution', null, array['seuil']);
create temporary table _qtl7_tags (
	id uuid not null references _qtl7_modeles (id),
	grade text not null,
	code text not null,
	primary key (id, grade)
);
insert into _qtl7_tags values
	('d3cf8005-825c-4213-84a8-470a7c303eb7', 'T_SPE', 'TSPE-302'),
	('043436d5-b6ad-4525-ab33-6b5bb0ebc48e', 'T_SPE', 'TSPE-303'),
	('ecc7bf70-34d1-4ca6-8c14-bdb74b1c39e5', 'T_SPE', 'TSPE-310'),
	('5063e393-f45e-4701-afa7-fbccbfb2f070', 'T_SPE', 'TSPE-569'),
	('d1aee0b9-ccca-4e3b-bbeb-80d4fff6f53d', 'T_SPE', 'TSPE-386'),
	('651907b3-cb88-498f-92a1-d782b0a3fa1d', 'T_SPE', 'TSPE-387');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qtl7_modeles order by id;
select 1 from public.question_templates where id in (select id from _qtl7_modeles) order by id for update;

-- ---- 2. Gardes (avant toute écriture) : présence TOUT ou RIEN, sans nœud, sans tag ---------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qtl7_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 6) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 6', v_presents;
	end if;
	select count(*) into v_ranges from _qtl7_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qtl7_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 3. Résolution STRICTE des chemins et des points -----------------------------------
-- Le nœud est la sous-notion désignée, ou la notion quand aucune sous-notion n'est donnée ; chaque
-- point doit être sur ce nœud ou sur sa notion
alter table _qtl7_modeles add column noeud uuid;
alter table _qtl7_modeles add column notion_id uuid;
alter table _qtl7_tags add column point_id uuid;
update _qtl7_modeles r set noeud = s.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is not null and s.name = r.sous_notion;
update _qtl7_modeles r set noeud = n.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qtl7_tags t set point_id = p.id
  from _qtl7_modeles r, public.curriculum_points p
 where r.id = t.id and p.grade = t.grade and p.code = t.code and p.archived_at is null
   and p.node_id in (r.noeud, r.notion_id);
do $resolution$
begin
	if exists (select 1 from _qtl7_modeles where noeud is null)
	   or exists (select 1 from _qtl7_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qtl7_modeles where noeud is null),
			(select count(*) from _qtl7_tags where point_id is null);
	end if;
	-- Une notion désignée sans sous-notion ne doit avoir AUCUNE sous-notion active hors de celles
	-- admises (sinon le modèle irait par erreur sur la notion au lieu d'une de ses sous-notions).
	-- Garde levée pour M6 seul (651907b3, décision D-M6 de David du 2026-11-02) : « Modèles
	-- d'évolution » garde la sous-notion « seuil », qui n'est pas la sienne ; « pourcentages », visée
	-- en phase 0, est archivée depuis le 2026-10-10. Si elle revient (ou une autre), M6 doit y aller :
	-- la migration échoue.
	if exists (select 1 from _qtl7_modeles r
	             join public.classification_nodes s on s.parent_id = r.notion_id
	              and s.kind = 'subnotion' and s.archived_at is null
	            where r.sous_notion is null
	              and s.name <> all (coalesce(r.sous_notions_admises, '{}'))) then
		raise exception 'notion visée sans sous-notion, mais elle en a une non admise : % modèle(s)',
			(select count(*) from _qtl7_modeles r
			  where r.sous_notion is null
			    and exists (select 1 from public.classification_nodes s where s.parent_id = r.notion_id
			                  and s.kind = 'subnotion' and s.archived_at is null
			                  and s.name <> all (coalesce(r.sous_notions_admises, '{}'))));
	end if;
end $resolution$;

-- ---- 4. Rangement, puis tags (le trigger des tags lit le nœud du modèle) -----------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qtl7_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.id, t.point_id
  from _qtl7_tags t
  join public.question_templates q on q.id = t.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_attendus integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qtl7_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qtl7_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*) into v_attendus from _qtl7_tags t join public.question_templates q on q.id = t.id;
	select count(*), count(*) filter (where exists (select 1 from _qtl7_tags t
	                                                where t.id = q.template_id and t.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qtl7_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_attendus or v_total <> v_attendus then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_attendus, v_total;
	end if;
end $check$;

drop table _qtl7_tags;
drop table _qtl7_modeles;
