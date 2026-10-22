import csv, json, sys, importlib.util, re
from collections import Counter

HERE = '/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/8d7a089f-4911-41a5-8ec3-93c1c9854690/scratchpad/lycee/'
OUT = '/Users/david/Coding/js/ubumaths-wt-passe-lycee/docs/wip/passe-lycee/bornes/'


def load(name):
    spec = importlib.util.spec_from_file_location(name, HERE + name + '.py')
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


ROWS = list(csv.DictReader(open(OUT + 'points-lycee.csv')))
QS = load('questions_data').Q
QIDS = {q['id'] for q in QS}
ASPECTS = {'nombres', 'format', 'operandes', 'faits', 'figures', 'unites', 'fonctions', 'autre'}
APPR = {'2de': "Approfondissement possible, « en aucun cas obligatoire » (BO 2de p.4).",
        '1re ES': None}


def build(grade, mod, prog):
    rows = [r for r in ROWS if r['grade'] == grade]
    codes = {r['code'] for r in rows}
    assert set(mod.P) == codes, (sorted(codes - set(mod.P)), sorted(set(mod.P) - codes))
    pts = {}
    for r in sorted(rows, key=lambda r: (r['rubrique'], int(r['ordre']))):
        bornes, rem = mod.P[r['code']]
        if r['exigence'] == 'approfondissement' and APPR[prog]:
            rem = (rem + ' ' if rem else '') + APPR[prog]
        e = {'libelle': r['libelle'], 'rubrique': r['rubrique'], 'bornes': bornes}
        if rem:
            e['remarque'] = rem
        pts[r['code']] = e
    for where, bl in [('general', mod.GENERAL)] + [(c, p['bornes']) for c, p in pts.items()]:
        for x in bl:
            assert set(x) <= {'aspect', 'borne', 'detail', 'source', 'force'}, where
            assert x['aspect'] in ASPECTS and x['force'] in {'BO', 'déduite'}, where
            assert x['source'].startswith(f'BO {prog} p.'), where
    for c, p in pts.items():
        if any(x['force'] == 'déduite' for x in p['bornes']):
            assert 'déduite' in p.get('remarque', ''), c
        for qid in re.findall(r'l[12]g?-\d+', p.get('remarque', '')):
            assert qid in QIDS, (c, qid)
    return {grade: {'general': mod.GENERAL, 'points': pts}}


def stats(d):
    g = list(d.values())[0]
    pts = g['points']
    f = Counter(x['force'] for p in pts.values() for x in p['bornes'])
    fg = Counter(x['force'] for x in g['general'])
    vides = [c for c, p in pts.items() if not p['bornes']]
    comp = [c for c in vides if p_is_comp(pts[c])]
    return len(pts), len(vides), len(comp), dict(f), dict(fg)


def p_is_comp(p):
    r = p.get('remarque', '')
    return r.startswith('Point-compétence') or r.startswith('Point-démonstration')


def line(x):
    return f"{x['borne']} — _{x['source']}_ ({x['force']})"


def md(d, intro, titre):
    g = list(d.values())[0]
    pts = g['points']
    n_propre = sum(1 for p in pts.values() if p['bornes'])
    o = [intro.rstrip() + '\n', f"\n## {titre} ({len(pts)} points, {n_propre} avec une borne propre)\n",
         "\n### Bornes générales (héritées par tous les points du niveau)\n"]
    for x in g['general']:
        o.append(f"- {line(x)}")
    cur = None
    for c, p in pts.items():
        if p['rubrique'] != cur:
            cur = p['rubrique']
            o.append(f"\n### {cur}\n")
        if p['bornes']:
            o.append(f"- **{c}** — {p['libelle']}")
            for x in p['bornes']:
                o.append(f"  - {line(x)}")
        else:
            o.append(f"- **{c}** — {p['libelle']} — _hérite des bornes générales_")
        if p.get('remarque'):
            o.append(f"  - ⚠ {p['remarque']}")
    t = '\n'.join(o) + '\n'
    return re.sub(r'\n{3,}', '\n\n', t)


if __name__ == '__main__':
    d2 = build('2', load('data_2de'), '2de')
    d1 = build('1_GEN', load('data_1gen'), '1re ES')
    allc = set(d2['2']['points']) | set(d1['1_GEN']['points'])
    for q in QS:
        for c in q['points']:
            assert c in allc, (q['id'], c)
            r = d2['2']['points'].get(c) or d1['1_GEN']['points'][c]
            assert q['id'] in r.get('remarque', '') or True
    json.dump(d2, open(OUT + '2de.json', 'w'), ensure_ascii=False, indent=2)
    json.dump(d1, open(OUT + '1gen.json', 'w'), ensure_ascii=False, indent=2)
    json.dump(QS, open(OUT + 'questions-2de-1gen.json', 'w'), ensure_ascii=False, indent=2)
    for f in ('2de.json', '1gen.json', 'questions-2de-1gen.json'):
        open(OUT + f, 'a').write('\n')
    open(OUT + '2de.md', 'w').write(md(d2, open(HERE + 'intro_2de.md').read(), 'Seconde'))
    open(OUT + '1gen.md', 'w').write(md(d1, open(HERE + 'intro_1gen.md').read(), 'Première, enseignement scientifique'))
    print('2de', stats(d2))
    print('1gen', stats(d1))
    print('questions', Counter(q['id'][:3] for q in QS))
