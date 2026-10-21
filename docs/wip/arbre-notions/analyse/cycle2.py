"""Lot cycle2 : résumé compact des relevés (CP, CE1, CE2) pour la lecture, et
comparaisons mécaniques plages relevées / bornes générales du niveau."""
import csv, json, sys, os
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GRADES = {'CP', 'CE1', 'CE2'}
MAXG = {'CP': 100, 'CE1': 1000, 'CE2': 10000}

def vals(v, n=25):
    if not v: return '-'
    s = f"[{v.get('nature')} {v.get('min')}..{v.get('max')} n={v.get('nb_distinctes')}"
    if v.get('negatif_possible'): s += ' NEG'
    if v.get('decimales_max'): s += f" dec={v['decimales_max']}"
    vv = v.get('valeurs') or []
    if vv and len(vv) <= n: s += ' ' + ','.join(map(str, vv))
    return s + ']'

def main():
    idx = list(csv.DictReader(open(f'{BASE}/releves/index.csv'), delimiter=';'))
    old = {r['template_id']: r for r in csv.DictReader(open(f'{BASE}/c5-lot-2bis-v2.csv'), delimiter=';')}
    sel = [r for r in idx if r['grades'] in GRADES]
    only = sys.argv[1:] 
    for r in sel:
        tid = r['template_id']
        if only and tid not in only and r['grades'] not in only: continue
        d = json.load(open(f'{BASE}/releves/{tid}.json'))
        o = old.get(tid, {})
        print(f"\n#### {tid} | {r['grades']} | {d['titre']} | {d.get('sous_titre')} | type={d.get('type')} | theme={d.get('theme')}")
        if d.get('consigne'): print('CONSIGNE:', d['consigne'][:200])
        print(f"OLD: {o.get('decision')} {o.get('code')} {o.get('libelle_point','')[:80]} || noeud={o.get('noeud_actuel')} -> {o.get('noeud_cible')} || {o.get('justification','')[:200]}")
        g = r['grades']
        for v in d['variations']:
            de = v['declarations']
            vs = '; '.join(f"{x['name']}={x['expression']}" for x in de['variables_shared'] + de['variables_variation'])
            print(f"  V{v['variation']} ok={v['reussis']}/{v['tirages']} distincts={v.get('enonces_distincts')} vars: {vs[:400]}")
            if de.get('conditions'): print('   cond:', de['conditions'])
            print('   enonce:', (de.get('enonce_brut') or '').replace('\n', ' ')[:350])
            print('   rep:', str(de.get('reponses_brutes'))[:200])
            print('   N_enonce', vals(v.get('nombres_enonce')), 'N_rep', vals(v.get('nombres_reponse')), 'QCM', vals(v.get('nombres_choix_qcm')))
            if v.get('fractions_enonce') or v.get('fractions_reponse'):
                print('   FRAC enonce', json.dumps(v.get('fractions_enonce'), ensure_ascii=False)[:300], 'rep', json.dumps(v.get('fractions_reponse'), ensure_ascii=False)[:200])
            f = v.get('format') or {}
            print(f"   fmt: {f.get('type_reponse')} cases={f.get('nb_cases')} choix={f.get('nb_choix')} unites={f.get('unites')} forme={f.get('forme_exigee')} kind={f.get('answer_kind')} fig={list((f.get('figures') or {}).keys())} ctx={f.get('contexte_probable')}")
            nt = v.get('nombres_tous') or {}
            if nt.get('max') is not None and (nt['max'] > MAXG[g] or nt.get('negatif_possible') or nt.get('decimales_max')):
                print(f"   !! GENERAL: max={nt.get('max')} > {MAXG[g]} ou neg/dec")
            for e in (v.get('exemples') or [])[:3]:
                print(f"   ex[{e['role']}]: {e['enonce'].replace(chr(10),' ')[:220]} => {e['reponse']}")


COLS = ['template_id','grade','titre','sous_titre','verdict','code','libelle_point','variations_hors','modification','justification','ancien_csv']

def ecrire(src):
    # src : lignes « id_ou_préfixe | verdict | code | variations_hors | modification | justification »
    idx = {r['template_id']: r for r in csv.DictReader(open(f'{BASE}/releves/index.csv'), delimiter=';')}
    old = {r['template_id']: r for r in csv.DictReader(open(f'{BASE}/c5-lot-2bis-v2.csv'), delimiter=';')}
    bornes = json.load(open(f'{BASE}/bornes/cycle2.json'))
    lib = {c: p['libelle'] for g in ('CP','CE1','CE2') for c, p in bornes[g]['points'].items()}
    rows = []
    for line in open(src):
        line = line.strip()
        if not line or line.startswith('#'): continue
        parts = [x.strip() for x in line.split('|')]
        pref, verdict, code, vh, modif, just = (parts + [''] * 6)[:6]
        ids = [t for t in idx if t.startswith(pref)]
        assert len(ids) == 1, (pref, ids)
        t = ids[0]; r = idx[t]; o = old.get(t, {})
        libs = ' / '.join(lib.get(c.strip(), '?') for c in code.replace(',', ' ').split() if c.strip() in lib) if code else ''
        rows.append({'template_id': t, 'grade': r['grades'], 'titre': r['titre'], 'sous_titre': r['sous_titre'],
                     'verdict': verdict, 'code': code, 'libelle_point': libs, 'variations_hors': vh,
                     'modification': modif, 'justification': just,
                     'ancien_csv': f"{o.get('decision','')} {o.get('code','')}".strip()})
    with open(f'{BASE}/analyse/cycle2.csv', 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=COLS, delimiter=';'); w.writeheader(); w.writerows(rows)
    ids = {x['template_id'] for x in rows}
    manq = [t for t, r in idx.items() if r['grades'] in GRADES and t not in ids]
    from collections import Counter
    print(len(rows), 'lignes', Counter(x['verdict'] for x in rows), 'manquants', len(manq))

if len(sys.argv) > 2 and sys.argv[1] == 'ecrire':
    ecrire(sys.argv[2])
else:
    main()
