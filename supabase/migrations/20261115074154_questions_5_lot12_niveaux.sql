-- ============================================================================
-- Chantier « questions-5 », lot 12 « Droite graduée et repère » : niveau de deux brouillons dans leur nœud
-- ============================================================================
-- d4f38d30 (Lire les coordonnées d'un point, 5-047) et d4d56c1b (Placer un point de coordonnées
-- données, 5-128), brouillons du chantier automatismes-1spe (#2462, rangés par #2474), sont tous
-- deux au niveau 1 de « Géométrie > Repérage et déplacements > coordonnées dans le plan ». Le lot 12
-- pose sur ce nœud la droite graduée (a5418354 niveau 1, e4d1ea01 niveau 2) : d4f38d30 passe au
-- niveau 3, d4d56c1b au niveau 4 (la droite avant le plan).
-- Le niveau n'est qu'un ordre d'affichage dans le nœud. Ni le contenu, ni le nœud, ni les tags,
-- ni le statut ne changent : `updated_at` est PRÉSERVÉ. Les fichiers
-- scripts/questions/automatismes-2de-geometrie/01, 02 portent les mêmes niveaux (#2677) :
-- `create-questions --mettre-a-jour` ne met pas le niveau à jour.
-- ============================================================================
-- Décision de David le 2026-11-15 (journal docs/wip/questions-5-progress.md, § 27, 27 bis).
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle et
-- ses vérifications le tolèrent ; elle exige TOUT ou RIEN (2 modèles). Elle est prouvée par
-- tests/integration/questions-5-lot12-niveaux.test.ts, qui fabrique des copies des identifiants
-- de la prod (nœud, niveau et statut relevés) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore en BROUILLON, sur son nœud (désigné par son chemin, résolu
-- STRICTEMENT) et à son niveau relevés le 2026-11-15 (MCP).
--
-- Données d'élèves : aucune (brouillons).
--
-- Accès (question tranchée par David le 2026-11-15, phase 0 du lot 12, § 27) : personne ne gagne ni
-- ne perd d'accès. Aucune règle (policy) ne change.
--
-- Rollback (aucune donnée d'élève). Il rend aux modèles leur niveau d'avant. Garde : il refuse si un
-- modèle n'est plus en brouillon ou n'est plus au niveau posé par la migration. Bloc éprouvé par le
-- test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur
-- SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select 1 from public.question_templates
--  where id in ('d4f38d30-3575-472f-827c-cc2d8ad6c651', 'd4d56c1b-d411-49fc-a314-dc2bf14bf05e') order by id for update;
-- do $garde_rollback$
-- declare v_presents integer; v_conformes integer;
-- begin
-- 	select count(*) into v_presents from public.question_templates
-- 	 where id in ('d4f38d30-3575-472f-827c-cc2d8ad6c651', 'd4d56c1b-d411-49fc-a314-dc2bf14bf05e');
-- 	select count(*) into v_conformes from public.question_templates
-- 	 where status = 'draft'
-- 	   and ((id = 'd4f38d30-3575-472f-827c-cc2d8ad6c651' and level = 3)
-- 	     or (id = 'd4d56c1b-d411-49fc-a314-dc2bf14bf05e' and level = 4));
-- 	if v_conformes <> v_presents then
-- 		raise exception 'rollback refusé : % modèle(s) sur % ont encore le niveau de la migration', v_conformes, v_presents;
-- 	end if;
-- end $garde_rollback$;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set level = 1
--  where id in ('d4f38d30-3575-472f-827c-cc2d8ad6c651', 'd4d56c1b-d411-49fc-a314-dc2bf14bf05e');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les lignes des modèles sont verrouillées après l'étape 1.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._q5l12n_modeles;
create temporary table _q5l12n_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text not null,
	avant integer not null,
	apres integer not null
);
insert into _q5l12n_modeles values
	('d4f38d30-3575-472f-827c-cc2d8ad6c651', 'Géométrie', 'Repérage et déplacements', 'coordonnées dans le plan', 1, 3),
	('d4d56c1b-d411-49fc-a314-dc2bf14bf05e', 'Géométrie', 'Repérage et déplacements', 'coordonnées dans le plan', 1, 4);

select 1 from public.question_templates where id in (select id from _q5l12n_modeles) order by id for update;

-- ---- 2. Nœud de chaque modèle, résolu STRICTEMENT par son chemin ------------------------
drop table if exists pg_temp._q5l12n_noeuds;
create temporary table _q5l12n_noeuds as
	select r.id, s.id as noeud
	  from _q5l12n_modeles r
	  left join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
	  left join public.classification_nodes n on n.kind = 'notion' and n.parent_id = b.id and n.archived_at is null and n.name = r.notion
	  left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = n.id and s.archived_at is null and s.name = r.sous_notion;
-- Clé : deux nœuds homonymes sous un même parent dupliqueraient les lignes et feraient échouer ici.
alter table _q5l12n_noeuds add primary key (id);

-- ---- 3. Gardes : présence TOUT ou RIEN, nœud trouvé, brouillon, nœud et niveau relevés ------
do $garde$
declare v_presents integer; v_conformes integer;
begin
	select count(*) into v_presents from _q5l12n_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 2) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 2', v_presents;
	end if;
	if v_presents > 0 and exists (select 1 from _q5l12n_noeuds where noeud is null) then
		raise exception 'nœud introuvable par son chemin';
	end if;
	select count(*) into v_conformes from _q5l12n_modeles r
	  join _q5l12n_noeuds x on x.id = r.id
	  join public.question_templates q on q.id = r.id
	 where q.status = 'draft' and q.classification_node_id = x.noeud and q.level = r.avant;
	if v_conformes <> v_presents then
		raise exception 'modèles changés depuis le relevé : % sur % conformes', v_conformes, v_presents;
	end if;
end $garde$;

-- ---- 4. Niveaux ----------------------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set level = r.apres
  from _q5l12n_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

-- ---- 5. Vérification : TOUT ou RIEN -------------------------------------------------
do $check$
declare v_presents integer; v_niveaux integer;
begin
	select count(*) into v_presents from _q5l12n_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_niveaux from _q5l12n_modeles r
	  join public.question_templates q on q.id = r.id and q.level = r.apres and q.status = 'draft';
	if v_niveaux <> v_presents then
		raise exception 'lot incohérent : niveaux %/%', v_niveaux, v_presents;
	end if;
end $check$;

drop table _q5l12n_noeuds;
drop table _q5l12n_modeles;
