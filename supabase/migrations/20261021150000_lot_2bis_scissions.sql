-- ============================================================================
-- Lot 2 bis, modèles à modifier — lot D « scinder en deux modèles » : 3 modèles de 5e
-- « additionner ou soustraire des fractions » sont scindés. Chacun garde son identifiant, ses
-- variations d'addition et reçoit le tag 5-026 ; un modèle NEUF (identifiant fixé) reçoit ses
-- variations de soustraction et le tag 5-123 (ADR 0020 § 7). f92d63a6 et sa moitié neuve perdent
-- « en simplifiant le plus possible le résultat » et acceptent le résultat non simplifié
-- (`options.constraints.reducedFractions` à `off`). Les specs de test suivent leurs variations.
-- ============================================================================
-- Source de vérité : docs/wip/arbre-notions/analyse/lot-2bis-modifications.md § 4 « Scinder en deux
-- modèles », VALIDÉ par David (2026-10-20, formes tranchées le 2026-10-21). Fichier GÉNÉRÉ par
-- docs/wip/arbre-notions/analyse/lot-2bis-scissions.py — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle, n'en crée aucun et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (3 modèles).
-- Elle est prouvée par tests/integration/lot-2bis-scissions.test.ts, qui fabrique des copies des
-- identifiants de la prod (contenu, options, nœud et niveaux d'avant) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit avoir EXACTEMENT le contenu relevé le 2026-10-21 (titre, sous-titre,
-- variations, partie commune, specs, options), être au nœud et aux niveaux relevés, et ne porter
-- aucun tag du CP à la 3e ; les identifiants des modèles neufs doivent être libres.
--
-- Données d'élèves : aucune ne tient à ces modèles (relevé du 2026-10-21, lecture seule : 0 carte
-- SRS, 0 tentative de compétence, 0 tentative d'évaluation, 0 réponse de test, 0 activité de
-- journal ; aucun exercice, fiche, paquet, série ni favori ne les cite) : rien n'est à reporter sur
-- les modèles neufs. Le rollback supprime les modèles neufs ; il refuse si une donnée d'élève y tient
-- (cartes SRS et activités de journal partiraient en cascade). `updated_at` avance.
--
-- Accès : aucune règle d'accès ne change. Les modèles neufs sont publiés comme leur origine, avec le
-- même auteur, et lisibles par les mêmes personnes ; leurs tags sont lisibles par tout utilisateur
-- connecté (policy question_template_points_read_authenticated), comme ceux de #1563 à #1568.
--
-- Rollback (il rend aux modèles leur contenu d'avant et retire les tags posés ; aucune
-- donnée d'élève). Garde : il refuse si un modèle n'a plus EXACTEMENT le contenu posé par
-- la migration (empreinte md5), pour ne pas écraser une modification faite depuis dans
-- l'éditeur. Bloc éprouvé par le test d'intégration, à jouer dans une transaction :
-- ROLLBACK:BEGIN
-- Modèles neufs des scissions : le rollback les SUPPRIME. Il refuse si l'un d'eux a été
-- retouché depuis la migration ou porte une donnée d'élève (la suppression emporterait en
-- cascade cartes SRS et activités de journal).
-- do $retour_neufs$
-- declare v_intacts integer; v_eleves integer;
-- begin
-- 	perform 1 from public.question_templates where id in ('e100ea6c-c52e-4f35-aec5-df72768d2041', '2af592ca-d9a9-4539-8d2d-80729a51a5e4', '4e1ed43e-33ee-423b-b475-4d3674e2b3e0') for update;
-- 	select count(*) into v_intacts from public.question_templates q join (values
-- 		('e100ea6c-c52e-4f35-aec5-df72768d2041'::uuid, '6c8bdf9f88dcca33cdc0fdb242bf16db'),
-- 		('2af592ca-d9a9-4539-8d2d-80729a51a5e4'::uuid, '0ec56bb4b9112d3b8ddf2dece6175d09'),
-- 		('4e1ed43e-33ee-423b-b475-4d3674e2b3e0'::uuid, '942576fd2f235d899637d77581133372')
-- 	) as r(id, h) on r.id = q.id
-- 	 where md5(jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs, 'options', q.options)::text) = r.h;
-- 	if v_intacts <> 3 then
-- 		raise exception 'rollback : % modèle(s) neuf(s) sur 3 portent encore le contenu de la migration', v_intacts;
-- 	end if;
-- 	select (select count(*) from public.srs_cards where template_id in ('e100ea6c-c52e-4f35-aec5-df72768d2041', '2af592ca-d9a9-4539-8d2d-80729a51a5e4', '4e1ed43e-33ee-423b-b475-4d3674e2b3e0'))
-- 	     + (select count(*) from public.skill_attempts where template_id in ('e100ea6c-c52e-4f35-aec5-df72768d2041', '2af592ca-d9a9-4539-8d2d-80729a51a5e4', '4e1ed43e-33ee-423b-b475-4d3674e2b3e0'))
-- 	     + (select count(*) from public.journal_entry_activities where question_template_id in ('e100ea6c-c52e-4f35-aec5-df72768d2041', '2af592ca-d9a9-4539-8d2d-80729a51a5e4', '4e1ed43e-33ee-423b-b475-4d3674e2b3e0'))
-- 	     + (select count(*) from public.evaluation_attempt_questions where template_id in ('e100ea6c-c52e-4f35-aec5-df72768d2041', '2af592ca-d9a9-4539-8d2d-80729a51a5e4', '4e1ed43e-33ee-423b-b475-4d3674e2b3e0'))
-- 	     + (select count(*) from public.test_answers where template_id in ('e100ea6c-c52e-4f35-aec5-df72768d2041', '2af592ca-d9a9-4539-8d2d-80729a51a5e4', '4e1ed43e-33ee-423b-b475-4d3674e2b3e0'))
-- 	  into v_eleves;
-- 	if v_eleves <> 0 then
-- 		raise exception 'rollback : % donnée(s) d''élève tiennent aux modèles neufs', v_eleves;
-- 	end if;
-- end $retour_neufs$;
-- do $retour$
-- declare v_intacts integer;
-- begin
-- 	perform 1 from public.question_templates where id in (
-- 		'71ee6212-6739-4b1c-adf9-358cfda13cea',
-- 		'ae988cc8-040a-4cff-9080-b99a05d7acfa',
-- 		'f92d63a6-407d-4887-b263-f708f5904075') for update;
-- 	select count(*) into v_intacts from public.question_templates q join (values
-- 		('71ee6212-6739-4b1c-adf9-358cfda13cea'::uuid, '4ab40a15e6859e3d8be690f02dc9df24'),
-- 		('ae988cc8-040a-4cff-9080-b99a05d7acfa'::uuid, 'a8587f1732c332bf4060b68a3bc2a943'),
-- 		('f92d63a6-407d-4887-b263-f708f5904075'::uuid, '295264887ec793f36d1f2b279c4ca706')
-- 	) as r(id, h) on r.id = q.id
-- 	 where md5(jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations,
-- 	                              'shared', q.shared, 'test_specs', q.test_specs, 'options', q.options)::text) = r.h;
-- 	if v_intacts <> 3 then
-- 		raise exception 'rollback : % modèle(s) sur 3 portent encore le contenu de la migration', v_intacts;
-- 	end if;
-- end $retour$;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
--   ('71ee6212-6739-4b1c-adf9-358cfda13cea'::uuid, '5', '5-026'),
--   ('ae988cc8-040a-4cff-9080-b99a05d7acfa'::uuid, '5', '5-026'),
--   ('f92d63a6-407d-4887-b263-f708f5904075'::uuid, '5', '5-026')
--  ) as r(template_id, grade, code)
--  where q.template_id = r.template_id and p.id = q.point_id and p.grade = r.grade and p.code = r.code;
-- update public.question_templates q
--    set title = r.c->>'title', description = r.c->>'description', variations = r.c->'variations',
--        shared = nullif(r.c->'shared', 'null'::jsonb), test_specs = nullif(r.c->'test_specs', 'null'::jsonb), options = nullif(r.c->'options', 'null'::jsonb)
--   from (values
--   ('71ee6212-6739-4b1c-adf9-358cfda13cea'::uuid, $l2d${"title":"Additionner ou soustraire","description":"Dénominateur multiple de l'autre, nombres positifs, sans simplification","variations":[{"blanks":[{"expectedAnswer":"\\frac{{{eval:a*d+b}}}{{{eval:c*d}}}"}],"statement":"Calcule.\n\n$${{expression1}}$$","variables":[{"name":"expression1","expression":"{{a}}/{{c}}+{{b}}/{{eval:c*d}}"}],"conditions":["gcd(a*d+b,c*d)=1"],"correction":{"steps":["$$\\begin{align} \\dfrac{{{a}}}{{{c}}} + \\dfrac{{{b}}}{{{eval:c*d}}} &= \\dfrac{{{a}}\\textcolor{{{color:primary.1}}}{\\times {{d}}}}{{{c}}\\textcolor{{{color:primary.1}}}{\\times {{d}}}} + \\dfrac{{{b}}}{{{eval:c*d}}} \\\\ &= \\dfrac{{{eval:a*d}}}{\\textcolor{{{color:primary.0}}}{{{eval:c*d}}}} + \\dfrac{{{b}}}{\\textcolor{{{color:primary.0}}}{{{eval:c*d}}}} \\\\ &= \\dfrac{{{eval:a*d}}+{{b}}}{\\textcolor{{{color:primary.0}}}{{{eval:c*d}}}} \\\\ &= {{solution}}  \\end{align}$$"]}},{"blanks":[{"expectedAnswer":"\\frac{{{eval:a*d+b}}}{{{eval:c*d}}}"}],"statement":"Calcule.\n\n$${{expression2}}$$","variables":[{"name":"expression2","expression":"{{b}}/{{eval:c*d}}+{{a}}/{{c}}"}],"conditions":["gcd(a*d+b,c*d)=1"],"correction":{"steps":["$$\\begin{align} \\dfrac{{{b}}}{{{eval:c*d}}} + \\dfrac{{{a}}}{{{c}}} &= \\dfrac{{{b}}}{{{eval:c*d}}} + \\dfrac{{{a}}\\textcolor{{{color:primary.1}}}{\\times {{d}}}}{{{c}}\\textcolor{{{color:primary.1}}}{\\times {{d}}}} \\\\ &= \\dfrac{{{b}}}{\\textcolor{{{color:primary.0}}}{{{eval:c*d}}}} + \\dfrac{{{eval:a*d}}}{\\textcolor{{{color:primary.0}}}{{{eval:c*d}}}} \\\\ &= \\dfrac{{{b}}+{{eval:a*d}}}{\\textcolor{{{color:primary.0}}}{{{eval:c*d}}}} \\\\ &= {{solution}}  \\end{align}$$"]}},{"blanks":[{"expectedAnswer":"\\frac{{{eval:a*d-b}}}{{{eval:c*d}}}"}],"statement":"Calcule.\n\n$${{expression3}}$$","variables":[{"name":"expression3","expression":"{{a}}/{{c}}-{{b}}/{{eval:c*d}}"}],"conditions":["a*d>b && gcd(a*d-b,c*d)=1"],"correction":{"steps":["$$\\begin{align} \\dfrac{{{a}}}{{{c}}} - \\dfrac{{{b}}}{{{eval:c*d}}} &= \\dfrac{{{a}}\\textcolor{{{color:primary.1}}}{\\times {{d}}}}{{{c}}\\textcolor{{{color:primary.1}}}{\\times {{d}}}} - \\dfrac{{{b}}}{{{eval:c*d}}} \\\\ &= \\dfrac{{{eval:a*d}}}{\\textcolor{{{color:primary.0}}}{{{eval:c*d}}}} - \\dfrac{{{b}}}{\\textcolor{{{color:primary.0}}}{{{eval:c*d}}}} \\\\ &= \\dfrac{{{eval:a*d}}-{{b}}}{\\textcolor{{{color:primary.0}}}{{{eval:c*d}}}} \\\\ &= {{solution}}  \\end{align}$$"]}}],"shared":{"variables":[{"name":"a","expression":"2..9"},{"name":"b","expression":"2..9"},{"name":"c","expression":"2..9!cd(a),cd(b)"},{"name":"d","expression":"2..9!cd(b)"}]},"test_specs":[{"answers":["\\frac{16}{25}"],"expected":{"status":"correct"},"variables":{"a":"2","b":"6","c":"5","d":"5"},"description":"v1 bonne réponse","variationIndex":0},{"answers":["\\frac{8}{30}"],"expected":{"status":"incorrect"},"variables":{"a":"2","b":"6","c":"5","d":"5"},"description":"v1 addition terme à terme","variationIndex":0},{"answers":["\\frac{32}{50}"],"expected":{"status":"unoptimal_form","constraintViolations":["reducedFractions"]},"variables":{"a":"2","b":"6","c":"5","d":"5"},"description":"v1 non simplifiée","variationIndex":0},{"answers":["\\frac{72}{49}"],"expected":{"status":"correct"},"variables":{"a":"9","b":"9","c":"7","d":"7"},"description":"v2 bonne réponse","variationIndex":1},{"answers":["\\frac{18}{49}"],"expected":{"status":"incorrect"},"variables":{"a":"9","b":"9","c":"7","d":"7"},"description":"v2 numérateur non multiplié","variationIndex":1},{"answers":["\\frac{18}{35}"],"expected":{"status":"correct"},"variables":{"a":"3","b":"3","c":"5","d":"7"},"description":"v3 bonne réponse","variationIndex":2},{"answers":["\\frac{0}{30}"],"expected":{"status":"incorrect"},"variables":{"a":"3","b":"3","c":"5","d":"7"},"description":"v3 soustraction terme à terme","variationIndex":2}],"options":null}$l2d$::jsonb),
--   ('ae988cc8-040a-4cff-9080-b99a05d7acfa'::uuid, $l2d${"title":"Additionner ou soustraire des fractions","description":"Fractions de même dénominateur, nombres positifs, sans simplification","variations":[{"blanks":[{"expectedAnswer":"\\frac{{{eval:a+b}}}{{{c}}}"}],"statement":"Calcule.\n\n$${{expression1}}$$","variables":[{"name":"a","expression":"2..13"},{"name":"b","expression":"2..13"},{"name":"c","expression":"2..25!cd(a),cd(b),cd({{eval:b+a}})"},{"name":"expression1","expression":"a/c+b/c"}],"correction":{"steps":["$$\\begin{align} \\dfrac{{{a}}}{\\textcolor{{{color:primary.0}}}{{{c}}}}+\\dfrac{{{b}}}{\\textcolor{{{color:primary.0}}}{{{c}}}} &= \\dfrac{{{a}}+{{b}}}{\\textcolor{{{color:primary.0}}}{{{c}}}} \\\\ &= {{solution}}  \\end{align}$$"]}},{"blanks":[{"expectedAnswer":"\\frac{{{eval:a-b}}}{{{c}}}"}],"statement":"Calcule.\n\n$${{expression2}}$$","variables":[{"name":"a","expression":"3..13"},{"name":"b","expression":"2..{{eval:a-1}}"},{"name":"c","expression":"2..25!cd(a),cd(b),cd({{eval:a-b}})"},{"name":"expression2","expression":"a/c-b/c"}],"correction":{"steps":["$$\\begin{align} \\dfrac{{{a}}}{\\textcolor{{{color:primary.0}}}{{{c}}}}-\\dfrac{{{b}}}{\\textcolor{{{color:primary.0}}}{{{c}}}} &= \\dfrac{{{a}}-{{b}}}{\\textcolor{{{color:primary.0}}}{{{c}}}} \\\\ &= {{solution}}  \\end{align}$$"]}}],"shared":null,"test_specs":[{"answers":["\\frac{9}{7}"],"expected":{"status":"correct"},"variables":{"a":"4","b":"5","c":"7"},"description":"addition","variationIndex":0},{"answers":["\\frac{26}{25}"],"expected":{"status":"correct"},"variables":{"a":"13","b":"13","c":"25"},"description":"addition bornes","variationIndex":0},{"answers":["\\frac{9}{14}"],"expected":{"status":"incorrect"},"variables":{"a":"4","b":"5","c":"7"},"description":"addition des dénominateurs","variationIndex":0},{"answers":["\\frac{7}{9}"],"expected":{"status":"correct"},"variables":{"a":"11","b":"4","c":"9"},"description":"soustraction","variationIndex":1},{"answers":["\\frac{1}{5}"],"expected":{"status":"correct"},"variables":{"a":"3","b":"2","c":"5"},"description":"soustraction résultat 1/c","variationIndex":1},{"answers":["\\frac{7}{0}"],"expected":{"status":"incorrect"},"variables":{"a":"11","b":"4","c":"9"},"description":"soustraction des dénominateurs","variationIndex":1},{"answers":["\\frac{14}{18}"],"expected":{"status":"unoptimal_form","constraintViolations":["reducedFractions"]},"variables":{"a":"11","b":"4","c":"9"},"description":"soustraction non simplifiée","variationIndex":1}],"options":null}$l2d$::jsonb),
--   ('f92d63a6-407d-4887-b263-f708f5904075'::uuid, $l2d${"title":"Additionner ou soustraire","description":"Fractions de même dénominateur, nombres positifs, simplification intermediaire possible, simplification finale","variations":[{"blanks":[{"expectedAnswer":"\\frac{{{eval:d/gcd(c,d)}}}{{{eval:c/gcd(c,d)}}}"}],"statement":"Calcule en simplifiant le plus possible le résultat.\n\n$${{expression1}}$$","variables":[{"name":"expression1","expression":"{{eval:b*d}}/{{eval:a*c}}+{{eval:(a-b)*d}}/{{eval:a*c}}"}],"correction":{"steps":["$$\\begin{align} \\dfrac{{{eval:b*d}}}{\\textcolor{{{color:primary.0}}}{{{eval:a*c}}}} + \\dfrac{{{eval:(a-b)*d}}}{\\textcolor{{{color:primary.0}}}{{{eval:a*c}}}} &= \\dfrac{{{eval:b*d}}+{{eval:(a-b)*d}}}{\\textcolor{{{color:primary.0}}}{{{eval:a*c}}}} \\\\ &= \\dfrac{{{eval:a*d}}}{{{eval:a*c}}} \\\\ &=  \\dfrac{{{eval:a*d}}\\textcolor{{{color:primary.1}}}{\\div {{eval:gcd(a*c,a*d)}}}}{{{eval:a*c}}\\textcolor{{{color:primary.1}}}{\\div {{eval:gcd(a*c,a*d)}}}} \\\\ &= {{solution}}  \\end{align}$$"]}},{"blanks":[{"expectedAnswer":"\\frac{{{eval:d/gcd(c,d)}}}{{{eval:c/gcd(c,d)}}}"}],"statement":"Calcule en simplifiant le plus possible le résultat.\n\n$${{expression2}}$$","variables":[{"name":"expression2","expression":"{{eval:a*d}}/{{eval:b*c}}-{{eval:(a-b)*d}}/{{eval:b*c}}"}],"correction":{"steps":["$$\\begin{align} \\dfrac{{{eval:a*d}}}{\\textcolor{{{color:primary.0}}}{{{eval:b*c}}}} - \\dfrac{{{eval:(a-b)*d}}}{\\textcolor{{{color:primary.0}}}{{{eval:b*c}}}} &= \\dfrac{{{eval:a*d}}-{{eval:(a-b)*d}}}{\\textcolor{{{color:primary.0}}}{{{eval:b*c}}}} \\\\ &= \\dfrac{{{eval:b*d}}}{{{eval:b*c}}} \\\\ &=  \\dfrac{{{eval:b*d}}\\textcolor{{{color:primary.1}}}{\\div {{eval:gcd(b*c,b*d)}}}}{{{eval:b*c}}\\textcolor{{{color:primary.1}}}{\\div {{eval:gcd(b*c,b*d)}}}} \\\\ &= {{solution}}  \\end{align}$$"]}}],"shared":{"variables":[{"name":"a","expression":"3..9"},{"name":"b","expression":"2..{{eval:a-1}}"},{"name":"c","expression":"2..9"},{"name":"d","expression":"2..9!m(c)"}]},"test_specs":[{"answers":["\\frac{5}{4}"],"expected":{"status":"correct"},"variables":{"a":"9","b":"6","c":"4","d":"5"},"description":"v1 bonne réponse","variationIndex":0},{"answers":["\\frac{15}{12}"],"expected":{"status":"unoptimal_form","constraintViolations":["reducedFractions"]},"variables":{"a":"9","b":"6","c":"4","d":"5"},"description":"v1 simplification incomplète","variationIndex":0},{"answers":["\\frac{45}{36}"],"expected":{"status":"unoptimal_form","constraintViolations":["reducedFractions"]},"variables":{"a":"9","b":"6","c":"4","d":"5"},"description":"v1 pas simplifiée","variationIndex":0},{"answers":["\\frac{45}{72}"],"expected":{"status":"incorrect"},"variables":{"a":"9","b":"6","c":"4","d":"5"},"description":"v1 addition des dénominateurs","variationIndex":0},{"answers":["\\frac{8}{9}"],"expected":{"status":"correct"},"variables":{"a":"9","b":"8","c":"9","d":"8"},"description":"v1 bornes hautes","variationIndex":0},{"answers":["\\frac{2}{3}"],"expected":{"status":"correct"},"variables":{"a":"6","b":"2","c":"6","d":"4"},"description":"v2 bonne réponse","variationIndex":1},{"answers":["\\frac{3}{2}"],"expected":{"status":"correct"},"variables":{"a":"3","b":"2","c":"2","d":"3"},"description":"v2 bornes basses","variationIndex":1}],"options":null}$l2d$::jsonb)
--   ) as r(id, c)
--  where q.id = r.id;
-- delete from public.question_templates where id in ('e100ea6c-c52e-4f35-aec5-df72768d2041', '2af592ca-d9a9-4539-8d2d-80729a51a5e4', '4e1ed43e-33ee-423b-b475-4d3674e2b3e0');
-- ROLLBACK:END
-- ============================================================================

set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ---------------------------------------------------
drop table if exists pg_temp._l2d_modeles;
create temporary table _l2d_modeles (
	id uuid primary key,
	branche text not null, notion text not null, sous_notion text,
	grades text[] not null,
	tag_grade text not null, tag_code text not null,
	avant jsonb not null, apres jsonb not null
);
insert into _l2d_modeles values ('71ee6212-6739-4b1c-adf9-358cfda13cea', $l2d$Nombres et calculs$l2d$, $l2d$Fractions : calculs$l2d$, $l2d$addition et soustraction$l2d$, array['5'], '5', '5-026',
  $l2d${"title":"Additionner ou soustraire","description":"Dénominateur multiple de l'autre, nombres positifs, sans simplification","variations":[{"blanks":[{"expectedAnswer":"\\frac{{{eval:a*d+b}}}{{{eval:c*d}}}"}],"statement":"Calcule.\n\n$${{expression1}}$$","variables":[{"name":"expression1","expression":"{{a}}/{{c}}+{{b}}/{{eval:c*d}}"}],"conditions":["gcd(a*d+b,c*d)=1"],"correction":{"steps":["$$\\begin{align} \\dfrac{{{a}}}{{{c}}} + \\dfrac{{{b}}}{{{eval:c*d}}} &= \\dfrac{{{a}}\\textcolor{{{color:primary.1}}}{\\times {{d}}}}{{{c}}\\textcolor{{{color:primary.1}}}{\\times {{d}}}} + \\dfrac{{{b}}}{{{eval:c*d}}} \\\\ &= \\dfrac{{{eval:a*d}}}{\\textcolor{{{color:primary.0}}}{{{eval:c*d}}}} + \\dfrac{{{b}}}{\\textcolor{{{color:primary.0}}}{{{eval:c*d}}}} \\\\ &= \\dfrac{{{eval:a*d}}+{{b}}}{\\textcolor{{{color:primary.0}}}{{{eval:c*d}}}} \\\\ &= {{solution}}  \\end{align}$$"]}},{"blanks":[{"expectedAnswer":"\\frac{{{eval:a*d+b}}}{{{eval:c*d}}}"}],"statement":"Calcule.\n\n$${{expression2}}$$","variables":[{"name":"expression2","expression":"{{b}}/{{eval:c*d}}+{{a}}/{{c}}"}],"conditions":["gcd(a*d+b,c*d)=1"],"correction":{"steps":["$$\\begin{align} \\dfrac{{{b}}}{{{eval:c*d}}} + \\dfrac{{{a}}}{{{c}}} &= \\dfrac{{{b}}}{{{eval:c*d}}} + \\dfrac{{{a}}\\textcolor{{{color:primary.1}}}{\\times {{d}}}}{{{c}}\\textcolor{{{color:primary.1}}}{\\times {{d}}}} \\\\ &= \\dfrac{{{b}}}{\\textcolor{{{color:primary.0}}}{{{eval:c*d}}}} + \\dfrac{{{eval:a*d}}}{\\textcolor{{{color:primary.0}}}{{{eval:c*d}}}} \\\\ &= \\dfrac{{{b}}+{{eval:a*d}}}{\\textcolor{{{color:primary.0}}}{{{eval:c*d}}}} \\\\ &= {{solution}}  \\end{align}$$"]}},{"blanks":[{"expectedAnswer":"\\frac{{{eval:a*d-b}}}{{{eval:c*d}}}"}],"statement":"Calcule.\n\n$${{expression3}}$$","variables":[{"name":"expression3","expression":"{{a}}/{{c}}-{{b}}/{{eval:c*d}}"}],"conditions":["a*d>b && gcd(a*d-b,c*d)=1"],"correction":{"steps":["$$\\begin{align} \\dfrac{{{a}}}{{{c}}} - \\dfrac{{{b}}}{{{eval:c*d}}} &= \\dfrac{{{a}}\\textcolor{{{color:primary.1}}}{\\times {{d}}}}{{{c}}\\textcolor{{{color:primary.1}}}{\\times {{d}}}} - \\dfrac{{{b}}}{{{eval:c*d}}} \\\\ &= \\dfrac{{{eval:a*d}}}{\\textcolor{{{color:primary.0}}}{{{eval:c*d}}}} - \\dfrac{{{b}}}{\\textcolor{{{color:primary.0}}}{{{eval:c*d}}}} \\\\ &= \\dfrac{{{eval:a*d}}-{{b}}}{\\textcolor{{{color:primary.0}}}{{{eval:c*d}}}} \\\\ &= {{solution}}  \\end{align}$$"]}}],"shared":{"variables":[{"name":"a","expression":"2..9"},{"name":"b","expression":"2..9"},{"name":"c","expression":"2..9!cd(a),cd(b)"},{"name":"d","expression":"2..9!cd(b)"}]},"test_specs":[{"answers":["\\frac{16}{25}"],"expected":{"status":"correct"},"variables":{"a":"2","b":"6","c":"5","d":"5"},"description":"v1 bonne réponse","variationIndex":0},{"answers":["\\frac{8}{30}"],"expected":{"status":"incorrect"},"variables":{"a":"2","b":"6","c":"5","d":"5"},"description":"v1 addition terme à terme","variationIndex":0},{"answers":["\\frac{32}{50}"],"expected":{"status":"unoptimal_form","constraintViolations":["reducedFractions"]},"variables":{"a":"2","b":"6","c":"5","d":"5"},"description":"v1 non simplifiée","variationIndex":0},{"answers":["\\frac{72}{49}"],"expected":{"status":"correct"},"variables":{"a":"9","b":"9","c":"7","d":"7"},"description":"v2 bonne réponse","variationIndex":1},{"answers":["\\frac{18}{49}"],"expected":{"status":"incorrect"},"variables":{"a":"9","b":"9","c":"7","d":"7"},"description":"v2 numérateur non multiplié","variationIndex":1},{"answers":["\\frac{18}{35}"],"expected":{"status":"correct"},"variables":{"a":"3","b":"3","c":"5","d":"7"},"description":"v3 bonne réponse","variationIndex":2},{"answers":["\\frac{0}{30}"],"expected":{"status":"incorrect"},"variables":{"a":"3","b":"3","c":"5","d":"7"},"description":"v3 soustraction terme à terme","variationIndex":2}],"options":null}$l2d$::jsonb,
  $l2d${"title":"Additionner des fractions","description":"Dénominateur multiple de l'autre, nombres positifs, sans simplification","variations":[{"blanks":[{"expectedAnswer":"\\frac{{{eval:a*d+b}}}{{{eval:c*d}}}"}],"statement":"Calcule.\n\n$${{expression1}}$$","variables":[{"name":"expression1","expression":"{{a}}/{{c}}+{{b}}/{{eval:c*d}}"}],"conditions":["gcd(a*d+b,c*d)=1"],"correction":{"steps":["$$\\begin{align} \\dfrac{{{a}}}{{{c}}} + \\dfrac{{{b}}}{{{eval:c*d}}} &= \\dfrac{{{a}}\\textcolor{{{color:primary.1}}}{\\times {{d}}}}{{{c}}\\textcolor{{{color:primary.1}}}{\\times {{d}}}} + \\dfrac{{{b}}}{{{eval:c*d}}} \\\\ &= \\dfrac{{{eval:a*d}}}{\\textcolor{{{color:primary.0}}}{{{eval:c*d}}}} + \\dfrac{{{b}}}{\\textcolor{{{color:primary.0}}}{{{eval:c*d}}}} \\\\ &= \\dfrac{{{eval:a*d}}+{{b}}}{\\textcolor{{{color:primary.0}}}{{{eval:c*d}}}} \\\\ &= {{solution}}  \\end{align}$$"]}},{"blanks":[{"expectedAnswer":"\\frac{{{eval:a*d+b}}}{{{eval:c*d}}}"}],"statement":"Calcule.\n\n$${{expression2}}$$","variables":[{"name":"expression2","expression":"{{b}}/{{eval:c*d}}+{{a}}/{{c}}"}],"conditions":["gcd(a*d+b,c*d)=1"],"correction":{"steps":["$$\\begin{align} \\dfrac{{{b}}}{{{eval:c*d}}} + \\dfrac{{{a}}}{{{c}}} &= \\dfrac{{{b}}}{{{eval:c*d}}} + \\dfrac{{{a}}\\textcolor{{{color:primary.1}}}{\\times {{d}}}}{{{c}}\\textcolor{{{color:primary.1}}}{\\times {{d}}}} \\\\ &= \\dfrac{{{b}}}{\\textcolor{{{color:primary.0}}}{{{eval:c*d}}}} + \\dfrac{{{eval:a*d}}}{\\textcolor{{{color:primary.0}}}{{{eval:c*d}}}} \\\\ &= \\dfrac{{{b}}+{{eval:a*d}}}{\\textcolor{{{color:primary.0}}}{{{eval:c*d}}}} \\\\ &= {{solution}}  \\end{align}$$"]}}],"shared":{"variables":[{"name":"a","expression":"2..9"},{"name":"b","expression":"2..9"},{"name":"c","expression":"2..9!cd(a),cd(b)"},{"name":"d","expression":"2..9!cd(b)"}]},"test_specs":[{"answers":["\\frac{16}{25}"],"expected":{"status":"correct"},"variables":{"a":"2","b":"6","c":"5","d":"5"},"description":"v0 bonne réponse","variationIndex":0},{"answers":["\\frac{8}{30}"],"expected":{"status":"incorrect"},"variables":{"a":"2","b":"6","c":"5","d":"5"},"description":"v0 addition terme à terme","variationIndex":0},{"answers":["\\frac{32}{50}"],"expected":{"status":"unoptimal_form","constraintViolations":["reducedFractions"]},"variables":{"a":"2","b":"6","c":"5","d":"5"},"description":"v0 non simplifiée","variationIndex":0},{"answers":["\\frac{72}{49}"],"expected":{"status":"correct"},"variables":{"a":"9","b":"9","c":"7","d":"7"},"description":"v1 bonne réponse","variationIndex":1},{"answers":["\\frac{18}{49}"],"expected":{"status":"incorrect"},"variables":{"a":"9","b":"9","c":"7","d":"7"},"description":"v1 numérateur non multiplié","variationIndex":1}],"options":null}$l2d$::jsonb);
insert into _l2d_modeles values ('ae988cc8-040a-4cff-9080-b99a05d7acfa', $l2d$Nombres et calculs$l2d$, $l2d$Fractions : calculs$l2d$, $l2d$addition et soustraction$l2d$, array['5'], '5', '5-026',
  $l2d${"title":"Additionner ou soustraire des fractions","description":"Fractions de même dénominateur, nombres positifs, sans simplification","variations":[{"blanks":[{"expectedAnswer":"\\frac{{{eval:a+b}}}{{{c}}}"}],"statement":"Calcule.\n\n$${{expression1}}$$","variables":[{"name":"a","expression":"2..13"},{"name":"b","expression":"2..13"},{"name":"c","expression":"2..25!cd(a),cd(b),cd({{eval:b+a}})"},{"name":"expression1","expression":"a/c+b/c"}],"correction":{"steps":["$$\\begin{align} \\dfrac{{{a}}}{\\textcolor{{{color:primary.0}}}{{{c}}}}+\\dfrac{{{b}}}{\\textcolor{{{color:primary.0}}}{{{c}}}} &= \\dfrac{{{a}}+{{b}}}{\\textcolor{{{color:primary.0}}}{{{c}}}} \\\\ &= {{solution}}  \\end{align}$$"]}},{"blanks":[{"expectedAnswer":"\\frac{{{eval:a-b}}}{{{c}}}"}],"statement":"Calcule.\n\n$${{expression2}}$$","variables":[{"name":"a","expression":"3..13"},{"name":"b","expression":"2..{{eval:a-1}}"},{"name":"c","expression":"2..25!cd(a),cd(b),cd({{eval:a-b}})"},{"name":"expression2","expression":"a/c-b/c"}],"correction":{"steps":["$$\\begin{align} \\dfrac{{{a}}}{\\textcolor{{{color:primary.0}}}{{{c}}}}-\\dfrac{{{b}}}{\\textcolor{{{color:primary.0}}}{{{c}}}} &= \\dfrac{{{a}}-{{b}}}{\\textcolor{{{color:primary.0}}}{{{c}}}} \\\\ &= {{solution}}  \\end{align}$$"]}}],"shared":null,"test_specs":[{"answers":["\\frac{9}{7}"],"expected":{"status":"correct"},"variables":{"a":"4","b":"5","c":"7"},"description":"addition","variationIndex":0},{"answers":["\\frac{26}{25}"],"expected":{"status":"correct"},"variables":{"a":"13","b":"13","c":"25"},"description":"addition bornes","variationIndex":0},{"answers":["\\frac{9}{14}"],"expected":{"status":"incorrect"},"variables":{"a":"4","b":"5","c":"7"},"description":"addition des dénominateurs","variationIndex":0},{"answers":["\\frac{7}{9}"],"expected":{"status":"correct"},"variables":{"a":"11","b":"4","c":"9"},"description":"soustraction","variationIndex":1},{"answers":["\\frac{1}{5}"],"expected":{"status":"correct"},"variables":{"a":"3","b":"2","c":"5"},"description":"soustraction résultat 1/c","variationIndex":1},{"answers":["\\frac{7}{0}"],"expected":{"status":"incorrect"},"variables":{"a":"11","b":"4","c":"9"},"description":"soustraction des dénominateurs","variationIndex":1},{"answers":["\\frac{14}{18}"],"expected":{"status":"unoptimal_form","constraintViolations":["reducedFractions"]},"variables":{"a":"11","b":"4","c":"9"},"description":"soustraction non simplifiée","variationIndex":1}],"options":null}$l2d$::jsonb,
  $l2d${"title":"Additionner des fractions","description":"Même dénominateur, nombres positifs, sans simplification","variations":[{"blanks":[{"expectedAnswer":"\\frac{{{eval:a+b}}}{{{c}}}"}],"statement":"Calcule.\n\n$${{expression1}}$$","variables":[{"name":"a","expression":"2..13"},{"name":"b","expression":"2..13"},{"name":"c","expression":"2..25!cd(a),cd(b),cd({{eval:b+a}})"},{"name":"expression1","expression":"a/c+b/c"}],"correction":{"steps":["$$\\begin{align} \\dfrac{{{a}}}{\\textcolor{{{color:primary.0}}}{{{c}}}}+\\dfrac{{{b}}}{\\textcolor{{{color:primary.0}}}{{{c}}}} &= \\dfrac{{{a}}+{{b}}}{\\textcolor{{{color:primary.0}}}{{{c}}}} \\\\ &= {{solution}}  \\end{align}$$"]}}],"shared":null,"test_specs":[{"answers":["\\frac{9}{7}"],"expected":{"status":"correct"},"variables":{"a":"4","b":"5","c":"7"},"description":"addition","variationIndex":0},{"answers":["\\frac{26}{25}"],"expected":{"status":"correct"},"variables":{"a":"13","b":"13","c":"25"},"description":"addition bornes","variationIndex":0},{"answers":["\\frac{9}{14}"],"expected":{"status":"incorrect"},"variables":{"a":"4","b":"5","c":"7"},"description":"addition des dénominateurs","variationIndex":0}],"options":null}$l2d$::jsonb);
insert into _l2d_modeles values ('f92d63a6-407d-4887-b263-f708f5904075', $l2d$Nombres et calculs$l2d$, $l2d$Fractions : calculs$l2d$, $l2d$addition et soustraction$l2d$, array['5'], '5', '5-026',
  $l2d${"title":"Additionner ou soustraire","description":"Fractions de même dénominateur, nombres positifs, simplification intermediaire possible, simplification finale","variations":[{"blanks":[{"expectedAnswer":"\\frac{{{eval:d/gcd(c,d)}}}{{{eval:c/gcd(c,d)}}}"}],"statement":"Calcule en simplifiant le plus possible le résultat.\n\n$${{expression1}}$$","variables":[{"name":"expression1","expression":"{{eval:b*d}}/{{eval:a*c}}+{{eval:(a-b)*d}}/{{eval:a*c}}"}],"correction":{"steps":["$$\\begin{align} \\dfrac{{{eval:b*d}}}{\\textcolor{{{color:primary.0}}}{{{eval:a*c}}}} + \\dfrac{{{eval:(a-b)*d}}}{\\textcolor{{{color:primary.0}}}{{{eval:a*c}}}} &= \\dfrac{{{eval:b*d}}+{{eval:(a-b)*d}}}{\\textcolor{{{color:primary.0}}}{{{eval:a*c}}}} \\\\ &= \\dfrac{{{eval:a*d}}}{{{eval:a*c}}} \\\\ &=  \\dfrac{{{eval:a*d}}\\textcolor{{{color:primary.1}}}{\\div {{eval:gcd(a*c,a*d)}}}}{{{eval:a*c}}\\textcolor{{{color:primary.1}}}{\\div {{eval:gcd(a*c,a*d)}}}} \\\\ &= {{solution}}  \\end{align}$$"]}},{"blanks":[{"expectedAnswer":"\\frac{{{eval:d/gcd(c,d)}}}{{{eval:c/gcd(c,d)}}}"}],"statement":"Calcule en simplifiant le plus possible le résultat.\n\n$${{expression2}}$$","variables":[{"name":"expression2","expression":"{{eval:a*d}}/{{eval:b*c}}-{{eval:(a-b)*d}}/{{eval:b*c}}"}],"correction":{"steps":["$$\\begin{align} \\dfrac{{{eval:a*d}}}{\\textcolor{{{color:primary.0}}}{{{eval:b*c}}}} - \\dfrac{{{eval:(a-b)*d}}}{\\textcolor{{{color:primary.0}}}{{{eval:b*c}}}} &= \\dfrac{{{eval:a*d}}-{{eval:(a-b)*d}}}{\\textcolor{{{color:primary.0}}}{{{eval:b*c}}}} \\\\ &= \\dfrac{{{eval:b*d}}}{{{eval:b*c}}} \\\\ &=  \\dfrac{{{eval:b*d}}\\textcolor{{{color:primary.1}}}{\\div {{eval:gcd(b*c,b*d)}}}}{{{eval:b*c}}\\textcolor{{{color:primary.1}}}{\\div {{eval:gcd(b*c,b*d)}}}} \\\\ &= {{solution}}  \\end{align}$$"]}}],"shared":{"variables":[{"name":"a","expression":"3..9"},{"name":"b","expression":"2..{{eval:a-1}}"},{"name":"c","expression":"2..9"},{"name":"d","expression":"2..9!m(c)"}]},"test_specs":[{"answers":["\\frac{5}{4}"],"expected":{"status":"correct"},"variables":{"a":"9","b":"6","c":"4","d":"5"},"description":"v1 bonne réponse","variationIndex":0},{"answers":["\\frac{15}{12}"],"expected":{"status":"unoptimal_form","constraintViolations":["reducedFractions"]},"variables":{"a":"9","b":"6","c":"4","d":"5"},"description":"v1 simplification incomplète","variationIndex":0},{"answers":["\\frac{45}{36}"],"expected":{"status":"unoptimal_form","constraintViolations":["reducedFractions"]},"variables":{"a":"9","b":"6","c":"4","d":"5"},"description":"v1 pas simplifiée","variationIndex":0},{"answers":["\\frac{45}{72}"],"expected":{"status":"incorrect"},"variables":{"a":"9","b":"6","c":"4","d":"5"},"description":"v1 addition des dénominateurs","variationIndex":0},{"answers":["\\frac{8}{9}"],"expected":{"status":"correct"},"variables":{"a":"9","b":"8","c":"9","d":"8"},"description":"v1 bornes hautes","variationIndex":0},{"answers":["\\frac{2}{3}"],"expected":{"status":"correct"},"variables":{"a":"6","b":"2","c":"6","d":"4"},"description":"v2 bonne réponse","variationIndex":1},{"answers":["\\frac{3}{2}"],"expected":{"status":"correct"},"variables":{"a":"3","b":"2","c":"2","d":"3"},"description":"v2 bornes basses","variationIndex":1}],"options":null}$l2d$::jsonb,
  $l2d${"title":"Additionner des fractions","description":"Même dénominateur, nombres positifs, résultat simplifiable","variations":[{"blanks":[{"expectedAnswer":"\\frac{{{eval:d/gcd(c,d)}}}{{{eval:c/gcd(c,d)}}}"}],"statement":"Calcule.\n\n$${{expression1}}$$","variables":[{"name":"expression1","expression":"{{eval:b*d}}/{{eval:a*c}}+{{eval:(a-b)*d}}/{{eval:a*c}}"}],"correction":{"steps":["$$\\begin{align} \\dfrac{{{eval:b*d}}}{\\textcolor{{{color:primary.0}}}{{{eval:a*c}}}} + \\dfrac{{{eval:(a-b)*d}}}{\\textcolor{{{color:primary.0}}}{{{eval:a*c}}}} &= \\dfrac{{{eval:b*d}}+{{eval:(a-b)*d}}}{\\textcolor{{{color:primary.0}}}{{{eval:a*c}}}} \\\\ &= \\dfrac{{{eval:a*d}}}{{{eval:a*c}}} \\\\ &=  \\dfrac{{{eval:a*d}}\\textcolor{{{color:primary.1}}}{\\div {{eval:gcd(a*c,a*d)}}}}{{{eval:a*c}}\\textcolor{{{color:primary.1}}}{\\div {{eval:gcd(a*c,a*d)}}}} \\\\ &= {{solution}}  \\end{align}$$"]}}],"shared":{"variables":[{"name":"a","expression":"3..9"},{"name":"b","expression":"2..{{eval:a-1}}"},{"name":"c","expression":"2..9"},{"name":"d","expression":"2..9!m(c)"}]},"test_specs":[{"answers":["\\frac{5}{4}"],"expected":{"status":"correct"},"variables":{"a":"9","b":"6","c":"4","d":"5"},"description":"v0 bonne réponse","variationIndex":0},{"answers":["\\frac{15}{12}"],"expected":{"status":"correct"},"variables":{"a":"9","b":"6","c":"4","d":"5"},"description":"v0 simplification incomplète (acceptée)","variationIndex":0},{"answers":["\\frac{45}{36}"],"expected":{"status":"correct"},"variables":{"a":"9","b":"6","c":"4","d":"5"},"description":"v0 pas simplifiée (acceptée)","variationIndex":0},{"answers":["\\frac{45}{72}"],"expected":{"status":"incorrect"},"variables":{"a":"9","b":"6","c":"4","d":"5"},"description":"v0 addition des dénominateurs","variationIndex":0},{"answers":["\\frac{8}{9}"],"expected":{"status":"correct"},"variables":{"a":"9","b":"8","c":"9","d":"8"},"description":"v0 bornes hautes","variationIndex":0}],"options":{"constraints":{"reducedFractions":"off"}}}$l2d$::jsonb);

-- Modèles neufs des scissions : chacun copie les autres colonnes de son origine.
drop table if exists pg_temp._l2d_neufs;
create temporary table _l2d_neufs (
	id uuid primary key,
	origine uuid not null references _l2d_modeles (id),
	tag_grade text not null, tag_code text not null,
	contenu jsonb not null
);
insert into _l2d_neufs values ('e100ea6c-c52e-4f35-aec5-df72768d2041', '71ee6212-6739-4b1c-adf9-358cfda13cea', '5', '5-123',
  $l2d${"title":"Soustraire des fractions","description":"Dénominateur multiple de l'autre, nombres positifs, sans simplification","variations":[{"blanks":[{"expectedAnswer":"\\frac{{{eval:a*d-b}}}{{{eval:c*d}}}"}],"statement":"Calcule.\n\n$${{expression3}}$$","variables":[{"name":"expression3","expression":"{{a}}/{{c}}-{{b}}/{{eval:c*d}}"}],"conditions":["a*d>b && gcd(a*d-b,c*d)=1"],"correction":{"steps":["$$\\begin{align} \\dfrac{{{a}}}{{{c}}} - \\dfrac{{{b}}}{{{eval:c*d}}} &= \\dfrac{{{a}}\\textcolor{{{color:primary.1}}}{\\times {{d}}}}{{{c}}\\textcolor{{{color:primary.1}}}{\\times {{d}}}} - \\dfrac{{{b}}}{{{eval:c*d}}} \\\\ &= \\dfrac{{{eval:a*d}}}{\\textcolor{{{color:primary.0}}}{{{eval:c*d}}}} - \\dfrac{{{b}}}{\\textcolor{{{color:primary.0}}}{{{eval:c*d}}}} \\\\ &= \\dfrac{{{eval:a*d}}-{{b}}}{\\textcolor{{{color:primary.0}}}{{{eval:c*d}}}} \\\\ &= {{solution}}  \\end{align}$$"]}}],"shared":{"variables":[{"name":"a","expression":"2..9"},{"name":"b","expression":"2..9"},{"name":"c","expression":"2..9!cd(a),cd(b)"},{"name":"d","expression":"2..9!cd(b)"}]},"test_specs":[{"answers":["\\frac{18}{35}"],"expected":{"status":"correct"},"variables":{"a":"3","b":"3","c":"5","d":"7"},"description":"v0 bonne réponse","variationIndex":0},{"answers":["\\frac{0}{30}"],"expected":{"status":"incorrect"},"variables":{"a":"3","b":"3","c":"5","d":"7"},"description":"v0 soustraction terme à terme","variationIndex":0}],"options":null}$l2d$::jsonb);
insert into _l2d_neufs values ('2af592ca-d9a9-4539-8d2d-80729a51a5e4', 'ae988cc8-040a-4cff-9080-b99a05d7acfa', '5', '5-123',
  $l2d${"title":"Soustraire des fractions","description":"Même dénominateur, nombres positifs, sans simplification","variations":[{"blanks":[{"expectedAnswer":"\\frac{{{eval:a-b}}}{{{c}}}"}],"statement":"Calcule.\n\n$${{expression2}}$$","variables":[{"name":"a","expression":"3..13"},{"name":"b","expression":"2..{{eval:a-1}}"},{"name":"c","expression":"2..25!cd(a),cd(b),cd({{eval:a-b}})"},{"name":"expression2","expression":"a/c-b/c"}],"correction":{"steps":["$$\\begin{align} \\dfrac{{{a}}}{\\textcolor{{{color:primary.0}}}{{{c}}}}-\\dfrac{{{b}}}{\\textcolor{{{color:primary.0}}}{{{c}}}} &= \\dfrac{{{a}}-{{b}}}{\\textcolor{{{color:primary.0}}}{{{c}}}} \\\\ &= {{solution}}  \\end{align}$$"]}}],"shared":null,"test_specs":[{"answers":["\\frac{7}{9}"],"expected":{"status":"correct"},"variables":{"a":"11","b":"4","c":"9"},"description":"soustraction","variationIndex":0},{"answers":["\\frac{1}{5}"],"expected":{"status":"correct"},"variables":{"a":"3","b":"2","c":"5"},"description":"soustraction résultat 1/c","variationIndex":0},{"answers":["\\frac{7}{0}"],"expected":{"status":"incorrect"},"variables":{"a":"11","b":"4","c":"9"},"description":"soustraction des dénominateurs","variationIndex":0},{"answers":["\\frac{14}{18}"],"expected":{"status":"unoptimal_form","constraintViolations":["reducedFractions"]},"variables":{"a":"11","b":"4","c":"9"},"description":"soustraction non simplifiée","variationIndex":0}],"options":null}$l2d$::jsonb);
insert into _l2d_neufs values ('4e1ed43e-33ee-423b-b475-4d3674e2b3e0', 'f92d63a6-407d-4887-b263-f708f5904075', '5', '5-123',
  $l2d${"title":"Soustraire des fractions","description":"Même dénominateur, nombres positifs, résultat simplifiable","variations":[{"blanks":[{"expectedAnswer":"\\frac{{{eval:d/gcd(c,d)}}}{{{eval:c/gcd(c,d)}}}"}],"statement":"Calcule.\n\n$${{expression2}}$$","variables":[{"name":"expression2","expression":"{{eval:a*d}}/{{eval:b*c}}-{{eval:(a-b)*d}}/{{eval:b*c}}"}],"correction":{"steps":["$$\\begin{align} \\dfrac{{{eval:a*d}}}{\\textcolor{{{color:primary.0}}}{{{eval:b*c}}}} - \\dfrac{{{eval:(a-b)*d}}}{\\textcolor{{{color:primary.0}}}{{{eval:b*c}}}} &= \\dfrac{{{eval:a*d}}-{{eval:(a-b)*d}}}{\\textcolor{{{color:primary.0}}}{{{eval:b*c}}}} \\\\ &= \\dfrac{{{eval:b*d}}}{{{eval:b*c}}} \\\\ &=  \\dfrac{{{eval:b*d}}\\textcolor{{{color:primary.1}}}{\\div {{eval:gcd(b*c,b*d)}}}}{{{eval:b*c}}\\textcolor{{{color:primary.1}}}{\\div {{eval:gcd(b*c,b*d)}}}} \\\\ &= {{solution}}  \\end{align}$$"]}}],"shared":{"variables":[{"name":"a","expression":"3..9"},{"name":"b","expression":"2..{{eval:a-1}}"},{"name":"c","expression":"2..9"},{"name":"d","expression":"2..9!m(c)"}]},"test_specs":[{"answers":["\\frac{2}{3}"],"expected":{"status":"correct"},"variables":{"a":"6","b":"2","c":"6","d":"4"},"description":"v0 bonne réponse","variationIndex":0},{"answers":["\\frac{3}{2}"],"expected":{"status":"correct"},"variables":{"a":"3","b":"2","c":"2","d":"3"},"description":"v0 bornes basses","variationIndex":0},{"answers":["\\frac{8}{12}"],"expected":{"status":"correct"},"variables":{"a":"6","b":"2","c":"6","d":"4"},"description":"v0 non simplifiée (acceptée)","variationIndex":0},{"answers":["\\frac{8}{0}"],"expected":{"status":"incorrect"},"variables":{"a":"6","b":"2","c":"6","d":"4"},"description":"v0 soustraction des dénominateurs","variationIndex":0}],"options":{"constraints":{"reducedFractions":"off"}}}$l2d$::jsonb);

-- ---- 2. Résolution STRICTE des nœuds et des points --------------------------------------
create temporary table _l2d_resolus as
	select r.id,
	       case when r.sous_notion is null then nn.id else s.id end as noeud,
	       p.id as point_id
	  from _l2d_modeles r
	  left join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.name = r.branche
	  left join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = r.notion
	  left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = nn.id and s.name = r.sous_notion
	  left join public.curriculum_points p on p.grade = r.tag_grade and p.code = r.tag_code and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from _l2d_resolus where noeud is null or point_id is null) then
		raise exception 'nœuds ou points introuvables : %',
			(select count(*) from _l2d_resolus where noeud is null or point_id is null);
	end if;
end $resolution$;

create temporary table _l2d_resolus_neufs as
	select n.id, p.id as point_id
	  from _l2d_neufs n
	  left join public.curriculum_points p on p.grade = n.tag_grade and p.code = n.tag_code and p.archived_at is null;
do $resolution_neufs$
begin
	if exists (select 1 from _l2d_resolus_neufs where point_id is null) then
		raise exception 'points des modèles neufs introuvables : %',
			(select count(*) from _l2d_resolus_neufs where point_id is null);
	end if;
end $resolution_neufs$;

-- ---- 3. Gardes : présence TOUT ou RIEN, contenu et rangement relevés, aucun tag posé -------
do $garde$
declare v_presents integer; v_contenus integer; v_ranges integer; v_tags integer; v_pris integer;
begin
	-- Verrou : aucune sauvegarde de l'éditeur ne peut s'intercaler entre la garde et la mise à jour.
	perform 1 from public.question_templates q join _l2d_modeles r on r.id = q.id for update of q;
	select count(*) into v_presents from _l2d_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 3) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 3', v_presents;
	end if;
	select count(*) into v_contenus from _l2d_modeles r
	  join public.question_templates q on q.id = r.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations,
	                          'shared', q.shared, 'test_specs', q.test_specs, 'options', q.options) is distinct from r.avant;
	if v_contenus <> 0 then
		raise exception 'modèles modifiés depuis le relevé : %', v_contenus;
	end if;
	select count(*) into v_ranges from _l2d_modeles r
	  join _l2d_resolus x on x.id = r.id
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is distinct from x.noeud or q.grades is distinct from r.grades;
	if v_ranges <> 0 then
		raise exception 'modèles déplacés ou reclassés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _l2d_modeles r on r.id = q.template_id
	  join public.curriculum_points p on p.id = q.point_id
	 where p.grade in ('CP', 'CE1', 'CE2', 'CM1', 'CM2', '6', '5', '4', '3');
	if v_tags <> 0 then
		raise exception 'tags déjà posés sur ces modèles : %', v_tags;
	end if;
	select count(*) into v_pris from _l2d_neufs n join public.question_templates q on q.id = n.id;
	if v_pris <> 0 then
		raise exception 'identifiants des modèles neufs déjà pris : %', v_pris;
	end if;
end $garde$;

-- ---- 4. Nouveau contenu, puis tags ------------------------------------------------------
update public.question_templates q
   set title = r.apres->>'title',
       description = r.apres->>'description',
       variations = r.apres->'variations',
       shared = nullif(r.apres->'shared', 'null'::jsonb),
       test_specs = nullif(r.apres->'test_specs', 'null'::jsonb), options = nullif(r.apres->'options', 'null'::jsonb)
  from _l2d_modeles r
 where q.id = r.id;

insert into public.question_template_points (template_id, point_id)
select x.id, x.point_id
  from _l2d_resolus x
  join public.question_templates q on q.id = x.id;

-- Modèles neufs : toutes les colonnes de l'origine (type, nœud, niveaux, statut, auteur…), puis leur
-- propre identifiant, leur contenu et des dates neuves. Rien n'est créé si l'origine est absente.
insert into public.question_templates
select (jsonb_populate_record(null::public.question_templates,
	to_jsonb(q) || n.contenu || jsonb_build_object('id', n.id, 'created_at', now(), 'updated_at', now()))).*
  from _l2d_neufs n
  join public.question_templates q on q.id = n.origine;

insert into public.question_template_points (template_id, point_id)
select x.id, x.point_id
  from _l2d_resolus_neufs x
  join public.question_templates q on q.id = x.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_ok integer; v_tags integer; v_neufs integer; v_neufs_tags integer;
begin
	select count(*) into v_presents from _l2d_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_ok from _l2d_modeles r
	  join public.question_templates q on q.id = r.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations,
	                          'shared', q.shared, 'test_specs', q.test_specs, 'options', q.options) = r.apres;
	select count(*) into v_tags from _l2d_resolus x
	  join public.question_template_points q on q.template_id = x.id and q.point_id = x.point_id;
	if v_ok <> v_presents or v_tags <> v_presents then
		raise exception 'lot incohérent : contenus %/%, tags %/%', v_ok, v_presents, v_tags, v_presents;
	end if;
	select count(*) into v_neufs from _l2d_neufs n
	  join public.question_templates q on q.id = n.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs, 'options', q.options) = n.contenu;
	select count(*) into v_neufs_tags from _l2d_resolus_neufs x
	  join public.question_template_points q on q.template_id = x.id and q.point_id = x.point_id;
	if v_neufs <> case when v_presents = 0 then 0 else 3 end or v_neufs_tags <> v_neufs then
		raise exception 'modèles neufs incohérents : contenus %, tags %', v_neufs, v_neufs_tags;
	end if;
end $check$;

drop table pg_temp._l2d_resolus;
drop table pg_temp._l2d_resolus_neufs;
drop table pg_temp._l2d_neufs;
drop table pg_temp._l2d_modeles;
