-- ============================================================================
-- Passe lycée, étape e (PR 2) : quatre libellés corrigés, deux points neufs (exponentielle).
-- ============================================================================
-- Décisions de David du 2026-10-23 (docs/wip/passe-lycee/bornes/) :
--   * libellés rendus fidèles au BO (page à cocher, 15/15) : 2-273 retrouve « par exemple »
--     (la liste n'est pas fermée) ; 1GEN-029/030/031 disent « à termes strictement positifs »
--     comme le BO de 1re (ens. scientifique) ;
--   * TSPE-444, option A : le BO de Tle dit « l'équation fonctionnelle de l'exponentielle ou du
--     logarithme pour transformer une écriture » et seul le logarithme avait un point. Un point
--     neuf porte l'exponentielle, en Tle spé (TSPE-626) et en Tle compl. (TCOMP-379), affiché
--     juste après son jumeau logarithme (TSPE-444, TCOMP-236) dont il copie la rubrique, le
--     genre, l'exigence et le régime, sur le nœud Fonctions > Fonction exponentielle >
--     propriétés algébriques (celui de 1SPE-294).
-- Fixture du test et fixtures des seeds : docs/wip/passe-lycee/generer-libelles-points.py.
--
-- Accès : AUCUN changement (question tranchée par David le 2026-10-23 : personne ne gagne
-- d'accès). Le référentiel reste lisible comme avant ; aucune règle d'accès n'est touchée.
--
-- Gardes (avant toute écriture ; un refus ne laisse rien) : chaque point renommé existe avec son
-- libellé ACTUEL exact, non archivé ; les codes neufs n'existent pas ; le nœud visé existe une
-- seule fois ; chaque grade touché est numéroté 1..N avec l'effectif attendu et le jumeau à sa
-- place. Prouvée par tests/integration/passe-lycee-libelles.test.ts (état après, rollback et
-- rejeu).
--
-- ⚠️ Ne JAMAIS jouer ce fichier hors d'une transaction : pnpm db:migrate (supabase db push)
-- l'exécute en une seule transaction.
--
-- Rollback — à jouer dans une transaction ouverte par l'opérateur, en retirant les « -- » du
-- bloc (il ne contient ni begin ni commit). Il REFUSE si un usage s'est accroché à un point neuf
-- (tag de modèle ou d'exercice, état élève, journal, signalement, référence d'automatisme) : le
-- supprimer effacerait EN SILENCE (ON DELETE CASCADE) des données d'élèves mineurs — DESTRUCTIF,
-- arrêt obligatoire et accord explicite de David. Il refuse aussi si un libellé a changé depuis
-- (il serait écrasé). Sinon il supprime les deux points neufs, referme leur place dans l'ordre
-- d'affichage et rend les quatre libellés d'avant. Les dates (updated_at) ne sont pas restaurées.
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- create temporary table _rb_nom (code text primary key, ancien text not null, nom text not null) on commit drop;
-- insert into _rb_nom (code, ancien, nom) values
--   ('2-273', $pt$Sur des cas simples de relations entre variables ($U = RI$, $d = vt$, $S = \pi r^2$, $V = abc$, $V = \pi r^2 h$), exprimer une variable en fonction des autres$pt$, $pt$Sur des cas simples de relations entre variables (par exemple $U = RI$, $d = vt$, $S = \pi r^2$, $V = abc$, $V = \pi r^2 h$), exprimer une variable en fonction des autres$pt$),
--   ('1GEN-029', $pt$Suites géométriques : explicitation du terme de rang $n$$pt$, $pt$Suites géométriques à termes strictement positifs : explicitation du terme de rang $n$$pt$),
--   ('1GEN-030', $pt$Suites géométriques : sens de variation$pt$, $pt$Suites géométriques à termes strictement positifs : sens de variation$pt$),
--   ('1GEN-031', $pt$Suites géométriques : représentation graphique$pt$, $pt$Suites géométriques à termes strictement positifs : représentation graphique$pt$);
-- -- Verrou sur les points neufs et les points renommés : une écriture d'élève qui viserait un point
-- -- neuf (clé étrangère, FOR KEY SHARE) attend la fin de cette transaction ; les gardes ci-dessous
-- -- restent vraies jusqu'aux écritures.
-- select 1 from public.curriculum_points p
--  where p.code in ('TSPE-626', 'TCOMP-379') or p.code in (select code from _rb_nom) for update of p;
-- do $rb_garde$
-- declare
-- 	v_detail text;
-- begin
-- 	select string_agg(p.code, ', ' order by p.code) into v_detail
-- 	  from public.curriculum_points p
-- 	 where p.code in ('TSPE-626', 'TCOMP-379')
-- 	   and (exists (select 1 from public.question_template_points u where u.point_id = p.id)
-- 	     or exists (select 1 from public.exercise_curriculum_points u where u.point_id = p.id)
-- 	     or exists (select 1 from public.student_point_state u where u.point_id = p.id)
-- 	     or exists (select 1 from public.journal_entry_points u where u.point_id = p.id)
-- 	     or exists (select 1 from public.srs_anti_fraud_flags u where u.capacity_point_id = p.id)
-- 	     or exists (select 1 from public.curriculum_point_automatismes u where u.point_id = p.id));
-- 	if v_detail is not null then
-- 		raise exception 'rollback refusé : usages accrochés aux points neufs : % (DESTRUCTIF, accord de David)', v_detail;
-- 	end if;
-- 	if (select count(*) from public.curriculum_points
-- 	     where (grade, code) in (('T_SPE', 'TSPE-626'), ('T_COMP', 'TCOMP-379'))) <> 2 then
-- 		raise exception 'rollback refusé : points neufs absents — la migration n''est pas jouée telle quelle';
-- 	end if;
-- 	select string_agg(r.code, ', ' order by r.code) into v_detail
-- 	  from _rb_nom r
-- 	 where not exists (select 1 from public.curriculum_points p where p.code = r.code and p.name = r.nom);
-- 	if v_detail is not null then
-- 		raise exception 'rollback refusé : libellé modifié depuis la migration (il serait écrasé) : %', v_detail;
-- 	end if;
-- end $rb_garde$;
-- update public.curriculum_points p set display_order = p.display_order - 1
--   from public.curriculum_points n
--  where n.code in ('TSPE-626', 'TCOMP-379') and p.grade = n.grade and p.display_order > n.display_order;
-- delete from public.curriculum_points p where p.code in ('TSPE-626', 'TCOMP-379');
-- update public.curriculum_points p set name = r.ancien from _rb_nom r where p.code = r.code and p.name = r.nom;
-- ROLLBACK:END
-- ============================================================================

-- Une écriture concurrente fait échouer proprement la migration au lieu d'attendre.
set local lock_timeout = '5s';

-- ---- 1. Les données de la décision ---------------------------------------------
drop table if exists pg_temp._pl_nom;
create temporary table _pl_nom (code text primary key, grade text not null, ancien text not null, nom text not null);
insert into _pl_nom (code, grade, ancien, nom) values
  ('2-273', '2', $pt$Sur des cas simples de relations entre variables ($U = RI$, $d = vt$, $S = \pi r^2$, $V = abc$, $V = \pi r^2 h$), exprimer une variable en fonction des autres$pt$, $pt$Sur des cas simples de relations entre variables (par exemple $U = RI$, $d = vt$, $S = \pi r^2$, $V = abc$, $V = \pi r^2 h$), exprimer une variable en fonction des autres$pt$),
  ('1GEN-029', '1_GEN', $pt$Suites géométriques : explicitation du terme de rang $n$$pt$, $pt$Suites géométriques à termes strictement positifs : explicitation du terme de rang $n$$pt$),
  ('1GEN-030', '1_GEN', $pt$Suites géométriques : sens de variation$pt$, $pt$Suites géométriques à termes strictement positifs : sens de variation$pt$),
  ('1GEN-031', '1_GEN', $pt$Suites géométriques : représentation graphique$pt$, $pt$Suites géométriques à termes strictement positifs : représentation graphique$pt$);

-- Un point neuf : son jumeau (attributs copiés, affiché juste avant lui), l'ordre attendu du
-- jumeau et l'effectif du grade avant la migration.
drop table if exists pg_temp._pl_neuf;
create temporary table _pl_neuf (
	code text primary key, grade text not null, jumeau text not null, ordre_jumeau integer not null,
	effectif integer not null, nom text not null, chemin text not null
);
insert into _pl_neuf (code, grade, jumeau, ordre_jumeau, effectif, nom, chemin) values
  ('TSPE-626', 'T_SPE', 'TSPE-444', 200, 325, $pt$Utiliser l'équation fonctionnelle de l'exponentielle pour transformer une écriture$pt$, 'Fonctions > Fonction exponentielle > propriétés algébriques'),
  ('TCOMP-379', 'T_COMP', 'TCOMP-236', 52, 178, $pt$Utiliser l'équation fonctionnelle de l'exponentielle pour transformer une écriture$pt$, 'Fonctions > Fonction exponentielle > propriétés algébriques');

-- Le chemin de chaque nœud de l'arbre (« Branche > Notion > sous-notion »).
drop table if exists pg_temp._pl_chemin;
create temporary table _pl_chemin as
with recursive c as (
	select id, kind, archived_at, name::text as chemin
	  from public.classification_nodes where parent_id is null
	union all
	select n.id, n.kind, n.archived_at, c.chemin || ' > ' || n.name
	  from public.classification_nodes n join c on n.parent_id = c.id
)
select id, kind, archived_at, chemin from c;

-- ---- 2. Gardes : l'état attendu, sinon RIEN ne change ---------------------------
-- Verrou sur les points renommés et sur les grades renumérotés : les gardes restent vraies
-- jusqu'aux écritures.
select 1 from public.curriculum_points p
 where p.code in (select code from _pl_nom) or p.grade in (select grade from _pl_neuf)
   for no key update of p;
do $garde$
declare
	v_detail text;
begin
	-- 2a. chaque point renommé existe avec son libellé actuel exact, son grade, non archivé
	select string_agg(s.code, ', ' order by s.code) into v_detail
	  from _pl_nom s
	 where not exists (
		select 1 from public.curriculum_points p
		 where p.code = s.code and p.grade = s.grade and p.name = s.ancien and p.archived_at is null);
	if v_detail is not null then
		raise exception 'état inattendu : points à renommer absents ou modifiés : %', v_detail;
	end if;
	-- 2b. aucun code neuf n'existe
	select string_agg(p.code, ', ' order by p.code) into v_detail
	  from public.curriculum_points p where p.code in (select code from _pl_neuf);
	if v_detail is not null then
		raise exception 'état inattendu : codes neufs déjà pris : %', v_detail;
	end if;
	-- 2c. le nœud visé existe une seule fois, notion ou sous-notion non archivée
	select string_agg(s.code, ', ' order by s.code) into v_detail
	  from _pl_neuf s
	 where (select count(*) from _pl_chemin c
	         where c.chemin = s.chemin and c.archived_at is null and c.kind in ('notion', 'subnotion')) <> 1;
	if v_detail is not null then
		raise exception 'état inattendu : nœud introuvable ou ambigu pour : %', v_detail;
	end if;
	-- 2d. chaque grade touché : numéroté 1..N, effectif attendu, jumeau à sa place
	select string_agg(s.grade, ', ' order by s.grade) into v_detail
	  from _pl_neuf s
	 where (select count(*) from public.curriculum_points p where p.grade = s.grade) <> s.effectif
	    or (select count(distinct p.display_order) from public.curriculum_points p
	         where p.grade = s.grade and p.display_order between 1 and s.effectif) <> s.effectif
	    or not exists (select 1 from public.curriculum_points p
	                    where p.code = s.jumeau and p.grade = s.grade and p.display_order = s.ordre_jumeau
	                      and p.archived_at is null);
	if v_detail is not null then
		raise exception 'état inattendu : ordre d''affichage différent de celui attendu : %', v_detail;
	end if;
end $garde$;

-- ---- 3. Les libellés -------------------------------------------------------------
update public.curriculum_points p set name = s.nom
  from _pl_nom s
 where p.code = s.code and p.name = s.ancien;

-- ---- 4. Les points neufs, juste après leur jumeau --------------------------------
update public.curriculum_points p set display_order = p.display_order + 1
  from _pl_neuf s
 where p.grade = s.grade and p.display_order > s.ordre_jumeau;

insert into public.curriculum_points
	(code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id, rang)
select s.code, s.nom, j.kind, j.exigence, j.regime_acquisition, j.rubrique, j.grade, s.ordre_jumeau + 1, c.id, j.rang
  from _pl_neuf s
  join public.curriculum_points j on j.code = s.jumeau
  join _pl_chemin c on c.chemin = s.chemin and c.archived_at is null and c.kind in ('notion', 'subnotion');

-- ---- 5. Vérifications (la migration échoue si le compte n'y est pas) ----------------
do $check$
declare
	v_n integer;
begin
	select count(*) into v_n
	  from _pl_nom s join public.curriculum_points p on p.code = s.code and p.name = s.nom;
	if v_n <> 4 then
		raise exception 'passe lycée : libellés corrigés : %/4', v_n;
	end if;
	select count(*) into v_n
	  from _pl_neuf s
	  join public.curriculum_points n on n.code = s.code and n.grade = s.grade and n.name = s.nom
	   and n.display_order = s.ordre_jumeau + 1 and n.archived_at is null
	  join _pl_chemin c on c.id = n.node_id and c.chemin = s.chemin
	  join public.curriculum_points j on j.code = s.jumeau and j.display_order = s.ordre_jumeau
	   and n.rubrique is not distinct from j.rubrique and n.kind = j.kind and n.exigence = j.exigence
	   and n.regime_acquisition = j.regime_acquisition and n.rang is not distinct from j.rang;
	if v_n <> 2 then
		raise exception 'passe lycée : points neufs conformes : %/2', v_n;
	end if;
	select count(*) into v_n
	  from _pl_neuf s
	 where (select count(distinct p.display_order) from public.curriculum_points p
	         where p.grade = s.grade and p.display_order between 1 and s.effectif + 1) = s.effectif + 1
	   and (select count(*) from public.curriculum_points p where p.grade = s.grade) = s.effectif + 1;
	if v_n <> 2 then
		raise exception 'passe lycée : ordre d''affichage incohérent (grades conformes : %/2)', v_n;
	end if;
end $check$;

drop table _pl_nom, _pl_neuf, _pl_chemin;
