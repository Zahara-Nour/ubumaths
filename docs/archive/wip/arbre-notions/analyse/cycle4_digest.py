# Lot cycle4 : condensé lisible de chaque relevé (5e, 4e, 3e) + comparaisons mécaniques
# avec les bornes du point candidat (detail.min/max/liste/exposants). Le verdict se décide
# à la lecture, pas ici.
import csv, json, sys, os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GRADES = ('5', '4', '3')

def compact_vals(v):
    if not v: return None
    if not isinstance(v, dict): return str(v)
    out = []
    for k in ('nature', 'min', 'max', 'decimales_max', 'negatif_possible', 'nb_distinctes'):
        if k in v: out.append(f"{k}={v[k]}")
    vals = v.get('valeurs')
    if vals:
        s = json.dumps(vals[:14], ensure_ascii=False)
        out.append('vals=' + s[:220] + ('…' if len(vals) > 14 else ''))
    nc = v.get('nombres_contenus')
    if nc:
        out.append(f"[nombres: {nc.get('nature')} {nc.get('min')}..{nc.get('max')} dec={nc.get('decimales_max')} neg={nc.get('negatif_possible')}]")
    return ' '.join(out)

def main():
    bornes = json.load(open(os.path.join(BASE, 'bornes/cycle4.json')))
    allpts = {}
    for g in GRADES:
        allpts.update(bornes[g]['points'])
    old = {r['template_id']: r for r in csv.DictReader(open(os.path.join(BASE, 'c5-lot-2bis-v2.csv')), delimiter=';')}
    rows = [r for r in csv.DictReader(open(os.path.join(BASE, 'releves/index.csv')), delimiter=';') if r['grades'] in GRADES]
    start = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    end = int(sys.argv[2]) if len(sys.argv) > 2 else len(rows)
    for i, r in enumerate(rows[start:end], start):
        t = r['template_id']
        d = json.load(open(os.path.join(BASE, 'releves', t + '.json')))
        o = old.get(t, {})
        print(f"\n######## [{i}] {t} | {r['grades']} | {d['titre']} | {d.get('sous_titre')}")
        print(f"type={d.get('type')} theme={d.get('theme')} consigne={d.get('consigne')}")
        print(f"ANCIEN: {o.get('decision')} {o.get('code')} « {o.get('libelle_point')} » — {o.get('justification','')[:400]}")
        code = o.get('code')
        if code and code in allpts:
            for b in allpts[code]['bornes']:
                print(f"   borne {code}: {b['borne']} {json.dumps(b.get('detail'), ensure_ascii=False) if b.get('detail') else ''}")
        seen_decl = set(); seen_tire = set(); seen_lines = set()
        for v in d['variations']:
            de = v['declarations']
            print(f"-- var {v['variation']} : {v['reussis']}/{v['tirages']} distincts={v.get('enonces_distincts')}")
            for vv in de.get('variables_shared', []) + de.get('variables_variation', []):
                key = (vv['name'], vv['expression'])
                if key in seen_decl: continue
                seen_decl.add(key)
                print(f"   decl {vv['name']} = {vv['expression']}")
            if de.get('conditions'): print(f"   conditions {de['conditions']}")
            print(f"   enonce: {json.dumps(de.get('enonce_brut'), ensure_ascii=False)[:500]}")
            print(f"   reponses: {json.dumps(de.get('reponses_brutes'), ensure_ascii=False)[:300]}")
            for vv in v.get('variables', []):
                c = compact_vals(vv.get('valeurs_tirees'))
                if c and (vv['nom'], c) in seen_tire: continue
                seen_tire.add((vv['nom'], c))
                if c: print(f"   tire {vv['nom']}: {c}")
            for ra in v.get('reponse_attendue') or []:
                print(f"   rep case{ra.get('case')}: {compact_vals(ra.get('valeurs'))}")
            for k in ('nombres_enonce', 'nombres_choix_qcm'):
                if v.get(k):
                    n = v[k]
                    print(f"   {k}: {n.get('nature')} {n.get('min')}..{n.get('max')} dec={n.get('decimales_max')} neg={n.get('negatif_possible')}")
            for k in ('fractions_enonce', 'fractions_reponse'):
                if v.get(k): print(f"   {k}: {json.dumps(v[k], ensure_ascii=False)}")
            f = v.get('format') or {}
            print(f"   format: rep={f.get('type_reponse')} cases={f.get('nb_cases')} choix={f.get('nb_choix')} kind={f.get('answer_kind')} forme={f.get('forme_exigee')} sym={list((f.get('symboles_affiches') or {}).keys())} unites={f.get('unites')} fig={f.get('figures')} ctx={f.get('contexte_probable')}")
            for ex in (v.get('exemples') or [])[:3]:
                print(f"   ex[{ex.get('role')}]: {json.dumps(ex.get('enonce'), ensure_ascii=False)[:350]} => {json.dumps(ex.get('reponse'), ensure_ascii=False)[:150]}")
            # Comparaisons mécaniques avec detail.min/max du point candidat
            if code and code in allpts:
                for b in allpts[code]['bornes']:
                    det = b.get('detail') or {}
                    nr = v.get('nombres_enonce') or {}
                    if 'max' in det and isinstance(det['max'], (int, float)) and nr.get('max') is not None and nr['max'] > det['max']:
                        print(f"   !! nombres énoncé max {nr['max']} > borne max {det['max']}")

if __name__ == '__main__':
    main()
