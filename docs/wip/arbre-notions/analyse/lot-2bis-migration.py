"""Génère la migration des tags du lot 2 bis (primaire et collège) et la fixture de son test.

Source : les CSV de verdicts (cycle2, cm, sixieme, cycle4), validés par David le 2026-10-20,
et l'état de la prod (points, nœuds : `points.json`, `nodes.json`, relus par l'API REST avec
la clé anonyme ; modèles : `releves/templates.json`). Décisions du 2026-10-20 :
  * un tag par ligne TAG ; les lignes MODIFIER ne sont taguées qu'après la modification ;
  * modèle dont le point est sur une sous-notion voisine → déplacé sur cette sous-notion (R2),
    TAG et MODIFIER confondus ;
  * point sur une notion à sous-notions → sous-notion choisie par David (CHOIX_SOUS_NOTION) ;
  * 4-073 rattaché au nœud du modèle qui le décrit (POINTS_RATTACHES) ;
  * niveau changé quand la colonne `grade` n'est pas dans les niveaux du modèle.

    python3 docs/wip/arbre-notions/analyse/lot-2bis-migration.py docs/wip/arbre-notions/analyse/etat-prod-2026-10-20
"""

import csv
import json
import sys

ANALYSE = 'docs/wip/arbre-notions/analyse/'
RELEVES = 'docs/wip/arbre-notions/releves/'
LOTS = ['cycle2', 'cm', 'sixieme', 'cycle4']
MIGRATION = 'supabase/migrations/20261020233600_tags_lot_2bis_primaire_college.sql'
FIXTURE = 'tests/integration/fixtures/tags-lot-2bis.json'

# Réponses de David du 2026-10-20 (liste `lot-2bis-modifications.md`, partie 1).
CHOIX_SOUS_NOTION = {
    '81a64b0a': 'forme fractionnaire',
    '5d7726eb': 'forme fractionnaire',
    '00e255ee': 'comparaison et mesure',
    '24331791': 'ax + b = c',
    '84755a7b': 'ax + b = c',
    '372d4f79': 'ax + b = c',
    'b1550840': 'ax + b = c',
}
# Point → modèle dont il prend le nœud.
POINTS_RATTACHES = {('4', '4-004'): '78feafed', ('4', '4-073'): '78feafed'}


def main() -> None:
    dossier = sys.argv[1]
    points = {(p['grade'], p['code']): p for p in json.load(open(dossier + '/points.json'))}
    noeuds = {n['id']: n for n in json.load(open(dossier + '/nodes.json'))}
    modeles = {t['id']: t for t in json.load(open(RELEVES + 'templates.json'))}

    def chemin(i: str) -> list[str]:
        r = []
        while i:
            r.append(noeuds[i]['name'])
            i = noeuds[i]['parent_id']
        return list(reversed(r))

    def notion_de(i: str) -> str:
        n = noeuds[i]
        return n['parent_id'] if n['kind'] == 'subnotion' else n['id']

    lignes = []
    for lot in LOTS:
        for x in csv.DictReader(open(ANALYSE + lot + '.csv', newline=''), delimiter=';'):
            if x['verdict'] in ('TAG', 'MODIFIER'):
                lignes.append(x)

    # Nœud des points rattachés, avant / après.
    noeud_point = {k: p['node_id'] for k, p in points.items()}
    rattaches = []
    for (grade, code), court in POINTS_RATTACHES.items():
        t = next(t for t in modeles.values() if t['id'].startswith(court))
        avant = noeud_point[(grade, code)]
        noeud_point[(grade, code)] = t['classification_node_id']
        rattaches.append({'grade': grade, 'code': code, 'avant': chemin(avant), 'apres': chemin(t['classification_node_id'])})

    sortie = []
    for x in lignes:
        tid, court = x['template_id'], x['template_id'][:8]
        t = modeles[tid]
        avant = t['classification_node_id']
        apres = avant
        if ',' not in x['code']:
            pn = noeud_point[(x['grade'], x['code'])]
            if pn not in (avant, notion_de(avant)):
                if noeuds[pn]['kind'] == 'subnotion':
                    apres = pn
                else:
                    nom = CHOIX_SOUS_NOTION[court]
                    apres = next(n['id'] for n in noeuds.values() if n['parent_id'] == pn and n['name'] == nom)
        else:
            # Scissions (5-026 / 5-123) : les deux points sont sur le nœud du modèle.
            for c in x['code'].split(','):
                assert noeud_point[(x['grade'], c)] in (avant, notion_de(avant)), (court, c)
        grades_apres = t['grades'] if x['grade'] in t['grades'] else [x['grade']]
        tag = {'grade': x['grade'], 'code': x['code']} if x['verdict'] == 'TAG' else None
        if apres == avant and grades_apres == t['grades'] and tag is None:
            continue
        if tag:
            p = points[(x['grade'], x['code'])]
            assert p['archived_at'] is None, x['code']
            assert noeud_point[(x['grade'], x['code'])] in (apres, notion_de(apres)), (court, x['code'])
        sortie.append({
            'id': tid,
            'noeud_avant': chemin(avant),
            'noeud_apres': chemin(apres),
            'grades_avant': t['grades'],
            'grades_apres': grades_apres,
            'tag': tag,
        })
    assert all(len(set(t['id'] for t in sortie)) == len(sortie) for _ in [0])

    deplaces = [m for m in sortie if m['noeud_avant'] != m['noeud_apres']]
    niveaux = [m for m in sortie if m['grades_avant'] != m['grades_apres']]
    tags = [m for m in sortie if m['tag']]

    json.dump({'modeles': sortie, 'points_rattaches': rattaches}, open(FIXTURE, 'w'), ensure_ascii=False, indent='\t')
    open(FIXTURE, 'a').write('\n')

    def lit(s: str) -> str:
        return '$l2$' + s + '$l2$'

    def tableau(g: list[str]) -> str:
        return 'array[' + ', '.join("'" + v + "'" for v in g) + ']'

    def ch(c: list[str]) -> str:
        return ', '.join(lit(v) for v in c) + (', null' if len(c) == 2 else '')

    n = len(sortie)
    changes = [m for m in sortie if m['noeud_avant'] != m['noeud_apres'] or m['grades_avant'] != m['grades_apres']]
    rb = [
        "-- Rollback (il ne retire que ce que la migration a posé ; aucune donnée d'élève). Les tags",
        "-- saisis depuis sur ces modèles sont gardés, mais un retour de nœud qui les contredirait est",
        "-- refusé par question_templates_guard_point_tags : les compter d'abord. Bloc éprouvé par le",
        "-- test d'intégration, à jouer dans une transaction :",
        "-- ROLLBACK:BEGIN",
        "-- delete from public.question_template_points q",
        "--  using public.curriculum_points p, (values",
    ]
    rb += [f"--   ('{m['id']}'::uuid, '{m['tag']['grade']}', '{m['tag']['code']}')" + (',' if i < len(tags) - 1 else '') for i, m in enumerate(tags)]
    rb += [
        "--  ) as r(template_id, grade, code)",
        "--  where q.template_id = r.template_id and p.id = q.point_id and p.grade = r.grade and p.code = r.code;",
        "-- create temporary table _l2_retour on commit drop as",
        "-- select r.id, r.grades, case when r.sous_notion is null then nn.id else s.id end as node_id",
        "--   from (values",
    ]
    rb += [f"--   ('{m['id']}'::uuid, {ch(m['noeud_avant'])}, {tableau(m['grades_avant'])})" + (',' if i < len(changes) - 1 else '') for i, m in enumerate(changes)]
    rb += [
        "--   ) as r(id, branche, notion, sous_notion, grades)",
        "--   left join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.name = r.branche",
        "--   left join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = r.notion",
        "--   left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = nn.id and s.name = r.sous_notion;",
        "-- do $retour$ begin",
        "-- \tif exists (select 1 from _l2_retour where node_id is null) then",
        "-- \t\traise exception 'rollback : % chemin(s) d''origine introuvable(s)', (select count(*) from _l2_retour where node_id is null);",
        "-- \tend if;",
        "-- end $retour$;",
        "-- alter table public.question_templates disable trigger update_question_templates_updated_at;",
        "-- update public.question_templates q set classification_node_id = r.node_id, grades = r.grades",
        "--   from _l2_retour r where q.id = r.id;",
        "-- alter table public.question_templates enable trigger update_question_templates_updated_at;",
        "-- drop table _l2_retour;",
    ]
    for r in rattaches:
        c = r['avant']
        sous = f"and s.name = $l2${c[2]}$l2$" if len(c) == 3 else ''
        cible = 's.id' if len(c) == 3 else 'nn.id'
        rb += [
            f"-- update public.curriculum_points p set node_id = {cible}",
            "--   from public.classification_nodes b",
            f"--   join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = $l2${c[1]}$l2$",
        ]
        if len(c) == 3:
            rb.append(f"--   join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = nn.id {sous}")
        rb.append(f"--  where b.kind = 'branch' and b.parent_id is null and b.name = $l2${c[0]}$l2$ and p.grade = '{r['grade']}' and p.code = '{r['code']}' and p.archived_at is null;")
    rb.append("-- ROLLBACK:END")
    rollback = '\n'.join(rb)
    o = []
    o.append(f'''-- ============================================================================
-- Tags du lot 2 bis : les modèles du primaire et du collège (CP → 3e) reçoivent leur point
-- de programme (ADR 0020 § 7), après les déplacements et changements de niveau qu'exige la
-- garde des tags.
-- ============================================================================
-- Source de vérité : docs/wip/arbre-notions/analyse/{{cycle2,cm,sixieme,cycle4}}.csv, verdicts
-- VALIDÉS par David (questions des modèles et niveaux, 2026-10-20) ; liste commentée :
-- docs/wip/arbre-notions/analyse/lot-2bis-modifications.md. Fichier GÉNÉRÉ par
-- docs/wip/arbre-notions/analyse/lot-2bis-migration.py — ne pas éditer à la main.
--   * {len(tags)} tags (verdict TAG) ; les modèles MODIFIER seront tagués après leur modification ;
--   * {len(deplaces)} modèles déplacés sur la sous-notion de leur point (R2), sans quoi le trigger
--     question_template_points_check_rules refuserait le tag ;
--   * {len(niveaux)} modèles reclassés de 5e en 4e ;
--   * les points 4-073 et 4-004 (sa moitié d'origine) rattachés au nœud « écriture d'une
--     expression », où est le modèle de 4-073.
--
-- Les modèles n'existent qu'en production : en base locale (vide), la migration ne touche
-- aucun modèle et ses vérifications le tolèrent ; elle exige TOUT ou RIEN ({n} modèles). Elle
-- est prouvée par tests/integration/tags-lot-2bis.test.ts, qui fabrique des copies des
-- identifiants de la prod (à leur nœud et leurs niveaux d'avant) puis rejoue CE fichier.
--
-- Garde : chaque modèle doit être encore au nœud et aux niveaux relevés, et aucun ne doit
-- porter de tag au CP → 3e (sinon une saisie faite depuis serait écrasée ou contredite).
-- Les nœuds sont désignés par leur chemin, résolu STRICTEMENT.
--
-- `updated_at` des modèles est PRÉSERVÉ (ranger et taguer ne modifient pas le contenu ; le
-- niveau suit la même règle que le rangement de la #981).
--
-- Accès (question tranchée par David le 2026-10-20) : aucune règle d'accès ne change. Les tags
-- sont lisibles par tout utilisateur connecté (policy question_template_points_read_authenticated),
-- comme avant ; l'élève du CP à la 3e voit son programme dans « Ma progression » dès qu'un
-- modèle de son niveau est tagué. Aucune donnée d'élève n'est touchée.
--
{rollback}
-- ============================================================================

set local lock_timeout = '5s';

-- ---- 1. Le lot, en tables temporaires ----------------------------------------------
drop table if exists pg_temp._l2_modeles;
drop table if exists pg_temp._l2_points;
create temporary table _l2_modeles (
	id uuid primary key,
	avant_branche text not null, avant_notion text not null, avant_sous_notion text,
	apres_branche text not null, apres_notion text not null, apres_sous_notion text,
	grades_avant text[] not null, grades_apres text[] not null,
	tag_grade text, tag_code text
);
create temporary table _l2_points (
	grade text not null, code text not null,
	branche text not null, notion text not null, sous_notion text
);''')
    for i in range(0, n, 200):
        o.append('insert into _l2_modeles values')
        vals = []
        for m in sortie[i:i + 200]:
            tg = f"'{m['tag']['grade']}', '{m['tag']['code']}'" if m['tag'] else 'null, null'
            vals.append(f"  ('{m['id']}', {ch(m['noeud_avant'])}, {ch(m['noeud_apres'])}, "
                        f"{tableau(m['grades_avant'])}, {tableau(m['grades_apres'])}, {tg})")
        o.append(',\n'.join(vals) + ';')
    o.append('insert into _l2_points values')
    o.append(',\n'.join(f"  ('{r['grade']}', '{r['code']}', {ch(r['apres'])})" for r in rattaches) + ';')
    o.append(f'''
-- ---- 2. Résolution STRICTE des chemins -------------------------------------------------
create temporary table _l2_noeuds as
	select r.id,
	       case when r.avant_sous_notion is null then an.id else asn.id end as avant,
	       case when r.apres_sous_notion is null then pn.id else psn.id end as apres
	  from _l2_modeles r
	  left join public.classification_nodes ab on ab.kind = 'branch' and ab.parent_id is null and ab.name = r.avant_branche
	  left join public.classification_nodes an on an.kind = 'notion' and an.parent_id = ab.id and an.name = r.avant_notion
	  left join public.classification_nodes asn on asn.kind = 'subnotion' and asn.parent_id = an.id and asn.name = r.avant_sous_notion
	  left join public.classification_nodes pb on pb.kind = 'branch' and pb.parent_id is null and pb.name = r.apres_branche
	  left join public.classification_nodes pn on pn.kind = 'notion' and pn.parent_id = pb.id and pn.name = r.apres_notion
	  left join public.classification_nodes psn on psn.kind = 'subnotion' and psn.parent_id = pn.id and psn.name = r.apres_sous_notion;
create temporary table _l2_points_noeuds as
	select p.id as point_id, case when r.sous_notion is null then nn.id else s.id end as node_id
	  from _l2_points r
	  left join public.curriculum_points p on p.grade = r.grade and p.code = r.code and p.archived_at is null
	  left join public.classification_nodes b on b.kind = 'branch' and b.parent_id is null and b.name = r.branche
	  left join public.classification_nodes nn on nn.kind = 'notion' and nn.parent_id = b.id and nn.name = r.notion
	  left join public.classification_nodes s on s.kind = 'subnotion' and s.parent_id = nn.id and s.name = r.sous_notion;
create temporary table _l2_tags as
	select r.id as template_id, p.id as point_id
	  from _l2_modeles r
	  left join public.curriculum_points p on p.grade = r.tag_grade and p.code = r.tag_code and p.archived_at is null
	 where r.tag_code is not null;
do $resolution$
begin
	if exists (select 1 from _l2_noeuds where avant is null or apres is null)
	   or exists (select 1 from _l2_points_noeuds where point_id is null or node_id is null)
	   or exists (select 1 from _l2_tags where point_id is null) then
		raise exception 'chemins ou points introuvables : % nœud(s) de modèle, % point(s) rattaché(s), % point(s) de tag',
			(select count(*) from _l2_noeuds where avant is null or apres is null),
			(select count(*) from _l2_points_noeuds where point_id is null or node_id is null),
			(select count(*) from _l2_tags where point_id is null);
	end if;
end $resolution$;

-- ---- 3. Gardes : présence TOUT ou RIEN, état relevé, aucun tag déjà posé ---------------
do $garde$
declare v_presents integer; v_ecarts integer; v_tags integer;
begin
	select count(*) into v_presents from _l2_modeles r join public.question_templates q on q.id = r.id;
	if v_presents not in (0, {n}) then
		raise exception 'identifiants partiellement présents : % modèle(s) sur {n}', v_presents;
	end if;
	select count(*) into v_ecarts from _l2_modeles r
	  join _l2_noeuds x on x.id = r.id
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id is distinct from x.avant or q.grades is distinct from r.grades_avant;
	if v_ecarts <> 0 then
		raise exception 'modèles déplacés ou reclassés depuis le relevé : %', v_ecarts;
	end if;
	select count(*) into v_tags from public.question_template_points q
	  join _l2_modeles r on r.id = q.template_id
	  join public.curriculum_points p on p.id = q.point_id
	 where p.grade in ('CP', 'CE1', 'CE2', 'CM1', 'CM2', '6', '5', '4', '3');
	if v_tags <> 0 then
		raise exception 'tags déjà posés sur ces modèles : %', v_tags;
	end if;
end $garde$;

-- ---- 4. Point rattaché, modèles déplacés et reclassés, tags ---------------------------
update public.curriculum_points p set node_id = r.node_id
  from _l2_points_noeuds r
 where p.id = r.point_id;

alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates q set classification_node_id = x.apres, grades = r.grades_apres
  from _l2_modeles r join _l2_noeuds x on x.id = r.id
 where q.id = r.id
   and (q.classification_node_id is distinct from x.apres or q.grades is distinct from r.grades_apres);
alter table public.question_templates enable trigger update_question_templates_updated_at;

insert into public.question_template_points (template_id, point_id)
select t.template_id, t.point_id
  from _l2_tags t
  join public.question_templates q on q.id = t.template_id;

-- ---- 5. Vérifications : TOUT ou RIEN ------------------------------------------------
do $check$
declare v_presents integer; v_ok integer; v_tags integer; v_tags_attendus integer; v_points integer;
begin
	select count(*) into v_presents from _l2_modeles r join public.question_templates q on q.id = r.id;
	select count(*) into v_ok from _l2_modeles r
	  join _l2_noeuds x on x.id = r.id
	  join public.question_templates q on q.id = r.id
	 where q.classification_node_id = x.apres and q.grades = r.grades_apres;
	select count(*) into v_tags from _l2_tags t
	  join public.question_template_points q on q.template_id = t.template_id and q.point_id = t.point_id;
	select count(*) into v_points from _l2_points_noeuds r
	  join public.curriculum_points p on p.id = r.point_id and p.node_id = r.node_id;
	-- Base sans les modèles (locale) : aucun tag attendu.
	v_tags_attendus := least(v_presents, 1) * {len(tags)};
	if v_ok <> v_presents or v_tags <> v_tags_attendus or v_points <> {len(rattaches)} then
		raise exception 'lot incohérent : modèles %/%, tags %/%, points rattachés %/{len(rattaches)}',
			v_ok, v_presents, v_tags, v_tags_attendus, v_points;
	end if;
end $check$;

drop table _l2_tags;
drop table _l2_points_noeuds;
drop table _l2_noeuds;
drop table _l2_points;
drop table _l2_modeles;
''')
    open(MIGRATION, 'w').write('\n'.join(o))
    print(f'{n} modèles, {len(deplaces)} déplacés, {len(niveaux)} reclassés, {len(tags)} tags, {len(rattaches)} point(s) rattaché(s)')


main()
