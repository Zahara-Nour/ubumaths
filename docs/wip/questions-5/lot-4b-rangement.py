"""Lot 4b de la 5e : migration 20261030010500_questions_5_lot4b_rangement + fixture du test.

Lit l'instantané `etat-prod-2026-10-29-lot4b/` (releve-prod.ts, 18 modèles) et applique les
décisions de David du 2026-10-29 (journal docs/wip/questions-5-progress.md § 15, « je te suis ») :
  - les 4 brouillons du lot 4b (#1986) vont sur le nœud de leur point, avec son tag :
    2f556139 → 5-107, 1e68327e → 5-038, 1cd9dc60 → 5-044, d4668b2d → 5-125 ;
  - reclassement en 5e (nœud inchangé, déjà celui du point de 5e) : d4679e2d [4] → [5],
    4-022 → 5-107 ; e66089e0 et 9231b54b [4] → [5], 4-070 → 5-038 ;
  - décalage de +1 des niveaux qui suivent les deux brouillons insérés : Développement 2-5 → 3-6,
    Factorisation 3-11 → 4-12 (13 modèles publiés ; le niveau n'est qu'un ordre dans la catégorie).

Vérifie avant d'écrire : statuts, niveaux, catégories et tags relevés ; brouillons sans nœud ni
tag ; point de chaque tag d'après sur le nœud du modèle d'après.

    python3 docs/wip/questions-5/lot-4b-rangement.py
"""

import json
import subprocess
from pathlib import Path

ICI = Path(__file__).parent
RACINE = ICI.parents[2]
ETAT = ICI / 'etat-prod-2026-10-29-lot4b'
MIGRATION = RACINE / 'supabase/migrations/20261030010500_questions_5_lot4b_rangement.sql'
FIXTURE = RACINE / 'tests/integration/fixtures/questions-5-lot4b-rangement.json'

# Brouillons neufs : point de 5e (leur nœud est celui du point)
NEUFS = {'2f556139': '5-107', '1e68327e': '5-038', '1cd9dc60': '5-044', 'd4668b2d': '5-125'}
# Reclassés : tag de 4e → tag de 5e
RECLASSES = {'d4679e2d': ('4-022', '5-107'), 'e66089e0': ('4-070', '5-038'),
             '9231b54b': ('4-070', '5-038')}
# Catégories où un brouillon s'insère : les publiés à partir de ce niveau montent de 1
DECALAGES = {'Développement': 2, 'Factorisation': 3}

modeles = {t['id']: t for t in json.loads((ETAT / 'templates.json').read_text())}
noeuds = {n['id']: n for n in json.loads((ETAT / 'nodes.json').read_text())}
points = {(p['grade'], p['code']): p for p in json.loads((ETAT / 'points.json').read_text())}
points_par_id = {p['id']: p for p in json.loads((ETAT / 'points.json').read_text())}
tags_releves = json.loads((ETAT / 'tags.json').read_text())


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


def tags_de(i: str) -> list[tuple[str, str]]:
	return sorted((points_par_id[t['point_id']]['grade'], points_par_id[t['point_id']]['code'])
	              for t in tags_releves if t['template_id'] == i)


assert len(modeles) == 18
lot = []
for i, m in modeles.items():
	court = i[:8]
	assert m['theme'] == 'Calcul littéral', i
	noeud = m['classification_node_id']
	tags_avant = tags_de(i)
	tags_apres = list(tags_avant)
	grades_apres = m['grades']
	noeud_apres = noeud
	niveau_apres = m['level']
	if court in NEUFS:
		assert m['status'] == 'draft' and m['grades'] == ['5'] and noeud is None and not tags_avant, i
		p = points[('5', NEUFS[court])]
		noeud_apres = p['node_id']
		tags_apres = [('5', NEUFS[court])]
	else:
		assert m['status'] == 'published' and m['domain'] == 'Transformation', i
		if court in RECLASSES:
			ancien, nouveau = RECLASSES[court]
			assert m['grades'] == ['4'] and tags_avant == [('4', ancien)], i
			grades_apres = ['5']
			tags_apres = [('5', nouveau)]
		if m['level'] >= DECALAGES[m['subdomain']]:
			niveau_apres = m['level'] + 1
	for g, c in tags_apres:
		p = points[(g, c)]
		assert p['archived_at'] is None and p['node_id'] == noeud_apres, (i, c)
	lot.append(
		dict(id=i, avant=chemin(noeud), apres=chemin(noeud_apres), grades_avant=m['grades'],
		     grades_apres=grades_apres, statut=m['status'], niveau_avant=m['level'],
		     niveau_apres=niveau_apres, tags_avant=tags_avant, tags_apres=tags_apres)
	)
lot.sort(key=lambda x: x['id'])

N = len(lot)
retires = [(x['id'], g, c) for x in lot for (g, c) in x['tags_avant'] if (g, c) not in x['tags_apres']]
poses = [(x['id'], g, c) for x in lot for (g, c) in x['tags_apres'] if (g, c) not in x['tags_avant']]
gardes = [(x['id'], g, c) for x in lot for (g, c) in x['tags_avant'] if (g, c) in x['tags_apres']]
N_TAGS_APRES = len(poses) + len(gardes)
N_TAGS_AVANT = len(retires) + len(gardes)
N_RANGES = sum(x['avant'] != x['apres'] for x in lot)
N_GRADES = sum(x['grades_avant'] != x['grades_apres'] for x in lot)
N_NIVEAUX = sum(x['niveau_avant'] != x['niveau_apres'] for x in lot)
assert (N, len(poses), len(retires), len(gardes), N_RANGES, N_GRADES, N_NIVEAUX) == \
	(18, 7, 3, 11, 4, 3, 13), (N, len(poses), len(retires), len(gardes), N_RANGES, N_GRADES, N_NIVEAUX)


def s(x: str | None) -> str:
	if x is None:
		return 'null'
	return "'" + x.replace("'", "''") + "'"


def arr(xs: list[str]) -> str:
	return 'array[' + ', '.join(s(x) for x in xs) + ']'


def ligne(x: dict) -> str:
	a, p = x['avant'], x['apres']
	return (f"({s(x['id'])}, {s(a[0])}, {s(a[1])}, {s(a[2])},\n"
	        f"\t {s(p[0])}, {s(p[1])}, {s(p[2])}, {arr(x['grades_avant'])}, {arr(x['grades_apres'])},"
	        f" {s(x['statut'])}, {x['niveau_avant']}, {x['niveau_apres']})")


def lignes_tags(prefixe: str) -> str:
	return ',\n'.join(
		[f"{prefixe}({s(i)}, {s(g)}, {s(c)}, true, false)" for (i, g, c) in retires]
		+ [f"{prefixe}({s(i)}, {s(g)}, {s(c)}, true, true)" for (i, g, c) in gardes]
		+ [f"{prefixe}({s(i)}, {s(g)}, {s(c)}, false, true)" for (i, g, c) in poses]) + ';'


def commente(bloc: str) -> str:
	return '\n'.join('-- ' + l if l else '--' for l in bloc.split('\n'))


TABLES = """create temporary table _q5b_modeles (
	id uuid primary key,
	avant_branche text, avant_notion text, avant_sous_notion text,
	apres_branche text not null, apres_notion text not null, apres_sous_notion text,
	grades_avant text[] not null,
	grades_apres text[] not null,
	statut text not null,
	niveau_avant integer not null,
	niveau_apres integer not null
);
create temporary table _q5b_tags (
	template_id uuid not null,
	grade text not null,
	code text not null,
	avant boolean not null,
	apres boolean not null,
	primary key (template_id, grade, code)
);"""

DONNEES = ('insert into _q5b_modeles values\n'
           + ',\n'.join('\t' + ligne(x) for x in lot) + ';\n'
           + 'insert into _q5b_tags values\n' + lignes_tags('\t'))

VERROUS = """-- Verrous avant les gardes : le verrou consultatif par modèle que prennent les triggers des tags
-- (un tag ou un déplacement saisi pendant la migration attend sa fin), et les lignes des modèles.
select pg_advisory_xact_lock(hashtextextended('question_template_points:' || id::text, 0))
  from _q5b_modeles order by id;
select 1 from public.question_templates where id in (select id from _q5b_modeles) order by id for update;"""

RESOLUTION = """drop table if exists pg_temp._q5b_noeuds;
create temporary table _q5b_noeuds as
	select r.id,
	       case when r.avant_branche is null then null
	            when r.avant_sous_notion is null then an.id else asn.id end as avant,
	       case when r.apres_sous_notion is null then pn.id else psn.id end as apres,
	       -- un chemin d'avant donné mais introuvable (un modèle sans nœud a un chemin nul)
	       r.avant_branche is not null and (case when r.avant_sous_notion is null then an.id else asn.id end) is null as avant_perdu
	  from _q5b_modeles r
	  left join public.classification_nodes ab on ab.kind = 'branch' and ab.parent_id is null and ab.archived_at is null and ab.name = r.avant_branche
	  left join public.classification_nodes an on an.kind = 'notion' and an.parent_id = ab.id and an.archived_at is null and an.name = r.avant_notion
	  left join public.classification_nodes asn on asn.kind = 'subnotion' and asn.parent_id = an.id and asn.archived_at is null and asn.name = r.avant_sous_notion
	  left join public.classification_nodes pb on pb.kind = 'branch' and pb.parent_id is null and pb.archived_at is null and pb.name = r.apres_branche
	  left join public.classification_nodes pn on pn.kind = 'notion' and pn.parent_id = pb.id and pn.archived_at is null and pn.name = r.apres_notion
	  left join public.classification_nodes psn on psn.kind = 'subnotion' and psn.parent_id = pn.id and psn.archived_at is null and psn.name = r.apres_sous_notion;
-- Clé : deux nœuds homonymes sous un même parent dupliqueraient les lignes et feraient échouer ici.
alter table _q5b_noeuds add primary key (id);
alter table _q5b_tags add column point_id uuid;
update _q5b_tags t set point_id = p.id
  from public.curriculum_points p
 where p.grade = t.grade and p.code = t.code and p.archived_at is null;"""

# Niveaux posés un modèle à la fois, dans l'ordre qui ne croise jamais un autre modèle publié
# de la catégorie (idx_question_templates_unique_category) : décroissant pour monter, croissant
# pour redescendre.
NIVEAUX_MONTEE = """do $niveaux$
declare r record;
begin
	for r in select m.id, m.niveau_apres from _q5b_modeles m
	           join public.question_templates q on q.id = m.id
	          where m.niveau_apres <> m.niveau_avant
	          order by m.niveau_apres desc
	loop
		update public.question_templates set level = r.niveau_apres where id = r.id;
	end loop;
end $niveaux$;"""

NIVEAUX_DESCENTE = """do $niveaux_retour$
declare r record;
begin
	for r in select m.id, m.niveau_avant from _q5b_retour m
	           join public.question_templates q on q.id = m.id
	          where m.niveau_apres <> m.niveau_avant
	          order by m.niveau_avant asc
	loop
		update public.question_templates set level = r.niveau_avant where id = r.id;
	end loop;
end $niveaux_retour$;"""

ROLLBACK = f"""set local lock_timeout = '5s';
drop table if exists pg_temp._q5b_noeuds;
drop table if exists pg_temp._q5b_tags;
drop table if exists pg_temp._q5b_modeles;
{TABLES}
insert into _q5b_modeles values
{',\n'.join(chr(9) + ligne(x) for x in lot)};
insert into _q5b_tags values
{lignes_tags(chr(9))}
{VERROUS.split(chr(10), 2)[2]}
{RESOLUTION}
do $garde_retour$
declare v_presents integer; v_intacts integer; v_total integer; v_tags integer;
begin
	if exists (select 1 from _q5b_noeuds where avant_perdu or apres is null)
	   or exists (select 1 from _q5b_tags where point_id is null) then
		raise exception 'rollback : chemins ou points introuvables';
	end if;
	select count(*), count(*) filter (where q.grades = r.grades_apres and q.status = r.statut
	                                     and q.level = r.niveau_apres and q.classification_node_id = x.apres)
	  into v_presents, v_intacts
	  from public.question_templates q
	  join _q5b_modeles r on r.id = q.id
	  join _q5b_noeuds x on x.id = q.id;
	if v_presents not in (0, {N}) then
		raise exception 'rollback : identifiants partiellement présents : % modèle(s) sur {N}', v_presents;
	end if;
	if v_intacts <> v_presents then
		raise exception 'rollback : % modèle(s) sur % ont encore le nœud, les niveaux, le statut et le niveau de la migration', v_intacts, v_presents;
	end if;
	-- Tags : exactement les {N_TAGS_APRES} d'après la migration, rien d'autre (tout niveau).
	select count(*), count(*) filter (where exists (select 1 from _q5b_tags t
	                                                where t.apres and t.template_id = q.template_id and t.point_id = q.point_id))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q5b_modeles r on r.id = q.template_id;
	if v_tags <> v_total or v_total <> least(v_presents, 1) * {N_TAGS_APRES} then
		raise exception 'rollback : tags changés depuis la migration (% du lot sur %, attendus %)', v_tags, v_total, least(v_presents, 1) * {N_TAGS_APRES};
	end if;
end $garde_retour$;
delete from public.question_template_points q
 using _q5b_tags t
 where t.apres and not t.avant and q.template_id = t.template_id and q.point_id = t.point_id;
alter table _q5b_modeles rename to _q5b_retour;
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q
   set classification_node_id = x.avant, grades = r.grades_avant
  from _q5b_retour r join _q5b_noeuds x on x.id = r.id
 where q.id = r.id;
{NIVEAUX_DESCENTE}
alter table public.question_templates enable trigger update_question_templates_updated_at;
insert into public.question_template_points (template_id, point_id)
select t.template_id, t.point_id
  from _q5b_tags t
  join public.question_templates q on q.id = t.template_id
 where t.avant and not t.apres;
do $retour$
declare v_presents integer; v_total integer; v_reposes integer;
begin
	select count(*) into v_presents from _q5b_retour r join public.question_templates q on q.id = r.id;
	select count(*), count(*) filter (where exists (select 1 from _q5b_tags t
	                                                where t.avant and t.template_id = q.template_id and t.point_id = q.point_id))
	  into v_total, v_reposes
	  from public.question_template_points q
	  join _q5b_retour r on r.id = q.template_id;
	if v_reposes <> v_total or v_total <> least(v_presents, 1) * {N_TAGS_AVANT} then
		raise exception 'rollback : % tag(s) reposé(s) sur %, attendus %', v_reposes, v_total, least(v_presents, 1) * {N_TAGS_AVANT};
	end if;
end $retour$;
drop table _q5b_noeuds;
drop table _q5b_tags;
drop table _q5b_retour;"""

ENTETE = f"""-- ============================================================================
-- Chantier « questions-5 », lot 4b : rangement des 4 brouillons, reclassement en 5e, niveaux
-- ============================================================================
-- {N} modèles du thème « Calcul littéral » :
--   - 4 brouillons neufs (#1986) sur le nœud de leur point, avec son tag :
--     2f556139 (Développer avec un facteur décimal) → 5-107, 1e68327e (Factoriser ax + bx) → 5-038,
--     1cd9dc60 et d4668b2d (Quelle équation traduit le problème ?) → 5-044 et 5-125 ;
--   - 3 modèles publiés reclassés de 4e en 5e (nœud inchangé, déjà celui du point de 5e) :
--     d4679e2d (Développer, niveau 1) 4-022 → 5-107 ; e66089e0 (Trouver un facteur commun) et
--     9231b54b (Factoriser) 4-070 → 5-038 ; `grades` [4] → [5] ;
--   - 13 modèles publiés montent d'un niveau pour laisser place aux brouillons 2f556139 (niveau 2) et
--     1e68327e (niveau 3) : Transformation › Développement 2-5 → 3-6, Transformation › Factorisation
--     3-11 → 4-12. Le niveau n'est qu'un ordre d'affichage dans la catégorie.
-- {len(poses)} tags posés, {len(retires)} retirés, {len(gardes)} gardés. Le contenu ne change pas : `updated_at` est PRÉSERVÉ.
-- Le fichier scripts/questions/3-lot-2/02-factoriser-facteur-commun.json (dcaabf69) porte le niveau 12
-- (clé de create-questions et de publier-lot : titre, thème, domaine, sous-domaine, niveau).
-- ============================================================================
-- Décisions de David le 2026-10-29 (journal docs/wip/questions-5-progress.md § 15). Fichier GÉNÉRÉ
-- par docs/wip/questions-5/lot-4b-rangement.py (relevé de la prod du 2026-10-29) — ne pas éditer à
-- la main.
--
-- Les modèles n'existent qu'en production : en base locale, la migration ne touche aucun modèle et
-- ses vérifications le tolèrent ; elle exige TOUT ou RIEN ({N} modèles). Elle est prouvée par
-- tests/integration/questions-5-lot4b-rangement.test.ts, qui fabrique des copies des identifiants
-- de la prod (nœud, niveaux, statut, niveau et tags d'avant) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore au nœud, aux niveaux, au statut, au niveau et aux tags
-- relevés le 2026-10-29 (sinon une saisie faite depuis serait écrasée ou contredite) ; aucun modèle
-- publié HORS du lot ne doit occuper un niveau visé. Nœuds désignés par leur chemin, résolus
-- STRICTEMENT ; le point de chaque tag posé est sur le nœud d'après (trigger des tags).
--
-- Données d'élèves (MCP, 2026-10-29) : 0 carte SRS, 0 tentative de compétence, 0 question
-- d'évaluation, 0 activité de journal, 0 relecture, sur les 18 modèles.
--
-- Accès (question tranchée par David le 2026-10-29) : les élèves et le prof de la 4e ne voient plus
-- d4679e2d, e66089e0 et 9231b54b ; ceux de la 5e les voient. Les 4 brouillons restent visibles par
-- l'admin seul. Le décalage des niveaux ne change que l'ordre. Aucune règle (policy) ne change.
--
-- Rollback (aucune donnée d'élève). Il rend aux modèles leur nœud (aucun pour les brouillons), leurs
-- niveaux, leur niveau et leurs tags d'avant. Garde : il refuse si un modèle n'a plus EXACTEMENT
-- l'état posé par la migration (sinon une saisie faite depuis serait écrasée en silence). Bloc
-- éprouvé par le test d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`,
-- ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
{commente(ROLLBACK)}
-- ROLLBACK:END
-- ============================================================================
"""

CORPS = f"""
-- Pas de `lock table` : `supabase db push` n'ouvre pas de bloc de transaction, et LOCK TABLE y
-- est refusé (25P01). Les verrous sont pris après l'étape 1, ligne par ligne.
set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires ----------------------------------------------
drop table if exists pg_temp._q5b_modeles;
drop table if exists pg_temp._q5b_tags;
{TABLES}
{DONNEES}

{VERROUS}

-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
{RESOLUTION}
do $resolution$
begin
	if exists (select 1 from _q5b_noeuds where avant_perdu or apres is null)
	   or exists (select 1 from _q5b_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s) de modèle, % point(s)',
			(select count(*) from _q5b_noeuds where avant_perdu or apres is null),
			(select count(*) from _q5b_tags where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : TOUT ou RIEN, état relevé, tags EXACTEMENT relevés, niveaux visés libres ----
do $garde$
declare v_presents integer; v_ecarts integer; v_niveaux integer; v_statuts integer; v_rangs integer; v_pris integer; v_detail text;
begin
	select count(*) into v_presents from _q5b_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, {N}) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur {N}', v_presents;
	end if;
	select count(*) into v_ecarts from _q5b_noeuds x
	  join public.question_templates q on q.id = x.id
	 where q.classification_node_id is distinct from x.avant;
	if v_ecarts <> 0 then
		raise exception 'modèles déplacés depuis le relevé : %', v_ecarts;
	end if;
	select count(*) into v_niveaux from _q5b_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.grades is distinct from r.grades_avant;
	if v_niveaux <> 0 then
		raise exception 'niveaux changés depuis le relevé : %', v_niveaux;
	end if;
	select count(*) into v_statuts from _q5b_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.status is distinct from r.statut;
	if v_statuts <> 0 then
		raise exception 'statuts changés depuis le relevé : %', v_statuts;
	end if;
	select count(*) into v_rangs from _q5b_modeles r
	  join public.question_templates q on q.id = r.id
	 where q.level is distinct from r.niveau_avant;
	if v_rangs <> 0 then
		raise exception 'rangs changés depuis le relevé : %', v_rangs;
	end if;
	-- Un modèle publié hors du lot, dans la même catégorie, au niveau visé par un modèle du lot
	select count(*) into v_pris from _q5b_modeles r
	  join public.question_templates q on q.id = r.id
	  join public.question_templates o
	    on o.theme = q.theme and o.domain = q.domain and coalesce(o.subdomain, '') = coalesce(q.subdomain, '')
	   and o.level = r.niveau_apres and o.status = 'published'
	 where r.niveau_apres <> r.niveau_avant
	   and o.id not in (select id from _q5b_modeles);
	if v_pris <> 0 then
		raise exception 'niveau visé déjà pris par un modèle publié hors du lot : %', v_pris;
	end if;
	-- « + » : tag en base non relevé (tout niveau) ; « - » : tag relevé absent de la base
	select string_agg(d.r, ', ' order by d.r) into v_detail from (
		(select '+' || left(q.template_id::text, 8) || ' ' || p.code as r
		   from public.question_template_points q
		   join _q5b_modeles m on m.id = q.template_id
		   join public.curriculum_points p on p.id = q.point_id
		  where not exists (select 1 from _q5b_tags t where t.template_id = q.template_id and t.point_id = q.point_id and t.avant))
		union all
		(select '-' || left(t.template_id::text, 8) || ' ' || t.code
		   from _q5b_tags t
		   join public.question_templates q on q.id = t.template_id
		  where t.avant
		    and not exists (select 1 from public.question_template_points u where u.template_id = t.template_id and u.point_id = t.point_id))) d;
	if v_detail is not null then
		raise exception 'tags différents du relevé : %', v_detail;
	end if;
end $garde$;

-- ---- 4. Retraits, rangement, niveaux, rangs, poses --------------------------------------
delete from public.question_template_points q
 using _q5b_tags t
 where q.template_id = t.template_id and q.point_id = t.point_id and t.avant and not t.apres;

-- Les modèles passent sur le nœud de leur point et en 5e AVANT les tags (le trigger des tags lit
-- le nœud du modèle).
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = x.apres
  from _q5b_noeuds x
 where q.id = x.id and q.classification_node_id is distinct from x.apres;
update public.question_templates q set grades = r.grades_apres
  from _q5b_modeles r
 where q.id = r.id and q.grades is distinct from r.grades_apres;
{NIVEAUX_MONTEE}
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.template_id, t.point_id
  from _q5b_tags t
  join public.question_templates q on q.id = t.template_id
 where t.apres and not t.avant;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_niveaux integer; v_statuts integer; v_rangs integer; v_total integer; v_tags integer; v_tags_attendus integer;
begin
	select count(*) into v_presents from _q5b_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _q5b_noeuds x
	  join public.question_templates q on q.id = x.id and q.classification_node_id = x.apres;
	select count(*) into v_niveaux from _q5b_modeles r
	  join public.question_templates q on q.id = r.id and q.grades = r.grades_apres;
	select count(*) into v_statuts from _q5b_modeles r
	  join public.question_templates q on q.id = r.id and q.status = r.statut;
	select count(*) into v_rangs from _q5b_modeles r
	  join public.question_templates q on q.id = r.id and q.level = r.niveau_apres;
	-- tags de ces modèles (tout niveau) : tous, et ceux du lot d'après (doivent coïncider)
	select count(*), count(*) filter (where exists (select 1 from _q5b_tags t
	                                                where t.template_id = q.template_id and t.point_id = q.point_id and t.apres))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _q5b_modeles m on m.id = q.template_id;
	-- Base sans les modèles (locale) : aucun tag attendu.
	v_tags_attendus := least(v_presents, 1) * {N_TAGS_APRES};
	if v_noeuds <> v_presents or v_niveaux <> v_presents or v_statuts <> v_presents or v_rangs <> v_presents
	   or v_tags <> v_tags_attendus or v_total <> v_tags_attendus then
		raise exception 'lot incohérent : nœuds %/%, niveaux %/%, statuts %/%, rangs %/%, tags du lot %/%, tags en base %',
			v_noeuds, v_presents, v_niveaux, v_presents, v_statuts, v_presents, v_rangs, v_presents, v_tags, v_tags_attendus, v_total;
	end if;
end $check$;

drop table _q5b_noeuds;
drop table _q5b_tags;
drop table _q5b_modeles;
"""

MIGRATION.write_text(ENTETE + CORPS)

fixture = [
	dict(id=x['id'], noeudAvant=' > '.join(filter(None, x['avant'])) or None,
	     noeudApres=' > '.join(filter(None, x['apres'])), gradesAvant=x['grades_avant'],
	     gradesApres=x['grades_apres'], statut=x['statut'], niveauAvant=x['niveau_avant'],
	     niveauApres=x['niveau_apres'], sousDomaine=modeles[x['id']]['subdomain'],
	     tagsAvant=[f'{g}§{c}' for g, c in x['tags_avant']],
	     tagsApres=[f'{g}§{c}' for g, c in x['tags_apres']])
	for x in lot
]
FIXTURE.write_text(json.dumps(fixture, ensure_ascii=False, indent='\t') + '\n')
# Mise en forme du dépôt (sinon chaque régénération réécrit la fixture commitée).
subprocess.run(['pnpm', 'exec', 'prettier', '--write', str(FIXTURE)], cwd=RACINE, check=True,
               stdout=subprocess.DEVNULL)
print(f'{MIGRATION.name} : {N} modèles, {N_RANGES} rangés, {N_GRADES} reclassés, {N_NIVEAUX} rangs, '
      f'{len(poses)} tags posés, {len(retires)} retirés ; fixture {FIXTURE.name}')
