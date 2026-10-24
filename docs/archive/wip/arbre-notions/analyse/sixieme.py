"""Lot `sixieme` : résumé compact des relevés des modèles de 6e, pour la lecture humaine.

Usage : python3 -I sixieme.py <sortie.txt>          (résumé)
        python3 -I sixieme.py add < verdicts.txt     (ajoute des lignes à sixieme.csv)
Format d'une ligne de verdict : template_id|verdict|code|variations_hors|modification|justification
Ne décide rien : il met côte à côte déclarations, plages, format et exemples, plus la ligne
de c5-lot-2bis-v2.csv. Le verdict se prend en lisant ce résumé.
"""

import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def plage(v):
    if not v:
        return '-'
    if 'min' in v:
        s = f"{v.get('nature')} [{v['min']} ; {v['max']}] dec{v.get('decimales_max')}"
        if v.get('negatif_possible'):
            s += ' NEG'
        return s
    return json.dumps(v, ensure_ascii=False)[:200]


def main():
    out = open(sys.argv[1], 'w')
    idx = [r for r in csv.DictReader(open(ROOT / 'releves/index.csv'), delimiter=';') if r['grades'] == '6']
    old = {r['template_id']: r for r in csv.DictReader(open(ROOT / 'c5-lot-2bis-v2.csv'), delimiter=';')}
    for r in idx:
        tid = r['template_id']
        d = json.load(open(ROOT / f'releves/{tid}.json'))
        o = old.get(tid, {})
        out.write(f"\n######## {tid}\n{d['titre']} | {d['sous_titre']} | consigne={d['consigne']} | type={d['type']} | theme={d['theme']}\n")
        out.write(f"ANCIEN: {o.get('decision')} {o.get('code')} {o.get('libelle_point')} | {o.get('justification','')[:300]} | multi={o.get('multi_points')}\n")
        prev_decl = None
        for v in d['variations']:
            dec = v['declarations']
            out.write(f"-- var {v['variation']} echecs={v['echecs']} distincts={v['enonces_distincts']}\n")
            decl = [f"{x['name']} = {x['expression']}" for x in dec.get('variables_shared', []) + dec.get('variables_variation', [])]
            if prev_decl is not None:
                decl = [x for x in decl if x not in prev_decl]
            else:
                prev_decl = set(decl)
            for x in decl:
                out.write(f"   {x}\n")
            if dec.get('conditions'):
                out.write(f"   conditions: {dec['conditions']}\n")
            out.write(f"   enonce: {dec.get('enonce_brut','')[:400]!r}\n   rep: {dec.get('reponses_brutes')}\n")
            if v['variation'] > 1:
                f = v['format']
                out.write(f"   ENONCE {plage(v['nombres_enonce'])} | REPONSE {plage(v['nombres_reponse'])} | QCM {plage(v['nombres_choix_qcm'])} | unites={f['unites']} forme={f['forme_exigee']}\n")
                if v.get('fractions_reponse'):
                    out.write(f"   FRACrep den={v['fractions_reponse'].get('denominateurs')}\n")
                e = v['exemples'][0] if v['exemples'] else None
                if e:
                    out.write(f"   EX({e['role']}): {e['enonce'][:260]!r} -> {e['reponse']}\n")
                continue
            for var in v['variables']:
                vt = var['valeurs_tirees']
                if 'min' in vt:
                    out.write(f"   [{var['nom']}] {plage(vt)}\n")
                elif vt.get('nombres_contenus'):
                    out.write(f"   [{var['nom']}] expr ex={vt.get('exemples', [])[:4]} nb={plage(vt['nombres_contenus'])}\n")
                else:
                    out.write(f"   [{var['nom']}] {json.dumps(vt, ensure_ascii=False)[:200]}\n")
            out.write(f"   ENONCE {plage(v['nombres_enonce'])} | REPONSE {plage(v['nombres_reponse'])} | QCM {plage(v['nombres_choix_qcm'])}\n")
            if v.get('fractions_enonce') or v.get('fractions_reponse'):
                out.write(f"   FRAC enonce={json.dumps(v['fractions_enonce'], ensure_ascii=False)[:250]} rep={json.dumps(v['fractions_reponse'], ensure_ascii=False)[:250]}\n")
            f = v['format']
            out.write(f"   FORMAT {f['type_reponse']} cases={f['nb_cases']} choix={f['nb_choix']} forme={f['forme_exigee']} unites={f['unites']} fig={f['figures']} ctx={f['contexte_probable']}\n")
            for e in v['exemples'][:3]:
                out.write(f"   EX({e['role']}): {e['enonce'][:260]!r} -> {e['reponse']}\n")


COLS = ['template_id', 'grade', 'titre', 'sous_titre', 'verdict', 'code', 'libelle_point',
        'variations_hors', 'modification', 'justification', 'ancien_csv']


def add():
    points = json.load(open(ROOT / 'bornes/cycle3.json'))['6']['points']
    old = {r['template_id']: r for r in csv.DictReader(open(ROOT / 'c5-lot-2bis-v2.csv'), delimiter=';')}
    path = ROOT / 'analyse/sixieme.csv'
    index_ids = [r['template_id'] for r in csv.DictReader(open(ROOT / 'releves/index.csv'), delimiter=';') if r['grades'] == '6']
    deja = set()
    if path.exists():
        deja = {r['template_id'] for r in csv.DictReader(open(path), delimiter=';')}
    nouveau = not path.exists()
    with open(path, 'a', newline='') as fh:
        w = csv.writer(fh, delimiter=';')
        if nouveau:
            w.writerow(COLS)
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            tid, verdict, code, hors, modif, justif = [x.strip() for x in line.split('|')]
            # un préfixe de 8 caractères suffit : on le résout dans l'index
            if len(tid) < 36:
                complets = [r for r in index_ids if r.startswith(tid)]
                assert len(complets) == 1, tid
                tid = complets[0]
            if tid in deja:
                print('déjà présent :', tid)
                continue
            d = json.load(open(ROOT / f'releves/{tid}.json'))
            o = old.get(tid, {})
            codes = [c.strip() for c in code.split(',') if c.strip()]
            lib = ' / '.join(points[c]['libelle'] for c in codes)
            w.writerow([tid, '6', d['titre'], d['sous_titre'] or '', verdict, code, lib, hors, modif,
                        justif, f"{o.get('decision', '')} {o.get('code', '')}".strip()])
            deja.add(tid)


if len(sys.argv) > 1 and sys.argv[1] == 'add':
    add()
else:
    main()
