-- ============================================================================
-- Chantier « questions-ce1 », lot 3 : niveau de 4 brouillons dans leur catégorie
-- ============================================================================
-- La simulation de publication du 2026-10-29 (scripts/questions/publier-lot.ts) refuse 3 des 9
-- brouillons : une session 6e a publié le même jour des modèles aux niveaux qu'ils occupaient
-- (un seul modèle publié par catégorie et par niveau, idx_question_templates_unique_category).
-- Ils prennent le premier niveau libre, et la soustraction suit l'addition :
--   - af373581 (Comparer des fractions de même dénominateur), Fractions / Apprivoiser / Comparer : 6 → 9 ;
--   - 643d294c (Comparer des fractions de numérateur 1), Fractions / Apprivoiser / Comparer : 7 → 10 ;
--   - 00ac9765 (Additionner des fractions de même dénominateur), Fractions / Calculer /
--     Addition et Soustraction : 13 → 15 ;
--   - 29e7e3c6 (Soustraire des fractions de même dénominateur), même catégorie : 14 → 16 (il
--     n'était pas refusé ; déplacé pour rester juste après l'addition).
-- Le niveau n'est qu'un ordre d'affichage dans la catégorie ; aucun modèle publié n'est touché.
-- Ni le contenu, ni le nœud, ni les tags, ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- Les fichiers scripts/questions/ce1-3/ portent les mêmes niveaux (clé de create-questions et
-- de publier-lot : titre, thème, domaine, sous-domaine, niveau).
-- ============================================================================
-- Décision de David le 2026-10-29 (journal docs/wip/questions-ce1-progress.md) : 9, 10, 15, 16,
-- sans renuméroter les modèles publiés.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (4 modèles). Elle est prouvée par
-- tests/integration/questions-ce1-lot3-niveaux.test.ts, qui fabrique des copies des
-- identifiants de la prod (catégorie et niveau relevés) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore en BROUILLON, dans sa catégorie et à son niveau relevés
-- le 2026-10-29 (MCP) ; aucun modèle publié ne doit occuper le niveau visé.
--
-- Données d'élèves : aucune (brouillons).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-10-29 AVANT le SQL,
-- tranchée par lui le 2026-10-29 : personne). Aucune règle ne change.
--
-- Rollback (aucune donnée d'élève). Il rend aux 4 modèles leur niveau d'avant. Garde : il refuse
-- si un modèle n'est plus en brouillon ou n'est plus au niveau posé par la migration. Bloc éprouvé
-- par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou
-- l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select 1 from public.question_templates
--  where id in ('00ac9765-28de-4fb0-b108-f46c70efb82b', '29e7e3c6-4f48-4ef7-8914-ce712636f7a2',
--               '643d294c-8228-4bef-8986-1eee2c252a72', 'af373581-11de-4246-b50d-21cb18f9e7c4')
--  order by id for update;
-- do $garde_rollback$
-- begin
-- 	if (select count(*) from public.question_templates q
-- 	      join (values ('00ac9765-28de-4fb0-b108-f46c70efb82b'::uuid, 15),
-- 	                   ('29e7e3c6-4f48-4ef7-8914-ce712636f7a2'::uuid, 16),
-- 	                   ('643d294c-8228-4bef-8986-1eee2c252a72'::uuid, 10),
-- 	                   ('af373581-11de-4246-b50d-21cb18f9e7c4'::uuid, 9)) as r(id, niveau)
-- 	        on r.id = q.id and q.level = r.niveau and q.status = 'draft') <> 4 then
-- 		raise exception 'rollback refusé : un modèle a changé depuis la migration';
-- 	end if;
-- end $garde_rollback$;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates q set level = r.niveau
--   from (values ('00ac9765-28de-4fb0-b108-f46c70efb82b'::uuid, 13),
--                ('29e7e3c6-4f48-4ef7-8914-ce712636f7a2'::uuid, 14),
--                ('643d294c-8228-4bef-8986-1eee2c252a72'::uuid, 7),
--                ('af373581-11de-4246-b50d-21cb18f9e7c4'::uuid, 6)) as r(id, niveau)
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
	('00ac9765-28de-4fb0-b108-f46c70efb82b', 'Fractions', 'Calculer', 'Addition et Soustraction', 13, 15),
	('29e7e3c6-4f48-4ef7-8914-ce712636f7a2', 'Fractions', 'Calculer', 'Addition et Soustraction', 14, 16),
	('643d294c-8228-4bef-8986-1eee2c252a72', 'Fractions', 'Apprivoiser', 'Comparer', 7, 10),
	('af373581-11de-4246-b50d-21cb18f9e7c4', 'Fractions', 'Apprivoiser', 'Comparer', 6, 9);

select 1 from public.question_templates where id in (select id from _qn_modeles) order by id for update;

-- ---- 2. Gardes : présence TOUT ou RIEN, brouillon, catégorie et niveau relevés, niveau visé libre
do $garde$
declare v_presents integer; v_conformes integer; v_pris integer;
begin
	select count(*) into v_presents from _qn_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 4) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 4', v_presents;
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
