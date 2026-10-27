-- ============================================================================
-- Chantier « questions-cm2 », lot 0 (changements de niveau) : 1 modèle corrigé, passé au CM2, tagué
-- ============================================================================
--   - edc5d7d4 (Trouver la moitié) : impairs de 1 à 15 (au lieu de 1 à 29), niveaux [CM1] → [CM2],
--     tag CM2-037 ; nœud (Décimaux : calculs > division) et catégorie inchangés.
-- Les 22 autres modèles du lot : migration suivante (20261028100100_questions_cm2_rangement_tags).
-- ============================================================================
-- Phase 0 validée par David le 2026-10-28 (journal docs/wip/questions-cm2-progress.md § 5).
-- Fichier GÉNÉRÉ par docs/wip/questions/lot-corrections-cm2.py — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (1 modèle). Elle est prouvée
-- par tests/integration/questions-cm2-contenu.test.ts, qui fabrique des copies des identifiants de
-- la prod (contenu, nœud, niveaux et tags) puis rejoue CE fichier.
--
-- Garde : le modèle doit avoir EXACTEMENT le contenu relevé en prod le 2026-10-28, être au nœud,
-- aux niveaux et au statut relevés, et ne porter aucun tag.
--
-- Données d'élèves : aucune (relevé du 2026-10-28 : 0 carte SRS, 0 tentative de compétence ou
-- d'évaluation, 0 réponse de test, 0 activité de journal, 0 exercice de chapitre, 0 favori).
--
-- Accès (question tranchée par David le 2026-10-28) : les élèves et le prof du CM2 voient ce modèle
-- publié ; ceux du CM1 ne le voient plus. Aucune règle (policy) ne change.
--
-- Rollback : il retire les tags posés, rend aux modèles leurs niveaux scolaires et leur contenu
-- d'avant (aucun modèle neuf). Gardes : il refuse si un modèle n'a plus EXACTEMENT le contenu
-- (empreinte md5) ou les niveaux scolaires posés par la migration. Bloc éprouvé par le test
-- d'intégration, à jouer
-- dans UNE transaction (sinon une garde qui échoue n'arrête pas la suite) :
-- `psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi :
-- ROLLBACK:BEGIN
-- do $retour$
-- declare v_intacts integer;
-- begin
-- 	perform 1 from public.question_templates where id in ('edc5d7d4-98a2-4118-8c7f-35dd510dbcd5') for update;
-- 	select count(*) into v_intacts from public.question_templates q join (values
-- 		('edc5d7d4-98a2-4118-8c7f-35dd510dbcd5'::uuid, 'a3e805d69177d102c9decdd87aaf78c6')
-- 	) as r(id, h) on r.id = q.id
-- 	 where md5(jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs)::text) = r.h;
-- 	if v_intacts <> 1 then
-- 		raise exception 'rollback : % modèle(s) sur 1 portent encore le contenu de la migration', v_intacts;
-- 	end if;
-- 	-- Origines changées de niveau scolaire : encore au niveau posé par la migration.
-- 	select count(*) into v_intacts from public.question_templates q join (values
-- 		('edc5d7d4-98a2-4118-8c7f-35dd510dbcd5'::uuid, array['CM2'])
-- 	) as r(id, grades) on r.id = q.id
-- 	 where q.grades = r.grades;
-- 	if v_intacts <> 1 then
-- 		raise exception 'rollback : % modèle(s) sur 1 sont encore au niveau scolaire de la migration', v_intacts;
-- 	end if;
-- end $retour$;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
--   ('edc5d7d4-98a2-4118-8c7f-35dd510dbcd5'::uuid, 'CM2', 'CM2-037')
--  ) as r(template_id, grade, code)
--  where q.template_id = r.template_id and p.id = q.point_id and p.grade = r.grade and p.code = r.code;
-- update public.question_templates q
--    set grades = r.grades
--   from (values
--   ('edc5d7d4-98a2-4118-8c7f-35dd510dbcd5'::uuid, array['CM1'])
--   ) as r(id, grades)
--  where q.id = r.id;
-- update public.question_templates q
--    set title = r.c->>'title', description = r.c->>'description', variations = r.c->'variations',
--        shared = nullif(r.c->'shared', 'null'::jsonb), test_specs = nullif(r.c->'test_specs', 'null'::jsonb)
--   from (values
--   ('edc5d7d4-98a2-4118-8c7f-35dd510dbcd5'::uuid, $qcm2${"title":"Trouver la moitié","description":"Nombres impairs de $1$ à $29$","variations":[{"blanks":[{"expectedAnswer":"{{b}}"}],"statement":"Quelle est la moitié du nombre ${{eval:a;d}}$ ?\n\nLa moitié de ${{eval:a;d}}$ est $?$.","variables":[{"name":"a1","expression":"0..14"},{"name":"a","expression":"eval:a1*2+1"},{"name":"b","expression":"eval:(a)/2;d"}],"correction":{"steps":["La moitié de ${{eval:a;d}}$ est ${{solution}}$ car $2 \\times {{solution:0}} = {{eval:a}}$."]}}],"shared":null,"test_specs":[{"answers":["10{,}5"],"expected":{"status":"correct"},"variables":{"a1":"10"},"description":"moitié de 21 = 10,5","variationIndex":0},{"answers":["10.5"],"expected":{"status":"correct"},"variables":{"a1":"10"},"description":"10.5 au point","variationIndex":0},{"answers":["\\frac{21}{2}"],"expected":{"status":"bad_form","constraintViolations":["form"]},"variables":{"a1":"10"},"description":"21/2 en fraction","variationIndex":0},{"answers":["10"],"expected":{"status":"incorrect"},"variables":{"a1":"10"},"description":"erreur 10","variationIndex":0},{"answers":["0{,}5"],"expected":{"status":"correct"},"variables":{"a1":"0"},"description":"moitié de 1 = 0,5","variationIndex":0}]}$qcm2$::jsonb)
--   ) as r(id, c)
--  where q.id = r.id;
-- ROLLBACK:END
-- ============================================================================

set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires -----------------------------------------------------
drop table if exists pg_temp._qcm2_modeles;
create temporary table _qcm2_modeles (
	id uuid primary key,
	branche text not null, notion text not null, sous_notion text,
	grades text[] not null,
	-- Statut relevé : les neufs en héritent (un brouillon publié depuis publierait ses neufs).
	statut text not null,
	avant jsonb not null, apres jsonb not null,
	-- Nœud d'arrivée (R2 : les points du modèle vivent ailleurs) ; null : il ne bouge pas.
	branche_apres text, notion_apres text, sous_notion_apres text,
	-- Niveaux scolaires après la migration (son vrai programme) ; null : ils ne changent pas.
	grades_apres text[]
);
insert into _qcm2_modeles values ('edc5d7d4-98a2-4118-8c7f-35dd510dbcd5', $qcm2$Nombres et calculs$qcm2$, $qcm2$Décimaux : calculs$qcm2$, $qcm2$division$qcm2$, array['CM1'], 'published',
  $qcm2${"title":"Trouver la moitié","description":"Nombres impairs de $1$ à $29$","variations":[{"blanks":[{"expectedAnswer":"{{b}}"}],"statement":"Quelle est la moitié du nombre ${{eval:a;d}}$ ?\n\nLa moitié de ${{eval:a;d}}$ est $?$.","variables":[{"name":"a1","expression":"0..14"},{"name":"a","expression":"eval:a1*2+1"},{"name":"b","expression":"eval:(a)/2;d"}],"correction":{"steps":["La moitié de ${{eval:a;d}}$ est ${{solution}}$ car $2 \\times {{solution:0}} = {{eval:a}}$."]}}],"shared":null,"test_specs":[{"answers":["10{,}5"],"expected":{"status":"correct"},"variables":{"a1":"10"},"description":"moitié de 21 = 10,5","variationIndex":0},{"answers":["10.5"],"expected":{"status":"correct"},"variables":{"a1":"10"},"description":"10.5 au point","variationIndex":0},{"answers":["\\frac{21}{2}"],"expected":{"status":"bad_form","constraintViolations":["form"]},"variables":{"a1":"10"},"description":"21/2 en fraction","variationIndex":0},{"answers":["10"],"expected":{"status":"incorrect"},"variables":{"a1":"10"},"description":"erreur 10","variationIndex":0},{"answers":["0{,}5"],"expected":{"status":"correct"},"variables":{"a1":"0"},"description":"moitié de 1 = 0,5","variationIndex":0}]}$qcm2$::jsonb,
  $qcm2${"title":"Trouver la moitié","description":"Nombres impairs de $1$ à $15$","variations":[{"blanks":[{"expectedAnswer":"{{b}}"}],"statement":"Quelle est la moitié du nombre ${{eval:a;d}}$ ?\n\nLa moitié de ${{eval:a;d}}$ est $?$.","variables":[{"name":"a1","expression":"0..7"},{"name":"a","expression":"eval:a1*2+1"},{"name":"b","expression":"eval:(a)/2;d"}],"correction":{"steps":["La moitié de ${{eval:a;d}}$ est ${{solution}}$ car $2 \\times {{solution:0}} = {{eval:a}}$."]}}],"shared":null,"test_specs":[{"answers":["4{,}5"],"expected":{"status":"correct"},"variables":{"a1":"4"},"description":"moitié de 9 = 4,5","variationIndex":0},{"answers":["4.5"],"expected":{"status":"correct"},"variables":{"a1":"4"},"description":"4.5 au point","variationIndex":0},{"answers":["\\frac{9}{2}"],"expected":{"status":"bad_form","constraintViolations":["form"]},"variables":{"a1":"4"},"description":"9/2 en fraction","variationIndex":0},{"answers":["4"],"expected":{"status":"incorrect"},"variables":{"a1":"4"},"description":"Erreur : partie entière seule","variationIndex":0},{"answers":["18"],"expected":{"status":"incorrect"},"variables":{"a1":"4"},"description":"Erreur : le double au lieu de la moitié","variationIndex":0},{"answers":["0{,}5"],"expected":{"status":"correct"},"variables":{"a1":"0"},"description":"borne : moitié de 1 = 0,5","variationIndex":0},{"answers":["7{,}5"],"expected":{"status":"correct"},"variables":{"a1":"7"},"description":"borne : moitié de 15 = 7,5","variationIndex":0}]}$qcm2$::jsonb,
  null, null, null, array['CM2']);

-- Tags des origines : ceux qu'elles portent déjà (relevé, exigés à l'identique et laissés) et ceux
-- que la migration pose.
drop table if exists pg_temp._qcm2_tags;
create temporary table _qcm2_tags (
	id uuid not null references _qcm2_modeles (id),
	tag_grade text not null, tag_code text not null,
	avant boolean not null
);
insert into _qcm2_tags values
  ('edc5d7d4-98a2-4118-8c7f-35dd510dbcd5', 'CM2', 'CM2-037', false);

-- Modèles neufs : chacun copie les autres colonnes de son origine, sauf le niveau (et le nœud
-- quand l'un de ses points vit sur une sous-notion voisine).
drop table if exists pg_temp._qcm2_neufs;
create temporary table _qcm2_neufs (
	id uuid primary key,
	origine uuid not null references _qcm2_modeles (id),
	niveau integer not null,
	contenu jsonb not null,
	-- Nœud propre (celui de son premier point) ; null : celui de l'origine.
	branche text, notion text, sous_notion text
);
drop table if exists pg_temp._qcm2_tags_neufs;
create temporary table _qcm2_tags_neufs (
	id uuid not null references _qcm2_neufs (id),
	rang integer not null,
	tag_grade text not null, tag_code text not null
);


-- ---- 2. Résolution STRICTE des nœuds et des points --------------------------------------
create temporary table _qcm2_resolus as
	select r.id, case when r.sous_notion is null then nn.id else s.id end as noeud,
	       r.branche_apres is not null as deplace,
	       case when r.branche_apres is null then case when r.sous_notion is null then nn.id else s.id end
	            when r.sous_notion_apres is null then na.id else sa.id end as noeud_apres,
	       case when r.sous_notion_apres is null then na.archived_at else sa.archived_at end as noeud_apres_archive
	  from _qcm2_modeles r
	  left join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.name = r.branche
	  left join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = r.notion
	  left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = nn.id and s.name = r.sous_notion
	  left join public.classification_nodes ba on ba.kind = 'branch' and ba.parent_id is null and ba.name = r.branche_apres
	  left join public.classification_nodes na on na.kind = 'notion' and na.parent_id = ba.id and na.name = r.notion_apres
	  left join public.classification_nodes sa on sa.kind = 'subnotion' and sa.parent_id = na.id and sa.name = r.sous_notion_apres;
create temporary table _qcm2_resolus_tags as
	select t.id, t.avant, p.id as point_id
	  from _qcm2_tags t
	  left join public.curriculum_points p on p.grade = t.tag_grade and p.code = t.tag_code and p.archived_at is null;
create temporary table _qcm2_resolus_neufs as
	select n.id, n.branche is not null as noeud_propre,
	       case when n.sous_notion is null then nn.id else s.id end as noeud,
	       case when n.sous_notion is null then nn.archived_at else s.archived_at end as noeud_archive
	  from _qcm2_neufs n
	  left join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.name = n.branche
	  left join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = n.notion
	  left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = nn.id and s.name = n.sous_notion;
create temporary table _qcm2_resolus_tags_neufs as
	select t.id, t.rang, p.id as point_id, p.node_id as noeud_du_point
	  from _qcm2_tags_neufs t
	  left join public.curriculum_points p on p.grade = t.tag_grade and p.code = t.tag_code and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from _qcm2_resolus where noeud is null or noeud_apres is null or (deplace and noeud_apres_archive is not null))
	   or exists (select 1 from _qcm2_resolus_tags where point_id is null) then
		raise exception 'nœuds ou points introuvables : %',
			(select count(*) from _qcm2_resolus where noeud is null or noeud_apres is null or (deplace and noeud_apres_archive is not null))
			+ (select count(*) from _qcm2_resolus_tags where point_id is null);
	end if;
	-- Nœud propre : actif, et celui du premier point du modèle neuf (la garde des tags n'accepte que
	-- lui ou sa notion ; un point déplacé depuis le relevé fait échouer ici, pas plus loin).
	if exists (select 1 from _qcm2_resolus_tags_neufs where point_id is null)
	   or exists (select 1 from _qcm2_resolus_neufs n
	               where n.noeud_propre
	                 and (n.noeud is null or n.noeud_archive is not null
	                      or n.noeud is distinct from (select t.noeud_du_point from _qcm2_resolus_tags_neufs t
	                                                    where t.id = n.id and t.rang = 0))) then
		raise exception 'points ou nœuds des modèles neufs introuvables : %',
			(select count(*) from _qcm2_resolus_tags_neufs where point_id is null)
			+ (select count(*) from _qcm2_resolus_neufs n
			    where n.noeud_propre
			      and (n.noeud is null or n.noeud_archive is not null
			           or n.noeud is distinct from (select t.noeud_du_point from _qcm2_resolus_tags_neufs t
			                                         where t.id = n.id and t.rang = 0)));
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, contenu, rangement et tags relevés ---------------
do $garde$
declare v_presents integer; v_contenus integer; v_ranges integer; v_tags integer; v_manquants integer; v_pris integer;
begin
	-- Verrou : aucune sauvegarde de l'éditeur ne peut s'intercaler entre la garde et la mise à jour.
	perform 1 from public.question_templates q join _qcm2_modeles r on r.id = q.id for update of q;
	select count(*) into v_presents from _qcm2_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 1) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 1', v_presents;
	end if;
	select count(*) into v_contenus from _qcm2_modeles r
	  join public.question_templates q on q.id = r.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs) is distinct from r.avant;
	if v_contenus <> 0 then
		raise exception 'modèles modifiés depuis le relevé : %', v_contenus;
	end if;
	select count(*) into v_ranges from _qcm2_modeles r
	  join _qcm2_resolus x on x.id = r.id
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is distinct from x.noeud or q.grades is distinct from r.grades
	    or q.status is distinct from r.statut;
	if v_ranges <> 0 then
		raise exception 'modèles déplacés ou reclassés depuis le relevé : %', v_ranges;
	end if;
	-- Aucun tag hors du relevé (une saisie faite depuis serait contredite), à tout niveau.
	select count(*) into v_manquants from _qcm2_resolus_tags a
	  join public.question_templates q on q.id = a.id
	 where a.avant and not exists (select 1 from public.question_template_points t
	                                where t.template_id = a.id and t.point_id = a.point_id);
	if v_manquants <> 0 then
		raise exception 'tags relevés absents : %', v_manquants;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qcm2_modeles r on r.id = q.template_id
	 where not exists (select 1 from _qcm2_resolus_tags a
	                    where a.avant and a.id = q.template_id and a.point_id = q.point_id);
	if v_tags <> 0 then
		raise exception 'tags déjà posés sur ces modèles : %', v_tags;
	end if;
	select count(*) into v_pris from _qcm2_neufs n join public.question_templates q on q.id = n.id;
	if v_pris <> 0 then
		raise exception 'identifiants des modèles neufs déjà pris : %', v_pris;
	end if;
	-- Catégorie (thème, domaine, sous-domaine de l'origine, niveau propre) : unique parmi les
	-- modèles publiés (idx_question_templates_unique_category).
	select count(*) into v_pris from _qcm2_neufs n
	  join public.question_templates o on o.id = n.origine
	  join public.question_templates q on q.status = 'published' and q.theme = o.theme and q.domain = o.domain
	   and coalesce(q.subdomain, '') = coalesce(o.subdomain, '') and q.level = n.niveau;
	if v_pris <> 0 then
		raise exception 'catégories des modèles neufs déjà prises : %', v_pris;
	end if;
end $garde$;

-- ---- 4. Nouveau contenu des origines, modèles neufs, tags ---------------------------------
update public.question_templates q
   set title = r.apres->>'title',
       description = r.apres->>'description',
       variations = r.apres->'variations',
       shared = nullif(r.apres->'shared', 'null'::jsonb),
       test_specs = nullif(r.apres->'test_specs', 'null'::jsonb)
  from _qcm2_modeles r
 where q.id = r.id;

-- R2 : les origines dont les points vivent ailleurs passent sur le nœud de leurs points, AVANT les
-- tags (le trigger des tags lit le nœud du modèle) ; elles n'ont aucun tag d'avant.
update public.question_templates q
   set classification_node_id = x.noeud_apres
  from _qcm2_resolus x
 where q.id = x.id and x.deplace;

-- Niveau scolaire : le modèle passe dans son vrai programme, AVANT ses modèles neufs (qui le
-- copient).
update public.question_templates q
   set grades = r.grades_apres
  from _qcm2_modeles r
 where q.id = r.id and r.grades_apres is not null;

insert into public.question_template_points (template_id, point_id)
select x.id, x.point_id
  from _qcm2_resolus_tags x
  join public.question_templates q on q.id = x.id
 where not x.avant;

-- Modèles neufs : toutes les colonnes de l'origine (type, options, nœud, niveaux scolaires, statut,
-- auteur…), puis leur propre identifiant, leur niveau dans la catégorie, leur contenu, leur nœud s'il
-- est propre et des dates neuves. Rien n'est créé si l'origine est absente.
insert into public.question_templates
select (jsonb_populate_record(null::public.question_templates,
	to_jsonb(q) || n.contenu
	  || jsonb_build_object('id', n.id, 'level', n.niveau, 'created_at', now(), 'updated_at', now())
	  || case when x.noeud_propre then jsonb_build_object('classification_node_id', x.noeud) else '{}'::jsonb end)).*
  from _qcm2_neufs n
  join _qcm2_resolus_neufs x on x.id = n.id
  join public.question_templates q on q.id = n.origine;

insert into public.question_template_points (template_id, point_id)
select x.id, x.point_id
  from _qcm2_resolus_tags_neufs x
  join public.question_templates q on q.id = x.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_ok integer; v_tags integer; v_tous integer; v_neufs integer; v_neufs_tags integer; v_neufs_tous integer;
begin
	select count(*) into v_presents from _qcm2_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_ok from _qcm2_modeles r
	  join _qcm2_resolus x on x.id = r.id
	  join public.question_templates q on q.id = r.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs) = r.apres and q.classification_node_id = x.noeud_apres
   and q.grades = coalesce(r.grades_apres, r.grades);
	select count(*) into v_tags from _qcm2_resolus_tags x
	  join public.question_template_points q on q.template_id = x.id and q.point_id = x.point_id;
	select count(*) into v_tous from public.question_template_points q join _qcm2_modeles r on r.id = q.template_id;
	if v_ok <> v_presents or v_tags <> v_tous or v_tags <> least(v_presents, 1) * 1 then
		raise exception 'lot incohérent : contenus %/%, tags %/%', v_ok, v_presents, v_tags, v_tous;
	end if;
	select count(*) into v_neufs from _qcm2_neufs n
	  join _qcm2_resolus_neufs x on x.id = n.id
	  join public.question_templates q on q.id = n.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs) = n.contenu
	   and (not x.noeud_propre or q.classification_node_id = x.noeud);
	select count(*) into v_neufs_tags from _qcm2_resolus_tags_neufs x
	  join public.question_template_points q on q.template_id = x.id and q.point_id = x.point_id;
	select count(*) into v_neufs_tous from public.question_template_points q join _qcm2_neufs n on n.id = q.template_id;
	if v_neufs <> least(v_presents, 1) * 0 or v_neufs_tags <> least(v_presents, 1) * 0 or v_neufs_tous <> v_neufs_tags then
		raise exception 'modèles neufs incohérents : contenus %, tags %', v_neufs, v_neufs_tags;
	end if;
end $check$;

drop table pg_temp._qcm2_resolus_tags_neufs;
drop table pg_temp._qcm2_resolus_neufs;
drop table pg_temp._qcm2_resolus_tags;
drop table pg_temp._qcm2_resolus;
drop table pg_temp._qcm2_tags_neufs;
drop table pg_temp._qcm2_neufs;
drop table pg_temp._qcm2_tags;
drop table pg_temp._qcm2_modeles;
