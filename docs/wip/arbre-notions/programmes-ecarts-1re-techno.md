# Arbre des notions et programme de 1re technologique : écarts (modèle ADR 0020)

> Analyse du 2026-10-07 — **programme nouveau dans le chantier** : l'enseignement commun de
> mathématiques de la 1re de la voie technologique n'avait ni section dans
> `programmes-ecarts.md`, ni texte sauvegardé, ni seed en prod. Côté site, c'est le grade
> **`1_TECHNO`** (renommé depuis `1_STMG` le 2026-10-07, PR #922, précisément pour couvrir
> toutes les séries). Comparé à `arbre-notions.json` version 2026-10-07.8 (136 notions,
> 519 sous-notions). **Rien n'est modifié** : ce document propose, David tranche.

## Texte comparé

« Annexe — Programme d'enseignement de mathématiques de la classe de première de la voie
technologique » (10 p.), **fourni par David le 2026-10-07**, même vague d'annexes 2026
(mention IA ; sauvegardé : `progs-lycee/premiere-techno.pdf`). Structure : trois parties
transversales (Vocabulaire ensembliste et logique · Algorithmique et programmation **sauf
STD2A** · Automatismes) et deux parties thématiques (Analyse : Suites numériques, Fonctions
de la variable réelle, Dérivation · Statistiques et probabilités : Séries à deux variables
quantitatives, Probabilités conditionnelles et indépendance, Épreuves indépendantes,
Variables aléatoires), en rubriques Contenus / Capacités attendues / Commentaires /
**Situations algorithmiques** (sauf STD2A). **Particularité : la série STD2A** remplace
l'algorithmique par des « Activités géométriques » (géométrie plane : polygones réguliers,
frises, pavages ; géométrie dans l'espace : repérage, perspective cavalière, sections
planes). Le préambule signale aussi la spécialité « Physique-chimie et mathématiques »
(STI2D/STL) — un autre programme, hors périmètre ici.

Règle d'extraction : Contenus + Capacités attendues + Situations algorithmiques = points ;
Commentaires = cadrage (points seulement quand ils énoncent un attendu).

## Ce que l'ADR 0020 change pour la 1re techno

1. **Les Automatismes sont les mêmes que ceux de la 1re spé et du module ens. sci.** (cinq
   rubriques, mêmes puces à une variation de verbe près) → références
   `curriculum_point_automatismes` portées par `1_TECHNO`, visant des points du **parcours de
   ces élèves** (cycle 4, 2de — règle précisée par David le 2026-10-07 : jamais `1_SPE` ni le
   module ens. sci., programmes parallèles) ; « signe d'une expression factorisée du second
   degré » = référence **interne** au point de 1re techno (Fonctions polynômes de degré 2).
2. **Le tronc commun est presque intégralement couvert par l'arbre** : les lots 1re spé et
   ens. sci. ont créé exactement ce qu'il fallait — statut des lettres et des égalités,
   condition nécessaire/suffisante, éléments et indices, taux de variation, opérations sur
   les dérivées, probabilités totales, épreuves indépendantes successives. **Aucune
   sous-notion à créer pour le tronc commun** ; tout part en points et références.
3. **Pas de seed prod `1_TECHNO`** : ce programme sera seedé directement dans l'architecture
   cible, comme le module ens. sci.

## Légende

**[C]** nœud existant (la ligne devient un ou des points de 1re techno dessous) · **[P]**
sous-notion à créer (filtre justifié) · **[A]** notion à créer · **[T]** ni nœud ni point.

## Vue d'ensemble

Tronc commun : **0 notion, 0 sous-notion** — points et références partout. Les propositions
se concentrent sur la **variante STD2A** (4 sous-notions, question X3, dont la résurrection
du nœud hors programme `Repérage dans l'espace`) et sur la rubrique **Sélection de données**
(simples points, question X2).

---

## Vocabulaire ensembliste et logique

- « élément, sous-ensemble, ensemble vide, appartenance, inclusion, réunion, intersection,
  complémentaire (A̅, E \ A) ; notations, ensembles de nombres, intervalles ; couple, produit
  cartésien ; Card(A) » — **[C]** `Ensembles > Ensembles de nombres, Opérations sur les
ensembles, Cardinal et produit cartésien`.
- « utiliser correctement les connecteurs “et”, “ou” » — **[C]** `Logique > Connecteurs et
contre-exemples`.
- « identifier le statut d'une égalité (identité, équation) et celui des lettres (variable,
  indéterminée, inconnue, paramètre) » — **[C]** `Quantificateurs et négation > statut des
lettres et des égalités` (créée au lot 1re spé — la techno demande exactement la même
  chose, « indéterminée » en plus).
- « utiliser un contre-exemple pour infirmer une proposition universelle » — **[C]**
  `Connecteurs et contre-exemples > contre-exemple`.
- « distinguer une proposition de sa réciproque, de sa contraposée » ; « employer à bon
  escient “condition nécessaire”, “condition suffisante”, “équivalence logique” » — **[C]**
  `Implication et équivalence` (réciproque, contraposée, équivalence, condition nécessaire,
  condition suffisante).
- Commentaires (quantificateurs à l'œuvre sans formalisme ; raisonnements par disjonction,
  contraposée, absurde explicités par les professeurs) — **[T]** cadrage, pas d'attendu élève.

## Algorithmique et programmation (sauf STD2A)

- Variables : « générateur de nombres aléatoires entre 0 et 1 pour simuler une loi de
  Bernoulli ; compteur ; accumulateur (somme, produit) » — **[C]** `Algorithmique > Variables
et instructions, Boucles` (compteur et accumulateur = points).
- Fonctions : « identifier les entrées et les sorties ; structurer un programme » — **[C]**
  `Fonctions Python`.
- Listes : « générer (extension, ajouts successifs, compréhension) ; manipuler des éléments
  et leurs indices ; itérer » — **[C]** `Listes` (les quatre sous-notions, « éléments et
  indices » créée au lot 1re spé).
- **Sélection de données** : « traiter un fichier contenant des données réelles pour en
  extraire de l'information et l'analyser ; réaliser un tableau croisé de données sur deux
  critères à partir de données brutes » — **[C]** points sous `Statistiques > Tableaux
croisés` (reco), dans la droite ligne du doc 2de qui y a mis les « algorithmes de
  filtrage » ; l'analyse du fichier pointe aussi `Représenter des données` et `Indicateurs`.
  Alternative si David préfère le versant informatique : une sous-notion « sélection de
  données » dans `Algorithmique` (question X2).

## Activités géométriques (uniquement série STD2A) — question X3

La seule partie du programme sans nœuds : l'arbre n'a ni polygones réguliers, ni frises et
pavages, ni perspective cavalière, ni sections planes. Proposition (si David veut couvrir
STD2A maintenant — l'arbre central a vocation à tout porter) :

- « polygones réguliers : analyser, construire (motif élémentaire et transformations) ;
  distances, angles, aires, périmètres associés » — **[P]** `Figures planes` >
  **« polygones réguliers »** (filtre : constructions au compas, angle au centre — famille
  classique qui sert aussi en enrichissement hors STD2A).
- « frises et pavages : créer une figure par répétition d'une ou deux transformations
  simples ; rechercher un motif élémentaire » — **[P]** `Translations` > **« frises et
  pavages »** (filtre : le motif répété par translations/symétries — c'est la famille
  d'exercices qui fait VIVRE les transformations ; autre maison possible : `Symétrie
axiale`).
- « perspective cavalière : projection sur un plan parallèlement à une droite ; propriétés
  conservées et non conservées ; représenter en perspective » — **[P]** `Solides` >
  **« perspective cavalière »** (filtre : famille de représentation, ancienne 4e-2de).
- « sections planes d'un cube, d'un cylindre de révolution ; ellipses ; parallélogramme
  circonscrit à une ellipse ; image perspective d'un cercle » — **[P]** `Solides` >
  **« sections planes »** (filtre : famille à part, ancienne 3e-2de, réactivée par STD2A).
- « repérage : coordonnées d'un point dans un repère orthonormal de l'espace ; distance
  entre deux points » — **[C]** `Repérage dans l'espace` — **le nœud hors programme
  (demandé par David au cycle 4) retrouve un programme** : niveau indicatif « hors
  programme » → **« 1re techno (STD2A) »**.

## Automatismes (tous : RÉFÉRENCES de 1re techno vers cycle 4 / 2de / elle-même)

Mêmes cibles que les autres 1res, parce que ce sont des points de cycle 4 et de 2de, années
du parcours de ces élèves : **Évolutions et variations** → `Évolutions > variations en
pourcentage, évolutions successives et réciproque` ; **Calcul numérique et algébrique** →
`Équations : produit et quotient > produit nul`, `Fonctions affines > variations et signe`,
`Inégalités > signe d'une expression`, `Calcul littéral`, signe d'une expression factorisée
du second degré en **référence interne** au point de 1re techno ; **Fonctions et
représentations** → `Généralités sur les fonctions > résolution graphique, signe,
variations`, `Fonctions affines`, `Géométrie repérée > équations de droites` ;
**Statistiques** → `Représenter des données`, `Indicateurs` ; **Probabilités** →
`Probabilités conditionnelles > tableaux croisés, arbres pondérés, inversion du
conditionnement`. **[C]**/références partout.

## Analyse

- **Suites numériques** — modes de génération, sens de variation, nuage (n, u(n)) — **[C]**
  `Généralités sur les suites > explicite ou par récurrence, sens de variation,
représentation graphique` ; suites arithmétiques (évolutions absolues constantes) et
  géométriques à termes strictement positifs (évolutions relatives constantes) : relation de
  récurrence, terme de rang n, sens de variation (par la raison), représentation graphique,
  démontrer la nature, conjecturer graphiquement — **[C]** `Suites arithmétiques` et `Suites
géométriques > reconnaître, raison, terme général, calculer un terme` ; modéliser (capital,
  colonie bactérienne) — **[C]** `Suites et modélisation > placements, pourcentages` ;
  situations algorithmiques (terme de rang donné, somme finie de termes par accumulateur,
  liste et représentation, seuil) — **[C]** `Suites et modélisation > seuil, algorithmes`
  (la somme est algorithmique : pas de pointeur sur « somme des termes », comme au module
  ens. sci.).
- **Fonctions de la variable réelle** — représentations, notations y = f(x) et x ↦ f(x) —
  **[C]** `Généralités sur les fonctions > images et antécédents, appartenance à une
courbe` ; « taux de variation entre deux valeurs ; fonctions monotones, lien avec le signe
  du taux de variation ; interpréter le taux comme pente de la sécante » — **[C]**
  `Dérivation > taux de variation` (créée au lot 1re spé) et `Généralités > variations` ;
  résolution graphique f(x) = k, f(x) < k — **[C]** `> résolution graphique` ; fonctions
  polynômes de degré 2 (allure, axe de symétrie, sommet, tableau de variation ; racines et
  signe sous forme factorisée ; **discriminant exclu**, comme au module ens. sci. ; formes
  ax², ax² + c, a(x − x₁)(x − x₂) ; vérifier qu'une valeur est racine ; factoriser
  connaissant une racine) — **[C]** `Second degré > parabole, variations, racines, signe,
formes` ; situation algorithmique « valeur approchée d'une solution par balayage » —
  **[C]** point sous `Généralités > résolution graphique`.
- **Dérivation** — point de vue local : sécantes, taux de variation en un point, tangente
  comme position limite, nombre dérivé comme limite du taux, équation réduite de la
  tangente, construire la tangente — **[C]** `Dérivation > taux de variation, nombre dérivé,
tangente` ; point de vue global : fonction dérivée, dérivées de x² et x³, dérivée d'une
  somme, de kf, d'un polynôme de degré ⩽ 3, sens de variation et signe de la dérivée,
  tableau de variations, extremums — **[C]** `> fonctions dérivées, opérations sur les
dérivées, variations, étude de fonction` (créées au lot 1re spé pour les deux premières).

## Statistiques et probabilités

- **Séries statistiques à deux variables quantitatives** — nuage de points, point moyen,
  ajustement affine ; interpoler, extrapoler ; moindres carrés présentés sans théorie —
  **[C]** `Statistique à deux variables > nuage de points, point moyen, ajustement affine`
  (mêmes points que le module ens. sci., chacun pour son parcours) → niveau indicatif de la
  notion : **« 1re ens. sci., 1re techno, Tle comp. »** (X1).
- **Probabilités conditionnelles : indépendance** — indépendance de deux évènements
  (utiliser, justifier) ; **formule des probabilités totales** (cas simples) — **[C]**
  `Probabilités conditionnelles > indépendance, probabilités totales` (la techno l'a,
  contrairement au module ens. sci.).
- **Modèle associé à plusieurs épreuves indépendantes** — répétition d'épreuves de Bernoulli
  identiques et indépendantes, arbre pour n ⩽ 4 — **[C]** `> épreuves indépendantes
successives`.
- **Variables aléatoires** — variable aléatoire discrète : loi de probabilité, espérance ;
  notations {X = a}, {X ⩽ a} et probabilités associées ; calculer et interpréter une
  espérance ; loi de Bernoulli (0,1) de paramètre p, espérance, reconnaître une situation de
  Bernoulli — **[C]** `Variables aléatoires > loi d'une variable aléatoire, espérance` (la
  loi de Bernoulli = points, même traitement qu'en Tle spé) ; simulations de N échantillons
  d'une loi de Bernoulli, fréquences des 1, histogramme ou nuage, distance à p, écart-type s
  de la série des fréquences, ordre 1/√n, intervalles [p − ks ; p + ks] pour k = 1, 2, 3 —
  **[C]** `Statistiques > Échantillonnage > simulation, fluctuation` → niveau indicatif :
  **« 2de, 1re, 1re techno »** (X1).

## [T] et notes

Commentaires de cadrage (notations ←, limites sans formalisme, logiciels), contextes
(impôts, marées, CO₂, intensité-tension, étalonnage), histoire et actualité (médaille
Fields, stéréotypes de genre) : ni nœuds ni points. La **spécialité « Physique-chimie et
mathématiques » (STI2D/STL)** mentionnée par le préambule est un programme distinct, non
fourni — à traiter si David le remet un jour (pas de grade dédié côté site aujourd'hui).

## Sens inverse : ce que la 1re techno ne pointe pas

- `Équations : second degré` (discriminant), forme canonique, `somme des termes` des suites :
  mêmes exclusions que le module ens. sci.
- `Fonction exponentielle` (y compris x ↦ aˣ) et `taux d'évolution moyen` : rien en 1re
  techno — ces contenus (créés pour le module ens. sci.) relèveront vraisemblablement de la
  **Tle techno** ; à vérifier à la reprise de son texte.
- `Dérivation > approximation affine, dérivabilité en un point, position relative de deux
courbes` : spé seulement. `Produit scalaire`, `Fonctions trigonométriques`, `Vecteurs` :
  aucune géométrie hors STD2A.
- `Variables aléatoires > variance et écart-type, compléter une loi, jeux et gains` : la 1re
  techno s'arrête à l'espérance.

## Questions pour David

> **TOUTES TRANCHÉES le 2026-10-07** : « je valide » (X1-X4 selon les recos — libellé
> « 1re techno », Sélection de données = points sous Tableaux croisés, STD2A couverte).
> Appliqué à l'arbre : version 2026-10-07.9 — 136 notions, 523 sous-notions.

1. **X1 — Libellé et niveaux** : libellé **« 1re techno »** pour ce programme (cohérent avec
   le grade `1_TECHNO` et le précédent « 1re ens. sci. ») ; niveaux étendus là où la techno
   introduit en parallèle : `Statistique à deux variables` → « 1re ens. sci., 1re techno,
   Tle comp. », `Échantillonnage` → « 2de, 1re, 1re techno ». Les notions déjà introduites
   par la 1re spé (Second degré, Dérivation, Suites…) ne changent pas : pointage pur, comme
   acté au lot ens. sci. (reco : oui.)
2. **X2 — Sélection de données** (algorithmique) : simples **points** sous `Statistiques >
Tableaux croisés` (+ `Représenter des données`, `Indicateurs`), dans la ligne des
   « algorithmes de filtrage » de la 2de — ou une sous-notion « sélection de données » dans
   `Algorithmique` ? (reco : points.)
3. **X3 — Variante STD2A** : couvrir maintenant ? 4 sous-notions — `Figures planes` >
   **polygones réguliers**, `Translations` > **frises et pavages**, `Solides` >
   **perspective cavalière** et **sections planes** — et `Repérage dans l'espace` pointé
   (niveau « hors programme » → « 1re techno (STD2A) », le nœud voulu par David retrouve un
   programme). Niveaux des notions-mères : + « 1re techno » sobre. Alternative : tout [T]
   tant qu'aucune fiche STD2A n'est prévue. (reco : oui, couvrir — l'arbre est central et
   ces familles servent aussi en enrichissement.)
4. **X4 — Validation d'ensemble** : application au JSON + diagramme — 136 notions,
   **523 sous-notions** si X3 est validée (519 sinon).
