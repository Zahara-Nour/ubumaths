-- ============================================================================
-- Chantier « questions-3 », lot 0 (corrections) : 1 modèle corrigé
-- ============================================================================
--   - 290dcf6f (Augmentation, 3-068) : la variation à 200 % est retirée (« cas simples » du point) ;
--     restent 10, 20, 50 et 100 %. Tag 3-068 gardé ; nœud et niveau (3e) inchangés.
-- Les 19 autres modèles du lot (niveaux, tags, nœuds) sont dans la migration suivante
-- (20261028200100_questions_3_rangement_tags).
-- ============================================================================
-- Phase 0 validée par David le 2026-10-28 (journal docs/wip/questions-3-progress.md § 6.2).
-- Fichier GÉNÉRÉ par docs/wip/questions/lot-corrections-3.py — ne pas éditer à la main.
--
-- Le modèle n'existe qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (1 modèle). Elle est prouvée
-- par tests/integration/questions-3-contenu.test.ts, qui fabrique une copie de l'identifiant de la
-- prod (contenu, nœud, niveaux et tag) puis rejoue CE fichier.
--
-- Garde : le modèle doit avoir EXACTEMENT le contenu relevé en prod le 2026-10-28, être au nœud,
-- aux niveaux et au statut relevés, et porter exactement le tag relevé (3-068).
--
-- Données d'élèves : aucune (relevé du 2026-10-28 : 0 carte SRS, 0 tentative de compétence ou
-- d'évaluation, 0 réponse de test, 0 activité de journal, 0 exercice, série ou fiche de chapitre,
-- 0 favori).
--
-- Accès : personne ne gagne d'accès (question tranchée par David le 2026-10-28). Aucune règle ne
-- change ; effet visible : les élèves de 3e ne tirent plus d'augmentation de 200 %.
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
-- 	perform 1 from public.question_templates where id in ('290dcf6f-02ee-4c2b-a38f-fa4e860e601c') for update;
-- 	select count(*) into v_intacts from public.question_templates q join (values
-- 		('290dcf6f-02ee-4c2b-a38f-fa4e860e601c'::uuid, 'ffd7cbdae94cb70e2cd0690c864814ae')
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
--   ('290dcf6f-02ee-4c2b-a38f-fa4e860e601c'::uuid, $q3c${"title":"Augmentation","description":null,"variations":[{"blanks":[{"expectedAnswer":"{{eval:a*(1+b/100)}}"}],"statement":"Un article qui coûtait initialement ${{eval:a}}$ Qr voit son prix augmenter de ${{b}}\\%$. Calcule son nouveau prix.\n\nLe nouveau prix est de $?$ Qr.","variables":[{"name":"a1","expression":"2..20"},{"name":"a","expression":"eval:a1*10"},{"name":"b","expression":"10"}]},{"blanks":[{"expectedAnswer":"{{eval:a*(1+b/100)}}"}],"statement":"Un article qui coûtait initialement ${{eval:a}}$ Qr voit son prix augmenter de ${{b}}\\%$. Calcule son nouveau prix.\n\nLe nouveau prix est de $?$ Qr.","variables":[{"name":"a1","expression":"2..20"},{"name":"a","expression":"eval:a1*10"},{"name":"b","expression":"20"}]},{"blanks":[{"expectedAnswer":"{{eval:a*(1+b/100)}}"}],"statement":"Un article qui coûtait initialement ${{eval:a}}$ Qr voit son prix augmenter de ${{b}}\\%$. Calcule son nouveau prix.\n\nLe nouveau prix est de $?$ Qr.","variables":[{"name":"a1","expression":"2..20"},{"name":"a","expression":"eval:a1*10"},{"name":"b","expression":"50"}]},{"blanks":[{"expectedAnswer":"{{eval:a*(1+b/100)}}"}],"statement":"Un article qui coûtait initialement ${{eval:a}}$ Qr voit son prix augmenter de ${{b}}\\%$. Calcule son nouveau prix.\n\nLe nouveau prix est de $?$ Qr.","variables":[{"name":"a1","expression":"2..20"},{"name":"a","expression":"eval:a1*10"},{"name":"b","expression":"100"}]},{"blanks":[{"expectedAnswer":"{{eval:a*(1+b/100)}}"}],"statement":"Un article qui coûtait initialement ${{eval:a}}$ Qr voit son prix augmenter de ${{b}}\\%$. Calcule son nouveau prix.\n\nLe nouveau prix est de $?$ Qr.","variables":[{"name":"a1","expression":"2..20"},{"name":"a","expression":"eval:a1*10"},{"name":"b","expression":"200"}]}],"shared":{"statement":"Un article qui coûtait initialement ${{eval:a}}$ Qr voit son prix augmenter de ${{b}}\\%$. Calcule son nouveau prix.\n\nLe nouveau prix est de $?$ Qr.","correction":{"steps":["L'augmentation est de ${{b}}\\% \\times {{eval:a}} = {{eval:b%*a}}$ Qr. Le nouveau prix est donc ${{eval:a}} + {{eval:b%*a}} = {{solution}}$ Qr. "]}},"test_specs":[{"answers":["165"],"expected":{"status":"correct"},"variables":{"a":"150","b":"10","a1":"15"},"description":"v0 10 % de 150","variationIndex":0},{"answers":["22"],"expected":{"status":"correct"},"variables":{"a":"20","b":"10","a1":"2"},"description":"v0 10 % de 20","variationIndex":0},{"answers":["220"],"expected":{"status":"correct"},"variables":{"a":"200","b":"10","a1":"20"},"description":"v0 10 % de 200","variationIndex":0},{"answers":["180"],"expected":{"status":"correct"},"variables":{"a":"150","b":"20","a1":"15"},"description":"v1 20 % de 150","variationIndex":1},{"answers":["24"],"expected":{"status":"correct"},"variables":{"a":"20","b":"20","a1":"2"},"description":"v1 20 % de 20","variationIndex":1},{"answers":["240"],"expected":{"status":"correct"},"variables":{"a":"200","b":"20","a1":"20"},"description":"v1 20 % de 200","variationIndex":1},{"answers":["225"],"expected":{"status":"correct"},"variables":{"a":"150","b":"50","a1":"15"},"description":"v2 50 % de 150","variationIndex":2},{"answers":["30"],"expected":{"status":"correct"},"variables":{"a":"20","b":"50","a1":"2"},"description":"v2 50 % de 20","variationIndex":2},{"answers":["300"],"expected":{"status":"correct"},"variables":{"a":"200","b":"50","a1":"20"},"description":"v2 50 % de 200","variationIndex":2},{"answers":["300"],"expected":{"status":"correct"},"variables":{"a":"150","b":"100","a1":"15"},"description":"v3 100 % de 150","variationIndex":3},{"answers":["40"],"expected":{"status":"correct"},"variables":{"a":"20","b":"100","a1":"2"},"description":"v3 100 % de 20","variationIndex":3},{"answers":["400"],"expected":{"status":"correct"},"variables":{"a":"200","b":"100","a1":"20"},"description":"v3 100 % de 200","variationIndex":3},{"answers":["450"],"expected":{"status":"correct"},"variables":{"a":"150","b":"200","a1":"15"},"description":"v4 200 % de 150","variationIndex":4},{"answers":["60"],"expected":{"status":"correct"},"variables":{"a":"20","b":"200","a1":"2"},"description":"v4 200 % de 20","variationIndex":4},{"answers":["600"],"expected":{"status":"correct"},"variables":{"a":"200","b":"200","a1":"20"},"description":"v4 200 % de 200","variationIndex":4},{"answers":["15"],"expected":{"status":"incorrect"},"variables":{"a":"150","b":"10","a1":"15"},"description":"seulement la variation","variationIndex":0},{"answers":["400"],"expected":{"status":"incorrect"},"variables":{"a":"200","b":"200","a1":"20"},"description":"augmentation seule","variationIndex":4}]}$q3c$::jsonb)
--   ) as r(id, c)
--  where q.id = r.id;
-- ROLLBACK:END
-- ============================================================================

set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires -----------------------------------------------------
drop table if exists pg_temp._q3c_modeles;
create temporary table _q3c_modeles (
	id uuid primary key,
	branche text not null, notion text not null, sous_notion text,
	grades text[] not null,
	-- Statut relevé : les neufs en héritent (un brouillon publié depuis publierait ses neufs).
	statut text not null,
	avant jsonb not null, apres jsonb not null,
	-- Nœud d'arrivée (R2 : les points du modèle vivent ailleurs) ; null : il ne bouge pas.
	branche_apres text, notion_apres text, sous_notion_apres text
);
insert into _q3c_modeles values ('290dcf6f-02ee-4c2b-a38f-fa4e860e601c', $q3c$Proportionnalité$q3c$, $q3c$Évolutions$q3c$, $q3c$variations en pourcentage$q3c$, array['3'], 'published',
  $q3c${"title":"Augmentation","description":null,"variations":[{"blanks":[{"expectedAnswer":"{{eval:a*(1+b/100)}}"}],"statement":"Un article qui coûtait initialement ${{eval:a}}$ Qr voit son prix augmenter de ${{b}}\\%$. Calcule son nouveau prix.\n\nLe nouveau prix est de $?$ Qr.","variables":[{"name":"a1","expression":"2..20"},{"name":"a","expression":"eval:a1*10"},{"name":"b","expression":"10"}]},{"blanks":[{"expectedAnswer":"{{eval:a*(1+b/100)}}"}],"statement":"Un article qui coûtait initialement ${{eval:a}}$ Qr voit son prix augmenter de ${{b}}\\%$. Calcule son nouveau prix.\n\nLe nouveau prix est de $?$ Qr.","variables":[{"name":"a1","expression":"2..20"},{"name":"a","expression":"eval:a1*10"},{"name":"b","expression":"20"}]},{"blanks":[{"expectedAnswer":"{{eval:a*(1+b/100)}}"}],"statement":"Un article qui coûtait initialement ${{eval:a}}$ Qr voit son prix augmenter de ${{b}}\\%$. Calcule son nouveau prix.\n\nLe nouveau prix est de $?$ Qr.","variables":[{"name":"a1","expression":"2..20"},{"name":"a","expression":"eval:a1*10"},{"name":"b","expression":"50"}]},{"blanks":[{"expectedAnswer":"{{eval:a*(1+b/100)}}"}],"statement":"Un article qui coûtait initialement ${{eval:a}}$ Qr voit son prix augmenter de ${{b}}\\%$. Calcule son nouveau prix.\n\nLe nouveau prix est de $?$ Qr.","variables":[{"name":"a1","expression":"2..20"},{"name":"a","expression":"eval:a1*10"},{"name":"b","expression":"100"}]},{"blanks":[{"expectedAnswer":"{{eval:a*(1+b/100)}}"}],"statement":"Un article qui coûtait initialement ${{eval:a}}$ Qr voit son prix augmenter de ${{b}}\\%$. Calcule son nouveau prix.\n\nLe nouveau prix est de $?$ Qr.","variables":[{"name":"a1","expression":"2..20"},{"name":"a","expression":"eval:a1*10"},{"name":"b","expression":"200"}]}],"shared":{"statement":"Un article qui coûtait initialement ${{eval:a}}$ Qr voit son prix augmenter de ${{b}}\\%$. Calcule son nouveau prix.\n\nLe nouveau prix est de $?$ Qr.","correction":{"steps":["L'augmentation est de ${{b}}\\% \\times {{eval:a}} = {{eval:b%*a}}$ Qr. Le nouveau prix est donc ${{eval:a}} + {{eval:b%*a}} = {{solution}}$ Qr. "]}},"test_specs":[{"answers":["165"],"expected":{"status":"correct"},"variables":{"a":"150","b":"10","a1":"15"},"description":"v0 10 % de 150","variationIndex":0},{"answers":["22"],"expected":{"status":"correct"},"variables":{"a":"20","b":"10","a1":"2"},"description":"v0 10 % de 20","variationIndex":0},{"answers":["220"],"expected":{"status":"correct"},"variables":{"a":"200","b":"10","a1":"20"},"description":"v0 10 % de 200","variationIndex":0},{"answers":["180"],"expected":{"status":"correct"},"variables":{"a":"150","b":"20","a1":"15"},"description":"v1 20 % de 150","variationIndex":1},{"answers":["24"],"expected":{"status":"correct"},"variables":{"a":"20","b":"20","a1":"2"},"description":"v1 20 % de 20","variationIndex":1},{"answers":["240"],"expected":{"status":"correct"},"variables":{"a":"200","b":"20","a1":"20"},"description":"v1 20 % de 200","variationIndex":1},{"answers":["225"],"expected":{"status":"correct"},"variables":{"a":"150","b":"50","a1":"15"},"description":"v2 50 % de 150","variationIndex":2},{"answers":["30"],"expected":{"status":"correct"},"variables":{"a":"20","b":"50","a1":"2"},"description":"v2 50 % de 20","variationIndex":2},{"answers":["300"],"expected":{"status":"correct"},"variables":{"a":"200","b":"50","a1":"20"},"description":"v2 50 % de 200","variationIndex":2},{"answers":["300"],"expected":{"status":"correct"},"variables":{"a":"150","b":"100","a1":"15"},"description":"v3 100 % de 150","variationIndex":3},{"answers":["40"],"expected":{"status":"correct"},"variables":{"a":"20","b":"100","a1":"2"},"description":"v3 100 % de 20","variationIndex":3},{"answers":["400"],"expected":{"status":"correct"},"variables":{"a":"200","b":"100","a1":"20"},"description":"v3 100 % de 200","variationIndex":3},{"answers":["450"],"expected":{"status":"correct"},"variables":{"a":"150","b":"200","a1":"15"},"description":"v4 200 % de 150","variationIndex":4},{"answers":["60"],"expected":{"status":"correct"},"variables":{"a":"20","b":"200","a1":"2"},"description":"v4 200 % de 20","variationIndex":4},{"answers":["600"],"expected":{"status":"correct"},"variables":{"a":"200","b":"200","a1":"20"},"description":"v4 200 % de 200","variationIndex":4},{"answers":["15"],"expected":{"status":"incorrect"},"variables":{"a":"150","b":"10","a1":"15"},"description":"seulement la variation","variationIndex":0},{"answers":["400"],"expected":{"status":"incorrect"},"variables":{"a":"200","b":"200","a1":"20"},"description":"augmentation seule","variationIndex":4}]}$q3c$::jsonb,
  $q3c${"title":"Augmentation","description":null,"variations":[{"blanks":[{"expectedAnswer":"{{eval:a*(1+b/100)}}"}],"statement":"Un article qui coûtait initialement ${{eval:a}}$ Qr voit son prix augmenter de ${{b}}\\%$. Calcule son nouveau prix.\n\nLe nouveau prix est de $?$ Qr.","variables":[{"name":"a1","expression":"2..20"},{"name":"a","expression":"eval:a1*10"},{"name":"b","expression":"10"}]},{"blanks":[{"expectedAnswer":"{{eval:a*(1+b/100)}}"}],"statement":"Un article qui coûtait initialement ${{eval:a}}$ Qr voit son prix augmenter de ${{b}}\\%$. Calcule son nouveau prix.\n\nLe nouveau prix est de $?$ Qr.","variables":[{"name":"a1","expression":"2..20"},{"name":"a","expression":"eval:a1*10"},{"name":"b","expression":"20"}]},{"blanks":[{"expectedAnswer":"{{eval:a*(1+b/100)}}"}],"statement":"Un article qui coûtait initialement ${{eval:a}}$ Qr voit son prix augmenter de ${{b}}\\%$. Calcule son nouveau prix.\n\nLe nouveau prix est de $?$ Qr.","variables":[{"name":"a1","expression":"2..20"},{"name":"a","expression":"eval:a1*10"},{"name":"b","expression":"50"}]},{"blanks":[{"expectedAnswer":"{{eval:a*(1+b/100)}}"}],"statement":"Un article qui coûtait initialement ${{eval:a}}$ Qr voit son prix augmenter de ${{b}}\\%$. Calcule son nouveau prix.\n\nLe nouveau prix est de $?$ Qr.","variables":[{"name":"a1","expression":"2..20"},{"name":"a","expression":"eval:a1*10"},{"name":"b","expression":"100"}]}],"shared":{"statement":"Un article qui coûtait initialement ${{eval:a}}$ Qr voit son prix augmenter de ${{b}}\\%$. Calcule son nouveau prix.\n\nLe nouveau prix est de $?$ Qr.","correction":{"steps":["L'augmentation est de ${{b}}\\% \\times {{eval:a}} = {{eval:b%*a}}$ Qr. Le nouveau prix est donc ${{eval:a}} + {{eval:b%*a}} = {{solution}}$ Qr. "]}},"test_specs":[{"answers":["165"],"expected":{"status":"correct"},"variables":{"a":"150","b":"10","a1":"15"},"description":"v0 10 % de 150","variationIndex":0},{"answers":["22"],"expected":{"status":"correct"},"variables":{"a":"20","b":"10","a1":"2"},"description":"v0 10 % de 20","variationIndex":0},{"answers":["220"],"expected":{"status":"correct"},"variables":{"a":"200","b":"10","a1":"20"},"description":"v0 10 % de 200","variationIndex":0},{"answers":["180"],"expected":{"status":"correct"},"variables":{"a":"150","b":"20","a1":"15"},"description":"v1 20 % de 150","variationIndex":1},{"answers":["24"],"expected":{"status":"correct"},"variables":{"a":"20","b":"20","a1":"2"},"description":"v1 20 % de 20","variationIndex":1},{"answers":["240"],"expected":{"status":"correct"},"variables":{"a":"200","b":"20","a1":"20"},"description":"v1 20 % de 200","variationIndex":1},{"answers":["225"],"expected":{"status":"correct"},"variables":{"a":"150","b":"50","a1":"15"},"description":"v2 50 % de 150","variationIndex":2},{"answers":["30"],"expected":{"status":"correct"},"variables":{"a":"20","b":"50","a1":"2"},"description":"v2 50 % de 20","variationIndex":2},{"answers":["300"],"expected":{"status":"correct"},"variables":{"a":"200","b":"50","a1":"20"},"description":"v2 50 % de 200","variationIndex":2},{"answers":["300"],"expected":{"status":"correct"},"variables":{"a":"150","b":"100","a1":"15"},"description":"v3 100 % de 150","variationIndex":3},{"answers":["40"],"expected":{"status":"correct"},"variables":{"a":"20","b":"100","a1":"2"},"description":"v3 100 % de 20","variationIndex":3},{"answers":["400"],"expected":{"status":"correct"},"variables":{"a":"200","b":"100","a1":"20"},"description":"v3 100 % de 200","variationIndex":3},{"answers":["15"],"expected":{"status":"incorrect"},"variables":{"a":"150","b":"10","a1":"15"},"description":"seulement la variation","variationIndex":0},{"answers":["100"],"expected":{"status":"incorrect"},"variables":{"a":"200","b":"50","a1":"20"},"description":"augmentation seule","variationIndex":2}]}$q3c$::jsonb,
  null, null, null);

-- Tags des origines : ceux qu'elles portent déjà (relevé, exigés à l'identique et laissés) et ceux
-- que la migration pose.
drop table if exists pg_temp._q3c_tags;
create temporary table _q3c_tags (
	id uuid not null references _q3c_modeles (id),
	tag_grade text not null, tag_code text not null,
	avant boolean not null
);
insert into _q3c_tags values
  ('290dcf6f-02ee-4c2b-a38f-fa4e860e601c', '3', '3-068', true);

-- Modèles neufs : chacun copie les autres colonnes de son origine, sauf le niveau (et le nœud
-- quand l'un de ses points vit sur une sous-notion voisine).
drop table if exists pg_temp._q3c_neufs;
create temporary table _q3c_neufs (
	id uuid primary key,
	origine uuid not null references _q3c_modeles (id),
	niveau integer not null,
	contenu jsonb not null,
	-- Nœud propre (celui de son premier point) ; null : celui de l'origine.
	branche text, notion text, sous_notion text
);
drop table if exists pg_temp._q3c_tags_neufs;
create temporary table _q3c_tags_neufs (
	id uuid not null references _q3c_neufs (id),
	rang integer not null,
	tag_grade text not null, tag_code text not null
);


-- ---- 2. Résolution STRICTE des nœuds et des points --------------------------------------
create temporary table _q3c_resolus as
	select r.id, case when r.sous_notion is null then nn.id else s.id end as noeud,
	       r.branche_apres is not null as deplace,
	       case when r.branche_apres is null then case when r.sous_notion is null then nn.id else s.id end
	            when r.sous_notion_apres is null then na.id else sa.id end as noeud_apres,
	       case when r.sous_notion_apres is null then na.archived_at else sa.archived_at end as noeud_apres_archive
	  from _q3c_modeles r
	  left join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.name = r.branche
	  left join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = r.notion
	  left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = nn.id and s.name = r.sous_notion
	  left join public.classification_nodes ba on ba.kind = 'branch' and ba.parent_id is null and ba.name = r.branche_apres
	  left join public.classification_nodes na on na.kind = 'notion' and na.parent_id = ba.id and na.name = r.notion_apres
	  left join public.classification_nodes sa on sa.kind = 'subnotion' and sa.parent_id = na.id and sa.name = r.sous_notion_apres;
create temporary table _q3c_resolus_tags as
	select t.id, t.avant, p.id as point_id
	  from _q3c_tags t
	  left join public.curriculum_points p on p.grade = t.tag_grade and p.code = t.tag_code and p.archived_at is null;
create temporary table _q3c_resolus_neufs as
	select n.id, n.branche is not null as noeud_propre,
	       case when n.sous_notion is null then nn.id else s.id end as noeud,
	       case when n.sous_notion is null then nn.archived_at else s.archived_at end as noeud_archive
	  from _q3c_neufs n
	  left join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.name = n.branche
	  left join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = n.notion
	  left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = nn.id and s.name = n.sous_notion;
create temporary table _q3c_resolus_tags_neufs as
	select t.id, t.rang, p.id as point_id, p.node_id as noeud_du_point
	  from _q3c_tags_neufs t
	  left join public.curriculum_points p on p.grade = t.tag_grade and p.code = t.tag_code and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from _q3c_resolus where noeud is null or noeud_apres is null or (deplace and noeud_apres_archive is not null))
	   or exists (select 1 from _q3c_resolus_tags where point_id is null) then
		raise exception 'nœuds ou points introuvables : %',
			(select count(*) from _q3c_resolus where noeud is null or noeud_apres is null or (deplace and noeud_apres_archive is not null))
			+ (select count(*) from _q3c_resolus_tags where point_id is null);
	end if;
	-- Nœud propre : actif, et celui du premier point du modèle neuf (la garde des tags n'accepte que
	-- lui ou sa notion ; un point déplacé depuis le relevé fait échouer ici, pas plus loin).
	if exists (select 1 from _q3c_resolus_tags_neufs where point_id is null)
	   or exists (select 1 from _q3c_resolus_neufs n
	               where n.noeud_propre
	                 and (n.noeud is null or n.noeud_archive is not null
	                      or n.noeud is distinct from (select t.noeud_du_point from _q3c_resolus_tags_neufs t
	                                                    where t.id = n.id and t.rang = 0))) then
		raise exception 'points ou nœuds des modèles neufs introuvables : %',
			(select count(*) from _q3c_resolus_tags_neufs where point_id is null)
			+ (select count(*) from _q3c_resolus_neufs n
			    where n.noeud_propre
			      and (n.noeud is null or n.noeud_archive is not null
			           or n.noeud is distinct from (select t.noeud_du_point from _q3c_resolus_tags_neufs t
			                                         where t.id = n.id and t.rang = 0)));
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, contenu, rangement et tags relevés ---------------
do $garde$
declare v_presents integer; v_contenus integer; v_ranges integer; v_tags integer; v_manquants integer; v_pris integer;
begin
	-- Verrou : aucune sauvegarde de l'éditeur ne peut s'intercaler entre la garde et la mise à jour.
	perform 1 from public.question_templates q join _q3c_modeles r on r.id = q.id for update of q;
	select count(*) into v_presents from _q3c_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 1) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 1', v_presents;
	end if;
	select count(*) into v_contenus from _q3c_modeles r
	  join public.question_templates q on q.id = r.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs) is distinct from r.avant;
	if v_contenus <> 0 then
		raise exception 'modèles modifiés depuis le relevé : %', v_contenus;
	end if;
	select count(*) into v_ranges from _q3c_modeles r
	  join _q3c_resolus x on x.id = r.id
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is distinct from x.noeud or q.grades is distinct from r.grades
	    or q.status is distinct from r.statut;
	if v_ranges <> 0 then
		raise exception 'modèles déplacés ou reclassés depuis le relevé : %', v_ranges;
	end if;
	-- Aucun tag hors du relevé (une saisie faite depuis serait contredite), à tout niveau.
	select count(*) into v_manquants from _q3c_resolus_tags a
	  join public.question_templates q on q.id = a.id
	 where a.avant and not exists (select 1 from public.question_template_points t
	                                where t.template_id = a.id and t.point_id = a.point_id);
	if v_manquants <> 0 then
		raise exception 'tags relevés absents : %', v_manquants;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _q3c_modeles r on r.id = q.template_id
	 where not exists (select 1 from _q3c_resolus_tags a
	                    where a.avant and a.id = q.template_id and a.point_id = q.point_id);
	if v_tags <> 0 then
		raise exception 'tags déjà posés sur ces modèles : %', v_tags;
	end if;
	select count(*) into v_pris from _q3c_neufs n join public.question_templates q on q.id = n.id;
	if v_pris <> 0 then
		raise exception 'identifiants des modèles neufs déjà pris : %', v_pris;
	end if;
	-- Catégorie (thème, domaine, sous-domaine de l'origine, niveau propre) : unique parmi les
	-- modèles publiés (idx_question_templates_unique_category).
	select count(*) into v_pris from _q3c_neufs n
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
  from _q3c_modeles r
 where q.id = r.id;

-- R2 : les origines dont les points vivent ailleurs passent sur le nœud de leurs points, AVANT les
-- tags (le trigger des tags lit le nœud du modèle) ; elles n'ont aucun tag d'avant.
update public.question_templates q
   set classification_node_id = x.noeud_apres
  from _q3c_resolus x
 where q.id = x.id and x.deplace;

insert into public.question_template_points (template_id, point_id)
select x.id, x.point_id
  from _q3c_resolus_tags x
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
  from _q3c_neufs n
  join _q3c_resolus_neufs x on x.id = n.id
  join public.question_templates q on q.id = n.origine;

insert into public.question_template_points (template_id, point_id)
select x.id, x.point_id
  from _q3c_resolus_tags_neufs x
  join public.question_templates q on q.id = x.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_ok integer; v_tags integer; v_tous integer; v_neufs integer; v_neufs_tags integer; v_neufs_tous integer;
begin
	select count(*) into v_presents from _q3c_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_ok from _q3c_modeles r
	  join _q3c_resolus x on x.id = r.id
	  join public.question_templates q on q.id = r.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs) = r.apres and q.classification_node_id = x.noeud_apres;
	select count(*) into v_tags from _q3c_resolus_tags x
	  join public.question_template_points q on q.template_id = x.id and q.point_id = x.point_id;
	select count(*) into v_tous from public.question_template_points q join _q3c_modeles r on r.id = q.template_id;
	if v_ok <> v_presents or v_tags <> v_tous or v_tags <> least(v_presents, 1) * 1 then
		raise exception 'lot incohérent : contenus %/%, tags %/%', v_ok, v_presents, v_tags, v_tous;
	end if;
	select count(*) into v_neufs from _q3c_neufs n
	  join _q3c_resolus_neufs x on x.id = n.id
	  join public.question_templates q on q.id = n.id
	 where jsonb_build_object('title', q.title, 'description', q.description, 'variations', q.variations, 'shared', q.shared, 'test_specs', q.test_specs) = n.contenu
	   and (not x.noeud_propre or q.classification_node_id = x.noeud);
	select count(*) into v_neufs_tags from _q3c_resolus_tags_neufs x
	  join public.question_template_points q on q.template_id = x.id and q.point_id = x.point_id;
	select count(*) into v_neufs_tous from public.question_template_points q join _q3c_neufs n on n.id = q.template_id;
	if v_neufs <> least(v_presents, 1) * 0 or v_neufs_tags <> least(v_presents, 1) * 0 or v_neufs_tous <> v_neufs_tags then
		raise exception 'modèles neufs incohérents : contenus %, tags %', v_neufs, v_neufs_tags;
	end if;
end $check$;

drop table pg_temp._q3c_resolus_tags_neufs;
drop table pg_temp._q3c_resolus_neufs;
drop table pg_temp._q3c_resolus_tags;
drop table pg_temp._q3c_resolus;
drop table pg_temp._q3c_tags_neufs;
drop table pg_temp._q3c_neufs;
drop table pg_temp._q3c_tags;
drop table pg_temp._q3c_modeles;
