import json, re, sys, glob
"""Repère un \textcolor hors de $…$ dans les énoncés et corrections des fichiers donnés."""
tot = 0
for p in sorted(sum((glob.glob(d + '/*.json') for d in sys.argv[1:]), [])):
    m = json.load(open(p))
    for vi, v in enumerate(m['variations']):
        textes = [v['statement']] + list((v.get('correction') or {}).get('steps', []))
        for t in textes:
            sans_blocs = re.sub(r'```.*?```', '', t, flags=re.S)
            hors = re.sub(r'\$\$.*?\$\$|\$.*?\$', '', sans_blocs, flags=re.S)
            if '\\textcolor' in hors:
                tot += 1
                print(p.split('questions/')[-1], 'var', vi, '→', hors.strip()[:110].replace('\n', ' '))
print('total', tot)
