-- ============================================================================
-- Chantier « questions-6 », lot 4 « Fractions » : contenu d'1 modèle du lot 3, aucun neuf ni tag posé
-- ============================================================================
--   - e3d87166 (Multiplier par 0,1, c'est diviser par 10) : dans la correction de la v1, la couleur
--     hors formule (`\textcolor` affiché brut) devient du gras.
-- Ni tag, ni nœud, ni niveau, ni statut ne changent ici : le rangement du lot 4 est dans la
-- migration suivante (20261028140100_questions_6_fractions_rangement_tags).
-- ============================================================================
-- Décision de David le 2026-10-28 (journal docs/wip/questions-6-progress.md § 11.1). Fichier GÉNÉRÉ
-- par docs/wip/questions-6/lot-contenu-6-fractions.py — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (1 modèle). Elle est prouvée
-- par tests/integration/questions-6-fractions-contenu.test.ts, qui fabrique des copies des
-- identifiants de la prod (contenu, nœud, niveaux et tags) puis rejoue CE fichier.
--
-- Garde : le modèle doit avoir EXACTEMENT le contenu relevé en prod le 2026-10-28, être au nœud,
-- aux niveaux et au statut relevés, et porter exactement son tag relevé (6-116).
--
-- Données d'élèves : non touchées (seul le texte d'une correction change).
--
-- Accès : personne ne gagne d'accès (aucune règle ne change) ; effet visible : les élèves de 6e
-- lisent « diviser par 10 » en gras au lieu du code brut.
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
-- 	perform 1 from public.question_templates where id in ('e3d87166-f0cb-4a9a-ab24-6377e612cfeb') for update;
-- 	select count(*) into v_intacts from public.question_templates q join (values
-- 		('e3d87166-f0cb-4a9a-ab24-6377e612cfeb'::uuid, 'cbc307d93eef36daf644cce63207706f')
-- 	) as r(id, h) on r.id = q.id
-- 	 where md5(jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs)::text) = r.h;
-- 	if v_intacts <> 1 then
-- 		raise exception 'rollback : % modèle(s) sur 1 portent encore le contenu de la migration', v_intacts;
-- 	end if;
-- end $retour$;
-- update public.question_templates q
--    set title = r.c->>'title', description = r.c->>'description', variations = r.c->'variations',
--        shared = nullif(r.c->'shared', 'null'::jsonb), test_specs = nullif(r.c->'test_specs', 'null'::jsonb)
--   from (values
--   ('e3d87166-f0cb-4a9a-ab24-6377e612cfeb'::uuid, $q6fc${"title":"Multiplier par 0,1, c'est diviser par 10","description":"Lien entre × 0,1 / × 0,01 / × 0,001 et ÷ 10 / ÷ 100 / ÷ 1 000 : case choix, égalités à compléter, calcul par la division","variations":[{"blanks":[{"expectedAnswer":"{{eval:k-1}}"}],"statement":"Multiplier un nombre par ${{if:k==1|0.1|{{if:k==2|0.01|0.001}}}}$, c'est :\n\n```choix\n- le diviser par $10$\n- le diviser par $100$\n- le diviser par $1~000$\n- le multiplier par $10$\n- le multiplier par $100$\n```","variables":[{"name":"k","expression":"1..3"}],"correction":{"steps":["**Le lien.** $0.1$, c'est un dixième : multiplier par $0.1$, c'est prendre le dixième, donc diviser par $10$. De même, $\\times 0.01$ revient à $\\div 100$, et $\\times 0.001$ à $\\div 1~000$.","Multiplier par ${{if:k==1|0.1|{{if:k==2|0.01|0.001}}}}$, c'est \\textcolor{{{color:primary.0}}}{diviser par ${{if:k==1|10|{{if:k==2|100|1~000}}}}$} : chaque chiffre recule de ${{k}}$ rang{{if:k>1|s|}} vers la droite."]}},{"blanks":[{"expectedAnswer":"{{eval:10^k}}"}],"statement":"Complète.\n\n$${{n}} \\times {{if:k==1|0.1|{{if:k==2|0.01|0.001}}}} = {{n}} \\div ?$$","variables":[{"name":"k","expression":"1..3"},{"name":"N","expression":"11..999"},{"name":"n","expression":"eval:N/10;d"}],"correction":{"steps":["**Le lien.** $0.1$, c'est un dixième : multiplier par $0.1$, c'est prendre le dixième, donc diviser par $10$. De même, $\\times 0.01$ revient à $\\div 100$, et $\\times 0.001$ à $\\div 1~000$.","$$\\times {{if:k==1|0.1|{{if:k==2|0.01|0.001}}}} \\quad \\text{revient à} \\quad \\div \\textcolor{{{color:primary.0}}}{{{solution}}}$$"]}},{"blanks":[{"expectedAnswer":"{{eval:10^(-k);d}}"}],"statement":"Complète.\n\n$${{n}} \\div {{if:k==1|10|{{if:k==2|100|1~000}}}} = {{n}} \\times ?$$","variables":[{"name":"k","expression":"1..3"},{"name":"N","expression":"11..999"},{"name":"n","expression":"eval:N/10;d"}],"correction":{"steps":["**Le lien.** $0.1$, c'est un dixième : multiplier par $0.1$, c'est prendre le dixième, donc diviser par $10$. De même, $\\times 0.01$ revient à $\\div 100$, et $\\times 0.001$ à $\\div 1~000$.","$$\\div {{if:k==1|10|{{if:k==2|100|1~000}}}} \\quad \\text{revient à} \\quad \\times \\textcolor{{{color:primary.0}}}{{{solution}}}$$"]}},{"blanks":[{"expectedAnswer":"{{eval:n/10^k;d}}"}],"statement":"Calcule.\n\n$${{n}} \\times {{if:k==1|0.1|{{if:k==2|0.01|0.001}}}} = ?$$","variables":[{"name":"k","expression":"1..3"},{"name":"n","expression":"2..999"}],"conditions":["mod(n,10)!=0"],"correction":{"steps":["**Le lien.** $0.1$, c'est un dixième : multiplier par $0.1$, c'est prendre le dixième, donc diviser par $10$. De même, $\\times 0.01$ revient à $\\div 100$, et $\\times 0.001$ à $\\div 1~000$.","$${{n}} \\times {{if:k==1|0.1|{{if:k==2|0.01|0.001}}}} = {{n}} \\div {{if:k==1|10|{{if:k==2|100|1~000}}}} = \\textcolor{{{color:primary.0}}}{{{solution}}}$$"]}}],"shared":null,"test_specs":[{"answers":["1"],"expected":{"status":"correct"},"variables":{"k":"2"},"description":"× 0,01 : diviser par 100","variationIndex":0},{"answers":["4"],"expected":{"status":"incorrect"},"variables":{"k":"2"},"description":"Erreur : multiplier par 100","variationIndex":0},{"answers":["10"],"expected":{"status":"correct"},"variables":{"N":"375","k":"1","n":"37.5"},"description":"37,5 × 0,1 = 37,5 ÷ 10","variationIndex":1},{"answers":["0,1"],"expected":{"status":"incorrect"},"variables":{"N":"375","k":"1","n":"37.5"},"description":"Erreur : 0,1","variationIndex":1},{"answers":["100"],"expected":{"status":"incorrect"},"variables":{"N":"375","k":"1","n":"37.5"},"description":"Erreur : un zéro de trop (100)","variationIndex":1},{"answers":["0,01"],"expected":{"status":"correct"},"variables":{"N":"45","k":"2","n":"4.5"},"description":"4,5 ÷ 100 = 4,5 × 0,01","variationIndex":2},{"answers":["100"],"expected":{"status":"incorrect"},"variables":{"N":"45","k":"2","n":"4.5"},"description":"Erreur : 100","variationIndex":2},{"answers":["0,52"],"expected":{"status":"correct"},"variables":{"k":"2","n":"52"},"description":"52 × 0,01 = 0,52","variationIndex":3},{"answers":["5\\,200"],"expected":{"status":"incorrect"},"variables":{"k":"2","n":"52"},"description":"Erreur : multiplié par 100 (5 200)","variationIndex":3}]}$q6fc$::jsonb)
--   ) as r(id, c)
--  where q.id = r.id;
-- ROLLBACK:END
-- ============================================================================

set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires -----------------------------------------------------
drop table if exists pg_temp._q6fc_modeles;
create temporary table _q6fc_modeles (
	id uuid primary key,
	branche text not null, notion text not null, sous_notion text,
	grades text[] not null,
	-- Statut relevé : les neufs en héritent (un brouillon publié depuis publierait ses neufs).
	statut text not null,
	avant jsonb not null, apres jsonb not null,
	-- Nœud d'arrivée (R2 : les points du modèle vivent ailleurs) ; null : il ne bouge pas.
	branche_apres text, notion_apres text, sous_notion_apres text
);
insert into _q6fc_modeles values ('e3d87166-f0cb-4a9a-ab24-6377e612cfeb', $q6fc$Nombres et calculs$q6fc$, $q6fc$Décimaux : calculs$q6fc$, null, array['6'], 'published',
  $q6fc${"title":"Multiplier par 0,1, c'est diviser par 10","description":"Lien entre × 0,1 / × 0,01 / × 0,001 et ÷ 10 / ÷ 100 / ÷ 1 000 : case choix, égalités à compléter, calcul par la division","variations":[{"blanks":[{"expectedAnswer":"{{eval:k-1}}"}],"statement":"Multiplier un nombre par ${{if:k==1|0.1|{{if:k==2|0.01|0.001}}}}$, c'est :\n\n```choix\n- le diviser par $10$\n- le diviser par $100$\n- le diviser par $1~000$\n- le multiplier par $10$\n- le multiplier par $100$\n```","variables":[{"name":"k","expression":"1..3"}],"correction":{"steps":["**Le lien.** $0.1$, c'est un dixième : multiplier par $0.1$, c'est prendre le dixième, donc diviser par $10$. De même, $\\times 0.01$ revient à $\\div 100$, et $\\times 0.001$ à $\\div 1~000$.","Multiplier par ${{if:k==1|0.1|{{if:k==2|0.01|0.001}}}}$, c'est \\textcolor{{{color:primary.0}}}{diviser par ${{if:k==1|10|{{if:k==2|100|1~000}}}}$} : chaque chiffre recule de ${{k}}$ rang{{if:k>1|s|}} vers la droite."]}},{"blanks":[{"expectedAnswer":"{{eval:10^k}}"}],"statement":"Complète.\n\n$${{n}} \\times {{if:k==1|0.1|{{if:k==2|0.01|0.001}}}} = {{n}} \\div ?$$","variables":[{"name":"k","expression":"1..3"},{"name":"N","expression":"11..999"},{"name":"n","expression":"eval:N/10;d"}],"correction":{"steps":["**Le lien.** $0.1$, c'est un dixième : multiplier par $0.1$, c'est prendre le dixième, donc diviser par $10$. De même, $\\times 0.01$ revient à $\\div 100$, et $\\times 0.001$ à $\\div 1~000$.","$$\\times {{if:k==1|0.1|{{if:k==2|0.01|0.001}}}} \\quad \\text{revient à} \\quad \\div \\textcolor{{{color:primary.0}}}{{{solution}}}$$"]}},{"blanks":[{"expectedAnswer":"{{eval:10^(-k);d}}"}],"statement":"Complète.\n\n$${{n}} \\div {{if:k==1|10|{{if:k==2|100|1~000}}}} = {{n}} \\times ?$$","variables":[{"name":"k","expression":"1..3"},{"name":"N","expression":"11..999"},{"name":"n","expression":"eval:N/10;d"}],"correction":{"steps":["**Le lien.** $0.1$, c'est un dixième : multiplier par $0.1$, c'est prendre le dixième, donc diviser par $10$. De même, $\\times 0.01$ revient à $\\div 100$, et $\\times 0.001$ à $\\div 1~000$.","$$\\div {{if:k==1|10|{{if:k==2|100|1~000}}}} \\quad \\text{revient à} \\quad \\times \\textcolor{{{color:primary.0}}}{{{solution}}}$$"]}},{"blanks":[{"expectedAnswer":"{{eval:n/10^k;d}}"}],"statement":"Calcule.\n\n$${{n}} \\times {{if:k==1|0.1|{{if:k==2|0.01|0.001}}}} = ?$$","variables":[{"name":"k","expression":"1..3"},{"name":"n","expression":"2..999"}],"conditions":["mod(n,10)!=0"],"correction":{"steps":["**Le lien.** $0.1$, c'est un dixième : multiplier par $0.1$, c'est prendre le dixième, donc diviser par $10$. De même, $\\times 0.01$ revient à $\\div 100$, et $\\times 0.001$ à $\\div 1~000$.","$${{n}} \\times {{if:k==1|0.1|{{if:k==2|0.01|0.001}}}} = {{n}} \\div {{if:k==1|10|{{if:k==2|100|1~000}}}} = \\textcolor{{{color:primary.0}}}{{{solution}}}$$"]}}],"shared":null,"test_specs":[{"answers":["1"],"expected":{"status":"correct"},"variables":{"k":"2"},"description":"× 0,01 : diviser par 100","variationIndex":0},{"answers":["4"],"expected":{"status":"incorrect"},"variables":{"k":"2"},"description":"Erreur : multiplier par 100","variationIndex":0},{"answers":["10"],"expected":{"status":"correct"},"variables":{"N":"375","k":"1","n":"37.5"},"description":"37,5 × 0,1 = 37,5 ÷ 10","variationIndex":1},{"answers":["0,1"],"expected":{"status":"incorrect"},"variables":{"N":"375","k":"1","n":"37.5"},"description":"Erreur : 0,1","variationIndex":1},{"answers":["100"],"expected":{"status":"incorrect"},"variables":{"N":"375","k":"1","n":"37.5"},"description":"Erreur : un zéro de trop (100)","variationIndex":1},{"answers":["0,01"],"expected":{"status":"correct"},"variables":{"N":"45","k":"2","n":"4.5"},"description":"4,5 ÷ 100 = 4,5 × 0,01","variationIndex":2},{"answers":["100"],"expected":{"status":"incorrect"},"variables":{"N":"45","k":"2","n":"4.5"},"description":"Erreur : 100","variationIndex":2},{"answers":["0,52"],"expected":{"status":"correct"},"variables":{"k":"2","n":"52"},"description":"52 × 0,01 = 0,52","variationIndex":3},{"answers":["5\\,200"],"expected":{"status":"incorrect"},"variables":{"k":"2","n":"52"},"description":"Erreur : multiplié par 100 (5 200)","variationIndex":3}]}$q6fc$::jsonb,
  $q6fc${"title":"Multiplier par 0,1, c'est diviser par 10","description":"Lien entre × 0,1 / × 0,01 / × 0,001 et ÷ 10 / ÷ 100 / ÷ 1 000 : case choix, égalités à compléter, calcul par la division","variations":[{"blanks":[{"expectedAnswer":"{{eval:k-1}}"}],"statement":"Multiplier un nombre par ${{if:k==1|0.1|{{if:k==2|0.01|0.001}}}}$, c'est :\n\n```choix\n- le diviser par $10$\n- le diviser par $100$\n- le diviser par $1~000$\n- le multiplier par $10$\n- le multiplier par $100$\n```","variables":[{"name":"k","expression":"1..3"}],"correction":{"steps":["**Le lien.** $0.1$, c'est un dixième : multiplier par $0.1$, c'est prendre le dixième, donc diviser par $10$. De même, $\\times 0.01$ revient à $\\div 100$, et $\\times 0.001$ à $\\div 1~000$.","Multiplier par ${{if:k==1|0.1|{{if:k==2|0.01|0.001}}}}$, c'est **diviser par ${{if:k==1|10|{{if:k==2|100|1~000}}}}$** : chaque chiffre recule de ${{k}}$ rang{{if:k>1|s|}} vers la droite."]}},{"blanks":[{"expectedAnswer":"{{eval:10^k}}"}],"statement":"Complète.\n\n$${{n}} \\times {{if:k==1|0.1|{{if:k==2|0.01|0.001}}}} = {{n}} \\div ?$$","variables":[{"name":"k","expression":"1..3"},{"name":"N","expression":"11..999"},{"name":"n","expression":"eval:N/10;d"}],"correction":{"steps":["**Le lien.** $0.1$, c'est un dixième : multiplier par $0.1$, c'est prendre le dixième, donc diviser par $10$. De même, $\\times 0.01$ revient à $\\div 100$, et $\\times 0.001$ à $\\div 1~000$.","$$\\times {{if:k==1|0.1|{{if:k==2|0.01|0.001}}}} \\quad \\text{revient à} \\quad \\div \\textcolor{{{color:primary.0}}}{{{solution}}}$$"]}},{"blanks":[{"expectedAnswer":"{{eval:10^(-k);d}}"}],"statement":"Complète.\n\n$${{n}} \\div {{if:k==1|10|{{if:k==2|100|1~000}}}} = {{n}} \\times ?$$","variables":[{"name":"k","expression":"1..3"},{"name":"N","expression":"11..999"},{"name":"n","expression":"eval:N/10;d"}],"correction":{"steps":["**Le lien.** $0.1$, c'est un dixième : multiplier par $0.1$, c'est prendre le dixième, donc diviser par $10$. De même, $\\times 0.01$ revient à $\\div 100$, et $\\times 0.001$ à $\\div 1~000$.","$$\\div {{if:k==1|10|{{if:k==2|100|1~000}}}} \\quad \\text{revient à} \\quad \\times \\textcolor{{{color:primary.0}}}{{{solution}}}$$"]}},{"blanks":[{"expectedAnswer":"{{eval:n/10^k;d}}"}],"statement":"Calcule.\n\n$${{n}} \\times {{if:k==1|0.1|{{if:k==2|0.01|0.001}}}} = ?$$","variables":[{"name":"k","expression":"1..3"},{"name":"n","expression":"2..999"}],"conditions":["mod(n,10)!=0"],"correction":{"steps":["**Le lien.** $0.1$, c'est un dixième : multiplier par $0.1$, c'est prendre le dixième, donc diviser par $10$. De même, $\\times 0.01$ revient à $\\div 100$, et $\\times 0.001$ à $\\div 1~000$.","$${{n}} \\times {{if:k==1|0.1|{{if:k==2|0.01|0.001}}}} = {{n}} \\div {{if:k==1|10|{{if:k==2|100|1~000}}}} = \\textcolor{{{color:primary.0}}}{{{solution}}}$$"]}}],"shared":null,"test_specs":[{"answers":["1"],"expected":{"status":"correct"},"variables":{"k":"2"},"description":"× 0,01 : diviser par 100","variationIndex":0},{"answers":["4"],"expected":{"status":"incorrect"},"variables":{"k":"2"},"description":"Erreur : multiplier par 100","variationIndex":0},{"answers":["10"],"expected":{"status":"correct"},"variables":{"N":"375","k":"1","n":"37.5"},"description":"37,5 × 0,1 = 37,5 ÷ 10","variationIndex":1},{"answers":["0,1"],"expected":{"status":"incorrect"},"variables":{"N":"375","k":"1","n":"37.5"},"description":"Erreur : 0,1","variationIndex":1},{"answers":["100"],"expected":{"status":"incorrect"},"variables":{"N":"375","k":"1","n":"37.5"},"description":"Erreur : un zéro de trop (100)","variationIndex":1},{"answers":["0,01"],"expected":{"status":"correct"},"variables":{"N":"45","k":"2","n":"4.5"},"description":"4,5 ÷ 100 = 4,5 × 0,01","variationIndex":2},{"answers":["100"],"expected":{"status":"incorrect"},"variables":{"N":"45","k":"2","n":"4.5"},"description":"Erreur : 100","variationIndex":2},{"answers":["0,52"],"expected":{"status":"correct"},"variables":{"k":"2","n":"52"},"description":"52 × 0,01 = 0,52","variationIndex":3},{"answers":["5\\,200"],"expected":{"status":"incorrect"},"variables":{"k":"2","n":"52"},"description":"Erreur : multiplié par 100 (5 200)","variationIndex":3}]}$q6fc$::jsonb,
  null, null, null);

-- Tags des origines : ceux qu'elles portent déjà (relevé, exigés à l'identique et laissés) et ceux
-- que la migration pose.
drop table if exists pg_temp._q6fc_tags;
create temporary table _q6fc_tags (
	id uuid not null references _q6fc_modeles (id),
	tag_grade text not null, tag_code text not null,
	avant boolean not null
);
insert into _q6fc_tags values
  ('e3d87166-f0cb-4a9a-ab24-6377e612cfeb', '6', '6-116', true);

-- Modèles neufs : chacun copie les autres colonnes de son origine, sauf le niveau (et le nœud
-- quand l'un de ses points vit sur une sous-notion voisine).
drop table if exists pg_temp._q6fc_neufs;
create temporary table _q6fc_neufs (
	id uuid primary key,
	origine uuid not null references _q6fc_modeles (id),
	niveau integer not null,
	contenu jsonb not null,
	-- Nœud propre (celui de son premier point) ; null : celui de l'origine.
	branche text, notion text, sous_notion text
);
drop table if exists pg_temp._q6fc_tags_neufs;
create temporary table _q6fc_tags_neufs (
	id uuid not null references _q6fc_neufs (id),
	rang integer not null,
	tag_grade text not null, tag_code text not null
);


-- ---- 2. Résolution STRICTE des nœuds et des points --------------------------------------
create temporary table _q6fc_resolus as
	select r.id, case when r.sous_notion is null then nn.id else s.id end as noeud,
	       r.branche_apres is not null as deplace,
	       case when r.branche_apres is null then case when r.sous_notion is null then nn.id else s.id end
	            when r.sous_notion_apres is null then na.id else sa.id end as noeud_apres,
	       case when r.sous_notion_apres is null then na.archived_at else sa.archived_at end as noeud_apres_archive
	  from _q6fc_modeles r
	  left join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.name = r.branche
	  left join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = r.notion
	  left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = nn.id and s.name = r.sous_notion
	  left join public.classification_nodes ba on ba.kind = 'branch' and ba.parent_id is null and ba.name = r.branche_apres
	  left join public.classification_nodes na on na.kind = 'notion' and na.parent_id = ba.id and na.name = r.notion_apres
	  left join public.classification_nodes sa on sa.kind = 'subnotion' and sa.parent_id = na.id and sa.name = r.sous_notion_apres;
create temporary table _q6fc_resolus_tags as
	select t.id, t.avant, p.id as point_id
	  from _q6fc_tags t
	  left join public.curriculum_points p on p.grade = t.tag_grade and p.code = t.tag_code and p.archived_at is null;
create temporary table _q6fc_resolus_neufs as
	select n.id, n.branche is not null as noeud_propre,
	       case when n.sous_notion is null then nn.id else s.id end as noeud,
	       case when n.sous_notion is null then nn.archived_at else s.archived_at end as noeud_archive
	  from _q6fc_neufs n
	  left join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.name = n.branche
	  left join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = n.notion
	  left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = nn.id and s.name = n.sous_notion;
create temporary table _q6fc_resolus_tags_neufs as
	select t.id, t.rang, p.id as point_id, p.node_id as noeud_du_point
	  from _q6fc_tags_neufs t
	  left join public.curriculum_points p on p.grade = t.tag_grade and p.code = t.tag_code and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from _q6fc_resolus where noeud is null or noeud_apres is null or (deplace and noeud_apres_archive is not null))
	   or exists (select 1 from _q6fc_resolus_tags where point_id is null) then
		raise exception 'nœuds ou points introuvables : %',
			(select count(*) from _q6fc_resolus where noeud is null or noeud_apres is null or (deplace and noeud_apres_archive is not null))
			+ (select count(*) from _q6fc_resolus_tags where point_id is null);
	end if;
	-- Nœud propre : actif, et celui du premier point du modèle neuf (la garde des tags n'accepte que
	-- lui ou sa notion ; un point déplacé depuis le relevé fait échouer ici, pas plus loin).
	if exists (select 1 from _q6fc_resolus_tags_neufs where point_id is null)
	   or exists (select 1 from _q6fc_resolus_neufs n
	               where n.noeud_propre
	                 and (n.noeud is null or n.noeud_archive is not null
	                      or n.noeud is distinct from (select t.noeud_du_point from _q6fc_resolus_tags_neufs t
	                                                    where t.id = n.id and t.rang = 0))) then
		raise exception 'points ou nœuds des modèles neufs introuvables : %',
			(select count(*) from _q6fc_resolus_tags_neufs where point_id is null)
			+ (select count(*) from _q6fc_resolus_neufs n
			    where n.noeud_propre
			      and (n.noeud is null or n.noeud_archive is not null
			           or n.noeud is distinct from (select t.noeud_du_point from _q6fc_resolus_tags_neufs t
			                                         where t.id = n.id and t.rang = 0)));
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, contenu, rangement et tags relevés ---------------
do $garde$
declare v_presents integer; v_contenus integer; v_ranges integer; v_tags integer; v_manquants integer; v_pris integer;
begin
	-- Verrou : aucune sauvegarde de l'éditeur ne peut s'intercaler entre la garde et la mise à jour.
	perform 1 from public.question_templates q join _q6fc_modeles r on r.id = q.id for update of q;
	select count(*) into v_presents from _q6fc_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 1) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 1', v_presents;
	end if;
	select count(*) into v_contenus from _q6fc_modeles r
	  join public.question_templates q on q.id = r.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs) is distinct from r.avant;
	if v_contenus <> 0 then
		raise exception 'modèles modifiés depuis le relevé : %', v_contenus;
	end if;
	select count(*) into v_ranges from _q6fc_modeles r
	  join _q6fc_resolus x on x.id = r.id
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is distinct from x.noeud or q.grades is distinct from r.grades
	    or q.status is distinct from r.statut;
	if v_ranges <> 0 then
		raise exception 'modèles déplacés ou reclassés depuis le relevé : %', v_ranges;
	end if;
	-- Aucun tag hors du relevé (une saisie faite depuis serait contredite), à tout niveau.
	select count(*) into v_manquants from _q6fc_resolus_tags a
	  join public.question_templates q on q.id = a.id
	 where a.avant and not exists (select 1 from public.question_template_points t
	                                where t.template_id = a.id and t.point_id = a.point_id);
	if v_manquants <> 0 then
		raise exception 'tags relevés absents : %', v_manquants;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _q6fc_modeles r on r.id = q.template_id
	 where not exists (select 1 from _q6fc_resolus_tags a
	                    where a.avant and a.id = q.template_id and a.point_id = q.point_id);
	if v_tags <> 0 then
		raise exception 'tags déjà posés sur ces modèles : %', v_tags;
	end if;
	select count(*) into v_pris from _q6fc_neufs n join public.question_templates q on q.id = n.id;
	if v_pris <> 0 then
		raise exception 'identifiants des modèles neufs déjà pris : %', v_pris;
	end if;
	-- Catégorie (thème, domaine, sous-domaine de l'origine, niveau propre) : unique parmi les
	-- modèles publiés (idx_question_templates_unique_category).
	select count(*) into v_pris from _q6fc_neufs n
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
  from _q6fc_modeles r
 where q.id = r.id;

-- R2 : les origines dont les points vivent ailleurs passent sur le nœud de leurs points, AVANT les
-- tags (le trigger des tags lit le nœud du modèle) ; elles n'ont aucun tag d'avant.
update public.question_templates q
   set classification_node_id = x.noeud_apres
  from _q6fc_resolus x
 where q.id = x.id and x.deplace;

insert into public.question_template_points (template_id, point_id)
select x.id, x.point_id
  from _q6fc_resolus_tags x
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
  from _q6fc_neufs n
  join _q6fc_resolus_neufs x on x.id = n.id
  join public.question_templates q on q.id = n.origine;

insert into public.question_template_points (template_id, point_id)
select x.id, x.point_id
  from _q6fc_resolus_tags_neufs x
  join public.question_templates q on q.id = x.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_ok integer; v_tags integer; v_tous integer; v_neufs integer; v_neufs_tags integer; v_neufs_tous integer;
begin
	select count(*) into v_presents from _q6fc_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_ok from _q6fc_modeles r
	  join _q6fc_resolus x on x.id = r.id
	  join public.question_templates q on q.id = r.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs) = r.apres and q.classification_node_id = x.noeud_apres;
	select count(*) into v_tags from _q6fc_resolus_tags x
	  join public.question_template_points q on q.template_id = x.id and q.point_id = x.point_id;
	select count(*) into v_tous from public.question_template_points q join _q6fc_modeles r on r.id = q.template_id;
	if v_ok <> v_presents or v_tags <> v_tous or v_tags <> least(v_presents, 1) * 1 then
		raise exception 'lot incohérent : contenus %/%, tags %/%', v_ok, v_presents, v_tags, v_tous;
	end if;
	select count(*) into v_neufs from _q6fc_neufs n
	  join _q6fc_resolus_neufs x on x.id = n.id
	  join public.question_templates q on q.id = n.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs) = n.contenu
	   and (not x.noeud_propre or q.classification_node_id = x.noeud);
	select count(*) into v_neufs_tags from _q6fc_resolus_tags_neufs x
	  join public.question_template_points q on q.template_id = x.id and q.point_id = x.point_id;
	select count(*) into v_neufs_tous from public.question_template_points q join _q6fc_neufs n on n.id = q.template_id;
	if v_neufs <> least(v_presents, 1) * 0 or v_neufs_tags <> least(v_presents, 1) * 0 or v_neufs_tous <> v_neufs_tags then
		raise exception 'modèles neufs incohérents : contenus %, tags %', v_neufs, v_neufs_tags;
	end if;
end $check$;

drop table pg_temp._q6fc_resolus_tags_neufs;
drop table pg_temp._q6fc_resolus_neufs;
drop table pg_temp._q6fc_resolus_tags;
drop table pg_temp._q6fc_resolus;
drop table pg_temp._q6fc_tags_neufs;
drop table pg_temp._q6fc_neufs;
drop table pg_temp._q6fc_tags;
drop table pg_temp._q6fc_modeles;
