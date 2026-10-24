"""Lot `cm` : résumé compact des relevés CM1 / CM2 pour l'analyse contre les bornes.

Usage : python3 analyse/cm-releve.py [début] [fin]  (indices dans la liste triée par grade, thème)
Sort, pour chaque modèle : énoncé brut, déclarations, plages relevées, réponses, format,
deux exemples, et l'ancienne proposition de c5-lot-2bis-v2.csv. Aucune écriture.
"""
import csv
import re
import json
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent


def lots():
    rows = list(csv.DictReader(open(BASE / 'releves/index.csv'), delimiter=';'))
    rows = [r for r in rows if r['grades'] in ('CM1', 'CM2')]
    out = []
    for r in rows:
        d = json.load(open(BASE / 'releves' / f"{r['template_id']}.json"))
        out.append(d)
    out.sort(key=lambda d: (d['grades'][0], d.get('theme') or '', d['titre']))
    return out


def ancien():
    rows = list(csv.DictReader(open(BASE / 'c5-lot-2bis-v2.csv'), delimiter=';'))
    return {r['template_id']: r for r in rows}


def plage(p):
    if not p:
        return '-'
    s = f"{p.get('nature')} [{p.get('min')}..{p.get('max')}]"
    if p.get('decimales_max'):
        s += f" dec<={p['decimales_max']}"
    if p.get('negatif_possible'):
        s += ' NEG'
    if p.get('chiffres_partie_entiere_max'):
        s += f" chif<={p['chiffres_partie_entiere_max']}"
    return s


def resume(d, anc):
    print('=' * 100)
    print(f"{d['template_id']} | {d['grades']} | {d['titre']} | {d['sous_titre']}")
    print(f"  theme={d.get('theme')} type={d['type']} consigne={d.get('consigne')}")
    for c in d.get('points_candidats') or []:
        print(f"  cand: {c['decision']} {c['code']} {c['libelle_point'][:90]}")
    a = anc.get(d['template_id'])
    if a:
        print(f"  ANCIEN: {a['decision']} {a['code']} | {a['justification'][:200]}")
    prev = None
    for v in d['variations']:
        dec = v['declarations']
        vs = (dec.get('variables_shared') or []) + (dec.get('variables_variation') or [])
        sig_vars = ' ; '.join(f"{x['name']}={x['expression']}" for x in vs)
        rng = ' '.join(f"{x['nom']}:{plage(x.get('valeurs_tirees'))}" for x in v.get('variables') or []
                       if (x.get('valeurs_tirees') or {}).get('nature') != 'texte ou expression')
        reps = []
        for r in v.get('reponse_attendue') or []:
            val = r['valeurs']
            vals = val.get('valeurs')
            reps.append(f"R{r['case']}:{val.get('nature')} nd={val.get('nb_distinctes')} "
                        f"{plage(val) if val.get('min') is not None else ''}{(vals[:6] if vals else '')}")
        f = v['format']
        fmt = (f"{f['type_reponse']} cases={f['nb_cases']} choix={f['nb_choix']} forme={f['forme_exigee']} "
               f"unites={f['unites']} fig={f['figures']} ctx={f['contexte_probable']}")
        nums = (f"enonce#={plage(v.get('nombres_enonce'))} rep#={plage(v.get('nombres_reponse'))} "
                f"qcm#={plage(v.get('nombres_choix_qcm'))}")
        frac = ''
        if v.get('fractions_enonce') or v.get('fractions_reponse'):
            frac = (f"frac: {json.dumps(v.get('fractions_enonce'), ensure_ascii=False)[:160]} | "
                    f"{json.dumps(v.get('fractions_reponse'), ensure_ascii=False)[:160]}")
        sig = (re.sub(r'expression\d', 'E', sig_vars), rng, ' '.join(reps), fmt, nums, frac)
        print(f"  -- V{v['variation']} ({v['reussis']}/{v['tirages']})")
        if sig != prev:
            print('     vars: ' + sig_vars[:400])
            if dec.get('conditions'):
                print(f"     cond: {dec['conditions']}")
            print(f"     plages: {rng[:400]}")
            print('     ' + ' | '.join(reps)[:400])
            print('     ' + nums)
            if frac:
                print('     ' + frac)
            print('     fmt: ' + fmt)
            if dec.get('choix_bruts'):
                print(f"     choix: {json.dumps(dec['choix_bruts'], ensure_ascii=False)[:200]}")
        else:
            print('     (mêmes plages/format que la précédente)')
        ex = v.get('exemples') or []
        if ex:
            e = ex[0]
            print(f"     ex: {e['enonce'][:260]!r} -> {e['reponse']}")
        prev = sig


def main():
    a, b = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (0, 9999)
    anc = ancien()
    for i, d in enumerate(lots()):
        if a <= i < b:
            print(f'#{i}')
            resume(d, anc)


if __name__ == '__main__':
    main()
