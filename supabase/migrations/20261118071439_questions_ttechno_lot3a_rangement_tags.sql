-- ============================================================================
-- Chantier « questions-ttechno », lot 3a (propriétés des puissances, exposants relatifs) : nœud
-- et tag de 4 modèles neufs
-- ============================================================================
--   - a5b2c4fa (C1, produit de puissances)      → TTECHNO-034, sur « Fonctions > Fonction exponentielle > propriétés algébriques » ;
--   - ebefd0a9 (C2, quotient de puissances)     → TTECHNO-078, sur « Fonctions > Fonction exponentielle > propriétés algébriques » ;
--   - e52d93b4 (C3, puissance d'une puissance)  → TTECHNO-079, sur « Fonctions > Fonction exponentielle > propriétés algébriques » ;
--   - b14f7169 (C4, a^(-x) = 1/a^x)             → TTECHNO-031, sur « Fonctions > Fonction exponentielle > fonctions x ↦ aˣ ».
-- Chaque modèle va sur le NŒUD de son point (question_template_points_check_rules refuse un tag
-- hors du nœud du point ou de sa notion), et porte UN point (ADR 0020 : au plus un point par
-- programme). Ni le contenu, ni les niveaux (écrits à la création : `T_TECHNO`), ni le statut ne
-- changent : `updated_at` est PRÉSERVÉ. Gabarit : lot 2b (20261117215645).
-- ============================================================================
-- Décision de David le 2026-11-18 (journal docs/wip/questions-ttechno-progress.md § 22, Q19 / Q20 ;
-- § 23 : écriture). Les modèles ont été créés en brouillon le 2026-11-18 par
-- scripts/create-questions.ts (scripts/questions/ttechno-3a-proprietes/, lancé par David après le
-- merge de #2809), qui ne pose ni nœud ni tag.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle
-- et ses vérifications le tolèrent ; elle exige TOUT ou RIEN (4 modèles). Elle est prouvée par
-- tests/integration/questions-ttechno-lot3a-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (sans nœud ni tag) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore SANS nœud et SANS aucun tag (relevé MCP du 2026-11-18),
-- sinon un rangement fait depuis à la main serait écrasé. Nœud désigné par son chemin, résolu
-- STRICTEMENT, et qui doit être celui du point.
--
-- Données d'élèves : aucune (modèles neufs, en brouillon).
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David le 2026-11-18 AVANT le SQL,
-- tranchée par lui le 2026-11-18 : personne pour les brouillons, Tle techno à la publication).
-- Aucune règle ne change. Effet visible : les 4 brouillons apparaissent sous leur nœud et sous leur
-- point dans l'admin ; les élèves ne les voient qu'une fois publiés par David.
--
-- Rollback (aucune donnée d'élève). Il retire les 4 tags et rend les modèles sans nœud. Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || r.id::text, 0))
--   from (values ('a5b2c4fa-8987-4d93-a4f0-0827d91fb389'::uuid),
--                ('b14f7169-969b-45cb-9830-02a543b3c839'::uuid),
--                ('e52d93b4-0b93-48fc-aebf-9f3092dc0177'::uuid),
--                ('ebefd0a9-b634-487f-b811-ee5abcff763c'::uuid)) as r(id)
--  order by r.id;
-- delete from public.question_template_points q
--  using public.curriculum_points p, (values
-- 	('a5b2c4fa-8987-4d93-a4f0-0827d91fb389'::uuid, 'TTECHNO-034'),
-- 	('b14f7169-969b-45cb-9830-02a543b3c839'::uuid, 'TTECHNO-031'),
-- 	('e52d93b4-0b93-48fc-aebf-9f3092dc0177'::uuid, 'TTECHNO-079'),
-- 	('ebefd0a9-b634-487f-b811-ee5abcff763c'::uuid, 'TTECHNO-078')
--  ) as r(id, code)
--  where q.template_id = r.id and p.id = q.point_id and p.grade = 'T_TECHNO' and p.code = r.code;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates set classification_node_id = null
--  where id in ('a5b2c4fa-8987-4d93-a4f0-0827d91fb389',
--               'b14f7169-969b-45cb-9830-02a543b3c839',
--               'e52d93b4-0b93-48fc-aebf-9f3092dc0177',
--               'ebefd0a9-b634-487f-b811-ee5abcff763c');
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en table temporaire ------------------------------------------------
drop table if exists pg_temp._qtt3a_modeles;
create temporary table _qtt3a_modeles (
	id uuid primary key,
	branche text not null,
	notion text not null,
	sous_notion text,
	code text not null
);
insert into _qtt3a_modeles values
	('a5b2c4fa-8987-4d93-a4f0-0827d91fb389', 'Fonctions', 'Fonction exponentielle', 'propriétés algébriques', 'TTECHNO-034'),
	('ebefd0a9-b634-487f-b811-ee5abcff763c', 'Fonctions', 'Fonction exponentielle', 'propriétés algébriques', 'TTECHNO-078'),
	('e52d93b4-0b93-48fc-aebf-9f3092dc0177', 'Fonctions', 'Fonction exponentielle', 'propriétés algébriques', 'TTECHNO-079'),
	('b14f7169-969b-45cb-9830-02a543b3c839', 'Fonctions', 'Fonction exponentielle', 'fonctions x ↦ aˣ', 'TTECHNO-031');

-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _qtt3a_modeles order by id;
select 1 from public.question_templates where id in (select id from _qtt3a_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
-- Le nœud est la notion (sous_notion nulle) ou la sous-notion désignée, et doit être celui du point
alter table _qtt3a_modeles add column noeud uuid, add column point_id uuid;
update _qtt3a_modeles r set noeud = n.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and r.sous_notion is null;
update _qtt3a_modeles r set noeud = s.id
  from public.classification_nodes b
  join public.classification_nodes n on n.parent_id = b.id and n.kind = 'notion' and n.archived_at is null
  join public.classification_nodes s on s.parent_id = n.id and s.kind = 'subnotion' and s.archived_at is null
 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche
   and n.name = r.notion and s.name = r.sous_notion;
update _qtt3a_modeles r set point_id = p.id
  from public.curriculum_points p
 where p.grade = 'T_TECHNO' and p.code = r.code and p.archived_at is null and p.node_id = r.noeud;
do $resolution$
begin
	if exists (select 1 from _qtt3a_modeles where noeud is null or point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s), % point(s)',
			(select count(*) from _qtt3a_modeles where noeud is null),
			(select count(*) from _qtt3a_modeles where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, sans nœud, sans aucun tag ----------------------
do $garde$
declare v_presents integer; v_ranges integer; v_tags integer;
begin
	select count(*) into v_presents from _qtt3a_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, 4) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur 4', v_presents;
	end if;
	select count(*) into v_ranges from _qtt3a_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is not null;
	if v_ranges <> 0 then
		raise exception 'modèles déjà rangés depuis le relevé : %', v_ranges;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _qtt3a_modeles r on r.id = q.template_id;
	if v_tags <> 0 then
		raise exception 'modèles déjà tagués depuis le relevé : % tag(s)', v_tags;
	end if;
end $garde$;

-- ---- 4. Rangement, puis tags ---------------------------------------------------------
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = r.noeud
  from _qtt3a_modeles r
 where q.id = r.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select r.id, r.point_id
  from _qtt3a_modeles r
  join public.question_templates q on q.id = r.id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer;
begin
	select count(*) into v_presents from _qtt3a_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _qtt3a_modeles r
	  join public.question_templates q on q.id = r.id and q.classification_node_id = r.noeud;
	select count(*), count(*) filter (where exists (select 1 from _qtt3a_modeles r
	                                                where r.id = q.template_id and r.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _qtt3a_modeles m on m.id = q.template_id;
	if v_noeuds <> v_presents or v_tags <> v_presents or v_total <> v_presents then
		raise exception 'lot incohérent : nœuds %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_tags, v_presents, v_total;
	end if;
end $check$;

drop table _qtt3a_modeles;
