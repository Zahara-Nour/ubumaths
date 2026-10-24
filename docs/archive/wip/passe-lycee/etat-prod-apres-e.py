"""Instantané de la prod APRÈS l'étape e (#1632 tags, #1635 points neufs), sans relecture complète.

Part de analyse/etat-prod-2026-10-23/ (pris avant les migrations), y applique les déplacements et
les tags de tests/integration/fixtures/tags-lycee.json (généré avec la migration #1632) et ajoute
les deux points neufs de #1635 (identifiants relevés par le MCP). Écrit nodes/points/templates/tags
.json dans le dossier donné. Les empreintes affichées se comparent à la prod (requête du journal,
entrée du 2026-10-23 « Instantané repris »).

Usage, depuis la racine : python3 docs/wip/passe-lycee/etat-prod-apres-e.py docs/wip/passe-lycee/analyse/etat-prod-2026-10-23b/
"""
import json, re, hashlib, sys, os
A = 'docs/wip/passe-lycee/analyse/'
OLD = A + 'etat-prod-2026-10-23/'
NEW = sys.argv[1]
os.makedirs(NEW, exist_ok=True)
nodes = json.load(open(OLD + 'nodes.json'))
points = json.load(open(OLD + 'points.json'))
templates = json.load(open(OLD + 'templates.json'))
fix = json.load(open('tests/integration/fixtures/tags-lycee.json'))['modeles']
# chemins des nœuds (non archivés : résolution stricte, comme la migration)
byid = {n['id']: n for n in nodes}
def chemin(i):
    r = []
    while i:
        r.append(byid[i]['name']); i = byid[i]['parent_id']
    return tuple(reversed(r))
par_chemin = {}
for n in nodes:
    par_chemin.setdefault(chemin(n['id']), []).append(n['id'])
# points neufs (#1635), relevés par le MCP
points += [
    {'id': '13d186e6-8fc6-4f2d-a5d0-3596e3108942', 'code': 'TSPE-626', 'grade': 'T_SPE', 'node_id': '44206987-801c-459c-bae7-648c7b9a2d84', 'archived_at': None},
    {'id': 'b122b2e7-c5c5-493a-9598-2aaf7e5be814', 'code': 'TCOMP-379', 'grade': 'T_COMP', 'node_id': '44206987-801c-459c-bae7-648c7b9a2d84', 'archived_at': None},
]
# modèles déplacés (#1632)
noeud = {t['id']: t['node'] for t in templates}
for m in fix:
    assert chemin(noeud[m['id']]) == tuple(m['noeud_avant']), m['id']
    if m['noeud_apres'] != m['noeud_avant']:
        c = [i for i in par_chemin[tuple(m['noeud_apres'])] if not byid[i].get('archived_at')]
        assert len(c) == 1, (m['id'], c)
        noeud[m['id']] = c[0]
templates = [{'id': t['id'], 'node': noeud[t['id']]} for t in templates]
# tags : ceux du 2026-10-13 (lycée), puis #1632
s = open('supabase/migrations/20261013120000_tags_modeles_points.sql').read()
d = s.index('insert into _tg_tags (template_id, code, grade) values')
tags = {(t, g, c) for t, c, g in re.findall(r"\('([0-9a-f-]{36})', '([^']+)', '([^']+)'\)", s[d:s.index(';', d)])}
lycee = {p['grade'] for p in points}
tags = {x for x in tags if x[1] in lycee}
for m in fix:
    av = {(m['id'], x['grade'], x['code']) for x in m['tags_avant']}
    ap = {(m['id'], x['grade'], x['code']) for x in m['tags_apres']}
    assert av == {x for x in tags if x[0] == m['id']}, m['id']
    tags = (tags - av) | ap
pid = {(p['grade'], p['code']): p['id'] for p in points if not p['archived_at']}
tags = sorted([{'template_id': t, 'grade': g, 'code': c, 'point_id': pid[(g, c)]} for t, g, c in tags], key=lambda x: (x['template_id'], x['grade'], x['code']))
for name, rows in [('nodes', nodes), ('points', points), ('templates', templates), ('tags', tags)]:
    json.dump(rows, open(NEW + name + '.json', 'w'), ensure_ascii=False, indent='\t'); open(NEW + name + '.json', 'a').write('\n')
h = lambda s: hashlib.md5(s.encode()).hexdigest()
f = lambda v: '' if v is None else str(v)
print('templates', len(templates), h(''.join(sorted(h(t['id'] + '|' + t['node']) for t in templates))))
print('tags', len(tags), h(''.join(sorted(h(t['template_id'] + '|' + t['point_id']) for t in tags))))
print('points', len(points), h(''.join(sorted(h('|'.join(f(r[k]) for k in ['id','code','grade','node_id','archived_at'])) for r in points))))
print('moved', sum(1 for m in fix if m['noeud_apres'] != m['noeud_avant']))
