import html, json, textwrap
E=html.escape
# L'arbre se LIT dans arbre-notions.json (copie de doc de la base, version .16) ; ce script ne réécrit plus le JSON.
# Il produit nc-section.html, que page.py assemble dans arbre-notions.html.
ARBRE=json.load(open('arbre-notions.json'))
def notions(branche):
    """(notion, niveaux, [(préfixe, [sous-notions])], note) d'une branche, dans l'ordre du JSON."""
    for b in ARBRE['branches']:
        if b['nom']==branche:
            return [(n['nom'],n['niveaux'],[("",n['sous_notions'])],n['note']) for n in b['notions']]
    raise SystemExit(f'branche introuvable dans arbre-notions.json : {branche}')
DESSIN=[("Nombres et calculs","NC"),("Arithmétique","AR"),("Nombres complexes","CX"),("Proportionnalité","PR"),
 ("Algèbre","AL"),("Fonctions","FO"),("Intégration","IN"),("Équations différentielles","ED"),("Suites","SU"),
 ("Matrices","MA"),("Graphes","GR"),("Géométrie","GE"),("Grandeurs et mesures","GR_M"),("Probabilités","PS"),
 ("Dénombrement","DE"),("Statistiques","ST"),("Logique","LO"),("Ensembles","EN"),("Algorithmique","AG")]
# Chaque branche du JSON doit être dessinée, et aucune autre.
assert {b for b,_ in DESSIN}=={b['nom'] for b in ARBRE['branches']}, 'branches du JSON et du dessin différentes'
NC=notions("Nombres et calculs"); AR=notions("Arithmétique"); CX=notions("Nombres complexes"); PR=notions("Proportionnalité")
AL=notions("Algèbre"); FO=notions("Fonctions"); IN=notions("Intégration"); ED=notions("Équations différentielles")
SU=notions("Suites"); MA=notions("Matrices"); GR=notions("Graphes"); GE=notions("Géométrie")
GR_M=notions("Grandeurs et mesures"); PS=notions("Probabilités"); DE=notions("Dénombrement"); ST=notions("Statistiques")
LO=notions("Logique"); EN=notions("Ensembles"); AG=notions("Algorithmique")
W=1000; BX=4; BW=170; NX=215; NW=285; GX=525; GW=W-GX-6; LH=19; CH=7.1
def chips_for(groups):
    out=[];row=0;x=0
    for pre,items in groups:
        for it in items:
            t=f"{pre} : {it}" if pre else it
            w=len(t)*7.0+22
            if x+w>GW-24 and x>0: row+=1;x=0
            out.append((t,row,x,w)); x+=w+8
    return out
def lines_for(groups):
    out=[]
    for pre,items in groups:
        if not items:
            out.append((pre,"")); continue
        txt=", ".join(items)
        avail=int((GW-24-(len(pre)+3)*CH*1.05)/CH) if pre else int((GW-24)/CH)
        wr=textwrap.wrap(txt,max(avail,20))
        out.append((pre,wr[0]))
        for w in wr[1:]: out.append(("…" if pre else "",w))
    return out
def build(NC,b1,b2,label,cls):
  blocks=[]; y=8
  for n,niv,groups,note in NC:
      L=chips_for(groups)
      nrows=(max(c[1] for c in L)+1) if L else 0
      h=max(78, 14+nrows*30+(LH if note else 0)+6)
      blocks.append((n,niv,L,note,y,h)); y+=h+12
  H=y
  cy=H/2
  o=[f'<svg viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="{E(label)}" class="{cls}">']
  o.append(f'<rect x="{BX}" y="{cy-34:.0f}" width="{BW}" height="68" rx="10" class="bnode"/>')
  o.append(f'<text x="{BX+BW/2}" y="{cy-4:.0f}" class="btext" text-anchor="middle">{E(b1)}</text><text x="{BX+BW/2}" y="{cy+18:.0f}" class="btext" text-anchor="middle">{E(b2)}</text>')
  for n,niv,L,note,y,h in blocks:
      my=y+h/2
      o.append(f'<path d="M{BX+BW} {cy:.0f} C {BX+BW+35} {cy:.0f}, {NX-35} {my:.0f}, {NX} {my:.0f}" class="link"/>')
      o.append(f'<rect x="{NX}" y="{my-33:.0f}" width="{NW}" height="66" rx="8" class="nnode"/><rect x="{NX}" y="{my-33:.0f}" width="5" height="66" rx="2" class="nbar"/>')
      if ' : ' in n:
          p1,p2=n.split(' : ',1)
          o.append(f'<text x="{NX+16}" y="{my-12:.0f}" class="npre">{E(p1)} :</text><text x="{NX+16}" y="{my+6:.0f}" class="ntext">{E(p2)}</text><text x="{NX+16}" y="{my+24:.0f}" class="niv">{E(niv)}</text>')
      else:
          o.append(f'<text x="{NX+16}" y="{my-3:.0f}" class="ntext">{E(n)}</text><text x="{NX+16}" y="{my+17:.0f}" class="niv">{E(niv)}</text>')
      o.append(f'<path d="M{NX+NW} {my:.0f} L {GX} {my:.0f}" class="link"/>')
      o.append(f'<rect x="{GX}" y="{y}" width="{GW}" height="{h}" rx="8" class="gbox"/>')
      for txt,row,cx,cw in L:
          yy=y+12+row*30
          o.append(f'<rect x="{GX+12+cx:.0f}" y="{yy}" width="{cw:.0f}" height="22" rx="11" class="chip"/>')
          o.append(f'<text x="{GX+12+cx+cw/2:.0f}" y="{yy+15.5}" class="chiptext" text-anchor="middle">{E(txt)}</text>')
      ty=y+14+nrows*30+12
      if note:
          o.append(f'<text x="{GX+14}" y="{ty}" class="gnote">{E(note)}</text>')
  o.append('</svg>')
  return '\n'.join(o)

nc=build(NC,"Nombres","et calculs",f"Branche Nombres et calculs, rangée par type de nombre : {len(NC)} notions et leurs sous-notions","c1")
pr=build(PR,"Proportion-","nalité",f"Branche Proportionnalité : {len(PR)} notions et leurs sous-notions","c2")
al=build(AL,"Algèbre","",f"Branche Algèbre : {len(AL)} notions et leurs sous-notions","c3")
fo=build(FO,"Fonctions","",f"Branche Fonctions : {len(FO)} notions et leurs sous-notions","c4")
in_=build(IN,"Intégration","",f"Branche Intégration : {len(IN)} notions et leurs sous-notions","c14")
ed=build(ED,"Équations","différentielles",f"Branche Équations différentielles : {len(ED)} notions et leurs sous-notions","c15")
su=build(SU,"Suites","",f"Branche Suites : {len(SU)} notions et leurs sous-notions","c5")
ge=build(GE,"Géométrie","",f"Branche Géométrie : {len(GE)} notions et leurs sous-notions","c6")
gm_=build(GR_M,"Grandeurs","et mesures",f"Branche Grandeurs et mesures : {len(GR_M)} notions et leurs sous-notions","c7")
ps=build(PS,"Probabilités","",f"Branche Probabilités : {len(PS)} notions et leurs sous-notions","c8")
de=build(DE,"Dénombrement","",f"Branche Dénombrement : {len(DE)} notions et leurs sous-notions","c18")
st=build(ST,"Statistiques","",f"Branche Statistiques : {len(ST)} notions et leurs sous-notions","c17")
lo=build(LO,"Logique","",f"Branche Logique : {len(LO)} notions et leurs sous-notions","c9")
en=build(EN,"Ensembles","",f"Branche Ensembles : {len(EN)} notions et leurs sous-notions","c19")
ag=build(AG,"Algorithmique","",f"Branche Algorithmique : {len(AG)} notions et leurs sous-notions","c16")
ma=build(MA,"Matrices","",f"Branche Matrices : {len(MA)} notions et leurs sous-notions","c12")
gr=build(GR,"Graphes","",f"Branche Graphes : {len(GR)} notions et leurs sous-notions","c13")
cx=build(CX,"Nombres","complexes",f"Branche Nombres complexes : {len(CX)} notions et leurs sous-notions","c11")
ar=build(AR,"Arithmétique","",f"Branche Arithmétique : {len(AR)} notions et leurs sous-notions","c10")
sec=f'''<section class="branch" id="nombres"><h2><span class="dot c1"></span>Nombres et calculs <small>par type de nombre, {len(NC)} notions</small></h2>
<p class="read">Le type de nombre vient en premier ; les gros (Entiers, Décimaux) sont découpés par opération. Les problèmes arithmétiques du primaire ont leur notion, classés par structure. À droite, chaque pastille est une sous-notion distincte.</p>
<div class="scroll">{nc}</div></section>
<section class="branch" id="arithmetique"><h2><span class="dot c10"></span>Arithmétique <small>branche à part, {len(AR)} notions</small></h2>
<p class="read">Sortie de Nombres et calculs. Elle reprend les quatre domaines actuels (maths expertes) et peut accueillir l'arithmétique du collège (multiples, diviseurs, nombres premiers en 3e).</p>
<div class="scroll">{ar}</div></section>
<section class="branch" id="proportionnalite"><h2><span class="dot c2"></span>Proportionnalité <small>mise à jour, {len(PR)} notions</small></h2>
<p class="read">Découpage demandé par David. Vitesse vient de Grandeurs et mesures.</p>
<div class="scroll">{pr}</div></section>
<section class="branch" id="algebre"><h2><span class="dot c3"></span>Algèbre <small>{len(AL)} notions</small></h2>
<p class="read">Les premiers pas algébriques du cycle 3 ouvrent la branche ; calcul littéral en une seule notion ; équations et inéquations classées par forme. Équations et inéquations du second degré ici ; racines, signe, formes et variations d'un trinôme dans Fonctions. Matrices et Graphes deviennent deux branches à part.</p>
<div class="scroll">{al}</div></section>
<section class="branch" id="fonctions"><h2><span class="dot c4"></span>Fonctions <small>{len(FO)} notions</small></h2>
<p class="read">Une notion par fonction de référence. L'optimisation se range sous « Dérivation &gt; variations et extremums » (audit des facettes, 2026-10-09). Intégration et Équations différentielles deviennent deux branches à part.</p>
<div class="scroll">{fo}</div></section>
<section class="branch" id="integration"><h2><span class="dot c14"></span>Intégration <small>{len(IN)} notions</small></h2>
<p class="read">Branche à part (terminale). Reprend le thème Intégration et ses cinq domaines.</p>
<div class="scroll">{in_}</div></section>
<section class="branch" id="equadiff"><h2><span class="dot c15"></span>Équations différentielles <small>{len(ED)} notions</small></h2>
<p class="read">Branche à part (terminale). Une notion par forme d'équation ; les primitives sont des sous-notions de y′ = f.</p>
<div class="scroll">{ed}</div></section>
<section class="branch" id="suites"><h2><span class="dot c5"></span>Suites <small>{len(SU)} notions</small></h2>
<p class="read">Reprend les 15 domaines actuels du thème Suites. « Sommes » et « Seuils » deviennent des sous-notions ; reconnaître une suite arithmétique ou géométrique relève de sa « définition ».</p>
<div class="scroll">{su}</div></section>
<section class="branch" id="complexes"><h2><span class="dot c11"></span>Nombres complexes <small>branche à part, {len(CX)} notions</small></h2>
<p class="read">Sortie de Nombres et calculs, comme Arithmétique : ses cinq domaines actuels (maths expertes) deviennent des notions.</p>
<div class="scroll">{cx}</div></section>
<section class="branch" id="matrices"><h2><span class="dot c12"></span>Matrices <small>branche à part, {len(MA)} notions</small></h2>
<p class="read">Maths expertes. Reprend l'ancien domaine Matrices (9 modèles) ; les sous-notions sans modèle aujourd'hui suivent le programme.</p>
<div class="scroll">{ma}</div></section>
<section class="branch" id="graphes"><h2><span class="dot c13"></span>Graphes <small>branche à part, {len(GR)} notions</small></h2>
<p class="read">Maths expertes. Reprend les domaines Graphes (7 modèles) et Chaînes de Markov (3 modèles).</p>
<div class="scroll">{gr}</div></section>
<section class="branch" id="geometrie"><h2><span class="dot c6"></span>Géométrie <small>{len(GE)} notions</small></h2>
<p class="read">Du primaire (solides, figures planes, symétries, repérage) au lycée (vecteurs, espace), en passant par le collège (translations, Pythagore, Thalès, trigonométrie) — plus quatre notions hors programme héritées de l'ancien cycle 4 (rotations, homothéties, triangles semblables, repérage dans l'espace). Vecteurs, Espace et Orthogonalité ne sont plus coupés « avec / sans coordonnées » : les coordonnées sont une méthode, que disent les points (audit des facettes, 2026-10-09).</p>
<div class="scroll">{ge}</div></section>
<section class="branch" id="grandeurs"><h2><span class="dot c7"></span>Grandeurs et mesures <small>{len(GR_M)} notions</small></h2>
<p class="read">Les grandeurs du primaire (longueurs, masses, contenances, monnaie) ont leurs notions ; Vitesse est partie dans Proportionnalité.</p>
<div class="scroll">{gm_}</div></section>
<section class="branch" id="probas"><h2><span class="dot c8"></span>Probabilités <small>{len(PS)} notions</small></h2>
<p class="read">Reprend le thème Probabilités. « Expériences aléatoires » remplace « Probabilités » pour ne pas répéter le nom de la branche.</p>
<div class="scroll">{ps}</div></section>
<section class="branch" id="denombrement"><h2><span class="dot c18"></span>Dénombrement <small>branche à part, {len(DE)} notions</small></h2>
<p class="read">Sorti de Probabilités (terminale). Reprend les 9 sous-domaines de l'ancien domaine Dénombrement (15 modèles).</p>
<div class="scroll">{de}</div></section>
<section class="branch" id="stats"><h2><span class="dot c17"></span>Statistiques <small>{len(ST)} notions</small></h2>
<p class="read">Séparée des probabilités. Seule la statistique à deux variables a des modèles aujourd'hui ; les autres notions suivent le programme.</p>
<div class="scroll">{st}</div></section>
<section class="branch" id="logique"><h2><span class="dot c9"></span>Logique <small>{len(LO)} notions</small></h2>
<p class="read">Reprend le domaine Logique et raisonnement, restructuré (C2, 2026-10-08) : « Proposition mathématique » en tête (méta-langage + connecteurs), « contre-exemple » rejoint les Raisonnements.</p>
<div class="scroll">{lo}</div></section>
<section class="branch" id="ensembles"><h2><span class="dot c19"></span>Ensembles <small>branche à part, {len(EN)} notions</small></h2>
<p class="read">Reprend le domaine Ensembles (1re) ; les ensembles de nombres et les intervalles de 2de y trouvent leur place.</p>
<div class="scroll">{en}</div></section>
<section class="branch" id="algorithmique"><h2><span class="dot c16"></span>Algorithmique <small>{len(AG)} notions</small></h2>
<p class="read">Aucun modèle aujourd'hui : notions tirées du programme (2de, 1re). « Fonctions Python » pour ne pas confondre avec la branche Fonctions.</p>
<div class="scroll">{ag}</div></section>'''
open('nc-section.html','w').write(sec)

print(len(ARBRE['branches']),sum(len(b['notions']) for b in ARBRE['branches']),
      sum(len(n['sous_notions']) for b in ARBRE['branches'] for n in b['notions']),len(ARBRE.get('archives',[])))
