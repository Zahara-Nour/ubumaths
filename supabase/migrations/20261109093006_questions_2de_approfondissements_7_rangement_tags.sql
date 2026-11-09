-- ============================================================================
-- Chantier « questions-2de-demonstrations », lot 7 (approfondissements, nombres et algèbre) :
-- nœud et tag des 5 modèles
-- ============================================================================
--   Cinq brouillons créés sans nœud ni tag vont chacun sur une sous-notion EXISTANTE et active
--   (celle de leur point, ou pour 2-286, posé sur une notion, une sous-notion de cette notion),
--   et reçoivent ce seul point :
--     726d42bd Développement décimal illimité d'un nombre réel
--              → Ensembles > Ensembles de nombres > ℕ, ℤ, 𝔻, ℚ, ℝ, 2-258
--     85e575ea Développement décimal périodique d'un rationnel
--              → Ensembles > Ensembles de nombres > ℕ, ℤ, 𝔻, ℚ, ℝ, 2-259
--     f44a9209 Développer (a+b+c)²
--              → Algèbre > Calcul littéral > identités remarquables, 2-284
--     f5cc8558 Développer (a+b)³
--              → Algèbre > Calcul littéral > identités remarquables, 2-285
--     ea999fe0 Démontrer que √(ab) ⩽ (a+b)/2
--              → Algèbre > Inégalités > comparaison et encadrement, 2-286 (point sur la notion)
-- Aucune sous-notion neuve. question_template_points_check_rules accepte un tag dont le point est
-- sur le nœud du modèle OU sur sa notion, et au plus UN point par programme (ADR 0020).
-- Ni le contenu, ni les niveaux, ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-11-09 (journal docs/wip/questions-2de-demonstrations-progress.md,
-- § 13, D5, Q4 à Q6 ; 2-286 → Inégalités > comparaison et encadrement tranché en Q4).
-- Les modèles ont été créés en brouillon par David le 2026-11-09 avec scripts/create-questions.ts
-- (scripts/questions/2de-approfondissements-7/, #2510), qui ne pose ni nœud ni tag. Relevé de la prod du
-- 2026-11-09 (MCP) : 5 brouillons de seconde, sans nœud ni tag ; 2-258, 2-259, 2-284 et 2-285 sur
-- les sous-notions visées, 2-286 sur sa notion, toutes actives ; aucun modèle déjà tagué sur ces
-- points.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent. Elle est prouvée par
-- tests/integration/questions-2de-approfondissements-7-rangement-tags.test.ts, qui fabrique des
-- copies des identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Gardes (avant toute écriture) : les modèles doivent être encore SANS nœud et SANS aucun tag
-- (relevé du 2026-11-09), sinon un rangement fait depuis à la main serait écrasé. Nœuds désignés par
-- leur chemin, points par leur code, résolus STRICTEMENT ; chaque point doit être sur le nœud de son
-- modèle ou sur sa notion. Tout ou rien.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (brouillons : admin et prof ; leurs tags, pas leur
-- contenu, lisibles par tout compte connecté, comme pour tout modèle). Question posée à David AVANT
-- le SQL (phase 0, Q6 de D5), tranchée par lui le 2026-11-09 : personne. Aucune
-- règle (policy) ne change. Les élèves ne voient les modèles qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 5 tags et rend les modèles sans nœud. Garde : il
-- refuse si un modèle n'est plus sur le nœud laissé par la migration ou si leurs tags ont changé.
-- Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._q2ap7_retour_tags;
-- drop table if exists pg_temp._q2ap7_retour;
-- create temporary table _q2ap7_retour (
-- 	id uuid primary key, branche text not null, notion text not null, sous_notion text not null, noeud uuid
-- );
-- insert into _q2ap7_retour values
-- 	('726d42bd-ec32-4718-ab05-5c26da9c1f72', 'Ensembles', 'Ensembles de nombres', 'ℕ, ℤ, 𝔻, ℚ, ℝ', null),
-- 	('85e575ea-bdb6-4358-a920-e7f70bc53334', 'Ensembles', 'Ensembles de nombres', 'ℕ, ℤ, 𝔻, ℚ, ℝ', null),
-- 	('f44a9209-32b5-467a-a2c2-2569b00f787d', 'Algèbre', 'Calcul littéral', 'identités remarquables', null),
-- 	('f5cc8558-5bca-437a-beef-e79d0f141b88', 'Algèbre', 'Calcul littéral', 'identités remarquables', null),
-- 	('ea999fe0-0831-41bc-bc63-7ab0da4fef26', 'Algèbre', 'Inégalités', 'comparaison et encadrement', null);
-- create temporary table _q2ap7_retour_tags (id uuid not null, grade text not null, code text not null, primary key (id, grade));
-- insert into _q2ap7_retour_tags values
-- 	('726d42bd-ec32-4718-ab05-5c26da9c1f72', '2', '2-258'),
-- 	('85e575ea-bdb6-4358-a920-e7f70bc53334', '2', '2-259'),
-- 	('f44a9209-32b5-467a-a2c2-2569b00f787d', '2', '2-284'),
-- 	('f5cc8558-5bca-437a-beef-e79d0f141b88', '2', '2-285'),
-- 	('ea999fe0-0831-41bc-bc63-7ab0da4fef26', '2', '2-286');
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _q2ap7_retour order by id;
-- select 1 from public.question_templates where id in (select id from _q2ap7_retour) order by id for update;
-- update _q2ap7_retour r set noeud = s.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--   join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion and s.name = r.sous_notion;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer; v_attendus integer;
-- begin
-- 	if exists (select 1 from _q2ap7_retour where noeud is null) then
-- 		raise exception 'rollback : nœud introuvable';
-- 	end if;
-- 	select count(*), count(*) filter (where q.classification_node_id = r.noeud)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q join _q2ap7_retour r on r.id = q.id;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur %, plus sur le nœud de la migration', v_presents - v_intacts, v_presents;
-- 	end if;
-- 	select count(*) into v_attendus from _q2ap7_retour_tags t join public.question_templates q on q.id = t.id;
-- 	select count(*), count(*) filter (where exists (select 1 from _q2ap7_retour_tags t
-- 	                                                where t.id = q.template_id and t.grade = p.grade and t.code = p.code))
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join _q2ap7_retour r on r.id = q.template_id
-- 	  join public.curriculum_points p on p.id = q.point_id;
-- 	if v_tags <> v_attendus or v_total <> v_attendus then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, v_attendus;
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using _q2ap7_retour r where q.template_id = r.id;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (select id from _q2ap7_retour);
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- drop table _q2ap7_retour_tags;
-- drop table _q2ap7_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Les modèles et leurs tags, en tables temporaires ----------------------------------------
drop table if exists pg_temp._q2ap7_tags;
drop table if exists pg_temp._q2ap7_modeles;
create temporary table _q2ap7_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text not null
);
insert into _q2ap7_modeles values
	('726d42bd-ec32-4718-ab05-5c26da9c1f72', 'Ensembles', 'Ensembles de nombres', 'ℕ, ℤ, 𝔻, ℚ, ℝ'),
	('85e575ea-bdb6-4358-a920-e7f70bc53334', 'Ensembles', 'Ensembles de nombres', 'ℕ, ℤ, 𝔻, ℚ, ℝ'),
	('f44a9209-32b5-467a-a2c2-2569b00f787d', 'Algèbre', 'Calcul littéral', 'identités remarquables'),
	('f5cc8558-5bca-437a-beef-e79d0f141b88', 'Algèbre', 'Calcul littéral', 'identités remarquables'),
	('ea999fe0-0831-41bc-bc63-7ab0da4fef26', 'Algèbre', 'Inégalités', 'comparaison et encadrement');
create temporary table _q2ap7_tags (
	id uuid not null references _q2ap7_modeles (id),
	grade text not null,
	code text not null,
	primary key (id, grade)
);
insert into _q2ap7_tags values
	('726d42bd-ec32-4718-ab05-5c26da9c1f72', '2', '2-258'),
	('85e575ea-bdb6-4358-a920-e7f70bc53334', '2', '2-259'),
	('f44a9209-32b5-467a-a2c2-2569b00f787d', '2', '2-284'),
	('f5cc8558-5bca-437a-beef-e79d0f141b88', '2', '2-285'),
	('ea999fe0-0831-41bc-bc63-7ab0da4fef26', '2', '2-286');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et la ligne du modèle.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q2ap7_modeles order by id;
select 1 from public.question_templates where id in (select id from _q2ap7_modeles) order by id for update;

-- ---- 2. Gardes (avant toute écriture) : sans nœud, sans tag ---------------------------------
do $garde$
declare v_ranges integer; v_tags integer;
begin
	select count(*) into v_ranges from _q2ap7_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèle(s) déjà rangé(s) depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _q2ap7_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèle(s) déjà tagué(s) depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 3. Résolution STRICTE du chemin et des points --------------------------------------
alter table _q2ap7_modeles add column noeud uuid;
alter table _q2ap7_modeles add column notion_id uuid;
alter table _q2ap7_tags add column point_id uuid;
update _q2ap7_modeles r set noeud = s.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _q2ap7_tags t set point_id = p.id
  from _q2ap7_modeles r, public.curriculum_points p
 where r.id = t.id and p.grade = t.grade and p.code = t.code and p.archived_at is null
   and p.node_id in (r.noeud, r.notion_id);
do $resolution$
begin
	if exists (select 1 from _q2ap7_modeles where noeud is null)
	   or exists (select 1 from _q2ap7_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _q2ap7_modeles where noeud is null),
			(select count(*) from _q2ap7_tags where point_id is null);
	end if;
end $resolution$;

-- ---- 4. Rangement, puis tags (le trigger des tags lit le nœud du modèle) -----------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _q2ap7_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.id, t.point_id
  from _q2ap7_tags t
  join public.question_templates q on q.id = t.id;

-- ---- 5. Vérifications ------------------------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_attendus integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _q2ap7_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q2ap7_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*) into v_attendus from _q2ap7_tags t join public.question_templates q on q.id = t.id;
	select count(*), count(*) filter (where exists (select 1 from _q2ap7_tags t
	                                                where t.id = q.template_id and t.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q2ap7_modeles m on m.id = q.template_id;
	-- Tout ou rien : les 5 modèles (prod) ou aucun (base locale), jamais une partie.
	if v_presents not in (0, (select count(*) from _q2ap7_modeles)) then
		raise exception 'lot partiel : % modèle(s) présent(s) sur %', v_presents,
			(select count(*) from _q2ap7_modeles);
	end if;
	if v_noeuds <> v_presents or v_tags <> v_attendus or v_total <> v_attendus then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_attendus, v_total;
	end if;
end $check$;

drop table _q2ap7_tags;
drop table _q2ap7_modeles;
