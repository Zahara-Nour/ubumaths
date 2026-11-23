-- ============================================================================
-- Chantier « questions-cm1 », lot 0 (corrections) : 2 modèles corrigés, passés du CM1 au CM2
-- ============================================================================
--   - edc5d7d4 (Trouver la moitié) : impairs de 1 à 15 (au lieu de 29), niveau CM2, tag CM2-037 ;
--   - 322f3479 (Forme décimale d'une fraction) : les fractions du point (1/10, 1/100, 1/1 000, 1/2,
--     1/4, 3/4, 3/2, 4/2, 5/2), niveau CM2, tag CM2-039.
-- Nœuds inchangés. Les 24 autres modèles du lot (niveaux, tags, nœuds, statut) sont dans la
-- migration suivante (20261028100100_questions_cm1_rangement_tags).
-- ============================================================================
-- Phase 0 validée par David le 2026-10-28 (journal docs/wip/questions-cm1-progress.md § 5).
-- Fichier GÉNÉRÉ par docs/wip/questions/lot-corrections-cm1.py — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (2 modèles). Elle est prouvée
-- par tests/integration/questions-cm1-contenu.test.ts, qui fabrique des copies des identifiants de
-- la prod (contenu, nœud, niveaux et tags) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit avoir EXACTEMENT le contenu relevé en prod le 2026-10-28, être au nœud,
-- aux niveaux et au statut relevés, et ne porter aucun tag.
--
-- Données d'élèves : aucune (relevé du 2026-10-28 : 0 carte SRS, 0 tentative de compétence ou
-- d'évaluation, 0 réponse de test, 0 activité de journal, 0 exercice, série ou fiche de chapitre,
-- 0 favori).
--
-- Accès : personne ne gagne d'accès (question tranchée par David le 2026-10-28). Aucune règle ne
-- change ; effet visible : les 2 modèles, publiés, quittent le CM1 pour le CM2, où leurs élèves
-- tirent les nouvelles variables et lisent le nouveau corrigé.
--
-- Rollback : il rend aux modèles leur contenu d'avant (aucun modèle neuf, aucun tag posé). Garde :
-- il refuse si un modèle n'a plus EXACTEMENT le contenu posé par la migration (empreinte md5).
-- Bloc éprouvé par le test d'intégration, à jouer
-- dans UNE transaction (sinon une garde qui échoue n'arrête pas la suite) :
-- `psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi :
-- ROLLBACK:BEGIN
-- do $retour$
-- declare v_intacts integer;
-- begin
-- 	perform 1 from public.question_templates where id in ('322f3479-0120-4a6d-839a-4e8df194f99e', 'edc5d7d4-98a2-4118-8c7f-35dd510dbcd5') for update;
-- 	select count(*) into v_intacts from public.question_templates q join (values
-- 		('322f3479-0120-4a6d-839a-4e8df194f99e'::uuid, 'b02851b59d524e7335a585e1f42fd39f'),
-- 		('edc5d7d4-98a2-4118-8c7f-35dd510dbcd5'::uuid, 'd574248f4e438f55404da246d7826b38')
-- 	) as r(id, h) on r.id = q.id
-- 	 where md5(jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs)::text) = r.h;
-- 	if v_intacts <> 2 then
-- 		raise exception 'rollback : % modèle(s) sur 2 portent encore le contenu de la migration', v_intacts;
-- 	end if;
-- 	-- Origines changées de niveau scolaire : encore au niveau posé par la migration.
-- 	select count(*) into v_intacts from public.question_templates q join (values
-- 		('322f3479-0120-4a6d-839a-4e8df194f99e'::uuid, array['CM2']),
-- 		('edc5d7d4-98a2-4118-8c7f-35dd510dbcd5'::uuid, array['CM2'])
-- 	) as r(id, grades) on r.id = q.id
-- 	 where q.grades = r.grades;
-- 	if v_intacts <> 2 then
-- 		raise exception 'rollback : % modèle(s) sur 2 sont encore au niveau scolaire de la migration', v_intacts;
-- 	end if;
-- end $retour$;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
--   ('322f3479-0120-4a6d-839a-4e8df194f99e'::uuid, 'CM2', 'CM2-039'),
--   ('edc5d7d4-98a2-4118-8c7f-35dd510dbcd5'::uuid, 'CM2', 'CM2-037')
--  ) as r(template_id, grade, code)
--  where q.template_id = r.template_id and p.id = q.point_id and p.grade = r.grade and p.code = r.code;
-- update public.question_templates q
--    set grades = r.grades
--   from (values
--   ('322f3479-0120-4a6d-839a-4e8df194f99e'::uuid, array['CM1']),
--   ('edc5d7d4-98a2-4118-8c7f-35dd510dbcd5'::uuid, array['CM1'])
--   ) as r(id, grades)
--  where q.id = r.id;
-- update public.question_templates q
--    set title = r.c->>'title', description = r.c->>'description', variations = r.c->'variations',
--        shared = nullif(r.c->'shared', 'null'::jsonb), test_specs = nullif(r.c->'test_specs', 'null'::jsonb)
--   from (values
--   ('322f3479-0120-4a6d-839a-4e8df194f99e'::uuid, $qcm1${"title":"Déterminer la forme décimale d'une fraction","description":"Cas à connaître par cœur","variations":[{"blanks":[{"expectedAnswer":"{{eval:{{expression1}};d}}"}],"statement":"Écris la forme décimale de la fraction\n\n$${{expression1}}$$","variables":[{"name":"a","expression":"1/2|1/4|1/10|2/10|3/2|5/2|1/100|2/1000|7/2|9/2"},{"name":"expression1","expression":"a"}],"correction":{"steps":["**Fraction décimale.** Quand le dénominateur est $10$, $100$ ou $1000$, il donne le rang du dernier chiffre du numérateur : les dixièmes pour $10$, les centièmes pour $100$, les millièmes pour $1000$. Si le dénominateur n'est pas $10$, $100$ ou $1000$, on cherche d'abord une fraction égale qui a un de ces dénominateurs.","{{if:1000*a=500|Le dénominateur $2$ n'est pas $10$, $100$ ou $1000$. Comme $2 \\times \\textcolor{{{color:primary.1}}}{5} = 10$, on multiplie le numérateur et le dénominateur par $\\textcolor{{{color:primary.1}}}{5}$. Le dénominateur est $\\textcolor{{{color:primary.1}}}{10}$ : le chiffre $\\textcolor{{{color:primary.0}}}{5}$ se place au rang des $\\textcolor{{{color:primary.1}}}{\\text{dixièmes}}$. Il n'y a pas d'unités : on écrit $0$ avant la virgule.|}}{{if:1000*a=250|Le dénominateur $4$ n'est pas $10$, $100$ ou $1000$. Comme $4 \\times \\textcolor{{{color:primary.1}}}{25} = 100$, on multiplie le numérateur et le dénominateur par $\\textcolor{{{color:primary.1}}}{25}$. Le dénominateur est $\\textcolor{{{color:primary.1}}}{100}$ : le dernier chiffre de $25$, $\\textcolor{{{color:primary.0}}}{5}$, se place au rang des $\\textcolor{{{color:primary.1}}}{\\text{centièmes}}$. Il n'y a pas d'unités : on écrit $0$ avant la virgule.|}}{{if:1000*a=100|Le dénominateur est $\\textcolor{{{color:primary.1}}}{10}$ : le chiffre $\\textcolor{{{color:primary.0}}}{1}$ se place au rang des $\\textcolor{{{color:primary.1}}}{\\text{dixièmes}}$. Il n'y a pas d'unités : on écrit $0$ avant la virgule.|}}{{if:1000*a=200|Le dénominateur est $\\textcolor{{{color:primary.1}}}{10}$ : le chiffre $\\textcolor{{{color:primary.0}}}{2}$ se place au rang des $\\textcolor{{{color:primary.1}}}{\\text{dixièmes}}$. Il n'y a pas d'unités : on écrit $0$ avant la virgule.|}}{{if:1000*a=1500|Le dénominateur $2$ n'est pas $10$, $100$ ou $1000$. Comme $2 \\times \\textcolor{{{color:primary.1}}}{5} = 10$, on multiplie le numérateur et le dénominateur par $\\textcolor{{{color:primary.1}}}{5}$. Le dénominateur est $\\textcolor{{{color:primary.1}}}{10}$ : le dernier chiffre de $15$, $\\textcolor{{{color:primary.0}}}{5}$, se place au rang des $\\textcolor{{{color:primary.1}}}{\\text{dixièmes}}$.|}}{{if:1000*a=2500|Le dénominateur $2$ n'est pas $10$, $100$ ou $1000$. Comme $2 \\times \\textcolor{{{color:primary.1}}}{5} = 10$, on multiplie le numérateur et le dénominateur par $\\textcolor{{{color:primary.1}}}{5}$. Le dénominateur est $\\textcolor{{{color:primary.1}}}{10}$ : le dernier chiffre de $25$, $\\textcolor{{{color:primary.0}}}{5}$, se place au rang des $\\textcolor{{{color:primary.1}}}{\\text{dixièmes}}$.|}}{{if:1000*a=10|Le dénominateur est $\\textcolor{{{color:primary.1}}}{100}$ : le chiffre $\\textcolor{{{color:primary.0}}}{1}$ se place au rang des $\\textcolor{{{color:primary.1}}}{\\text{centièmes}}$. Il n'y a pas d'unités : on écrit $0$ avant la virgule. Il manque des chiffres entre la virgule et ce rang : on les remplace par des $\\textcolor{{{color:primary.1}}}{0}$.|}}{{if:1000*a=2|Le dénominateur est $\\textcolor{{{color:primary.1}}}{1000}$ : le chiffre $\\textcolor{{{color:primary.0}}}{2}$ se place au rang des $\\textcolor{{{color:primary.1}}}{\\text{millièmes}}$. Il n'y a pas d'unités : on écrit $0$ avant la virgule. Il manque des chiffres entre la virgule et ce rang : on les remplace par des $\\textcolor{{{color:primary.1}}}{0}$.|}}{{if:1000*a=3500|Le dénominateur $2$ n'est pas $10$, $100$ ou $1000$. Comme $2 \\times \\textcolor{{{color:primary.1}}}{5} = 10$, on multiplie le numérateur et le dénominateur par $\\textcolor{{{color:primary.1}}}{5}$. Le dénominateur est $\\textcolor{{{color:primary.1}}}{10}$ : le dernier chiffre de $35$, $\\textcolor{{{color:primary.0}}}{5}$, se place au rang des $\\textcolor{{{color:primary.1}}}{\\text{dixièmes}}$.|}}{{if:1000*a=4500|Le dénominateur $2$ n'est pas $10$, $100$ ou $1000$. Comme $2 \\times \\textcolor{{{color:primary.1}}}{5} = 10$, on multiplie le numérateur et le dénominateur par $\\textcolor{{{color:primary.1}}}{5}$. Le dénominateur est $\\textcolor{{{color:primary.1}}}{10}$ : le dernier chiffre de $45$, $\\textcolor{{{color:primary.0}}}{5}$, se place au rang des $\\textcolor{{{color:primary.1}}}{\\text{dixièmes}}$.|}}","{{if:1000*a=500|$$\\begin{align} \\dfrac{1}{2} &= \\dfrac{1 \\times \\textcolor{{{color:primary.1}}}{5}}{2 \\times \\textcolor{{{color:primary.1}}}{5}} \\\\ &= \\dfrac{5}{10} \\\\ &= {{solution}} \\end{align}$$|}}{{if:1000*a=250|$$\\begin{align} \\dfrac{1}{4} &= \\dfrac{1 \\times \\textcolor{{{color:primary.1}}}{25}}{4 \\times \\textcolor{{{color:primary.1}}}{25}} \\\\ &= \\dfrac{25}{100} \\\\ &= {{solution}} \\end{align}$$|}}{{if:1000*a=100|$$\\begin{align} \\dfrac{1}{10} &= {{solution}} \\end{align}$$|}}{{if:1000*a=200|$$\\begin{align} \\dfrac{2}{10} &= {{solution}} \\end{align}$$|}}{{if:1000*a=1500|$$\\begin{align} \\dfrac{3}{2} &= \\dfrac{3 \\times \\textcolor{{{color:primary.1}}}{5}}{2 \\times \\textcolor{{{color:primary.1}}}{5}} \\\\ &= \\dfrac{15}{10} \\\\ &= {{solution}} \\end{align}$$|}}{{if:1000*a=2500|$$\\begin{align} \\dfrac{5}{2} &= \\dfrac{5 \\times \\textcolor{{{color:primary.1}}}{5}}{2 \\times \\textcolor{{{color:primary.1}}}{5}} \\\\ &= \\dfrac{25}{10} \\\\ &= {{solution}} \\end{align}$$|}}{{if:1000*a=10|$$\\begin{align} \\dfrac{1}{100} &= {{solution}} \\end{align}$$|}}{{if:1000*a=2|$$\\begin{align} \\dfrac{2}{1000} &= {{solution}} \\end{align}$$|}}{{if:1000*a=3500|$$\\begin{align} \\dfrac{7}{2} &= \\dfrac{7 \\times \\textcolor{{{color:primary.1}}}{5}}{2 \\times \\textcolor{{{color:primary.1}}}{5}} \\\\ &= \\dfrac{35}{10} \\\\ &= {{solution}} \\end{align}$$|}}{{if:1000*a=4500|$$\\begin{align} \\dfrac{9}{2} &= \\dfrac{9 \\times \\textcolor{{{color:primary.1}}}{5}}{2 \\times \\textcolor{{{color:primary.1}}}{5}} \\\\ &= \\dfrac{45}{10} \\\\ &= {{solution}} \\end{align}$$|}}"]}}],"shared":null,"test_specs":[{"answers":["0.5"],"expected":{"status":"correct"},"variables":{"a":"1/2"},"description":"un demi","variationIndex":0},{"answers":["3{,}5"],"expected":{"status":"correct"},"variables":{"a":"7/2"},"description":"sept demis, virgule","variationIndex":0},{"answers":["4.5"],"expected":{"status":"correct"},"variables":{"a":"9/2"},"description":"neuf demis","variationIndex":0},{"answers":["0.25"],"expected":{"status":"correct"},"variables":{"a":"1/4"},"description":"un quart","variationIndex":0},{"answers":["1.2"],"expected":{"status":"incorrect"},"variables":{"a":"1/2"},"description":"confusion 1/2 = 1,2","variationIndex":0},{"answers":["0.4"],"expected":{"status":"incorrect"},"variables":{"a":"1/4"},"description":"confusion 1/4 = 0,4","variationIndex":0},{"answers":["\\frac{1}{4}"],"expected":{"status":"bad_form","constraintViolations":["form"]},"variables":{"a":"1/4"},"description":"recopie de la fraction","variationIndex":0},{"answers":["0.002"],"expected":{"status":"correct"},"variables":{"a":"2/1000"},"description":"millièmes","variationIndex":0},{"answers":["0.02"],"expected":{"status":"incorrect"},"variables":{"a":"2/1000"},"description":"millièmes mal placés","variationIndex":0}]}$qcm1$::jsonb),
--   ('edc5d7d4-98a2-4118-8c7f-35dd510dbcd5'::uuid, $qcm1${"title":"Trouver la moitié","description":"Nombres impairs de $1$ à $29$","variations":[{"blanks":[{"expectedAnswer":"{{b}}"}],"statement":"Quelle est la moitié du nombre ${{eval:a;d}}$ ?\n\nLa moitié de ${{eval:a;d}}$ est $?$.","variables":[{"name":"a1","expression":"0..14"},{"name":"a","expression":"eval:a1*2+1"},{"name":"b","expression":"eval:(a)/2;d"}],"correction":{"steps":["La moitié de ${{eval:a;d}}$ est ${{solution}}$ car $2 \\times {{solution:0}} = {{eval:a}}$."]}}],"shared":null,"test_specs":[{"answers":["10{,}5"],"expected":{"status":"correct"},"variables":{"a1":"10"},"description":"moitié de 21 = 10,5","variationIndex":0},{"answers":["10.5"],"expected":{"status":"correct"},"variables":{"a1":"10"},"description":"10.5 au point","variationIndex":0},{"answers":["\\frac{21}{2}"],"expected":{"status":"bad_form","constraintViolations":["form"]},"variables":{"a1":"10"},"description":"21/2 en fraction","variationIndex":0},{"answers":["10"],"expected":{"status":"incorrect"},"variables":{"a1":"10"},"description":"erreur 10","variationIndex":0},{"answers":["0{,}5"],"expected":{"status":"correct"},"variables":{"a1":"0"},"description":"moitié de 1 = 0,5","variationIndex":0}]}$qcm1$::jsonb)
--   ) as r(id, c)
--  where q.id = r.id;
-- ROLLBACK:END
-- ============================================================================

set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires -----------------------------------------------------
drop table if exists pg_temp._qcm1_modeles;
create temporary table _qcm1_modeles (
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
insert into _qcm1_modeles values ('322f3479-0120-4a6d-839a-4e8df194f99e', $qcm1$Nombres et calculs$qcm1$, $qcm1$Fractions : sens et écritures$qcm1$, $qcm1$forme décimale$qcm1$, array['CM1'], 'published',
  $qcm1${"title":"Déterminer la forme décimale d'une fraction","description":"Cas à connaître par cœur","variations":[{"blanks":[{"expectedAnswer":"{{eval:{{expression1}};d}}"}],"statement":"Écris la forme décimale de la fraction\n\n$${{expression1}}$$","variables":[{"name":"a","expression":"1/2|1/4|1/10|2/10|3/2|5/2|1/100|2/1000|7/2|9/2"},{"name":"expression1","expression":"a"}],"correction":{"steps":["**Fraction décimale.** Quand le dénominateur est $10$, $100$ ou $1000$, il donne le rang du dernier chiffre du numérateur : les dixièmes pour $10$, les centièmes pour $100$, les millièmes pour $1000$. Si le dénominateur n'est pas $10$, $100$ ou $1000$, on cherche d'abord une fraction égale qui a un de ces dénominateurs.","{{if:1000*a=500|Le dénominateur $2$ n'est pas $10$, $100$ ou $1000$. Comme $2 \\times \\textcolor{{{color:primary.1}}}{5} = 10$, on multiplie le numérateur et le dénominateur par $\\textcolor{{{color:primary.1}}}{5}$. Le dénominateur est $\\textcolor{{{color:primary.1}}}{10}$ : le chiffre $\\textcolor{{{color:primary.0}}}{5}$ se place au rang des $\\textcolor{{{color:primary.1}}}{\\text{dixièmes}}$. Il n'y a pas d'unités : on écrit $0$ avant la virgule.|}}{{if:1000*a=250|Le dénominateur $4$ n'est pas $10$, $100$ ou $1000$. Comme $4 \\times \\textcolor{{{color:primary.1}}}{25} = 100$, on multiplie le numérateur et le dénominateur par $\\textcolor{{{color:primary.1}}}{25}$. Le dénominateur est $\\textcolor{{{color:primary.1}}}{100}$ : le dernier chiffre de $25$, $\\textcolor{{{color:primary.0}}}{5}$, se place au rang des $\\textcolor{{{color:primary.1}}}{\\text{centièmes}}$. Il n'y a pas d'unités : on écrit $0$ avant la virgule.|}}{{if:1000*a=100|Le dénominateur est $\\textcolor{{{color:primary.1}}}{10}$ : le chiffre $\\textcolor{{{color:primary.0}}}{1}$ se place au rang des $\\textcolor{{{color:primary.1}}}{\\text{dixièmes}}$. Il n'y a pas d'unités : on écrit $0$ avant la virgule.|}}{{if:1000*a=200|Le dénominateur est $\\textcolor{{{color:primary.1}}}{10}$ : le chiffre $\\textcolor{{{color:primary.0}}}{2}$ se place au rang des $\\textcolor{{{color:primary.1}}}{\\text{dixièmes}}$. Il n'y a pas d'unités : on écrit $0$ avant la virgule.|}}{{if:1000*a=1500|Le dénominateur $2$ n'est pas $10$, $100$ ou $1000$. Comme $2 \\times \\textcolor{{{color:primary.1}}}{5} = 10$, on multiplie le numérateur et le dénominateur par $\\textcolor{{{color:primary.1}}}{5}$. Le dénominateur est $\\textcolor{{{color:primary.1}}}{10}$ : le dernier chiffre de $15$, $\\textcolor{{{color:primary.0}}}{5}$, se place au rang des $\\textcolor{{{color:primary.1}}}{\\text{dixièmes}}$.|}}{{if:1000*a=2500|Le dénominateur $2$ n'est pas $10$, $100$ ou $1000$. Comme $2 \\times \\textcolor{{{color:primary.1}}}{5} = 10$, on multiplie le numérateur et le dénominateur par $\\textcolor{{{color:primary.1}}}{5}$. Le dénominateur est $\\textcolor{{{color:primary.1}}}{10}$ : le dernier chiffre de $25$, $\\textcolor{{{color:primary.0}}}{5}$, se place au rang des $\\textcolor{{{color:primary.1}}}{\\text{dixièmes}}$.|}}{{if:1000*a=10|Le dénominateur est $\\textcolor{{{color:primary.1}}}{100}$ : le chiffre $\\textcolor{{{color:primary.0}}}{1}$ se place au rang des $\\textcolor{{{color:primary.1}}}{\\text{centièmes}}$. Il n'y a pas d'unités : on écrit $0$ avant la virgule. Il manque des chiffres entre la virgule et ce rang : on les remplace par des $\\textcolor{{{color:primary.1}}}{0}$.|}}{{if:1000*a=2|Le dénominateur est $\\textcolor{{{color:primary.1}}}{1000}$ : le chiffre $\\textcolor{{{color:primary.0}}}{2}$ se place au rang des $\\textcolor{{{color:primary.1}}}{\\text{millièmes}}$. Il n'y a pas d'unités : on écrit $0$ avant la virgule. Il manque des chiffres entre la virgule et ce rang : on les remplace par des $\\textcolor{{{color:primary.1}}}{0}$.|}}{{if:1000*a=3500|Le dénominateur $2$ n'est pas $10$, $100$ ou $1000$. Comme $2 \\times \\textcolor{{{color:primary.1}}}{5} = 10$, on multiplie le numérateur et le dénominateur par $\\textcolor{{{color:primary.1}}}{5}$. Le dénominateur est $\\textcolor{{{color:primary.1}}}{10}$ : le dernier chiffre de $35$, $\\textcolor{{{color:primary.0}}}{5}$, se place au rang des $\\textcolor{{{color:primary.1}}}{\\text{dixièmes}}$.|}}{{if:1000*a=4500|Le dénominateur $2$ n'est pas $10$, $100$ ou $1000$. Comme $2 \\times \\textcolor{{{color:primary.1}}}{5} = 10$, on multiplie le numérateur et le dénominateur par $\\textcolor{{{color:primary.1}}}{5}$. Le dénominateur est $\\textcolor{{{color:primary.1}}}{10}$ : le dernier chiffre de $45$, $\\textcolor{{{color:primary.0}}}{5}$, se place au rang des $\\textcolor{{{color:primary.1}}}{\\text{dixièmes}}$.|}}","{{if:1000*a=500|$$\\begin{align} \\dfrac{1}{2} &= \\dfrac{1 \\times \\textcolor{{{color:primary.1}}}{5}}{2 \\times \\textcolor{{{color:primary.1}}}{5}} \\\\ &= \\dfrac{5}{10} \\\\ &= {{solution}} \\end{align}$$|}}{{if:1000*a=250|$$\\begin{align} \\dfrac{1}{4} &= \\dfrac{1 \\times \\textcolor{{{color:primary.1}}}{25}}{4 \\times \\textcolor{{{color:primary.1}}}{25}} \\\\ &= \\dfrac{25}{100} \\\\ &= {{solution}} \\end{align}$$|}}{{if:1000*a=100|$$\\begin{align} \\dfrac{1}{10} &= {{solution}} \\end{align}$$|}}{{if:1000*a=200|$$\\begin{align} \\dfrac{2}{10} &= {{solution}} \\end{align}$$|}}{{if:1000*a=1500|$$\\begin{align} \\dfrac{3}{2} &= \\dfrac{3 \\times \\textcolor{{{color:primary.1}}}{5}}{2 \\times \\textcolor{{{color:primary.1}}}{5}} \\\\ &= \\dfrac{15}{10} \\\\ &= {{solution}} \\end{align}$$|}}{{if:1000*a=2500|$$\\begin{align} \\dfrac{5}{2} &= \\dfrac{5 \\times \\textcolor{{{color:primary.1}}}{5}}{2 \\times \\textcolor{{{color:primary.1}}}{5}} \\\\ &= \\dfrac{25}{10} \\\\ &= {{solution}} \\end{align}$$|}}{{if:1000*a=10|$$\\begin{align} \\dfrac{1}{100} &= {{solution}} \\end{align}$$|}}{{if:1000*a=2|$$\\begin{align} \\dfrac{2}{1000} &= {{solution}} \\end{align}$$|}}{{if:1000*a=3500|$$\\begin{align} \\dfrac{7}{2} &= \\dfrac{7 \\times \\textcolor{{{color:primary.1}}}{5}}{2 \\times \\textcolor{{{color:primary.1}}}{5}} \\\\ &= \\dfrac{35}{10} \\\\ &= {{solution}} \\end{align}$$|}}{{if:1000*a=4500|$$\\begin{align} \\dfrac{9}{2} &= \\dfrac{9 \\times \\textcolor{{{color:primary.1}}}{5}}{2 \\times \\textcolor{{{color:primary.1}}}{5}} \\\\ &= \\dfrac{45}{10} \\\\ &= {{solution}} \\end{align}$$|}}"]}}],"shared":null,"test_specs":[{"answers":["0.5"],"expected":{"status":"correct"},"variables":{"a":"1/2"},"description":"un demi","variationIndex":0},{"answers":["3{,}5"],"expected":{"status":"correct"},"variables":{"a":"7/2"},"description":"sept demis, virgule","variationIndex":0},{"answers":["4.5"],"expected":{"status":"correct"},"variables":{"a":"9/2"},"description":"neuf demis","variationIndex":0},{"answers":["0.25"],"expected":{"status":"correct"},"variables":{"a":"1/4"},"description":"un quart","variationIndex":0},{"answers":["1.2"],"expected":{"status":"incorrect"},"variables":{"a":"1/2"},"description":"confusion 1/2 = 1,2","variationIndex":0},{"answers":["0.4"],"expected":{"status":"incorrect"},"variables":{"a":"1/4"},"description":"confusion 1/4 = 0,4","variationIndex":0},{"answers":["\\frac{1}{4}"],"expected":{"status":"bad_form","constraintViolations":["form"]},"variables":{"a":"1/4"},"description":"recopie de la fraction","variationIndex":0},{"answers":["0.002"],"expected":{"status":"correct"},"variables":{"a":"2/1000"},"description":"millièmes","variationIndex":0},{"answers":["0.02"],"expected":{"status":"incorrect"},"variables":{"a":"2/1000"},"description":"millièmes mal placés","variationIndex":0}]}$qcm1$::jsonb,
  $qcm1${"title":"Déterminer la forme décimale d'une fraction","description":"Cas à connaître par cœur","variations":[{"blanks":[{"expectedAnswer":"{{eval:{{expression1}};d}}"}],"statement":"Écris la forme décimale de la fraction\n\n$${{expression1}}$$","variables":[{"name":"a","expression":"1/10|1/100|1/1000|1/2|1/4|3/4|3/2|4/2|5/2"},{"name":"expression1","expression":"a"}],"correction":{"steps":["**Fraction décimale.** Quand le dénominateur est $10$, $100$ ou $1000$, il donne le rang du dernier chiffre du numérateur : les dixièmes pour $10$, les centièmes pour $100$, les millièmes pour $1000$. Si le dénominateur n'est pas $10$, $100$ ou $1000$, on cherche d'abord une fraction égale qui a un de ces dénominateurs.","{{if:1000*a=100|Le dénominateur est $\\textcolor{{{color:primary.1}}}{10}$ : le chiffre $\\textcolor{{{color:primary.0}}}{1}$ se place au rang des $\\textcolor{{{color:primary.1}}}{\\text{dixièmes}}$. Il n'y a pas d'unités : on écrit $0$ avant la virgule.|}}{{if:1000*a=10|Le dénominateur est $\\textcolor{{{color:primary.1}}}{100}$ : le chiffre $\\textcolor{{{color:primary.0}}}{1}$ se place au rang des $\\textcolor{{{color:primary.1}}}{\\text{centièmes}}$. Il n'y a pas d'unités : on écrit $0$ avant la virgule. Il manque des chiffres entre la virgule et ce rang : on les remplace par des $\\textcolor{{{color:primary.1}}}{0}$.|}}{{if:1000*a=1|Le dénominateur est $\\textcolor{{{color:primary.1}}}{1000}$ : le chiffre $\\textcolor{{{color:primary.0}}}{1}$ se place au rang des $\\textcolor{{{color:primary.1}}}{\\text{millièmes}}$. Il n'y a pas d'unités : on écrit $0$ avant la virgule. Il manque des chiffres entre la virgule et ce rang : on les remplace par des $\\textcolor{{{color:primary.1}}}{0}$.|}}{{if:1000*a=500|Le dénominateur $2$ n'est pas $10$, $100$ ou $1000$. Comme $2 \\times \\textcolor{{{color:primary.1}}}{5} = 10$, on multiplie le numérateur et le dénominateur par $\\textcolor{{{color:primary.1}}}{5}$. Le dénominateur est $\\textcolor{{{color:primary.1}}}{10}$ : le chiffre $\\textcolor{{{color:primary.0}}}{5}$ se place au rang des $\\textcolor{{{color:primary.1}}}{\\text{dixièmes}}$. Il n'y a pas d'unités : on écrit $0$ avant la virgule.|}}{{if:1000*a=250|Le dénominateur $4$ n'est pas $10$, $100$ ou $1000$. Comme $4 \\times \\textcolor{{{color:primary.1}}}{25} = 100$, on multiplie le numérateur et le dénominateur par $\\textcolor{{{color:primary.1}}}{25}$. Le dénominateur est $\\textcolor{{{color:primary.1}}}{100}$ : le dernier chiffre de $25$, $\\textcolor{{{color:primary.0}}}{5}$, se place au rang des $\\textcolor{{{color:primary.1}}}{\\text{centièmes}}$. Il n'y a pas d'unités : on écrit $0$ avant la virgule.|}}{{if:1000*a=750|Le dénominateur $4$ n'est pas $10$, $100$ ou $1000$. Comme $4 \\times \\textcolor{{{color:primary.1}}}{25} = 100$, on multiplie le numérateur et le dénominateur par $\\textcolor{{{color:primary.1}}}{25}$. Le dénominateur est $\\textcolor{{{color:primary.1}}}{100}$ : le dernier chiffre de $75$, $\\textcolor{{{color:primary.0}}}{5}$, se place au rang des $\\textcolor{{{color:primary.1}}}{\\text{centièmes}}$. Il n'y a pas d'unités : on écrit $0$ avant la virgule.|}}{{if:1000*a=1500|Le dénominateur $2$ n'est pas $10$, $100$ ou $1000$. Comme $2 \\times \\textcolor{{{color:primary.1}}}{5} = 10$, on multiplie le numérateur et le dénominateur par $\\textcolor{{{color:primary.1}}}{5}$. Le dénominateur est $\\textcolor{{{color:primary.1}}}{10}$ : le dernier chiffre de $15$, $\\textcolor{{{color:primary.0}}}{5}$, se place au rang des $\\textcolor{{{color:primary.1}}}{\\text{dixièmes}}$.|}}{{if:1000*a=2000|Deux demis font une unité, donc quatre demis font $2$ unités : $\\dfrac{4}{2}$ est le nombre entier $2$, sans virgule.|}}{{if:1000*a=2500|Le dénominateur $2$ n'est pas $10$, $100$ ou $1000$. Comme $2 \\times \\textcolor{{{color:primary.1}}}{5} = 10$, on multiplie le numérateur et le dénominateur par $\\textcolor{{{color:primary.1}}}{5}$. Le dénominateur est $\\textcolor{{{color:primary.1}}}{10}$ : le dernier chiffre de $25$, $\\textcolor{{{color:primary.0}}}{5}$, se place au rang des $\\textcolor{{{color:primary.1}}}{\\text{dixièmes}}$.|}}","{{if:1000*a=100|$$\\begin{align} \\dfrac{1}{10} &= {{solution}} \\end{align}$$|}}{{if:1000*a=10|$$\\begin{align} \\dfrac{1}{100} &= {{solution}} \\end{align}$$|}}{{if:1000*a=1|$$\\begin{align} \\dfrac{1}{1000} &= {{solution}} \\end{align}$$|}}{{if:1000*a=500|$$\\begin{align} \\dfrac{1}{2} &= \\dfrac{1 \\times \\textcolor{{{color:primary.1}}}{5}}{2 \\times \\textcolor{{{color:primary.1}}}{5}} \\\\ &= \\dfrac{5}{10} \\\\ &= {{solution}} \\end{align}$$|}}{{if:1000*a=250|$$\\begin{align} \\dfrac{1}{4} &= \\dfrac{1 \\times \\textcolor{{{color:primary.1}}}{25}}{4 \\times \\textcolor{{{color:primary.1}}}{25}} \\\\ &= \\dfrac{25}{100} \\\\ &= {{solution}} \\end{align}$$|}}{{if:1000*a=750|$$\\begin{align} \\dfrac{3}{4} &= \\dfrac{3 \\times \\textcolor{{{color:primary.1}}}{25}}{4 \\times \\textcolor{{{color:primary.1}}}{25}} \\\\ &= \\dfrac{75}{100} \\\\ &= {{solution}} \\end{align}$$|}}{{if:1000*a=1500|$$\\begin{align} \\dfrac{3}{2} &= \\dfrac{3 \\times \\textcolor{{{color:primary.1}}}{5}}{2 \\times \\textcolor{{{color:primary.1}}}{5}} \\\\ &= \\dfrac{15}{10} \\\\ &= {{solution}} \\end{align}$$|}}{{if:1000*a=2000|$$\\begin{align} \\dfrac{4}{2} &= 4 \\div 2 \\\\ &= {{solution}} \\end{align}$$|}}{{if:1000*a=2500|$$\\begin{align} \\dfrac{5}{2} &= \\dfrac{5 \\times \\textcolor{{{color:primary.1}}}{5}}{2 \\times \\textcolor{{{color:primary.1}}}{5}} \\\\ &= \\dfrac{25}{10} \\\\ &= {{solution}} \\end{align}$$|}}"]}}],"shared":null,"test_specs":[{"answers":["0.1"],"expected":{"status":"correct"},"variables":{"a":"1/10"},"description":"un dixième","variationIndex":0},{"answers":["0{,}01"],"expected":{"status":"correct"},"variables":{"a":"1/100"},"description":"un centième, virgule","variationIndex":0},{"answers":["0.001"],"expected":{"status":"correct"},"variables":{"a":"1/1000"},"description":"un millième","variationIndex":0},{"answers":["0.01"],"expected":{"status":"incorrect"},"variables":{"a":"1/1000"},"description":"Erreur : millième au rang des centièmes","variationIndex":0},{"answers":["0.5"],"expected":{"status":"correct"},"variables":{"a":"1/2"},"description":"un demi","variationIndex":0},{"answers":["1.2"],"expected":{"status":"incorrect"},"variables":{"a":"1/2"},"description":"Erreur : 1/2 = 1,2","variationIndex":0},{"answers":["0.25"],"expected":{"status":"correct"},"variables":{"a":"1/4"},"description":"un quart","variationIndex":0},{"answers":["0.4"],"expected":{"status":"incorrect"},"variables":{"a":"1/4"},"description":"Erreur : 1/4 = 0,4","variationIndex":0},{"answers":["0{,}75"],"expected":{"status":"correct"},"variables":{"a":"3/4"},"description":"trois quarts, virgule","variationIndex":0},{"answers":["3.4"],"expected":{"status":"incorrect"},"variables":{"a":"3/4"},"description":"Erreur : 3/4 = 3,4","variationIndex":0},{"answers":["1.5"],"expected":{"status":"correct"},"variables":{"a":"3/2"},"description":"trois demis","variationIndex":0},{"answers":["2"],"expected":{"status":"correct"},"variables":{"a":"4/2"},"description":"quatre demis = 2","variationIndex":0},{"answers":["4.2"],"expected":{"status":"incorrect"},"variables":{"a":"4/2"},"description":"Erreur : 4/2 = 4,2","variationIndex":0},{"answers":["2.5"],"expected":{"status":"correct"},"variables":{"a":"5/2"},"description":"cinq demis","variationIndex":0},{"answers":["\\frac{1}{4}"],"expected":{"status":"bad_form","constraintViolations":["form"]},"variables":{"a":"1/4"},"description":"recopie de la fraction","variationIndex":0}]}$qcm1$::jsonb,
  null, null, null, array['CM2']);
insert into _qcm1_modeles values ('edc5d7d4-98a2-4118-8c7f-35dd510dbcd5', $qcm1$Nombres et calculs$qcm1$, $qcm1$Décimaux : calculs$qcm1$, $qcm1$division$qcm1$, array['CM1'], 'published',
  $qcm1${"title":"Trouver la moitié","description":"Nombres impairs de $1$ à $29$","variations":[{"blanks":[{"expectedAnswer":"{{b}}"}],"statement":"Quelle est la moitié du nombre ${{eval:a;d}}$ ?\n\nLa moitié de ${{eval:a;d}}$ est $?$.","variables":[{"name":"a1","expression":"0..14"},{"name":"a","expression":"eval:a1*2+1"},{"name":"b","expression":"eval:(a)/2;d"}],"correction":{"steps":["La moitié de ${{eval:a;d}}$ est ${{solution}}$ car $2 \\times {{solution:0}} = {{eval:a}}$."]}}],"shared":null,"test_specs":[{"answers":["10{,}5"],"expected":{"status":"correct"},"variables":{"a1":"10"},"description":"moitié de 21 = 10,5","variationIndex":0},{"answers":["10.5"],"expected":{"status":"correct"},"variables":{"a1":"10"},"description":"10.5 au point","variationIndex":0},{"answers":["\\frac{21}{2}"],"expected":{"status":"bad_form","constraintViolations":["form"]},"variables":{"a1":"10"},"description":"21/2 en fraction","variationIndex":0},{"answers":["10"],"expected":{"status":"incorrect"},"variables":{"a1":"10"},"description":"erreur 10","variationIndex":0},{"answers":["0{,}5"],"expected":{"status":"correct"},"variables":{"a1":"0"},"description":"moitié de 1 = 0,5","variationIndex":0}]}$qcm1$::jsonb,
  $qcm1${"title":"Trouver la moitié","description":"Nombres impairs de $1$ à $15$","variations":[{"blanks":[{"expectedAnswer":"{{b}}"}],"statement":"Quelle est la moitié du nombre ${{eval:a;d}}$ ?\n\nLa moitié de ${{eval:a;d}}$ est $?$.","variables":[{"name":"a1","expression":"0..7"},{"name":"a","expression":"eval:a1*2+1"},{"name":"b","expression":"eval:(a)/2;d"}],"correction":{"steps":["La moitié de ${{eval:a;d}}$ est ${{solution}}$ car $2 \\times {{solution:0}} = {{eval:a}}$."]}}],"shared":null,"test_specs":[{"answers":["5{,}5"],"expected":{"status":"correct"},"variables":{"a1":"5"},"description":"moitié de 11 = 5,5","variationIndex":0},{"answers":["5.5"],"expected":{"status":"correct"},"variables":{"a1":"5"},"description":"5.5 au point","variationIndex":0},{"answers":["\\frac{11}{2}"],"expected":{"status":"bad_form","constraintViolations":["form"]},"variables":{"a1":"5"},"description":"11/2 en fraction","variationIndex":0},{"answers":["5"],"expected":{"status":"incorrect"},"variables":{"a1":"5"},"description":"Erreur : la moitié de 10 au lieu de celle de 11","variationIndex":0},{"answers":["0{,}5"],"expected":{"status":"correct"},"variables":{"a1":"0"},"description":"borne : moitié de 1 = 0,5","variationIndex":0},{"answers":["7{,}5"],"expected":{"status":"correct"},"variables":{"a1":"7"},"description":"borne : moitié de 15 = 7,5","variationIndex":0},{"answers":["7"],"expected":{"status":"incorrect"},"variables":{"a1":"7"},"description":"Erreur : la moitié de 14 au lieu de celle de 15","variationIndex":0}]}$qcm1$::jsonb,
  null, null, null, array['CM2']);

-- Tags des origines : ceux qu'elles portent déjà (relevé, exigés à l'identique et laissés) et ceux
-- que la migration pose.
drop table if exists pg_temp._qcm1_tags;
create temporary table _qcm1_tags (
	id uuid not null references _qcm1_modeles (id),
	tag_grade text not null, tag_code text not null,
	avant boolean not null
);
insert into _qcm1_tags values
  ('322f3479-0120-4a6d-839a-4e8df194f99e', 'CM2', 'CM2-039', false),
  ('edc5d7d4-98a2-4118-8c7f-35dd510dbcd5', 'CM2', 'CM2-037', false);

-- Modèles neufs : chacun copie les autres colonnes de son origine, sauf le niveau (et le nœud
-- quand l'un de ses points vit sur une sous-notion voisine).
drop table if exists pg_temp._qcm1_neufs;
create temporary table _qcm1_neufs (
	id uuid primary key,
	origine uuid not null references _qcm1_modeles (id),
	niveau integer not null,
	contenu jsonb not null,
	-- Nœud propre (celui de son premier point) ; null : celui de l'origine.
	branche text, notion text, sous_notion text
);
drop table if exists pg_temp._qcm1_tags_neufs;
create temporary table _qcm1_tags_neufs (
	id uuid not null references _qcm1_neufs (id),
	rang integer not null,
	tag_grade text not null, tag_code text not null
);


-- ---- 2. Résolution STRICTE des nœuds et des points --------------------------------------
create temporary table _qcm1_resolus as
	select r.id, case when r.sous_notion is null then nn.id else s.id end as noeud,
	       r.branche_apres is not null as deplace,
	       case when r.branche_apres is null then case when r.sous_notion is null then nn.id else s.id end
	            when r.sous_notion_apres is null then na.id else sa.id end as noeud_apres,
	       case when r.sous_notion_apres is null then na.archived_at else sa.archived_at end as noeud_apres_archive
	  from _qcm1_modeles r
	  left join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.name = r.branche
	  left join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = r.notion
	  left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = nn.id and s.name = r.sous_notion
	  left join public.classification_nodes ba on ba.kind = 'branch' and ba.parent_id is null and ba.name = r.branche_apres
	  left join public.classification_nodes na on na.kind = 'notion' and na.parent_id = ba.id and na.name = r.notion_apres
	  left join public.classification_nodes sa on sa.kind = 'subnotion' and sa.parent_id = na.id and sa.name = r.sous_notion_apres;
create temporary table _qcm1_resolus_tags as
	select t.id, t.avant, p.id as point_id
	  from _qcm1_tags t
	  left join public.curriculum_points p on p.grade = t.tag_grade and p.code = t.tag_code and p.archived_at is null;
create temporary table _qcm1_resolus_neufs as
	select n.id, n.branche is not null as noeud_propre,
	       case when n.sous_notion is null then nn.id else s.id end as noeud,
	       case when n.sous_notion is null then nn.archived_at else s.archived_at end as noeud_archive
	  from _qcm1_neufs n
	  left join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.name = n.branche
	  left join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = n.notion
	  left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = nn.id and s.name = n.sous_notion;
create temporary table _qcm1_resolus_tags_neufs as
	select t.id, t.rang, p.id as point_id, p.node_id as noeud_du_point
	  from _qcm1_tags_neufs t
	  left join public.curriculum_points p on p.grade = t.tag_grade and p.code = t.tag_code and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from _qcm1_resolus where noeud is null or noeud_apres is null or (deplace and noeud_apres_archive is not null))
	   or exists (select 1 from _qcm1_resolus_tags where point_id is null) then
		raise exception 'nœuds ou points introuvables : %',
			(select count(*) from _qcm1_resolus where noeud is null or noeud_apres is null or (deplace and noeud_apres_archive is not null))
			+ (select count(*) from _qcm1_resolus_tags where point_id is null);
	end if;
	-- Nœud propre : actif, et celui du premier point du modèle neuf (la garde des tags n'accepte que
	-- lui ou sa notion ; un point déplacé depuis le relevé fait échouer ici, pas plus loin).
	if exists (select 1 from _qcm1_resolus_tags_neufs where point_id is null)
	   or exists (select 1 from _qcm1_resolus_neufs n
	               where n.noeud_propre
	                 and (n.noeud is null or n.noeud_archive is not null
	                      or n.noeud is distinct from (select t.noeud_du_point from _qcm1_resolus_tags_neufs t
	                                                    where t.id = n.id and t.rang = 0))) then
		raise exception 'points ou nœuds des modèles neufs introuvables : %',
			(select count(*) from _qcm1_resolus_tags_neufs where point_id is null)
			+ (select count(*) from _qcm1_resolus_neufs n
			    where n.noeud_propre
			      and (n.noeud is null or n.noeud_archive is not null
			           or n.noeud is distinct from (select t.noeud_du_point from _qcm1_resolus_tags_neufs t
			                                         where t.id = n.id and t.rang = 0)));
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, contenu, rangement et tags relevés ---------------
do $garde$
declare v_presents integer; v_contenus integer; v_ranges integer; v_tags integer; v_manquants integer; v_pris integer;
begin
	-- Verrou : aucune sauvegarde de l'éditeur ne peut s'intercaler entre la garde et la mise à jour.
	perform 1 from public.question_templates q join _qcm1_modeles r on r.id = q.id for update of q;
	select count(*) into v_presents from _qcm1_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 2) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 2', v_presents;
	end if;
	select count(*) into v_contenus from _qcm1_modeles r
	  join public.question_templates q on q.id = r.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs) is distinct from r.avant;
	if v_contenus <> 0 then
		raise exception 'modèles modifiés depuis le relevé : %', v_contenus;
	end if;
	select count(*) into v_ranges from _qcm1_modeles r
	  join _qcm1_resolus x on x.id = r.id
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is distinct from x.noeud or q.grades is distinct from r.grades
	    or q.status is distinct from r.statut;
	if v_ranges <> 0 then
		raise exception 'modèles déplacés ou reclassés depuis le relevé : %', v_ranges;
	end if;
	-- Aucun tag hors du relevé (une saisie faite depuis serait contredite), à tout niveau.
	select count(*) into v_manquants from _qcm1_resolus_tags a
	  join public.question_templates q on q.id = a.id
	 where a.avant and not exists (select 1 from public.question_template_points t
	                                where t.template_id = a.id and t.point_id = a.point_id);
	if v_manquants <> 0 then
		raise exception 'tags relevés absents : %', v_manquants;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qcm1_modeles r on r.id = q.template_id
	 where not exists (select 1 from _qcm1_resolus_tags a
	                    where a.avant and a.id = q.template_id and a.point_id = q.point_id);
	if v_tags <> 0 then
		raise exception 'tags déjà posés sur ces modèles : %', v_tags;
	end if;
	select count(*) into v_pris from _qcm1_neufs n join public.question_templates q on q.id = n.id;
	if v_pris <> 0 then
		raise exception 'identifiants des modèles neufs déjà pris : %', v_pris;
	end if;
	-- Catégorie (thème, domaine, sous-domaine de l'origine, niveau propre) : unique parmi les
	-- modèles publiés (idx_question_templates_unique_category).
	select count(*) into v_pris from _qcm1_neufs n
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
  from _qcm1_modeles r
 where q.id = r.id;

-- R2 : les origines dont les points vivent ailleurs passent sur le nœud de leurs points, AVANT les
-- tags (le trigger des tags lit le nœud du modèle) ; elles n'ont aucun tag d'avant.
update public.question_templates q
   set classification_node_id = x.noeud_apres
  from _qcm1_resolus x
 where q.id = x.id and x.deplace;

-- Niveau scolaire : le modèle passe dans son vrai programme, AVANT ses modèles neufs (qui le
-- copient).
update public.question_templates q
   set grades = r.grades_apres
  from _qcm1_modeles r
 where q.id = r.id and r.grades_apres is not null;

insert into public.question_template_points (template_id, point_id)
select x.id, x.point_id
  from _qcm1_resolus_tags x
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
  from _qcm1_neufs n
  join _qcm1_resolus_neufs x on x.id = n.id
  join public.question_templates q on q.id = n.origine;

insert into public.question_template_points (template_id, point_id)
select x.id, x.point_id
  from _qcm1_resolus_tags_neufs x
  join public.question_templates q on q.id = x.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_ok integer; v_tags integer; v_tous integer; v_neufs integer; v_neufs_tags integer; v_neufs_tous integer;
begin
	select count(*) into v_presents from _qcm1_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_ok from _qcm1_modeles r
	  join _qcm1_resolus x on x.id = r.id
	  join public.question_templates q on q.id = r.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs) = r.apres and q.classification_node_id = x.noeud_apres
   and q.grades = coalesce(r.grades_apres, r.grades);
	select count(*) into v_tags from _qcm1_resolus_tags x
	  join public.question_template_points q on q.template_id = x.id and q.point_id = x.point_id;
	select count(*) into v_tous from public.question_template_points q join _qcm1_modeles r on r.id = q.template_id;
	if v_ok <> v_presents or v_tags <> v_tous or v_tags <> least(v_presents, 1) * 2 then
		raise exception 'lot incohérent : contenus %/%, tags %/%', v_ok, v_presents, v_tags, v_tous;
	end if;
	select count(*) into v_neufs from _qcm1_neufs n
	  join _qcm1_resolus_neufs x on x.id = n.id
	  join public.question_templates q on q.id = n.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs) = n.contenu
	   and (not x.noeud_propre or q.classification_node_id = x.noeud);
	select count(*) into v_neufs_tags from _qcm1_resolus_tags_neufs x
	  join public.question_template_points q on q.template_id = x.id and q.point_id = x.point_id;
	select count(*) into v_neufs_tous from public.question_template_points q join _qcm1_neufs n on n.id = q.template_id;
	if v_neufs <> least(v_presents, 1) * 0 or v_neufs_tags <> least(v_presents, 1) * 0 or v_neufs_tous <> v_neufs_tags then
		raise exception 'modèles neufs incohérents : contenus %, tags %', v_neufs, v_neufs_tags;
	end if;
end $check$;

drop table pg_temp._qcm1_resolus_tags_neufs;
drop table pg_temp._qcm1_resolus_neufs;
drop table pg_temp._qcm1_resolus_tags;
drop table pg_temp._qcm1_resolus;
drop table pg_temp._qcm1_tags_neufs;
drop table pg_temp._qcm1_neufs;
drop table pg_temp._qcm1_tags;
drop table pg_temp._qcm1_modeles;
