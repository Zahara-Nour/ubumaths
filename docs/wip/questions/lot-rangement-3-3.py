"""Lot 3 (Thalès et trigonométrie) de la 3e, rangement : migration 20261030002300_questions_3_lot3_rangement_tags + fixture du test.

Lit l'instantané `etat-prod-2026-10-29-3e-lot3/` (releve-prod-3.ts) et applique les décisions de
David du 2026-10-29 (journal `docs/wip/questions-3-progress.md` § 10) sur 6 modèles : les 6
brouillons du lot 3 (scripts/questions/3-lot-3/, #1981), créés sans nœud ni tag, chacun sur le nœud
de son point, tag posé. Gabarit : lot-rangement-3-2.py.

Un tag peut être retiré (avant seulement), posé (après seulement) ou GARDÉ (avant et après).

Vérifie avant d'écrire : modèles aux niveaux et au statut relevés, tags relevés = ceux du lot, nœuds
actifs, point de chaque tag d'après sur le nœud d'arrivée ou sa notion.

    python3 docs/wip/questions/lot-rangement-3-3.py
"""

import json
import subprocess
from pathlib import Path

ICI = Path(__file__).parent
RACINE = ICI.parents[2]
ETAT = ICI / 'etat-prod-2026-10-29-3e-lot3'
MIGRATION = RACINE / 'supabase/migrations/20261030002300_questions_3_lot3_rangement_tags.sql'
FIXTURE = RACINE / 'tests/integration/fixtures/questions-3-lot3-rangement.json'

modeles = {t['id'][:8]: t for t in json.loads((ETAT / 'templates.json').read_text())}
noeuds = {n['id']: n for n in json.loads((ETAT / 'nodes.json').read_text())}
points = {(p['grade'], p['code']): p for p in json.loads((ETAT / 'points.json').read_text())}
points_par_id = {p['id']: p for p in points.values()}
tags_releves = {
	(t['template_id'], points_par_id[t['point_id']]['grade'], points_par_id[t['point_id']]['code'])
	for t in json.loads((ETAT / 'tags.json').read_text())
}


def chemin(noeud_id: str | None) -> tuple[str | None, str | None, str | None]:
	"""(branche, notion, sous-notion ou None) d'un nœud actif ; (None, None, None) sans nœud."""
	if noeud_id is None:
		return (None, None, None)
	x = noeuds[noeud_id]
	assert not x['archived_at'], noeud_id
	if x['kind'] == 'notion':
		n, s = x, None
	else:
		assert x['kind'] == 'subnotion', noeud_id
		n, s = noeuds[x['parent_id']], x
	b = noeuds[n['parent_id']]
	assert b['kind'] == 'branch' and b['parent_id'] is None and not (b['archived_at'] or n['archived_at'])
	return (b['name'], n['name'], s['name'] if s else None)


def notion_de(noeud_id: str) -> str:
	n = noeuds[noeud_id]
	return n['parent_id'] if n['kind'] == 'subnotion' else noeud_id


def grade_de(code: str) -> str:
	return code.rsplit('-', 1)[0]


def noeud_par_chemin(branche: str, notion: str, sous_notion: str) -> str:
	"""Identifiant du nœud actif de ce chemin (unique)."""
	trouves = [i for i, x in noeuds.items() if not x['archived_at'] and x['kind'] != 'branch'
	           and chemin(i) == (branche, notion, sous_notion)]
	assert len(trouves) == 1, (branche, notion, sous_notion, trouves)
	return trouves[0]


# court → (niveaux d'avant, niveaux d'après, statut (inchangé), tags d'avant, tags d'après, nœud
# d'après : None = celui du point du premier tag d'après, s'il n'y vit pas déjà).
DECISIONS = {
	# § 10 : les 6 brouillons du lot 3, sans nœud ni tag, chacun sur le nœud de son point
	'16478dab': (['3'], ['3'], 'draft', [], ['3-022'], None),
	'034e6b74': (['3'], ['3'], 'draft', [], ['3-059'], None),
	'f55d07b0': (['3'], ['3'], 'draft', [], ['3-060'], None),
	'37c13d51': (['3'], ['3'], 'draft', [], ['3-055'], None),
	'dbd5debf': (['3'], ['3'], 'draft', [], ['3-023'], None),
	'57c73be1': (['3'], ['3'], 'draft', [], ['3-061'], None),
}
assert set(modeles) == set(DECISIONS), set(modeles) ^ set(DECISIONS)

lot = []
for court, (grades_avant, grades_apres, statut, codes_avant, codes_apres, noeud_apres) in DECISIONS.items():
	m = modeles[court]
	i = m['id']
	assert m['grades'] == grades_avant and m['status'] == statut, (court, m['grades'], m['status'])
	avant = m['classification_node_id']
	tags_avant = [(grade_de(c), c) for c in codes_avant]
	tags_apres = [(grade_de(c), c) for c in codes_apres]
	assert {x for x in tags_releves if x[0] == i} == {(i, g, c) for g, c in tags_avant}, court
	apres = avant
	if noeud_apres is not None:
		apres = noeud_apres
	elif tags_apres:
		p = points[tags_apres[0]]
		if avant is None or p['node_id'] not in (avant, notion_de(avant)):
			apres = p['node_id']
	assert apres is not None, court
	for t in tags_apres:
		p = points[t]
		assert p['archived_at'] is None and p['node_id'] in (apres, notion_de(apres)), (court, t)
		assert t[0] in grades_apres, (court, t)
	lot.append(
		dict(id=i, avant=chemin(avant), apres=chemin(apres), grades_avant=m['grades'], grades_apres=grades_apres,
		     statut_avant=statut, statut_apres=statut, tags_avant=tags_avant, tags_apres=tags_apres)
	)
lot.sort(key=lambda x: x['id'])

N = len(lot)
N_TAGS_APRES = sum(len(x['tags_apres']) for x in lot)
N_TAGS_AVANT = sum(len(x['tags_avant']) for x in lot)
N_DEPLACES = sum(x['avant'] != x['apres'] for x in lot)
N_NIVEAUX = sum(x['grades_avant'] != x['grades_apres'] for x in lot)
assert (N, N_TAGS_APRES, N_TAGS_AVANT, N_DEPLACES, N_NIVEAUX) == (6, 6, 0, 6, 0)


def s(x: str | None) -> str:
	if x is None:
		return 'null'
	return "'" + x.replace("'", "''") + "'"


def arr(xs: list[str]) -> str:
	return 'array[' + ', '.join(s(x) for x in xs) + ']'


def ids_sql(indent: str) -> str:
	return (',\n' + indent).join(s(x['id']) for x in lot)


def valeurs_noeud_rollback(cote: str) -> str:
	return ',\n'.join(
		f"-- \t\t({s(x['id'])}::uuid, {s(x[cote][0])}, {s(x[cote][1])}, {s(x[cote][2])})" for x in lot
	)


# (modèle, programme, code, avant, après) : retiré (vrai, faux), posé (faux, vrai), gardé (vrai, vrai).
tags_sql = sorted({(x['id'], g, c, (g, c) in x['tags_avant'], (g, c) in x['tags_apres'])
                   for x in lot for (g, c) in x['tags_avant'] + x['tags_apres']})
N_POSES = sum(1 for t in tags_sql if t[4] and not t[3])
N_RETIRES = sum(1 for t in tags_sql if t[3] and not t[4])
N_GARDES = sum(1 for t in tags_sql if t[3] and t[4])

assert (N_POSES, N_RETIRES, N_GARDES) == (6, 0, 0)

L = []
w = L.append
w(f"""-- ============================================================================
-- Chantier « questions-3 », lot 3 (Thalès et trigonométrie) : nœuds et tags de {N} modèles
-- ============================================================================
--   les 6 brouillons du lot 3, créés sans nœud ni tag, vont sur le nœud de leur point, tag posé :
--   16478dab (Reconnaître une configuration de Thalès) → 3-022, 034e6b74 (Écrire l'égalité de
--   Thalès) → 3-059, f55d07b0 (Calculer une longueur avec Thalès) → 3-060, tous trois sur
--   « Théorème de Thalès > calcul de longueurs » ; 37c13d51 (Réciproque et contraposée de Thalès)
--   → 3-055, « Théorème de Thalès > réciproque » ; dbd5debf (Écrire cos, sin ou tan d'un angle)
--   → 3-023 et 57c73be1 (Calculer une longueur ou un angle) → 3-061, sur la notion
--   « Trigonométrie du triangle rectangle ».
-- Bilan : {N_DEPLACES} rangés sur un nœud, {N_NIVEAUX} niveau changé, {N_RETIRES} tag retiré, {N_POSES} posés. Aucun
-- statut ne change (6 brouillons). Le contenu ne change pas : `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Phase 0 validée par David le 2026-10-29 (journal docs/wip/questions-3-progress.md § 10). Les 6
-- brouillons ont été créés le 2026-10-29 par scripts/create-questions.ts (scripts/questions/3-lot-3/,
-- #1981), qui ne pose ni nœud ni tag. Fichier GÉNÉRÉ par docs/wip/questions/lot-rangement-3-3.py
-- (relevé de la prod du 2026-10-29) — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle et
-- ses vérifications le tolèrent ; elle exige TOUT ou RIEN ({N} modèles). Elle est prouvée par
-- tests/integration/questions-3-lot3-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (nœud, niveaux, statut et tags d'avant) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore sans nœud, aux niveaux et au statut relevés le
-- 2026-10-29, et porter EXACTEMENT les tags relevés (aucun) : sinon une saisie faite depuis serait
-- écrasée ou contredite. Les nœuds sont désignés par leur chemin, résolu STRICTEMENT.
--
-- Données d'élèves : aucune (6 brouillons neufs, jamais publiés).
--
-- Accès (question tranchée par David le 2026-10-29, phase 0 du lot 3, § 10.3) : personne ne gagne de
-- lecture. Les brouillons restent lisibles par l'admin seul ; ils apparaissent sous leur nœud et
-- leur point dans l'admin. Aucune règle (policy) ne change.
--
-- Rollback (aucune donnée d'élève). Il retire les {N_POSES} tags posés, repose les {N_RETIRES} retirés, rend aux
-- modèles leur nœud (ou aucun), leurs niveaux et leur statut d'avant. Garde : il refuse si un modèle n'a plus EXACTEMENT le nœud, les
-- niveaux, le statut et les tags laissés par la migration (sinon une saisie faite depuis serait
-- écrasée en silence). Bloc éprouvé par le test d'intégration, à jouer dans UNE transaction
-- (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._q3l3_retour_noeuds;
-- drop table if exists pg_temp._q3l3_retour_tags;
-- drop table if exists pg_temp._q3l3_retour;
-- create temporary table _q3l3_retour (
-- 	id uuid primary key,
-- 	avant_branche text, avant_notion text, avant_sous_notion text,
-- 	apres_branche text not null, apres_notion text not null, apres_sous_notion text,
-- 	grades_avant text[] not null, grades_apres text[] not null,
-- 	statut_avant text not null, statut_apres text not null
-- );
-- insert into _q3l3_retour values""")
w(',\n'.join(
	f"-- \t({s(x['id'])}, {s(x['avant'][0])}, {s(x['avant'][1])}, {s(x['avant'][2])},\n"
	f"-- \t {s(x['apres'][0])}, {s(x['apres'][1])}, {s(x['apres'][2])}, {arr(x['grades_avant'])}, {arr(x['grades_apres'])}, {s(x['statut_avant'])}, {s(x['statut_apres'])})"
	for x in lot) + ';')
w("""-- create temporary table _q3l3_retour_tags (template_id uuid not null, grade text not null, code text not null, avant boolean not null, apres boolean not null);
-- insert into _q3l3_retour_tags values""")
w(',\n'.join(f"-- \t({s(i)}, {s(g)}, {s(c)}, {str(av).lower()}, {str(ap).lower()})" for (i, g, c, av, ap) in tags_sql) + ';')
w(f"""-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _q3l3_retour order by id;
-- select 1 from public.question_templates where id in (select id from _q3l3_retour) order by id for update;
-- create temporary table _q3l3_retour_noeuds as
-- 	select r.id, r.avant_branche,
-- 	       case when r.avant_branche is null then null when r.avant_sous_notion is null then an.id else asn.id end as avant,
-- 	       case when r.apres_sous_notion is null then pn.id else psn.id end as apres
-- 	  from _q3l3_retour r
-- 	  left join public.classification_nodes ab on ab.kind = 'branch' and ab.parent_id is null and ab.archived_at is null and ab.name = r.avant_branche
-- 	  left join public.classification_nodes an on an.kind = 'notion' and an.parent_id = ab.id and an.archived_at is null and an.name = r.avant_notion
-- 	  left join public.classification_nodes asn on asn.kind = 'subnotion' and asn.parent_id = an.id and asn.archived_at is null and asn.name = r.avant_sous_notion
-- 	  left join public.classification_nodes pb on pb.kind = 'branch' and pb.parent_id is null and pb.archived_at is null and pb.name = r.apres_branche
-- 	  left join public.classification_nodes pn on pn.kind = 'notion' and pn.parent_id = pb.id and pn.archived_at is null and pn.name = r.apres_notion
-- 	  left join public.classification_nodes psn on psn.kind = 'subnotion' and psn.parent_id = pn.id and psn.archived_at is null and psn.name = r.apres_sous_notion;
-- -- Clé : deux nœuds homonymes sous un même parent dupliqueraient les lignes et feraient échouer ici.
-- alter table _q3l3_retour_noeuds add primary key (id);
-- alter table _q3l3_retour_tags add column point_id uuid;
-- update _q3l3_retour_tags t set point_id = p.id
--   from public.curriculum_points p
--  where p.grade = t.grade and p.code = t.code and p.archived_at is null;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer;
-- begin
-- 	if exists (select 1 from _q3l3_retour_noeuds where (avant is null and avant_branche is not null) or apres is null)
-- 	   or exists (select 1 from _q3l3_retour_tags where point_id is null) then
-- 		raise exception 'rollback : chemins ou points introuvables';
-- 	end if;
-- 	select count(*), count(*) filter (where q.grades = r.grades_apres and q.status = r.statut_apres
-- 	                                     and q.classification_node_id = x.apres)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q
-- 	  join _q3l3_retour r on r.id = q.id
-- 	  join _q3l3_retour_noeuds x on x.id = q.id;
-- 	if v_presents not in (0, {N}) then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur {N}', v_presents;
-- 	end if;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur % ont encore le nœud, les niveaux et le statut de la migration', v_intacts, v_presents;
-- 	end if;
-- 	-- Tags : exactement les {N_TAGS_APRES} laissés par la migration (posés et gardés), rien d'autre (tout niveau).
-- 	select count(*), count(*) filter (where exists (select 1 from _q3l3_retour_tags t
-- 	                                                where t.apres and t.template_id = q.template_id and t.point_id = q.point_id))
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join _q3l3_retour r on r.id = q.template_id;
-- 	if v_tags <> v_total or v_total <> least(v_presents, 1) * {N_TAGS_APRES} then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, least(v_presents, 1) * {N_TAGS_APRES};
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using _q3l3_retour_tags t
--  where t.apres and not t.avant and q.template_id = t.template_id and q.point_id = t.point_id;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates q
--    set classification_node_id = x.avant, grades = r.grades_avant, status = r.statut_avant
--   from _q3l3_retour r join _q3l3_retour_noeuds x on x.id = r.id
--  where q.id = r.id;
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- insert into public.question_template_points (template_id, point_id)
-- select t.template_id, t.point_id
--   from _q3l3_retour_tags t
--   join public.question_templates q on q.id = t.template_id
--  where t.avant and not t.apres;
-- do $retour$
-- declare v_presents integer; v_total integer; v_reposes integer;
-- begin
-- 	select count(*) into v_presents from _q3l3_retour r join public.question_templates q on q.id = r.id;
-- 	select count(*), count(*) filter (where exists (select 1 from _q3l3_retour_tags t
-- 	                                                where t.avant and t.template_id = q.template_id and t.point_id = q.point_id))
-- 	  into v_total, v_reposes
-- 	  from public.question_template_points q
-- 	  join _q3l3_retour r on r.id = q.template_id;
-- 	if v_reposes <> v_total or v_total <> least(v_presents, 1) * {N_TAGS_AVANT} then
-- 		raise exception 'rollback : % tag(s) reposé(s) sur %, attendus %', v_reposes, v_total, least(v_presents, 1) * {N_TAGS_AVANT};
-- 	end if;
-- end $retour$;
-- drop table _q3l3_retour_noeuds;
-- drop table _q3l3_retour_tags;
-- drop table _q3l3_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires ----------------------------------------------
drop table if exists pg_temp._q3l3_modeles;
drop table if exists pg_temp._q3l3_tags;
create temporary table _q3l3_modeles (
	id uuid primary key,
	avant_branche text, avant_notion text, avant_sous_notion text,
	apres_branche text not null, apres_notion text not null, apres_sous_notion text,
	grades_avant text[] not null,
	grades_apres text[] not null,
	statut_avant text not null,
	statut_apres text not null
);
create temporary table _q3l3_tags (
	template_id uuid not null,
	grade text not null,
	code text not null,
	avant boolean not null,
	apres boolean not null,
	primary key (template_id, grade, code)
);
insert into _q3l3_modeles values""")
w(',\n'.join(
	f"\t({s(x['id'])}, {s(x['avant'][0])}, {s(x['avant'][1])}, {s(x['avant'][2])},\n"
	f"\t {s(x['apres'][0])}, {s(x['apres'][1])}, {s(x['apres'][2])}, {arr(x['grades_avant'])}, {arr(x['grades_apres'])}, {s(x['statut_avant'])}, {s(x['statut_apres'])})"
	for x in lot) + ';')
w('insert into _q3l3_tags values')
w(',\n'.join(f"\t({s(i)}, {s(g)}, {s(c)}, {str(av).lower()}, {str(ap).lower()})" for (i, g, c, av, ap) in tags_sql) + ';')
w(f"""
-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q3l3_modeles order by id;
select 1 from public.question_templates where id in (select id from _q3l3_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
drop table if exists pg_temp._q3l3_noeuds;
create temporary table _q3l3_noeuds as
	select r.id, r.avant_branche,
	       case when r.avant_branche is null then null when r.avant_sous_notion is null then an.id else asn.id end as avant,
	       case when r.apres_sous_notion is null then pn.id else psn.id end as apres
	  from _q3l3_modeles r
	  left join public.classification_nodes ab on ab.kind = 'branch' and ab.parent_id is null and ab.archived_at is null and ab.name = r.avant_branche
	  left join public.classification_nodes an on an.kind = 'notion' and an.parent_id = ab.id and an.archived_at is null and an.name = r.avant_notion
	  left join public.classification_nodes asn on asn.kind = 'subnotion' and asn.parent_id = an.id and asn.archived_at is null and asn.name = r.avant_sous_notion
	  left join public.classification_nodes pb on pb.kind = 'branch' and pb.parent_id is null and pb.archived_at is null and pb.name = r.apres_branche
	  left join public.classification_nodes pn on pn.kind = 'notion' and pn.parent_id = pb.id and pn.archived_at is null and pn.name = r.apres_notion
	  left join public.classification_nodes psn on psn.kind = 'subnotion' and psn.parent_id = pn.id and psn.archived_at is null and psn.name = r.apres_sous_notion;
-- Clé : deux nœuds homonymes sous un même parent dupliqueraient les lignes et feraient échouer ici.
alter table _q3l3_noeuds add primary key (id);
alter table _q3l3_tags add column point_id uuid;
update _q3l3_tags t set point_id = p.id
  from public.curriculum_points p
 where p.grade = t.grade and p.code = t.code and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from _q3l3_noeuds where (avant is null and avant_branche is not null) or apres is null)
	   or exists (select 1 from _q3l3_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s) de modèle, % point(s)',
			(select count(*) from _q3l3_noeuds where (avant is null and avant_branche is not null) or apres is null),
			(select count(*) from _q3l3_tags where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, nœud, niveaux et statut relevés, tags EXACTEMENT relevés ---
do $garde$
declare v_presents integer; v_ecarts integer; v_niveaux integer; v_statuts integer; v_detail text;
begin
	select count(*) into v_presents from _q3l3_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, {N}) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur {N}', v_presents;
	end if;
	select count(*) into v_ecarts from _q3l3_noeuds x
	  join public.question_templates q on q.id = x.id
	 where q.classification_node_id is distinct from x.avant;
	if v_ecarts <> 0 then
		raise exception 'modèles déplacés depuis le relevé : %', v_ecarts;
	end if;
	select count(*) into v_niveaux from _q3l3_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.grades is distinct from r.grades_avant;
	if v_niveaux <> 0 then
		raise exception 'niveaux changés depuis le relevé : %', v_niveaux;
	end if;
	select count(*) into v_statuts from _q3l3_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.status is distinct from r.statut_avant;
	if v_statuts <> 0 then
		raise exception 'statuts changés depuis le relevé : %', v_statuts;
	end if;
	-- « + » : tag en base non relevé (tout niveau) ; « - » : tag relevé absent de la base
	select string_agg(d.r, ', ' order by d.r) into v_detail from (
		(select '+' || left(q.template_id::text, 8) || ' ' || p.code as r
		   from public.question_template_points q
		   join _q3l3_modeles m on m.id = q.template_id
		   join public.curriculum_points p on p.id = q.point_id
		  where not exists (select 1 from _q3l3_tags t where t.template_id = q.template_id and t.point_id = q.point_id and t.avant))
		union all
		(select '-' || left(t.template_id::text, 8) || ' ' || t.code
		   from _q3l3_tags t
		   join public.question_templates q on q.id = t.template_id
		  where t.avant
		    and not exists (select 1 from public.question_template_points u where u.template_id = t.template_id and u.point_id = t.point_id))) d;
	if v_detail is not null then
		raise exception 'tags différents du relevé : %', v_detail;
	end if;
end $garde$;

-- ---- 4. Retraits, déplacements, niveaux, statut, poses ---------------------------------
delete from public.question_template_points q
 using _q3l3_tags t
 where q.template_id = t.template_id and q.point_id = t.point_id and t.avant and not t.apres;

-- R2 : les modèles passent sur le nœud de leur point AVANT les tags (le trigger des tags lit le
-- nœud du modèle).
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = x.apres
  from _q3l3_noeuds x
 where q.id = x.id and q.classification_node_id is distinct from x.apres;
update public.question_templates q set grades = r.grades_apres
  from _q3l3_modeles r
 where q.id = r.id and q.grades is distinct from r.grades_apres;
update public.question_templates q set status = r.statut_apres
  from _q3l3_modeles r
 where q.id = r.id and q.status is distinct from r.statut_apres;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.template_id, t.point_id
  from _q3l3_tags t
  join public.question_templates q on q.id = t.template_id
 where t.apres and not t.avant;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_niveaux integer; v_statuts integer; v_total integer; v_tags integer; v_tags_attendus integer;
begin
	select count(*) into v_presents from _q3l3_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q3l3_noeuds x
	  join public.question_templates q on q.id = x.id and q.classification_node_id = x.apres;
	select count(*) into v_niveaux from _q3l3_modeles r
	  join public.question_templates q on q.id = r.id and q.grades = r.grades_apres;
	select count(*) into v_statuts from _q3l3_modeles r
	  join public.question_templates q on q.id = r.id and q.status = r.statut_apres;
	-- tags de ces modèles (tout niveau) : tous, et ceux du lot d'après (doivent coïncider)
	select count(*), count(*) filter (where exists (select 1 from _q3l3_tags t
	                                                where t.template_id = q.template_id and t.point_id = q.point_id and t.apres))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q3l3_modeles m on m.id = q.template_id;
	-- Base sans les modèles (locale) : aucun tag attendu.
	v_tags_attendus := least(v_presents, 1) * {N_TAGS_APRES};
	if v_noeuds <> v_presents or v_niveaux <> v_presents or v_statuts <> v_presents
	   or v_tags <> v_tags_attendus or v_total <> v_tags_attendus then
		raise exception 'lot incohérent : nœuds %/%, niveaux %/%, statuts %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_niveaux, v_presents, v_statuts, v_presents, v_tags, v_tags_attendus, v_total;
	end if;
end $check$;

drop table _q3l3_noeuds;
drop table _q3l3_tags;
drop table _q3l3_modeles;
""")

MIGRATION.write_text('\n'.join(L))

fixture = [
	dict(id=x['id'], noeudAvant=' > '.join(filter(None, x['avant'])) or None,
	     noeudApres=' > '.join(filter(None, x['apres'])),
	     gradesAvant=x['grades_avant'], gradesApres=x['grades_apres'],
	     statutAvant=x['statut_avant'], statutApres=x['statut_apres'],
	     tagsAvant=[f'{g}§{c}' for g, c in x['tags_avant']],
	     tagsApres=[f'{g}§{c}' for g, c in x['tags_apres']])
	for x in lot
]
FIXTURE.write_text(json.dumps(fixture, ensure_ascii=False, indent='\t') + '\n')
# Mise en forme du dépôt (sinon chaque régénération réécrit la fixture commitée).
subprocess.run(['pnpm', 'exec', 'prettier', '--write', str(FIXTURE)], cwd=RACINE, check=True,
               stdout=subprocess.DEVNULL)
print(f'{MIGRATION.name} : {N} modèles, {N_DEPLACES} déplacés, {N_NIVEAUX} niveaux, '
      f'{N_POSES} tags posés, {N_RETIRES} retirés, {N_GARDES} gardés ; fixture {FIXTURE.name}')
