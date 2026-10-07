import html, textwrap
E=html.escape
# notion, niveaux, [(préfixe, [sous-notions])], note (activités sorties)
NC=[
("Entiers : numération","CP à 6e",[("",["comparer","décomposer","écrire","repérer"])],None),
("Entiers : addition et soustraction","CP à CM2",[("",["somme","différence","complément","tables","double et moitié","triple et tiers","calcul astucieux"])],None),
("Entiers : multiplication","CP à 5e",[("",["tables","produit","carrés","décomposition","distributivité","double et moitié","triple et tiers","quadruple et quart","puissances de 10","produits particuliers","calcul astucieux"])],None),
("Entiers : division","CE2 à CM2",[("",["quotient","division euclidienne"])],None),
("Entiers : priorités opératoires","6e, 5e",[("",["avec parenthèses","sans parenthèses","traduire une phrase"])],None),
("Décimaux : numération","CM1 à 6e",[("",["comparer","décomposer","écrire","encadrer","forme fractionnaire"])],None),
("Décimaux : calculs","CM1 à 6e",[("",["additionner","soustraire","multiplier","diviser","puissances de 10","distributivité","moitié","calcul astucieux"])],None),
("Fractions : sens et écritures","CM1 à 4e",[("",["définition","comparer","décomposer","égalité de fractions","simplifier","forme décimale"])],None),
("Fractions : calculs","CM1 à 4e",[("",["additionner et soustraire","multiplier","diviser","inverse","fraction d'une quantité"])],None),
("Relatifs : sens et écritures","5e, 4e",[("",["définition","comparer","droite graduée"])],None),
("Relatifs : calculs","5e, 4e",[("",["sommes","différences","sommes algébriques","produit","quotient","carré"])],None),
("Puissances : sens et écritures","4e, 3e",[("",["définition","puissances de 10","notation scientifique"])],None),
("Puissances : calculs","4e, 3e",[("",["multiplier","diviser","puissance de puissance","mélange"])],None),
("Racines carrées : sens et écritures","5e à 2de",[("",["définition","égalités","réduire"])],None),
("Racines carrées : calculs","4e, 2de",[("",["calculer","propriétés"])],None),
]
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


PR=[
("Situations de proportionnalité","6e à 3e",[("",["reconnaître","appliquer","quatrième proportionnelle"])],"reprend « Tableaux de proportionnalité »"),
("Pourcentages","6e à 2de",[("",["définition","calculer"])],None),
("Évolutions","2de, 1re",[("",["variations en pourcentage"])],"à étoffer : coefficient multiplicateur, évolutions successives…"),
("Échelle d'une carte","6e",[("",["trouver l'échelle","utiliser l'échelle"])],None),
("Vitesse","4e",[("",["calculer","convertir"])],"vient de Grandeurs et mesures"),
]
AL=[
("Calcul littéral","5e à 2de",[("",["substitution","réduire","simplifier l'écriture","opposé d'une expression","développer","factoriser","identités remarquables"])],None),
("Équations : premier degré","5e à 2de",[("",["ax = b","ax + b = c","ax + b = cx + d","mettre en équation"])],"reprend « Dans ℕ, ℤ, ℚ » : l'ensemble devient une difficulté (level)"),
("Équations : produit et quotient","3e, 2de",[("",["produit nul","x² = a","équation quotient"])],None),
("Inéquations : premier degré","4e à 2de",[("",["ax + b < c","ax + b < cx + d","mettre en inéquation"])],"aucun modèle aujourd'hui"),
("Inéquations : produit et quotient","2de",[("",["tableau de signes","inéquation produit","inéquation quotient"])],"aucun modèle aujourd'hui"),
("Équations : second degré","1re",[("",["discriminant","équations incomplètes","se ramener au second degré","mettre en équation"])],None),
("Inéquations : second degré","1re",[("",["inéquations du second degré","mettre en inéquation"])],None),
("Inégalités","2de à Tle",[("",["règles de calcul","signe d'une expression","comparer et encadrer"])],None),
]
FO=[
("Généralités sur les fonctions","3e, 2de",[("",["images et antécédents","ensemble de définition","appartenance à une courbe","résolution graphique","variations","extremums","signe"])],"reprend ta nouvelle fiche et « Calcul d'images »"),
("Fonctions affines","3e, 2de",[("",["expression et droite","coefficient directeur et ordonnée à l'origine","variations et signe","équations"])],None),
("Fonction carré","2de",[("",["définition et courbe","variations","comparer des images","x² = k, x² < k"])],"aucun modèle aujourd'hui"),
("Fonction inverse","2de",[("",["définition et courbe","variations","comparer des images","1/x = k, 1/x < k"])],"aucun modèle aujourd'hui"),
("Fonction racine carrée","2de",[("",["définition et courbe","variations","comparer des images"])],"aucun modèle aujourd'hui"),
("Fonction cube","2de",[("",["définition et courbe","variations","x³ = k"])],"aucun modèle aujourd'hui"),
("Fonction valeur absolue","2de",[("",["définition et distance","courbe","équations"])],"reprend le domaine Valeur absolue"),
("Second degré","1re",[("",["racines","signe","formes","variations","parabole","somme et produit des racines"])],"équations et inéquations → Algèbre"),
("Dérivation","1re, Tle, Tle comp.",[("",["nombre dérivé","tangente","fonctions dérivées","variations","étude de fonction","optimisation","fonctions composées"])],"optimisation : sous-notion, plus une notion"),
("Fonction exponentielle","1re",[("",["propriétés algébriques","dérivée","variations","courbe","équations et inéquations","suites et modélisation"])],None),
("Fonctions trigonométriques","1re, Tle",[("",["cercle et radians","cosinus et sinus d'un réel","équations","inéquations","parité et périodicité","dérivées et variations"])],None),
("Limites de fonctions","Tle, Tle comp.",[("",["limite en un point","opérations","formes indéterminées","croissances comparées","asymptotes"])],None),
("Continuité","Tle, Tle comp.",[("",["lecture graphique","valeurs intermédiaires"])],None),
("Convexité","Tle, Tle comp.",[("",["caractérisations","dérivée seconde","point d'inflexion","inégalités de convexité","lecture graphique"])],None),
("Logarithme népérien","Tle, Tle comp.",[("",["réciproque de l'exponentielle","propriétés algébriques","équations et inéquations","dérivée","courbe"])],None),
]
IN=[
("Calcul d'intégrales","Tle, Tle comp.",[("",["par une primitive","relation de Chasles","linéarité","intégration par parties","méthode des rectangles"])],None),
("Intégrale et aire","Tle, Tle comp.",[("",["aire algébrique","aire entre deux courbes","lecture graphique"])],None),
("Valeur moyenne","Tle, Tle comp.",[("",["calcul","encadrement","interprétation"])],None),
("Fonction intégrale","Tle, Tle comp.",[("",["dérivée d'une fonction intégrale"])],None),
]
ED=[
("Généralités","Tle, Tle comp.",[("",["notion de solution","allure des courbes"])],None),
("y′ = f","Tle, Tle comp.",[("",["primitives : notion","primitives des fonctions de référence","formes u′eᵘ, 2uu′, u′/u","forme (v′∘u)×u′","sinus et cosinus"])],"les primitives sont les solutions de y′ = f"),
("y′ = ay","Tle, Tle comp.",[("",["solution générale","condition initiale"])],None),
("y′ = ay + b","Tle, Tle comp.",[("",["solution générale","condition initiale"])],None),
("y′ = ay + f","Tle",[("",["solution particulière donnée","solution générale"])],None),
]
SU=[
("Généralités sur les suites","1re",[("",["calculer un terme","explicite ou par récurrence","deviner le terme général","représentation graphique","sens de variation"])],None),
("Suites arithmétiques","1re",[("",["reconnaître","raison","terme général","calculer un terme","somme des termes"])],None),
("Suites géométriques","1re",[("",["reconnaître","raison","terme général","calculer un terme","somme des termes"])],None),
("Suites et modélisation","1re, Tle, Tle comp.",[("",["placements","pourcentages","seuil","algorithmes"])],None),
("Limites de suites","1re, Tle, Tle comp.",[("",["définition","opérations","formes indéterminées","comparaison et encadrement","suites géométriques","convergence monotone","suites majorées, minorées"])],None),
("Raisonnement par récurrence","Tle",[("",["structure d'une récurrence"])],None),
("Suites récurrentes","Tle, Tle comp.",[("",["escalier","point fixe"])],None),
("Suites arithmético-géométriques","Tle, Tle comp.",[("",["solution constante","suite auxiliaire","limite"])],None),
]
GE=[
("Vecteurs : sans coordonnées","2de",[("",["translation et vecteur","égalité de vecteurs","somme et relation de Chasles","produit par un réel","colinéarité"])],"aucun modèle aujourd'hui"),
("Vecteurs : avec coordonnées","2de",[("",["coordonnées d'un vecteur","somme et produit par un réel","norme","colinéarité et déterminant"])],"aucun modèle aujourd'hui"),
("Géométrie repérée","2de, 1re",[("",["milieu et distance","équations de droites","vecteur normal et équation de droite","équation de cercle","projeté orthogonal"])],None),
("Produit scalaire","1re",[("",["calculer un produit scalaire","angles et longueurs","propriétés","lieux de points"])],None),
("Espace : sans coordonnées","Tle",[("",["vecteurs de l'espace","colinéarité et alignement","coplanarité et décomposition","positions relatives de droites et plans"])],None),
("Espace : avec coordonnées","Tle",[("",["coordonnées dans l'espace","représentation paramétrique d'une droite","intersections","positions relatives par le calcul"])],None),
("Orthogonalité : sans coordonnées","Tle",[("",["produit scalaire dans l'espace","orthogonalité de droites et plans","projeté orthogonal","angles"])],"dans l'espace"),
("Orthogonalité : avec coordonnées","Tle",[("",["norme et distance","vecteur normal à un plan","équation cartésienne d'un plan","sphère"])],"dans l'espace"),
]
GR_M=[
("Périmètres","6e",[("",["carré","rectangle"])],None),
("Aires","6e, 5e",[("",["carré","rectangle","triangle rectangle","triangle quelconque","parallélogramme"])],None),
("Volumes","6e",[("",["conversions"])],None),
("Durées","6e",[("",["calculer","convertir"])],None),
("Unités et conversions","6e",[("",["unités simples","unités composées"])],None),
]
PS=[
("Expériences aléatoires","5e à 2de",[("",["fréquences","probabilité simple","équiprobabilité","événements"])],"reprend le domaine Probabilités > Apprivoiser"),
("Probabilités conditionnelles","2de, 1re",[("",["arbres pondérés","tableaux croisés","indépendance","problèmes en contexte"])],None),
("Variables aléatoires","1re",[("",["loi d'une variable aléatoire","compléter une loi","espérance","variance et écart-type","jeux et gains"])],None),
("Loi binomiale","Tle, Tle comp.",[("",["schéma de Bernoulli","reconnaître une loi","calcul de probabilités","coefficients binomiaux","espérance et variance"])],None),
("Autres lois","Tle comp.",[("",["loi géométrique","loi uniforme discrète","loi uniforme continue","loi exponentielle","densité et aire","espérance"])],None),
("Sommes et concentration","Tle",[("",["espérance et variance d'une somme","échantillons","Bienaymé-Tchebychev","inégalité de concentration"])],"sommes de variables aléatoires"),
]
DE=[
("Principes de dénombrement","Tle",[("",["principes additif et multiplicatif","k-uplets","parties d'un ensemble"])],None),
("Arrangements et permutations","Tle",[("",["arrangements","permutations","factorielle"])],None),
("Combinaisons","Tle",[("",["combinaisons","coefficients binomiaux","triangle de Pascal"])],None),
("Problèmes de dénombrement","Tle",[("",["dénombrer avec contraintes","reconnaître le modèle","algorithmique"])],None),
]
ST=[
("Représenter des données","5e à 2de",[("",["effectifs et fréquences","tableaux","diagrammes en barres","diagrammes circulaires","histogrammes","fréquences cumulées"])],"aucun modèle aujourd'hui"),
("Indicateurs","5e à 2de",[("",["moyenne","médiane","quartiles","étendue","écart-type"])],"aucun modèle aujourd'hui"),
("Échantillonnage","2de",[("",["fluctuation","simulation","estimation d'une proportion"])],"aucun modèle aujourd'hui"),
("Statistique à deux variables","Tle comp.",[("",["nuage de points","point moyen","ajustement affine","changement de variable"])],"reprend le thème Statistiques"),
]
LO=[
("Connecteurs et contre-exemples","2de, 1re",[("",["et, ou, non","contre-exemple"])],None),
("Implication et équivalence","2de, 1re",[("",["implication","réciproque","contraposée","équivalence"])],None),
("Quantificateurs et négation","2de, 1re",[("",["pour tout, il existe","négation d'une proposition"])],None),
("Raisonnements","2de, 1re",[("",["par l'absurde","par contraposée","disjonction de cas"])],None),
]
EN=[
("Ensembles de nombres","2de",[("",["ℕ, ℤ, 𝔻, ℚ, ℝ","appartenance et inclusion","intervalles"])],None),
("Opérations sur les ensembles","2de, 1re",[("",["union et intersection","complémentaire","différence"])],None),
("Cardinal et produit cartésien","1re, Tle",[("",["cardinal","produit cartésien"])],None),
]
AG=[
("Variables et instructions","2de",[("",["variables et affectation","types","instructions conditionnelles"])],None),
("Boucles","2de",[("",["boucle bornée","boucle non bornée"])],None),
("Fonctions Python","2de",[("",["définir une fonction","appeler une fonction"])],None),
("Listes","1re",[("",["créer une liste","parcourir une liste","liste en compréhension"])],None),
]
MA=[
("Calcul matriciel","Expertes",[("",["opérations","produit","inverse","puissances de matrices"])],None),
("Systèmes linéaires","Expertes",[("",["écriture matricielle","résolution"])],None),
("Suites et matrices","Expertes",[("",["suites couplées","modélisation"])],None),
("Transformations du plan","Expertes",[("",["matrice d'une transformation"])],None),
]
GR=[
("Vocabulaire des graphes","Expertes",[("",["sommets, arêtes, degré","graphe orienté","modélisation par un graphe"])],None),
("Chaînes et connexité","Expertes",[("",["chaînes et cycles","connexité"])],None),
("Matrice d'adjacence","Expertes",[("",["matrice d'adjacence","nombre de chaînes de longueur n"])],None),
("Chaînes de Markov","Expertes",[("",["graphe probabiliste","matrice de transition","état stable"])],"vient de l'ancien domaine Chaînes de Markov (3 modèles)"),
]
CX=[
("Forme algébrique","Expertes",[("",["calculs","conjugaison","inverse et quotient","équations"])],None),
("Module et argument","Expertes",[("",["module","argument"])],None),
("Formes trigo. et exponentielle","Expertes",[("",["forme trigonométrique","forme exponentielle","formule de Moivre","formules d'Euler"])],None),
("Équations polynomiales","Expertes",[("",["second degré","racines d'un polynôme","degré 3 et factorisation"])],None),
("Interprétation géométrique","Expertes",[("",["affixes et distances","alignement et orthogonalité","angles et quotient","ensembles de points","racines de l'unité"])],None),
]
AR=[
("Divisibilité","cycle 3 à Expertes",[("",["multiples et diviseurs","critères de divisibilité","division euclidienne"])],"reprend aussi l'ancien « Entiers : diviser, divisibilité » (CE2 à CM2)"),
("Nombres premiers","3e, Expertes",[("",["reconnaître un nombre premier","décomposition en facteurs premiers"])],None),
("PGCD, Bézout et Gauss","Expertes",[("",["PGCD","théorèmes de Bézout et de Gauss","équations diophantiennes"])],None),
("Congruences","Expertes",[("",["congruences","chiffrement"])],None),
]
nc=build(NC,"Nombres","et calculs","Branche Nombres et calculs, rangée par type de nombre : 15 notions et leurs sous-notions","c1")
pr=build(PR,"Proportion-","nalité","Branche Proportionnalité : 5 notions et leurs sous-notions","c2")
al=build(AL,"Algèbre","","Branche Algèbre : 8 notions et leurs sous-notions","c3")
fo=build(FO,"Fonctions","","Branche Fonctions : 15 notions et leurs sous-notions","c4")
in_=build(IN,"Intégration","","Branche Intégration : 4 notions et leurs sous-notions","c14")
ed=build(ED,"Équations","différentielles","Branche Équations différentielles : 5 notions et leurs sous-notions","c15")
su=build(SU,"Suites","","Branche Suites : 8 notions et leurs sous-notions","c5")
ge=build(GE,"Géométrie","","Branche Géométrie : 8 notions et leurs sous-notions","c6")
gm_=build(GR_M,"Grandeurs","et mesures","Branche Grandeurs et mesures : 5 notions et leurs sous-notions","c7")
ps=build(PS,"Probabilités","","Branche Probabilités : 6 notions et leurs sous-notions","c8")
de=build(DE,"Dénombrement","","Branche Dénombrement : 4 notions et leurs sous-notions","c18")
st=build(ST,"Statistiques","","Branche Statistiques : 4 notions et leurs sous-notions","c17")
lo=build(LO,"Logique","","Branche Logique : 4 notions et leurs sous-notions","c9")
en=build(EN,"Ensembles","","Branche Ensembles : 3 notions et leurs sous-notions","c19")
ag=build(AG,"Algorithmique","","Branche Algorithmique : 4 notions et leurs sous-notions","c16")
ma=build(MA,"Matrices","","Branche Matrices : 4 notions et leurs sous-notions","c12")
gr=build(GR,"Graphes","","Branche Graphes : 4 notions et leurs sous-notions","c13")
cx=build(CX,"Nombres","complexes","Branche Nombres complexes : 5 notions et leurs sous-notions","c11")
ar=build(AR,"Arithmétique","","Branche Arithmétique : 4 notions et leurs sous-notions","c10")
sec=f'''<section class="branch" id="nombres"><h2><span class="dot c1"></span>Nombres et calculs <small>par type de nombre, 15 notions</small></h2>
<p class="read">Le type de nombre vient en premier ; les gros (Entiers, Décimaux) sont découpés par opération. À droite, chaque pastille est une sous-notion distincte.</p>
<div class="scroll">{nc}</div></section>
<section class="branch" id="arithmetique"><h2><span class="dot c10"></span>Arithmétique <small>branche à part, 4 notions</small></h2>
<p class="read">Sortie de Nombres et calculs. Elle reprend les quatre domaines actuels (maths expertes) et peut accueillir l'arithmétique du collège (multiples, diviseurs, nombres premiers en 3e).</p>
<div class="scroll">{ar}</div></section>
<section class="branch" id="proportionnalite"><h2><span class="dot c2"></span>Proportionnalité <small>mise à jour, 5 notions</small></h2>
<p class="read">Découpage demandé par David. Vitesse vient de Grandeurs et mesures.</p>
<div class="scroll">{pr}</div></section>
<section class="branch" id="algebre"><h2><span class="dot c3"></span>Algèbre <small>8 notions</small></h2>
<p class="read">Calcul littéral en une seule notion ; équations et inéquations classées par forme. Équations et inéquations du second degré ici ; racines, signe, formes et variations d'un trinôme dans Fonctions. Matrices et Graphes deviennent deux branches à part.</p>
<div class="scroll">{al}</div></section>
<section class="branch" id="fonctions"><h2><span class="dot c4"></span>Fonctions <small>15 notions</small></h2>
<p class="read">Une notion par fonction de référence. Optimisation devient une sous-notion de Dérivation. Intégration et Équations différentielles deviennent deux branches à part.</p>
<div class="scroll">{fo}</div></section>
<section class="branch" id="integration"><h2><span class="dot c14"></span>Intégration <small>4 notions</small></h2>
<p class="read">Branche à part (terminale). Reprend le thème Intégration et ses cinq domaines.</p>
<div class="scroll">{in_}</div></section>
<section class="branch" id="equadiff"><h2><span class="dot c15"></span>Équations différentielles <small>5 notions</small></h2>
<p class="read">Branche à part (terminale). Une notion par forme d'équation ; les primitives sont des sous-notions de y′ = f.</p>
<div class="scroll">{ed}</div></section>
<section class="branch" id="suites"><h2><span class="dot c5"></span>Suites <small>8 notions</small></h2>
<p class="read">Reprend les 15 domaines actuels du thème Suites. « Reconnaître une suite », « Sommes » et « Seuils » deviennent des sous-notions.</p>
<div class="scroll">{su}</div></section>
<section class="branch" id="complexes"><h2><span class="dot c11"></span>Nombres complexes <small>branche à part, 5 notions</small></h2>
<p class="read">Sortie de Nombres et calculs, comme Arithmétique : ses cinq domaines actuels (maths expertes) deviennent des notions.</p>
<div class="scroll">{cx}</div></section>
<section class="branch" id="matrices"><h2><span class="dot c12"></span>Matrices <small>branche à part, 4 notions</small></h2>
<p class="read">Maths expertes. Reprend l'ancien domaine Matrices (9 modèles) ; les sous-notions sans modèle aujourd'hui suivent le programme.</p>
<div class="scroll">{ma}</div></section>
<section class="branch" id="graphes"><h2><span class="dot c13"></span>Graphes <small>branche à part, 4 notions</small></h2>
<p class="read">Maths expertes. Reprend les domaines Graphes (7 modèles) et Chaînes de Markov (3 modèles).</p>
<div class="scroll">{gr}</div></section>
<section class="branch" id="geometrie"><h2><span class="dot c6"></span>Géométrie <small>8 notions</small></h2>
<p class="read">Reprend le thème Géométrie (1re, terminale). La géométrie du collège n'a encore aucun modèle.</p>
<div class="scroll">{ge}</div></section>
<section class="branch" id="grandeurs"><h2><span class="dot c7"></span>Grandeurs et mesures <small>5 notions</small></h2>
<p class="read">Vitesse est partie dans Proportionnalité.</p>
<div class="scroll">{gm_}</div></section>
<section class="branch" id="probas"><h2><span class="dot c8"></span>Probabilités <small>6 notions</small></h2>
<p class="read">Reprend le thème Probabilités. « Expériences aléatoires » remplace « Probabilités » pour ne pas répéter le nom de la branche.</p>
<div class="scroll">{ps}</div></section>
<section class="branch" id="denombrement"><h2><span class="dot c18"></span>Dénombrement <small>branche à part, 4 notions</small></h2>
<p class="read">Sorti de Probabilités (terminale). Reprend les 9 sous-domaines de l'ancien domaine Dénombrement (15 modèles).</p>
<div class="scroll">{de}</div></section>
<section class="branch" id="stats"><h2><span class="dot c17"></span>Statistiques <small>4 notions</small></h2>
<p class="read">Séparée des probabilités. Seule la statistique à deux variables a des modèles aujourd'hui ; les autres notions suivent le programme.</p>
<div class="scroll">{st}</div></section>
<section class="branch" id="logique"><h2><span class="dot c9"></span>Logique <small>4 notions</small></h2>
<p class="read">Reprend le domaine Logique et raisonnement ; ses quatre sous-domaines deviennent des notions.</p>
<div class="scroll">{lo}</div></section>
<section class="branch" id="ensembles"><h2><span class="dot c19"></span>Ensembles <small>branche à part, 3 notions</small></h2>
<p class="read">Reprend le domaine Ensembles (1re) ; les ensembles de nombres et les intervalles de 2de y trouvent leur place.</p>
<div class="scroll">{en}</div></section>
<section class="branch" id="algorithmique"><h2><span class="dot c16"></span>Algorithmique <small>4 notions</small></h2>
<p class="read">Aucun modèle aujourd'hui : notions tirées du programme (2de, 1re). « Fonctions Python » pour ne pas confondre avec la branche Fonctions.</p>
<div class="scroll">{ag}</div></section>'''
open('nc-section.html','w').write(sec)

import json
ORDRE=[("Nombres et calculs",NC),("Arithmétique",AR),("Nombres complexes",CX),("Proportionnalité",PR),("Algèbre",AL),
 ("Fonctions",FO),("Intégration",IN),("Équations différentielles",ED),("Suites",SU),("Matrices",MA),("Graphes",GR),
 ("Géométrie",GE),("Grandeurs et mesures",GR_M),("Probabilités",PS),("Dénombrement",DE),("Statistiques",ST),
 ("Logique",LO),("Ensembles",EN),("Algorithmique",AG)]
out={"version":"2026-10-07","statut":"validé par David, rien en base",
 "branches":[{"nom":b,"notions":[{"nom":n,"niveaux":niv,"sous_notions":[(f"{p} : {i}" if p else i) for p,its in g for i in its],"note":note} for n,niv,g,note in L]} for b,L in ORDRE]}
json.dump(out,open('arbre-notions.json','w'),ensure_ascii=False,indent=2)
print(len(out["branches"]),sum(len(b["notions"]) for b in out["branches"]),sum(len(n["sous_notions"]) for b in out["branches"] for n in b["notions"]))
