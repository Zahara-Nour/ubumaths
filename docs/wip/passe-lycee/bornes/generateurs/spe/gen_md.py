# Usage : python3 gen_md.py <grade> <json> <intro.md> <out.md> <titre_niveau>
# Vérifie aussi la complétude contre points-lycee.csv.
import json, sys, csv
grade, jpath, intro, out, titre = sys.argv[1:6]
ROOT = '/Users/david/Coding/js/ubumaths-wt-passe-lycee/docs/wip/passe-lycee/bornes/'
d = json.load(open(jpath))[grade]
rows = [r for r in csv.DictReader(open(ROOT + 'points-lycee.csv')) if r['grade'] == grade]
codes = {r['code'] for r in rows}
pts = d['points']
missing = codes - set(pts); extra = set(pts) - codes
assert not missing and not extra, (sorted(missing), sorted(extra))
FORCES = {'BO', 'déduite'}
ASPECTS = {'nombres', 'format', 'operandes', 'faits', 'figures', 'unites', 'fonctions', 'autre'}
def check(b, where):
    assert set(b) <= {'aspect', 'borne', 'detail', 'source', 'force'}, where
    assert b['aspect'] in ASPECTS, (where, b['aspect'])
    assert b['force'] in FORCES, (where, b['force'])
    assert b['source'].startswith('BO '), (where, b['source'])
for b in d['general']: check(b, 'general')
lib = {r['code']: r for r in rows}
for c, p in pts.items():
    assert p['libelle'] == lib[c]['libelle'], c
    assert p['rubrique'] == lib[c]['rubrique'], c
    for b in p['bornes']: check(b, c)
    if any(b['force'] == 'déduite' for b in p['bornes']):
        assert p.get('remarque'), ('déduite sans remarque', c)
    if not p['bornes']:
        assert p.get('remarque'), ('sans borne et sans remarque', c)
FL = {'BO': 'BO', 'déduite': 'déduite'}
def line(b):
    return f"{b['borne']} — _{b['source']}_ ({FL[b['force']]})"
n_propre = sum(1 for p in pts.values() if p['bornes'])
o = [open(intro).read().rstrip() + '\n']
o.append(f"\n## {titre} ({len(pts)} points, {n_propre} avec une borne propre)\n")
o.append("\n### Bornes générales (héritées par tous les points du niveau)\n")
for b in d['general']:
    o.append(f"- {line(b)}")
rubs = sorted({p['rubrique'] for p in pts.values()})
order = {r['code']: int(r['ordre']) for r in rows}
for rub in rubs:
    o.append(f"\n### {rub}\n")
    for c in sorted([c for c in pts if pts[c]['rubrique'] == rub], key=lambda c: c):
        p = pts[c]
        if p['bornes']:
            o.append(f"- **{c}** — {p['libelle']}")
            for b in p['bornes']:
                o.append(f"  - {line(b)}")
        else:
            o.append(f"- **{c}** — {p['libelle']} — _hérite des bornes générales_")
        if p.get('remarque'):
            r = p['remarque']
            o.append(f"  - {'' if r.startswith('⚠') else '⚠ '}{r}")
open(out, 'w').write('\n'.join(o) + '\n')
from collections import Counter
fc = Counter(b['force'] for p in pts.values() for b in p['bornes'])
fg = Counter(b['force'] for b in d['general'])
print(grade, 'points', len(pts), 'sans borne', len(pts) - n_propre, 'forces points', dict(fc), 'general', dict(fg))
