# Décisions de David (2026-10-23) sur les 54 tags refusés par compat-noeuds.py, écrites dans noeuds-decides.csv :
#  - DEPLACER : le modèle passe sur le nœud de son point (R2 : sous-notion sœur, ou groupe A) ;
#  - RETIRER : le tag n'est pas posé (eae2ff6a, R1 ; groupe B, retrait forcé par le trigger d'un seul nœud ;
#    le modèle reste sur son point le plus précis).
# Puis contrôle : avec ces décisions, plus aucun tag refusé. Lancer depuis docs/wip/passe-lycee/analyse/.

import csv,json,collections
D='etat-prod-2026-10-23/'
pts={(p['grade'],p['code']):p for p in json.load(open(D+'points.json')) if not p['archived_at']}
nodes={n['id']:n for n in json.load(open(D+'nodes.json'))}
tpl={t['id']:t['node'] for t in json.load(open(D+'templates.json'))}
def notion(i): n=nodes[i]; return n['parent_id'] if n['kind']=='subnotion' else i
def path(i):
    r=[]
    while i: r.append(nodes[i]['name']); i=nodes[i]['parent_id']
    return ' > '.join(reversed(r))

# Groupe A : tous les tags du modèle refusés → déplacement (sauf eae2ff6a, retiré : 1SPE-244 à re-ranger sur « racines »)
GROUPE_A=['4cc21ccd','c7cdca01','146a7c79','baefb288','d2067413','27d77564','80489c90','15d3aaa0','9765d776',
          '496f958d','cffdd283','c7b5130d','723779c8','dd0ee69a']
R1=['eae2ff6a']
# Groupe B : un tag passe, un autre programme vit ailleurs → retrait forcé du tag refusé
GROUPE_B=['d1648508','8ed02829','aeb1389d','31a77ba9','19961e67','45e47034','0113c53d','8b59ca4b','81ff485d',
          '9f14d672','f1963ef2','624bf511',
          # points sur deux sous-notions sœurs : déplacer casserait le tag exact (David, 2026-10-23)
          'e814175b','50feeefd','4ff9d049']

tags=[]
for lot in ['2de','1spe-a','1spe-a-2de','1spe-b','tspe','tspe-tcomp','texp']:
    for r in csv.DictReader(open(lot+'.csv'),delimiter=';'):
        if r['verdict'] in ('TAG','MODIFIER'): tags.append((r['template_id'],r['programme'],r['code'].strip(),r['verdict']))

def ok(pn,tn): return pn==tn or pn==notion(tn)
lignes=[]; cible={}; retires=set(); cat=collections.Counter()
for t,g,c,v in tags:
    pn=pts[(g,c)]['node_id']; tn=tpl[t]
    if ok(pn,tn): continue
    k=t[:8]
    soeur=nodes[pn]['kind']=='subnotion' and nodes[pn]['parent_id']==notion(tn)
    if k in R1 or k in GROUPE_B:
        retires.add((t,g,c)); cat['RETIRER']+=1
        lignes.append((t,'RETIRER',g,c,v,path(tn),'','R1' if k in R1 else 'retrait forcé (groupe B)'))
    elif soeur or k in GROUPE_A:
        assert cible.get(t,pn)==pn, f'{t} : deux cibles'
        if t not in cible: lignes.append((t,'DEPLACER',g,c,v,path(tn),path(pn),'R2' if soeur else 'R2 (groupe A)'))
        cible[t]=pn; cat['DEPLACER']+=1
    else: raise SystemExit(f'tag refusé sans décision : {t} {g} {c}')

with open('noeuds-decides.csv','w',newline='') as f:
    w=csv.writer(f,delimiter=';')
    w.writerow(['template_id','action','programme','code','verdict','noeud_actuel','noeud_cible','regle'])
    w.writerows(lignes)
# avec les décisions : aucun tag restant refusé
reste=[(t,g,c) for t,g,c,v in tags if (t,g,c) not in retires and not ok(pts[(g,c)]['node_id'],cible.get(t,tpl[t]))]
print('tags refusés traités',dict(cat),'modèles déplacés',len(cible),'tags retirés',len(retires))
print('tags gardés',len(tags)-len(retires),'encore refusés',len(reste),reste[:5])
