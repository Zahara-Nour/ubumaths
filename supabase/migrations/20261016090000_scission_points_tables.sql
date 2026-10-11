-- ============================================================================
-- Scission des points « tables » du cycle 2 : sens direct / opération à trou.
-- ============================================================================
-- Cinq points de la nouvelle génération (cycle 2, seed en prod) disaient « Connaitre dans les
-- deux sens les tables d'addition / de multiplication ». Chacun devient DEUX points, libellés
-- VALIDÉS par David (étape C5 de l'arbre des notions) :
--   * le point d'origine garde son code et devient le SENS DIRECT (3 + 4 = ? ; 3 × 4 = ?) :
--     CP-018, CE1-026, CE2-020 (addition), CE1-027, CE2-021 (multiplication) ;
--   * un point NEUF porte l'OPÉRATION À TROU (3 + ? = 7 ; 3 × ? = 12) : CP-073, CE1-090,
--     CE2-084 (addition), CE1-091, CE2-085 (multiplication). Il copie de son origine le grade,
--     le nœud, la rubrique, le genre, l'exigence et le régime (fluence), et se range JUSTE
--     APRÈS elle ; les points suivants du même grade descendent d'un cran (l'ordre d'affichage
--     reste une suite 1..N, sans trou ni doublon).
--   * la référence d'automatisme de 5e « Compléter une addition à trou par une soustraction
--     (2 + … = 7) » (seed cycle 4) visait CE2-020 : elle passe sur CE2-084, l'opération à trou
--     (option A, validée par David le 2026-10-11).
-- Les codes neufs sont EXPLICITES : le trigger d'attribution automatique lit l'ancien objectif
-- (nul ici) et lèverait une exception. Ni nœud ni grade ne changent : les règles de tag ne
-- sont pas sollicitées. `updated_at` suit la convention de la passe 20261011080000 (libellés
-- et ordres modifiés : la date bouge).
--
-- Accès : AUCUN changement — le référentiel reste lisible par tous comme avant, aucune donnée
-- d'élève n'est touchée.
--
-- Gardes (avant toute écriture ; un refus ne laisse rien) : les cinq points existent avec leur
-- libellé ACTUEL, un nœud et leur grade ; aucun usage ne s'y accroche (tag de modèle, tag
-- d'exercice, état élève, journal, signalement anti-fraude, référence d'automatisme) — sinon la
-- question du partage de cet usage entre les deux sens n'a pas été tranchée — SAUF la seule
-- référence attendue (5e → CE2-020), qui est déplacée ; aucun des cinq
-- codes neufs n'existe ; l'ordre d'affichage de CP, CE1 et CE2 est déjà une suite 1..N.
-- Prouvée par tests/integration/scission-points-tables.test.ts.
--
-- ⚠️ Ne JAMAIS jouer ce fichier hors d'une transaction : pnpm db:migrate (supabase db push)
-- l'exécute en une seule transaction.
--
-- Rollback — à jouer dans une transaction ouverte par l'opérateur, en retirant les « -- » du
-- bloc (il ne contient ni begin ni commit). Il REFUSE si un usage s'est accroché à un point
-- neuf : le supprimer effacerait EN SILENCE (ON DELETE CASCADE) le suivi élève, les tags
-- d'exercices, le journal, les signalements et les références d'automatismes — données
-- d'élèves mineurs : DESTRUCTIF, arrêt obligatoire et accord explicite de David (seule
-- exception : la référence de 5e sur CE2-084, qu'il remet d'abord sur CE2-020). Sinon il
-- supprime les cinq points neufs, rend aux origines leur ancien libellé, puis renumérote
-- CP, CE1 et CE2 en 1..N dans l'ordre existant (ce qui ramène chaque point à son ordre
-- d'avant). Le bloc entre les marqueurs est EXACTEMENT celui que le test extrait et exécute.
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- do $rb_garde$
-- declare
-- 	v_detail text;
-- begin
-- 	select string_agg(x.code, ', ' order by x.code) into v_detail
-- 	  from (values
-- 	    ('CP-018', $pt$Connaître les tables d'addition : donner la somme de deux nombres (3 + 4 = ?).$pt$),
-- 	    ('CE1-026', $pt$Connaître les tables d'addition : donner la somme de deux nombres (3 + 4 = ?).$pt$),
-- 	    ('CE2-020', $pt$Connaître les tables d'addition : donner la somme de deux nombres (3 + 4 = ?).$pt$),
-- 	    ('CE1-027', $pt$Connaître les tables de multiplication : donner le produit de deux nombres (3 × 4 = ?).$pt$),
-- 	    ('CE2-021', $pt$Connaître les tables de multiplication : donner le produit de deux nombres (3 × 4 = ?).$pt$),
-- 	    ('CP-073', $pt$Connaître les tables d'addition dans l'autre sens : trouver le terme manquant d'une addition (3 + ? = 7).$pt$),
-- 	    ('CE1-090', $pt$Connaître les tables d'addition dans l'autre sens : trouver le terme manquant d'une addition (3 + ? = 7).$pt$),
-- 	    ('CE2-084', $pt$Connaître les tables d'addition dans l'autre sens : trouver le terme manquant d'une addition (3 + ? = 7).$pt$),
-- 	    ('CE1-091', $pt$Connaître les tables de multiplication dans l'autre sens : trouver le facteur manquant d'un produit (3 × ? = 12).$pt$),
-- 	    ('CE2-085', $pt$Connaître les tables de multiplication dans l'autre sens : trouver le facteur manquant d'un produit (3 × ? = 12).$pt$)
-- 	  ) as x(code, name)
-- 	 where not exists (select 1 from public.curriculum_points p where p.code = x.code and p.name = x.name);
-- 	if v_detail is not null then
-- 		raise exception 'rollback : points de la scission absents ou modifiés : %', v_detail;
-- 	end if;
-- 	select string_agg(distinct p.code, ', ') into v_detail
-- 	  from public.curriculum_points p
-- 	 where p.code in ('CP-073', 'CE1-090', 'CE1-091', 'CE2-084', 'CE2-085')
-- 	   and (exists (select 1 from public.question_template_points u where u.point_id = p.id)
-- 	     or exists (select 1 from public.exercise_curriculum_points u where u.point_id = p.id)
-- 	     or exists (select 1 from public.student_point_state u where u.point_id = p.id)
-- 	     or exists (select 1 from public.journal_entry_points u where u.point_id = p.id)
-- 	     or exists (select 1 from public.srs_anti_fraud_flags u where u.capacity_point_id = p.id)
-- 	     or exists (select 1 from public.curriculum_point_automatismes u where u.point_id = p.id
-- 	                 and not (p.code = 'CE2-084' and u.grade = '5')));
-- 	if v_detail is not null then
-- 		raise exception 'rollback : usages accrochés aux points neufs : % (supprimer ces points les effacerait : arrêt, décision de David)', v_detail;
-- 	end if;
-- end $rb_garde$;
-- update public.curriculum_point_automatismes a set point_id = o.id
--   from public.curriculum_points n, public.curriculum_points o
--  where n.code = 'CE2-084' and o.code = 'CE2-020' and a.point_id = n.id and a.grade = '5';
-- delete from public.curriculum_points
--  where code in ('CP-073', 'CE1-090', 'CE1-091', 'CE2-084', 'CE2-085');
-- update public.curriculum_points set name = $pt$Connaitre dans les deux sens les tables d'addition.$pt$
--  where code in ('CP-018', 'CE1-026', 'CE2-020');
-- update public.curriculum_points set name = $pt$Connaitre dans les deux sens les tables de multiplication.$pt$
--  where code in ('CE1-027', 'CE2-021');
-- update public.curriculum_points p set display_order = r.o
--   from (select id, row_number() over (partition by grade order by display_order, code) as o
--           from public.curriculum_points where grade in ('CP', 'CE1', 'CE2')) r
--  where p.id = r.id and p.display_order <> r.o;
-- do $rb_check$
-- declare
-- 	v_n integer;
-- begin
-- 	select count(*) into v_n from public.curriculum_points
-- 	 where code in ('CP-073', 'CE1-090', 'CE1-091', 'CE2-084', 'CE2-085');
-- 	if v_n <> 0 then raise exception 'rollback : points neufs encore présents : %/5', v_n; end if;
-- 	select count(*) into v_n from public.curriculum_points
-- 	 where code in ('CP-018', 'CE1-026', 'CE1-027', 'CE2-020', 'CE2-021')
-- 	   and name like 'Connaitre dans les deux sens les tables %';
-- 	if v_n <> 5 then raise exception 'rollback : origines revenues à leur libellé : %/5', v_n; end if;
-- 	select count(*) into v_n from (
-- 		select grade from public.curriculum_points where grade in ('CP', 'CE1', 'CE2') group by grade
-- 		having count(distinct display_order) = count(*) and min(display_order) = 1 and max(display_order) = count(*)) g;
-- 	if v_n <> 3 then raise exception 'rollback : ordres d''affichage en 1..N : %/3', v_n; end if;
-- end $rb_check$;
-- ROLLBACK:END
-- ============================================================================

-- Une écriture concurrente fait échouer proprement la migration au lieu d'attendre.
set local lock_timeout = '5s';

-- ---- 1. Les scissions --------------------------------------------------------
drop table if exists pg_temp._st_scission;
create temporary table _st_scission (
	origine text primary key,
	neuf text not null unique,
	grade text not null,
	ancien_nom text not null,
	nom_origine text not null,
	nom_neuf text not null,
	ordre_avant integer
);
insert into _st_scission (origine, neuf, grade, ancien_nom, nom_origine, nom_neuf) values
  ('CP-018', 'CP-073', 'CP',
   $pt$Connaitre dans les deux sens les tables d'addition.$pt$,
   $pt$Connaître les tables d'addition : donner la somme de deux nombres (3 + 4 = ?).$pt$,
   $pt$Connaître les tables d'addition dans l'autre sens : trouver le terme manquant d'une addition (3 + ? = 7).$pt$),
  ('CE1-026', 'CE1-090', 'CE1',
   $pt$Connaitre dans les deux sens les tables d'addition.$pt$,
   $pt$Connaître les tables d'addition : donner la somme de deux nombres (3 + 4 = ?).$pt$,
   $pt$Connaître les tables d'addition dans l'autre sens : trouver le terme manquant d'une addition (3 + ? = 7).$pt$),
  ('CE2-020', 'CE2-084', 'CE2',
   $pt$Connaitre dans les deux sens les tables d'addition.$pt$,
   $pt$Connaître les tables d'addition : donner la somme de deux nombres (3 + 4 = ?).$pt$,
   $pt$Connaître les tables d'addition dans l'autre sens : trouver le terme manquant d'une addition (3 + ? = 7).$pt$),
  ('CE1-027', 'CE1-091', 'CE1',
   $pt$Connaitre dans les deux sens les tables de multiplication.$pt$,
   $pt$Connaître les tables de multiplication : donner le produit de deux nombres (3 × 4 = ?).$pt$,
   $pt$Connaître les tables de multiplication dans l'autre sens : trouver le facteur manquant d'un produit (3 × ? = 12).$pt$),
  ('CE2-021', 'CE2-085', 'CE2',
   $pt$Connaitre dans les deux sens les tables de multiplication.$pt$,
   $pt$Connaître les tables de multiplication : donner le produit de deux nombres (3 × 4 = ?).$pt$,
   $pt$Connaître les tables de multiplication dans l'autre sens : trouver le facteur manquant d'un produit (3 × ? = 12).$pt$);

-- ---- 2. Gardes : l'état attendu, sinon RIEN ne change ---------------------------
do $garde$
declare
	v_detail text;
begin
	-- 2a. les cinq origines existent, avec leur libellé actuel, leur grade et un nœud
	select string_agg(s.origine, ', ' order by s.origine) into v_detail
	  from _st_scission s
	 where not exists (
		select 1 from public.curriculum_points p
		 where p.code = s.origine and p.name = s.ancien_nom and p.grade = s.grade
		   and p.node_id is not null and p.objective_id is null and p.archived_at is null);
	if v_detail is not null then
		raise exception 'état inattendu : points d''origine absents ou modifiés : %', v_detail;
	end if;
	-- 2b. aucun usage ne s'accroche aux cinq origines
	select string_agg(s.origine, ', ' order by s.origine) into v_detail
	  from _st_scission s join public.curriculum_points p on p.code = s.origine
	 where exists (select 1 from public.question_template_points u where u.point_id = p.id)
	    or exists (select 1 from public.exercise_curriculum_points u where u.point_id = p.id)
	    or exists (select 1 from public.student_point_state u where u.point_id = p.id)
	    or exists (select 1 from public.journal_entry_points u where u.point_id = p.id)
	    or exists (select 1 from public.srs_anti_fraud_flags u where u.capacity_point_id = p.id)
	    or exists (select 1 from public.curriculum_point_automatismes u where u.point_id = p.id
	                and not (p.code = 'CE2-020' and u.grade = '5'));
	if v_detail is not null then
		raise exception 'état inattendu : usages déjà accrochés aux points à scinder : % (leur partage entre les deux sens n''est pas tranché)', v_detail;
	end if;
	-- 2c. aucun code neuf n'existe
	select string_agg(s.neuf, ', ' order by s.neuf) into v_detail
	  from _st_scission s join public.curriculum_points p on p.code = s.neuf;
	if v_detail is not null then
		raise exception 'état inattendu : codes neufs déjà pris : %', v_detail;
	end if;
	-- 2d. l'ordre d'affichage est déjà une suite 1..N dans chaque grade en jeu
	select string_agg(grade, ', ' order by grade) into v_detail
	  from (select grade from public.curriculum_points where grade in ('CP', 'CE1', 'CE2')
	         group by grade
	        having not (count(distinct display_order) = count(*) and min(display_order) = 1
	                    and max(display_order) = count(*))) g;
	if v_detail is not null then
		raise exception 'état inattendu : ordre d''affichage pas en 1..N avant la scission : %', v_detail;
	end if;
end $garde$;

-- L'ordre d'avant de chaque origine, lu une fois (les décalages se calculent dessus).
update _st_scission s set ordre_avant = p.display_order
  from public.curriculum_points p where p.code = s.origine;

-- ---- 3. Décaler : chaque point descend du nombre d'origines placées avant lui ---
update public.curriculum_points p
   set display_order = p.display_order + d.n
  from (select q.id, count(*) as n
          from public.curriculum_points q
          join _st_scission s on s.grade = q.grade and s.ordre_avant < q.display_order
         group by q.id) d
 where p.id = d.id;

-- ---- 4. Les origines deviennent le sens direct -------------------------------
update public.curriculum_points p set name = s.nom_origine
  from _st_scission s
 where p.code = s.origine and p.name = s.ancien_nom;

-- ---- 5. Les points neufs (opération à trou), juste après leur origine ---------
insert into public.curriculum_points
	(code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id,
	 objective_id, rang, archived_at)
select s.neuf, s.nom_neuf, o.kind, o.exigence, o.regime_acquisition, o.rubrique, o.grade,
       o.display_order + 1, o.node_id, o.objective_id, o.rang, o.archived_at
  from _st_scission s join public.curriculum_points o on o.code = s.origine;

-- ---- 5b. La référence d'automatisme de 5e « Compléter une addition à trou par une
--          soustraction (2 + … = 7) » vise l'opération à trou : elle passe de CE2-020 à
--          CE2-084 (option A, validée par David le 2026-10-11) -------------------------
update public.curriculum_point_automatismes a set point_id = n.id
  from public.curriculum_points o, public.curriculum_points n
 where o.code = 'CE2-020' and n.code = 'CE2-084' and a.point_id = o.id and a.grade = '5';

-- ---- 6. Vérifications (la migration échoue si le compte n'y est pas) ----------
do $check$
declare
	v_cp integer; v_ce1 integer; v_ce2 integer; v_noms integer; v_suite integer; v_ordre integer;
begin
	select count(*) into v_cp from public.curriculum_points where grade = 'CP';
	select count(*) into v_ce1 from public.curriculum_points where grade = 'CE1';
	select count(*) into v_ce2 from public.curriculum_points where grade = 'CE2';
	select count(*) into v_noms
	  from _st_scission s
	  join public.curriculum_points o on o.code = s.origine and o.name = s.nom_origine
	  join public.curriculum_points n on n.code = s.neuf and n.name = s.nom_neuf;
	-- chaque point neuf est juste après son origine, avec ses attributs
	select count(*) into v_suite
	  from _st_scission s
	  join public.curriculum_points o on o.code = s.origine
	  join public.curriculum_points n on n.code = s.neuf
	 where n.display_order = o.display_order + 1 and n.grade = o.grade and n.node_id = o.node_id
	   and n.rubrique is not distinct from o.rubrique and n.kind = o.kind
	   and n.exigence = o.exigence and n.regime_acquisition = o.regime_acquisition;
	select count(*) into v_ordre from (
		select grade, count(distinct display_order) = count(*) and min(display_order) = 1
		       and max(display_order) = count(*) as ok
		  from public.curriculum_points where grade in ('CP', 'CE1', 'CE2') group by grade) g
	 where ok;
	-- plus aucune référence d'automatisme sur les cinq origines (seule CE2-020/5e existait)
	if exists (select 1 from public.curriculum_point_automatismes a
	             join public.curriculum_points p on p.id = a.point_id
	            where p.code in ('CP-018', 'CE1-026', 'CE1-027', 'CE2-020', 'CE2-021')) then
		raise exception 'scission des tables : une référence d''automatisme reste sur un point d''origine';
	end if;
	if v_cp <> 73 or v_ce1 <> 91 or v_ce2 <> 85 or v_noms <> 5 or v_suite <> 5 or v_ordre <> 3 then
		raise exception 'scission des tables incohérente : CP=%, CE1=%, CE2=%, libellés=%/5, voisins=%/5, ordres valides=%/3',
			v_cp, v_ce1, v_ce2, v_noms, v_suite, v_ordre;
	end if;
end $check$;

drop table _st_scission;
