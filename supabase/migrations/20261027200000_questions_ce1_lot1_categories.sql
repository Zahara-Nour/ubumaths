-- ============================================================================
-- Chantier « questions-ce1 », lot 1 : 3 modèles publiés quittent les catégories « astucieuses »
-- ============================================================================
-- Ajouter ou soustraire des dizaines ou des centaines entières n'a rien d'astucieux : ces modèles
-- rejoignent la catégorie où vivent déjà « Ajouter 10 » et « Soustraire 10 » (CP) :
--   - 240bb640 (Ajouter des centaines entières) : Entiers / Additionner / Somme astucieuse, 11
--     → Entiers / Additionner / Somme, 20 ;
--   - cb08bf78 (Ajouter des dizaines entières) : Entiers / Additionner / Somme astucieuse, 12
--     → Entiers / Additionner / Somme, 21 ;
--   - 0b490331 (Soustraire des dizaines entières) : Entiers / Soustraire / Différence astucieuse, 8
--     → Entiers / Soustraire / Différence, 15.
-- ebfa8511 (Soustraire 9) reste en « Différence astucieuse » (− 10 + 1 est bien une astuce).
-- Seuls `subdomain` et `level` changent (catégorie d'affichage du choix des questions) ; ni le
-- contenu, ni le nœud, ni les tags, ni le statut : `updated_at` est PRÉSERVÉ. Les fichiers
-- scripts/questions/ce1-1/ portent la même catégorie (clé de create-questions et de publier-lot).
-- ============================================================================
-- Décision de David le 2026-10-27 (journal docs/wip/questions-ce1-progress.md § 6, « go »).
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (3 modèles). Elle est prouvée par
-- tests/integration/questions-ce1-lot1-categories.test.ts, qui fabrique des copies des
-- identifiants de la prod (catégorie, niveau et statut relevés) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore PUBLIÉ, dans sa catégorie et à son niveau relevés le
-- 2026-10-27 (MCP) ; aucun autre modèle publié ne doit occuper la catégorie et le niveau visés
-- (idx_question_templates_unique_category).
--
-- Données d'élèves (MCP, 2026-10-27) : 0 tentative de compétence, 0 carte SRS, 0 activité de
-- journal, 0 question d'évaluation ; aucune série, session ni évaluation ne nomme ces catégories.
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-10-27 AVANT le SQL,
-- tranchée par lui le 2026-10-27 : personne). Aucune règle ne change.
--
-- Rollback (aucune donnée d'élève). Il rend aux 3 modèles leur catégorie et leur niveau d'avant.
-- Garde : il refuse si un modèle n'est plus publié dans la catégorie et au niveau posés par la
-- migration. Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select 1 from public.question_templates
--  where id in ('0b490331-eda5-4201-b4be-a77e5ebe2229', '240bb640-0548-4ff2-ac47-1b182ca3fcc2',
--               'cb08bf78-8c21-4c48-83da-8214dbc2d7a2')
--  order by id for update;
-- do $garde_rollback$
-- begin
-- 	if (select count(*) from public.question_templates q
-- 	      join (values ('0b490331-eda5-4201-b4be-a77e5ebe2229'::uuid, 'Différence', 15),
-- 	                   ('240bb640-0548-4ff2-ac47-1b182ca3fcc2'::uuid, 'Somme', 20),
-- 	                   ('cb08bf78-8c21-4c48-83da-8214dbc2d7a2'::uuid, 'Somme', 21)) as r(id, sous, niveau)
-- 	        on r.id = q.id and q.subdomain = r.sous and q.level = r.niveau and q.status = 'published') <> 3 then
-- 		raise exception 'rollback refusé : un modèle a changé depuis la migration';
-- 	end if;
-- end $garde_rollback$;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates q set subdomain = r.sous, level = r.niveau
--   from (values ('0b490331-eda5-4201-b4be-a77e5ebe2229'::uuid, 'Différence astucieuse', 8),
--                ('240bb640-0548-4ff2-ac47-1b182ca3fcc2'::uuid, 'Somme astucieuse', 11),
--                ('cb08bf78-8c21-4c48-83da-8214dbc2d7a2'::uuid, 'Somme astucieuse', 12)) as r(id, sous, niveau)
--  where q.id = r.id;
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les lignes des modèles sont verrouillées après l'étape 1.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qk_modeles;
create temporary table _qk_modeles (
	id uuid primary key,
	theme text not null,
	domain text not null,
	sous_avant text not null,
	niveau_avant integer not null,
	sous_apres text not null,
	niveau_apres integer not null
);
insert into _qk_modeles values
	('0b490331-eda5-4201-b4be-a77e5ebe2229', 'Entiers', 'Soustraire', 'Différence astucieuse', 8, 'Différence', 15),
	('240bb640-0548-4ff2-ac47-1b182ca3fcc2', 'Entiers', 'Additionner', 'Somme astucieuse', 11, 'Somme', 20),
	('cb08bf78-8c21-4c48-83da-8214dbc2d7a2', 'Entiers', 'Additionner', 'Somme astucieuse', 12, 'Somme', 21);

select 1 from public.question_templates where id in (select id from _qk_modeles) order by id for update;

-- ---- 2. Gardes : présence TOUT ou RIEN, publié, catégorie et niveau relevés, place visée libre
do $garde$
declare v_presents integer; v_conformes integer; v_pris integer;
begin
	select count(*) into v_presents from _qk_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 3) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 3', v_presents;
	end if;
	select count(*) into v_conformes from _qk_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.status = 'published' and q.theme = r.theme and q.domain = r.domain
	   and q.subdomain = r.sous_avant and q.level = r.niveau_avant;
	if v_conformes <> v_presents then
		raise exception 'modèles changés depuis le relevé : % sur % conformes', v_conformes, v_presents;
	end if;
	select count(*) into v_pris from _qk_modeles r
	  join public.question_templates q
	    on q.theme = r.theme and q.domain = r.domain and q.subdomain = r.sous_apres
	   and q.level = r.niveau_apres and q.status = 'published' and q.id <> r.id;
	if v_presents > 0 and v_pris <> 0 then
		raise exception 'place visée déjà prise par un modèle publié : %', v_pris;
	end if;
end $garde$;

-- ---- 3. Catégorie et niveau ----------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set subdomain = r.sous_apres, level = r.niveau_apres
  from _qk_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

-- ---- 4. Vérification : TOUT ou RIEN -------------------------------------------------
do $check$
declare v_presents integer; v_ok integer;
begin
	select count(*) into v_presents from _qk_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_ok from _qk_modeles r
	  join public.question_templates q on q.id = r.id and q.subdomain = r.sous_apres
	   and q.level = r.niveau_apres and q.status = 'published';
	if v_ok <> v_presents then
		raise exception 'lot incohérent : % sur %', v_ok, v_presents;
	end if;
end $check$;

drop table _qk_modeles;
