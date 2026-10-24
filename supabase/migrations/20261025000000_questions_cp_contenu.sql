-- ============================================================================
-- Chantier « questions », corrections CP : 4 modèles corrigés, aucun modèle neuf ni tag posé
-- ============================================================================
--   - 52c4d773 (Décomposition) : corrigé sans × 10, × 100 ni centaines (hors CP) ;
--   - 0e5372a4 (Complément) : deux variations « 74 + ? = 80 » (complément à la dizaine
--     supérieure, CP-023), le complément à 10 gardé ;
--   - 25285413 (Double/1), 89bef942 (Moitié/3) : la valeur 0 retirée (bornes CE1-028, CE1-101).
-- Ni tag, ni nœud, ni niveau, ni statut ne changent ici : rangement, niveaux et tags dans la
-- migration suivante (20261025000100_questions_cp_rangement_tags).
-- ============================================================================
-- Décision de David le 2026-10-24 (journal docs/wip/questions-progress.md § 4 bis). Fichier GÉNÉRÉ
-- par docs/wip/questions/lot-corrections-cp.py — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (4 modèles). Elle est prouvée
-- par tests/integration/questions-cp-contenu.test.ts, qui fabrique des copies des identifiants de
-- la prod (contenu, nœud, niveaux et tags) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit avoir EXACTEMENT le contenu relevé en prod le 2026-10-24, être au nœud,
-- aux niveaux et au statut relevés, et porter exactement son tag relevé.
--
-- Données d'élèves : aucune (relevé du 2026-10-24 : 0 carte SRS, 0 tentative de compétence ou
-- d'évaluation, 0 réponse de test, 0 activité de journal, 0 exercice de chapitre, 0 favori).
--
-- Accès : personne ne gagne d'accès (question tranchée par David le 2026-10-24). Aucune règle ne
-- change ; effet visible : les 4 modèles sont publiés, leurs élèves tirent les nouvelles variations
-- et lisent le nouveau corrigé.
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
-- 	perform 1 from public.question_templates where id in ('0e5372a4-17af-4e8e-8eac-e7b3ed966f2f', '25285413-ba15-401d-a0e8-fd0a84770f3a', '52c4d773-d86c-45a3-88e4-ddc99cc4beab', '89bef942-2e3f-4f76-8712-4bf7e6f226cf') for update;
-- 	select count(*) into v_intacts from public.question_templates q join (values
-- 		('0e5372a4-17af-4e8e-8eac-e7b3ed966f2f'::uuid, 'd62db64b6fbd0eb85a6fcb492971822f'),
-- 		('25285413-ba15-401d-a0e8-fd0a84770f3a'::uuid, '8461d022a31f4f217642a3cf0c8d5102'),
-- 		('52c4d773-d86c-45a3-88e4-ddc99cc4beab'::uuid, '07fa3d9828b7b8b44d47471ed4eab25d'),
-- 		('89bef942-2e3f-4f76-8712-4bf7e6f226cf'::uuid, '79b10bccd5786b2c80974b48ae4955fa')
-- 	) as r(id, h) on r.id = q.id
-- 	 where md5(jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs)::text) = r.h;
-- 	if v_intacts <> 4 then
-- 		raise exception 'rollback : % modèle(s) sur 4 portent encore le contenu de la migration', v_intacts;
-- 	end if;
-- end $retour$;
-- update public.question_templates q
--    set title = r.c->>'title', description = r.c->>'description', variations = r.c->'variations',
--        shared = nullif(r.c->'shared', 'null'::jsonb), test_specs = nullif(r.c->'test_specs', 'null'::jsonb)
--   from (values
--   ('0e5372a4-17af-4e8e-8eac-e7b3ed966f2f'::uuid, $qcp${"title":"Trouver le complément","description":"Complément à 10","variations":[{"blanks":[{"expectedAnswer":"{{eval:10-a}}"}],"statement":"Complète.\n\n$${{expression1}}$$","variables":[{"name":"expression1","expression":"?+a=10"}]},{"blanks":[{"expectedAnswer":"{{eval:10-a}}"}],"statement":"Complète.\n\n$${{expression2}}$$","variables":[{"name":"expression2","expression":"a+?=10"}]}],"shared":{"variables":[{"name":"a","expression":"1..9"}]},"test_specs":[{"answers":["3"],"expected":{"status":"correct"},"variables":{"a":"7"},"description":"Bonne réponse 3","variationIndex":0},{"answers":["17"],"expected":{"status":"incorrect"},"variables":{"a":"7"},"description":"Erreur : addition au lieu du complément","variationIndex":0},{"answers":["03"],"expected":{"status":"unoptimal_form","constraintViolations":["zeros"]},"variables":{"a":"7"},"description":"Zéro inutile 03","variationIndex":0},{"answers":["8"],"expected":{"status":"correct"},"variables":{"a":"2"},"description":"Bonne réponse 8","variationIndex":1},{"answers":["12"],"expected":{"status":"incorrect"},"variables":{"a":"2"},"description":"Erreur : addition au lieu du complément","variationIndex":1}]}$qcp$::jsonb),
--   ('25285413-ba15-401d-a0e8-fd0a84770f3a'::uuid, $qcp${"title":"Trouver le double","description":"Nombre inférieur à $10$","variations":[{"blanks":[{"expectedAnswer":"{{eval:2*a}}"}],"statement":"Quel est le double de ${{a}}$ ?\n\nLe double de ${{a}}$ est $?$.","variables":[{"name":"a","expression":"0..9"}],"correction":{"steps":["Le double de ${{a}}$ est ${{eval:2*a}}$ car $2 \\times {{a}} = {{eval:2*a}}$."]}}],"shared":null,"test_specs":[{"answers":["14"],"expected":{"status":"correct"},"variables":{"a":"7"},"description":"double de 7 → 14","variationIndex":0},{"answers":["0"],"expected":{"status":"correct"},"variables":{"a":"0"},"description":"double de 0 → 0","variationIndex":0},{"answers":["9"],"expected":{"status":"incorrect"},"variables":{"a":"7"},"description":"double de 7 : 7+2 refusé","variationIndex":0}]}$qcp$::jsonb),
--   ('52c4d773-d86c-45a3-88e4-ddc99cc4beab'::uuid, $qcp${"title":"Décomposer l'écriture décimale d'un nombre","description":"En dizaines et unités","variations":[{"blanks":[{"requiredForm":{"pattern":"a:multipleOf(10)+b:inN* & lt(10)"},"expectedAnswer":"{{eval:a*10}}+{{b}}"}],"statement":"Décompose ce nombre en dizaines et unités comme dans cet exemple : $74=70+4$.\n\n$${{expression}}$$","variables":[{"name":"a","expression":"1..9"},{"name":"b","expression":"1..9"},{"name":"expression","expression":"eval:a*10+b"}],"conditions":["a*10+b != 74"],"correction":{"steps":["**Valeur d'un chiffre.** Un chiffre vaut plus ou moins selon son rang dans le nombre : au rang des dizaines, il compte pour ce chiffre $\\times 10$ ; au rang des centaines, pour ce chiffre $\\times 100$ ; et ainsi de suite. On range les chiffres du nombre dans le tableau de numération.","On place les chiffres de ${{expression}}$ dans le tableau. Chaque chiffre compte pour lui-même multiplié par la valeur de son rang. $$\\begin{array}{|c|c|} \\text{dizaines} & \\text{unités} \\\\ \\textcolor{{{color:primary.0}}}{{{a}}} & \\textcolor{{{color:primary.0}}}{{{b}}} \\end{array}$$","$$\\begin{align} {{expression}} &= \\textcolor{{{color:primary.0}}}{{{a}}} \\times 10 + \\textcolor{{{color:primary.0}}}{{{b}}} \\\\ &= {{solution}} \\end{align}$$"]}}],"shared":null,"test_specs":[{"answers":["70+4"],"expected":{"status":"correct"},"variables":{"a":"7","b":"4"},"description":"74 = 70 + 4","variationIndex":0},{"answers":["4+70"],"expected":{"status":"correct"},"variables":{"a":"7","b":"4"},"description":"ordre inversé accepté","variationIndex":0},{"answers":["7+4"],"expected":{"status":"incorrect"},"variables":{"a":"7","b":"4"},"description":"chiffres additionnés au lieu de dizaines","variationIndex":0},{"answers":["74"],"expected":{"status":"bad_form","constraintViolations":["form"]},"variables":{"a":"7","b":"4"},"description":"nombre recopié non décomposé","variationIndex":0},{"answers":["10+9"],"expected":{"status":"correct"},"variables":{"a":"1","b":"9"},"description":"borne : 19 = 10 + 9","variationIndex":0},{"answers":["40+13"],"expected":{"status":"bad_form","constraintViolations":["form"]},"variables":{"a":"5","b":"3"},"description":"74 = 60 + 14 : décomposition refusée (unités > 9)","variationIndex":0}]}$qcp$::jsonb),
--   ('89bef942-2e3f-4f76-8712-4bf7e6f226cf'::uuid, $qcp${"title":"Trouver la moitié","description":"Nombre pair inférieur à $20$","variations":[{"blanks":[{"expectedAnswer":"{{eval:a}}"}],"statement":"Quelle est la moitié de ${{eval:2*a}}$ ?\n\nLa moitié de ${{eval:2*a}}$ est $?$.","variables":[{"name":"a","expression":"0..10"}],"correction":{"steps":["La moitié de ${{eval:2*a}}$ est {{solution:html}} car $2 \\times \\textcolor{{{color:primary.2}}}{{{a}}}={{eval:2*a}}$"]}}],"shared":null,"test_specs":[{"answers":["7"],"expected":{"status":"correct"},"variables":{"a":"7"},"description":"moitié de 14 = 7","variationIndex":0},{"answers":["28"],"expected":{"status":"incorrect"},"variables":{"a":"7"},"description":"Erreur : double","variationIndex":0},{"answers":["0"],"expected":{"status":"correct"},"variables":{"a":"0"},"description":"moitié de 0 = 0","variationIndex":0},{"answers":["10"],"expected":{"status":"correct"},"variables":{"a":"10"},"description":"moitié de 20 = 10","variationIndex":0}]}$qcp$::jsonb)
--   ) as r(id, c)
--  where q.id = r.id;
-- ROLLBACK:END
-- ============================================================================

set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires -----------------------------------------------------
drop table if exists pg_temp._qcp_modeles;
create temporary table _qcp_modeles (
	id uuid primary key,
	branche text not null, notion text not null, sous_notion text,
	grades text[] not null,
	-- Statut relevé : les neufs en héritent (un brouillon publié depuis publierait ses neufs).
	statut text not null,
	avant jsonb not null, apres jsonb not null,
	-- Nœud d'arrivée (R2 : les points du modèle vivent ailleurs) ; null : il ne bouge pas.
	branche_apres text, notion_apres text, sous_notion_apres text
);
insert into _qcp_modeles values ('0e5372a4-17af-4e8e-8eac-e7b3ed966f2f', $qcp$Nombres et calculs$qcp$, $qcp$Entiers : addition et soustraction$qcp$, $qcp$complément$qcp$, array['CP'], 'published',
  $qcp${"title":"Trouver le complément","description":"Complément à 10","variations":[{"blanks":[{"expectedAnswer":"{{eval:10-a}}"}],"statement":"Complète.\n\n$${{expression1}}$$","variables":[{"name":"expression1","expression":"?+a=10"}]},{"blanks":[{"expectedAnswer":"{{eval:10-a}}"}],"statement":"Complète.\n\n$${{expression2}}$$","variables":[{"name":"expression2","expression":"a+?=10"}]}],"shared":{"variables":[{"name":"a","expression":"1..9"}]},"test_specs":[{"answers":["3"],"expected":{"status":"correct"},"variables":{"a":"7"},"description":"Bonne réponse 3","variationIndex":0},{"answers":["17"],"expected":{"status":"incorrect"},"variables":{"a":"7"},"description":"Erreur : addition au lieu du complément","variationIndex":0},{"answers":["03"],"expected":{"status":"unoptimal_form","constraintViolations":["zeros"]},"variables":{"a":"7"},"description":"Zéro inutile 03","variationIndex":0},{"answers":["8"],"expected":{"status":"correct"},"variables":{"a":"2"},"description":"Bonne réponse 8","variationIndex":1},{"answers":["12"],"expected":{"status":"incorrect"},"variables":{"a":"2"},"description":"Erreur : addition au lieu du complément","variationIndex":1}]}$qcp$::jsonb,
  $qcp${"title":"Trouver le complément","description":"À 10 ou à la dizaine supérieure","variations":[{"blanks":[{"expectedAnswer":"{{eval:10-a}}"}],"statement":"Complète.\n\n$${{expression1}}$$","variables":[{"name":"expression1","expression":"?+a=10"}]},{"blanks":[{"expectedAnswer":"{{eval:10-a}}"}],"statement":"Complète.\n\n$${{expression2}}$$","variables":[{"name":"expression2","expression":"a+?=10"}]},{"blanks":[{"expectedAnswer":"{{eval:10-u}}"}],"statement":"Complète.\n\n$${{expression3}}$$","variables":[{"name":"d","expression":"1..9"},{"name":"u","expression":"1..9"},{"name":"n","expression":"eval:d*10+u"},{"name":"m","expression":"eval:d*10+10"},{"name":"expression3","expression":"n+?=m"}]},{"blanks":[{"expectedAnswer":"{{eval:10-u}}"}],"statement":"Complète.\n\n$${{expression4}}$$","variables":[{"name":"d","expression":"1..9"},{"name":"u","expression":"1..9"},{"name":"n","expression":"eval:d*10+u"},{"name":"m","expression":"eval:d*10+10"},{"name":"expression4","expression":"?+n=m"}]}],"shared":{"variables":[{"name":"a","expression":"1..9"}]},"test_specs":[{"answers":["3"],"expected":{"status":"correct"},"variables":{"a":"7"},"description":"Bonne réponse 3","variationIndex":0},{"answers":["17"],"expected":{"status":"incorrect"},"variables":{"a":"7"},"description":"Erreur : addition au lieu du complément","variationIndex":0},{"answers":["03"],"expected":{"status":"unoptimal_form","constraintViolations":["zeros"]},"variables":{"a":"7"},"description":"Zéro inutile 03","variationIndex":0},{"answers":["8"],"expected":{"status":"correct"},"variables":{"a":"2"},"description":"Bonne réponse 8","variationIndex":1},{"answers":["12"],"expected":{"status":"incorrect"},"variables":{"a":"2"},"description":"Erreur : addition au lieu du complément","variationIndex":1},{"answers":["6"],"expected":{"status":"correct"},"variables":{"a":"1","d":"7","u":"4","n":"74","m":"80"},"description":"74 + ? = 80 → 6","variationIndex":2},{"answers":["4"],"expected":{"status":"incorrect"},"variables":{"a":"1","d":"7","u":"4","n":"74","m":"80"},"description":"Erreur : chiffre des unités recopié","variationIndex":2},{"answers":["1"],"expected":{"status":"correct"},"variables":{"a":"1","d":"9","u":"9","n":"99","m":"100"},"description":"borne : 99 + ? = 100 → 1","variationIndex":2},{"answers":["2"],"expected":{"status":"correct"},"variables":{"a":"1","d":"3","u":"8","n":"38","m":"40"},"description":"? + 38 = 40 → 2","variationIndex":3},{"answers":["12"],"expected":{"status":"incorrect"},"variables":{"a":"1","d":"3","u":"8","n":"38","m":"40"},"description":"Erreur : complément à 50","variationIndex":3}]}$qcp$::jsonb,
  null, null, null);
insert into _qcp_modeles values ('25285413-ba15-401d-a0e8-fd0a84770f3a', $qcp$Nombres et calculs$qcp$, $qcp$Entiers : multiplication$qcp$, $qcp$double et moitié$qcp$, array['CP'], 'published',
  $qcp${"title":"Trouver le double","description":"Nombre inférieur à $10$","variations":[{"blanks":[{"expectedAnswer":"{{eval:2*a}}"}],"statement":"Quel est le double de ${{a}}$ ?\n\nLe double de ${{a}}$ est $?$.","variables":[{"name":"a","expression":"0..9"}],"correction":{"steps":["Le double de ${{a}}$ est ${{eval:2*a}}$ car $2 \\times {{a}} = {{eval:2*a}}$."]}}],"shared":null,"test_specs":[{"answers":["14"],"expected":{"status":"correct"},"variables":{"a":"7"},"description":"double de 7 → 14","variationIndex":0},{"answers":["0"],"expected":{"status":"correct"},"variables":{"a":"0"},"description":"double de 0 → 0","variationIndex":0},{"answers":["9"],"expected":{"status":"incorrect"},"variables":{"a":"7"},"description":"double de 7 : 7+2 refusé","variationIndex":0}]}$qcp$::jsonb,
  $qcp${"title":"Trouver le double","description":"Nombre inférieur à $10$","variations":[{"blanks":[{"expectedAnswer":"{{eval:2*a}}"}],"statement":"Quel est le double de ${{a}}$ ?\n\nLe double de ${{a}}$ est $?$.","variables":[{"name":"a","expression":"1..9"}],"correction":{"steps":["Le double de ${{a}}$ est ${{eval:2*a}}$ car $2 \\times {{a}} = {{eval:2*a}}$."]}}],"shared":null,"test_specs":[{"answers":["14"],"expected":{"status":"correct"},"variables":{"a":"7"},"description":"double de 7 → 14","variationIndex":0},{"answers":["9"],"expected":{"status":"incorrect"},"variables":{"a":"7"},"description":"double de 7 : 7+2 refusé","variationIndex":0},{"answers":["2"],"expected":{"status":"correct"},"variables":{"a":"1"},"description":"borne : double de 1 → 2","variationIndex":0}]}$qcp$::jsonb,
  null, null, null);
insert into _qcp_modeles values ('52c4d773-d86c-45a3-88e4-ddc99cc4beab', $qcp$Nombres et calculs$qcp$, $qcp$Entiers : numération$qcp$, $qcp$décomposition$qcp$, array['CP'], 'published',
  $qcp${"title":"Décomposer l'écriture décimale d'un nombre","description":"En dizaines et unités","variations":[{"blanks":[{"requiredForm":{"pattern":"a:multipleOf(10)+b:inN* & lt(10)"},"expectedAnswer":"{{eval:a*10}}+{{b}}"}],"statement":"Décompose ce nombre en dizaines et unités comme dans cet exemple : $74=70+4$.\n\n$${{expression}}$$","variables":[{"name":"a","expression":"1..9"},{"name":"b","expression":"1..9"},{"name":"expression","expression":"eval:a*10+b"}],"conditions":["a*10+b != 74"],"correction":{"steps":["**Valeur d'un chiffre.** Un chiffre vaut plus ou moins selon son rang dans le nombre : au rang des dizaines, il compte pour ce chiffre $\\times 10$ ; au rang des centaines, pour ce chiffre $\\times 100$ ; et ainsi de suite. On range les chiffres du nombre dans le tableau de numération.","On place les chiffres de ${{expression}}$ dans le tableau. Chaque chiffre compte pour lui-même multiplié par la valeur de son rang. $$\\begin{array}{|c|c|} \\text{dizaines} & \\text{unités} \\\\ \\textcolor{{{color:primary.0}}}{{{a}}} & \\textcolor{{{color:primary.0}}}{{{b}}} \\end{array}$$","$$\\begin{align} {{expression}} &= \\textcolor{{{color:primary.0}}}{{{a}}} \\times 10 + \\textcolor{{{color:primary.0}}}{{{b}}} \\\\ &= {{solution}} \\end{align}$$"]}}],"shared":null,"test_specs":[{"answers":["70+4"],"expected":{"status":"correct"},"variables":{"a":"7","b":"4"},"description":"74 = 70 + 4","variationIndex":0},{"answers":["4+70"],"expected":{"status":"correct"},"variables":{"a":"7","b":"4"},"description":"ordre inversé accepté","variationIndex":0},{"answers":["7+4"],"expected":{"status":"incorrect"},"variables":{"a":"7","b":"4"},"description":"chiffres additionnés au lieu de dizaines","variationIndex":0},{"answers":["74"],"expected":{"status":"bad_form","constraintViolations":["form"]},"variables":{"a":"7","b":"4"},"description":"nombre recopié non décomposé","variationIndex":0},{"answers":["10+9"],"expected":{"status":"correct"},"variables":{"a":"1","b":"9"},"description":"borne : 19 = 10 + 9","variationIndex":0},{"answers":["40+13"],"expected":{"status":"bad_form","constraintViolations":["form"]},"variables":{"a":"5","b":"3"},"description":"74 = 60 + 14 : décomposition refusée (unités > 9)","variationIndex":0}]}$qcp$::jsonb,
  $qcp${"title":"Décomposer l'écriture décimale d'un nombre","description":"En dizaines et unités","variations":[{"blanks":[{"requiredForm":{"pattern":"a:multipleOf(10)+b:inN* & lt(10)"},"expectedAnswer":"{{eval:a*10}}+{{b}}"}],"statement":"Décompose ce nombre en dizaines et unités comme dans cet exemple : $74=70+4$.\n\n$${{expression}}$$","variables":[{"name":"a","expression":"1..9"},{"name":"b","expression":"1..9"},{"name":"expression","expression":"eval:a*10+b"}],"conditions":["a*10+b != 74"],"correction":{"steps":["On range les chiffres de ${{expression}}$ dans le tableau de numération : le chiffre des dizaines, puis celui des unités. $$\\begin{array}{|c|c|} \\text{dizaines} & \\text{unités} \\\\ \\textcolor{{{color:primary.0}}}{{{a}}} & \\textcolor{{{color:primary.0}}}{{{b}}} \\end{array}$$","$\\textcolor{{{color:primary.0}}}{{{a}}}$ {{if:a==1|dizaine}}{{if:a!=1|dizaines}}, c'est ${{eval:a*10}}$ ; $\\textcolor{{{color:primary.0}}}{{{b}}}$ {{if:b==1|unité}}{{if:b!=1|unités}}, c'est ${{b}}$.","$${{expression}} = {{solution}}$$"]}}],"shared":null,"test_specs":[{"answers":["70+4"],"expected":{"status":"correct"},"variables":{"a":"7","b":"4"},"description":"74 = 70 + 4","variationIndex":0},{"answers":["4+70"],"expected":{"status":"correct"},"variables":{"a":"7","b":"4"},"description":"ordre inversé accepté","variationIndex":0},{"answers":["7+4"],"expected":{"status":"incorrect"},"variables":{"a":"7","b":"4"},"description":"chiffres additionnés au lieu de dizaines","variationIndex":0},{"answers":["74"],"expected":{"status":"bad_form","constraintViolations":["form"]},"variables":{"a":"7","b":"4"},"description":"nombre recopié non décomposé","variationIndex":0},{"answers":["10+9"],"expected":{"status":"correct"},"variables":{"a":"1","b":"9"},"description":"borne : 19 = 10 + 9","variationIndex":0},{"answers":["40+13"],"expected":{"status":"bad_form","constraintViolations":["form"]},"variables":{"a":"5","b":"3"},"description":"74 = 60 + 14 : décomposition refusée (unités > 9)","variationIndex":0}]}$qcp$::jsonb,
  null, null, null);
insert into _qcp_modeles values ('89bef942-2e3f-4f76-8712-4bf7e6f226cf', $qcp$Nombres et calculs$qcp$, $qcp$Entiers : multiplication$qcp$, $qcp$double et moitié$qcp$, array['CP'], 'published',
  $qcp${"title":"Trouver la moitié","description":"Nombre pair inférieur à $20$","variations":[{"blanks":[{"expectedAnswer":"{{eval:a}}"}],"statement":"Quelle est la moitié de ${{eval:2*a}}$ ?\n\nLa moitié de ${{eval:2*a}}$ est $?$.","variables":[{"name":"a","expression":"0..10"}],"correction":{"steps":["La moitié de ${{eval:2*a}}$ est {{solution:html}} car $2 \\times \\textcolor{{{color:primary.2}}}{{{a}}}={{eval:2*a}}$"]}}],"shared":null,"test_specs":[{"answers":["7"],"expected":{"status":"correct"},"variables":{"a":"7"},"description":"moitié de 14 = 7","variationIndex":0},{"answers":["28"],"expected":{"status":"incorrect"},"variables":{"a":"7"},"description":"Erreur : double","variationIndex":0},{"answers":["0"],"expected":{"status":"correct"},"variables":{"a":"0"},"description":"moitié de 0 = 0","variationIndex":0},{"answers":["10"],"expected":{"status":"correct"},"variables":{"a":"10"},"description":"moitié de 20 = 10","variationIndex":0}]}$qcp$::jsonb,
  $qcp${"title":"Trouver la moitié","description":"Nombre pair inférieur à $20$","variations":[{"blanks":[{"expectedAnswer":"{{eval:a}}"}],"statement":"Quelle est la moitié de ${{eval:2*a}}$ ?\n\nLa moitié de ${{eval:2*a}}$ est $?$.","variables":[{"name":"a","expression":"1..10"}],"correction":{"steps":["La moitié de ${{eval:2*a}}$ est {{solution:html}} car $2 \\times \\textcolor{{{color:primary.2}}}{{{a}}}={{eval:2*a}}$"]}}],"shared":null,"test_specs":[{"answers":["7"],"expected":{"status":"correct"},"variables":{"a":"7"},"description":"moitié de 14 = 7","variationIndex":0},{"answers":["28"],"expected":{"status":"incorrect"},"variables":{"a":"7"},"description":"Erreur : double","variationIndex":0},{"answers":["10"],"expected":{"status":"correct"},"variables":{"a":"10"},"description":"moitié de 20 = 10","variationIndex":0},{"answers":["1"],"expected":{"status":"correct"},"variables":{"a":"1"},"description":"borne : moitié de 2 = 1","variationIndex":0}]}$qcp$::jsonb,
  null, null, null);

-- Tags des origines : ceux qu'elles portent déjà (relevé, exigés à l'identique et laissés) et ceux
-- que la migration pose.
drop table if exists pg_temp._qcp_tags;
create temporary table _qcp_tags (
	id uuid not null references _qcp_modeles (id),
	tag_grade text not null, tag_code text not null,
	avant boolean not null
);
insert into _qcp_tags values
  ('0e5372a4-17af-4e8e-8eac-e7b3ed966f2f', 'CP', 'CP-023', true),
  ('52c4d773-d86c-45a3-88e4-ddc99cc4beab', 'CP', 'CP-005', true);

-- Modèles neufs : chacun copie les autres colonnes de son origine, sauf le niveau (et le nœud
-- quand l'un de ses points vit sur une sous-notion voisine).
drop table if exists pg_temp._qcp_neufs;
create temporary table _qcp_neufs (
	id uuid primary key,
	origine uuid not null references _qcp_modeles (id),
	niveau integer not null,
	contenu jsonb not null,
	-- Nœud propre (celui de son premier point) ; null : celui de l'origine.
	branche text, notion text, sous_notion text
);
drop table if exists pg_temp._qcp_tags_neufs;
create temporary table _qcp_tags_neufs (
	id uuid not null references _qcp_neufs (id),
	rang integer not null,
	tag_grade text not null, tag_code text not null
);


-- ---- 2. Résolution STRICTE des nœuds et des points --------------------------------------
create temporary table _qcp_resolus as
	select r.id, case when r.sous_notion is null then nn.id else s.id end as noeud,
	       r.branche_apres is not null as deplace,
	       case when r.branche_apres is null then case when r.sous_notion is null then nn.id else s.id end
	            when r.sous_notion_apres is null then na.id else sa.id end as noeud_apres,
	       case when r.sous_notion_apres is null then na.archived_at else sa.archived_at end as noeud_apres_archive
	  from _qcp_modeles r
	  left join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.name = r.branche
	  left join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = r.notion
	  left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = nn.id and s.name = r.sous_notion
	  left join public.classification_nodes ba on ba.kind = 'branch' and ba.parent_id is null and ba.name = r.branche_apres
	  left join public.classification_nodes na on na.kind = 'notion' and na.parent_id = ba.id and na.name = r.notion_apres
	  left join public.classification_nodes sa on sa.kind = 'subnotion' and sa.parent_id = na.id and sa.name = r.sous_notion_apres;
create temporary table _qcp_resolus_tags as
	select t.id, t.avant, p.id as point_id
	  from _qcp_tags t
	  left join public.curriculum_points p on p.grade = t.tag_grade and p.code = t.tag_code and p.archived_at is null;
create temporary table _qcp_resolus_neufs as
	select n.id, n.branche is not null as noeud_propre,
	       case when n.sous_notion is null then nn.id else s.id end as noeud,
	       case when n.sous_notion is null then nn.archived_at else s.archived_at end as noeud_archive
	  from _qcp_neufs n
	  left join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.name = n.branche
	  left join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = n.notion
	  left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = nn.id and s.name = n.sous_notion;
create temporary table _qcp_resolus_tags_neufs as
	select t.id, t.rang, p.id as point_id, p.node_id as noeud_du_point
	  from _qcp_tags_neufs t
	  left join public.curriculum_points p on p.grade = t.tag_grade and p.code = t.tag_code and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from _qcp_resolus where noeud is null or noeud_apres is null or (deplace and noeud_apres_archive is not null))
	   or exists (select 1 from _qcp_resolus_tags where point_id is null) then
		raise exception 'nœuds ou points introuvables : %',
			(select count(*) from _qcp_resolus where noeud is null or noeud_apres is null or (deplace and noeud_apres_archive is not null))
			+ (select count(*) from _qcp_resolus_tags where point_id is null);
	end if;
	-- Nœud propre : actif, et celui du premier point du modèle neuf (la garde des tags n'accepte que
	-- lui ou sa notion ; un point déplacé depuis le relevé fait échouer ici, pas plus loin).
	if exists (select 1 from _qcp_resolus_tags_neufs where point_id is null)
	   or exists (select 1 from _qcp_resolus_neufs n
	               where n.noeud_propre
	                 and (n.noeud is null or n.noeud_archive is not null
	                      or n.noeud is distinct from (select t.noeud_du_point from _qcp_resolus_tags_neufs t
	                                                    where t.id = n.id and t.rang = 0))) then
		raise exception 'points ou nœuds des modèles neufs introuvables : %',
			(select count(*) from _qcp_resolus_tags_neufs where point_id is null)
			+ (select count(*) from _qcp_resolus_neufs n
			    where n.noeud_propre
			      and (n.noeud is null or n.noeud_archive is not null
			           or n.noeud is distinct from (select t.noeud_du_point from _qcp_resolus_tags_neufs t
			                                         where t.id = n.id and t.rang = 0)));
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, contenu, rangement et tags relevés ---------------
do $garde$
declare v_presents integer; v_contenus integer; v_ranges integer; v_tags integer; v_manquants integer; v_pris integer;
begin
	-- Verrou : aucune sauvegarde de l'éditeur ne peut s'intercaler entre la garde et la mise à jour.
	perform 1 from public.question_templates q join _qcp_modeles r on r.id = q.id for update of q;
	select count(*) into v_presents from _qcp_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 4) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 4', v_presents;
	end if;
	select count(*) into v_contenus from _qcp_modeles r
	  join public.question_templates q on q.id = r.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs) is distinct from r.avant;
	if v_contenus <> 0 then
		raise exception 'modèles modifiés depuis le relevé : %', v_contenus;
	end if;
	select count(*) into v_ranges from _qcp_modeles r
	  join _qcp_resolus x on x.id = r.id
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is distinct from x.noeud or q.grades is distinct from r.grades
	    or q.status is distinct from r.statut;
	if v_ranges <> 0 then
		raise exception 'modèles déplacés ou reclassés depuis le relevé : %', v_ranges;
	end if;
	-- Aucun tag hors du relevé (une saisie faite depuis serait contredite), à tout niveau.
	select count(*) into v_manquants from _qcp_resolus_tags a
	  join public.question_templates q on q.id = a.id
	 where a.avant and not exists (select 1 from public.question_template_points t
	                                where t.template_id = a.id and t.point_id = a.point_id);
	if v_manquants <> 0 then
		raise exception 'tags relevés absents : %', v_manquants;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qcp_modeles r on r.id = q.template_id
	 where not exists (select 1 from _qcp_resolus_tags a
	                    where a.avant and a.id = q.template_id and a.point_id = q.point_id);
	if v_tags <> 0 then
		raise exception 'tags déjà posés sur ces modèles : %', v_tags;
	end if;
	select count(*) into v_pris from _qcp_neufs n join public.question_templates q on q.id = n.id;
	if v_pris <> 0 then
		raise exception 'identifiants des modèles neufs déjà pris : %', v_pris;
	end if;
	-- Catégorie (thème, domaine, sous-domaine de l'origine, niveau propre) : unique parmi les
	-- modèles publiés (idx_question_templates_unique_category).
	select count(*) into v_pris from _qcp_neufs n
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
  from _qcp_modeles r
 where q.id = r.id;

-- R2 : les origines dont les points vivent ailleurs passent sur le nœud de leurs points, AVANT les
-- tags (le trigger des tags lit le nœud du modèle) ; elles n'ont aucun tag d'avant.
update public.question_templates q
   set classification_node_id = x.noeud_apres
  from _qcp_resolus x
 where q.id = x.id and x.deplace;

insert into public.question_template_points (template_id, point_id)
select x.id, x.point_id
  from _qcp_resolus_tags x
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
  from _qcp_neufs n
  join _qcp_resolus_neufs x on x.id = n.id
  join public.question_templates q on q.id = n.origine;

insert into public.question_template_points (template_id, point_id)
select x.id, x.point_id
  from _qcp_resolus_tags_neufs x
  join public.question_templates q on q.id = x.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_ok integer; v_tags integer; v_tous integer; v_neufs integer; v_neufs_tags integer; v_neufs_tous integer;
begin
	select count(*) into v_presents from _qcp_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_ok from _qcp_modeles r
	  join _qcp_resolus x on x.id = r.id
	  join public.question_templates q on q.id = r.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs) = r.apres and q.classification_node_id = x.noeud_apres;
	select count(*) into v_tags from _qcp_resolus_tags x
	  join public.question_template_points q on q.template_id = x.id and q.point_id = x.point_id;
	select count(*) into v_tous from public.question_template_points q join _qcp_modeles r on r.id = q.template_id;
	if v_ok <> v_presents or v_tags <> v_tous or v_tags <> least(v_presents, 1) * 2 then
		raise exception 'lot incohérent : contenus %/%, tags %/%', v_ok, v_presents, v_tags, v_tous;
	end if;
	select count(*) into v_neufs from _qcp_neufs n
	  join _qcp_resolus_neufs x on x.id = n.id
	  join public.question_templates q on q.id = n.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs) = n.contenu
	   and (not x.noeud_propre or q.classification_node_id = x.noeud);
	select count(*) into v_neufs_tags from _qcp_resolus_tags_neufs x
	  join public.question_template_points q on q.template_id = x.id and q.point_id = x.point_id;
	select count(*) into v_neufs_tous from public.question_template_points q join _qcp_neufs n on n.id = q.template_id;
	if v_neufs <> least(v_presents, 1) * 0 or v_neufs_tags <> least(v_presents, 1) * 0 or v_neufs_tous <> v_neufs_tags then
		raise exception 'modèles neufs incohérents : contenus %, tags %', v_neufs, v_neufs_tags;
	end if;
end $check$;

drop table pg_temp._qcp_resolus_tags_neufs;
drop table pg_temp._qcp_resolus_neufs;
drop table pg_temp._qcp_resolus_tags;
drop table pg_temp._qcp_resolus;
drop table pg_temp._qcp_tags_neufs;
drop table pg_temp._qcp_neufs;
drop table pg_temp._qcp_tags;
drop table pg_temp._qcp_modeles;
