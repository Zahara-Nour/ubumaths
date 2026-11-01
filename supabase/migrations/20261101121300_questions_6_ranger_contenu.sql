-- ============================================================================
-- Chantier « questions-6 » : 06 et 07 du lot 4 passent en ```ranger, aucun neuf ni tag posé
-- ============================================================================
--   - 83c835bb (Ranger des fractions) : trois cases → étiquettes à ranger (```ranger) ; la
--     variable de mélange `p` disparaît (le bloc mélange lui-même) ; specs en positions.
--   - c360d588 (Ranger des nombres mixtes) : idem.
-- Ni tag, ni nœud, ni niveau, ni statut, ni titre ne changent ici.
-- ============================================================================
-- Décision de David le 2026-10-31 (journal docs/wip/questions-6-progress.md § 15, point 5). Fichier
-- GÉNÉRÉ par docs/wip/questions-6/lot-contenu-6-ranger.py — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (2 modèles). Elle est prouvée
-- par tests/integration/questions-6-ranger-contenu.test.ts, qui fabrique des copies des
-- identifiants de la prod (contenu, nœud, niveaux et tags) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit avoir EXACTEMENT le contenu relevé en prod le 2026-11-01, être au
-- nœud, aux niveaux et au statut relevés, et porter exactement son tag relevé (6-134, 6-204).
--
-- Données d'élèves : non touchées (seuls l'énoncé, la forme de la réponse et les specs changent).
--
-- Accès : personne ne gagne d'accès (aucune règle ne change). Effet visible : les élèves de 6e
-- rangent des étiquettes au lieu de recopier trois fractions dans trois cases.
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
-- 	perform 1 from public.question_templates where id in ('83c835bb-5534-4b1a-afc2-2d3430622f9e', 'c360d588-3e4f-4ea5-8d27-1f671fe47bcd') for update;
-- 	select count(*) into v_intacts from public.question_templates q join (values
-- 		('83c835bb-5534-4b1a-afc2-2d3430622f9e'::uuid, 'a8867274632e0bfa2c5733a7ba0c5c52'),
-- 		('c360d588-3e4f-4ea5-8d27-1f671fe47bcd'::uuid, '1758ed867a088658440a21da1b264b32')
-- 	) as r(id, h) on r.id = q.id
-- 	 where md5(jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs)::text) = r.h;
-- 	if v_intacts <> 2 then
-- 		raise exception 'rollback : % modèle(s) sur 2 portent encore le contenu de la migration', v_intacts;
-- 	end if;
-- end $retour$;
-- update public.question_templates q
--    set title = r.c->>'title', description = r.c->>'description', variations = r.c->'variations',
--        shared = nullif(r.c->'shared', 'null'::jsonb), test_specs = nullif(r.c->'test_specs', 'null'::jsonb)
--   from (values
--   ('83c835bb-5534-4b1a-afc2-2d3430622f9e'::uuid, $q6rg${"title":"Ranger des fractions","description":"Ranger trois fractions dans l'ordre croissant : même dénominateur, dénominateurs multiples (1/2 ; 5/8 ; 3/4), autour de 1 (99/100 ; 1 ; 7/6)","variations":[{"blanks":[{"expectedAnswer":"\\frac{{{x}}}{{{b}}}"},{"expectedAnswer":"\\frac{{{y}}}{{{b}}}"},{"expectedAnswer":"\\frac{{{z}}}{{{b}}}"}],"statement":"Range ces nombres dans l'ordre croissant.\n\n$${{if:p==0|\\frac{{{x}}}{{{b}}} \\quad ; \\quad \\frac{{{y}}}{{{b}}} \\quad ; \\quad \\frac{{{z}}}{{{b}}}|{{if:p==1|\\frac{{{x}}}{{{b}}} \\quad ; \\quad \\frac{{{z}}}{{{b}}} \\quad ; \\quad \\frac{{{y}}}{{{b}}}|{{if:p==2|\\frac{{{y}}}{{{b}}} \\quad ; \\quad \\frac{{{x}}}{{{b}}} \\quad ; \\quad \\frac{{{z}}}{{{b}}}|{{if:p==3|\\frac{{{y}}}{{{b}}} \\quad ; \\quad \\frac{{{z}}}{{{b}}} \\quad ; \\quad \\frac{{{x}}}{{{b}}}|{{if:p==4|\\frac{{{z}}}{{{b}}} \\quad ; \\quad \\frac{{{x}}}{{{b}}} \\quad ; \\quad \\frac{{{y}}}{{{b}}}|\\frac{{{z}}}{{{b}}} \\quad ; \\quad \\frac{{{y}}}{{{b}}} \\quad ; \\quad \\frac{{{x}}}{{{b}}}}}}}}}}}}}$$\n\n$$? < ? < ?$$","variables":[{"name":"p","expression":"1..5"},{"name":"b","expression":"3..12"},{"name":"x","expression":"1..9"},{"name":"y","expression":"{{eval:x+1}}..{{eval:x+5}}"},{"name":"z","expression":"{{eval:y+1}}..{{eval:y+5}}"}],"conditions":["mod(x,b)!=0","mod(y,b)!=0","mod(z,b)!=0"],"correction":{"steps":["**Même dénominateur.** Toutes les parts ont la même taille, $\\frac{1}{{{b}}}$ : on range les numérateurs, ${{x}} < {{y}} < {{z}}$.","$$\\textcolor{{{color:primary.0}}}{\\frac{{{x}}}{{{b}}} < \\frac{{{y}}}{{{b}}} < \\frac{{{z}}}{{{b}}}}$$"]}},{"blanks":[{"expectedAnswer":"\\frac{{{eval:(x)/gcd(x,D)}}}{{{eval:(D)/gcd(x,D)}}}"},{"expectedAnswer":"\\frac{{{eval:(y)/gcd(y,D)}}}{{{eval:(D)/gcd(y,D)}}}"},{"expectedAnswer":"\\frac{{{eval:(z)/gcd(z,D)}}}{{{eval:(D)/gcd(z,D)}}}"}],"statement":"Range ces nombres dans l'ordre croissant.\n\n$${{if:p==0|\\frac{{{eval:(x)/gcd(x,D)}}}{{{eval:(D)/gcd(x,D)}}} \\quad ; \\quad \\frac{{{eval:(y)/gcd(y,D)}}}{{{eval:(D)/gcd(y,D)}}} \\quad ; \\quad \\frac{{{eval:(z)/gcd(z,D)}}}{{{eval:(D)/gcd(z,D)}}}|{{if:p==1|\\frac{{{eval:(x)/gcd(x,D)}}}{{{eval:(D)/gcd(x,D)}}} \\quad ; \\quad \\frac{{{eval:(z)/gcd(z,D)}}}{{{eval:(D)/gcd(z,D)}}} \\quad ; \\quad \\frac{{{eval:(y)/gcd(y,D)}}}{{{eval:(D)/gcd(y,D)}}}|{{if:p==2|\\frac{{{eval:(y)/gcd(y,D)}}}{{{eval:(D)/gcd(y,D)}}} \\quad ; \\quad \\frac{{{eval:(x)/gcd(x,D)}}}{{{eval:(D)/gcd(x,D)}}} \\quad ; \\quad \\frac{{{eval:(z)/gcd(z,D)}}}{{{eval:(D)/gcd(z,D)}}}|{{if:p==3|\\frac{{{eval:(y)/gcd(y,D)}}}{{{eval:(D)/gcd(y,D)}}} \\quad ; \\quad \\frac{{{eval:(z)/gcd(z,D)}}}{{{eval:(D)/gcd(z,D)}}} \\quad ; \\quad \\frac{{{eval:(x)/gcd(x,D)}}}{{{eval:(D)/gcd(x,D)}}}|{{if:p==4|\\frac{{{eval:(z)/gcd(z,D)}}}{{{eval:(D)/gcd(z,D)}}} \\quad ; \\quad \\frac{{{eval:(x)/gcd(x,D)}}}{{{eval:(D)/gcd(x,D)}}} \\quad ; \\quad \\frac{{{eval:(y)/gcd(y,D)}}}{{{eval:(D)/gcd(y,D)}}}|\\frac{{{eval:(z)/gcd(z,D)}}}{{{eval:(D)/gcd(z,D)}}} \\quad ; \\quad \\frac{{{eval:(y)/gcd(y,D)}}}{{{eval:(D)/gcd(y,D)}}} \\quad ; \\quad \\frac{{{eval:(x)/gcd(x,D)}}}{{{eval:(D)/gcd(x,D)}}}}}}}}}}}}}$$\n\n$$? < ? < ?$$","variables":[{"name":"p","expression":"1..5"},{"name":"D","expression":"6|8|10|12"},{"name":"x","expression":"1..{{eval:D-3}}"},{"name":"y","expression":"{{eval:x+1}}..{{eval:D-2}}"},{"name":"z","expression":"{{eval:y+1}}..{{eval:D-1}}"}],"conditions":["gcd(x,D)>1","gcd(z,D)>1","gcd(x,D)!=gcd(z,D)"],"correction":{"steps":["**Même dénominateur.** On écrit les trois fractions avec le dénominateur ${{D}}$ : $\\frac{{{eval:(x)/gcd(x,D)}}}{{{eval:(D)/gcd(x,D)}}} = \\frac{{{x}}}{{{D}}}$, {{if:gcd(y,D)>1|$\\frac{{{eval:(y)/gcd(y,D)}}}{{{eval:(D)/gcd(y,D)}}} = \\frac{{{y}}}{{{D}}}$|$\\frac{{{y}}}{{{D}}}$}}, $\\frac{{{eval:(z)/gcd(z,D)}}}{{{eval:(D)/gcd(z,D)}}} = \\frac{{{z}}}{{{D}}}$. On range les numérateurs : ${{x}} < {{y}} < {{z}}$.","$$\\textcolor{{{color:primary.0}}}{\\frac{{{eval:(x)/gcd(x,D)}}}{{{eval:(D)/gcd(x,D)}}} < \\frac{{{eval:(y)/gcd(y,D)}}}{{{eval:(D)/gcd(y,D)}}} < \\frac{{{eval:(z)/gcd(z,D)}}}{{{eval:(D)/gcd(z,D)}}}}$$"]}},{"blanks":[{"expectedAnswer":"\\frac{{{a}}}{{{b}}}"},{"expectedAnswer":"1"},{"expectedAnswer":"\\frac{{{c}}}{{{d}}}"}],"statement":"Range ces nombres dans l'ordre croissant.\n\n$${{if:p==0|\\frac{{{a}}}{{{b}}} \\quad ; \\quad 1 \\quad ; \\quad \\frac{{{c}}}{{{d}}}|{{if:p==1|\\frac{{{a}}}{{{b}}} \\quad ; \\quad \\frac{{{c}}}{{{d}}} \\quad ; \\quad 1|{{if:p==2|1 \\quad ; \\quad \\frac{{{a}}}{{{b}}} \\quad ; \\quad \\frac{{{c}}}{{{d}}}|{{if:p==3|1 \\quad ; \\quad \\frac{{{c}}}{{{d}}} \\quad ; \\quad \\frac{{{a}}}{{{b}}}|{{if:p==4|\\frac{{{c}}}{{{d}}} \\quad ; \\quad \\frac{{{a}}}{{{b}}} \\quad ; \\quad 1|\\frac{{{c}}}{{{d}}} \\quad ; \\quad 1 \\quad ; \\quad \\frac{{{a}}}{{{b}}}}}}}}}}}}}$$\n\n$$? < ? < ?$$","variables":[{"name":"p","expression":"1..5"},{"name":"b","expression":"3|4|5|6|8|10|100"},{"name":"a","expression":"{{if:b==100|90|1}}..{{eval:b-1}}"},{"name":"d","expression":"2..12"},{"name":"c","expression":"{{eval:d+1}}..{{eval:2*d-1}}"}],"conditions":["gcd(a,b)==1","gcd(c,d)==1"],"correction":{"steps":["**Comparer à 1.** $\\frac{{{a}}}{{{b}}} < 1$ car ${{a}} < {{b}}$, et $\\frac{{{c}}}{{{d}}} > 1$ car ${{c}} > {{d}}$.","$$\\textcolor{{{color:primary.0}}}{\\frac{{{a}}}{{{b}}} < 1 < \\frac{{{c}}}{{{d}}}}$$"]}}],"shared":null,"test_specs":[{"answers":["\\frac{2}{7}","\\frac{3}{7}","\\frac{6}{7}"],"expected":{"status":"correct"},"variables":{"b":"7","p":"3","x":"2","y":"3","z":"6"},"description":"2/7 < 3/7 < 6/7","variationIndex":0},{"answers":["\\frac{6}{7}","\\frac{3}{7}","\\frac{2}{7}"],"expected":{"status":"incorrect"},"variables":{"b":"7","p":"3","x":"2","y":"3","z":"6"},"description":"Erreur : ordre décroissant","variationIndex":0},{"answers":["\\frac{1}{2}","\\frac{5}{8}","\\frac{3}{4}"],"expected":{"status":"correct"},"variables":{"D":"8","p":"5","x":"4","y":"5","z":"6"},"description":"1/2 < 5/8 < 3/4","variationIndex":1},{"answers":["\\frac{1}{2}","\\frac{3}{4}","\\frac{5}{8}"],"expected":{"status":"incorrect"},"variables":{"D":"8","p":"5","x":"4","y":"5","z":"6"},"description":"Erreur : rangées par numérateurs (1/2 ; 3/4 ; 5/8)","variationIndex":1},{"answers":["\\frac{99}{100}","1","\\frac{7}{6}"],"expected":{"status":"correct"},"variables":{"a":"99","b":"100","c":"7","d":"6","p":"4"},"description":"99/100 < 1 < 7/6","variationIndex":2},{"answers":["1","\\frac{99}{100}","\\frac{7}{6}"],"expected":{"status":"incorrect"},"variables":{"a":"99","b":"100","c":"7","d":"6","p":"4"},"description":"Erreur : 1 < 99/100 < 7/6","variationIndex":2}]}$q6rg$::jsonb),
--   ('c360d588-3e4f-4ea5-8d27-1f671fe47bcd'::uuid, $q6rg${"title":"Ranger des nombres mixtes","description":"Ranger trois nombres mixtes dans l'ordre croissant : parties entières différentes, même partie entière (2 + 1/4 et 2 + 1/3), une fraction parmi eux (9/4)","variations":[{"blanks":[{"expectedAnswer":"{{q}} + \\frac{{{x}}}{{{y}}}"},{"expectedAnswer":"{{eval:q+1}} + \\frac{{{u}}}{{{v}}}"},{"expectedAnswer":"{{eval:q+2}} + \\frac{{{s}}}{{{t}}}"}],"statement":"Range ces nombres dans l'ordre croissant.\n\n$${{if:p==0|{{q}} + \\frac{{{x}}}{{{y}}} \\quad ; \\quad {{eval:q+1}} + \\frac{{{u}}}{{{v}}} \\quad ; \\quad {{eval:q+2}} + \\frac{{{s}}}{{{t}}}|{{if:p==1|{{q}} + \\frac{{{x}}}{{{y}}} \\quad ; \\quad {{eval:q+2}} + \\frac{{{s}}}{{{t}}} \\quad ; \\quad {{eval:q+1}} + \\frac{{{u}}}{{{v}}}|{{if:p==2|{{eval:q+1}} + \\frac{{{u}}}{{{v}}} \\quad ; \\quad {{q}} + \\frac{{{x}}}{{{y}}} \\quad ; \\quad {{eval:q+2}} + \\frac{{{s}}}{{{t}}}|{{if:p==3|{{eval:q+1}} + \\frac{{{u}}}{{{v}}} \\quad ; \\quad {{eval:q+2}} + \\frac{{{s}}}{{{t}}} \\quad ; \\quad {{q}} + \\frac{{{x}}}{{{y}}}|{{if:p==4|{{eval:q+2}} + \\frac{{{s}}}{{{t}}} \\quad ; \\quad {{q}} + \\frac{{{x}}}{{{y}}} \\quad ; \\quad {{eval:q+1}} + \\frac{{{u}}}{{{v}}}|{{eval:q+2}} + \\frac{{{s}}}{{{t}}} \\quad ; \\quad {{eval:q+1}} + \\frac{{{u}}}{{{v}}} \\quad ; \\quad {{q}} + \\frac{{{x}}}{{{y}}}}}}}}}}}}}$$\n\n$$? < ? < ?$$","variables":[{"name":"p","expression":"1..5"},{"name":"q","expression":"1..5"},{"name":"y","expression":"2..9"},{"name":"x","expression":"1..{{eval:y-1}}"},{"name":"v","expression":"2..9"},{"name":"u","expression":"1..{{eval:v-1}}"},{"name":"t","expression":"2..9"},{"name":"s","expression":"1..{{eval:t-1}}"}],"conditions":["gcd(x,y)==1","gcd(u,v)==1","gcd(s,t)==1"],"correction":{"steps":["**Nombres mixtes.** Chaque fraction est plus petite que $1$ : on range d'abord les parties entières, ${{q}} < {{eval:q+1}} < {{eval:q+2}}$.","$$\\textcolor{{{color:primary.0}}}{{{q}} + \\frac{{{x}}}{{{y}}} < {{eval:q+1}} + \\frac{{{u}}}{{{v}}} < {{eval:q+2}} + \\frac{{{s}}}{{{t}}}}$$"]}},{"blanks":[{"expectedAnswer":"{{eval:q-1}} + \\frac{{{x}}}{{{y}}}"},{"expectedAnswer":"{{q}} + \\frac{1}{{{m}}}"},{"expectedAnswer":"{{q}} + \\frac{1}{{{n}}}"}],"statement":"Range ces nombres dans l'ordre croissant.\n\n$${{if:p==0|{{eval:q-1}} + \\frac{{{x}}}{{{y}}} \\quad ; \\quad {{q}} + \\frac{1}{{{m}}} \\quad ; \\quad {{q}} + \\frac{1}{{{n}}}|{{if:p==1|{{eval:q-1}} + \\frac{{{x}}}{{{y}}} \\quad ; \\quad {{q}} + \\frac{1}{{{n}}} \\quad ; \\quad {{q}} + \\frac{1}{{{m}}}|{{if:p==2|{{q}} + \\frac{1}{{{m}}} \\quad ; \\quad {{eval:q-1}} + \\frac{{{x}}}{{{y}}} \\quad ; \\quad {{q}} + \\frac{1}{{{n}}}|{{if:p==3|{{q}} + \\frac{1}{{{m}}} \\quad ; \\quad {{q}} + \\frac{1}{{{n}}} \\quad ; \\quad {{eval:q-1}} + \\frac{{{x}}}{{{y}}}|{{if:p==4|{{q}} + \\frac{1}{{{n}}} \\quad ; \\quad {{eval:q-1}} + \\frac{{{x}}}{{{y}}} \\quad ; \\quad {{q}} + \\frac{1}{{{m}}}|{{q}} + \\frac{1}{{{n}}} \\quad ; \\quad {{q}} + \\frac{1}{{{m}}} \\quad ; \\quad {{eval:q-1}} + \\frac{{{x}}}{{{y}}}}}}}}}}}}}$$\n\n$$? < ? < ?$$","variables":[{"name":"p","expression":"1..5"},{"name":"q","expression":"2..5"},{"name":"y","expression":"2..9"},{"name":"x","expression":"1..{{eval:y-1}}"},{"name":"m","expression":"3..9"},{"name":"n","expression":"2..{{eval:m-1}}"}],"conditions":["gcd(x,y)==1"],"correction":{"steps":["**Nombres mixtes.** On range d'abord les parties entières : ${{eval:q-1}} < {{q}}$.","Même partie entière ${{q}}$ : on compare les fractions. $\\frac{1}{{{m}}} < \\frac{1}{{{n}}}$ : partager en ${{m}}$ donne des parts plus petites qu'en ${{n}}$.","$$\\textcolor{{{color:primary.0}}}{{{eval:q-1}} + \\frac{{{x}}}{{{y}}} < {{q}} + \\frac{1}{{{m}}} < {{q}} + \\frac{1}{{{n}}}}$$"]}},{"blanks":[{"expectedAnswer":"{{eval:q-1}} + \\frac{{{x}}}{{{y}}}"},{"expectedAnswer":"\\frac{{{eval:q*b+1}}}{{{b}}}"},{"expectedAnswer":"{{q}} + \\frac{1}{{{v}}}"}],"statement":"Range ces nombres dans l'ordre croissant.\n\n$${{if:p==0|{{eval:q-1}} + \\frac{{{x}}}{{{y}}} \\quad ; \\quad \\frac{{{eval:q*b+1}}}{{{b}}} \\quad ; \\quad {{q}} + \\frac{1}{{{v}}}|{{if:p==1|{{eval:q-1}} + \\frac{{{x}}}{{{y}}} \\quad ; \\quad {{q}} + \\frac{1}{{{v}}} \\quad ; \\quad \\frac{{{eval:q*b+1}}}{{{b}}}|{{if:p==2|\\frac{{{eval:q*b+1}}}{{{b}}} \\quad ; \\quad {{eval:q-1}} + \\frac{{{x}}}{{{y}}} \\quad ; \\quad {{q}} + \\frac{1}{{{v}}}|{{if:p==3|\\frac{{{eval:q*b+1}}}{{{b}}} \\quad ; \\quad {{q}} + \\frac{1}{{{v}}} \\quad ; \\quad {{eval:q-1}} + \\frac{{{x}}}{{{y}}}|{{if:p==4|{{q}} + \\frac{1}{{{v}}} \\quad ; \\quad {{eval:q-1}} + \\frac{{{x}}}{{{y}}} \\quad ; \\quad \\frac{{{eval:q*b+1}}}{{{b}}}|{{q}} + \\frac{1}{{{v}}} \\quad ; \\quad \\frac{{{eval:q*b+1}}}{{{b}}} \\quad ; \\quad {{eval:q-1}} + \\frac{{{x}}}{{{y}}}}}}}}}}}}}$$\n\n$$? < ? < ?$$","variables":[{"name":"p","expression":"1..5"},{"name":"q","expression":"2..4"},{"name":"y","expression":"2..9"},{"name":"x","expression":"1..{{eval:y-1}}"},{"name":"b","expression":"3..6"},{"name":"v","expression":"2..{{eval:b-1}}"}],"conditions":["gcd(x,y)==1"],"correction":{"steps":["**Nombre mixte.** On écrit la fraction comme un nombre mixte : $\\frac{{{eval:q*b+1}}}{{{b}}} = \\frac{{{eval:q*b}}}{{{b}}} + \\frac{1}{{{b}}} = {{q}} + \\frac{1}{{{b}}}$.","Partie entière ${{eval:q-1}}$ d'abord ; puis, avec la même partie entière ${{q}}$, $\\frac{1}{{{b}}} < \\frac{1}{{{v}}}$.","$$\\textcolor{{{color:primary.0}}}{{{eval:q-1}} + \\frac{{{x}}}{{{y}}} < \\frac{{{eval:q*b+1}}}{{{b}}} < {{q}} + \\frac{1}{{{v}}}}$$"]}}],"shared":null,"test_specs":[{"answers":["2 + \\frac{3}{5}","3 + \\frac{1}{2}","4 + \\frac{1}{4}"],"expected":{"status":"correct"},"variables":{"p":"2","q":"2","s":"1","t":"4","u":"1","v":"2","x":"3","y":"5"},"description":"2 + 3/5 < 3 + 1/2 < 4 + 1/4","variationIndex":0},{"answers":["4 + \\frac{1}{4}","3 + \\frac{1}{2}","2 + \\frac{3}{5}"],"expected":{"status":"incorrect"},"variables":{"p":"2","q":"2","s":"1","t":"4","u":"1","v":"2","x":"3","y":"5"},"description":"Erreur : rangés par fractions","variationIndex":0},{"answers":["1 + \\frac{3}{4}","2 + \\frac{1}{4}","2 + \\frac{1}{3}"],"expected":{"status":"correct"},"variables":{"m":"4","n":"3","p":"4","q":"2","x":"3","y":"4"},"description":"1 + 3/4 < 2 + 1/4 < 2 + 1/3","variationIndex":1},{"answers":["1 + \\frac{3}{4}","2 + \\frac{1}{3}","2 + \\frac{1}{4}"],"expected":{"status":"incorrect"},"variables":{"m":"4","n":"3","p":"4","q":"2","x":"3","y":"4"},"description":"Erreur : 2 + 1/3 < 2 + 1/4 (« 4 > 3 »)","variationIndex":1},{"answers":["1 + \\frac{3}{4}","\\frac{9}{4}","2 + \\frac{1}{3}"],"expected":{"status":"correct"},"variables":{"b":"4","p":"1","q":"2","v":"3","x":"3","y":"4"},"description":"1 + 3/4 < 9/4 < 2 + 1/3","variationIndex":2},{"answers":["\\frac{7}{4}","\\frac{9}{4}","2 + \\frac{1}{3}"],"expected":{"status":"bad_form","constraintViolations":["form"]},"variables":{"b":"4","p":"1","q":"2","v":"3","x":"3","y":"4"},"description":"7/4 au lieu de 1 + 3/4 : les nombres donnés sont à recopier","variationIndex":2},{"answers":["1 + \\frac{3}{4}","2 + \\frac{1}{3}","\\frac{9}{4}"],"expected":{"status":"incorrect"},"variables":{"b":"4","p":"1","q":"2","v":"3","x":"3","y":"4"},"description":"Erreur : 9/4 le plus grand","variationIndex":2}]}$q6rg$::jsonb)
--   ) as r(id, c)
--  where q.id = r.id;
-- ROLLBACK:END
-- ============================================================================

set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires -----------------------------------------------------
drop table if exists pg_temp._q6rg_modeles;
create temporary table _q6rg_modeles (
	id uuid primary key,
	branche text not null, notion text not null, sous_notion text,
	grades text[] not null,
	-- Statut relevé : les neufs en héritent (un brouillon publié depuis publierait ses neufs).
	statut text not null,
	avant jsonb not null, apres jsonb not null,
	-- Nœud d'arrivée (R2 : les points du modèle vivent ailleurs) ; null : il ne bouge pas.
	branche_apres text, notion_apres text, sous_notion_apres text
);
insert into _q6rg_modeles values ('83c835bb-5534-4b1a-afc2-2d3430622f9e', $q6rg$Nombres et calculs$q6rg$, $q6rg$Fractions : sens et écritures$q6rg$, $q6rg$ordre$q6rg$, array['6'], 'published',
  $q6rg${"title":"Ranger des fractions","description":"Ranger trois fractions dans l'ordre croissant : même dénominateur, dénominateurs multiples (1/2 ; 5/8 ; 3/4), autour de 1 (99/100 ; 1 ; 7/6)","variations":[{"blanks":[{"expectedAnswer":"\\frac{{{x}}}{{{b}}}"},{"expectedAnswer":"\\frac{{{y}}}{{{b}}}"},{"expectedAnswer":"\\frac{{{z}}}{{{b}}}"}],"statement":"Range ces nombres dans l'ordre croissant.\n\n$${{if:p==0|\\frac{{{x}}}{{{b}}} \\quad ; \\quad \\frac{{{y}}}{{{b}}} \\quad ; \\quad \\frac{{{z}}}{{{b}}}|{{if:p==1|\\frac{{{x}}}{{{b}}} \\quad ; \\quad \\frac{{{z}}}{{{b}}} \\quad ; \\quad \\frac{{{y}}}{{{b}}}|{{if:p==2|\\frac{{{y}}}{{{b}}} \\quad ; \\quad \\frac{{{x}}}{{{b}}} \\quad ; \\quad \\frac{{{z}}}{{{b}}}|{{if:p==3|\\frac{{{y}}}{{{b}}} \\quad ; \\quad \\frac{{{z}}}{{{b}}} \\quad ; \\quad \\frac{{{x}}}{{{b}}}|{{if:p==4|\\frac{{{z}}}{{{b}}} \\quad ; \\quad \\frac{{{x}}}{{{b}}} \\quad ; \\quad \\frac{{{y}}}{{{b}}}|\\frac{{{z}}}{{{b}}} \\quad ; \\quad \\frac{{{y}}}{{{b}}} \\quad ; \\quad \\frac{{{x}}}{{{b}}}}}}}}}}}}}$$\n\n$$? < ? < ?$$","variables":[{"name":"p","expression":"1..5"},{"name":"b","expression":"3..12"},{"name":"x","expression":"1..9"},{"name":"y","expression":"{{eval:x+1}}..{{eval:x+5}}"},{"name":"z","expression":"{{eval:y+1}}..{{eval:y+5}}"}],"conditions":["mod(x,b)!=0","mod(y,b)!=0","mod(z,b)!=0"],"correction":{"steps":["**Même dénominateur.** Toutes les parts ont la même taille, $\\frac{1}{{{b}}}$ : on range les numérateurs, ${{x}} < {{y}} < {{z}}$.","$$\\textcolor{{{color:primary.0}}}{\\frac{{{x}}}{{{b}}} < \\frac{{{y}}}{{{b}}} < \\frac{{{z}}}{{{b}}}}$$"]}},{"blanks":[{"expectedAnswer":"\\frac{{{eval:(x)/gcd(x,D)}}}{{{eval:(D)/gcd(x,D)}}}"},{"expectedAnswer":"\\frac{{{eval:(y)/gcd(y,D)}}}{{{eval:(D)/gcd(y,D)}}}"},{"expectedAnswer":"\\frac{{{eval:(z)/gcd(z,D)}}}{{{eval:(D)/gcd(z,D)}}}"}],"statement":"Range ces nombres dans l'ordre croissant.\n\n$${{if:p==0|\\frac{{{eval:(x)/gcd(x,D)}}}{{{eval:(D)/gcd(x,D)}}} \\quad ; \\quad \\frac{{{eval:(y)/gcd(y,D)}}}{{{eval:(D)/gcd(y,D)}}} \\quad ; \\quad \\frac{{{eval:(z)/gcd(z,D)}}}{{{eval:(D)/gcd(z,D)}}}|{{if:p==1|\\frac{{{eval:(x)/gcd(x,D)}}}{{{eval:(D)/gcd(x,D)}}} \\quad ; \\quad \\frac{{{eval:(z)/gcd(z,D)}}}{{{eval:(D)/gcd(z,D)}}} \\quad ; \\quad \\frac{{{eval:(y)/gcd(y,D)}}}{{{eval:(D)/gcd(y,D)}}}|{{if:p==2|\\frac{{{eval:(y)/gcd(y,D)}}}{{{eval:(D)/gcd(y,D)}}} \\quad ; \\quad \\frac{{{eval:(x)/gcd(x,D)}}}{{{eval:(D)/gcd(x,D)}}} \\quad ; \\quad \\frac{{{eval:(z)/gcd(z,D)}}}{{{eval:(D)/gcd(z,D)}}}|{{if:p==3|\\frac{{{eval:(y)/gcd(y,D)}}}{{{eval:(D)/gcd(y,D)}}} \\quad ; \\quad \\frac{{{eval:(z)/gcd(z,D)}}}{{{eval:(D)/gcd(z,D)}}} \\quad ; \\quad \\frac{{{eval:(x)/gcd(x,D)}}}{{{eval:(D)/gcd(x,D)}}}|{{if:p==4|\\frac{{{eval:(z)/gcd(z,D)}}}{{{eval:(D)/gcd(z,D)}}} \\quad ; \\quad \\frac{{{eval:(x)/gcd(x,D)}}}{{{eval:(D)/gcd(x,D)}}} \\quad ; \\quad \\frac{{{eval:(y)/gcd(y,D)}}}{{{eval:(D)/gcd(y,D)}}}|\\frac{{{eval:(z)/gcd(z,D)}}}{{{eval:(D)/gcd(z,D)}}} \\quad ; \\quad \\frac{{{eval:(y)/gcd(y,D)}}}{{{eval:(D)/gcd(y,D)}}} \\quad ; \\quad \\frac{{{eval:(x)/gcd(x,D)}}}{{{eval:(D)/gcd(x,D)}}}}}}}}}}}}}$$\n\n$$? < ? < ?$$","variables":[{"name":"p","expression":"1..5"},{"name":"D","expression":"6|8|10|12"},{"name":"x","expression":"1..{{eval:D-3}}"},{"name":"y","expression":"{{eval:x+1}}..{{eval:D-2}}"},{"name":"z","expression":"{{eval:y+1}}..{{eval:D-1}}"}],"conditions":["gcd(x,D)>1","gcd(z,D)>1","gcd(x,D)!=gcd(z,D)"],"correction":{"steps":["**Même dénominateur.** On écrit les trois fractions avec le dénominateur ${{D}}$ : $\\frac{{{eval:(x)/gcd(x,D)}}}{{{eval:(D)/gcd(x,D)}}} = \\frac{{{x}}}{{{D}}}$, {{if:gcd(y,D)>1|$\\frac{{{eval:(y)/gcd(y,D)}}}{{{eval:(D)/gcd(y,D)}}} = \\frac{{{y}}}{{{D}}}$|$\\frac{{{y}}}{{{D}}}$}}, $\\frac{{{eval:(z)/gcd(z,D)}}}{{{eval:(D)/gcd(z,D)}}} = \\frac{{{z}}}{{{D}}}$. On range les numérateurs : ${{x}} < {{y}} < {{z}}$.","$$\\textcolor{{{color:primary.0}}}{\\frac{{{eval:(x)/gcd(x,D)}}}{{{eval:(D)/gcd(x,D)}}} < \\frac{{{eval:(y)/gcd(y,D)}}}{{{eval:(D)/gcd(y,D)}}} < \\frac{{{eval:(z)/gcd(z,D)}}}{{{eval:(D)/gcd(z,D)}}}}$$"]}},{"blanks":[{"expectedAnswer":"\\frac{{{a}}}{{{b}}}"},{"expectedAnswer":"1"},{"expectedAnswer":"\\frac{{{c}}}{{{d}}}"}],"statement":"Range ces nombres dans l'ordre croissant.\n\n$${{if:p==0|\\frac{{{a}}}{{{b}}} \\quad ; \\quad 1 \\quad ; \\quad \\frac{{{c}}}{{{d}}}|{{if:p==1|\\frac{{{a}}}{{{b}}} \\quad ; \\quad \\frac{{{c}}}{{{d}}} \\quad ; \\quad 1|{{if:p==2|1 \\quad ; \\quad \\frac{{{a}}}{{{b}}} \\quad ; \\quad \\frac{{{c}}}{{{d}}}|{{if:p==3|1 \\quad ; \\quad \\frac{{{c}}}{{{d}}} \\quad ; \\quad \\frac{{{a}}}{{{b}}}|{{if:p==4|\\frac{{{c}}}{{{d}}} \\quad ; \\quad \\frac{{{a}}}{{{b}}} \\quad ; \\quad 1|\\frac{{{c}}}{{{d}}} \\quad ; \\quad 1 \\quad ; \\quad \\frac{{{a}}}{{{b}}}}}}}}}}}}}$$\n\n$$? < ? < ?$$","variables":[{"name":"p","expression":"1..5"},{"name":"b","expression":"3|4|5|6|8|10|100"},{"name":"a","expression":"{{if:b==100|90|1}}..{{eval:b-1}}"},{"name":"d","expression":"2..12"},{"name":"c","expression":"{{eval:d+1}}..{{eval:2*d-1}}"}],"conditions":["gcd(a,b)==1","gcd(c,d)==1"],"correction":{"steps":["**Comparer à 1.** $\\frac{{{a}}}{{{b}}} < 1$ car ${{a}} < {{b}}$, et $\\frac{{{c}}}{{{d}}} > 1$ car ${{c}} > {{d}}$.","$$\\textcolor{{{color:primary.0}}}{\\frac{{{a}}}{{{b}}} < 1 < \\frac{{{c}}}{{{d}}}}$$"]}}],"shared":null,"test_specs":[{"answers":["\\frac{2}{7}","\\frac{3}{7}","\\frac{6}{7}"],"expected":{"status":"correct"},"variables":{"b":"7","p":"3","x":"2","y":"3","z":"6"},"description":"2/7 < 3/7 < 6/7","variationIndex":0},{"answers":["\\frac{6}{7}","\\frac{3}{7}","\\frac{2}{7}"],"expected":{"status":"incorrect"},"variables":{"b":"7","p":"3","x":"2","y":"3","z":"6"},"description":"Erreur : ordre décroissant","variationIndex":0},{"answers":["\\frac{1}{2}","\\frac{5}{8}","\\frac{3}{4}"],"expected":{"status":"correct"},"variables":{"D":"8","p":"5","x":"4","y":"5","z":"6"},"description":"1/2 < 5/8 < 3/4","variationIndex":1},{"answers":["\\frac{1}{2}","\\frac{3}{4}","\\frac{5}{8}"],"expected":{"status":"incorrect"},"variables":{"D":"8","p":"5","x":"4","y":"5","z":"6"},"description":"Erreur : rangées par numérateurs (1/2 ; 3/4 ; 5/8)","variationIndex":1},{"answers":["\\frac{99}{100}","1","\\frac{7}{6}"],"expected":{"status":"correct"},"variables":{"a":"99","b":"100","c":"7","d":"6","p":"4"},"description":"99/100 < 1 < 7/6","variationIndex":2},{"answers":["1","\\frac{99}{100}","\\frac{7}{6}"],"expected":{"status":"incorrect"},"variables":{"a":"99","b":"100","c":"7","d":"6","p":"4"},"description":"Erreur : 1 < 99/100 < 7/6","variationIndex":2}]}$q6rg$::jsonb,
  $q6rg${"title":"Ranger des fractions","description":"Ranger trois fractions dans l'ordre croissant : même dénominateur, dénominateurs multiples (1/2 ; 5/8 ; 3/4), autour de 1 (99/100 ; 1 ; 7/6)","variations":[{"statement":"Range ces nombres dans l'ordre croissant.\n\n```ranger\nsigne: <\n- $\\frac{{{x}}}{{{b}}}$\n- $\\frac{{{y}}}{{{b}}}$\n- $\\frac{{{z}}}{{{b}}}$\n```","variables":[{"name":"b","expression":"3..12"},{"name":"x","expression":"1..9"},{"name":"y","expression":"{{eval:x+1}}..{{eval:x+5}}"},{"name":"z","expression":"{{eval:y+1}}..{{eval:y+5}}"}],"conditions":["mod(x,b)!=0","mod(y,b)!=0","mod(z,b)!=0"],"correction":{"steps":["**Même dénominateur.** Toutes les parts ont la même taille, $\\frac{1}{{{b}}}$ : on range les numérateurs, ${{x}} < {{y}} < {{z}}$.","$$\\textcolor{{{color:primary.0}}}{\\frac{{{x}}}{{{b}}} < \\frac{{{y}}}{{{b}}} < \\frac{{{z}}}{{{b}}}}$$"]}},{"statement":"Range ces nombres dans l'ordre croissant.\n\n```ranger\nsigne: <\n- $\\frac{{{eval:(x)/gcd(x,D)}}}{{{eval:(D)/gcd(x,D)}}}$\n- $\\frac{{{eval:(y)/gcd(y,D)}}}{{{eval:(D)/gcd(y,D)}}}$\n- $\\frac{{{eval:(z)/gcd(z,D)}}}{{{eval:(D)/gcd(z,D)}}}$\n```","variables":[{"name":"D","expression":"6|8|10|12"},{"name":"x","expression":"1..{{eval:D-3}}"},{"name":"y","expression":"{{eval:x+1}}..{{eval:D-2}}"},{"name":"z","expression":"{{eval:y+1}}..{{eval:D-1}}"}],"conditions":["gcd(x,D)>1","gcd(z,D)>1","gcd(x,D)!=gcd(z,D)"],"correction":{"steps":["**Même dénominateur.** On écrit les trois fractions avec le dénominateur ${{D}}$ : $\\frac{{{eval:(x)/gcd(x,D)}}}{{{eval:(D)/gcd(x,D)}}} = \\frac{{{x}}}{{{D}}}$, {{if:gcd(y,D)>1|$\\frac{{{eval:(y)/gcd(y,D)}}}{{{eval:(D)/gcd(y,D)}}} = \\frac{{{y}}}{{{D}}}$|$\\frac{{{y}}}{{{D}}}$}}, $\\frac{{{eval:(z)/gcd(z,D)}}}{{{eval:(D)/gcd(z,D)}}} = \\frac{{{z}}}{{{D}}}$. On range les numérateurs : ${{x}} < {{y}} < {{z}}$.","$$\\textcolor{{{color:primary.0}}}{\\frac{{{eval:(x)/gcd(x,D)}}}{{{eval:(D)/gcd(x,D)}}} < \\frac{{{eval:(y)/gcd(y,D)}}}{{{eval:(D)/gcd(y,D)}}} < \\frac{{{eval:(z)/gcd(z,D)}}}{{{eval:(D)/gcd(z,D)}}}}$$"]}},{"statement":"Range ces nombres dans l'ordre croissant.\n\n```ranger\nsigne: <\n- $\\frac{{{a}}}{{{b}}}$\n- $1$\n- $\\frac{{{c}}}{{{d}}}$\n```","variables":[{"name":"b","expression":"3|4|5|6|8|10|100"},{"name":"a","expression":"{{if:b==100|90|1}}..{{eval:b-1}}"},{"name":"d","expression":"2..12"},{"name":"c","expression":"{{eval:d+1}}..{{eval:2*d-1}}"}],"conditions":["gcd(a,b)==1","gcd(c,d)==1"],"correction":{"steps":["**Comparer à 1.** $\\frac{{{a}}}{{{b}}} < 1$ car ${{a}} < {{b}}$, et $\\frac{{{c}}}{{{d}}} > 1$ car ${{c}} > {{d}}$.","$$\\textcolor{{{color:primary.0}}}{\\frac{{{a}}}{{{b}}} < 1 < \\frac{{{c}}}{{{d}}}}$$"]}}],"shared":null,"test_specs":[{"description":"2/7 < 3/7 < 6/7","variationIndex":0,"variables":{"b":"7","x":"2","y":"3","z":"6"},"answers":["2","0","1"],"expected":{"status":"correct"}},{"description":"Erreur : ordre décroissant","variationIndex":0,"variables":{"b":"7","x":"2","y":"3","z":"6"},"answers":["1","0","2"],"expected":{"status":"incorrect"}},{"description":"1/2 < 5/8 < 3/4","variationIndex":1,"variables":{"D":"8","x":"4","y":"5","z":"6"},"answers":["2","0","1"],"expected":{"status":"correct"}},{"description":"Erreur : rangées par numérateurs (1/2 ; 3/4 ; 5/8)","variationIndex":1,"variables":{"D":"8","x":"4","y":"5","z":"6"},"answers":["2","1","0"],"expected":{"status":"incorrect"}},{"description":"99/100 < 1 < 7/6","variationIndex":2,"variables":{"b":"100","a":"99","d":"6","c":"7"},"answers":["2","0","1"],"expected":{"status":"correct"}},{"description":"Erreur : 1 < 99/100 < 7/6","variationIndex":2,"variables":{"b":"100","a":"99","d":"6","c":"7"},"answers":["0","2","1"],"expected":{"status":"incorrect"}}]}$q6rg$::jsonb,
  null, null, null);
insert into _q6rg_modeles values ('c360d588-3e4f-4ea5-8d27-1f671fe47bcd', $q6rg$Nombres et calculs$q6rg$, $q6rg$Fractions : sens et écritures$q6rg$, $q6rg$ordre$q6rg$, array['6'], 'published',
  $q6rg${"title":"Ranger des nombres mixtes","description":"Ranger trois nombres mixtes dans l'ordre croissant : parties entières différentes, même partie entière (2 + 1/4 et 2 + 1/3), une fraction parmi eux (9/4)","variations":[{"blanks":[{"expectedAnswer":"{{q}} + \\frac{{{x}}}{{{y}}}"},{"expectedAnswer":"{{eval:q+1}} + \\frac{{{u}}}{{{v}}}"},{"expectedAnswer":"{{eval:q+2}} + \\frac{{{s}}}{{{t}}}"}],"statement":"Range ces nombres dans l'ordre croissant.\n\n$${{if:p==0|{{q}} + \\frac{{{x}}}{{{y}}} \\quad ; \\quad {{eval:q+1}} + \\frac{{{u}}}{{{v}}} \\quad ; \\quad {{eval:q+2}} + \\frac{{{s}}}{{{t}}}|{{if:p==1|{{q}} + \\frac{{{x}}}{{{y}}} \\quad ; \\quad {{eval:q+2}} + \\frac{{{s}}}{{{t}}} \\quad ; \\quad {{eval:q+1}} + \\frac{{{u}}}{{{v}}}|{{if:p==2|{{eval:q+1}} + \\frac{{{u}}}{{{v}}} \\quad ; \\quad {{q}} + \\frac{{{x}}}{{{y}}} \\quad ; \\quad {{eval:q+2}} + \\frac{{{s}}}{{{t}}}|{{if:p==3|{{eval:q+1}} + \\frac{{{u}}}{{{v}}} \\quad ; \\quad {{eval:q+2}} + \\frac{{{s}}}{{{t}}} \\quad ; \\quad {{q}} + \\frac{{{x}}}{{{y}}}|{{if:p==4|{{eval:q+2}} + \\frac{{{s}}}{{{t}}} \\quad ; \\quad {{q}} + \\frac{{{x}}}{{{y}}} \\quad ; \\quad {{eval:q+1}} + \\frac{{{u}}}{{{v}}}|{{eval:q+2}} + \\frac{{{s}}}{{{t}}} \\quad ; \\quad {{eval:q+1}} + \\frac{{{u}}}{{{v}}} \\quad ; \\quad {{q}} + \\frac{{{x}}}{{{y}}}}}}}}}}}}}$$\n\n$$? < ? < ?$$","variables":[{"name":"p","expression":"1..5"},{"name":"q","expression":"1..5"},{"name":"y","expression":"2..9"},{"name":"x","expression":"1..{{eval:y-1}}"},{"name":"v","expression":"2..9"},{"name":"u","expression":"1..{{eval:v-1}}"},{"name":"t","expression":"2..9"},{"name":"s","expression":"1..{{eval:t-1}}"}],"conditions":["gcd(x,y)==1","gcd(u,v)==1","gcd(s,t)==1"],"correction":{"steps":["**Nombres mixtes.** Chaque fraction est plus petite que $1$ : on range d'abord les parties entières, ${{q}} < {{eval:q+1}} < {{eval:q+2}}$.","$$\\textcolor{{{color:primary.0}}}{{{q}} + \\frac{{{x}}}{{{y}}} < {{eval:q+1}} + \\frac{{{u}}}{{{v}}} < {{eval:q+2}} + \\frac{{{s}}}{{{t}}}}$$"]}},{"blanks":[{"expectedAnswer":"{{eval:q-1}} + \\frac{{{x}}}{{{y}}}"},{"expectedAnswer":"{{q}} + \\frac{1}{{{m}}}"},{"expectedAnswer":"{{q}} + \\frac{1}{{{n}}}"}],"statement":"Range ces nombres dans l'ordre croissant.\n\n$${{if:p==0|{{eval:q-1}} + \\frac{{{x}}}{{{y}}} \\quad ; \\quad {{q}} + \\frac{1}{{{m}}} \\quad ; \\quad {{q}} + \\frac{1}{{{n}}}|{{if:p==1|{{eval:q-1}} + \\frac{{{x}}}{{{y}}} \\quad ; \\quad {{q}} + \\frac{1}{{{n}}} \\quad ; \\quad {{q}} + \\frac{1}{{{m}}}|{{if:p==2|{{q}} + \\frac{1}{{{m}}} \\quad ; \\quad {{eval:q-1}} + \\frac{{{x}}}{{{y}}} \\quad ; \\quad {{q}} + \\frac{1}{{{n}}}|{{if:p==3|{{q}} + \\frac{1}{{{m}}} \\quad ; \\quad {{q}} + \\frac{1}{{{n}}} \\quad ; \\quad {{eval:q-1}} + \\frac{{{x}}}{{{y}}}|{{if:p==4|{{q}} + \\frac{1}{{{n}}} \\quad ; \\quad {{eval:q-1}} + \\frac{{{x}}}{{{y}}} \\quad ; \\quad {{q}} + \\frac{1}{{{m}}}|{{q}} + \\frac{1}{{{n}}} \\quad ; \\quad {{q}} + \\frac{1}{{{m}}} \\quad ; \\quad {{eval:q-1}} + \\frac{{{x}}}{{{y}}}}}}}}}}}}}$$\n\n$$? < ? < ?$$","variables":[{"name":"p","expression":"1..5"},{"name":"q","expression":"2..5"},{"name":"y","expression":"2..9"},{"name":"x","expression":"1..{{eval:y-1}}"},{"name":"m","expression":"3..9"},{"name":"n","expression":"2..{{eval:m-1}}"}],"conditions":["gcd(x,y)==1"],"correction":{"steps":["**Nombres mixtes.** On range d'abord les parties entières : ${{eval:q-1}} < {{q}}$.","Même partie entière ${{q}}$ : on compare les fractions. $\\frac{1}{{{m}}} < \\frac{1}{{{n}}}$ : partager en ${{m}}$ donne des parts plus petites qu'en ${{n}}$.","$$\\textcolor{{{color:primary.0}}}{{{eval:q-1}} + \\frac{{{x}}}{{{y}}} < {{q}} + \\frac{1}{{{m}}} < {{q}} + \\frac{1}{{{n}}}}$$"]}},{"blanks":[{"expectedAnswer":"{{eval:q-1}} + \\frac{{{x}}}{{{y}}}"},{"expectedAnswer":"\\frac{{{eval:q*b+1}}}{{{b}}}"},{"expectedAnswer":"{{q}} + \\frac{1}{{{v}}}"}],"statement":"Range ces nombres dans l'ordre croissant.\n\n$${{if:p==0|{{eval:q-1}} + \\frac{{{x}}}{{{y}}} \\quad ; \\quad \\frac{{{eval:q*b+1}}}{{{b}}} \\quad ; \\quad {{q}} + \\frac{1}{{{v}}}|{{if:p==1|{{eval:q-1}} + \\frac{{{x}}}{{{y}}} \\quad ; \\quad {{q}} + \\frac{1}{{{v}}} \\quad ; \\quad \\frac{{{eval:q*b+1}}}{{{b}}}|{{if:p==2|\\frac{{{eval:q*b+1}}}{{{b}}} \\quad ; \\quad {{eval:q-1}} + \\frac{{{x}}}{{{y}}} \\quad ; \\quad {{q}} + \\frac{1}{{{v}}}|{{if:p==3|\\frac{{{eval:q*b+1}}}{{{b}}} \\quad ; \\quad {{q}} + \\frac{1}{{{v}}} \\quad ; \\quad {{eval:q-1}} + \\frac{{{x}}}{{{y}}}|{{if:p==4|{{q}} + \\frac{1}{{{v}}} \\quad ; \\quad {{eval:q-1}} + \\frac{{{x}}}{{{y}}} \\quad ; \\quad \\frac{{{eval:q*b+1}}}{{{b}}}|{{q}} + \\frac{1}{{{v}}} \\quad ; \\quad \\frac{{{eval:q*b+1}}}{{{b}}} \\quad ; \\quad {{eval:q-1}} + \\frac{{{x}}}{{{y}}}}}}}}}}}}}$$\n\n$$? < ? < ?$$","variables":[{"name":"p","expression":"1..5"},{"name":"q","expression":"2..4"},{"name":"y","expression":"2..9"},{"name":"x","expression":"1..{{eval:y-1}}"},{"name":"b","expression":"3..6"},{"name":"v","expression":"2..{{eval:b-1}}"}],"conditions":["gcd(x,y)==1"],"correction":{"steps":["**Nombre mixte.** On écrit la fraction comme un nombre mixte : $\\frac{{{eval:q*b+1}}}{{{b}}} = \\frac{{{eval:q*b}}}{{{b}}} + \\frac{1}{{{b}}} = {{q}} + \\frac{1}{{{b}}}$.","Partie entière ${{eval:q-1}}$ d'abord ; puis, avec la même partie entière ${{q}}$, $\\frac{1}{{{b}}} < \\frac{1}{{{v}}}$.","$$\\textcolor{{{color:primary.0}}}{{{eval:q-1}} + \\frac{{{x}}}{{{y}}} < \\frac{{{eval:q*b+1}}}{{{b}}} < {{q}} + \\frac{1}{{{v}}}}$$"]}}],"shared":null,"test_specs":[{"answers":["2 + \\frac{3}{5}","3 + \\frac{1}{2}","4 + \\frac{1}{4}"],"expected":{"status":"correct"},"variables":{"p":"2","q":"2","s":"1","t":"4","u":"1","v":"2","x":"3","y":"5"},"description":"2 + 3/5 < 3 + 1/2 < 4 + 1/4","variationIndex":0},{"answers":["4 + \\frac{1}{4}","3 + \\frac{1}{2}","2 + \\frac{3}{5}"],"expected":{"status":"incorrect"},"variables":{"p":"2","q":"2","s":"1","t":"4","u":"1","v":"2","x":"3","y":"5"},"description":"Erreur : rangés par fractions","variationIndex":0},{"answers":["1 + \\frac{3}{4}","2 + \\frac{1}{4}","2 + \\frac{1}{3}"],"expected":{"status":"correct"},"variables":{"m":"4","n":"3","p":"4","q":"2","x":"3","y":"4"},"description":"1 + 3/4 < 2 + 1/4 < 2 + 1/3","variationIndex":1},{"answers":["1 + \\frac{3}{4}","2 + \\frac{1}{3}","2 + \\frac{1}{4}"],"expected":{"status":"incorrect"},"variables":{"m":"4","n":"3","p":"4","q":"2","x":"3","y":"4"},"description":"Erreur : 2 + 1/3 < 2 + 1/4 (« 4 > 3 »)","variationIndex":1},{"answers":["1 + \\frac{3}{4}","\\frac{9}{4}","2 + \\frac{1}{3}"],"expected":{"status":"correct"},"variables":{"b":"4","p":"1","q":"2","v":"3","x":"3","y":"4"},"description":"1 + 3/4 < 9/4 < 2 + 1/3","variationIndex":2},{"answers":["\\frac{7}{4}","\\frac{9}{4}","2 + \\frac{1}{3}"],"expected":{"status":"bad_form","constraintViolations":["form"]},"variables":{"b":"4","p":"1","q":"2","v":"3","x":"3","y":"4"},"description":"7/4 au lieu de 1 + 3/4 : les nombres donnés sont à recopier","variationIndex":2},{"answers":["1 + \\frac{3}{4}","2 + \\frac{1}{3}","\\frac{9}{4}"],"expected":{"status":"incorrect"},"variables":{"b":"4","p":"1","q":"2","v":"3","x":"3","y":"4"},"description":"Erreur : 9/4 le plus grand","variationIndex":2}]}$q6rg$::jsonb,
  $q6rg${"title":"Ranger des nombres mixtes","description":"Ranger trois nombres mixtes dans l'ordre croissant : parties entières différentes, même partie entière (2 + 1/4 et 2 + 1/3), une fraction parmi eux (9/4)","variations":[{"statement":"Range ces nombres dans l'ordre croissant.\n\n```ranger\nsigne: <\n- ${{q}} + \\frac{{{x}}}{{{y}}}$\n- ${{eval:q+1}} + \\frac{{{u}}}{{{v}}}$\n- ${{eval:q+2}} + \\frac{{{s}}}{{{t}}}$\n```","variables":[{"name":"q","expression":"1..5"},{"name":"y","expression":"2..9"},{"name":"x","expression":"1..{{eval:y-1}}"},{"name":"v","expression":"2..9"},{"name":"u","expression":"1..{{eval:v-1}}"},{"name":"t","expression":"2..9"},{"name":"s","expression":"1..{{eval:t-1}}"}],"conditions":["gcd(x,y)==1","gcd(u,v)==1","gcd(s,t)==1"],"correction":{"steps":["**Nombres mixtes.** Chaque fraction est plus petite que $1$ : on range d'abord les parties entières, ${{q}} < {{eval:q+1}} < {{eval:q+2}}$.","$$\\textcolor{{{color:primary.0}}}{{{q}} + \\frac{{{x}}}{{{y}}} < {{eval:q+1}} + \\frac{{{u}}}{{{v}}} < {{eval:q+2}} + \\frac{{{s}}}{{{t}}}}$$"]}},{"statement":"Range ces nombres dans l'ordre croissant.\n\n```ranger\nsigne: <\n- ${{eval:q-1}} + \\frac{{{x}}}{{{y}}}$\n- ${{q}} + \\frac{1}{{{m}}}$\n- ${{q}} + \\frac{1}{{{n}}}$\n```","variables":[{"name":"q","expression":"2..5"},{"name":"y","expression":"2..9"},{"name":"x","expression":"1..{{eval:y-1}}"},{"name":"m","expression":"3..9"},{"name":"n","expression":"2..{{eval:m-1}}"}],"conditions":["gcd(x,y)==1"],"correction":{"steps":["**Nombres mixtes.** On range d'abord les parties entières : ${{eval:q-1}} < {{q}}$.","Même partie entière ${{q}}$ : on compare les fractions. $\\frac{1}{{{m}}} < \\frac{1}{{{n}}}$ : partager en ${{m}}$ donne des parts plus petites qu'en ${{n}}$.","$$\\textcolor{{{color:primary.0}}}{{{eval:q-1}} + \\frac{{{x}}}{{{y}}} < {{q}} + \\frac{1}{{{m}}} < {{q}} + \\frac{1}{{{n}}}}$$"]}},{"statement":"Range ces nombres dans l'ordre croissant.\n\n```ranger\nsigne: <\n- ${{eval:q-1}} + \\frac{{{x}}}{{{y}}}$\n- $\\frac{{{eval:q*b+1}}}{{{b}}}$\n- ${{q}} + \\frac{1}{{{v}}}$\n```","variables":[{"name":"q","expression":"2..4"},{"name":"y","expression":"2..9"},{"name":"x","expression":"1..{{eval:y-1}}"},{"name":"b","expression":"3..6"},{"name":"v","expression":"2..{{eval:b-1}}"}],"conditions":["gcd(x,y)==1"],"correction":{"steps":["**Nombre mixte.** On écrit la fraction comme un nombre mixte : $\\frac{{{eval:q*b+1}}}{{{b}}} = \\frac{{{eval:q*b}}}{{{b}}} + \\frac{1}{{{b}}} = {{q}} + \\frac{1}{{{b}}}$.","Partie entière ${{eval:q-1}}$ d'abord ; puis, avec la même partie entière ${{q}}$, $\\frac{1}{{{b}}} < \\frac{1}{{{v}}}$.","$$\\textcolor{{{color:primary.0}}}{{{eval:q-1}} + \\frac{{{x}}}{{{y}}} < \\frac{{{eval:q*b+1}}}{{{b}}} < {{q}} + \\frac{1}{{{v}}}}$$"]}}],"shared":null,"test_specs":[{"description":"2 + 3/5 < 3 + 1/2 < 4 + 1/4","variationIndex":0,"variables":{"q":"2","y":"5","x":"3","v":"2","u":"1","t":"4","s":"1"},"answers":["2","0","1"],"expected":{"status":"correct"}},{"description":"Erreur : rangés par fractions","variationIndex":0,"variables":{"q":"2","y":"5","x":"3","v":"2","u":"1","t":"4","s":"1"},"answers":["1","0","2"],"expected":{"status":"incorrect"}},{"description":"1 + 3/4 < 2 + 1/4 < 2 + 1/3","variationIndex":1,"variables":{"q":"2","y":"4","x":"3","m":"4","n":"3"},"answers":["2","0","1"],"expected":{"status":"correct"}},{"description":"Erreur : 2 + 1/3 < 2 + 1/4 (« 4 > 3 »)","variationIndex":1,"variables":{"q":"2","y":"4","x":"3","m":"4","n":"3"},"answers":["2","1","0"],"expected":{"status":"incorrect"}},{"description":"1 + 3/4 < 9/4 < 2 + 1/3","variationIndex":2,"variables":{"q":"2","y":"4","x":"3","b":"4","v":"3"},"answers":["2","0","1"],"expected":{"status":"correct"}},{"description":"Erreur : 9/4 le plus grand","variationIndex":2,"variables":{"q":"2","y":"4","x":"3","b":"4","v":"3"},"answers":["2","1","0"],"expected":{"status":"incorrect"}}]}$q6rg$::jsonb,
  null, null, null);

-- Tags des origines : ceux qu'elles portent déjà (relevé, exigés à l'identique et laissés) et ceux
-- que la migration pose.
drop table if exists pg_temp._q6rg_tags;
create temporary table _q6rg_tags (
	id uuid not null references _q6rg_modeles (id),
	tag_grade text not null, tag_code text not null,
	avant boolean not null
);
insert into _q6rg_tags values
  ('83c835bb-5534-4b1a-afc2-2d3430622f9e', '6', '6-134', true),
  ('c360d588-3e4f-4ea5-8d27-1f671fe47bcd', '6', '6-204', true);

-- Modèles neufs : chacun copie les autres colonnes de son origine, sauf le niveau (et le nœud
-- quand l'un de ses points vit sur une sous-notion voisine).
drop table if exists pg_temp._q6rg_neufs;
create temporary table _q6rg_neufs (
	id uuid primary key,
	origine uuid not null references _q6rg_modeles (id),
	niveau integer not null,
	contenu jsonb not null,
	-- Nœud propre (celui de son premier point) ; null : celui de l'origine.
	branche text, notion text, sous_notion text
);
drop table if exists pg_temp._q6rg_tags_neufs;
create temporary table _q6rg_tags_neufs (
	id uuid not null references _q6rg_neufs (id),
	rang integer not null,
	tag_grade text not null, tag_code text not null
);


-- ---- 2. Résolution STRICTE des nœuds et des points --------------------------------------
create temporary table _q6rg_resolus as
	select r.id, case when r.sous_notion is null then nn.id else s.id end as noeud,
	       r.branche_apres is not null as deplace,
	       case when r.branche_apres is null then case when r.sous_notion is null then nn.id else s.id end
	            when r.sous_notion_apres is null then na.id else sa.id end as noeud_apres,
	       case when r.sous_notion_apres is null then na.archived_at else sa.archived_at end as noeud_apres_archive
	  from _q6rg_modeles r
	  left join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.name = r.branche
	  left join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = r.notion
	  left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = nn.id and s.name = r.sous_notion
	  left join public.classification_nodes ba on ba.kind = 'branch' and ba.parent_id is null and ba.name = r.branche_apres
	  left join public.classification_nodes na on na.kind = 'notion' and na.parent_id = ba.id and na.name = r.notion_apres
	  left join public.classification_nodes sa on sa.kind = 'subnotion' and sa.parent_id = na.id and sa.name = r.sous_notion_apres;
create temporary table _q6rg_resolus_tags as
	select t.id, t.avant, p.id as point_id
	  from _q6rg_tags t
	  left join public.curriculum_points p on p.grade = t.tag_grade and p.code = t.tag_code and p.archived_at is null;
create temporary table _q6rg_resolus_neufs as
	select n.id, n.branche is not null as noeud_propre,
	       case when n.sous_notion is null then nn.id else s.id end as noeud,
	       case when n.sous_notion is null then nn.archived_at else s.archived_at end as noeud_archive
	  from _q6rg_neufs n
	  left join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.name = n.branche
	  left join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = n.notion
	  left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = nn.id and s.name = n.sous_notion;
create temporary table _q6rg_resolus_tags_neufs as
	select t.id, t.rang, p.id as point_id, p.node_id as noeud_du_point
	  from _q6rg_tags_neufs t
	  left join public.curriculum_points p on p.grade = t.tag_grade and p.code = t.tag_code and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from _q6rg_resolus where noeud is null or noeud_apres is null or (deplace and noeud_apres_archive is not null))
	   or exists (select 1 from _q6rg_resolus_tags where point_id is null) then
		raise exception 'nœuds ou points introuvables : %',
			(select count(*) from _q6rg_resolus where noeud is null or noeud_apres is null or (deplace and noeud_apres_archive is not null))
			+ (select count(*) from _q6rg_resolus_tags where point_id is null);
	end if;
	-- Nœud propre : actif, et celui du premier point du modèle neuf (la garde des tags n'accepte que
	-- lui ou sa notion ; un point déplacé depuis le relevé fait échouer ici, pas plus loin).
	if exists (select 1 from _q6rg_resolus_tags_neufs where point_id is null)
	   or exists (select 1 from _q6rg_resolus_neufs n
	               where n.noeud_propre
	                 and (n.noeud is null or n.noeud_archive is not null
	                      or n.noeud is distinct from (select t.noeud_du_point from _q6rg_resolus_tags_neufs t
	                                                    where t.id = n.id and t.rang = 0))) then
		raise exception 'points ou nœuds des modèles neufs introuvables : %',
			(select count(*) from _q6rg_resolus_tags_neufs where point_id is null)
			+ (select count(*) from _q6rg_resolus_neufs n
			    where n.noeud_propre
			      and (n.noeud is null or n.noeud_archive is not null
			           or n.noeud is distinct from (select t.noeud_du_point from _q6rg_resolus_tags_neufs t
			                                         where t.id = n.id and t.rang = 0)));
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, contenu, rangement et tags relevés ---------------
do $garde$
declare v_presents integer; v_contenus integer; v_ranges integer; v_tags integer; v_manquants integer; v_pris integer;
begin
	-- Verrou : aucune sauvegarde de l'éditeur ne peut s'intercaler entre la garde et la mise à jour.
	perform 1 from public.question_templates q join _q6rg_modeles r on r.id = q.id for update of q;
	select count(*) into v_presents from _q6rg_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 2) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 2', v_presents;
	end if;
	select count(*) into v_contenus from _q6rg_modeles r
	  join public.question_templates q on q.id = r.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs) is distinct from r.avant;
	if v_contenus <> 0 then
		raise exception 'modèles modifiés depuis le relevé : %', v_contenus;
	end if;
	select count(*) into v_ranges from _q6rg_modeles r
	  join _q6rg_resolus x on x.id = r.id
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is distinct from x.noeud or q.grades is distinct from r.grades
	    or q.status is distinct from r.statut;
	if v_ranges <> 0 then
		raise exception 'modèles déplacés ou reclassés depuis le relevé : %', v_ranges;
	end if;
	-- Aucun tag hors du relevé (une saisie faite depuis serait contredite), à tout niveau.
	select count(*) into v_manquants from _q6rg_resolus_tags a
	  join public.question_templates q on q.id = a.id
	 where a.avant and not exists (select 1 from public.question_template_points t
	                                where t.template_id = a.id and t.point_id = a.point_id);
	if v_manquants <> 0 then
		raise exception 'tags relevés absents : %', v_manquants;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _q6rg_modeles r on r.id = q.template_id
	 where not exists (select 1 from _q6rg_resolus_tags a
	                    where a.avant and a.id = q.template_id and a.point_id = q.point_id);
	if v_tags <> 0 then
		raise exception 'tags déjà posés sur ces modèles : %', v_tags;
	end if;
	select count(*) into v_pris from _q6rg_neufs n join public.question_templates q on q.id = n.id;
	if v_pris <> 0 then
		raise exception 'identifiants des modèles neufs déjà pris : %', v_pris;
	end if;
	-- Catégorie (thème, domaine, sous-domaine de l'origine, niveau propre) : unique parmi les
	-- modèles publiés (idx_question_templates_unique_category).
	select count(*) into v_pris from _q6rg_neufs n
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
  from _q6rg_modeles r
 where q.id = r.id;

-- R2 : les origines dont les points vivent ailleurs passent sur le nœud de leurs points, AVANT les
-- tags (le trigger des tags lit le nœud du modèle) ; elles n'ont aucun tag d'avant.
update public.question_templates q
   set classification_node_id = x.noeud_apres
  from _q6rg_resolus x
 where q.id = x.id and x.deplace;

insert into public.question_template_points (template_id, point_id)
select x.id, x.point_id
  from _q6rg_resolus_tags x
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
  from _q6rg_neufs n
  join _q6rg_resolus_neufs x on x.id = n.id
  join public.question_templates q on q.id = n.origine;

insert into public.question_template_points (template_id, point_id)
select x.id, x.point_id
  from _q6rg_resolus_tags_neufs x
  join public.question_templates q on q.id = x.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_ok integer; v_tags integer; v_tous integer; v_neufs integer; v_neufs_tags integer; v_neufs_tous integer;
begin
	select count(*) into v_presents from _q6rg_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_ok from _q6rg_modeles r
	  join _q6rg_resolus x on x.id = r.id
	  join public.question_templates q on q.id = r.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs) = r.apres and q.classification_node_id = x.noeud_apres;
	select count(*) into v_tags from _q6rg_resolus_tags x
	  join public.question_template_points q on q.template_id = x.id and q.point_id = x.point_id;
	select count(*) into v_tous from public.question_template_points q join _q6rg_modeles r on r.id = q.template_id;
	if v_ok <> v_presents or v_tags <> v_tous or v_tags <> least(v_presents, 1) * 2 then
		raise exception 'lot incohérent : contenus %/%, tags %/%', v_ok, v_presents, v_tags, v_tous;
	end if;
	select count(*) into v_neufs from _q6rg_neufs n
	  join _q6rg_resolus_neufs x on x.id = n.id
	  join public.question_templates q on q.id = n.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs) = n.contenu
	   and (not x.noeud_propre or q.classification_node_id = x.noeud);
	select count(*) into v_neufs_tags from _q6rg_resolus_tags_neufs x
	  join public.question_template_points q on q.template_id = x.id and q.point_id = x.point_id;
	select count(*) into v_neufs_tous from public.question_template_points q join _q6rg_neufs n on n.id = q.template_id;
	if v_neufs <> least(v_presents, 1) * 0 or v_neufs_tags <> least(v_presents, 1) * 0 or v_neufs_tous <> v_neufs_tags then
		raise exception 'modèles neufs incohérents : contenus %, tags %', v_neufs, v_neufs_tags;
	end if;
end $check$;

drop table pg_temp._q6rg_resolus_tags_neufs;
drop table pg_temp._q6rg_resolus_neufs;
drop table pg_temp._q6rg_resolus_tags;
drop table pg_temp._q6rg_resolus;
drop table pg_temp._q6rg_tags_neufs;
drop table pg_temp._q6rg_neufs;
drop table pg_temp._q6rg_tags;
drop table pg_temp._q6rg_modeles;
