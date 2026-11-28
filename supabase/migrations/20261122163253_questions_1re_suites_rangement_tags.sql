-- ============================================================================
-- Chantier « idees-1re-suites » : nœud et tag de 4 modèles neufs (Première spécialité, suites)
-- ============================================================================
--   - b2aead94 (placer les premiers termes d'une suite) → 1SPE-221, sur « Suites > Généralités sur
--     les suites > représentation graphique », où est posé le point ;
--   - 2938b16b (sens de variation d'une suite géométrique, quelle que soit sa raison) → 1SPE-229,
--     sur la notion « Suites > Suites géométriques », où est posé le point ;
--   - cdb5a1cf (sens de variation par le quotient u(n+1)/u(n)) et 63791bb6 (rang à partir duquel
--     une suite est monotone) → 1SPE-219, sur « Suites > Généralités sur les suites > sens de
--     variation », où est posé le point.
-- Chaque modèle porte UN point (ADR 0020), posé sur son nœud (relevé du 2026-11-22) :
-- question_template_points_check_rules l'exige. Les voisins publiés sont rangés de même (a430a698,
-- baefb288, 8d4e5302 sur « représentation graphique » ; 5042401b sur « Suites géométriques » ;
-- ecba8a9e, 1bbfa5f2 sur « sens de variation »). Ni le contenu, ni le niveau, ni le statut ne
-- changent : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Rangement proposé à David le 2026-11-22, qui a répondu « je suis tes recos » (journal
-- docs/wip/idees-1re-suites-progress.md). Les modèles ont été créés en brouillon le 2026-11-22 par
-- scripts/create-questions.ts (lancé par David), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (4 modèles). Elle est prouvée par
-- tests/integration/questions-1re-suites-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Gardes : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé du 2026-11-22), sinon
-- une retouche faite depuis à la main serait écrasée. Nœud désigné par son chemin, résolu
-- STRICTEMENT ; le point doit être sur ce nœud ou sur sa notion.
--
-- Données d'élèves : aucune (brouillons).
--
-- Accès : personne ne gagne ni ne perd d'accès (question d'accès posée à David le 2026-11-22, qui a
-- répondu « je suis tes recos » : personne). Aucune règle ne change. Effet visible : les 4
-- brouillons apparaissent sous leur nœud et sous leur point dans l'admin ; les élèves ne voient
-- rien avant la publication par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 4 tags et rend les 4 modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values
--                ('2938b16b-952e-4700-95eb-628bf1260c64'::uuid),
--                ('63791bb6-782b-46c4-b57f-7b10921f6b99'::uuid),
--                ('b2aead94-d41d-4f82-bf62-2620a590d403'::uuid),
--                ('cdb5a1cf-f8df-4ab1-9305-4d1b5b790711'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('b2aead94-d41d-4f82-bf62-2620a590d403'::uuid, '1SPE-221'),
-- 	('2938b16b-952e-4700-95eb-628bf1260c64'::uuid, '1SPE-229'),
-- 	('cdb5a1cf-f8df-4ab1-9305-4d1b5b790711'::uuid, '1SPE-219'),
-- 	('63791bb6-782b-46c4-b57f-7b10921f6b99'::uuid, '1SPE-219')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = '1_SPE' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in (
--               'b2aead94-d41d-4f82-bf62-2620a590d403',
--               '2938b16b-952e-4700-95eb-628bf1260c64',
--               'cdb5a1cf-f8df-4ab1-9305-4d1b5b790711',
--               '63791bb6-782b-46c4-b57f-7b10921f6b99');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qc_modeles;
create temporary table _qc_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qc_modeles values
	('b2aead94-d41d-4f82-bf62-2620a590d403', 'Suites', 'Généralités sur les suites', 'représentation graphique', '1SPE-221'),
	('2938b16b-952e-4700-95eb-628bf1260c64', 'Suites', 'Suites géométriques', null, '1SPE-229'),
	('cdb5a1cf-f8df-4ab1-9305-4d1b5b790711', 'Suites', 'Généralités sur les suites', 'sens de variation', '1SPE-219'),
	('63791bb6-782b-46c4-b57f-7b10921f6b99', 'Suites', 'Généralités sur les suites', 'sens de variation', '1SPE-219');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qc_modeles order by id;
select 1 from public.question_templates where id in (select id from _qc_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée ; le point est sur ce nœud ou sur sa notion
alter table _qc_modeles add column noeud uuid, add column point_id uuid;
-- Un chemin ne peut désigner qu'un nœud : l'index classification_nodes_sibling_name_key rend le nom
-- unique parmi les frères.
update _qc_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qc_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qc_modeles r set point_id = p.id
  from public.curriculum_points p, public.classification_nodes x
 where x.id = r.noeud
   and p.grade = '1_SPE' and p.code = r.code and p.archived_at is null
   and p.node_id in (r.noeud, case when x.kind = 'subnotion' then x.parent_id else x.id end);
do $resolution$
begin
	if exists (select 1 from _qc_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qc_modeles where noeud is null),
			(select count(*) from _qc_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qc_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 4) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 4', v_presents;
	end if;
	select count(*) into v_ranges from _qc_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qc_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qc_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qc_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qc_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qc_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qc_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qc_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qc_modeles;
