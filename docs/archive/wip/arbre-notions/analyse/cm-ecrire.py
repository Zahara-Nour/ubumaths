"""Lot `cm` : ajoute des verdicts à analyse/cm.csv (reprise après crash : une ligne par modèle,
la dernière écriture d'un template_id l'emporte).

Usage : python3 analyse/cm-ecrire.py < verdicts.tsv
Entrée : une ligne par modèle, champs séparés par « | » :
  id_prefixe | verdict | code | variations_hors | modification | justification
Titre, sous-titre, niveau, libellé du point et ancienne proposition sont complétés ici.
"""
import csv
import json
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
OUT = BASE / 'analyse' / 'cm.csv'
COLS = ['template_id', 'grade', 'titre', 'sous_titre', 'verdict', 'code', 'libelle_point',
        'variations_hors', 'modification', 'justification', 'ancien_csv']
VERDICTS = {'TAG', 'TAG_PAR_VARIATION', 'MODIFIER', 'HORS_PROGRAMME', 'A_TRANCHER'}


def points():
    d = json.load(open(BASE / 'bornes' / 'cycle3.json'))
    out = {}
    for niv in d.values():
        for code, p in niv['points'].items():
            out[code] = p['libelle']
    return out


def modeles():
    rows = list(csv.DictReader(open(BASE / 'releves/index.csv'), delimiter=';'))
    return {r['template_id']: r for r in rows if r['grades'] in ('CM1', 'CM2')}


def main():
    pts = points()
    mods = modeles()
    anc = {r['template_id']: r for r in csv.DictReader(open(BASE / 'c5-lot-2bis-v2.csv'), delimiter=';')}
    existing = {}
    if OUT.exists():
        for r in csv.DictReader(open(OUT), delimiter=';'):
            existing[r['template_id']] = r
    for line in sys.stdin:
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        parts = [p.strip() for p in line.split('|')]
        if len(parts) != 6:
            sys.exit(f'champs != 6 : {line[:80]}')
        pref, verdict, code, vh, modif, justif = parts
        ids = [t for t in mods if t.startswith(pref)]
        if len(ids) != 1:
            sys.exit(f'préfixe ambigu ou absent : {pref}')
        tid = ids[0]
        if verdict not in VERDICTS:
            sys.exit(f'verdict inconnu : {verdict}')
        codes = [c.strip() for c in code.split(',') if c.strip()]
        for c in codes:
            if c not in pts:
                sys.exit(f'code inconnu : {c}')
        m = mods[tid]
        a = anc.get(tid, {})
        existing[tid] = {
            'template_id': tid,
            'grade': m['grades'],
            'titre': m['titre'].strip(),
            'sous_titre': m['sous_titre'].strip(),
            'verdict': verdict,
            'code': ', '.join(codes),
            'libelle_point': ' / '.join(pts[c] for c in codes),
            'variations_hors': vh,
            'modification': modif,
            'justification': justif,
            'ancien_csv': f"{a.get('decision', '')} {a.get('code', '')}".strip(),
        }
    with open(OUT, 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=COLS, delimiter=';')
        w.writeheader()
        for r in existing.values():
            w.writerow(r)
    print(f'{len(existing)} lignes dans {OUT.name}')


if __name__ == '__main__':
    main()
