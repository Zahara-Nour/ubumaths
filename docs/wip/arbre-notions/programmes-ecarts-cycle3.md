# Arbre des notions et programme du cycle 3 : écarts

> Comparaison du 2026-10-07 entre `arbre-notions.json` (version 2026-10-07.2 : 124 notions,
> ajouts du cycle 2 compris) et le programme de mathématiques du cycle 3, sous le modèle de
> l'ADR 0020 : chaque ligne de programme devient un **point rattaché à un nœud**, le grain de
> l'arbre est celui du **filtre**.
> **Rien n'est modifié** : ce document propose, David tranche.

## Textes comparés

| Document                                                                      | Référence / date                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| « Programme de mathématiques pour le cycle 3 » (28 p.)                        | **Publié au BOENJS du 17 avril 2025** (référence donnée par les trois livrets ; le PDF du programme ne se date pas lui-même). Annualisé CM1 / CM2 / 6e. Six domaines : Nombres calcul et résolution de problèmes (avec une sous-partie **Algèbre**) · Grandeurs et mesures · Espace et géométrie · **OGD et probabilités** · **La proportionnalité** · **Initiation à la pensée informatique**. CM : « Objectifs d'apprentissage » ; 6e : « Automatismes » + « Connaissances et capacités attendues » + « Mises en perspective historiques ou culturelles ».                                             |
| Livrets d'accompagnement CM1 (42 p.), CM2 (41 p.), 6e (37 p.), millésime 2026 | ⚠️ **Pas des inventaires** : 3 séquences modèles chacun (CM1 : ×5, raisonnement algébrique, probabilités · CM2 : fractions ±, proportionnalité, probabilités · 6e : probabilités, proportionnalité, médiatrice). Utiles pour les bornes, les fluences (CM1 : 15 calculs ×5 en 3 min ; CM2 : 6-8 calculs de fractions en 8 min) et les garde-fous (pas de produit en croix, retour à l'unité seulement en 6e, simplification de fractions non attendue au CM). Le millésime 2026 des livrets CM2/6e signe l'application du programme en CM2 et en 6e **à la rentrée 2026** — donc en vigueur cette année. |

⚠️ **C'est un programme profondément remanié** par rapport au cycle 3 de 2020 :

- **Algèbre dès le CM1** (« pensée algébrique ») : égalités à trous, nombre inconnu représenté
  par un symbole ou une lettre, problèmes algébriques, programmes de calcul, suites de motifs
  évolutives — modèles pré-algébriques en 6e, les lettres formelles attendent le cycle 4.
- **Probabilités dès le CM1** : qualitatives au CM1 (impossible/certain/probable/une chance sur
  deux), « a chances sur b » + arbre à deux étapes + indépendance au CM2, nombre entre 0 et 1 +
  équiprobabilité + approche fréquentiste en 6e.
- **La 6e change de visage** : médiatrice (définition, propriété caractéristique, raisonnement
  déductif), bissectrice, somme des angles d'un triangle, cercle circonscrit, corde — des
  contenus qui étaient en 5e ; pourcentages (définition, appliquer, exprimer une proportion) ;
  multiplication de deux décimaux ; formules du périmètre du disque et de l'aire du
  carré/rectangle ; proportionnalité formalisée (définition, « modèle », tableau, échelles) ;
  rubriques « Automatismes » systématiques.
- **Garde-fous du texte** : pas de calculatrice au quotidien, pas de tableaux de conversion, pas
  de produit en croix, pas de coefficient de proportionnalité au CM, pas de rapporteur avant la
  6e, pas de formules de périmètre/aire au CM (sauf aire du carré/rectangle au CM2), angles
  saillants seulement.

## Légende

Identique au document cycle 2 : **[C]** nœud existant (la ligne devient un ou plusieurs points
dessous) · **[P]** sous-notion à créer, justifiée par le critère du filtre · **[A]** notion à
créer · **[T]** ni nœud ni point (modalité, fluence, principe).

### Lignes du programme à plusieurs gestes (question de David du 2026-10-07)

Beaucoup de puces du BO énumèrent plusieurs gestes (« Comparer, encadrer, intercaler des nombres
entiers en utilisant les symboles =, < et > »). Règle retenue pour le pointage, dans la lignée du
seed 1re spé : **une puce du BO = un point par défaut**, même si elle énumère des variantes du
même geste — la fidélité au texte prime, et la couverture se coche comme le BO l'écrit. On ne
**scinde** une puce que si elle attelle des gestes réellement distincts, c'est-à-dire : (a) elle
vise **deux nœuds différents** de l'arbre (un point ne vise qu'un nœud), ou (b) on peut
couvrir la moitié de la puce sans l'autre moitié dans une progression normale, ou (c) elle mêle
une connaissance et un savoir-faire (le `kind` est porté par le point). Chaque scission est
documentée dans le markdown source du seed, comme les « 3 puces coupées en deux » du seed 1re spé.
Dans CE document, une ligne regroupe parfois plusieurs puces qui partagent la même destination :
c'est une compression de lecture — au pointage, chaque puce redevient un point.

## Vue d'ensemble

Le cycle 2 avait créé les maisons du primaire (Problèmes, grandeurs, géométrie plane/solides,
repérage) : le cycle 3 les remplit et les prolonge presque partout en **[C]**. Il reste **2
notions** à créer (Premiers pas algébriques, Angles), **~8 sous-notions**, et un fait de
production à traiter : **le référentiel 6e en prod (95 points) décrit l'ancien programme** alors
que le nouveau est en vigueur en 6e depuis cette rentrée.

---

## Nombres, calcul et résolution de problèmes

### Les nombres entiers

- CM1 « jusqu'à 999 999 » · CM2 « jusqu'à 999 999 999 » · 6e « grands nombres, milliard, valeur
  des chiffres, unités de numération » — **[C]** `Entiers : numération > écrire, décomposer`
  (bornes dans les libellés des points).
- CM « comparer et dénombrer des collections ; comparer, encadrer, intercaler (=, <, >) ;
  ordonner ; placer et repérer sur une demi-droite graduée » — **[C]** `> comparer, repérer,
dénombrer`.
- CM1 « reconnaître les multiples de 2, 5, 10 ; multiple / diviseur d'un entier ≤ 10 » · CM2
  « diviseurs d'un entier ≤ 100 ; tous les diviseurs d'un entier ≤ 30 ; diviseurs communs ≤ 30 ;
  multiples communs < 15 » — **[C]** `Arithmétique > Divisibilité > multiples et diviseurs,
critères de divisibilité`.

### Les fractions

- CM1 « fractions > 1 (dén. ≤ 20, décimales dén. 100) ; entier + fraction ↔ fraction unique ;
  encadrer entre deux entiers consécutifs ; placer/repérer sur demi-droite ; comparer » · CM2
  « dén. ≤ 60, décimales 100/1000 » · 6e « sens quotient (a/b = a ÷ b, égalités à trous
  multiplicatives, graduer un segment, a/b entier/décimal/non décimal) ; comparer, encadrer,
  ordonner fractions et nombres mixtes » — **[C]** `Fractions : sens et écritures > définition,
décomposer, comparer, droite graduée` (le sens quotient = points 6e sous `définition`).
- CM « additionner et soustraire des fractions ; fraction d'une quantité ou d'une grandeur » ·
  CM2-6e « produit d'un entier et d'une fraction ; appliquer une fraction à un entier » ; 6e
  « problèmes, inventer des problèmes » — **[C]** `Fractions : calculs > additionner et
soustraire, multiplier, fraction d'une quantité`.
- 6e « Pourcentages : sens ; calculer une proportion et l'exprimer en pourcentage ; appliquer un
  pourcentage à une grandeur ou à un nombre ; différentes écritures d'un décimal (virgule,
  fraction, nombre mixte, pourcentage) » — **[C]** `Proportionnalité > Pourcentages > définition,
calculer` (niveau 6e déjà porté ; les livrets confirment : plus de pourcentages au cours moyen).

### Les nombres décimaux

- CM1 « au centième, via les fractions décimales ; écritures (fraction décimale ↔ virgule) ;
  placer/repérer ; comparer, encadrer, intercaler, ordonner » · CM2 « au millième » · 6e
  « reconnaître un décimal ; écritures ; arrondis (à l'unité, au dixième, au centième ; valeurs
  arrondies de non-décimaux) ; ordres de grandeur » — **[C]** `Décimaux : numération` +
  **[P]** sous-notion **« arrondir »**. Filtre : oui — les fiches d'arrondis et d'ordres de
  grandeur sont une famille d'exercices à part entière, du CM à la 2de.
- CM « partie entière ; arrondi à l'entier » — points sous « arrondir ».
- 6e « multiplication de deux décimaux (sens et calcul) ; × 0,1 / 0,01 / 0,001 et lien avec
  ÷ 10/100/1000 ; division décimale (décimal ÷ entier < 10) ; add/soustraire » — **[C]**
  `Décimaux : calculs > multiplier, diviser, puissances de 10, additionner, soustraire`.

### Le calcul mental

Trois types (faits · numération · procédures), avec un grain fin par année (± 8, 9, 18, 19…
98/99 ; × 4, × 8, × 5, × 50 ; double/moitié de décimaux ; ÷ 4, ÷ 8 ; moitié des impairs ≤ 15 ;
relations entre fractions usuelles ; écriture décimale des fractions usuelles ; automatismes 6e
sur 1/10, 1/100, 1/1000…) — **[C]** : des points (souvent en régime automatisme) sous les
sous-notions existantes des notions d'opérations et de fractions, comme au cycle 2. Fluences
chiffrées — **[T]** métadonnées.

### Les quatre opérations

- CM1 « estimer le résultat ; calcul avec parenthèses » · CM2 « une ou deux paires de
  parenthèses » — **[C]** `Entiers : priorités opératoires > avec parenthèses` (⚠️ niveau : dès
  le CM1, l'arbre disait « 6e, 5e »).
- CM1 « poser : additions et soustractions de décimaux ; multiplications de deux entiers ;
  multiplication décimal × entier < 10 ; divisions euclidiennes diviseur à 1 chiffre » · CM2
  « multiplication décimal × entier ; divisions décimales (dividende entier ou décimal, diviseur
  à 1 chiffre) » · 6e « division euclidienne (diviseur ≤ 100) ; division décimale » — **[C]**
  via la sous-notion **« calcul posé »** validée au cycle 2 (Q1), à étendre par cohérence à
  `Décimaux : calculs` et `Entiers : division` (prolongement mécanique de Q1, pas une nouvelle
  question — voir R4).

### La résolution de problèmes

- CM « additifs 1 étape (parties-tout, comparaison) ; 2-3 étapes ; multiplicatifs parties-tout ;
  comparaison multiplicative ; mixtes » — **[C]** `Problèmes arithmétiques` (les 5 sous-notions
  du cycle 2 couvrent ; niveaux CM1-6e = pointage).
- CM « problèmes de dénombrement » — **[C]** `> produits cartésiens` (points ; si le pointage
  montre que ça déborde des produits cartésiens, on renommera — à voir à l'usage).
- CM « problèmes d'optimisation » — **[P]** sous-notion **« optimisation »**. Filtre : oui — une
  famille d'énoncés très reconnaissable (« le plus grand…, le moins cher… »), que le programme
  nomme ainsi deux années de suite.
- CM2 « problèmes préparant à l'utilisation d'algorithmes » — point sous `Problèmes
arithmétiques` ou sous les premiers pas algébriques (programmes de calcul) selon l'énoncé.

### Algèbre (sous-partie nouvelle du programme, CM1 à 6e)

- CM « trouver le nombre manquant dans une égalité à trous ; déterminer un nombre inconnu
  représenté par un symbole ou une lettre ; résoudre des problèmes algébriques ; exécuter
  (CM1) / exécuter ou produire (CM2) un programme de calcul ; identifier et formuler une règle
  de calcul pour poursuivre une suite de nombres ; suites de motifs évolutives (+ trouver le
  nombre d'éléments à une étape donnée, CM2) » · 6e « modèles pré-algébriques ; structure d'un
  motif évolutif » — **[A]** : rien dans l'arbre avant `Algèbre > Équations : premier degré`
  (5e). → **Proposition R1** : notion **« Premiers pas algébriques »** dans la branche `Algèbre`
  (CM1 à 6e), sous-notions **« égalités à trous »**, **« nombre inconnu »**, **« programmes de
  calcul »**, **« suites de motifs »**. Filtre : oui pour les quatre (les « programmes de
  calcul » notamment sont un classique absolu, qui resservira au cycle 4). Les suites de motifs
  **évolutives** vivent ici ; les suites **répétitives** du cycle 2 (travail du rang) restent
  sous `Entiers : numération > ordinaux et rangs` — la frontière est celle du programme lui-même.

---

## Grandeurs et mesures

- Longueurs : CM1 « mm → km, relations, choisir l'unité, comparer, références, estimer ;
  périmètre d'une figure, périmètre d'un polygone à la règle graduée, problèmes
  périmètre/côtés » · 6e « préfixes kilo → milli, conversions par le mètre, compas comme report,
  périmètres de figures composées » — **[C]** `Longueurs` (créée au cycle 2 — la mention « cycle
  3 à confirmer » est levée) + `Périmètres`.
- 6e « périmètre du disque : proportionnel au diamètre, formule, calcul » — **[P]** `Périmètres`
  > **« disque »**. Filtre : oui, les fiches « périmètre du cercle » sont un classique de 6e.
- Masses : CM1 « mg → tonne, relations, choisir, comparer, références, estimer » — **[C]**
  `Masses` (confirmée).
- Contenances : CM1 « mL → hL, relations, choisir, comparer » — **[C]** `Contenances`
  (confirmée ; rien en CM2/6e — la grandeur bascule vers les volumes au collège).
- **Aires : CM1 → 6e** : CM1 « comparer ; déterminer avec une unité et un quadrillage ; cm² » ·
  CM2 « + dm², m², conversions, aire du carré et du rectangle » · 6e « formules carré/rectangle ;
  conversions ; comparer sans mesurer » — **[C]** `Aires > carré, rectangle` + **[P]**
  sous-notion **« unités et conversions »** (filtre : les fiches de conversions d'aires, grand
  classique de 6e-5e) ; « comparer/quadrillage » = points.
- **Angles : CM1 → 6e** — **[A]** rien dans l'arbre (l'angle droit de Figures planes ne couvre
  pas la grandeur) : CM1 « lexique, notations, comparer » · CM2 « degré, angle droit = 90°,
  somme/multiple d'angles, moitié par pliage (pas de rapporteur) » · 6e « lexique complet (plat,
  plein, nul, aigu, obtus, opposés par le sommet, adjacents, supplémentaires) ; **mesurer un
  angle** ; construire un angle de mesure donnée » — → **Proposition R2** : notion **« Angles »**
  dans `Grandeurs et mesures` (CM1 à 6e), sous-notions **« comparer »**, **« mesurer en
  degrés »**, **« construire »**. Filtre : oui (fiches de rapporteur, immense classique). Le
  versant « figures » (opposés par le sommet, bissectrice) va côté Géométrie (R3).
- Volumes : 6e « cm³ ; comparer ; déterminer (dénombrement d'assemblages de cubes) » — **[C]**
  `Volumes` (+ points ; `conversions` existe).
- Durées : CM1 « lire l'heure, aiguilles h/min, durées entre deux instants, problèmes 1-2
  étapes » · CM2 « + secondes » · 6e « système sexagésimal, conversions, horaires, jours/année
  bissextile/siècle/millénaire, calendriers » — **[C]** `Durées > lire l'heure, calculer,
convertir`.

---

## Espace et géométrie

- Géométrie plane CM1 : « vocabulaire ; règle, règle graduée, équerre, compas ; codes ; cercle
  et disque comme ensembles de points ; **perpendicularité ; parallélisme** ; triangle (+
  rectangle, isocèle, équilatéral), quadrilatère, carré, rectangle, losange + propriétés
  (parallélisme des côtés opposés, égalités de longueurs et d'angles) ; reproduire/construire ;
  figure composée » · CM2 « + trapèze, trapèze rectangle, pentagone, hexagone ; élaborer un
  programme de construction » — **[C]** `Figures planes > reconnaître et décrire, reproduire et
construire, cercle` + **[P]** sous-notion **« perpendiculaires et parallèles »** (filtre :
  oui — fiches de tracés à l'équerre, classique CM-6e).
- Symétrie axiale : CM1 « axes, compléter, construire le symétrique sur quadrillage (axe h/v) » ·
  CM2 « + axe diagonal » · 6e « définition du symétrique d'un point ; propriétés pour
  constructions » — **[C]** `Symétrie axiale` (niveaux CE2 → 6e confirmés).
- 6e « Étude de configurations planes » : distances (définition, milieu) ; cercles/disques
  (rayon, diamètre, **corde**, ensembles de points, problèmes de distances) ; **médiatrice**
  (définition, propriété caractéristique, problèmes — support du raisonnement déductif) ;
  angles-objets (opposés par le sommet, adjacents, supplémentaires) ; **bissectrice**
  (définition, constructions) ; **triangles** (construire au compas, propriétés angulaires des
  triangles particuliers, **somme des angles**, médiatrices concourantes, **cercle
  circonscrit**) — **[P]** deux sous-notions sous `Figures planes` : **« triangles »** et
  **« médiatrice et bissectrice »** (filtre : oui — familles d'exercices très identifiées, qui
  continueront au cycle 4). Le cercle circonscrit = point sous « triangles » ; distances/cordes =
  points sous « cercle ».
- Solides : CM1 « + **prisme droit** ; nommer/décrire (faces cube, pavé, pyramide, prisme) ;
  construire ; patron du cube (reconnaître, construire) » · CM2 « + patron d'un pavé
  (reconnaître) » · 6e « vision dans l'espace : assemblages de cubes 3D ↔ 2D, dénombrements ;
  automatisme de reconnaissance » — **[C]** `Solides > reconnaître et décrire, construire,
patrons` (+ points « vision dans l'espace » ; niveaux CP → 6e confirmés).
- Repérage et déplacements : CM « vocabulaire des déplacements ; comprendre/produire une suite
  d'instructions ; problèmes d'assemblages de cubes » — **[C]** `Repérage et déplacements >
coder un déplacement, positions et plans` (niveaux CP → CM2 ; la 6e bascule côté pensée
  informatique, ci-dessous).

---

## OGD et probabilités

- OGD : CM1 « recueillir, produire tableau / diagramme en barres / **ensemble de points dans un
  repère** ; lire tableau simple ou double entrée, diagramme en barres, **courbe** ; problèmes » ·
  CM2 « + diagrammes circulaires » · 6e « mener une enquête (planifier, mesurer, consigner,
  filtrer selon un critère) ; automatisme de lecture » — **[C]** `Statistiques > Représenter des
données > tableaux, tableau à double entrée, diagrammes en barres, diagrammes circulaires` +
  **[P]** sous-notion **« courbes et repères »** (filtre : oui — « lire une courbe » est une
  famille d'exercices à part, du CM1 à la 3e). « Enquête » = points (modalité d'activité,
  décision du cycle 2 reconduite).
- **Probabilités : CM1 → 6e** — **[C]** `Probabilités > Expériences aléatoires > fréquences,
probabilité simple, équiprobabilité, événements` : CM1 « expériences aléatoires, issues,
  vocabulaire (impossible/possible/certain/probable/peu probable/une chance sur deux), comparer,
  équiprobabilité » · CM2 « a chances sur b ; comparer ; **indépendance lors de la répétition** ;
  recenser les issues d'une expérience à deux étapes (tableau, arbre) » · 6e « probabilité =
  nombre entre 0 et 1 (fraction, décimal, pourcentage) ; calculer dans l'équiprobabilité ;
  **approche fréquentiste** (comparer les résultats d'une expérience répétée à une probabilité
  calculée) ». Les niveaux descendent de « 5e à 2de » à « CM1 à 2de ». L'indépendance du CM2
  (« le dé ne se souvient pas ») reste un point d'Expériences aléatoires, pas de Probabilités
  conditionnelles.

---

## La proportionnalité

- CM « identifier une situation de proportionnalité ; résoudre (linéarité multiplicative puis
  additive, exclusivement dans le cadre des grandeurs ; PAS de tableaux, de coefficient ni de
  produit en croix) » · 6e « définition entre deux grandeurs ; identifier le "modèle" ; procédure
  adaptée (linéarité ×/+, **retour à l'unité** — introduit en 6e) ; représenter (tableau,
  notations symboliques) ; **s'initier aux problèmes d'échelles** » — **[C]**
  `Proportionnalité > Situations de proportionnalité > reconnaître, appliquer` (niveaux
  descendent de « 6e à 3e » à « CM1 à 3e ») et `Échelle d'une carte` (6e ✓).

## Initiation à la pensée informatique

- CM « codages de déplacements élargis (quartier, ville), robots » — **[C]** `Repérage et
déplacements > coder un déplacement` (points CM1-CM2).
- CM « suites évolutives par algorithmes ; programmes de calcul (exécuter, produire — jusqu'à
  3 instructions au CM2) ; Scratch ou tableur pour vérifier » — **[C]** points sous les
  **Premiers pas algébriques** (R1) — c'est le même contenu, vu par le programme sous deux
  domaines.
- CM « programmes de construction de figures » — **[C]** point sous `Figures planes > reproduire
et construire`.
- 6e « instructions, séquences, entrées/sorties, répétitions ; identifier/produire/exécuter une
  séquence ; répéter à la main ; programmer la construction d'un chemin simple » — **[C]** points
  sous `Repérage et déplacements > coder un déplacement` (6e). La branche `Algorithmique`
  (Python) reste lycée — décision Q5 du cycle 2 reconduite.

## Transversal — [T]

Fluences chiffrées (CM1 : 15 calculs en 3 min…) · pas de calculatrice au quotidien · ≥ 10
problèmes par semaine · « Mises en perspective historiques ou culturelles » de la 6e
(numérations anciennes, calendriers, Stevin — enrichissements non exigibles) · compétences
psychosociales, égalité filles-garçons : principes et modalités.

## Sens inverse

Rien de ce que l'arbre marque pour CM1-6e n'est étranger au programme. À noter : `Entiers :
division > division euclidienne` vivait « CE2 à CM2 » — la 6e la prolonge (diviseur ≤ 100) ;
`Entiers : priorités opératoires` vivait « 6e, 5e » — les parenthèses commencent au CM1. Niveaux
indicatifs à rafraîchir en conséquence (avec Aires « CM1 à 5e », Expériences aléatoires « CM1 à
2de », Situations de proportionnalité « CM1 à 3e », et les « cycle 3 à confirmer » du cycle 2
levés).

## ⚠️ Le référentiel 6e en prod est périmé

Le seed 6e de juin (6 thèmes · 20 objectifs · 95 points, source `6e-programme-curriculum.md`)
décrit le **programme 2020**. Le programme du 17 avril 2025 est **en vigueur en 6e depuis la
rentrée 2026** (livret d'accompagnement 6e millésimé 2026), et il change la donne : médiatrice,
bissectrice, somme des angles, cercle circonscrit, probabilités, pourcentages, multiplication de
deux décimaux, automatismes… Le suivi de programme des classes de 6e de David coche donc des
points d'un programme qui n'est plus celui enseigné. → **Question R5** : re-seeder la 6e
(idéalement directement dans la future architecture points → nœuds de l'ADR 0020, pour ne pas
faire le travail deux fois), ou vivre avec l'ancien seed en attendant ? Les points déjà cochés
dans le cahier de texte sont des données d'usage à ne pas perdre.

## Questions pour David

1. **R1 — « Premiers pas algébriques »** : nouvelle notion dans la branche `Algèbre` (CM1 à 6e),
   sous-notions « égalités à trous », « nombre inconnu », « programmes de calcul », « suites de
   motifs » ? (reco : oui ; autre nom bienvenu si « Premiers pas algébriques » ne te plaît pas.)
2. **R2 — « Angles »** : nouvelle notion dans `Grandeurs et mesures` (CM1 à 6e), sous-notions
   « comparer », « mesurer en degrés », « construire » ? (reco : oui — c'est une grandeur, comme
   Aires et Volumes.)
3. **R3 — Figures planes** : trois sous-notions « perpendiculaires et parallèles » (CM1+),
   « triangles » (6e+), « médiatrice et bissectrice » (6e+) ? (reco : oui aux trois.)
4. **R4 — petites sous-notions en bloc** : « optimisation » (Problèmes arithmétiques) ·
   « disque » (Périmètres) · « unités et conversions » (Aires) · « arrondir » (Décimaux :
   numération) · « courbes et repères » (Représenter des données) · extension du « calcul posé »
   (Q1 validée) à `Décimaux : calculs` et `Entiers : division`. (reco : oui à tout.)
5. ~~**R5 — seed 6e périmé**~~ — **TRANCHÉE le 2026-10-07 : option B.** Le seed 6e actuel
   (programme 2020, jamais utilisé — 0 coche, 0 acquisition, 0 tag, mesuré le 2026-10-07) reste
   en place mais **ne doit pas servir** ; la 6e du programme d'avril 2025 sera le **premier
   niveau seedé directement dans l'architecture points → nœuds** (ADR 0020). D'ici là, pas de
   suivi de programme 6e dans Chiphre.
6. **R6 — validation d'ensemble** et application à l'arbre (JSON + diagramme).

## Programmes reçus / manquants (état au 2026-10-07, soir)

Reçus : 2de, 1re spé, Tle spé, Tle comp., Tle expertes · cycle 2 (programme 2024 + 3 livrets) ·
**cycle 3 (programme BOENJS du 17 avril 2025 + 3 livrets 2026)**. Manquants : **cycle 4** (5e,
4e, 3e — d'autant plus attendu que la 6e nouvelle formule y déverse moins de contenus qu'avant),
**mathématiques spécifiques** (enseignement scientifique de 1re générale), **enseignement commun
de mathématiques de la voie technologique** (1re et Tle). Optionnel : spécialité
physique-chimie-maths de STI2D/STL si des élèves concernés arrivent un jour.
