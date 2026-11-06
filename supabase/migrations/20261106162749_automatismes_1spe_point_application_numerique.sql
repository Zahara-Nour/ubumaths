-- ============================================================================
-- Chantier « automatismes-1spe » : point neuf 2-496 « application numérique d'une formule »,
-- puis nœud et tag du modèle neuf qui le travaille
-- ============================================================================
--   1. Point neuf 2-496 « Effectuer une application numérique d'une formule (notamment pour les
--      formules utilisées dans les autres disciplines) » : puce de la partie Automatismes du BO de
--      2de (Calcul numérique et algébrique), absente de la base. Rubrique « Automatismes > Calcul
--      numérique et algébrique », savoir-faire, attendu, fluence (comme 2-489), sur « Algèbre >
--      Calcul littéral > substitution ». Rang d'affichage 50, celui de 2-489 : à rang égal, l'ordre
--      est celui du code (2-489, 2-496, puis 2-490 au rang 51), sans renuméroter les autres points.
--   2. Références d'automatismes de 2-496 : 2, 1_SPE, 1_GEN, 1_TECHNO, T_SPE, T_COMP, T_TECHNO
--      (comme 2-273 ; le BO de Tle techno liste la même puce).
--   3. c1c9cfc3 (Application numérique d'une formule, brouillon de 2de) → « Algèbre > Calcul
--      littéral > substitution », tag 2-496 (ADR 0020 : un seul point, sur son nœud).
-- Ni le contenu, ni les niveaux, ni le statut du modèle ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Le modèle a été créé en brouillon le 2026-11-06 par scripts/create-questions.ts (lot « Calcul
-- littéral et équations », scripts/questions/automatismes-2de-calcul-litteral/
-- 01-application-numerique-formule.json), sans nœud ni tag. Point neuf, nœud et références
-- validés par David le 2026-11-06 (journal docs/wip/automatismes-1spe-progress.md). Relevé de la
-- prod du 2026-11-06 (MCP) : brouillon en {2}, sans nœud ni tag ; aucun point 2-496 ; aucun point
-- ne porte « application numérique ».
--
-- Le modèle n'existe qu'en production : en base locale, l'étape 3 ne touche rien et ses
-- vérifications le tolèrent ; les étapes 1 et 2 s'appliquent partout. Prouvé par
-- tests/integration/automatismes-1spe-point-application-numerique.test.ts, qui fabrique une copie
-- de l'identifiant de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Gardes : le code 2-496 doit être libre ; le modèle doit être encore SANS nœud et SANS aucun tag
-- (relevé du 2026-11-06), sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par
-- son chemin, résolu STRICTEMENT.
--
-- Données d'élèves : aucune (modèle en brouillon, jamais publié ; point neuf, sans suivi).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David avant le SQL, tranchée par
-- lui le 2026-11-06 : personne). Aucune règle (policy) ne change. Effet visible : un point de plus
-- au programme de 2de et dans les automatismes des niveaux rattachés (lus par les mêmes
-- personnes) ; le brouillon apparaît sous son nœud et sous son point dans l'admin.
--
-- Rollback (aucune donnée d'élève). Il retire le tag, rend le modèle sans nœud, puis supprime
-- les références et le point (aucun autre contenu ne peut l'avoir tagué entre-temps sans qu'on
-- le perde : le `delete` du point échoue alors sur sa clé étrangère). Bloc éprouvé par le test
-- d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL
-- en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('c1c9cfc3-ff82-4d7d-9df8-d32853a59bee'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p
--  where q.template_id = 'c1c9cfc3-ff82-4d7d-9df8-d32853a59bee'
--    and p.id = q.point_id and p.grade = '2' and p.code = '2-496';
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id = 'c1c9cfc3-ff82-4d7d-9df8-d32853a59bee';
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- delete from public.curriculum_point_automatismes a
--  using public.curriculum_points p
--  where p.id = a.point_id and p.code = '2-496';
-- delete from public.curriculum_points where code = '2-496';
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Point neuf 2-496 -----------------------------------------------------------
do $garde_code$
begin
	if exists (select 1 from public.curriculum_points where code = '2-496') then
		raise exception 'le code 2-496 est déjà pris';
	end if;
end $garde_code$;

insert into public.curriculum_points
	(code, grade, name, kind, exigence, regime_acquisition, rubrique, display_order, node_id)
select '2-496', '2',
	$pt$Effectuer une application numérique d'une formule (notamment pour les formules utilisées dans les autres disciplines)$pt$,
	'savoir_faire', 'attendu', 'fluence', $pt$Automatismes > Calcul numérique et algébrique$pt$, 50, s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null
   and b.name = 'Algèbre' and n.name = 'Calcul littéral' and s.name = 'substitution';

do $point$
begin
	if (select count(*) from public.curriculum_points where code = '2-496') <> 1 then
		raise exception 'point 2-496 non créé : nœud « Algèbre > Calcul littéral > substitution » introuvable';
	end if;
end $point$;

-- ---- 2. Références d'automatismes ---------------------------------------------------
insert into public.curriculum_point_automatismes (point_id, grade)
select p.id, g.grade
  from public.curriculum_points p,
       (values ('2'), ('1_SPE'), ('1_GEN'), ('1_TECHNO'), ('T_SPE'), ('T_COMP'), ('T_TECHNO')) as g(grade)
 where p.code = '2-496';

-- ---- 3. Rangement et tag du modèle (prod seulement) -----------------------------------
drop table if exists pg_temp._a1_formule;
create temporary table _a1_formule (id uuid primary key, noeud uuid, point_id uuid);
insert into _a1_formule (id, noeud, point_id)
select 'c1c9cfc3-ff82-4d7d-9df8-d32853a59bee', p.node_id, p.id
  from public.curriculum_points p where p.code = '2-496';

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et la ligne du modèle.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _a1_formule order by id;
select 1 from public.question_templates where id in (select id from _a1_formule) order by id for update;

do $garde$
declare v_ranges integer; v_tags integer;
begin
	select count(*) into v_ranges from _a1_formule r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _a1_formule r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _a1_formule r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _a1_formule r
  join public.question_templates q on q.id = r.id;

-- ---- 4. Vérifications ------------------------------------------------
do $check$
declare v_refs integer; v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_refs from public.curriculum_point_automatismes a
	  join public.curriculum_points p on p.id = a.point_id where p.code = '2-496';
	select count(*) into v_presents from _a1_formule r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _a1_formule r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _a1_formule r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _a1_formule m on m.id = q.template_id;
	if v_refs <> 7 or v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : références %/7, nœuds %/%, tags du lot %/%, tags en base %',
			v_refs, v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _a1_formule;
