-- ============================================================================
-- Lot idees-1re-variables-aleatoires-second-tag : tag(s) ajouté(s) à 1 modèle(s)
-- ============================================================================
--   505ee05a « Déterminer la loi de X : tableau à compléter » (f1-loi-de-x-tableau-a-completer.json) : tags {1SPE-355} + 1TECHNO-095
--   Chaque modèle porte au plus UN point par programme (ADR 0020), posé sur son nœud ou sur la
--   notion de ce nœud (question_template_points_check_rules). Ni le contenu, ni le statut ne changent :
--   `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Fichier GÉNÉRÉ par scripts/questions/migration-rangement.ts — ne pas éditer à la main.
-- Source : scripts/questions/idees-1re-variables-aleatoires-neufs. État relevé en prod le 2026-11-28.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN. Prouvée par
-- tests/integration/migrations-rangement-tags.test.ts, qui rejoue CE fichier sur des copies
-- portant les vrais identifiants (fixture rangement-tags/).
--
-- Gardes : chaque modèle à ranger doit être encore SANS nœud et SANS aucun tag, chaque modèle qui
-- gagne un niveau doit avoir EXACTEMENT les niveaux du relevé, chaque modèle qui gagne un tag
-- EXACTEMENT les tags du relevé, sinon une retouche faite depuis à la
-- main serait écrasée. Nœud désigné par son chemin, résolu STRICTEMENT.
--
-- Accès : aucune règle (policy) ne change ; personne ne gagne ni ne perd d'accès. Un brouillon
-- rangé apparaît sous son nœud dans l'admin, les élèves ne voient rien avant sa publication ; un
-- modèle publié qui gagne un niveau est aussi proposé dans ce niveau, celui qui gagne un tag compte
-- aussi pour ce point du programme. Données d'élèves : aucune.
--
-- Rollback : retire les tags posés (ceux d'avant restent), rend les modèles sans nœud (gardé : seulement s'ils sont
-- encore sur le nœud posé ici), rend les niveaux d'avant (gardé : seulement si les niveaux sont
-- encore ceux posés ici). Bloc éprouvé par le test d'intégration, à
-- jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('505ee05a-b19a-4cd3-a409-509d51cf9fbd'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('505ee05a-b19a-4cd3-a409-509d51cf9fbd'::uuid, '1TECHNO-095')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris ligne par ligne.
set local lock_timeout = '5s';

-- ---- Points ajoutés à des modèles déjà rangés ---------------------------------------
-- Garde : tags EXACTEMENT ceux du relevé. Modèle absent (base locale) : rien. Le trigger
-- question_template_points_rules vérifie encore, tag par tag, le nœud et « un point par programme ».
drop table if exists pg_temp._qt_ajouts;
create temporary table _qt_ajouts (
	id uuid not null,
	code text not null,
	point_id uuid,
	primary key (id, code)
);
insert into _qt_ajouts (id, code) values
	('505ee05a-b19a-4cd3-a409-509d51cf9fbd', '1TECHNO-095');
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || a.id::text, 0))
  from (select distinct id from _qt_ajouts) a order by a.id;
select 1 from public.question_templates where id in (select id from _qt_ajouts) order by id for update;
update _qt_ajouts a set point_id = p.id
  from public.curriculum_points p
 where p.code = a.code and p.archived_at is null;
do $tags$
declare v_codes text[]; v_presents integer;
begin
	select count(distinct a.id) into v_presents
	  from _qt_ajouts a join public.question_templates q on q.id = a.id;
	if v_presents not in (0, 1) then
		raise exception 'modèles à taguer partiellement présents : % sur 1', v_presents;
	end if;
	if exists (select 1 from public.question_templates where id = '505ee05a-b19a-4cd3-a409-509d51cf9fbd') then
		select coalesce(array_agg(p.code), '{}') into v_codes
		  from public.question_template_points q
		  join public.curriculum_points p on p.id = q.point_id
		 where q.template_id = '505ee05a-b19a-4cd3-a409-509d51cf9fbd';
		if not (v_codes @> array['1SPE-355']::text[] and v_codes <@ array['1SPE-355']::text[]) then
			raise exception 'tags de 505ee05a changés depuis le relevé : %', v_codes;
		end if;
	end if;
	if exists (select 1 from _qt_ajouts a join public.question_templates q on q.id = a.id
	            where a.point_id is null) then
		raise exception 'points ajoutés introuvables : %',
			(select count(*) from _qt_ajouts a join public.question_templates q on q.id = a.id
			  where a.point_id is null);
	end if;
	-- Un point d'un niveau que le modèle n'a pas (niveaux retirés depuis le relevé) : refus. Le
	-- trigger des tags ne regarde pas les niveaux. Les niveaux ajoutés plus haut comptent.
	if exists (select 1 from _qt_ajouts a
	             join public.question_templates q on q.id = a.id
	             join public.curriculum_points p on p.id = a.point_id
	            where p.grade is not null and not (p.grade = any (q.grades))) then
		raise exception 'point ajouté d''un niveau absent du modèle';
	end if;
end $tags$;
insert into public.question_template_points (template_id, point_id)
select a.id, a.point_id
  from _qt_ajouts a
  join public.question_templates q on q.id = a.id;
do $tags_check$
declare v_attendus integer; v_poses integer;
begin
	select count(*) into v_attendus from _qt_ajouts a join public.question_templates q on q.id = a.id;
	select count(*) into v_poses from _qt_ajouts a
	  join public.question_template_points q on q.template_id = a.id and q.point_id = a.point_id;
	if v_poses <> v_attendus then
		raise exception 'tags ajoutés incohérents : %/%', v_poses, v_attendus;
	end if;
end $tags_check$;
drop table _qt_ajouts;
