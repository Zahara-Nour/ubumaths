-- ============================================================================
-- Chantier « questions-tspe » : niveau de 14 brouillons de terminale spé dans leur catégorie
-- ============================================================================
-- La simulation de publication du lot 0-suites (scripts/questions/publier-lot.ts, 2026-10-29)
-- refuse 7063979e et 98ba277c : même catégorie, même niveau (un seul modèle publié par catégorie
-- et par niveau, idx_question_templates_unique_category). Relevé (MCP) sur les 184 brouillons de
-- terminale spé : 14 collisions de ce type, réglées ici en une fois, avant toute publication.
-- Un modèle de chaque paire prend un niveau libre de sa catégorie (le plus simple en dessous si
-- la place est libre, sinon le premier niveau libre au-dessus) :
--   - 37ce7759 (Convexité lue sur la courbe de f), Fonctions convexes / Convexité / Lecture graphique : 2 → 1 ;
--   - 3aca54e9 (Combinaisons en situation), Probabilités / Dénombrement / Combinaisons : 2 → 1 ;
--   - 5072030d (Lire la période sur la courbe), Fonctions / Fonctions trigonométriques / Parité et périodicité : 1 → 3 ;
--   - 7063979e (Limite infinie par comparaison), Suites / Limites de suites / Comparaison et encadrement : 2 → 1 ;
--   - 7df468d6 (Période de cos(ax + b)), Fonctions / Fonctions trigonométriques / Parité et périodicité : 2 → 4 ;
--   - 7f13ca89 (Intervalle de croissance avec ln ; niveaux 1 à 4 publiés en 1re spé), Fonctions / Dérivation / Variations : 3 → 5 ;
--   - 9c7fb7cf (Résoudre cos x ⩽ a entre −π et π), Fonctions / Fonctions trigonométriques / Équations et inéquations : 2 → 5 ;
--   - a95a9c0d (Binomiale à la main), Probabilités / Loi binomiale / Calcul de probabilités : 2 → 1 ;
--   - cac2d6ed (Optimum avec cos ou sin), Fonctions / Fonctions trigonométriques / Dérivées et variations : 3 → 4 ;
--   - d0930e8c (Primitive de 1/x, eˣ…), Primitives et équations différentielles / Primitives / Primitives des fonctions de référence : 1 → 2 ;
--   - d3ae0f61 (Encadrer la solution de f(x) = k), Fonctions / Continuité / Théorème des valeurs intermédiaires : 2 → 3 ;
--   - eae25eba (Projeté sur une droite), Géométrie / Orthogonalité et distances dans l'espace / Projeté orthogonal : 3 → 2 ;
--   - ed01a843 (Principe multiplicatif), Probabilités / Dénombrement / Principes additif et multiplicatif : 1 → 2 ;
--   - f796ffc0 (Quel modèle ?), Probabilités / Dénombrement / Reconnaître le modèle : 2 → 1 ;
-- Le niveau n'est qu'un ordre d'affichage dans la catégorie ; aucun modèle publié n'est touché.
-- Ni le contenu, ni le nœud, ni les tags, ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- Le fichier scripts/questions/tspe-0-suites/7063979e.json porte déjà le niveau 1 ; les autres
-- seront exportés de la base (export-question-templates.ts) avec leur thème, après la migration.
-- ============================================================================
-- Décision de David le 2026-10-30 (journal docs/wip/questions-tspe-progress.md, § 6, Q8).
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (14 modèles). Elle est prouvée par
-- tests/integration/questions-tspe-niveaux.test.ts, qui fabrique des copies des identifiants de
-- la prod (catégorie et niveau relevés) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore en BROUILLON, dans sa catégorie et à son niveau relevés
-- le 2026-10-29 (MCP) ; aucun modèle publié ne doit occuper le niveau visé.
--
-- Données d'élèves : aucune (brouillons).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-10-29 AVANT le SQL,
-- tranchée par lui le 2026-10-30 : personne). Aucune règle ne change.
--
-- Rollback (aucune donnée d'élève). Il rend aux 14 modèles leur niveau d'avant. Garde : il refuse
-- si un modèle n'est plus en brouillon ou n'est plus au niveau posé par la migration. Bloc éprouvé
-- par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou
-- l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select 1 from public.question_templates
--  where id in ('37ce7759-c2fa-4353-a726-f0c942284053', '3aca54e9-28c7-4ea4-930b-30be6979549b',
--               '5072030d-8036-4621-a92b-75df54d371f9', '7063979e-b3b5-4b12-8ff9-e6df2c05b23c',
--               '7df468d6-647c-4b59-9a6c-026a2279fd86', '7f13ca89-ad64-4665-9f6b-e11fad8f8b08',
--               '9c7fb7cf-42b3-462e-9a8b-4c4cd8f37278', 'a95a9c0d-0d5d-4a5a-ab50-294e12bb7f47',
--               'cac2d6ed-c215-4e58-aaeb-1b314476f41d', 'd0930e8c-a11b-489e-a931-0a8679cef3c6',
--               'd3ae0f61-3377-4d00-896e-291aaaf6ba5d', 'eae25eba-49aa-4be5-a3ae-eef9ec4e0a31',
--               'ed01a843-e3ff-4383-8933-fe7593000693', 'f796ffc0-d9cc-496b-97a8-9e10f07e6fc8')
--  order by id for update;
-- do $garde_rollback$
-- begin
-- 	if (select count(*) from public.question_templates q
-- 	      join (values ('37ce7759-c2fa-4353-a726-f0c942284053'::uuid, 1),
--                    ('3aca54e9-28c7-4ea4-930b-30be6979549b'::uuid, 1),
--                    ('5072030d-8036-4621-a92b-75df54d371f9'::uuid, 3),
--                    ('7063979e-b3b5-4b12-8ff9-e6df2c05b23c'::uuid, 1),
--                    ('7df468d6-647c-4b59-9a6c-026a2279fd86'::uuid, 4),
--                    ('7f13ca89-ad64-4665-9f6b-e11fad8f8b08'::uuid, 5),
--                    ('9c7fb7cf-42b3-462e-9a8b-4c4cd8f37278'::uuid, 5),
--                    ('a95a9c0d-0d5d-4a5a-ab50-294e12bb7f47'::uuid, 1),
--                    ('cac2d6ed-c215-4e58-aaeb-1b314476f41d'::uuid, 4),
--                    ('d0930e8c-a11b-489e-a931-0a8679cef3c6'::uuid, 2),
--                    ('d3ae0f61-3377-4d00-896e-291aaaf6ba5d'::uuid, 3),
--                    ('eae25eba-49aa-4be5-a3ae-eef9ec4e0a31'::uuid, 2),
--                    ('ed01a843-e3ff-4383-8933-fe7593000693'::uuid, 2),
--                    ('f796ffc0-d9cc-496b-97a8-9e10f07e6fc8'::uuid, 1)) as r(id, niveau)
-- 	        on r.id = q.id and q.level = r.niveau and q.status = 'draft') <> 14 then
-- 		raise exception 'rollback refusé : un modèle a changé depuis la migration';
-- 	end if;
-- end $garde_rollback$;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates q set level = r.niveau
--   from (values ('37ce7759-c2fa-4353-a726-f0c942284053'::uuid, 2),
--                      ('3aca54e9-28c7-4ea4-930b-30be6979549b'::uuid, 2),
--                      ('5072030d-8036-4621-a92b-75df54d371f9'::uuid, 1),
--                      ('7063979e-b3b5-4b12-8ff9-e6df2c05b23c'::uuid, 2),
--                      ('7df468d6-647c-4b59-9a6c-026a2279fd86'::uuid, 2),
--                      ('7f13ca89-ad64-4665-9f6b-e11fad8f8b08'::uuid, 3),
--                      ('9c7fb7cf-42b3-462e-9a8b-4c4cd8f37278'::uuid, 2),
--                      ('a95a9c0d-0d5d-4a5a-ab50-294e12bb7f47'::uuid, 2),
--                      ('cac2d6ed-c215-4e58-aaeb-1b314476f41d'::uuid, 3),
--                      ('d0930e8c-a11b-489e-a931-0a8679cef3c6'::uuid, 1),
--                      ('d3ae0f61-3377-4d00-896e-291aaaf6ba5d'::uuid, 2),
--                      ('eae25eba-49aa-4be5-a3ae-eef9ec4e0a31'::uuid, 3),
--                      ('ed01a843-e3ff-4383-8933-fe7593000693'::uuid, 1),
--                      ('f796ffc0-d9cc-496b-97a8-9e10f07e6fc8'::uuid, 2)) as r(id, niveau)
--  where q.id = r.id;
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les lignes des modèles sont verrouillées après l'étape 1.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qn_modeles;
create temporary table _qn_modeles (
	id uuid primary key,
	theme text not null,
	domain text not null,
	subdomain text not null,
	avant integer not null,
	apres integer not null
);
insert into _qn_modeles values
	('37ce7759-c2fa-4353-a726-f0c942284053', 'Fonctions convexes', 'Convexité', 'Lecture graphique', 2, 1),
	('3aca54e9-28c7-4ea4-930b-30be6979549b', 'Probabilités', 'Dénombrement', 'Combinaisons', 2, 1),
	('5072030d-8036-4621-a92b-75df54d371f9', 'Fonctions', 'Fonctions trigonométriques', 'Parité et périodicité', 1, 3),
	('7063979e-b3b5-4b12-8ff9-e6df2c05b23c', 'Suites', 'Limites de suites', 'Comparaison et encadrement', 2, 1),
	('7df468d6-647c-4b59-9a6c-026a2279fd86', 'Fonctions', 'Fonctions trigonométriques', 'Parité et périodicité', 2, 4),
	('7f13ca89-ad64-4665-9f6b-e11fad8f8b08', 'Fonctions', 'Dérivation', 'Variations', 3, 5),
	('9c7fb7cf-42b3-462e-9a8b-4c4cd8f37278', 'Fonctions', 'Fonctions trigonométriques', 'Équations et inéquations', 2, 5),
	('a95a9c0d-0d5d-4a5a-ab50-294e12bb7f47', 'Probabilités', 'Loi binomiale', 'Calcul de probabilités', 2, 1),
	('cac2d6ed-c215-4e58-aaeb-1b314476f41d', 'Fonctions', 'Fonctions trigonométriques', 'Dérivées et variations', 3, 4),
	('d0930e8c-a11b-489e-a931-0a8679cef3c6', 'Primitives et équations différentielles', 'Primitives', 'Primitives des fonctions de référence', 1, 2),
	('d3ae0f61-3377-4d00-896e-291aaaf6ba5d', 'Fonctions', 'Continuité', 'Théorème des valeurs intermédiaires', 2, 3),
	('eae25eba-49aa-4be5-a3ae-eef9ec4e0a31', 'Géométrie', 'Orthogonalité et distances dans l''espace', 'Projeté orthogonal', 3, 2),
	('ed01a843-e3ff-4383-8933-fe7593000693', 'Probabilités', 'Dénombrement', 'Principes additif et multiplicatif', 1, 2),
	('f796ffc0-d9cc-496b-97a8-9e10f07e6fc8', 'Probabilités', 'Dénombrement', 'Reconnaître le modèle', 2, 1);

select 1 from public.question_templates where id in (select id from _qn_modeles) order by id for update;

-- ---- 2. Gardes : présence TOUT ou RIEN, brouillon, catégorie et niveau relevés, niveau visé libre
do $garde$
declare v_presents integer; v_conformes integer; v_pris integer;
begin
	select count(*) into v_presents from _qn_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 14) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 14', v_presents;
	end if;
	select count(*) into v_conformes from _qn_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.status = 'draft' and q.theme = r.theme and q.domain = r.domain
	   and q.subdomain = r.subdomain and q.level = r.avant;
	if v_conformes <> v_presents then
		raise exception 'modèles changés depuis le relevé : % sur % conformes', v_conformes, v_presents;
	end if;
	select count(*) into v_pris from _qn_modeles r
	  join public.question_templates q
	    on q.theme = r.theme and q.domain = r.domain and q.subdomain = r.subdomain
	   and q.level = r.apres and q.status = 'published';
	if v_presents > 0 and v_pris <> 0 then
		raise exception 'niveau visé déjà pris par un modèle publié : %', v_pris;
	end if;
end $garde$;

-- ---- 3. Niveaux ----------------------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set level = r.apres
  from _qn_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

-- ---- 4. Vérification : TOUT ou RIEN -------------------------------------------------
do $check$
declare v_presents integer; v_niveaux integer;
begin
	select count(*) into v_presents from _qn_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_niveaux from _qn_modeles r
	  join public.question_templates q on q.id = r.id and q.level = r.apres and q.status = 'draft';
	if v_niveaux <> v_presents then
		raise exception 'lot incohérent : niveaux %/%', v_niveaux, v_presents;
	end if;
end $check$;

drop table _qn_modeles;
