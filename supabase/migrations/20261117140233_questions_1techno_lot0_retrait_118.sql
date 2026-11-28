-- ============================================================================
-- 1re techno, lot 0 : retrait du point 1TECHNO-118 et du niveau 1_TECHNO sur 2 modèles
-- ============================================================================
--   ⚠️ MIGRATION DESTRUCTIVE (retrait de 2 tags et d'un niveau). Ce qui est perdu : les modèles
--   1239554b et 79d69593 (« Calculer un terme », 1re spé) ne sont plus rangés en 1re technologique :
--   ils sortent du catalogue et du cahier de texte de 1re techno, et ne comptent plus pour le point
--   1TECHNO-118. Rien d'autre : ils restent publiés, en 1re spé, avec leur tag 1SPE-377 ; contenu,
--   nœud, statut et `updated_at` ne bougent pas.
-- ============================================================================
-- Chantier `questions-1techno` (journal docs/wip/questions-1techno-progress.md, § 2.1, 6, 7, 8).
-- Pourquoi : leur variation v1 (`u(n+1) = b·u(n) + c`, `b` et `u0` signés, seule garde
-- `b ≠ 1 ou c ≠ 0`) tire, quand `c = 0`, une suite géométrique de raison ou de premier terme
-- négatif ; la borne de 1re techno n'admet que des termes strictement positifs. Décision de David
-- (Q3 = a, 2026-11-17) : retirer le tag 1TECHNO et `1_TECHNO`, sans toucher au modèle de 1re spé.
-- Le point 1TECHNO-118 garde f36ce3ff (vérifié : la migration refuse s'il perdait son dernier
-- modèle publié ; f36ce3ff est verrouillé pendant la migration). Le brouillon 0495289a, lui aussi
-- tagué 1TECHNO-118, n'est pas touché (hors lot, relu à sa publication).
--
-- Relevé de la prod du 2026-11-17 (MCP) : les deux modèles ont `grades = {1_SPE,1_TECHNO}`, les
-- tags 1SPE-377 et 1TECHNO-118, aucune tentative, carte, entrée de journal ni question
-- d'évaluation.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche rien et ses
-- vérifications le tolèrent ; elle exige TOUT ou RIEN (2 modèles). Elle est prouvée par
-- tests/integration/questions-1techno-lot0-retrait-118.test.ts, qui fabrique des copies portant
-- les vrais identifiants, puis rejoue CE fichier.
--
-- Niveaux : la migration ne RETIRE que `1_TECHNO` (`array_remove`), jamais une affectation complète
-- de `grades` (accord entre sessions du 2026-11-17 : chacun ne touche que son niveau).
--
-- Données d'élèves : aucune n'est modifiée. Garde : la migration refuse si une tentative ou une
-- carte de révision existe sur ces deux modèles (le relevé du jour en compte 0).
--
-- Accès : aucune règle (policy) ne change. Question en miroir (« qui ne pourra plus lire ce qu'il
-- lisait ? ») : personne ne perd l'accès à une donnée ; un professeur de 1re techno ne trouve plus
-- ces deux modèles sous le niveau et le point de 1re techno (il les trouve toujours en 1re spé).
--
-- Rollback (aucune donnée d'élève). Il repose le tag 1TECHNO-118 et `1_TECHNO` (ajouté en fin de
-- `grades`, comme au relevé). Garde : il refuse si un modèle a déjà `1_TECHNO` ou un point 1TECHNO,
-- ou si le tag n'a pas pu être reposé sur les deux. Les tags reposés ont un `created_at` neuf.
-- Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._q1tl0_retour;
-- create temporary table _q1tl0_retour (id uuid primary key);
-- insert into _q1tl0_retour values
-- 	('1239554b-d442-4be6-8867-d9dc38311999'),
-- 	('79d69593-e815-496c-b429-637a1cd68b4d');
-- select 1 from public.question_templates where id in (select id from _q1tl0_retour) order by id for update;
-- do $rollback$
-- declare v_presents integer; v_sans integer; v_deja text; v_tags integer;
-- begin
-- 	select count(*), count(*) filter (where not ('1_TECHNO' = any(q.grades)))
-- 	  into v_presents, v_sans
-- 	  from _q1tl0_retour r join public.question_templates q on q.id = r.id;
-- 	if v_presents = 0 then
-- 		return;
-- 	end if;
-- 	if v_presents <> 2 then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 2', v_presents;
-- 	end if;
-- 	if v_sans <> 2 then
-- 		raise exception 'rollback : 1_TECHNO reposé depuis la migration : % sur 2 sans lui', v_sans;
-- 	end if;
-- 	select string_agg(left(r.id::text, 8) || ' (' || p.code || ')', ', ') into v_deja
-- 	  from _q1tl0_retour r
-- 	  join public.question_template_points t on t.template_id = r.id
-- 	  join public.curriculum_points p on p.id = t.point_id
-- 	 where p.grade = '1_TECHNO';
-- 	if v_deja is not null then
-- 		raise exception 'rollback : point 1TECHNO posé depuis la migration : %', v_deja;
-- 	end if;
-- 	insert into public.question_template_points (template_id, point_id)
-- 	select r.id, p.id
-- 	  from _q1tl0_retour r
-- 	  join public.curriculum_points p on p.code = '1TECHNO-118' and p.archived_at is null;
-- 	get diagnostics v_tags = row_count;
-- 	if v_tags <> 2 then
-- 		raise exception 'rollback : tag 1TECHNO-118 reposé sur % modèle(s) sur 2', v_tags;
-- 	end if;
-- 	alter table public.question_templates disable trigger update_question_templates_updated_at;
-- 	update public.question_templates q set grades = array_append(q.grades, '1_TECHNO')
-- 	  from _q1tl0_retour r where q.id = r.id;
-- 	alter table public.question_templates enable trigger update_question_templates_updated_at;
-- end $rollback$;
-- drop table _q1tl0_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les lignes des modèles sont verrouillées une à une.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._q1tl0_modeles;
create temporary table _q1tl0_modeles (id uuid primary key);
insert into _q1tl0_modeles values
	('1239554b-d442-4be6-8867-d9dc38311999'),
	('79d69593-e815-496c-b429-637a1cd68b4d');

-- f36ce3ff (garde du point 118) est verrouillé aussi : il ne peut pas être dépublié pendant le retrait.
select 1 from public.question_templates
 where id in (select id from _q1tl0_modeles) or id = 'f36ce3ff-9ae5-435e-b6c2-affe0ad902ec'
 order by id for update;

-- ---- 2. Gardes : présence TOUT ou RIEN, état du relevé, 118 garde un modèle ----------
do $garde$
declare v_presents integer; v_niveau integer; v_tags integer; v_autres integer; v_eleves integer;
begin
	select count(*), count(*) filter (where '1_TECHNO' = any(q.grades))
	  into v_presents, v_niveau
	  from _q1tl0_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	if v_presents <> 2 then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 2', v_presents;
	end if;
	if v_niveau <> 2 then
		raise exception 'niveau 1_TECHNO absent : % sur 2 avec lui', v_niveau;
	end if;
	select count(*) into v_tags
	  from _q1tl0_modeles r
	  join public.question_template_points t on t.template_id = r.id
	  join public.curriculum_points p on p.id = t.point_id and p.code = '1TECHNO-118' and p.archived_at is null;
	if v_tags <> 2 then
		raise exception 'tag 1TECHNO-118 absent : % sur 2', v_tags;
	end if;
	select count(*) into v_autres
	  from public.question_template_points t
	  join public.curriculum_points p on p.id = t.point_id and p.code = '1TECHNO-118' and p.archived_at is null
	  join public.question_templates q on q.id = t.template_id and q.status = 'published'
	 where t.template_id not in (select id from _q1tl0_modeles);
	if v_autres = 0 then
		raise exception 'le point 1TECHNO-118 perdrait son dernier modèle publié';
	end if;
	select (select count(*) from public.skill_attempts where template_id in (select id from _q1tl0_modeles))
	     + (select count(*) from public.srs_cards where template_id in (select id from _q1tl0_modeles))
	  into v_eleves;
	if v_eleves <> 0 then
		raise exception 'données d''élèves sur le lot : % tentative(s) ou carte(s) ; relevé à refaire', v_eleves;
	end if;
end $garde$;

-- ---- 3. Retrait du tag et du niveau ---------------------------------------------------
-- (en base locale, aucun modèle : rien n'est touché). Le trigger est coupé AVANT toute écriture :
-- une attente de verrou échoue donc avant le retrait des tags.
alter table public.question_templates disable trigger update_question_templates_updated_at;

delete from public.question_template_points t
 using _q1tl0_modeles r, public.curriculum_points p
 where p.code = '1TECHNO-118' and p.archived_at is null and t.template_id = r.id and t.point_id = p.id;

update public.question_templates q set grades = array_remove(q.grades, '1_TECHNO')
  from _q1tl0_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

-- ---- 4. Vérification : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_niveau integer; v_tags integer;
begin
	select count(*), count(*) filter (where '1_TECHNO' = any(q.grades))
	  into v_presents, v_niveau
	  from _q1tl0_modeles r join public.question_templates q on q.id = r.id;
	if v_presents = 0 then
		return;
	end if;
	select count(*) into v_tags
	  from _q1tl0_modeles r
	  join public.question_template_points t on t.template_id = r.id
	  join public.curriculum_points p on p.id = t.point_id and p.grade = '1_TECHNO';
	if v_niveau <> 0 or v_tags <> 0 then
		raise exception 'lot incohérent : % modèle(s) avec 1_TECHNO, % tag(s) 1TECHNO restant(s)', v_niveau, v_tags;
	end if;
end $check$;

drop table _q1tl0_modeles;
