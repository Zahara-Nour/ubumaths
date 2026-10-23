# Tags (TAG + MODIFIER) des CSV face au trigger question_template_points_check_rules : point sur le nœud du modèle
# ou sa notion. Lancer depuis docs/wip/passe-lycee/analyse/ : python3 compat-noeuds.py [liste]

import csv,json,collections,sys
D='etat-prod-2026-10-23/'
pts={(p['grade'],p['code']):p for p in json.load(open(D+'points.json')) if not p['archived_at']}
nodes={n['id']:n for n in json.load(open(D+'nodes.json'))}
tpl={t['id']:t['node'] for t in json.load(open(D+'templates.json'))}
def notion(i): n=nodes[i]; return n['parent_id'] if n['kind']=='subnotion' else i
def path(i):
    r=[]
    while i: r.append(nodes[i]['name']); i=nodes[i]['parent_id']
    return ' > '.join(reversed(r))
tags=[]
for lot in ['2de','1spe-a','1spe-a-2de','1spe-b','tspe','tspe-tcomp','texp']:
    for r in csv.DictReader(open(lot+'.csv'),delimiter=';'):
        if r['verdict'] in ('TAG','MODIFIER'): tags.append((r['template_id'],r['programme'],r['code'].strip(),r['verdict']))
missing=[t for t in tags if (t[1],t[2]) not in pts]
print('tags',len(tags),'points introuvables/archivés',len(missing),missing[:5])
ok=bad=0; badl=[]; cat=collections.Counter()
for t,g,c,v in tags:
    if (g,c) not in pts: continue
    pn=pts[(g,c)]['node_id']; tn=tpl[t]
    if tn is None: cat['modèle sans nœud']+=1; badl.append((t,g,c,v,'sans nœud')); continue
    if pn==tn or pn==notion(tn): ok+=1; continue
    # catégories
    if nodes[pn]['kind']=='subnotion' and nodes[pn]['parent_id']==notion(tn): cat['point sur une sous-notion sœur (R2)']+=1
    elif nodes[pn]['kind']=='subnotion' and nodes[pn]['parent_id']!=notion(tn): cat['autre notion (sous-notion)']+=1
    else: cat['autre notion']+=1
    badl.append((t,g,c,v,path(tn)+'  ⟶  '+path(pn)))
print('compatibles',ok,'refusés',len(badl),dict(cat))
# conflits multi-programmes : un modèle dont les points exigent des nœuds incompatibles
by=collections.defaultdict(list)
for t,g,c,v in tags:
    if (g,c) in pts: by[t].append(pts[(g,c)]['node_id'])
conf=[t for t,ns in by.items() if len({notion(n) for n in ns})>1]
print('modèles dont les points sont sur des notions différentes',len(conf))
if len(sys.argv)>1:
    for b in badl: print(b[0][:8],b[1],b[2],b[3],'|',b[4])
