-- ============================================================================
-- Chantier « questions-1spe », D3 : tags de 2 modèles publiés de 1re spé
-- ============================================================================
--   - f1440b52 (Dériver un quotient) : 1SPE-274 → 1SPE-396 (« Opérations sur les fonctions
--     dérivables : quotient », point sans aucun modèle jusqu'ici ; 274 reste couvert par
--     cffdd283 et 496f958d) ;
--   - 318ea542 (Étude de fonction : par quoi commencer, carte de cours) : sans tag → 1SPE-283
--     (« Étudier les variations d'une fonction »), comme ses deux cartes sœurs 03b3d9b3 et bb554c62.
-- Les deux points vivent sur le nœud actuel de leur modèle (question_template_points_check_rules) ;
-- chaque modèle porte UN point de 1re spé (ADR 0020). Ni le contenu, ni le nœud, ni les niveaux,
-- ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décision de David le 2026-11-01 (journal docs/wip/questions-1spe-progress.md § 17, qui reprend
-- D3 du § 5). Le reste de D3 est sans objet ou ailleurs : 174e202b, dc4b8d08 (D17 : tag annulé),
-- 8b599a53 (déjà en T_SPE), fece187e, afd9b3ff (niveau laissé au chantier questions-tspe),
-- eae2ff6a, f8ccc8b6, 93f9ecdf (sans point, décisions du 2026-10-23 et du 2026-10-24).
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (2 modèles). Elle est prouvée par
-- tests/integration/questions-1spe-tags-d3.test.ts, qui fabrique des copies des identifiants de la
-- prod (nœud et tags relevés) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore au nœud relevé le 2026-11-01 (MCP) et porter EXACTEMENT
-- les tags relevés (f1440b52 : 1SPE-274 ; 318ea542 : aucun), sinon une saisie faite depuis serait
-- écrasée ou contredite. Nœuds désignés par leur chemin, résolus STRICTEMENT.
--
-- Données d'élèves (MCP, 2026-11-01) : aucune sur ces modèles (0 carte SRS, 0 tentative, 0 question
-- d'évaluation, 0 activité de journal, 0 réponse de test, 0 série ni exercice de chapitre).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David AVANT le SQL, tranchée par
-- lui le 2026-11-01 : personne). Aucune règle ne change. Effet visible : les deux modèles comptent
-- pour les points 396 et 283 (couverture, progression, badges de capacité), f1440b52 plus pour 274.
--
-- Rollback (aucune donnée d'élève). Il retire 1SPE-396 et 1SPE-283, puis repose 1SPE-274 sur
-- f1440b52. Garde : il refuse si les tags des modèles ne sont plus EXACTEMENT ceux de la migration
-- (sinon une saisie faite depuis serait écrasée en silence). Bloc éprouvé par le test d'intégration,
-- à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('318ea542-65cb-4040-9b46-1d5803d9dee5'::uuid),
--                ('f1440b52-5a2b-4e6a-a112-7182b029d023'::uuid)) as r(id)
--  order by r.id;
-- do $rollback$
-- declare v_presents integer; v_total integer; v_lot integer; v_point uuid;
-- begin
-- 	select count(*) into v_presents from public.question_templates
-- 	 where id in ('318ea542-65cb-4040-9b46-1d5803d9dee5', 'f1440b52-5a2b-4e6a-a112-7182b029d023');
-- 	if v_presents = 0 then
-- 		return;
-- 	end if;
-- 	if v_presents <> 2 then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 2', v_presents;
-- 	end if;
-- 	select count(*),
-- 	       count(*) filter (where (q.template_id, p.code) in (
-- 	           ('f1440b52-5a2b-4e6a-a112-7182b029d023'::uuid, '1SPE-396'),
-- 	           ('318ea542-65cb-4040-9b46-1d5803d9dee5'::uuid, '1SPE-283')) and p.grade = '1_SPE')
-- 	  into v_total, v_lot
-- 	  from public.question_template_points q
-- 	  join public.curriculum_points p on p.id = q.point_id
-- 	 where q.template_id in ('318ea542-65cb-4040-9b46-1d5803d9dee5', 'f1440b52-5a2b-4e6a-a112-7182b029d023');
-- 	if v_total <> 2 or v_lot <> 2 then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus 2)', v_lot, v_total;
-- 	end if;
-- 	select p.id into v_point from public.curriculum_points p
-- 	  join public.question_templates t on t.classification_node_id = p.node_id
-- 	 where t.id = 'f1440b52-5a2b-4e6a-a112-7182b029d023' and p.grade = '1_SPE' and p.code = '1SPE-274'
-- 	   and p.archived_at is null;
-- 	if v_point is null then
-- 		raise exception 'rollback : points introuvables : 1 (1SPE-274 sur le nœud de f1440b52)';
-- 	end if;
-- 	delete from public.question_template_points
-- 	 where template_id in ('318ea542-65cb-4040-9b46-1d5803d9dee5', 'f1440b52-5a2b-4e6a-a112-7182b029d023');
-- 	insert into public.question_template_points (template_id, point_id)
-- 	values ('f1440b52-5a2b-4e6a-a112-7182b029d023', v_point);
-- end $rollback$;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._q1sd3_modeles;
create temporary table _q1sd3_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text not null,
	code_avant text,
	code_apres text not null
);
insert into _q1sd3_modeles values
	('f1440b52-5a2b-4e6a-a112-7182b029d023', 'Fonctions', 'Dérivation', 'opérations sur les dérivées', '1SPE-274', '1SPE-396'),
	('318ea542-65cb-4040-9b46-1d5803d9dee5', 'Fonctions', 'Dérivation', 'variations et extremums', null, '1SPE-283');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q1sd3_modeles order by id;
select 1 from public.question_templates where id in (select id from _q1sd3_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
alter table _q1sd3_modeles add column noeud uuid, add column point_avant uuid, add column point_apres uuid;
update _q1sd3_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _q1sd3_modeles r set point_avant = p.id
  from public.curriculum_points p
 where p.grade = '1_SPE' and p.code = r.code_avant and p.archived_at is null;
update _q1sd3_modeles r set point_apres = p.id
  from public.curriculum_points p
 where p.grade = '1_SPE' and p.code = r.code_apres and p.archived_at is null and p.node_id = r.noeud;

-- ---- 3. Gardes : présence TOUT ou RIEN, nœud et tags du relevé -------------------------
do $garde$
declare v_presents integer; v_deplaces integer; v_total integer; v_releve integer;
begin
	select count(*) into v_presents from _q1sd3_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	if v_presents <> 2 then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 2', v_presents;
	end if;
	if exists (select 1 from _q1sd3_modeles where noeud is null) then
		raise exception 'chemins introuvables : % nœud(s)',
			(select count(*) from _q1sd3_modeles where noeud is null);
	end if;
	if exists (select 1 from _q1sd3_modeles where point_apres is null) then
		raise exception 'points introuvables ou hors du nœud du modèle : %',
			(select count(*) from _q1sd3_modeles where point_apres is null);
	end if;
	select count(*) into v_deplaces from _q1sd3_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is distinct from r.noeud;
	if v_deplaces <> 0 then
		raise exception 'modèles déplacés depuis le relevé : %', v_deplaces;
	end if;
	select count(*),
	       count(*) filter (where exists (select 1 from _q1sd3_modeles r
	                                      where r.id = q.template_id and r.point_avant = q.point_id))
	  into v_total, v_releve
	  from public.question_template_points q
	  join _q1sd3_modeles m on m.id = q.template_id;
	if v_total <> 1 or v_releve <> 1 then
		raise exception 'tags différents du relevé : % tag(s) au lieu de 1 (1SPE-274 sur f1440b52 : %)',
			v_total, v_releve;
	end if;
end $garde$;

-- ---- 4. Tags : retrait de 1SPE-274, pose de 1SPE-396 et 1SPE-283 ----------------------
delete from public.question_template_points q
 using _q1sd3_modeles r
 where q.template_id = r.id and q.point_id = r.point_avant;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_apres
  from _q1sd3_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _q1sd3_modeles r join public.question_templates q on q.id = r.id;
	select count(*), count(*) filter (where exists (select 1 from _q1sd3_modeles r
	                                                where r.id = q.template_id and r.point_apres = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q1sd3_modeles m on m.id = q.template_id;
	if v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : tags du lot %/%, tags en base %', v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _q1sd3_modeles;
