#!/usr/bin/env python3
"""Génère la migration des tags du lycée (passe lycée, étape e) et la fixture de son test.

Entrées (validées par David le 2026-10-23) :
  - analyse/{2de,1spe-a,1spe-a-2de,1spe-b,tspe,tspe-tcomp,texp}.csv : les 650 verdicts (recos de la page à
    cocher reportées) ; seules les lignes TAG donnent un tag (MODIFIER et TAG_PAR_VARIATION : lot à part, après) ;
  - analyse/noeuds-decides.csv : les 54 tags que le trigger refusait → modèle DÉPLACÉ sur le nœud du point (R2)
    ou tag RETIRÉ (R1, retrait forcé) ;
  - analyse/etat-prod-2026-10-23/ : nœuds, points et modèles de la prod (empreintes md5 identiques à la prod le
    2026-10-23) ; les tags actuels du lycée = les 473 de la migration 20261013120000 (même empreinte).

Les tags actuels non confirmés par un TAG sont retirés (décision de David du 2026-10-23).

Sorties : supabase/migrations/<MIGRATION> (GÉNÉRÉE, ne pas éditer à la main) et
tests/integration/fixtures/tags-lycee.json.

    python3 docs/wip/passe-lycee/generer-migration-tags.py     (racine du worktree)
"""

import csv
import json
import re

ANALYSE = 'docs/wip/passe-lycee/analyse/'
ETAT = ANALYSE + 'etat-prod-2026-10-23/'
LOTS = ['2de', '1spe-a', '1spe-a-2de', '1spe-b', 'tspe', 'tspe-tcomp', 'texp']
TAGS_ACTUELS = 'supabase/migrations/20261013120000_tags_modeles_points.sql'
MIGRATION = 'supabase/migrations/20261023180000_tags_lycee.sql'
FIXTURE = 'tests/integration/fixtures/tags-lycee.json'
LYCEE = ['2', '1_SPE', '1_GEN', '1_TECHNO', 'T_SPE', 'T_COMP', 'T_EXP', 'T_TECHNO']


def main() -> None:
    noeuds = {n['id']: n for n in json.load(open(ETAT + 'nodes.json'))}
    points = {(p['grade'], p['code']): p for p in json.load(open(ETAT + 'points.json')) if not p['archived_at']}
    noeud_modele = {t['id']: t['node'] for t in json.load(open(ETAT + 'templates.json'))}

    def chemin(i: str) -> list[str]:
        r = []
        while i:
            r.append(noeuds[i]['name'])
            i = noeuds[i]['parent_id']
        return list(reversed(r))

    def notion_de(i: str) -> str:
        n = noeuds[i]
        return n['parent_id'] if n['kind'] == 'subnotion' else n['id']

    # Tags actuels (lycée) : ceux de la migration du 2026-10-13, empreinte identique à la prod.
    s = open(TAGS_ACTUELS).read()
    debut = s.index('insert into _tg_tags (template_id, code, grade) values')
    actuels = {(t, g, c) for t, c, g in re.findall(r"\('([0-9a-f-]{36})', '([^']+)', '([^']+)'\)", s[debut:s.index(';', debut)])}

    decides = list(csv.DictReader(open(ANALYSE + 'noeuds-decides.csv'), delimiter=';'))
    retires = {(d['template_id'], d['programme'], d['code']) for d in decides if d['action'] == 'RETIRER'}
    cibles = {}
    for d in decides:
        if d['action'] == 'DEPLACER':
            pn = points[(d['programme'], d['code'])]['node_id']
            assert cibles.get(d['template_id'], pn) == pn, d['template_id']
            cibles[d['template_id']] = pn

    finals = set()
    for lot in LOTS:
        for x in csv.DictReader(open(ANALYSE + lot + '.csv'), delimiter=';'):
            cle = (x['template_id'], x['programme'], x['code'].strip())
            if x['verdict'] == 'TAG' and cle not in retires:
                finals.add(cle)

    ids = sorted({t for t, _, _ in actuels | finals} | set(cibles))
    sortie = []
    for tid in ids:
        avant = noeud_modele[tid]
        apres = cibles.get(tid, avant)
        tags_avant = sorted((g, c) for t, g, c in actuels if t == tid)
        tags_apres = sorted((g, c) for t, g, c in finals if t == tid)
        if apres == avant and tags_avant == tags_apres:
            continue
        # Les règles du trigger, rejouées : point sur le nœud du modèle ou sa notion, un point par programme.
        for g, c in tags_apres:
            pn = points[(g, c)]['node_id']
            assert pn in (apres, notion_de(apres)), (tid, c)
        assert len({g for g, _ in tags_apres}) == len(tags_apres), tid
        sortie.append({
            'id': tid,
            'noeud_avant': chemin(avant),
            'noeud_apres': chemin(apres),
            'tags_avant': [{'grade': g, 'code': c} for g, c in tags_avant],
            'tags_apres': [{'grade': g, 'code': c} for g, c in tags_apres],
        })

    retirer = [(m['id'], t['grade'], t['code']) for m in sortie for t in m['tags_avant'] if t not in m['tags_apres']]
    poser = [(m['id'], t['grade'], t['code']) for m in sortie for t in m['tags_apres'] if t not in m['tags_avant']]
    gardes = [(m['id'], t['grade'], t['code']) for m in sortie for t in m['tags_apres'] if t in m['tags_avant']]
    deplaces = [m for m in sortie if m['noeud_avant'] != m['noeud_apres']]
    n = len(sortie)

    json.dump({'modeles': sortie}, open(FIXTURE, 'w'), ensure_ascii=False, indent='\t')
    open(FIXTURE, 'a').write('\n')

    def lit(v: str) -> str:
        return '$tl$' + v + '$tl$'

    def ch(c: list[str]) -> str:
        return ', '.join(lit(v) for v in c) + (', null' if len(c) == 2 else '')

    def valeurs(rows: list[tuple[str, str, str]], prefixe: str = '') -> str:
        return ',\n'.join(f"{prefixe}  ('{t}'::uuid, '{g}', '{c}')" for t, g, c in rows)

    grades_sql = ', '.join("'" + g + "'" for g in LYCEE)
    rb = [
        "-- Rollback (aucune donnée d'élève : 0 état, 0 journal, 0 exercice sur un point du lycée le 2026-10-23).",
        '-- Il retire les tags posés, remet les modèles à leur nœud d\'avant, puis repose les tags retirés. Un tag',
        '-- saisi depuis sur ces modèles et contredit par le nœud d\'avant fait échouer le retour',
        '-- (question_templates_guard_point_tags) : le retirer d\'abord. Bloc éprouvé par le test d\'intégration, à',
        '-- jouer dans une transaction :',
        '-- ROLLBACK:BEGIN',
        "-- set local lock_timeout = '5s';",
        '-- lock table public.question_template_points, public.question_templates in share row exclusive mode;',
        '-- delete from public.question_template_points q',
        '--  using public.curriculum_points p, (values',
    ]
    rb += valeurs(poser, '-- ').split('\n')
    rb += [
        '--  ) as r(template_id, grade, code)',
        '--  where q.template_id = r.template_id and p.id = q.point_id and p.grade = r.grade and p.code = r.code;',
        '-- create temporary table _tl_retour on commit drop as',
        '-- select r.id, case when r.sous_notion is null then nn.id else s.id end as node_id',
        '--   from (values',
    ]
    rb += [f"--   ('{m['id']}'::uuid, {ch(m['noeud_avant'])})" + (',' if i < len(deplaces) - 1 else '') for i, m in enumerate(deplaces)]
    rb += [
        '--   ) as r(id, branche, notion, sous_notion)',
        "--   left join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = r.branche",
        "--   left join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.archived_at is null and nn.name = r.notion",
        "--   left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = nn.id and s.archived_at is null and s.name = r.sous_notion;",
        '-- do $retour$ begin',
        '-- \tif exists (select 1 from _tl_retour where node_id is null) then',
        "-- \t\traise exception 'rollback : % chemin(s) d''origine introuvable(s)', (select count(*) from _tl_retour where node_id is null);",
        '-- \tend if;',
        '-- end $retour$;',
        '-- alter table public.question_templates disable trigger update_question_templates_updated_at;',
        '-- update public.question_templates q set classification_node_id = r.node_id',
        '--   from _tl_retour r where q.id = r.id;',
        '-- alter table public.question_templates enable trigger update_question_templates_updated_at;',
        '-- insert into public.question_template_points (template_id, point_id)',
        '-- select r.template_id, p.id',
        '--   from (values',
    ]
    rb += valeurs(retirer, '-- ').split('\n')
    rb += [
        '--   ) as r(template_id, grade, code)',
        '--   join public.question_templates q on q.id = r.template_id',
        '--   join public.curriculum_points p on p.grade = r.grade and p.code = r.code and p.archived_at is null',
        '--  on conflict do nothing;',
        '-- drop table _tl_retour;',
        '-- ROLLBACK:END',
    ]
    rollback = '\n'.join(rb)

    o = [f'''-- ============================================================================
-- Tags du lycée (passe lycée, étape e) : les modèles de la 2de à la Tle reçoivent les points
-- de programme confirmés par les verdicts, leurs tags non confirmés sont retirés, et les
-- modèles mal rangés passent sur le nœud de leur point (ADR 0020 § 7).
-- ============================================================================
-- Source de vérité : docs/wip/passe-lycee/analyse/*.csv (650 verdicts) et noeuds-decides.csv,
-- VALIDÉS par David le 2026-10-23 (journal : docs/wip/passe-lycee-progress.md). Fichier GÉNÉRÉ
-- par docs/wip/passe-lycee/generer-migration-tags.py — ne pas éditer à la main.
--   * {n} modèles touchés ;
--   * {len(retirer)} tags retirés (tags actuels sans verdict TAG : MODIFIER, TAG_PAR_VARIATION,
--     HORS_PROGRAMME, autre point retenu, ou retrait forcé) ;
--   * {len(poser)} tags posés ({len(gardes)} tags actuels gardés sur ces modèles) ;
--   * {len(deplaces)} modèles déplacés sur le nœud de leur point (R2), sans quoi le trigger
--     question_template_points_check_rules refuserait le tag.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche
-- aucun modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN ({n} modèles). Elle
-- est prouvée par tests/integration/tags-lycee.test.ts, qui fabrique des copies des
-- identifiants de la prod (à leur nœud et leurs tags d'avant) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore au nœud relevé et porter EXACTEMENT les tags du lycée
-- relevés (sinon une saisie faite depuis serait écrasée ou contredite). Les nœuds sont désignés
-- par leur chemin, résolu STRICTEMENT. Ordre : retraits, déplacements, puis poses (les gardes
-- des tags restent actives et valident chaque étape).
--
-- `updated_at` des modèles est PRÉSERVÉ (ranger et taguer ne modifient pas le contenu).
--
-- Accès (question tranchée par David le 2026-10-23) : aucune règle d'accès ne change, personne
-- ne gagne d'accès. Les tags sont lisibles par tout utilisateur connecté (policy
-- question_template_points_read_authenticated), comme avant. Aucune donnée d'élève n'est
-- touchée (prod : 0 état, 0 journal, 0 exercice sur un point du lycée).
--
{rollback}
-- ============================================================================

set local lock_timeout = '5s';
-- Verrous avant les gardes : un tag ou un rangement saisi pendant la migration attend sa fin.
lock table public.question_template_points, public.question_templates in share row exclusive mode;

-- ---- 1. Le lot, en tables temporaires ----------------------------------------------
drop table if exists pg_temp._tl_modeles;
drop table if exists pg_temp._tl_tags;
create temporary table _tl_modeles (
	id uuid primary key,
	avant_branche text not null, avant_notion text not null, avant_sous_notion text,
	apres_branche text not null, apres_notion text not null, apres_sous_notion text
);
create temporary table _tl_tags (
	template_id uuid not null,
	grade text not null,
	code text not null,
	avant boolean not null,
	apres boolean not null,
	primary key (template_id, grade, code)
);''']
    for i in range(0, n, 200):
        o.append('insert into _tl_modeles values')
        o.append(',\n'.join(f"  ('{m['id']}', {ch(m['noeud_avant'])}, {ch(m['noeud_apres'])})" for m in sortie[i:i + 200]) + ';')
    lignes_tags = []
    for m in sortie:
        for t in sorted({(x['grade'], x['code']) for x in m['tags_avant'] + m['tags_apres']}):
            av = {'grade': t[0], 'code': t[1]} in m['tags_avant']
            ap = {'grade': t[0], 'code': t[1]} in m['tags_apres']
            lignes_tags.append(f"  ('{m['id']}', '{t[0]}', '{t[1]}', {str(av).lower()}, {str(ap).lower()})")
    for i in range(0, len(lignes_tags), 200):
        o.append('insert into _tl_tags values')
        o.append(',\n'.join(lignes_tags[i:i + 200]) + ';')
    o.append(f'''
-- ---- 2. Résolution STRICTE des chemins et des points ------------------------------------
create temporary table _tl_noeuds as
	select r.id,
	       case when r.avant_sous_notion is null then an.id else asn.id end as avant,
	       case when r.apres_sous_notion is null then pn.id else psn.id end as apres
	  from _tl_modeles r
	  left join public.classification_nodes ab on ab.kind = 'branch' and ab.parent_id is null and ab.archived_at is null and ab.name = r.avant_branche
	  left join public.classification_nodes an on an.kind = 'notion' and an.parent_id = ab.id and an.archived_at is null and an.name = r.avant_notion
	  left join public.classification_nodes asn on asn.kind = 'subnotion' and asn.parent_id = an.id and asn.archived_at is null and asn.name = r.avant_sous_notion
	  left join public.classification_nodes pb on pb.kind = 'branch' and pb.parent_id is null and pb.archived_at is null and pb.name = r.apres_branche
	  left join public.classification_nodes pn on pn.kind = 'notion' and pn.parent_id = pb.id and pn.archived_at is null and pn.name = r.apres_notion
	  left join public.classification_nodes psn on psn.kind = 'subnotion' and psn.parent_id = pn.id and psn.archived_at is null and psn.name = r.apres_sous_notion;
alter table _tl_tags add column point_id uuid;
update _tl_tags t set point_id = p.id
  from public.curriculum_points p
 where p.grade = t.grade and p.code = t.code and p.archived_at is null;
do $resolution$
begin
	if exists (select 1 from _tl_noeuds where avant is null or apres is null)
	   or exists (select 1 from _tl_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s) de modèle, % point(s)',
			(select count(*) from _tl_noeuds where avant is null or apres is null),
			(select count(*) from _tl_tags where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, nœud relevé, tags du lycée EXACTEMENT relevés ---
do $garde$
declare v_presents integer; v_ecarts integer; v_detail text;
begin
	select count(*) into v_presents from _tl_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, {n}) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur {n}', v_presents;
	end if;
	select count(*) into v_ecarts from _tl_noeuds x
	  join public.question_templates q on q.id = x.id
	 where q.classification_node_id is distinct from x.avant;
	if v_ecarts <> 0 then
		raise exception 'modèles déplacés depuis le relevé : %', v_ecarts;
	end if;
	-- « + » : tag en base non relevé ; « - » : tag relevé absent de la base
	select string_agg(d.r, ', ' order by d.r) into v_detail from (
		(select '+' || left(q.template_id::text, 8) || ' ' || p.code as r
		   from public.question_template_points q
		   join _tl_modeles m on m.id = q.template_id
		   join public.curriculum_points p on p.id = q.point_id
		  where p.grade in ({grades_sql})
		    and not exists (select 1 from _tl_tags t where t.template_id = q.template_id and t.point_id = q.point_id and t.avant))
		union all
		(select '-' || left(t.template_id::text, 8) || ' ' || t.code
		   from _tl_tags t
		   join public.question_templates q on q.id = t.template_id
		  where t.avant
		    and not exists (select 1 from public.question_template_points u where u.template_id = t.template_id and u.point_id = t.point_id))) d;
	if v_detail is not null then
		raise exception 'tags du lycée différents du relevé : %', v_detail;
	end if;
end $garde$;

-- ---- 4. Retraits, déplacements, poses -----------------------------------------------
delete from public.question_template_points q
 using _tl_tags t
 where q.template_id = t.template_id and q.point_id = t.point_id and t.avant and not t.apres;

alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = x.apres
  from _tl_noeuds x
 where q.id = x.id and q.classification_node_id is distinct from x.apres;
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.template_id, t.point_id
  from _tl_tags t
  join public.question_templates q on q.id = t.template_id
 where t.apres and not t.avant;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_noeuds integer; v_total integer; v_tags integer; v_tags_attendus integer;
begin
	select count(*) into v_presents from _tl_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_noeuds from _tl_noeuds x
	  join public.question_templates q on q.id = x.id and q.classification_node_id = x.apres;
	-- tags du lycée de ces modèles : tous, et ceux du lot d'après (doivent coïncider)
	select count(*), count(*) filter (where exists (select 1 from _tl_tags t
	                                                where t.template_id = q.template_id and t.point_id = q.point_id and t.apres))
	  into v_total, v_tags
	  from public.question_template_points q
	  join _tl_modeles m on m.id = q.template_id
	  join public.curriculum_points p on p.id = q.point_id
	 where p.grade in ({grades_sql});
	-- Base sans les modèles (locale) : aucun tag attendu.
	v_tags_attendus := least(v_presents, 1) * {len(poser) + len(gardes)};
	if v_noeuds <> v_presents or v_tags <> v_tags_attendus or v_total <> v_tags_attendus then
		raise exception 'lot incohérent : modèles %/%, tags du lot %/%, tags du lycée %', v_noeuds, v_presents, v_tags, v_tags_attendus, v_total;
	end if;
end $check$;

drop table _tl_noeuds;
drop table _tl_tags;
drop table _tl_modeles;
''')
    open(MIGRATION, 'w').write('\n'.join(o))
    print(f'{n} modèles, {len(retirer)} tags retirés, {len(poser)} posés, {len(gardes)} gardés, {len(deplaces)} déplacés')


main()
