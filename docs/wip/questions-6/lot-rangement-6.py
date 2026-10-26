"""Lot « rangement » de la 6e : migration 20261027100100_questions_6_rangement_tags + fixture du test.

Lit l'instantané `etat-prod-2026-10-27/` (releve-prod.ts) et `destinations-42.csv`, applique les
décisions de David du 2026-10-26 (journal § 6) :
  - 8a3191ce, ae7a332e (coefficient sur nombres nus) : `grades` 5, sans tag ;
  - 5d515eb1 : `grades` 4, sans tag ;
  - les 5 SANS_POINT restent en 6e, sans tag (hors migration) ;
  - le reste comme le CSV : niveau(x) proposé(s), déplacement de nœud (R2) quand le nœud n'est pas
    compatible, tag du point ;
  - 3a7a5711 (doublon de 059e3fc9) : repassé en brouillon, tag 6-200 retiré, nœud gardé.

Vérifie avant d'écrire : modèles relevés publiés en [6], sans autre tag que celui de 3a7a5711,
nœuds actifs à trois niveaux, point de chaque tag sur le nœud d'arrivée ou sa notion.

    python3 docs/wip/questions-6/lot-rangement-6.py
"""

import csv
import json
import re
import subprocess
from pathlib import Path

ICI = Path(__file__).parent
RACINE = ICI.parents[2]
ETAT = ICI / 'etat-prod-2026-10-27'
MIGRATION = RACINE / 'supabase/migrations/20261027100100_questions_6_rangement_tags.sql'
FIXTURE = RACINE / 'tests/integration/fixtures/questions-6-rangement.json'

SANS_TAG = {'8a3191ce', 'ae7a332e', '5d515eb1'}
NIVEAUX_DECIDES = {'8a3191ce': ['5'], 'ae7a332e': ['5'], '5d515eb1': ['4']}
DOUBLON = '3a7a5711-941c-466f-95c6-51a4691c767b'
DOUBLON_TAG = ('6', '6-200')

modeles = {t['id']: t for t in json.loads((ETAT / 'templates.json').read_text())}
noeuds = {n['id']: n for n in json.loads((ETAT / 'nodes.json').read_text())}
points = {(p['grade'], p['code']): p for p in json.loads((ETAT / 'points.json').read_text())}
points_par_id = {p['id']: p for p in points.values()}
tags_releves = {
	(t['template_id'], points_par_id[t['point_id']]['grade'], points_par_id[t['point_id']]['code'])
	for t in json.loads((ETAT / 'tags.json').read_text())
}


def chemin(noeud_id: str) -> tuple[str, str, str | None]:
	"""(branche, notion, sous-notion ou None) d'un nœud actif."""
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


lot = []
for r in csv.DictReader((ICI / 'destinations-42.csv').open(), delimiter=';'):
	if r['verdict'] == 'SANS_POINT':
		continue
	i = r['template_id']
	court = i[:8]
	m = modeles[i]
	assert m['status'] == 'published' and m['grades'] == ['6'], court
	avant = m['classification_node_id']
	trouve = re.search(r'\(([0-9a-f-]{36})\)', r['noeud_point'])
	apres = trouve.group(1) if r['noeud_compatible'] == 'non' else avant
	assert apres, court
	grades = NIVEAUX_DECIDES.get(court) or json.loads(r['grades_proposes'].replace("'", '"'))
	tags_apres = []
	if court not in SANS_TAG:
		code = r['code']
		grade = code.rsplit('-', 1)[0]
		p = points[(grade, code)]
		assert p['archived_at'] is None and p['node_id'] in (apres, notion_de(apres)), (court, code)
		tags_apres.append((grade, code))
	lot.append(
		dict(id=i, avant=chemin(avant), apres=chemin(apres), grades_avant=['6'], grades_apres=grades,
		     statut_avant='published', statut_apres='published', tags_avant=[], tags_apres=tags_apres)
	)

d = modeles[DOUBLON]
assert d['status'] == 'published' and d['grades'] == ['6']
lot.append(
	dict(id=DOUBLON, avant=chemin(d['classification_node_id']), apres=chemin(d['classification_node_id']),
	     grades_avant=['6'], grades_apres=['6'], statut_avant='published', statut_apres='draft',
	     tags_avant=[DOUBLON_TAG], tags_apres=[])
)
lot.sort(key=lambda x: x['id'])

# Le relevé ne porte AUCUN autre tag que celui du doublon.
assert tags_releves == {(DOUBLON, *DOUBLON_TAG)}, tags_releves

N = len(lot)
N_TAGS_APRES = sum(len(x['tags_apres']) for x in lot)
N_TAGS_AVANT = sum(len(x['tags_avant']) for x in lot)
N_DEPLACES = sum(x['avant'] != x['apres'] for x in lot)
N_NIVEAUX = sum(x['grades_avant'] != x['grades_apres'] for x in lot)
assert (N, N_TAGS_APRES, N_TAGS_AVANT, N_DEPLACES, N_NIVEAUX) == (38, 34, 1, 18, 37)


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


tags_apres_sql = [(x['id'], g, c) for x in lot for (g, c) in x['tags_apres']]
tags_avant_sql = [(x['id'], g, c) for x in lot for (g, c) in x['tags_avant']]

L = []
w = L.append
w(f"""-- ============================================================================
-- Chantier « questions-6 », lot « corrections » : niveaux, nœuds et tags de 37 modèles, 1 doublon en brouillon
-- ============================================================================
-- Les 37 modèles marqués 6e à tort (passe « arbre des notions » : HORS_PROGRAMME) prennent le niveau
-- du point qui les décrit : niveau suivant → `grades` remplacé ([5], [4] ou [3]) ; cours moyen →
-- niveau ajouté, 6 gardé ([CM1, 6] ou [CM2, 6]).
--   - {N_DEPLACES} modèles changent de nœud (R2 : leur point vit sur un autre nœud ; sans quoi
--     question_template_points_check_rules refuse le tag) ;
--   - {N_TAGS_APRES} tags posés, un par modèle ; 8a3191ce, ae7a332e (coefficient sur nombres nus) et
--     5d515eb1 (phrase → expression) changent de niveau SANS tag ;
--   - 3a7a5711 (doublon de 059e3fc9) : repassé en BROUILLON, tag 6-200 retiré, nœud gardé.
-- Le contenu ne change pas ici (les 6 modèles réécrits sont dans 20261027100000_questions_6_contenu) :
-- `updated_at` est PRÉSERVÉ.
-- ============================================================================
-- Décisions de David le 2026-10-26 (journal docs/wip/questions-6-progress.md § 6). Fichier GÉNÉRÉ
-- par docs/wip/questions-6/lot-rangement-6.py (relevé de la prod du 2026-10-27,
-- destinations-42.csv) — ne pas éditer à la main.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche aucun
-- modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN ({N} modèles). Elle est prouvée
-- par tests/integration/questions-6-rangement-tags.test.ts, qui fabrique des copies des
-- identifiants de la prod (nœud, niveaux, statut et tags d'avant) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore au nœud, aux niveaux et au statut relevés le 2026-10-27, et
-- porter EXACTEMENT les tags relevés (sinon une saisie faite depuis serait écrasée ou contredite).
-- Les nœuds sont désignés par leur chemin, résolu STRICTEMENT.
--
-- Données d'élèves (MCP, 2026-10-27) : 0 carte SRS, 0 activité de journal, 0 question d'évaluation,
-- 1 tentative de compétence (6ca011c9, qui garde la 6e) ; aucune n'est touchée.
--
-- Accès (question tranchée par David le 2026-10-26) : les élèves et le prof du CM1, du CM2, de la 5e,
-- de la 4e et de la 3e voient les modèles de leur niveau ; ceux de la 6e ne voient plus les 29
-- modèles qui passent au-dessus, ni 3a7a5711 (brouillon : admin seul). Les tags restent lisibles par
-- tout connecté. Aucune règle (policy) ne change.
--
-- Rollback (aucune donnée d'élève). Il retire les {N_TAGS_APRES} tags posés, rend aux modèles leur nœud,
-- leurs niveaux et leur statut d'avant, puis repose 6-200 sur 3a7a5711. Garde : il refuse si un
-- modèle n'a plus EXACTEMENT le nœud, les niveaux, le statut et les tags posés par la migration
-- (sinon une saisie faite depuis serait écrasée en silence). Bloc éprouvé par le test
-- d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL en
-- un seul envoi) :
-- ROLLBACK:BEGIN
-- set local lock_timeout = '5s';
-- drop table if exists pg_temp._q6r_retour_noeuds;
-- drop table if exists pg_temp._q6r_retour_tags;
-- drop table if exists pg_temp._q6r_retour;
-- create temporary table _q6r_retour (
-- 	id uuid primary key,
-- 	avant_branche text not null, avant_notion text not null, avant_sous_notion text,
-- 	apres_branche text not null, apres_notion text not null, apres_sous_notion text,
-- 	grades_avant text[] not null, grades_apres text[] not null,
-- 	statut_avant text not null, statut_apres text not null
-- );
-- insert into _q6r_retour values""")
w(',\n'.join(
	f"-- \t({s(x['id'])}, {s(x['avant'][0])}, {s(x['avant'][1])}, {s(x['avant'][2])},\n"
	f"-- \t {s(x['apres'][0])}, {s(x['apres'][1])}, {s(x['apres'][2])}, {arr(x['grades_avant'])}, {arr(x['grades_apres'])}, {s(x['statut_avant'])}, {s(x['statut_apres'])})"
	for x in lot) + ';')
w("""-- create temporary table _q6r_retour_tags (template_id uuid not null, grade text not null, code text not null, avant boolean not null);
-- insert into _q6r_retour_tags values""")
w(',\n'.join([f"-- \t({s(i)}, {s(g)}, {s(c)}, false)" for (i, g, c) in tags_apres_sql]
             + [f"-- \t({s(i)}, {s(g)}, {s(c)}, true)" for (i, g, c) in tags_avant_sql]) + ';')
w(f"""-- select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
--   from _q6r_retour order by id;
-- select 1 from public.question_templates where id in (select id from _q6r_retour) order by id for update;
-- create temporary table _q6r_retour_noeuds as
-- 	select r.id,
-- 	       case when r.avant_sous_notion is null then an.id else asn.id end as avant,
-- 	       case when r.apres_sous_notion is null then pn.id else psn.id end as apres
-- 	  from _q6r_retour r
-- 	  left join public.classification_nodes ab on ab.kind = 'branch' and ab.parent_id is null and ab.archived_at is null and ab.name = r.avant_branche
-- 	  left join public.classification_nodes an on an.kind = 'notion' and an.parent_id = ab.id and an.archived_at is null and an.name = r.avant_notion
-- 	  left join public.classification_nodes asn on asn.kind = 'subnotion' and asn.parent_id = an.id and asn.archived_at is null and asn.name = r.avant_sous_notion
-- 	  left join public.classification_nodes pb on pb.kind = 'branch' and pb.parent_id is null and pb.archived_at is null and pb.name = r.apres_branche
-- 	  left join public.classification_nodes pn on pn.kind = 'notion' and pn.parent_id = pb.id and pn.archived_at is null and pn.name = r.apres_notion
-- 	  left join public.classification_nodes psn on psn.kind = 'subnotion' and psn.parent_id = pn.id and psn.archived_at is null and psn.name = r.apres_sous_notion;
-- -- Clé : deux nœuds homonymes sous un même parent dupliqueraient les lignes et feraient échouer ici.
-- alter table _q6r_retour_noeuds add primary key (id);
-- alter table _q6r_retour_tags add column point_id uuid;
-- update _q6r_retour_tags t set point_id = p.id
--   from public.curriculum_points p
--  where p.grade = t.grade and p.code = t.code and p.archived_at is null;
-- do $garde_retour$
-- declare v_presents integer; v_intacts integer; v_total integer; v_tags integer;
-- begin
-- 	if exists (select 1 from _q6r_retour_noeuds where avant is null or apres is null)
-- 	   or exists (select 1 from _q6r_retour_tags where point_id is null) then
-- 		raise exception 'rollback : chemins ou points introuvables';
-- 	end if;
-- 	select count(*), count(*) filter (where q.grades = r.grades_apres and q.status = r.statut_apres
-- 	                                     and q.classification_node_id = x.apres)
-- 	  into v_presents, v_intacts
-- 	  from public.question_templates q
-- 	  join _q6r_retour r on r.id = q.id
-- 	  join _q6r_retour_noeuds x on x.id = q.id;
-- 	if v_presents not in (0, {N}) then
-- 		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur {N}', v_presents;
-- 	end if;
-- 	if v_intacts <> v_presents then
-- 		raise exception 'rollback : % modèle(s) sur % ont encore le nœud, les niveaux et le statut de la migration', v_intacts, v_presents;
-- 	end if;
-- 	-- Tags : exactement les {N_TAGS_APRES} posés par la migration, rien d'autre (tout niveau).
-- 	select count(*), count(*) filter (where exists (select 1 from _q6r_retour_tags t
-- 	                                                where not t.avant and t.template_id = q.template_id and t.point_id = q.point_id))
-- 	  into v_total, v_tags
-- 	  from public.question_template_points q
-- 	  join _q6r_retour r on r.id = q.template_id;
-- 	if v_tags <> v_total or v_total <> least(v_presents, 1) * {N_TAGS_APRES} then
-- 		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, least(v_presents, 1) * {N_TAGS_APRES};
-- 	end if;
-- end $garde_retour$;
-- delete from public.question_template_points q
--  using _q6r_retour_tags t
--  where not t.avant and q.template_id = t.template_id and q.point_id = t.point_id;
-- alter table public.question_templates disable trigger update_question_templates_updated_at;
-- update public.question_templates q
--    set classification_node_id = x.avant, grades = r.grades_avant, status = r.statut_avant
--   from _q6r_retour r join _q6r_retour_noeuds x on x.id = r.id
--  where q.id = r.id;
-- alter table public.question_templates enable trigger update_question_templates_updated_at;
-- insert into public.question_template_points (template_id, point_id)
-- select t.template_id, t.point_id
--   from _q6r_retour_tags t
--   join public.question_templates q on q.id = t.template_id
--  where t.avant;
-- do $retour$
-- declare v_presents integer; v_total integer; v_reposes integer;
-- begin
-- 	select count(*) into v_presents from _q6r_retour r join public.question_templates q on q.id = r.id;
-- 	select count(*), count(*) filter (where exists (select 1 from _q6r_retour_tags t
-- 	                                                where t.avant and t.template_id = q.template_id and t.point_id = q.point_id))
-- 	  into v_total, v_reposes
-- 	  from public.question_template_points q
-- 	  join _q6r_retour r on r.id = q.template_id;
-- 	if v_reposes <> v_total or v_total <> least(v_presents, 1) * {N_TAGS_AVANT} then
-- 		raise exception 'rollback : % tag(s) reposé(s) sur %, attendus %', v_reposes, v_total, least(v_presents, 1) * {N_TAGS_AVANT};
-- 	end if;
-- end $retour$;
-- drop table _q6r_retour_noeuds;
-- drop table _q6r_retour_tags;
-- drop table _q6r_retour;
-- ROLLBACK:END
-- ============================================================================

-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires ----------------------------------------------
drop table if exists pg_temp._q6r_modeles;
drop table if exists pg_temp._q6r_tags;
create temporary table _q6r_modeles (
	id uuid primary key,
	avant_branche text not null, avant_notion text not null, avant_sous_notion text,
	apres_branche text not null, apres_notion text not null, apres_sous_notion text,
	grades_avant text[] not null,
	grades_apres text[] not null,
	statut_avant text not null,
	statut_apres text not null
);
create temporary table _q6r_tags (
	template_id uuid not null,
	grade text not null,
	code text not null,
	avant boolean not null,
	apres boolean not null,
	primary key (template_id, grade, code)
);
insert into _q6r_modeles values""")
w(',\n'.join(
	f"\t({s(x['id'])}, {s(x['avant'][0])}, {s(x['avant'][1])}, {s(x['avant'][2])},\n"
	f"\t {s(x['apres'][0])}, {s(x['apres'][1])}, {s(x['apres'][2])}, {arr(x['grades_avant'])}, {arr(x['grades_apres'])}, {s(x['statut_avant'])}, {s(x['statut_apres'])})"
	for x in lot) + ';')
w('insert into _q6r_tags values')
w(',\n'.join([f"\t({s(i)}, {s(g)}, {s(c)}, true, false)" for (i, g, c) in tags_avant_sql]
             + [f"\t({s(i)}, {s(g)}, {s(c)}, false, true)" for (i, g, c) in tags_apres_sql]) + ';')
w(f"""
-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q6r_modeles order by id;
select 1 from public.question_templates where id in (select id from _q6r_modeles) order by id for update;

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
drop table if exists pg_temp._q6r_noeuds;
create temporary table _q6r_noeuds as
	select r.id,
	       case when r.avant_sous_notion is null then an.id else asn.id end as avant,
	       case when r.apres_sous_notion is null then pn.id else psn.id end as apres
	  from _q6r_modeles r
	  left join public.classification_nodes ab on ab.kind = 'branch' and ab.parent_id is null and ab.archived_at is null and ab.name = r.avant_branche
	  left join public.classification_nodes an on an.kind = 'notion' and an.parent_id = ab.id and an.archived_at is null and an.name = r.avant_notion
	  left join public.classification_nodes asn on asn.kind = 'subnotion' and asn.parent_id = an.id and asn.archived_at is null and asn.name = r.avant_sous_notion
	  left join public.classification_nodes pb on pb.kind = 'branch' and pb.parent_id is null and pb.archived_at is null and pb.name = r.apres_branche
	  left join public.classification_nodes pn on pn.kind = 'notion' and pn.parent_id = pb.id and pn.archived_at is null and pn.name = r.apres_notion
	  left join public.classification_nodes psn on psn.kind = 'subnotion' and psn.parent_id = pn.id and psn.archived_at is null and psn.name = r.apres_sous_notion;
-- Clé : deux nœuds homonymes sous un même parent dupliqueraient les lignes et feraient échouer ici.
alter table _q6r_noeuds add primary key (id);
alter table _q6r_tags add column point_id uuid;
update _q6r_tags t set point_id = p.id
  from public.curriculum_points p
 where p.grade = t.grade and p.code = t.code and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from _q6r_noeuds where avant is null or apres is null)
	   or exists (select 1 from _q6r_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s) de modèle, % point(s)',
			(select count(*) from _q6r_noeuds where avant is null or apres is null),
			(select count(*) from _q6r_tags where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, nœud, niveaux et statut relevés, tags EXACTEMENT relevés ---
do $garde$
declare v_presents integer; v_ecarts integer; v_niveaux integer; v_statuts integer; v_detail text;
begin
	select count(*) into v_presents from _q6r_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, {N}) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur {N}', v_presents;
	end if;
	select count(*) into v_ecarts from _q6r_noeuds x
	  join public.question_templates q on q.id = x.id
	 where q.classification_node_id is distinct from x.avant;
	if v_ecarts <> 0 then
		raise exception 'modèles déplacés depuis le relevé : %', v_ecarts;
	end if;
	select count(*) into v_niveaux from _q6r_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.grades is distinct from r.grades_avant;
	if v_niveaux <> 0 then
		raise exception 'niveaux changés depuis le relevé : %', v_niveaux;
	end if;
	select count(*) into v_statuts from _q6r_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.status is distinct from r.statut_avant;
	if v_statuts <> 0 then
		raise exception 'statuts changés depuis le relevé : %', v_statuts;
	end if;
	-- « + » : tag en base non relevé (tout niveau) ; « - » : tag relevé absent de la base
	select string_agg(d.r, ', ' order by d.r) into v_detail from (
		(select '+' || left(q.template_id::text, 8) || ' ' || p.code as r
		   from public.question_template_points q
		   join _q6r_modeles m on m.id = q.template_id
		   join public.curriculum_points p on p.id = q.point_id
		  where not exists (select 1 from _q6r_tags t where t.template_id = q.template_id and t.point_id = q.point_id and t.avant))
		union all
		(select '-' || left(t.template_id::text, 8) || ' ' || t.code
		   from _q6r_tags t
		   join public.question_templates q on q.id = t.template_id
		  where t.avant
		    and not exists (select 1 from public.question_template_points u where u.template_id = t.template_id and u.point_id = t.point_id))) d;
	if v_detail is not null then
		raise exception 'tags différents du relevé : %', v_detail;
	end if;
end $garde$;

-- ---- 4. Retraits, déplacements, niveaux, statut, poses ---------------------------------
delete from public.question_template_points q
 using _q6r_tags t
 where q.template_id = t.template_id and q.point_id = t.point_id and t.avant and not t.apres;

-- R2 : les modèles passent sur le nœud de leur point AVANT les tags (le trigger des tags lit le
-- nœud du modèle).
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = x.apres
  from _q6r_noeuds x
 where q.id = x.id and q.classification_node_id is distinct from x.apres;
update public.question_templates q set grades = r.grades_apres
  from _q6r_modeles r
 where q.id = r.id and q.grades is distinct from r.grades_apres;
update public.question_templates q set status = r.statut_apres
  from _q6r_modeles r
 where q.id = r.id and q.status is distinct from r.statut_apres;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.template_id, t.point_id
  from _q6r_tags t
  join public.question_templates q on q.id = t.template_id
 where t.apres and not t.avant;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_niveaux integer; v_statuts integer; v_total integer; v_tags integer; v_tags_attendus integer;
begin
	select count(*) into v_presents from _q6r_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q6r_noeuds x
	  join public.question_templates q on q.id = x.id and q.classification_node_id = x.apres;
	select count(*) into v_niveaux from _q6r_modeles r
	  join public.question_templates q on q.id = r.id and q.grades = r.grades_apres;
	select count(*) into v_statuts from _q6r_modeles r
	  join public.question_templates q on q.id = r.id and q.status = r.statut_apres;
	-- tags de ces modèles (tout niveau) : tous, et ceux du lot d'après (doivent coïncider)
	select count(*), count(*) filter (where exists (select 1 from _q6r_tags t
	                                                where t.template_id = q.template_id and t.point_id = q.point_id and t.apres))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q6r_modeles m on m.id = q.template_id;
	-- Base sans les modèles (locale) : aucun tag attendu.
	v_tags_attendus := least(v_presents, 1) * {N_TAGS_APRES};
	if v_noeuds <> v_presents or v_niveaux <> v_presents or v_statuts <> v_presents
	   or v_tags <> v_tags_attendus or v_total <> v_tags_attendus then
		raise exception 'lot incohérent : nœuds %/%, niveaux %/%, statuts %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_niveaux, v_presents, v_statuts, v_presents, v_tags, v_tags_attendus, v_total;
	end if;
end $check$;

drop table _q6r_noeuds;
drop table _q6r_tags;
drop table _q6r_modeles;
""")

MIGRATION.write_text('\n'.join(L))

fixture = [
	dict(id=x['id'], noeudAvant=' > '.join(filter(None, x['avant'])), noeudApres=' > '.join(filter(None, x['apres'])),
	     gradesApres=x['grades_apres'], statutApres=x['statut_apres'],
	     tagsAvant=[f'{g}§{c}' for g, c in x['tags_avant']],
	     tagsApres=[f'{g}§{c}' for g, c in x['tags_apres']])
	for x in lot
]
FIXTURE.write_text(json.dumps(fixture, ensure_ascii=False, indent='\t') + '\n')
# Mise en forme du dépôt (sinon chaque régénération réécrit la fixture commitée).
subprocess.run(['pnpm', 'exec', 'prettier', '--write', str(FIXTURE)], cwd=RACINE, check=True,
               stdout=subprocess.DEVNULL)
print(f'{MIGRATION.name} : {N} modèles, {N_DEPLACES} déplacés, {N_NIVEAUX} niveaux, '
      f'{N_TAGS_APRES} tags posés, {N_TAGS_AVANT} retiré ; fixture {FIXTURE.name}')
