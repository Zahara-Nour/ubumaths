-- ============================================================================
-- Chantier « questions-tspe-demonstrations », lot 15 (approfondissements : probabilités et
-- statistiques) : 1 sous-notion neuve, nœud et tag des 5 modèles
-- ============================================================================
--   une sous-notion NEUVE, en fin de sa notion (D3, Q4 a) :
--     « Probabilités > Autres lois > loi de Poisson » ;
--   les 5 brouillons du lot 15, créés sans nœud ni tag, vont sur leur sous-notion, tag posé :
--     8d03f8c1 Loi de Poisson, limite de lois binomiales
--              → Probabilités > Autres lois > loi de Poisson (neuve), TSPE-517
--     81353e4d E(XY) = E(X)E(Y) et variance d'une somme
--              → Probabilités > Sommes et concentration > espérance et variance d'une somme, TSPE-529
--     38c8774e Estimer une proportion par l'inégalité de Bienaymé-Tchebychev
--              → Statistiques > Échantillonnage > estimation d'une proportion, TSPE-537
--     7f9366af Marche aléatoire et loi binomiale
--              → Probabilités > Probabilités conditionnelles > épreuves indépendantes successives, TSPE-538
--     f55ce309 Concentration : sondage, sex ratio, demi-vie
--              → Probabilités > Sommes et concentration > loi des grands nombres, TSPE-539
-- Le point 517 reste sur sa notion : question_template_points_check_rules accepte un tag dont le
-- point est sur le nœud du modèle OU sur sa notion, et au plus UN point par programme (ADR 0020).
-- Ni le contenu, ni les niveaux ({T_SPE}), ni le statut ne changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 des approfondissements validée par David le 2026-11-13 (journal
-- docs/wip/questions-tspe-demonstrations-progress.md, § 35, D3). Les modèles ont été créés en
-- brouillon par David le 2026-11-14 avec scripts/create-questions.ts
-- (scripts/questions/tspe-approfondissements-15/, #2654), qui ne pose ni nœud ni tag. Relevé de la
-- prod du 2026-11-14 (MCP) : 5 brouillons en {T_SPE}, sans nœud ni tag ; TSPE-517 sur la notion
-- « Autres lois », 529, 537, 538 et 539 sur la sous-notion visée ; aucun modèle tagué sur ces
-- points ; la sous-notion neuve n'existe pas (ni active, ni archivée ; Autres lois a 8 sous-notions).
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle et
-- ses vérifications le tolèrent (la sous-notion, elle, est créée partout) ; elle exige TOUT ou RIEN
-- (5 modèles). Elle est prouvée par
-- tests/integration/questions-tspe-approfondissements-15-rangement-tags.test.ts, qui fabrique des
-- copies des identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Gardes (avant toute écriture) : chaque modèle doit être encore SANS nœud et SANS aucun tag
-- (relevé du 2026-11-14), sinon un rangement fait depuis à la main serait écrasé ; la sous-notion
-- neuve ne doit pas exister (même nom, casse ignorée, sous la même notion). Nœuds désignés par leur
-- chemin, résolus STRICTEMENT ; chaque point doit être sur le nœud de son modèle ou sur sa notion.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon ; sous-notion neuve).
--
-- Accès : personne ne gagne ni ne perd d'accès (brouillons : admin et prof ; leurs tags, pas leur
-- contenu, lisibles par tout compte connecté, comme pour tout modèle ; l'arbre des notions est de
-- lecture publique, la sous-notion neuve aussi, comme toutes). Question posée à David AVANT le SQL
-- (phase 0 des approfondissements, § 35, Q6), tranchée par lui le 2026-11-13 (D3) : personne. Aucune
-- règle (policy) ne change. Les élèves ne voient les modèles qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 5 tags, rend les modèles sans nœud et supprime la
-- sous-notion neuve. Garde : il refuse si un modèle n'est plus sur le nœud laissé par la migration
-- ou porte d'autres tags, ou si la sous-notion neuve porte autre chose (modèle, point, enfant) que
-- les modèles du lot. Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._qta15_retour;
-- create temporary table _qta15_retour (
-- 	id uuid primary key, branche text not null, notion text not null, sous_notion text not null,
-- 	grade text not null, code text not null, neuve boolean not null, noeud uuid
-- );
-- insert into _qta15_retour values
-- 	('8d03f8c1-0a03-400e-9e1b-fa8ba0879579', 'Probabilités', 'Autres lois', 'loi de Poisson', 'T_SPE', 'TSPE-517', true, null),
-- 	('81353e4d-b232-417e-a8f6-c10244f8b4a3', 'Probabilités', 'Sommes et concentration', 'espérance et variance d''une somme', 'T_SPE', 'TSPE-529', false, null),
-- 	('38c8774e-6352-4cc3-974a-ed2f6e19636c', 'Statistiques', 'Échantillonnage', 'estimation d''une proportion', 'T_SPE', 'TSPE-537', false, null),
-- 	('7f9366af-1eee-44c2-9afc-681370c0a9c7', 'Probabilités', 'Probabilités conditionnelles', 'épreuves indépendantes successives', 'T_SPE', 'TSPE-538', false, null),
-- 	('f55ce309-ec88-4b89-86d6-3297a75aa269', 'Probabilités', 'Sommes et concentration', 'loi des grands nombres', 'T_SPE', 'TSPE-539', false, null);
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _qta15_retour order by id;
-- select 1 from public.question_templates where id in (select id from _qta15_retour) order by id for update;
-- update _qta15_retour r set noeud = s.id
--   from public.classification_nodes b
--   join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
--   join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
--  where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
--    and n.name = r.notion and s.name = r.sous_notion;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer;
-- begin
-- 	if exists (select 1 from _qta15_retour where noeud is null) then
-- 		raise exception 'rollback : sous-notions introuvables : %', (select count(*) from _qta15_retour where noeud is null);
-- 	end if;
-- 	select count(*), count(*) filter (where q.classification_node_id = r.noeud)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q join _qta15_retour r on r.id = q.id;
-- 	if v_presents not in (0, 5) then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur 5', v_presents;
-- 	end if;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur % ne sont plus sur le nœud de la migration', v_presents - v_intacts, v_presents;
-- 	end if;
-- 	select count(*), count(*) filter (where p.grade = r.grade and p.code = r.code)
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join _qta15_retour r on r.id = q.template_id
-- 	  join public.curriculum_points p on p.id = q.point_id;
-- 	if v_tags <> v_total or v_total <> v_presents then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, v_presents;
-- 	end if;
-- 	if exists (select 1 from public.question_templates q
-- 	            where q.classification_node_id in (select noeud from _qta15_retour where neuve)
-- 	              and q.id not in (select id from _qta15_retour))
-- 	   or exists (select 1 from public.classification_nodes c where c.parent_id in (select noeud from _qta15_retour where neuve))
-- 	   or exists (select 1 from public.curriculum_points p where p.node_id in (select noeud from _qta15_retour where neuve)) then
-- 		raise exception 'rollback : une sous-notion neuve porte autre chose que les modèles du lot';
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using _qta15_retour r where q.template_id = r.id;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (select id from _qta15_retour);
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- delete from public.classification_nodes where id in (select noeud from _qta15_retour where neuve);
-- drop table _qta15_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires ----------------------------------------------
drop table if exists pg_temp._qta15_tags;
drop table if exists pg_temp._qta15_modeles;
drop table if exists pg_temp._qta15_neuves;
create temporary table _qta15_neuves (
	branche text not null,
	notion text not null,
	sous_notion text not null,
	primary key (branche, notion, sous_notion)
);
insert into _qta15_neuves values
	('Probabilités', 'Autres lois', 'loi de Poisson');
create temporary table _qta15_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text not null
);
insert into _qta15_modeles values
	('8d03f8c1-0a03-400e-9e1b-fa8ba0879579', 'Probabilités', 'Autres lois', 'loi de Poisson'),
	('81353e4d-b232-417e-a8f6-c10244f8b4a3', 'Probabilités', 'Sommes et concentration', 'espérance et variance d''une somme'),
	('38c8774e-6352-4cc3-974a-ed2f6e19636c', 'Statistiques', 'Échantillonnage', 'estimation d''une proportion'),
	('7f9366af-1eee-44c2-9afc-681370c0a9c7', 'Probabilités', 'Probabilités conditionnelles', 'épreuves indépendantes successives'),
	('f55ce309-ec88-4b89-86d6-3297a75aa269', 'Probabilités', 'Sommes et concentration', 'loi des grands nombres');
create temporary table _qta15_tags (
	id uuid not null references _qta15_modeles (id),
	grade text not null,
	code text not null,
	primary key (id, grade)
);
insert into _qta15_tags values
	('8d03f8c1-0a03-400e-9e1b-fa8ba0879579', 'T_SPE', 'TSPE-517'),
	('81353e4d-b232-417e-a8f6-c10244f8b4a3', 'T_SPE', 'TSPE-529'),
	('38c8774e-6352-4cc3-974a-ed2f6e19636c', 'T_SPE', 'TSPE-537'),
	('7f9366af-1eee-44c2-9afc-681370c0a9c7', 'T_SPE', 'TSPE-538'),
	('f55ce309-ec88-4b89-86d6-3297a75aa269', 'T_SPE', 'TSPE-539');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qta15_modeles order by id;
select 1 from public.question_templates where id in (select id from _qta15_modeles) order by id for update;

-- ---- 2. Gardes (avant toute écriture) : présence TOUT ou RIEN, sans nœud, sans tag ; ---------
-- notions présentes, sous-notions neuves absentes
alter table _qta15_neuves add column notion_id uuid;
update _qta15_neuves r set notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion;
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer; v_existantes integer;
begin
	if exists (select 1 from _qta15_neuves where notion_id is null) then
		raise exception 'notions introuvables : %', (select count(*) from _qta15_neuves where notion_id is null);
	end if;
	select count(*) into v_existantes from _qta15_neuves r
	  join public.classification_nodes s on s.parent_id = r.notion_id and lower(s.name) = lower(r.sous_notion);
	if v_existantes <> 0 then
		raise exception 'sous-notions déjà présentes : %', v_existantes;
	end if;
	select count(*) into v_presents from _qta15_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 5) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 5', v_presents;
	end if;
	select count(*) into v_ranges from _qta15_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qta15_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 3. Les sous-notions neuves, en fin de leur notion -----------------------------------
insert into public.classification_nodes (kind, parent_id, name, position)
select 'subnotion', r.notion_id, r.sous_notion,
       (select coalesce(max(s.position), -1) from public.classification_nodes s where s.parent_id = r.notion_id)
       + row_number() over (partition by r.notion_id order by r.sous_notion desc)
  from _qta15_neuves r;

-- ---- 4. Résolution STRICTE des chemins et des points -----------------------------------
-- Le nœud est la sous-notion désignée ; chaque point doit être sur ce nœud ou sur sa notion
alter table _qta15_modeles add column noeud uuid;
alter table _qta15_modeles add column notion_id uuid;
alter table _qta15_tags add column point_id uuid;
update _qta15_modeles r set noeud = s.id, notion_id = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qta15_tags t set point_id = p.id
  from _qta15_modeles r, public.curriculum_points p
 where r.id = t.id and p.grade = t.grade and p.code = t.code and p.archived_at is null
   and p.node_id in (r.noeud, r.notion_id);
do $resolution$
begin
	if exists (select 1 from _qta15_modeles where noeud is null)
	   or exists (select 1 from _qta15_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qta15_modeles where noeud is null),
			(select count(*) from _qta15_tags where point_id is null);
	end if;
end $resolution$;

-- ---- 5. Rangement, puis tags (le trigger des tags lit le nœud du modèle) -----------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qta15_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.id, t.point_id
  from _qta15_tags t
  join public.question_templates q on q.id = t.id;

-- ---- 6. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_attendus integer; v_total integer; v_tags integer;
        v_neuves integer;
begin
	select count(*) into v_neuves from _qta15_neuves r
	  join public.classification_nodes s on s.parent_id = r.notion_id and s.kind = 'subnotion'
	   and s.archived_at is null and s.name = r.sous_notion;
	select count(*) into v_presents from _qta15_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qta15_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*) into v_attendus from _qta15_tags t join public.question_templates q on q.id = t.id;
	select count(*), count(*) filter (where exists (select 1 from _qta15_tags t
	                                                where t.id = q.template_id and t.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qta15_modeles m on m.id = q.template_id;
	if v_neuves <> 1 or v_noeuds <> v_presents or v_tags <> v_attendus or v_total <> v_attendus then
		raise exception 'lot incohérent : sous-notions %/1, nœuds %/%, tags du lot %/%, tags en base %',
			v_neuves, v_noeuds, v_presents, v_tags, v_attendus, v_total;
	end if;
end $check$;

drop table _qta15_tags;
drop table _qta15_modeles;
drop table _qta15_neuves;
