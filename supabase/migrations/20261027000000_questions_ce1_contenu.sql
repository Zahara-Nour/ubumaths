-- ============================================================================
-- Chantier « questions-ce1 », lot 0 (corrections) : 3 modèles corrigés, aucun modèle neuf ni tag posé
-- ============================================================================
--   - c96ecf4d (Trouver la moitié, CE1-034) : moitié par décomposition, jusqu'à 698 (trois
--     variations : dizaines paires, dizaines impaires, trois chiffres) ;
--   - 9d709f5b (Utiliser la distributivité, CE1-035) : premier facteur de 11 à 19 (au lieu de 12) ;
--   - c73734a8 (Parité, CE1-025) : nombres de 0 à 999 (au lieu de 0 à 99).
-- Ni tag, ni nœud, ni niveau, ni statut ne changent ici : rangement, tags, niveaux et statut dans
-- la migration suivante (20261027000100_questions_ce1_rangement_tags).
-- ============================================================================
-- Phase 0 validée par David le 2026-10-26 (journal docs/wip/questions-ce1-progress.md § 5).
-- Fichier GÉNÉRÉ par docs/wip/questions/lot-corrections-ce1.py — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (3 modèles). Elle est prouvée
-- par tests/integration/questions-ce1-contenu.test.ts, qui fabrique des copies des identifiants de
-- la prod (contenu, nœud, niveaux et tags) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit avoir EXACTEMENT le contenu relevé en prod le 2026-10-26, être au nœud,
-- aux niveaux et au statut relevés, et porter exactement son tag relevé.
--
-- Données d'élèves : aucune (relevé du 2026-10-26 : 0 carte SRS, 0 tentative de compétence ou
-- d'évaluation, 0 réponse de test, 0 activité de journal, 0 exercice de chapitre, 0 favori).
--
-- Accès : personne ne gagne d'accès (question tranchée par David le 2026-10-26). Aucune règle ne
-- change ; effet visible : les 3 modèles sont publiés, leurs élèves tirent les nouvelles variations
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
-- 	perform 1 from public.question_templates where id in ('9d709f5b-e079-4316-a4c7-fe51ae73544c', 'c73734a8-aac1-4ce7-9aae-d568ce8752c5', 'c96ecf4d-caa9-4e5a-946f-c7ee0ecc352e') for update;
-- 	select count(*) into v_intacts from public.question_templates q join (values
-- 		('9d709f5b-e079-4316-a4c7-fe51ae73544c'::uuid, '58ee628d200ff0fe42ec1de8932d1d06'),
-- 		('c73734a8-aac1-4ce7-9aae-d568ce8752c5'::uuid, '15d4845f3f45588e16f69f59041ef3e4'),
-- 		('c96ecf4d-caa9-4e5a-946f-c7ee0ecc352e'::uuid, '8a58a4aa47574a342d29f2b92158a808')
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
--   ('9d709f5b-e079-4316-a4c7-fe51ae73544c'::uuid, $qce1${"title":"Utiliser la distributivité","description":"Multiplication d'un nombre à $1$ chiffre par $12$","variations":[{"blanks":[{"expectedAnswer":"{{eval:{{expression1}}}}"}],"statement":"Calcule.\n\n$${{expression1}}$$","variables":[{"name":"a","expression":"2..9"},{"name":"expression1","expression":"12*a"}],"correction":{"steps":["$$\\begin{align} 12 \\times \\bold{\\textcolor{{{color:primary.0}}}{{{a}}}}  \t\t\t\t\t\t\t\t&= 10 \\times \\bold{\\textcolor{{{color:primary.0}}}{{{a}}}} + 2 \\times \\bold{\\textcolor{{{color:primary.0}}}{{{a}}}} \\\\ \t\t\t\t\t\t\t\t&= {{eval:10*a}} + {{eval:2*a}} \\\\ \t\t\t\t\t\t\t\t&= {{solution}} \\end{align}$$"]}}],"shared":null,"test_specs":[{"answers":["84"],"expected":{"status":"correct"},"variables":{"a":"7"},"description":"12 × 7 = 84","variationIndex":0},{"answers":["108"],"expected":{"status":"correct"},"variables":{"a":"9"},"description":"Borne : 12 × 9 = 108","variationIndex":0},{"answers":["77"],"expected":{"status":"incorrect"},"variables":{"a":"7"},"description":"Erreur de signe dans la distributivité : 77","variationIndex":0}]}$qce1$::jsonb),
--   ('c73734a8-aac1-4ce7-9aae-d568ce8752c5'::uuid, $qce1${"title":"Parité d'un nombre entier","description":null,"variations":[{"statement":"","variables":[{"name":"expression","expression":"eval:2*a"}],"correction":{"steps":["{{expression}} est {{solution}} car il se termine par 0, 2, 4, 6, ou 8."]},"correctChoiceIndex":["0"]},{"statement":"","variables":[{"name":"expression","expression":"eval:2*a+1"}],"correction":{"steps":["{{expression}} est {{solution}} car il se termine par 1, 3, 5, 7, ou 9."]},"correctChoiceIndex":["1"]}],"shared":{"choices":[{"content":"pair"},{"content":"impair"}],"statement":"Quelle est la parité de ce nombre ?\n\n$${{expression}}$$","variables":[{"name":"a","expression":"0..49"}]},"test_specs":[{"expected":{"status":"correct"},"variables":{"a":"23"},"description":"46 est pair","variationIndex":0,"selectedChoices":[0]},{"expected":{"status":"incorrect"},"variables":{"a":"23"},"description":"46 déclaré impair","variationIndex":0,"selectedChoices":[1]},{"expected":{"status":"correct"},"variables":{"a":"0"},"description":"0 est pair (borne)","variationIndex":0,"selectedChoices":[0]},{"expected":{"status":"correct"},"variables":{"a":"23"},"description":"47 est impair","variationIndex":1,"selectedChoices":[1]},{"expected":{"status":"incorrect"},"variables":{"a":"23"},"description":"47 déclaré pair","variationIndex":1,"selectedChoices":[0]},{"expected":{"status":"correct"},"variables":{"a":"49"},"description":"99 est impair (borne haute)","variationIndex":1,"selectedChoices":[1]}]}$qce1$::jsonb),
--   ('c96ecf4d-caa9-4e5a-946f-c7ee0ecc352e'::uuid, $qce1${"title":"Trouver la moitié","description":"Nombres pairs de $1$ à $30$, $40$, $50$ et $100$","variations":[{"blanks":[{"expectedAnswer":"{{eval:a}}"}],"statement":"Quelle est la moitié de ${{b}}$ ?\n\nLa moitié de ${{b}}$ est $?$.","variables":[{"name":"a","expression":"1..9|11..15|20|25|50"},{"name":"b","expression":"eval:2*a"}],"correction":{"steps":["La moitié de ${{eval:2*a}}$ est {{solution:html}} car ${{a}} + {{a}}={{eval:2*a}}$"]}}],"shared":null,"test_specs":[{"answers":["12"],"expected":{"status":"correct"},"variables":{"a":"12","b":"24"},"description":"moitié de 24 → 12","variationIndex":0},{"answers":["50"],"expected":{"status":"correct"},"variables":{"a":"50","b":"100"},"description":"moitié de 100 → 50","variationIndex":0},{"answers":["20"],"expected":{"status":"incorrect"},"variables":{"a":"25","b":"50"},"description":"moitié de 50 : 20 refusé","variationIndex":0}]}$qce1$::jsonb)
--   ) as r(id, c)
--  where q.id = r.id;
-- ROLLBACK:END
-- ============================================================================

set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires -----------------------------------------------------
drop table if exists pg_temp._qce1_modeles;
create temporary table _qce1_modeles (
	id uuid primary key,
	branche text not null, notion text not null, sous_notion text,
	grades text[] not null,
	-- Statut relevé : les neufs en héritent (un brouillon publié depuis publierait ses neufs).
	statut text not null,
	avant jsonb not null, apres jsonb not null,
	-- Nœud d'arrivée (R2 : les points du modèle vivent ailleurs) ; null : il ne bouge pas.
	branche_apres text, notion_apres text, sous_notion_apres text
);
insert into _qce1_modeles values ('9d709f5b-e079-4316-a4c7-fe51ae73544c', $qce1$Nombres et calculs$qce1$, $qce1$Entiers : multiplication$qce1$, $qce1$distributivité$qce1$, array['CE1'], 'published',
  $qce1${"title":"Utiliser la distributivité","description":"Multiplication d'un nombre à $1$ chiffre par $12$","variations":[{"blanks":[{"expectedAnswer":"{{eval:{{expression1}}}}"}],"statement":"Calcule.\n\n$${{expression1}}$$","variables":[{"name":"a","expression":"2..9"},{"name":"expression1","expression":"12*a"}],"correction":{"steps":["$$\\begin{align} 12 \\times \\bold{\\textcolor{{{color:primary.0}}}{{{a}}}}  \t\t\t\t\t\t\t\t&= 10 \\times \\bold{\\textcolor{{{color:primary.0}}}{{{a}}}} + 2 \\times \\bold{\\textcolor{{{color:primary.0}}}{{{a}}}} \\\\ \t\t\t\t\t\t\t\t&= {{eval:10*a}} + {{eval:2*a}} \\\\ \t\t\t\t\t\t\t\t&= {{solution}} \\end{align}$$"]}}],"shared":null,"test_specs":[{"answers":["84"],"expected":{"status":"correct"},"variables":{"a":"7"},"description":"12 × 7 = 84","variationIndex":0},{"answers":["108"],"expected":{"status":"correct"},"variables":{"a":"9"},"description":"Borne : 12 × 9 = 108","variationIndex":0},{"answers":["77"],"expected":{"status":"incorrect"},"variables":{"a":"7"},"description":"Erreur de signe dans la distributivité : 77","variationIndex":0}]}$qce1$::jsonb,
  $qce1${"title":"Utiliser la distributivité","description":"Multiplication d'un nombre de $11$ à $19$ par un nombre à $1$ chiffre","variations":[{"blanks":[{"expectedAnswer":"{{eval:{{expression1}}}}"}],"statement":"Calcule.\n\n$${{expression1}}$$","variables":[{"name":"u","expression":"1..9"},{"name":"n","expression":"eval:10+u"},{"name":"a","expression":"2..9"},{"name":"expression1","expression":"n*a"}],"correction":{"steps":["$$\\begin{align} {{n}} \\times \\bold{\\textcolor{{{color:primary.0}}}{{{a}}}} &= 10 \\times \\bold{\\textcolor{{{color:primary.0}}}{{{a}}}} + {{u}} \\times \\bold{\\textcolor{{{color:primary.0}}}{{{a}}}} \\\\ &= {{eval:10*a}} + {{eval:u*a}} \\\\ &= {{solution}} \\end{align}$$"]}}],"shared":null,"test_specs":[{"answers":["91"],"expected":{"status":"correct"},"variables":{"u":"3","n":"13","a":"7"},"description":"13 × 7 = 91","variationIndex":0},{"answers":["84"],"expected":{"status":"correct"},"variables":{"u":"2","n":"12","a":"7"},"description":"12 × 7 = 84","variationIndex":0},{"answers":["22"],"expected":{"status":"correct"},"variables":{"u":"1","n":"11","a":"2"},"description":"borne : 11 × 2 = 22","variationIndex":0},{"answers":["171"],"expected":{"status":"correct"},"variables":{"u":"9","n":"19","a":"9"},"description":"borne : 19 × 9 = 171","variationIndex":0},{"answers":["73"],"expected":{"status":"incorrect"},"variables":{"u":"3","n":"13","a":"7"},"description":"Erreur : unités non multipliées (70 + 3)","variationIndex":0}]}$qce1$::jsonb,
  null, null, null);
insert into _qce1_modeles values ('c73734a8-aac1-4ce7-9aae-d568ce8752c5', $qce1$Arithmétique$qce1$, $qce1$Divisibilité$qce1$, $qce1$pair ou impair$qce1$, array['CE1'], 'published',
  $qce1${"title":"Parité d'un nombre entier","description":null,"variations":[{"statement":"","variables":[{"name":"expression","expression":"eval:2*a"}],"correction":{"steps":["{{expression}} est {{solution}} car il se termine par 0, 2, 4, 6, ou 8."]},"correctChoiceIndex":["0"]},{"statement":"","variables":[{"name":"expression","expression":"eval:2*a+1"}],"correction":{"steps":["{{expression}} est {{solution}} car il se termine par 1, 3, 5, 7, ou 9."]},"correctChoiceIndex":["1"]}],"shared":{"choices":[{"content":"pair"},{"content":"impair"}],"statement":"Quelle est la parité de ce nombre ?\n\n$${{expression}}$$","variables":[{"name":"a","expression":"0..49"}]},"test_specs":[{"expected":{"status":"correct"},"variables":{"a":"23"},"description":"46 est pair","variationIndex":0,"selectedChoices":[0]},{"expected":{"status":"incorrect"},"variables":{"a":"23"},"description":"46 déclaré impair","variationIndex":0,"selectedChoices":[1]},{"expected":{"status":"correct"},"variables":{"a":"0"},"description":"0 est pair (borne)","variationIndex":0,"selectedChoices":[0]},{"expected":{"status":"correct"},"variables":{"a":"23"},"description":"47 est impair","variationIndex":1,"selectedChoices":[1]},{"expected":{"status":"incorrect"},"variables":{"a":"23"},"description":"47 déclaré pair","variationIndex":1,"selectedChoices":[0]},{"expected":{"status":"correct"},"variables":{"a":"49"},"description":"99 est impair (borne haute)","variationIndex":1,"selectedChoices":[1]}]}$qce1$::jsonb,
  $qce1${"title":"Parité d'un nombre entier","description":null,"variations":[{"statement":"","variables":[{"name":"expression","expression":"eval:2*a"}],"correction":{"steps":["{{expression}} est {{solution}} car il se termine par 0, 2, 4, 6, ou 8."]},"correctChoiceIndex":["0"]},{"statement":"","variables":[{"name":"expression","expression":"eval:2*a+1"}],"correction":{"steps":["{{expression}} est {{solution}} car il se termine par 1, 3, 5, 7, ou 9."]},"correctChoiceIndex":["1"]}],"shared":{"choices":[{"content":"pair"},{"content":"impair"}],"statement":"Quelle est la parité de ce nombre ?\n\n$${{expression}}$$","variables":[{"name":"a","expression":"0..499"}]},"test_specs":[{"expected":{"status":"correct"},"variables":{"a":"23"},"description":"46 est pair","variationIndex":0,"selectedChoices":[0]},{"expected":{"status":"incorrect"},"variables":{"a":"23"},"description":"46 déclaré impair","variationIndex":0,"selectedChoices":[1]},{"expected":{"status":"correct"},"variables":{"a":"0"},"description":"0 est pair (borne)","variationIndex":0,"selectedChoices":[0]},{"expected":{"status":"correct"},"variables":{"a":"179"},"description":"358 est pair","variationIndex":0,"selectedChoices":[0]},{"expected":{"status":"correct"},"variables":{"a":"499"},"description":"998 est pair (borne haute)","variationIndex":0,"selectedChoices":[0]},{"expected":{"status":"correct"},"variables":{"a":"23"},"description":"47 est impair","variationIndex":1,"selectedChoices":[1]},{"expected":{"status":"incorrect"},"variables":{"a":"23"},"description":"47 déclaré pair","variationIndex":1,"selectedChoices":[0]},{"expected":{"status":"correct"},"variables":{"a":"360"},"description":"721 est impair","variationIndex":1,"selectedChoices":[1]},{"expected":{"status":"incorrect"},"variables":{"a":"360"},"description":"721 déclaré pair","variationIndex":1,"selectedChoices":[0]},{"expected":{"status":"correct"},"variables":{"a":"499"},"description":"999 est impair (borne haute)","variationIndex":1,"selectedChoices":[1]}]}$qce1$::jsonb,
  null, null, null);
insert into _qce1_modeles values ('c96ecf4d-caa9-4e5a-946f-c7ee0ecc352e', $qce1$Nombres et calculs$qce1$, $qce1$Entiers : addition et soustraction$qce1$, $qce1$double et moitié$qce1$, array['CE1'], 'published',
  $qce1${"title":"Trouver la moitié","description":"Nombres pairs de $1$ à $30$, $40$, $50$ et $100$","variations":[{"blanks":[{"expectedAnswer":"{{eval:a}}"}],"statement":"Quelle est la moitié de ${{b}}$ ?\n\nLa moitié de ${{b}}$ est $?$.","variables":[{"name":"a","expression":"1..9|11..15|20|25|50"},{"name":"b","expression":"eval:2*a"}],"correction":{"steps":["La moitié de ${{eval:2*a}}$ est {{solution:html}} car ${{a}} + {{a}}={{eval:2*a}}$"]}}],"shared":null,"test_specs":[{"answers":["12"],"expected":{"status":"correct"},"variables":{"a":"12","b":"24"},"description":"moitié de 24 → 12","variationIndex":0},{"answers":["50"],"expected":{"status":"correct"},"variables":{"a":"50","b":"100"},"description":"moitié de 100 → 50","variationIndex":0},{"answers":["20"],"expected":{"status":"incorrect"},"variables":{"a":"25","b":"50"},"description":"moitié de 50 : 20 refusé","variationIndex":0}]}$qce1$::jsonb,
  $qce1${"title":"Trouver la moitié","description":"Nombres pairs jusqu'à $700$, par décomposition","variations":[{"blanks":[{"expectedAnswer":"{{eval:n/2}}"}],"statement":"Quelle est la moitié de ${{n}}$ ?\n\nLa moitié de ${{n}}$ est $?$.","variables":[{"name":"k","expression":"1..4"},{"name":"j","expression":"1..4"},{"name":"g","expression":"eval:20*k"},{"name":"p","expression":"eval:2*j"},{"name":"n","expression":"eval:g+p"}],"correction":{"steps":["${{n}} = {{g}} + {{p}}$","La moitié de ${{g}}$ est ${{eval:g/2}}$ ; la moitié de ${{p}}$ est ${{eval:p/2}}$.","${{eval:g/2}} + {{eval:p/2}} = {{eval:n/2}}$, donc la moitié de ${{n}}$ est {{solution:html}}."]}},{"blanks":[{"expectedAnswer":"{{eval:n/2}}"}],"statement":"Quelle est la moitié de ${{n}}$ ?\n\nLa moitié de ${{n}}$ est $?$.","variables":[{"name":"k","expression":"0..4"},{"name":"j","expression":"1..4"},{"name":"g","expression":"eval:20*k+10"},{"name":"p","expression":"eval:2*j"},{"name":"n","expression":"eval:g+p"}],"correction":{"steps":["${{n}} = {{g}} + {{p}}$","La moitié de ${{g}}$ est ${{eval:g/2}}$ ; la moitié de ${{p}}$ est ${{eval:p/2}}$.","${{eval:g/2}} + {{eval:p/2}} = {{eval:n/2}}$, donc la moitié de ${{n}}$ est {{solution:html}}."]}},{"blanks":[{"expectedAnswer":"{{eval:n/2}}"}],"statement":"Quelle est la moitié de ${{n}}$ ?\n\nLa moitié de ${{n}}$ est $?$.","variables":[{"name":"c","expression":"2..6"},{"name":"d","expression":"1..9"},{"name":"j","expression":"0..4"},{"name":"g","expression":"eval:100*c"},{"name":"p","expression":"eval:10*d+2*j"},{"name":"n","expression":"eval:g+p"}],"correction":{"steps":["${{n}} = {{g}} + {{p}}$","La moitié de ${{g}}$ est ${{eval:g/2}}$ ; la moitié de ${{p}}$ est ${{eval:p/2}}$.","${{eval:g/2}} + {{eval:p/2}} = {{eval:n/2}}$, donc la moitié de ${{n}}$ est {{solution:html}}."]}}],"shared":null,"test_specs":[{"answers":["23"],"expected":{"status":"correct"},"variables":{"k":"2","j":"3","g":"40","p":"6","n":"46"},"description":"moitié de 46 → 23","variationIndex":0},{"answers":["11"],"expected":{"status":"correct"},"variables":{"k":"1","j":"1","g":"20","p":"2","n":"22"},"description":"borne : moitié de 22 → 11","variationIndex":0},{"answers":["44"],"expected":{"status":"correct"},"variables":{"k":"4","j":"4","g":"80","p":"8","n":"88"},"description":"borne : moitié de 88 → 44","variationIndex":0},{"answers":["92"],"expected":{"status":"incorrect"},"variables":{"k":"2","j":"3","g":"40","p":"6","n":"46"},"description":"Erreur : le double au lieu de la moitié","variationIndex":0},{"answers":["37"],"expected":{"status":"correct"},"variables":{"k":"3","j":"2","g":"70","p":"4","n":"74"},"description":"moitié de 74 → 37","variationIndex":1},{"answers":["26"],"expected":{"status":"correct"},"variables":{"k":"2","j":"1","g":"50","p":"2","n":"52"},"description":"moitié de 52 → 26","variationIndex":1},{"answers":["6"],"expected":{"status":"correct"},"variables":{"k":"0","j":"1","g":"10","p":"2","n":"12"},"description":"borne : moitié de 12 → 6","variationIndex":1},{"answers":["49"],"expected":{"status":"correct"},"variables":{"k":"4","j":"4","g":"90","p":"8","n":"98"},"description":"borne : moitié de 98 → 49","variationIndex":1},{"answers":["32"],"expected":{"status":"incorrect"},"variables":{"k":"3","j":"2","g":"70","p":"4","n":"74"},"description":"Erreur : moitié chiffre par chiffre (74 → 32)","variationIndex":1},{"answers":["148"],"expected":{"status":"incorrect"},"variables":{"k":"3","j":"2","g":"70","p":"4","n":"74"},"description":"Erreur : le double au lieu de la moitié","variationIndex":1},{"answers":["235"],"expected":{"status":"correct"},"variables":{"c":"4","d":"7","j":"0","g":"400","p":"70","n":"470"},"description":"moitié de 470 → 235","variationIndex":2},{"answers":["324"],"expected":{"status":"correct"},"variables":{"c":"6","d":"4","j":"4","g":"600","p":"48","n":"648"},"description":"moitié de 648 → 324","variationIndex":2},{"answers":["105"],"expected":{"status":"correct"},"variables":{"c":"2","d":"1","j":"0","g":"200","p":"10","n":"210"},"description":"borne : moitié de 210 → 105","variationIndex":2},{"answers":["349"],"expected":{"status":"correct"},"variables":{"c":"6","d":"9","j":"4","g":"600","p":"98","n":"698"},"description":"borne : moitié de 698 → 349","variationIndex":2},{"answers":["230"],"expected":{"status":"incorrect"},"variables":{"c":"4","d":"7","j":"0","g":"400","p":"70","n":"470"},"description":"Erreur : moitié chiffre par chiffre (470 → 230)","variationIndex":2}]}$qce1$::jsonb,
  null, null, null);

-- Tags des origines : ceux qu'elles portent déjà (relevé, exigés à l'identique et laissés) et ceux
-- que la migration pose.
drop table if exists pg_temp._qce1_tags;
create temporary table _qce1_tags (
	id uuid not null references _qce1_modeles (id),
	tag_grade text not null, tag_code text not null,
	avant boolean not null
);
insert into _qce1_tags values
  ('9d709f5b-e079-4316-a4c7-fe51ae73544c', 'CE1', 'CE1-035', true),
  ('c73734a8-aac1-4ce7-9aae-d568ce8752c5', 'CE1', 'CE1-025', true),
  ('c96ecf4d-caa9-4e5a-946f-c7ee0ecc352e', 'CE1', 'CE1-034', true);

-- Modèles neufs : chacun copie les autres colonnes de son origine, sauf le niveau (et le nœud
-- quand l'un de ses points vit sur une sous-notion voisine).
drop table if exists pg_temp._qce1_neufs;
create temporary table _qce1_neufs (
	id uuid primary key,
	origine uuid not null references _qce1_modeles (id),
	niveau integer not null,
	contenu jsonb not null,
	-- Nœud propre (celui de son premier point) ; null : celui de l'origine.
	branche text, notion text, sous_notion text
);
drop table if exists pg_temp._qce1_tags_neufs;
create temporary table _qce1_tags_neufs (
	id uuid not null references _qce1_neufs (id),
	rang integer not null,
	tag_grade text not null, tag_code text not null
);


-- ---- 2. Résolution STRICTE des nœuds et des points --------------------------------------
create temporary table _qce1_resolus as
	select r.id, case when r.sous_notion is null then nn.id else s.id end as noeud,
	       r.branche_apres is not null as deplace,
	       case when r.branche_apres is null then case when r.sous_notion is null then nn.id else s.id end
	            when r.sous_notion_apres is null then na.id else sa.id end as noeud_apres,
	       case when r.sous_notion_apres is null then na.archived_at else sa.archived_at end as noeud_apres_archive
	  from _qce1_modeles r
	  left join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.name = r.branche
	  left join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = r.notion
	  left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = nn.id and s.name = r.sous_notion
	  left join public.classification_nodes ba on ba.kind = 'branch' and ba.parent_id is null and ba.name = r.branche_apres
	  left join public.classification_nodes na on na.kind = 'notion' and na.parent_id = ba.id and na.name = r.notion_apres
	  left join public.classification_nodes sa on sa.kind = 'subnotion' and sa.parent_id = na.id and sa.name = r.sous_notion_apres;
create temporary table _qce1_resolus_tags as
	select t.id, t.avant, p.id as point_id
	  from _qce1_tags t
	  left join public.curriculum_points p on p.grade = t.tag_grade and p.code = t.tag_code and p.archived_at is null;
create temporary table _qce1_resolus_neufs as
	select n.id, n.branche is not null as noeud_propre,
	       case when n.sous_notion is null then nn.id else s.id end as noeud,
	       case when n.sous_notion is null then nn.archived_at else s.archived_at end as noeud_archive
	  from _qce1_neufs n
	  left join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.name = n.branche
	  left join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = n.notion
	  left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = nn.id and s.name = n.sous_notion;
create temporary table _qce1_resolus_tags_neufs as
	select t.id, t.rang, p.id as point_id, p.node_id as noeud_du_point
	  from _qce1_tags_neufs t
	  left join public.curriculum_points p on p.grade = t.tag_grade and p.code = t.tag_code and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from _qce1_resolus where noeud is null or noeud_apres is null or (deplace and noeud_apres_archive is not null))
	   or exists (select 1 from _qce1_resolus_tags where point_id is null) then
		raise exception 'nœuds ou points introuvables : %',
			(select count(*) from _qce1_resolus where noeud is null or noeud_apres is null or (deplace and noeud_apres_archive is not null))
			+ (select count(*) from _qce1_resolus_tags where point_id is null);
	end if;
	-- Nœud propre : actif, et celui du premier point du modèle neuf (la garde des tags n'accepte que
	-- lui ou sa notion ; un point déplacé depuis le relevé fait échouer ici, pas plus loin).
	if exists (select 1 from _qce1_resolus_tags_neufs where point_id is null)
	   or exists (select 1 from _qce1_resolus_neufs n
	               where n.noeud_propre
	                 and (n.noeud is null or n.noeud_archive is not null
	                      or n.noeud is distinct from (select t.noeud_du_point from _qce1_resolus_tags_neufs t
	                                                    where t.id = n.id and t.rang = 0))) then
		raise exception 'points ou nœuds des modèles neufs introuvables : %',
			(select count(*) from _qce1_resolus_tags_neufs where point_id is null)
			+ (select count(*) from _qce1_resolus_neufs n
			    where n.noeud_propre
			      and (n.noeud is null or n.noeud_archive is not null
			           or n.noeud is distinct from (select t.noeud_du_point from _qce1_resolus_tags_neufs t
			                                         where t.id = n.id and t.rang = 0)));
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, contenu, rangement et tags relevés ---------------
do $garde$
declare v_presents integer; v_contenus integer; v_ranges integer; v_tags integer; v_manquants integer; v_pris integer;
begin
	-- Verrou : aucune sauvegarde de l'éditeur ne peut s'intercaler entre la garde et la mise à jour.
	perform 1 from public.question_templates q join _qce1_modeles r on r.id = q.id for update of q;
	select count(*) into v_presents from _qce1_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 3) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 3', v_presents;
	end if;
	select count(*) into v_contenus from _qce1_modeles r
	  join public.question_templates q on q.id = r.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs) is distinct from r.avant;
	if v_contenus <> 0 then
		raise exception 'modèles modifiés depuis le relevé : %', v_contenus;
	end if;
	select count(*) into v_ranges from _qce1_modeles r
	  join _qce1_resolus x on x.id = r.id
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is distinct from x.noeud or q.grades is distinct from r.grades
	    or q.status is distinct from r.statut;
	if v_ranges <> 0 then
		raise exception 'modèles déplacés ou reclassés depuis le relevé : %', v_ranges;
	end if;
	-- Aucun tag hors du relevé (une saisie faite depuis serait contredite), à tout niveau.
	select count(*) into v_manquants from _qce1_resolus_tags a
	  join public.question_templates q on q.id = a.id
	 where a.avant and not exists (select 1 from public.question_template_points t
	                                where t.template_id = a.id and t.point_id = a.point_id);
	if v_manquants <> 0 then
		raise exception 'tags relevés absents : %', v_manquants;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qce1_modeles r on r.id = q.template_id
	 where not exists (select 1 from _qce1_resolus_tags a
	                    where a.avant and a.id = q.template_id and a.point_id = q.point_id);
	if v_tags <> 0 then
		raise exception 'tags déjà posés sur ces modèles : %', v_tags;
	end if;
	select count(*) into v_pris from _qce1_neufs n join public.question_templates q on q.id = n.id;
	if v_pris <> 0 then
		raise exception 'identifiants des modèles neufs déjà pris : %', v_pris;
	end if;
	-- Catégorie (thème, domaine, sous-domaine de l'origine, niveau propre) : unique parmi les
	-- modèles publiés (idx_question_templates_unique_category).
	select count(*) into v_pris from _qce1_neufs n
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
  from _qce1_modeles r
 where q.id = r.id;

-- R2 : les origines dont les points vivent ailleurs passent sur le nœud de leurs points, AVANT les
-- tags (le trigger des tags lit le nœud du modèle) ; elles n'ont aucun tag d'avant.
update public.question_templates q
   set classification_node_id = x.noeud_apres
  from _qce1_resolus x
 where q.id = x.id and x.deplace;

insert into public.question_template_points (template_id, point_id)
select x.id, x.point_id
  from _qce1_resolus_tags x
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
  from _qce1_neufs n
  join _qce1_resolus_neufs x on x.id = n.id
  join public.question_templates q on q.id = n.origine;

insert into public.question_template_points (template_id, point_id)
select x.id, x.point_id
  from _qce1_resolus_tags_neufs x
  join public.question_templates q on q.id = x.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_ok integer; v_tags integer; v_tous integer; v_neufs integer; v_neufs_tags integer; v_neufs_tous integer;
begin
	select count(*) into v_presents from _qce1_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_ok from _qce1_modeles r
	  join _qce1_resolus x on x.id = r.id
	  join public.question_templates q on q.id = r.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs) = r.apres and q.classification_node_id = x.noeud_apres;
	select count(*) into v_tags from _qce1_resolus_tags x
	  join public.question_template_points q on q.template_id = x.id and q.point_id = x.point_id;
	select count(*) into v_tous from public.question_template_points q join _qce1_modeles r on r.id = q.template_id;
	if v_ok <> v_presents or v_tags <> v_tous or v_tags <> least(v_presents, 1) * 3 then
		raise exception 'lot incohérent : contenus %/%, tags %/%', v_ok, v_presents, v_tags, v_tous;
	end if;
	select count(*) into v_neufs from _qce1_neufs n
	  join _qce1_resolus_neufs x on x.id = n.id
	  join public.question_templates q on q.id = n.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs) = n.contenu
	   and (not x.noeud_propre or q.classification_node_id = x.noeud);
	select count(*) into v_neufs_tags from _qce1_resolus_tags_neufs x
	  join public.question_template_points q on q.template_id = x.id and q.point_id = x.point_id;
	select count(*) into v_neufs_tous from public.question_template_points q join _qce1_neufs n on n.id = q.template_id;
	if v_neufs <> least(v_presents, 1) * 0 or v_neufs_tags <> least(v_presents, 1) * 0 or v_neufs_tous <> v_neufs_tags then
		raise exception 'modèles neufs incohérents : contenus %, tags %', v_neufs, v_neufs_tags;
	end if;
end $check$;

drop table pg_temp._qce1_resolus_tags_neufs;
drop table pg_temp._qce1_resolus_neufs;
drop table pg_temp._qce1_resolus_tags;
drop table pg_temp._qce1_resolus;
drop table pg_temp._qce1_tags_neufs;
drop table pg_temp._qce1_neufs;
drop table pg_temp._qce1_tags;
drop table pg_temp._qce1_modeles;
