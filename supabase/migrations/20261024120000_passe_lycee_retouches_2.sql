-- ============================================================================
-- Passe lycée, retouches 2 : 3 modèles corrigés, aucun modèle neuf ni tag posé
-- ============================================================================
-- Défauts relevés pendant la passe et restés ouverts (inventaire du 2026-10-24) :
--   - e02fb162 V1 : le signe + du terme en x de l'équation (« y′ = 3y9x − 15 ») ;
--   - f796ffc0 V4 : condition n > k (n = k donnait deux choix identiques) ;
--   - 0d2edda7 (publié, 2de) : deux variations, pour que la forme de l'égalité ne donne plus la
--     réponse (√a × √b = √(a + b) faux, √a + √a = 2√a vrai).
-- Ni tag, ni nœud, ni niveau, ni statut ne changent.
-- ============================================================================
-- Décision de David le 2026-10-24 (phase 0 validée). Fichier GÉNÉRÉ par
-- docs/wip/passe-lycee/analyse/lot-retouches-2.py — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (3 modèles). Elle est prouvée
-- par tests/integration/passe-lycee-retouches-2.test.ts, qui fabrique des copies des identifiants de
-- la prod (contenu, nœud, niveaux et tags) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit avoir EXACTEMENT le contenu relevé en prod le 2026-10-24, être au nœud,
-- aux niveaux et au statut relevés, et porter exactement son tag relevé.
--
-- Données d'élèves : aucune (relevé du 2026-10-24 : 0 carte SRS, 0 tentative de compétence ou
-- d'évaluation, 0 réponse de test, 0 activité de journal sur les 3 modèles).
--
-- Accès : personne ne gagne d'accès (question tranchée par David le 2026-10-24). Aucune règle ne
-- change ; effet visible : les élèves de 2de tirent deux variations de plus dans 0d2edda7 (publié) ;
-- les deux autres sont des brouillons.
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
-- 	perform 1 from public.question_templates where id in ('0d2edda7-1d90-46ee-b07d-792ebbd43849', 'e02fb162-ca4e-417c-ae37-e39a3798f16c', 'f796ffc0-d9cc-496b-97a8-9e10f07e6fc8') for update;
-- 	select count(*) into v_intacts from public.question_templates q join (values
-- 		('0d2edda7-1d90-46ee-b07d-792ebbd43849'::uuid, '1f8a3104b3c48ed78c73eacae162fece'),
-- 		('e02fb162-ca4e-417c-ae37-e39a3798f16c'::uuid, '7a5b626c637f8b414ff38c9dc2fb1a27'),
-- 		('f796ffc0-d9cc-496b-97a8-9e10f07e6fc8'::uuid, '373f194170d86b08940677a3bb8c505f')
-- 	) as r(id, h) on r.id = q.id
-- 	 where md5(jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs)::text) = r.h;
-- 	if v_intacts <> 3 then
-- 		raise exception 'rollback : % modèle(s) sur 3 portent encore le contenu de la migration', v_intacts;
-- 	end if;
-- end $retour$;
-- update public.question_templates q
--    set title = r.c->>'title', description = r.c->>'description', variations = r.c->'variations',
--        shared = nullif(r.c->'shared', 'null'::jsonb), test_specs = nullif(r.c->'test_specs', 'null'::jsonb)
--   from (values
--   ('0d2edda7-1d90-46ee-b07d-792ebbd43849'::uuid, $plrt2${"title":"Vrai ou Faux : racines et opérations","description":null,"variations":[{"statement":"Vrai ou Faux ?\n\n$${{expression1}}$$","variables":[{"name":"expression1","expression":"sqrt({{a}})+sqrt({{b}})=sqrt({{eval:a+b}})"}],"correction":{"steps":["Faux : en réalité, $\\sqrt{{{a}}} + \\sqrt{{{b}}} > \\sqrt{{{a}} + {{b}}}$.","En effet, les deux membres sont positifs, on peut donc comparer leurs carrés :","$$\\begin{align} \\left(\\sqrt{{{a}}} + \\sqrt{{{b}}}\\right)^2 &= \\left(\\sqrt{{{a}}}\\right)^2 +\\left(\\sqrt{{{b}}}\\right)^2 + 2\\sqrt{{{a}}}\\sqrt{{{b}}} \\\\ &= {{a}} +{{b}}\\textcolor{{{color:primary.1}}}{+2\\sqrt{{{eval:a*b}}}} \\\\ \\left(\\sqrt{{{a}}+{{b}}}\\right)^2 &= {{a}}+{{b}}\\end{align}$$","Comme $2\\sqrt{{{eval:a*b}}} > 0$, le carré de $\\sqrt{{{a}}} + \\sqrt{{{b}}}$ est plus grand que celui de $\\sqrt{{{a}} + {{b}}}$."]},"correctChoiceIndex":["1"]},{"statement":"Vrai ou Faux ?\n\n$${{expression2}}$$","variables":[{"name":"expression2","expression":"sqrt({{a}})*sqrt({{b}})=sqrt({{eval:a*b}})"}],"correction":{"steps":["Vrai : pour deux nombres positifs, $\\sqrt{x} \\times \\sqrt{y} = \\sqrt{x \\times y}$.","$$\\begin{align} \\sqrt{{{a}}} \\times \\sqrt{{{b}}} &= \\sqrt{{{a}} \\times {{b}}} \\\\ &= \\sqrt{{{eval:a*b}}} \\end{align}$$"]},"correctChoiceIndex":["0"]}],"shared":{"choices":[{"content":"Vrai"},{"content":"Faux"}],"variables":[{"name":"a","expression":"2..9"},{"name":"b","expression":"2..9"}]},"test_specs":[{"expected":{"status":"correct"},"variables":{"a":"7","b":"9"},"description":"v0 a=7 b=9 bonne réponse","variationIndex":0,"selectedChoices":[1]},{"expected":{"status":"correct"},"variables":{"a":"2","b":"2"},"description":"v0 a=2 b=2 bonne réponse","variationIndex":0,"selectedChoices":[1]},{"expected":{"status":"correct"},"variables":{"a":"9","b":"9"},"description":"v0 a=9 b=9 bonne réponse","variationIndex":0,"selectedChoices":[1]},{"expected":{"status":"incorrect"},"variables":{"a":"3","b":"5"},"description":"v0 mauvaise réponse","variationIndex":0,"selectedChoices":[0]},{"expected":{"status":"correct"},"variables":{"a":"7","b":"9"},"description":"v1 a=7 b=9 bonne réponse","variationIndex":1,"selectedChoices":[0]},{"expected":{"status":"correct"},"variables":{"a":"2","b":"2"},"description":"v1 a=2 b=2 bonne réponse","variationIndex":1,"selectedChoices":[0]},{"expected":{"status":"correct"},"variables":{"a":"9","b":"9"},"description":"v1 a=9 b=9 bonne réponse","variationIndex":1,"selectedChoices":[0]},{"expected":{"status":"incorrect"},"variables":{"a":"3","b":"5"},"description":"v1 mauvaise réponse","variationIndex":1,"selectedChoices":[1]}]}$plrt2$::jsonb),
--   ('e02fb162-ca4e-417c-ae37-e39a3798f16c'::uuid, $plrt2${"title":"Solution de y′ = ay + f à partir d'une solution particulière","description":"Une solution particulière g étant donnée, écrire les solutions Ce^{ax} + g(x) et fixer C par h(0) (spécialité seulement)","variations":[{"blanks":[{"expectedAnswer":"{{if:y0-q==1|e^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}}}{{if:y0-q==-1|-e^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}}}{{if:y0-q!=1 && y0-q!=-1|{{eval:y0-q}}e^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}}}{{if:p==1|+x}}{{if:p==-1|-x}}{{if:p>0 && p!=1|+{{eval:p}}x}}{{if:p<0 && p!=-1|{{eval:p}}x}}{{if:q>0|+{{eval:q}}}}{{if:q<0|{{eval:q}}}}"}],"statement":"On considère l'équation différentielle $(E) : y'={{if:a==1|y}}{{if:a==-1|-y}}{{if:a!=1 && a!=-1|{{eval:a}}y}}{{if:-a*p==1|x}}{{if:-a*p==-1|-x}}{{if:-a*p!=1 && -a*p!=-1|{{eval:-a*p}}x}}{{if:p-a*q>0|+{{eval:p-a*q}}}}{{if:p-a*q<0|{{eval:p-a*q}}}}$.\n\nLa fonction $g$ définie sur $\\mathbb{R}$ par $g(x)={{if:p==1|x}}{{if:p==-1|-x}}{{if:p!=1 && p!=-1|{{eval:p}}x}}{{if:q>0|+{{eval:q}}}}{{if:q<0|{{eval:q}}}}$ est une solution de cette équation. Détermine la solution $h$ de cette équation telle que $h(0)={{eval:y0}}$.\n\n$h(x)=?$","variables":[{"name":"a","expression":"2..3;±"},{"name":"p","expression":"1..3;±"},{"name":"q","expression":"-4..4"},{"name":"y0","expression":"-5..5"}],"conditions":["y0 != q","p-a*q != 0"],"correction":{"steps":["Les solutions de cette équation sont les fonctions $x\\mapsto Ce^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}+g(x)$ : solutions de l'équation homogène $y'={{if:a==1|y}}{{if:a==-1|-y}}{{if:a!=1 && a!=-1|{{eval:a}}y}}$, plus la solution particulière $g$.","$h(x)=Ce^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}{{if:p==1|+x}}{{if:p==-1|-x}}{{if:p>0 && p!=1|+{{eval:p}}x}}{{if:p<0 && p!=-1|{{eval:p}}x}}{{if:q>0|+{{eval:q}}}}{{if:q<0|{{eval:q}}}}$ et $h(0)=C{{if:q>0|+{{eval:q}}}}{{if:q<0|{{eval:q}}}}={{eval:y0}}$, donc $C={{eval:y0-q}}$.","$h(x)=\\textcolor{{{color:primary.0}}}{{{if:y0-q==1|e^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}}}{{if:y0-q==-1|-e^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}}}{{if:y0-q!=1 && y0-q!=-1|{{eval:y0-q}}e^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}}}{{if:p==1|+x}}{{if:p==-1|-x}}{{if:p>0 && p!=1|+{{eval:p}}x}}{{if:p<0 && p!=-1|{{eval:p}}x}}{{if:q>0|+{{eval:q}}}}{{if:q<0|{{eval:q}}}}}$."]}},{"blanks":[{"expectedAnswer":"(x{{if:y0>0|+{{eval:y0}}}}{{if:y0<0|{{eval:y0}}}})e^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}"}],"statement":"On considère l'équation différentielle $(E) : y'={{if:a==1|y}}{{if:a==-1|-y}}{{if:a!=1 && a!=-1|{{eval:a}}y}}+e^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}$.\n\nLa fonction $g$ définie sur $\\mathbb{R}$ par $g(x)=xe^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}$ est une solution de cette équation. Détermine la solution $h$ de cette équation telle que $h(0)={{eval:y0}}$.\n\n$h(x)=?$","variables":[{"name":"a","expression":"1..3;±"},{"name":"y0","expression":"1..5;±"}],"correction":{"steps":["Les solutions de cette équation sont les fonctions $x\\mapsto Ce^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}+xe^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}=(x+C)e^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}$.","$h(0)=C={{eval:y0}}$.","$h(x)=\\textcolor{{{color:primary.0}}}{(x{{if:y0>0|+{{eval:y0}}}}{{if:y0<0|{{eval:y0}}}})e^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}}$."]}}],"shared":{"cleanCoefficients":true},"test_specs":[{"answers":["3e^{2x}+2x+1"],"expected":{"status":"correct"},"variables":{"a":"2","p":"2","q":"1","y0":"4"},"description":"v0 : y'=2y−4x, g=2x+1 → 3e^{2x}+2x+1","variationIndex":0},{"answers":["4e^{2x}"],"expected":{"status":"incorrect"},"variables":{"a":"2","p":"2","q":"1","y0":"4"},"description":"v0 : g oubliée","variationIndex":0},{"answers":["4e^{2x}+2x+1"],"expected":{"status":"incorrect"},"variables":{"a":"2","p":"2","q":"1","y0":"4"},"description":"v0 : C = h(0) sans retrancher g(0)","variationIndex":0},{"answers":["Ce^{2x}+2x+1"],"expected":{"status":"incorrect"},"variables":{"a":"2","p":"2","q":"1","y0":"4"},"description":"v0 : constante libre laissée","variationIndex":0},{"answers":["2x+1+3e^{2x}"],"expected":{"status":"correct"},"variables":{"a":"2","p":"2","q":"1","y0":"4"},"description":"v0 : ordre changé","variationIndex":0},{"answers":["(x+2)e^{x}"],"expected":{"status":"correct"},"variables":{"a":"1","y0":"2"},"description":"v1 : y'=y+eˣ, g=xeˣ, h(0)=2 → (x+2)eˣ","variationIndex":1},{"answers":["xe^{x}+2e^{x}"],"expected":{"status":"correct"},"variables":{"a":"1","y0":"2"},"description":"v1 : développé","variationIndex":1},{"answers":["2e^{x}"],"expected":{"status":"incorrect"},"variables":{"a":"1","y0":"2"},"description":"v1 : g oubliée","variationIndex":1},{"answers":["(x-1)e^{-2x}"],"expected":{"status":"correct"},"variables":{"a":"-2","y0":"-1"},"description":"v1 : a=-2, h(0)=-1 → (x−1)e^{−2x}","variationIndex":1}]}$plrt2$::jsonb),
--   ('f796ffc0-d9cc-496b-97a8-9e10f07e6fc8'::uuid, $plrt2${"title":"Quel modèle ? k-uplet, k-uplet d'éléments distincts ou combinaison","description":"Reconnaître l'objet à dénombrer selon que l'ordre compte et que la répétition est permise : mot de passe, tiercé, copies tirées au sort, desserts de la semaine (pièges : kⁿ au lieu de nᵏ, combinaison quand l'ordre compte)","variations":[{"choices":[{"content":"${{n}}^{ {{k}} }$"},{"content":"$\\dfrac{ {{n}}! }{ {{eval:n-k}}! }$"},{"content":"$\\binom{ {{n}} }{ {{k}} }$"},{"content":"${{k}}^{ {{n}} }$"}],"statement":"Un mot de passe est formé de ${{k}}$ caractères choisis parmi ${{n}}$ symboles ; un symbole peut être utilisé plusieurs fois.\n\nQuel est le nombre de mots de passe possibles ?","variables":[{"name":"n","expression":"20..40"},{"name":"k","expression":"4..6"}],"correction":{"steps":["L'ordre des caractères compte (« ab » ≠ « ba ») et la **répétition est permise** : ce sont des ${{k}}$-uplets d'un ensemble à ${{n}}$ éléments.","Il y en a $\\textcolor{{{color:primary.0}}}{{{n}}^{ {{k}} }}$."]},"correctChoiceIndex":["0"]},{"choices":[{"content":"$\\dfrac{ {{n}}! }{ {{eval:n-k}}! }$"},{"content":"$\\binom{ {{n}} }{ {{k}} }$"},{"content":"${{n}}^{ {{k}} }$"},{"content":"${{k}}^{ {{n}} }$"}],"statement":"${{n}}$ chevaux prennent le départ d'une course. Un parieur doit donner les ${{k}}$ premiers chevaux **dans l'ordre d'arrivée**.\n\nQuel est le nombre de pronostics possibles ?","variables":[{"name":"n","expression":"10..18"},{"name":"k","expression":"3..4"}],"correction":{"steps":["L'ordre compte et un cheval ne peut pas occuper deux places : ce sont des ${{k}}$-uplets d'éléments **distincts**.","Il y en a $\\textcolor{{{color:primary.0}}}{\\dfrac{ {{n}}! }{ {{eval:n-k}}! }}$ (la combinaison ne tient pas compte de l'ordre)."]},"correctChoiceIndex":["0"]},{"choices":[{"content":"$\\binom{ {{n}} }{ {{k}} }$"},{"content":"$\\dfrac{ {{n}}! }{ {{eval:n-k}}! }$"},{"content":"${{n}}^{ {{k}} }$"},{"content":"${{k}}^{ {{n}} }$"}],"statement":"Un professeur tire au sort ${{k}}$ copies parmi ${{n}}$ pour les faire relire par un collègue.\n\nQuel est le nombre de tirages possibles ?","variables":[{"name":"n","expression":"20..35"},{"name":"k","expression":"3..5"}],"correction":{"steps":["Seul compte **l'ensemble** des copies choisies (pas d'ordre), et une copie n'est pas tirée deux fois : ce sont des parties à ${{k}}$ éléments.","Il y en a $\\textcolor{{{color:primary.0}}}{\\binom{ {{n}} }{ {{k}} }}$."]},"correctChoiceIndex":["0"]},{"choices":[{"content":"${{n}}^{ {{k}} }$"},{"content":"$\\dfrac{ {{n}}! }{ {{eval:n-k}}! }$"},{"content":"$\\binom{ {{n}} }{ {{k}} }$"},{"content":"${{k}}^{ {{n}} }$"}],"statement":"Chaque jour d'une période de ${{k}}$ jours, la cantine sert un dessert choisi parmi ${{n}}$ desserts ; le même dessert peut revenir plusieurs jours.\n\nQuel est le nombre de programmes de desserts possibles ?","variables":[{"name":"n","expression":"5..9"},{"name":"k","expression":"3..5"}],"correction":{"steps":["Un programme associe un dessert à chaque jour : l'ordre des jours compte et un dessert peut revenir, ce sont des ${{k}}$-uplets.","Il y en a $\\textcolor{{{color:primary.0}}}{{{n}}^{ {{k}} }}$ (et non ${{k}}^{ {{n}} }$)."]},"correctChoiceIndex":["0"]}],"shared":null,"test_specs":[{"expected":{"status":"correct"},"variables":{"k":"5","n":"26"},"description":"v0 : nᵏ","variationIndex":0,"selectedChoices":[0]},{"expected":{"status":"incorrect"},"variables":{"k":"5","n":"26"},"description":"v0 : arrangement (répétition oubliée)","variationIndex":0,"selectedChoices":[1]},{"expected":{"status":"incorrect"},"variables":{"k":"5","n":"26"},"description":"v0 : kⁿ","variationIndex":0,"selectedChoices":[3]},{"expected":{"status":"correct"},"variables":{"k":"3","n":"12"},"description":"v1 : arrangement","variationIndex":1,"selectedChoices":[0]},{"expected":{"status":"incorrect"},"variables":{"k":"3","n":"12"},"description":"v1 : combinaison (ordre oublié)","variationIndex":1,"selectedChoices":[1]},{"expected":{"status":"incorrect"},"variables":{"k":"3","n":"12"},"description":"v1 : nᵏ (répétitions)","variationIndex":1,"selectedChoices":[2]},{"expected":{"status":"correct"},"variables":{"k":"4","n":"30"},"description":"v2 : combinaison","variationIndex":2,"selectedChoices":[0]},{"expected":{"status":"incorrect"},"variables":{"k":"4","n":"30"},"description":"v2 : arrangement (ordre à tort)","variationIndex":2,"selectedChoices":[1]},{"expected":{"status":"correct"},"variables":{"k":"5","n":"6"},"description":"v3 : nᵏ","variationIndex":3,"selectedChoices":[0]},{"expected":{"status":"incorrect"},"variables":{"k":"5","n":"6"},"description":"v3 : kⁿ","variationIndex":3,"selectedChoices":[3]},{"expected":{"status":"incorrect"},"variables":{"k":"5","n":"6"},"description":"v3 : arrangement (desserts distincts à tort)","variationIndex":3,"selectedChoices":[1]}]}$plrt2$::jsonb)
--   ) as r(id, c)
--  where q.id = r.id;
-- ROLLBACK:END
-- ============================================================================

set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires -----------------------------------------------------
drop table if exists pg_temp._plrt2_modeles;
create temporary table _plrt2_modeles (
	id uuid primary key,
	branche text not null, notion text not null, sous_notion text,
	grades text[] not null,
	-- Statut relevé : les neufs en héritent (un brouillon publié depuis publierait ses neufs).
	statut text not null,
	avant jsonb not null, apres jsonb not null,
	-- Nœud d'arrivée (R2 : les points du modèle vivent ailleurs) ; null : il ne bouge pas.
	branche_apres text, notion_apres text, sous_notion_apres text
);
insert into _plrt2_modeles values ('0d2edda7-1d90-46ee-b07d-792ebbd43849', $plrt2$Nombres et calculs$plrt2$, $plrt2$Racines carrées : calculs$plrt2$, $plrt2$propriétés$plrt2$, array['2'], 'published',
  $plrt2${"title":"Vrai ou Faux : racines et opérations","description":null,"variations":[{"statement":"Vrai ou Faux ?\n\n$${{expression1}}$$","variables":[{"name":"expression1","expression":"sqrt({{a}})+sqrt({{b}})=sqrt({{eval:a+b}})"}],"correction":{"steps":["Faux : en réalité, $\\sqrt{{{a}}} + \\sqrt{{{b}}} > \\sqrt{{{a}} + {{b}}}$.","En effet, les deux membres sont positifs, on peut donc comparer leurs carrés :","$$\\begin{align} \\left(\\sqrt{{{a}}} + \\sqrt{{{b}}}\\right)^2 &= \\left(\\sqrt{{{a}}}\\right)^2 +\\left(\\sqrt{{{b}}}\\right)^2 + 2\\sqrt{{{a}}}\\sqrt{{{b}}} \\\\ &= {{a}} +{{b}}\\textcolor{{{color:primary.1}}}{+2\\sqrt{{{eval:a*b}}}} \\\\ \\left(\\sqrt{{{a}}+{{b}}}\\right)^2 &= {{a}}+{{b}}\\end{align}$$","Comme $2\\sqrt{{{eval:a*b}}} > 0$, le carré de $\\sqrt{{{a}}} + \\sqrt{{{b}}}$ est plus grand que celui de $\\sqrt{{{a}} + {{b}}}$."]},"correctChoiceIndex":["1"]},{"statement":"Vrai ou Faux ?\n\n$${{expression2}}$$","variables":[{"name":"expression2","expression":"sqrt({{a}})*sqrt({{b}})=sqrt({{eval:a*b}})"}],"correction":{"steps":["Vrai : pour deux nombres positifs, $\\sqrt{x} \\times \\sqrt{y} = \\sqrt{x \\times y}$.","$$\\begin{align} \\sqrt{{{a}}} \\times \\sqrt{{{b}}} &= \\sqrt{{{a}} \\times {{b}}} \\\\ &= \\sqrt{{{eval:a*b}}} \\end{align}$$"]},"correctChoiceIndex":["0"]}],"shared":{"choices":[{"content":"Vrai"},{"content":"Faux"}],"variables":[{"name":"a","expression":"2..9"},{"name":"b","expression":"2..9"}]},"test_specs":[{"expected":{"status":"correct"},"variables":{"a":"7","b":"9"},"description":"v0 a=7 b=9 bonne réponse","variationIndex":0,"selectedChoices":[1]},{"expected":{"status":"correct"},"variables":{"a":"2","b":"2"},"description":"v0 a=2 b=2 bonne réponse","variationIndex":0,"selectedChoices":[1]},{"expected":{"status":"correct"},"variables":{"a":"9","b":"9"},"description":"v0 a=9 b=9 bonne réponse","variationIndex":0,"selectedChoices":[1]},{"expected":{"status":"incorrect"},"variables":{"a":"3","b":"5"},"description":"v0 mauvaise réponse","variationIndex":0,"selectedChoices":[0]},{"expected":{"status":"correct"},"variables":{"a":"7","b":"9"},"description":"v1 a=7 b=9 bonne réponse","variationIndex":1,"selectedChoices":[0]},{"expected":{"status":"correct"},"variables":{"a":"2","b":"2"},"description":"v1 a=2 b=2 bonne réponse","variationIndex":1,"selectedChoices":[0]},{"expected":{"status":"correct"},"variables":{"a":"9","b":"9"},"description":"v1 a=9 b=9 bonne réponse","variationIndex":1,"selectedChoices":[0]},{"expected":{"status":"incorrect"},"variables":{"a":"3","b":"5"},"description":"v1 mauvaise réponse","variationIndex":1,"selectedChoices":[1]}]}$plrt2$::jsonb,
  $plrt2${"title":"Vrai ou Faux : racines et opérations","description":null,"variations":[{"statement":"Vrai ou Faux ?\n\n$${{expression1}}$$","variables":[{"name":"expression1","expression":"sqrt({{a}})+sqrt({{b}})=sqrt({{eval:a+b}})"}],"correction":{"steps":["Faux : en réalité, $\\sqrt{{{a}}} + \\sqrt{{{b}}} > \\sqrt{{{a}} + {{b}}}$.","En effet, les deux membres sont positifs, on peut donc comparer leurs carrés :","$$\\begin{align} \\left(\\sqrt{{{a}}} + \\sqrt{{{b}}}\\right)^2 &= \\left(\\sqrt{{{a}}}\\right)^2 +\\left(\\sqrt{{{b}}}\\right)^2 + 2\\sqrt{{{a}}}\\sqrt{{{b}}} \\\\ &= {{a}} +{{b}}\\textcolor{{{color:primary.1}}}{+2\\sqrt{{{eval:a*b}}}} \\\\ \\left(\\sqrt{{{a}}+{{b}}}\\right)^2 &= {{a}}+{{b}}\\end{align}$$","Comme $2\\sqrt{{{eval:a*b}}} > 0$, le carré de $\\sqrt{{{a}}} + \\sqrt{{{b}}}$ est plus grand que celui de $\\sqrt{{{a}} + {{b}}}$."]},"correctChoiceIndex":["1"]},{"statement":"Vrai ou Faux ?\n\n$${{expression2}}$$","variables":[{"name":"expression2","expression":"sqrt({{a}})*sqrt({{b}})=sqrt({{eval:a*b}})"}],"correction":{"steps":["Vrai : pour deux nombres positifs, $\\sqrt{x} \\times \\sqrt{y} = \\sqrt{x \\times y}$.","$$\\begin{align} \\sqrt{{{a}}} \\times \\sqrt{{{b}}} &= \\sqrt{{{a}} \\times {{b}}} \\\\ &= \\sqrt{{{eval:a*b}}} \\end{align}$$"]},"correctChoiceIndex":["0"]},{"statement":"Vrai ou Faux ?\n\n$${{expression3}}$$","variables":[{"name":"expression3","expression":"sqrt({{a}})*sqrt({{b}})=sqrt({{eval:a+b}})"}],"conditions":["a*b != a+b"],"correction":{"steps":["Faux : le produit de deux racines est la racine du **produit**, pas de la somme.","$$\\sqrt{{{a}}} \\times \\sqrt{{{b}}} = \\sqrt{{{a}} \\times {{b}}} = \\sqrt{{{eval:a*b}}}$$","Or ${{eval:a*b}} \\neq {{eval:a+b}}$, donc $\\sqrt{{{eval:a*b}}} \\neq \\sqrt{{{eval:a+b}}}$."]},"correctChoiceIndex":["1"]},{"statement":"Vrai ou Faux ?\n\n$${{expression4}}$$","variables":[{"name":"expression4","expression":"sqrt({{a}})+sqrt({{a}})=2sqrt({{a}})"}],"correction":{"steps":["Vrai : on ajoute deux fois le même nombre $\\sqrt{{{a}}}$.","$$\\sqrt{{{a}}} + \\sqrt{{{a}}} = 2 \\times \\sqrt{{{a}}} = 2\\sqrt{{{a}}}$$"]},"correctChoiceIndex":["0"]}],"shared":{"choices":[{"content":"Vrai"},{"content":"Faux"}],"variables":[{"name":"a","expression":"2..9"},{"name":"b","expression":"2..9"}]},"test_specs":[{"expected":{"status":"correct"},"variables":{"a":"7","b":"9"},"description":"v0 a=7 b=9 bonne réponse","variationIndex":0,"selectedChoices":[1]},{"expected":{"status":"correct"},"variables":{"a":"2","b":"2"},"description":"v0 a=2 b=2 bonne réponse","variationIndex":0,"selectedChoices":[1]},{"expected":{"status":"correct"},"variables":{"a":"9","b":"9"},"description":"v0 a=9 b=9 bonne réponse","variationIndex":0,"selectedChoices":[1]},{"expected":{"status":"incorrect"},"variables":{"a":"3","b":"5"},"description":"v0 mauvaise réponse","variationIndex":0,"selectedChoices":[0]},{"expected":{"status":"correct"},"variables":{"a":"7","b":"9"},"description":"v1 a=7 b=9 bonne réponse","variationIndex":1,"selectedChoices":[0]},{"expected":{"status":"correct"},"variables":{"a":"2","b":"2"},"description":"v1 a=2 b=2 bonne réponse","variationIndex":1,"selectedChoices":[0]},{"expected":{"status":"correct"},"variables":{"a":"9","b":"9"},"description":"v1 a=9 b=9 bonne réponse","variationIndex":1,"selectedChoices":[0]},{"expected":{"status":"incorrect"},"variables":{"a":"3","b":"5"},"description":"v1 mauvaise réponse","variationIndex":1,"selectedChoices":[1]},{"expected":{"status":"correct"},"variables":{"a":"3","b":"5"},"description":"v2 a=3 b=5 bonne réponse (faux)","variationIndex":2,"selectedChoices":[1]},{"expected":{"status":"correct"},"variables":{"a":"2","b":"3"},"description":"v2 a=2 b=3 bonne réponse (faux)","variationIndex":2,"selectedChoices":[1]},{"expected":{"status":"incorrect"},"variables":{"a":"3","b":"5"},"description":"v2 mauvaise réponse","variationIndex":2,"selectedChoices":[0]},{"expected":{"status":"correct"},"variables":{"a":"7","b":"9"},"description":"v3 a=7 bonne réponse (vrai)","variationIndex":3,"selectedChoices":[0]},{"expected":{"status":"incorrect"},"variables":{"a":"7","b":"9"},"description":"v3 mauvaise réponse","variationIndex":3,"selectedChoices":[1]}]}$plrt2$::jsonb,
  null, null, null);
insert into _plrt2_modeles values ('e02fb162-ca4e-417c-ae37-e39a3798f16c', $plrt2$Équations différentielles$plrt2$, $plrt2$y′ = ay + f$plrt2$, null, array['T_SPE'], 'draft',
  $plrt2${"title":"Solution de y′ = ay + f à partir d'une solution particulière","description":"Une solution particulière g étant donnée, écrire les solutions Ce^{ax} + g(x) et fixer C par h(0) (spécialité seulement)","variations":[{"blanks":[{"expectedAnswer":"{{if:y0-q==1|e^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}}}{{if:y0-q==-1|-e^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}}}{{if:y0-q!=1 && y0-q!=-1|{{eval:y0-q}}e^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}}}{{if:p==1|+x}}{{if:p==-1|-x}}{{if:p>0 && p!=1|+{{eval:p}}x}}{{if:p<0 && p!=-1|{{eval:p}}x}}{{if:q>0|+{{eval:q}}}}{{if:q<0|{{eval:q}}}}"}],"statement":"On considère l'équation différentielle $(E) : y'={{if:a==1|y}}{{if:a==-1|-y}}{{if:a!=1 && a!=-1|{{eval:a}}y}}{{if:-a*p==1|x}}{{if:-a*p==-1|-x}}{{if:-a*p!=1 && -a*p!=-1|{{eval:-a*p}}x}}{{if:p-a*q>0|+{{eval:p-a*q}}}}{{if:p-a*q<0|{{eval:p-a*q}}}}$.\n\nLa fonction $g$ définie sur $\\mathbb{R}$ par $g(x)={{if:p==1|x}}{{if:p==-1|-x}}{{if:p!=1 && p!=-1|{{eval:p}}x}}{{if:q>0|+{{eval:q}}}}{{if:q<0|{{eval:q}}}}$ est une solution de cette équation. Détermine la solution $h$ de cette équation telle que $h(0)={{eval:y0}}$.\n\n$h(x)=?$","variables":[{"name":"a","expression":"2..3;±"},{"name":"p","expression":"1..3;±"},{"name":"q","expression":"-4..4"},{"name":"y0","expression":"-5..5"}],"conditions":["y0 != q","p-a*q != 0"],"correction":{"steps":["Les solutions de cette équation sont les fonctions $x\\mapsto Ce^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}+g(x)$ : solutions de l'équation homogène $y'={{if:a==1|y}}{{if:a==-1|-y}}{{if:a!=1 && a!=-1|{{eval:a}}y}}$, plus la solution particulière $g$.","$h(x)=Ce^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}{{if:p==1|+x}}{{if:p==-1|-x}}{{if:p>0 && p!=1|+{{eval:p}}x}}{{if:p<0 && p!=-1|{{eval:p}}x}}{{if:q>0|+{{eval:q}}}}{{if:q<0|{{eval:q}}}}$ et $h(0)=C{{if:q>0|+{{eval:q}}}}{{if:q<0|{{eval:q}}}}={{eval:y0}}$, donc $C={{eval:y0-q}}$.","$h(x)=\\textcolor{{{color:primary.0}}}{{{if:y0-q==1|e^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}}}{{if:y0-q==-1|-e^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}}}{{if:y0-q!=1 && y0-q!=-1|{{eval:y0-q}}e^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}}}{{if:p==1|+x}}{{if:p==-1|-x}}{{if:p>0 && p!=1|+{{eval:p}}x}}{{if:p<0 && p!=-1|{{eval:p}}x}}{{if:q>0|+{{eval:q}}}}{{if:q<0|{{eval:q}}}}}$."]}},{"blanks":[{"expectedAnswer":"(x{{if:y0>0|+{{eval:y0}}}}{{if:y0<0|{{eval:y0}}}})e^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}"}],"statement":"On considère l'équation différentielle $(E) : y'={{if:a==1|y}}{{if:a==-1|-y}}{{if:a!=1 && a!=-1|{{eval:a}}y}}+e^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}$.\n\nLa fonction $g$ définie sur $\\mathbb{R}$ par $g(x)=xe^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}$ est une solution de cette équation. Détermine la solution $h$ de cette équation telle que $h(0)={{eval:y0}}$.\n\n$h(x)=?$","variables":[{"name":"a","expression":"1..3;±"},{"name":"y0","expression":"1..5;±"}],"correction":{"steps":["Les solutions de cette équation sont les fonctions $x\\mapsto Ce^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}+xe^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}=(x+C)e^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}$.","$h(0)=C={{eval:y0}}$.","$h(x)=\\textcolor{{{color:primary.0}}}{(x{{if:y0>0|+{{eval:y0}}}}{{if:y0<0|{{eval:y0}}}})e^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}}$."]}}],"shared":{"cleanCoefficients":true},"test_specs":[{"answers":["3e^{2x}+2x+1"],"expected":{"status":"correct"},"variables":{"a":"2","p":"2","q":"1","y0":"4"},"description":"v0 : y'=2y−4x, g=2x+1 → 3e^{2x}+2x+1","variationIndex":0},{"answers":["4e^{2x}"],"expected":{"status":"incorrect"},"variables":{"a":"2","p":"2","q":"1","y0":"4"},"description":"v0 : g oubliée","variationIndex":0},{"answers":["4e^{2x}+2x+1"],"expected":{"status":"incorrect"},"variables":{"a":"2","p":"2","q":"1","y0":"4"},"description":"v0 : C = h(0) sans retrancher g(0)","variationIndex":0},{"answers":["Ce^{2x}+2x+1"],"expected":{"status":"incorrect"},"variables":{"a":"2","p":"2","q":"1","y0":"4"},"description":"v0 : constante libre laissée","variationIndex":0},{"answers":["2x+1+3e^{2x}"],"expected":{"status":"correct"},"variables":{"a":"2","p":"2","q":"1","y0":"4"},"description":"v0 : ordre changé","variationIndex":0},{"answers":["(x+2)e^{x}"],"expected":{"status":"correct"},"variables":{"a":"1","y0":"2"},"description":"v1 : y'=y+eˣ, g=xeˣ, h(0)=2 → (x+2)eˣ","variationIndex":1},{"answers":["xe^{x}+2e^{x}"],"expected":{"status":"correct"},"variables":{"a":"1","y0":"2"},"description":"v1 : développé","variationIndex":1},{"answers":["2e^{x}"],"expected":{"status":"incorrect"},"variables":{"a":"1","y0":"2"},"description":"v1 : g oubliée","variationIndex":1},{"answers":["(x-1)e^{-2x}"],"expected":{"status":"correct"},"variables":{"a":"-2","y0":"-1"},"description":"v1 : a=-2, h(0)=-1 → (x−1)e^{−2x}","variationIndex":1}]}$plrt2$::jsonb,
  $plrt2${"title":"Solution de y′ = ay + f à partir d'une solution particulière","description":"Une solution particulière g étant donnée, écrire les solutions Ce^{ax} + g(x) et fixer C par h(0) (spécialité seulement)","variations":[{"blanks":[{"expectedAnswer":"{{if:y0-q==1|e^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}}}{{if:y0-q==-1|-e^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}}}{{if:y0-q!=1 && y0-q!=-1|{{eval:y0-q}}e^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}}}{{if:p==1|+x}}{{if:p==-1|-x}}{{if:p>0 && p!=1|+{{eval:p}}x}}{{if:p<0 && p!=-1|{{eval:p}}x}}{{if:q>0|+{{eval:q}}}}{{if:q<0|{{eval:q}}}}"}],"statement":"On considère l'équation différentielle $(E) : y'={{if:a==1|y}}{{if:a==-1|-y}}{{if:a!=1 && a!=-1|{{eval:a}}y}}{{if:-a*p==1|+x}}{{if:-a*p==-1|-x}}{{if:-a*p>0 && -a*p!=1|+{{eval:-a*p}}x}}{{if:-a*p<0 && -a*p!=-1|{{eval:-a*p}}x}}{{if:p-a*q>0|+{{eval:p-a*q}}}}{{if:p-a*q<0|{{eval:p-a*q}}}}$.\n\nLa fonction $g$ définie sur $\\mathbb{R}$ par $g(x)={{if:p==1|x}}{{if:p==-1|-x}}{{if:p!=1 && p!=-1|{{eval:p}}x}}{{if:q>0|+{{eval:q}}}}{{if:q<0|{{eval:q}}}}$ est une solution de cette équation. Détermine la solution $h$ de cette équation telle que $h(0)={{eval:y0}}$.\n\n$h(x)=?$","variables":[{"name":"a","expression":"2..3;±"},{"name":"p","expression":"1..3;±"},{"name":"q","expression":"-4..4"},{"name":"y0","expression":"-5..5"}],"conditions":["y0 != q","p-a*q != 0"],"correction":{"steps":["Les solutions de cette équation sont les fonctions $x\\mapsto Ce^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}+g(x)$ : solutions de l'équation homogène $y'={{if:a==1|y}}{{if:a==-1|-y}}{{if:a!=1 && a!=-1|{{eval:a}}y}}$, plus la solution particulière $g$.","$h(x)=Ce^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}{{if:p==1|+x}}{{if:p==-1|-x}}{{if:p>0 && p!=1|+{{eval:p}}x}}{{if:p<0 && p!=-1|{{eval:p}}x}}{{if:q>0|+{{eval:q}}}}{{if:q<0|{{eval:q}}}}$ et $h(0)=C{{if:q>0|+{{eval:q}}}}{{if:q<0|{{eval:q}}}}={{eval:y0}}$, donc $C={{eval:y0-q}}$.","$h(x)=\\textcolor{{{color:primary.0}}}{{{if:y0-q==1|e^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}}}{{if:y0-q==-1|-e^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}}}{{if:y0-q!=1 && y0-q!=-1|{{eval:y0-q}}e^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}}}{{if:p==1|+x}}{{if:p==-1|-x}}{{if:p>0 && p!=1|+{{eval:p}}x}}{{if:p<0 && p!=-1|{{eval:p}}x}}{{if:q>0|+{{eval:q}}}}{{if:q<0|{{eval:q}}}}}$."]}},{"blanks":[{"expectedAnswer":"(x{{if:y0>0|+{{eval:y0}}}}{{if:y0<0|{{eval:y0}}}})e^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}"}],"statement":"On considère l'équation différentielle $(E) : y'={{if:a==1|y}}{{if:a==-1|-y}}{{if:a!=1 && a!=-1|{{eval:a}}y}}+e^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}$.\n\nLa fonction $g$ définie sur $\\mathbb{R}$ par $g(x)=xe^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}$ est une solution de cette équation. Détermine la solution $h$ de cette équation telle que $h(0)={{eval:y0}}$.\n\n$h(x)=?$","variables":[{"name":"a","expression":"1..3;±"},{"name":"y0","expression":"1..5;±"}],"correction":{"steps":["Les solutions de cette équation sont les fonctions $x\\mapsto Ce^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}+xe^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}=(x+C)e^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}$.","$h(0)=C={{eval:y0}}$.","$h(x)=\\textcolor{{{color:primary.0}}}{(x{{if:y0>0|+{{eval:y0}}}}{{if:y0<0|{{eval:y0}}}})e^{{{if:a==1|x}}{{if:a==-1|-x}}{{if:a!=1 && a!=-1|{{eval:a}}x}}}}$."]}}],"shared":{"cleanCoefficients":true},"test_specs":[{"answers":["3e^{2x}+2x+1"],"expected":{"status":"correct"},"variables":{"a":"2","p":"2","q":"1","y0":"4"},"description":"v0 : y'=2y−4x, g=2x+1 → 3e^{2x}+2x+1","variationIndex":0},{"answers":["4e^{2x}"],"expected":{"status":"incorrect"},"variables":{"a":"2","p":"2","q":"1","y0":"4"},"description":"v0 : g oubliée","variationIndex":0},{"answers":["4e^{2x}+2x+1"],"expected":{"status":"incorrect"},"variables":{"a":"2","p":"2","q":"1","y0":"4"},"description":"v0 : C = h(0) sans retrancher g(0)","variationIndex":0},{"answers":["Ce^{2x}+2x+1"],"expected":{"status":"incorrect"},"variables":{"a":"2","p":"2","q":"1","y0":"4"},"description":"v0 : constante libre laissée","variationIndex":0},{"answers":["2x+1+3e^{2x}"],"expected":{"status":"correct"},"variables":{"a":"2","p":"2","q":"1","y0":"4"},"description":"v0 : ordre changé","variationIndex":0},{"answers":["(x+2)e^{x}"],"expected":{"status":"correct"},"variables":{"a":"1","y0":"2"},"description":"v1 : y'=y+eˣ, g=xeˣ, h(0)=2 → (x+2)eˣ","variationIndex":1},{"answers":["xe^{x}+2e^{x}"],"expected":{"status":"correct"},"variables":{"a":"1","y0":"2"},"description":"v1 : développé","variationIndex":1},{"answers":["2e^{x}"],"expected":{"status":"incorrect"},"variables":{"a":"1","y0":"2"},"description":"v1 : g oubliée","variationIndex":1},{"answers":["(x-1)e^{-2x}"],"expected":{"status":"correct"},"variables":{"a":"-2","y0":"-1"},"description":"v1 : a=-2, h(0)=-1 → (x−1)e^{−2x}","variationIndex":1},{"answers":["2e^{2x}-x+1"],"expected":{"status":"correct"},"variables":{"a":"2","p":"-1","q":"1","y0":"3"},"description":"v0 : y'=2y+2x−1 (terme en x positif), g=−x+1 → 2e^{2x}−x+1","variationIndex":0}]}$plrt2$::jsonb,
  null, null, null);
insert into _plrt2_modeles values ('f796ffc0-d9cc-496b-97a8-9e10f07e6fc8', $plrt2$Dénombrement$plrt2$, $plrt2$Problèmes de dénombrement$plrt2$, null, array['T_SPE'], 'draft',
  $plrt2${"title":"Quel modèle ? k-uplet, k-uplet d'éléments distincts ou combinaison","description":"Reconnaître l'objet à dénombrer selon que l'ordre compte et que la répétition est permise : mot de passe, tiercé, copies tirées au sort, desserts de la semaine (pièges : kⁿ au lieu de nᵏ, combinaison quand l'ordre compte)","variations":[{"choices":[{"content":"${{n}}^{ {{k}} }$"},{"content":"$\\dfrac{ {{n}}! }{ {{eval:n-k}}! }$"},{"content":"$\\binom{ {{n}} }{ {{k}} }$"},{"content":"${{k}}^{ {{n}} }$"}],"statement":"Un mot de passe est formé de ${{k}}$ caractères choisis parmi ${{n}}$ symboles ; un symbole peut être utilisé plusieurs fois.\n\nQuel est le nombre de mots de passe possibles ?","variables":[{"name":"n","expression":"20..40"},{"name":"k","expression":"4..6"}],"correction":{"steps":["L'ordre des caractères compte (« ab » ≠ « ba ») et la **répétition est permise** : ce sont des ${{k}}$-uplets d'un ensemble à ${{n}}$ éléments.","Il y en a $\\textcolor{{{color:primary.0}}}{{{n}}^{ {{k}} }}$."]},"correctChoiceIndex":["0"]},{"choices":[{"content":"$\\dfrac{ {{n}}! }{ {{eval:n-k}}! }$"},{"content":"$\\binom{ {{n}} }{ {{k}} }$"},{"content":"${{n}}^{ {{k}} }$"},{"content":"${{k}}^{ {{n}} }$"}],"statement":"${{n}}$ chevaux prennent le départ d'une course. Un parieur doit donner les ${{k}}$ premiers chevaux **dans l'ordre d'arrivée**.\n\nQuel est le nombre de pronostics possibles ?","variables":[{"name":"n","expression":"10..18"},{"name":"k","expression":"3..4"}],"correction":{"steps":["L'ordre compte et un cheval ne peut pas occuper deux places : ce sont des ${{k}}$-uplets d'éléments **distincts**.","Il y en a $\\textcolor{{{color:primary.0}}}{\\dfrac{ {{n}}! }{ {{eval:n-k}}! }}$ (la combinaison ne tient pas compte de l'ordre)."]},"correctChoiceIndex":["0"]},{"choices":[{"content":"$\\binom{ {{n}} }{ {{k}} }$"},{"content":"$\\dfrac{ {{n}}! }{ {{eval:n-k}}! }$"},{"content":"${{n}}^{ {{k}} }$"},{"content":"${{k}}^{ {{n}} }$"}],"statement":"Un professeur tire au sort ${{k}}$ copies parmi ${{n}}$ pour les faire relire par un collègue.\n\nQuel est le nombre de tirages possibles ?","variables":[{"name":"n","expression":"20..35"},{"name":"k","expression":"3..5"}],"correction":{"steps":["Seul compte **l'ensemble** des copies choisies (pas d'ordre), et une copie n'est pas tirée deux fois : ce sont des parties à ${{k}}$ éléments.","Il y en a $\\textcolor{{{color:primary.0}}}{\\binom{ {{n}} }{ {{k}} }}$."]},"correctChoiceIndex":["0"]},{"choices":[{"content":"${{n}}^{ {{k}} }$"},{"content":"$\\dfrac{ {{n}}! }{ {{eval:n-k}}! }$"},{"content":"$\\binom{ {{n}} }{ {{k}} }$"},{"content":"${{k}}^{ {{n}} }$"}],"statement":"Chaque jour d'une période de ${{k}}$ jours, la cantine sert un dessert choisi parmi ${{n}}$ desserts ; le même dessert peut revenir plusieurs jours.\n\nQuel est le nombre de programmes de desserts possibles ?","variables":[{"name":"n","expression":"5..9"},{"name":"k","expression":"3..5"}],"correction":{"steps":["Un programme associe un dessert à chaque jour : l'ordre des jours compte et un dessert peut revenir, ce sont des ${{k}}$-uplets.","Il y en a $\\textcolor{{{color:primary.0}}}{{{n}}^{ {{k}} }}$ (et non ${{k}}^{ {{n}} }$)."]},"correctChoiceIndex":["0"]}],"shared":null,"test_specs":[{"expected":{"status":"correct"},"variables":{"k":"5","n":"26"},"description":"v0 : nᵏ","variationIndex":0,"selectedChoices":[0]},{"expected":{"status":"incorrect"},"variables":{"k":"5","n":"26"},"description":"v0 : arrangement (répétition oubliée)","variationIndex":0,"selectedChoices":[1]},{"expected":{"status":"incorrect"},"variables":{"k":"5","n":"26"},"description":"v0 : kⁿ","variationIndex":0,"selectedChoices":[3]},{"expected":{"status":"correct"},"variables":{"k":"3","n":"12"},"description":"v1 : arrangement","variationIndex":1,"selectedChoices":[0]},{"expected":{"status":"incorrect"},"variables":{"k":"3","n":"12"},"description":"v1 : combinaison (ordre oublié)","variationIndex":1,"selectedChoices":[1]},{"expected":{"status":"incorrect"},"variables":{"k":"3","n":"12"},"description":"v1 : nᵏ (répétitions)","variationIndex":1,"selectedChoices":[2]},{"expected":{"status":"correct"},"variables":{"k":"4","n":"30"},"description":"v2 : combinaison","variationIndex":2,"selectedChoices":[0]},{"expected":{"status":"incorrect"},"variables":{"k":"4","n":"30"},"description":"v2 : arrangement (ordre à tort)","variationIndex":2,"selectedChoices":[1]},{"expected":{"status":"correct"},"variables":{"k":"5","n":"6"},"description":"v3 : nᵏ","variationIndex":3,"selectedChoices":[0]},{"expected":{"status":"incorrect"},"variables":{"k":"5","n":"6"},"description":"v3 : kⁿ","variationIndex":3,"selectedChoices":[3]},{"expected":{"status":"incorrect"},"variables":{"k":"5","n":"6"},"description":"v3 : arrangement (desserts distincts à tort)","variationIndex":3,"selectedChoices":[1]}]}$plrt2$::jsonb,
  $plrt2${"title":"Quel modèle ? k-uplet, k-uplet d'éléments distincts ou combinaison","description":"Reconnaître l'objet à dénombrer selon que l'ordre compte et que la répétition est permise : mot de passe, tiercé, copies tirées au sort, desserts de la semaine (pièges : kⁿ au lieu de nᵏ, combinaison quand l'ordre compte)","variations":[{"choices":[{"content":"${{n}}^{ {{k}} }$"},{"content":"$\\dfrac{ {{n}}! }{ {{eval:n-k}}! }$"},{"content":"$\\binom{ {{n}} }{ {{k}} }$"},{"content":"${{k}}^{ {{n}} }$"}],"statement":"Un mot de passe est formé de ${{k}}$ caractères choisis parmi ${{n}}$ symboles ; un symbole peut être utilisé plusieurs fois.\n\nQuel est le nombre de mots de passe possibles ?","variables":[{"name":"n","expression":"20..40"},{"name":"k","expression":"4..6"}],"correction":{"steps":["L'ordre des caractères compte (« ab » ≠ « ba ») et la **répétition est permise** : ce sont des ${{k}}$-uplets d'un ensemble à ${{n}}$ éléments.","Il y en a $\\textcolor{{{color:primary.0}}}{{{n}}^{ {{k}} }}$."]},"correctChoiceIndex":["0"]},{"choices":[{"content":"$\\dfrac{ {{n}}! }{ {{eval:n-k}}! }$"},{"content":"$\\binom{ {{n}} }{ {{k}} }$"},{"content":"${{n}}^{ {{k}} }$"},{"content":"${{k}}^{ {{n}} }$"}],"statement":"${{n}}$ chevaux prennent le départ d'une course. Un parieur doit donner les ${{k}}$ premiers chevaux **dans l'ordre d'arrivée**.\n\nQuel est le nombre de pronostics possibles ?","variables":[{"name":"n","expression":"10..18"},{"name":"k","expression":"3..4"}],"correction":{"steps":["L'ordre compte et un cheval ne peut pas occuper deux places : ce sont des ${{k}}$-uplets d'éléments **distincts**.","Il y en a $\\textcolor{{{color:primary.0}}}{\\dfrac{ {{n}}! }{ {{eval:n-k}}! }}$ (la combinaison ne tient pas compte de l'ordre)."]},"correctChoiceIndex":["0"]},{"choices":[{"content":"$\\binom{ {{n}} }{ {{k}} }$"},{"content":"$\\dfrac{ {{n}}! }{ {{eval:n-k}}! }$"},{"content":"${{n}}^{ {{k}} }$"},{"content":"${{k}}^{ {{n}} }$"}],"statement":"Un professeur tire au sort ${{k}}$ copies parmi ${{n}}$ pour les faire relire par un collègue.\n\nQuel est le nombre de tirages possibles ?","variables":[{"name":"n","expression":"20..35"},{"name":"k","expression":"3..5"}],"correction":{"steps":["Seul compte **l'ensemble** des copies choisies (pas d'ordre), et une copie n'est pas tirée deux fois : ce sont des parties à ${{k}}$ éléments.","Il y en a $\\textcolor{{{color:primary.0}}}{\\binom{ {{n}} }{ {{k}} }}$."]},"correctChoiceIndex":["0"]},{"choices":[{"content":"${{n}}^{ {{k}} }$"},{"content":"$\\dfrac{ {{n}}! }{ {{eval:n-k}}! }$"},{"content":"$\\binom{ {{n}} }{ {{k}} }$"},{"content":"${{k}}^{ {{n}} }$"}],"statement":"Chaque jour d'une période de ${{k}}$ jours, la cantine sert un dessert choisi parmi ${{n}}$ desserts ; le même dessert peut revenir plusieurs jours.\n\nQuel est le nombre de programmes de desserts possibles ?","variables":[{"name":"n","expression":"5..9"},{"name":"k","expression":"3..5"}],"correction":{"steps":["Un programme associe un dessert à chaque jour : l'ordre des jours compte et un dessert peut revenir, ce sont des ${{k}}$-uplets.","Il y en a $\\textcolor{{{color:primary.0}}}{{{n}}^{ {{k}} }}$ (et non ${{k}}^{ {{n}} }$)."]},"correctChoiceIndex":["0"],"conditions":["n > k"]}],"shared":null,"test_specs":[{"expected":{"status":"correct"},"variables":{"k":"5","n":"26"},"description":"v0 : nᵏ","variationIndex":0,"selectedChoices":[0]},{"expected":{"status":"incorrect"},"variables":{"k":"5","n":"26"},"description":"v0 : arrangement (répétition oubliée)","variationIndex":0,"selectedChoices":[1]},{"expected":{"status":"incorrect"},"variables":{"k":"5","n":"26"},"description":"v0 : kⁿ","variationIndex":0,"selectedChoices":[3]},{"expected":{"status":"correct"},"variables":{"k":"3","n":"12"},"description":"v1 : arrangement","variationIndex":1,"selectedChoices":[0]},{"expected":{"status":"incorrect"},"variables":{"k":"3","n":"12"},"description":"v1 : combinaison (ordre oublié)","variationIndex":1,"selectedChoices":[1]},{"expected":{"status":"incorrect"},"variables":{"k":"3","n":"12"},"description":"v1 : nᵏ (répétitions)","variationIndex":1,"selectedChoices":[2]},{"expected":{"status":"correct"},"variables":{"k":"4","n":"30"},"description":"v2 : combinaison","variationIndex":2,"selectedChoices":[0]},{"expected":{"status":"incorrect"},"variables":{"k":"4","n":"30"},"description":"v2 : arrangement (ordre à tort)","variationIndex":2,"selectedChoices":[1]},{"expected":{"status":"correct"},"variables":{"k":"5","n":"6"},"description":"v3 : nᵏ","variationIndex":3,"selectedChoices":[0]},{"expected":{"status":"incorrect"},"variables":{"k":"5","n":"6"},"description":"v3 : kⁿ","variationIndex":3,"selectedChoices":[3]},{"expected":{"status":"incorrect"},"variables":{"k":"5","n":"6"},"description":"v3 : arrangement (desserts distincts à tort)","variationIndex":3,"selectedChoices":[1]}]}$plrt2$::jsonb,
  null, null, null);

-- Tags des origines : ceux qu'elles portent déjà (relevé, exigés à l'identique et laissés) et ceux
-- que la migration pose.
drop table if exists pg_temp._plrt2_tags;
create temporary table _plrt2_tags (
	id uuid not null references _plrt2_modeles (id),
	tag_grade text not null, tag_code text not null,
	avant boolean not null
);
insert into _plrt2_tags values
  ('0d2edda7-1d90-46ee-b07d-792ebbd43849', '2', '2-261', true),
  ('e02fb162-ca4e-417c-ae37-e39a3798f16c', 'T_SPE', 'TSPE-470', true),
  ('f796ffc0-d9cc-496b-97a8-9e10f07e6fc8', 'T_SPE', 'TSPE-318', true);

-- Modèles neufs : chacun copie les autres colonnes de son origine, sauf le niveau (et le nœud
-- quand l'un de ses points vit sur une sous-notion voisine).
drop table if exists pg_temp._plrt2_neufs;
create temporary table _plrt2_neufs (
	id uuid primary key,
	origine uuid not null references _plrt2_modeles (id),
	niveau integer not null,
	contenu jsonb not null,
	-- Nœud propre (celui de son premier point) ; null : celui de l'origine.
	branche text, notion text, sous_notion text
);
drop table if exists pg_temp._plrt2_tags_neufs;
create temporary table _plrt2_tags_neufs (
	id uuid not null references _plrt2_neufs (id),
	rang integer not null,
	tag_grade text not null, tag_code text not null
);


-- ---- 2. Résolution STRICTE des nœuds et des points --------------------------------------
create temporary table _plrt2_resolus as
	select r.id, case when r.sous_notion is null then nn.id else s.id end as noeud,
	       r.branche_apres is not null as deplace,
	       case when r.branche_apres is null then case when r.sous_notion is null then nn.id else s.id end
	            when r.sous_notion_apres is null then na.id else sa.id end as noeud_apres,
	       case when r.sous_notion_apres is null then na.archived_at else sa.archived_at end as noeud_apres_archive
	  from _plrt2_modeles r
	  left join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.name = r.branche
	  left join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = r.notion
	  left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = nn.id and s.name = r.sous_notion
	  left join public.classification_nodes ba on ba.kind = 'branch' and ba.parent_id is null and ba.name = r.branche_apres
	  left join public.classification_nodes na on na.kind = 'notion' and na.parent_id = ba.id and na.name = r.notion_apres
	  left join public.classification_nodes sa on sa.kind = 'subnotion' and sa.parent_id = na.id and sa.name = r.sous_notion_apres;
create temporary table _plrt2_resolus_tags as
	select t.id, t.avant, p.id as point_id
	  from _plrt2_tags t
	  left join public.curriculum_points p on p.grade = t.tag_grade and p.code = t.tag_code and p.archived_at is null;
create temporary table _plrt2_resolus_neufs as
	select n.id, n.branche is not null as noeud_propre,
	       case when n.sous_notion is null then nn.id else s.id end as noeud,
	       case when n.sous_notion is null then nn.archived_at else s.archived_at end as noeud_archive
	  from _plrt2_neufs n
	  left join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.name = n.branche
	  left join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = n.notion
	  left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = nn.id and s.name = n.sous_notion;
create temporary table _plrt2_resolus_tags_neufs as
	select t.id, t.rang, p.id as point_id, p.node_id as noeud_du_point
	  from _plrt2_tags_neufs t
	  left join public.curriculum_points p on p.grade = t.tag_grade and p.code = t.tag_code and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from _plrt2_resolus where noeud is null or noeud_apres is null or (deplace and noeud_apres_archive is not null))
	   or exists (select 1 from _plrt2_resolus_tags where point_id is null) then
		raise exception 'nœuds ou points introuvables : %',
			(select count(*) from _plrt2_resolus where noeud is null or noeud_apres is null or (deplace and noeud_apres_archive is not null))
			+ (select count(*) from _plrt2_resolus_tags where point_id is null);
	end if;
	-- Nœud propre : actif, et celui du premier point du modèle neuf (la garde des tags n'accepte que
	-- lui ou sa notion ; un point déplacé depuis le relevé fait échouer ici, pas plus loin).
	if exists (select 1 from _plrt2_resolus_tags_neufs where point_id is null)
	   or exists (select 1 from _plrt2_resolus_neufs n
	               where n.noeud_propre
	                 and (n.noeud is null or n.noeud_archive is not null
	                      or n.noeud is distinct from (select t.noeud_du_point from _plrt2_resolus_tags_neufs t
	                                                    where t.id = n.id and t.rang = 0))) then
		raise exception 'points ou nœuds des modèles neufs introuvables : %',
			(select count(*) from _plrt2_resolus_tags_neufs where point_id is null)
			+ (select count(*) from _plrt2_resolus_neufs n
			    where n.noeud_propre
			      and (n.noeud is null or n.noeud_archive is not null
			           or n.noeud is distinct from (select t.noeud_du_point from _plrt2_resolus_tags_neufs t
			                                         where t.id = n.id and t.rang = 0)));
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, contenu, rangement et tags relevés ---------------
do $garde$
declare v_presents integer; v_contenus integer; v_ranges integer; v_tags integer; v_manquants integer; v_pris integer;
begin
	-- Verrou : aucune sauvegarde de l'éditeur ne peut s'intercaler entre la garde et la mise à jour.
	perform 1 from public.question_templates q join _plrt2_modeles r on r.id = q.id for update of q;
	select count(*) into v_presents from _plrt2_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 3) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 3', v_presents;
	end if;
	select count(*) into v_contenus from _plrt2_modeles r
	  join public.question_templates q on q.id = r.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs) is distinct from r.avant;
	if v_contenus <> 0 then
		raise exception 'modèles modifiés depuis le relevé : %', v_contenus;
	end if;
	select count(*) into v_ranges from _plrt2_modeles r
	  join _plrt2_resolus x on x.id = r.id
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is distinct from x.noeud or q.grades is distinct from r.grades
	    or q.status is distinct from r.statut;
	if v_ranges <> 0 then
		raise exception 'modèles déplacés ou reclassés depuis le relevé : %', v_ranges;
	end if;
	-- Aucun tag hors du relevé (une saisie faite depuis serait contredite), à tout niveau.
	select count(*) into v_manquants from _plrt2_resolus_tags a
	  join public.question_templates q on q.id = a.id
	 where a.avant and not exists (select 1 from public.question_template_points t
	                                where t.template_id = a.id and t.point_id = a.point_id);
	if v_manquants <> 0 then
		raise exception 'tags relevés absents : %', v_manquants;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _plrt2_modeles r on r.id = q.template_id
	 where not exists (select 1 from _plrt2_resolus_tags a
	                    where a.avant and a.id = q.template_id and a.point_id = q.point_id);
	if v_tags <> 0 then
		raise exception 'tags déjà posés sur ces modèles : %', v_tags;
	end if;
	select count(*) into v_pris from _plrt2_neufs n join public.question_templates q on q.id = n.id;
	if v_pris <> 0 then
		raise exception 'identifiants des modèles neufs déjà pris : %', v_pris;
	end if;
	-- Catégorie (thème, domaine, sous-domaine de l'origine, niveau propre) : unique parmi les
	-- modèles publiés (idx_question_templates_unique_category).
	select count(*) into v_pris from _plrt2_neufs n
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
  from _plrt2_modeles r
 where q.id = r.id;

-- R2 : les origines dont les points vivent ailleurs passent sur le nœud de leurs points, AVANT les
-- tags (le trigger des tags lit le nœud du modèle) ; elles n'ont aucun tag d'avant.
update public.question_templates q
   set classification_node_id = x.noeud_apres
  from _plrt2_resolus x
 where q.id = x.id and x.deplace;

insert into public.question_template_points (template_id, point_id)
select x.id, x.point_id
  from _plrt2_resolus_tags x
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
  from _plrt2_neufs n
  join _plrt2_resolus_neufs x on x.id = n.id
  join public.question_templates q on q.id = n.origine;

insert into public.question_template_points (template_id, point_id)
select x.id, x.point_id
  from _plrt2_resolus_tags_neufs x
  join public.question_templates q on q.id = x.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_ok integer; v_tags integer; v_tous integer; v_neufs integer; v_neufs_tags integer; v_neufs_tous integer;
begin
	select count(*) into v_presents from _plrt2_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_ok from _plrt2_modeles r
	  join _plrt2_resolus x on x.id = r.id
	  join public.question_templates q on q.id = r.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs) = r.apres and q.classification_node_id = x.noeud_apres;
	select count(*) into v_tags from _plrt2_resolus_tags x
	  join public.question_template_points q on q.template_id = x.id and q.point_id = x.point_id;
	select count(*) into v_tous from public.question_template_points q join _plrt2_modeles r on r.id = q.template_id;
	if v_ok <> v_presents or v_tags <> v_tous or v_tags <> least(v_presents, 1) * 3 then
		raise exception 'lot incohérent : contenus %/%, tags %/%', v_ok, v_presents, v_tags, v_tous;
	end if;
	select count(*) into v_neufs from _plrt2_neufs n
	  join _plrt2_resolus_neufs x on x.id = n.id
	  join public.question_templates q on q.id = n.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs) = n.contenu
	   and (not x.noeud_propre or q.classification_node_id = x.noeud);
	select count(*) into v_neufs_tags from _plrt2_resolus_tags_neufs x
	  join public.question_template_points q on q.template_id = x.id and q.point_id = x.point_id;
	select count(*) into v_neufs_tous from public.question_template_points q join _plrt2_neufs n on n.id = q.template_id;
	if v_neufs <> least(v_presents, 1) * 0 or v_neufs_tags <> least(v_presents, 1) * 0 or v_neufs_tous <> v_neufs_tags then
		raise exception 'modèles neufs incohérents : contenus %, tags %', v_neufs, v_neufs_tags;
	end if;
end $check$;

drop table pg_temp._plrt2_resolus_tags_neufs;
drop table pg_temp._plrt2_resolus_neufs;
drop table pg_temp._plrt2_resolus_tags;
drop table pg_temp._plrt2_resolus;
drop table pg_temp._plrt2_tags_neufs;
drop table pg_temp._plrt2_neufs;
drop table pg_temp._plrt2_tags;
drop table pg_temp._plrt2_modeles;
