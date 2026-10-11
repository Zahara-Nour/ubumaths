# Arbre des notions et programme de 1re spé : écarts (reprise au modèle ADR 0020)

> Reprise du 2026-10-07 : la section « 1re spé » de `programmes-ecarts.md` (ancien modèle,
> niveaux sur les nœuds) est réécrite ici au gabarit validé — chaque ligne du programme devient
> un **point rattaché à un nœud**, grain au **filtre**. Comparé à `arbre-notions.json`
> version 2026-10-07.5 (136 notions, 495 sous-notions ; cycles 2-4 et 2de appliqués). Ce
> document **remplace** la section 1re spé de l'ancien ; `programmes-ecarts.md` reste la
> référence pour Tle spé, Tle comp. et Expertes en attendant leur reprise.
> **Rien n'est modifié** : ce document propose, David tranche.

## Texte comparé

« Annexe — Programme d'enseignement de spécialité de mathématiques de la classe de première de
la voie générale » (11 p.), **refourni par David le 2026-10-07** : même mouture que la 2de
refournie (vague des nouveaux programmes — partie « Automatismes », mention de l'usage des
outils d'IA dans le travail personnel). Contenu **vérifié identique**, section par section, au
texte déjà sauvegardé (`progs-lycee/premiere-spe.txt`) qui servait de base à l'ancienne
analyse : la présente analyse vaut pour les deux. Structure : Vocabulaire ensembliste et
logique · Algorithmique et programmation (Notion de liste) · Automatismes (Évolutions et
variations, Calcul numérique et algébrique, Fonctions et représentations, Statistiques,
Probabilités) · Algèbre (Suites · Second degré) · Analyse (Dérivation · Variations et courbes ·
Exponentielle · Trigonométrie) · Géométrie (Produit scalaire · Géométrie repérée) ·
Probabilités et statistiques (Conditionnelles et indépendance · Variables aléatoires ·
Expérimentations).

Points saillants de cette mouture (vs le référentiel historique du site) : la **trigonométrie
s'arrête au cercle** (radian, enroulement, cos/sin d'un réel, valeurs remarquables, angles
associés) — ni fonctions cos/sin, ni courbes, ni équations en 1re ; **répétition de n ⩽ 4
épreuves de Bernoulli** (antichambre de la loi binomiale) ; **formule de König-Huygens**
nommée ; dérivabilité de |x| en 0.

## Ce que l'ADR 0020 change pour la 1re spé

1. **Règle des Automatismes** (posée au doc 2de, confirmée par le texte : « les notions qui les
   sous-tendent ont été travaillées dans les classes antérieures ») : chaque ligne devient une
   **référence** `curriculum_point_automatismes(point_id, '1re spé')` vers le point du
   programme qui introduit le contenu — y compris vers un point **de 1re elle-même** quand le
   contenu est neuf (le texte le prévoit : « les nouvelles notions du programme peuvent donner
   lieu également à un travail d'automatisation » — cas du signe d'une expression factorisée du
   second degré). Aucun point nouveau. Le texte ajoute que la liste de 2de « doit être
   entretenue en première » : dupliquer les références de 2de avec le grade 1re, ou coder une
   règle d'héritage — à trancher à la spécification du schéma cible, pas ici.
2. **Le seed 1re spé en prod est DÉJÀ sur ce texte.** Vérifié le 2026-10-07 (prod, lecture
   seule) : 173 points, structure du nouveau programme (Vocabulaire ensembliste et logique ·
   Notion de liste · … · Expérimentations), trigonométrie réduite au cercle conforme, pas de
   thème Automatismes. Contrairement au seed 6e (programme 2020, décision R5), il n'est pas
   périmé ; il servira de matière première au reseed points → nœuds. Détail à retraiter alors :
   il inclut certains approfondissements non obligatoires comme points ordinaires (ex. « Loi
   des sinus »).
3. **Une partie des manques de l'ancienne analyse est déjà comblée** par les lots cycles 2-4
   et 2de : coefficient multiplicateur, évolutions successives et réciproque, boîte à
   moustaches, inversion du conditionnement, combinaison linéaire — tout cela existe et passe
   en [C]. Restent les manques propres à la 1re, concentrés sur la **Dérivation** (l'arbre n'a
   que 7 sous-notions pour l'année la plus riche en familles d'exercices nouvelles).

## Légende

**[C]** nœud existant (la ligne devient un ou des points de 1re spé dessous) · **[P]**
sous-notion à créer (filtre justifié) · **[A]** notion à créer · **[T]** ni nœud ni point.

## Vue d'ensemble

**0 notion** à créer, **~12 sous-notions** (dont 7 en Analyse), 3 requalifications en simples
points, tous les automatismes en références, le reste en points — démonstrations comprises
(kind `demonstration`, comme dans le seed prod).

---

## Vocabulaire ensembliste et logique

- « élément, sous-ensemble, ensemble vide, appartenance, inclusion ; réunion, intersection,
  complémentaire (A̅, E \ A) ; notations des ensembles de nombres et des intervalles ; couple et
  produit cartésien ; Card(A) » — **[C]** `Ensembles > Ensembles de nombres, Opérations sur les
ensembles, Cardinal et produit cartésien`. La 2de pointe déjà ces nœuds : points de 1re
  seulement là où la 1re dépasse la 2de, le reste est entretien.
- « connecteurs et/ou ; contre-exemple » — **[C]** `Logique > Connecteurs et contre-exemples`.
- « formuler une implication, une équivalence, les mobiliser dans un raisonnement simple ;
  réciproque, contraposée » — **[C]** `Logique > Implication et équivalence` (en 2de :
  formulation seulement ; la mobilisation est le point de 1re).
- « employer “condition nécessaire”, “condition suffisante” » — **[P]** `Implication et
équivalence` > **« condition nécessaire, condition suffisante »** (filtre : famille de
  vrai-faux/QCM très typée, reprise telle quelle par la Tle spé — « distinguer condition
  nécessaire et condition suffisante »).
- « identifier le statut des égalités (identité, équation) et celui des lettres (variable,
  inconnue, paramètre) » — **[P]** `Quantificateurs et négation` > **« statut des lettres et
  des égalités »** (filtre : reconnaître identité vs équation et le rôle des lettres est une
  famille d'exercices à part, hors « quantifier » et « nier »).
- « utiliser les quantificateurs (∀ et ∃ non exigibles) ; repérer les quantifications
  implicites » — **[C]** `Quantificateurs et négation > pour tout, il existe` ; les
  quantifications implicites : **simple point** dessous (filtre faible — précédent « séries
  regroupées en classes » du doc 2de).
- « formuler la négation de propositions quantifiées » — **[C]** `> négation d'une proposition`
  (en 2de : sans quantificateurs ; affaire de pointage).
- « produire des raisonnements par disjonction des cas, par l'absurde, par contraposée, en
  découvrir la structure » — **[C]** `Logique > Raisonnements` (les trois sous-notions ; le
  raisonnement par contraposée est produit ici, seulement formulé en 2de).

## Algorithmique et programmation

- « consolidation des notions de variable, d'instruction conditionnelle, de boucle, de
  fonction ; programmation modulaire » — **[T]** entretien des points de 2de
  (`Algorithmique > Variables et instructions, Boucles, Fonctions Python`), rien de neuf.
- « générer une liste (en extension, par ajouts successifs, en compréhension) ; lien avec les
  ensembles et la logique » — **[C]** `Algorithmique > Listes > créer une liste, liste en
compréhension`.
- « manipuler des éléments d'une liste (ajouter, supprimer…) et leurs indices » — **[P]**
  `Listes` > **« éléments et indices »** (filtre : l'accès indexé et la modification sont une
  famille d'exercices Python distincte, entre « créer » et « parcourir » ; la Tle redemande
  exactement cette capacité).
- « parcourir une liste ; itérer sur les éléments » — **[C]** `> parcourir une liste`.

## Automatismes (tous : RÉFÉRENCES de 1re spé — règle ci-dessus)

- **Évolutions et variations** (taux pour valeur finale/initiale, taux en pourcentage, taux
  équivalent à des évolutions successives, taux réciproque) → `Évolutions > variations en
pourcentage` (cycle 4) et `> évolutions successives et réciproque` (2de).
- **Calcul numérique et algébrique** : produit nul → `Équations : produit et quotient > produit
nul` ; signe du premier degré → `Fonctions affines > variations et signe` et `Inégalités >
signe d'une expression` ; signe d'une expression factorisée du second degré → **référence
  interne** au point de 1re (`Second degré > signe`) ; développer/factoriser/réduire →
  `Calcul littéral`.
- **Fonctions et représentations** : f(x) = k, f(x) < k, signe et tableau de variations lus
  graphiquement → `Généralités sur les fonctions > résolution graphique, signe, variations` ;
  tracer/lire une droite, coefficient directeur par deux points → `Fonctions affines` et
  `Géométrie repérée > équations de droites`.
- **Statistiques** : lecture de graphiques (histogramme, barres, circulaire, boîte…) et
  passage graphique ↔ données → `Représenter des données` (et `Indicateurs > boîte à
moustaches`) ; calculer et interpréter des indicateurs → `Indicateurs`.
- **Probabilités** : conditionnelles sur tableau croisé ou arbre pondéré, distinguer P(A ∩ B),
  P_A(B), P_B(A) → `Probabilités conditionnelles > tableaux croisés, arbres pondérés,
inversion du conditionnement` (points de 2de).

**[C]**/références partout — aucun point ni nœud nouveau.

## Algèbre

- Suites — modes de génération (explicite, récurrence, algorithme, motifs), notations,
  registres, calcul de termes, Syracuse et Fibonacci — **[C]** `Généralités sur les suites >
explicite ou par récurrence, calculer un terme, deviner le terme général, représentation
graphique` (motif géométrique, question de dénombrement → « deviner le terme général »).
- Suites arithmétiques (terme général, lien affines, 1 + 2 + … + n) et géométriques (terme
  général, lien exponentielle, 1 + q + … + qⁿ), avec les trois démonstrations — **[C]**
  `Suites arithmétiques` et `Suites géométriques > reconnaître, raison, terme général,
calculer un terme, somme des termes`.
- « sens de variation d'une suite » — **[C]** `Généralités sur les suites > sens de variation`.
- « introduction intuitive de la notion de limite ; conjecturer la limite » — **[C]**
  `Limites de suites > définition` (seul pointeur de 1re sur la notion).
- Modélisation (croissance linéaire/exponentielle, capital, population, radioactivité),
  algorithmes de seuil, de termes et de sommes, remboursement d'un emprunt — **[C]**
  `Suites et modélisation > placements, pourcentages, seuil, algorithmes`.
- Algorithme « calcul de factorielle » — **[T]** simple exemple (la notion vit en Tle,
  `Arrangements et permutations > factorielle`).
- Second degré : forme factorisée (racines, signe, somme et produit), forme canonique
  (complétion du carré), discriminant, factorisation, résolution (+ démonstration), signe,
  fonctions s'annulant en deux réels, stratégies de factorisation, choix de la forme adaptée —
  **[C]** `Second degré > racines, signe, formes, somme et produit des racines` +
  `Équations : second degré > discriminant` + `Inéquations : second degré` (optimisation,
  variations → voir Analyse).

## Analyse

- « taux de variation ; sécantes » + algorithme « liste des coefficients directeurs des
  sécantes » — **[P]** `Dérivation` > **« taux de variation »** (filtre : la famille d'entrée
  dans la dérivation — taux, pentes de sécantes, vitesse moyenne — vit AVANT le nombre dérivé
  et s'exerce à part).
- « nombre dérivé, limite du taux de variation, notation f′(a) ; interpréter en contexte
  (pente, vitesse instantanée, coût marginal) ; lecture graphique » — **[C]**
  `Dérivation > nombre dérivé`.
- « tangente, pente, équation y = f(a) + f′(a)(x − a) ; construire ; déterminer l'équation »
  (+ démonstration) — **[C]** `> tangente`.
- « approximation linéaire ; approximation de f(a + h) ; calculer une valeur approchée » —
  **[P]** `Dérivation` > **« approximation affine »** (filtre : famille numérique à part, qui
  prépare la méthode d'Euler de Tle).
- « fonction dérivable, fonction dérivée ; dérivées de carré, cube, inverse, racine carrée ;
  xⁿ pour n ∈ ℤ » (+ démonstrations carré, inverse) — **[C]** `> fonctions dérivées`.
- « opérations : somme, produit, inverse, quotient » (+ démonstration du produit) — **[P]**
  `Dérivation` > **« opérations sur les dérivées »** (filtre : LA famille technique du calcul
  de dérivées, distincte des formules de référence — « fonctions composées », déjà à part pour
  la Tle, suit le même modèle).
- « fonction valeur absolue : dérivabilité en 0 » + démonstration « racine carrée non dérivable
  en 0 » — **[P]** `Dérivation` > **« dérivabilité en un point »** (filtre : famille théorique
  typée — étude locale, taux de variation en un point problématique).
- « fonctions paires, impaires : représentation algébrique et graphique, traduction
  géométrique » — **[P]** `Généralités sur les fonctions` > **« parité »** (filtre :
  reconnaître algébriquement, exploiter la symétrie d'une courbe — famille présente de la 1re
  à la Tle ; `Fonctions trigonométriques > parité et périodicité` garde le versant trigo).
  Niveau indicatif de la notion → **« 5e à 1re »**.
- « sens de variation et signe de la dérivée ; fonctions constantes ; extrémum et tangente ;
  étudier les variations, les extremums » — **[C]** `Dérivation > variations, étude de
fonction`.
- « résoudre un problème d'optimisation » — **[C]** `> optimisation`.
- « exploiter les variations pour établir une inégalité ; position relative de deux courbes » —
  **[P]** `Dérivation` > **« position relative de deux courbes »** (filtre : étude du signe de
  f − g, famille classique de la 1re à la Tle, distincte de l'étude d'une seule fonction).
- « second degré en lien avec la dérivation : variations, extrémum, allure » — **[C]**
  `Second degré > variations, parabole`.
- Exponentielle : définition f′ = f et f(0) = 1, propriétés algébriques (+ nombre e,
  notation eˣ), signe/variations/courbe, dérivée de e^(at), représenter e^(kt) et e^(−kt),
  modélisation et lien suites géométriques — **[C]** `Fonction exponentielle > propriétés
algébriques, dérivée, variations, courbe, suites et modélisation` (les approfondissements —
  unicité, exp(x + y), positivité — enrichissent les mêmes nœuds, non obligatoires).
- Trigonométrie : cercle, longueur d'arc, radian, enroulement, placer un point — **[C]**
  `Fonctions trigonométriques > cercle et radians` ; cos/sin d'un réel, lien triangle
  rectangle, valeurs remarquables (+ démonstration cos π/4, sin π/4, cos π/3, sin π/3) —
  **[C]** `> cosinus et sinus d'un réel`.
- « déterminer les cosinus et sinus d'angles associés à x » — **[P]** `Fonctions
trigonométriques` > **« angles associés »** (filtre : le drill de lecture du cercle —
  cos(−x), cos(π − x)… — famille très identifiée, réactivée en Tle avec les fonctions).

## Géométrie

- Produit scalaire : projection orthogonale et formule au cosinus, caractérisation de
  l'orthogonalité, choix de méthode — **[C]** `Produit scalaire > calculer un produit
scalaire` ; bilinéarité, symétrie, expression en base orthonormée, norme, critère
  d'orthogonalité, coordonnées par produits scalaires — **[C]** `> propriétés, calculer un
produit scalaire` ; ‖u ± v‖², formule d'Al-Kashi (+ démonstration), angles et longueurs —
  **[C]** `> angles et longueurs` ; transformation de MA·MB, cercle de diamètre AB
  (+ démonstration) — **[C]** `> lieux de points`.
- Géométrie repérée : vecteur normal, (a, b) normal à ax + by + c = 0, équation cartésienne
  par point et vecteur normal — **[C]** `Géométrie repérée > vecteur normal et équation de
droite` ; projeté orthogonal d'un point sur une droite — **[C]** `> projeté orthogonal` ;
  équation de cercle, reconnaître, centre et rayon — **[C]** `> équation de cercle`.
- « utiliser un repère pour étudier une configuration » — **[T]** transversal.

## Probabilités et statistiques

- « indépendance de deux évènements ; utiliser, justifier » — **[C]** `Probabilités
conditionnelles > indépendance`.
- « partition de l'univers (systèmes complets) ; formule des probabilités totales » — **[P]**
  `Probabilités conditionnelles` > **« probabilités totales »** (filtre : les arbres à deux
  niveaux « totales puis renversement » sont LA famille centrale de 1re-Tle ; le doc 2de
  notait explicitement « pas un attendu de 2de » — c'est ici qu'elle naît).
- « succession de deux épreuves indépendantes (arbre, tableau) ; pour n ⩽ 4, répétition de
  n épreuves de Bernoulli indépendantes et identiques » — **[P]** `Probabilités
conditionnelles` > **« épreuves indépendantes successives »** (filtre : arbres d'épreuves
  répétées, antichambre directe du schéma de Bernoulli ; `Loi binomiale > schéma de Bernoulli`
  (Tle) garde la formalisation).
- Variables aléatoires : définition comme fonction sur l'univers, notations {X = a}, P(X ⩽ a),
  loi, modéliser, déterminer la loi — **[C]** `Variables aléatoires > loi d'une variable
aléatoire, compléter une loi` ; espérance, variance, écart type, calculer, algorithme —
  **[C]** `> espérance, variance et écart-type` ; jeu équitable, mise — **[C]**
  `> jeux et gains`.
- « linéarité de l'espérance » et « formule de König-Huygens » — **simples points** sous
  `espérance` et `variance et écart-type` (reco : filtre faible — ces résultats se travaillent
  dans les fiches d'espérance/variance, pas en familles à part ; même précédent que les séries
  regroupées en classes).
- Expérimentations : simuler une variable aléatoire, fonction Python « moyenne d'un échantillon
  de taille n », distance moyenne-espérance, N échantillons et proportion des écarts ⩽ 2σ/√n —
  **[C]** `Échantillonnage > simulation, fluctuation` (contenu neuf de 1re sur des nœuds nés en
  2de → niveau indicatif de la notion : **« 2de, 1re »**).

## [T] et Histoire des mathématiques

Les rubriques « Histoire des mathématiques » (Fibonacci, Al-Khwârizmî, Leibniz et Newton,
Bayes et Moivre…) : enrichissements non exigibles — ni nœuds ni points. Les approfondissements
sans nœud de 1re : tour de Hanoï, sommes des n premiers carrés/cubes, factorisation de xⁿ − 1
(degré 3 → le nœud existe en Expertes, `Équations polynomiales > degré 3 et factorisation`),
méthode de Newton, méthode d'Euler et (1 + 1/n)ⁿ, approximation de π par Archimède,
Monte-Carlo, marches aléatoires, loi des sinus, concourance des hauteurs et des médianes,
points équidistants, intersections cercle/parabole-droite, fréquence des lettres d'un texte,
E((X − x)²) — exemples et ouvertures, pas de points obligatoires.

## Sens inverse : nœuds marqués 1re sans pointeur de 1re spé

- `Fonctions trigonométriques > équations, inéquations, parité et périodicité, dérivées et
variations` : la 1re s'arrête au cercle et à cos/sin d'un réel. Ces sous-notions doivent se
  retrouver dans la Tle spé 2026 — **à vérifier à sa reprise** (sinon elles deviennent des
  nœuds sans pointeur, ce que l'ADR 0020 permet, mais il faut le savoir).
- `Fonction exponentielle > équations et inéquations` : non nommées en 1re (la monotonie
  stricte les ouvre en Tle) — pointage Tle attendu.
- `Suites > Limites de suites` : seule « définition » est pointée en 1re (approche intuitive,
  toute formalisation exclue) ; opérations, formes indéterminées, comparaison, convergence
  monotone… = Tle.
- `Dérivation > fonctions composées` : Tle — cohérent, aucun pointeur de 1re.
- `Évolutions` (« 4e à 1re ») : la 1re n'y introduit rien (automatismes = références,
  modélisation = Suites) → niveau indicatif à ramener à **« 4e à 2de »**.
- `Probabilités conditionnelles > problèmes en contexte`, `Échantillonnage > estimation d'une
proportion` : pointage libre, nœuds conservés.

## Questions pour David

> **TOUTES TRANCHÉES le 2026-10-07** : « je valide tout » (U1-U5, quantifications implicites,
> linéarité de l'espérance et König-Huygens = simples points). Appliqué à l'arbre : version
> 2026-10-07.6 — 136 notions, 507 sous-notions.

1. **U1 — Logique et vocabulaire** : « condition nécessaire, condition suffisante »
   (Implication et équivalence) ; « statut des lettres et des égalités » (Quantificateurs et
   négation) ; les quantifications implicites restent de simples points. (reco : oui, oui,
   points.)
2. **U2 — Listes** : « éléments et indices » (Algorithmique > Listes). (reco : oui.)
3. **U3 — Analyse, le gros morceau** : « parité » (Généralités sur les fonctions, niveau
   → « 5e à 1re ») ; « taux de variation », « approximation affine », « opérations sur les
   dérivées », « dérivabilité en un point », « position relative de deux courbes »
   (Dérivation, qui passe de 7 à 12 sous-notions) ; « angles associés » (Fonctions
   trigonométriques). (reco : oui partout.)
4. **U4 — Probabilités** : « probabilités totales » et « épreuves indépendantes successives »
   (Probabilités conditionnelles) ; linéarité de l'espérance et König-Huygens = simples points
   sous espérance / variance et écart-type. (reco : oui, oui, points.)
5. **U5 — Validation d'ensemble** : niveaux indicatifs — `Généralités sur les fonctions`
   → « 5e à 1re », `Échantillonnage` → « 2de, 1re », `Évolutions` → « 4e à 2de » (correction en
   sens inverse) ; puis application au JSON + diagramme (136 notions, 507 sous-notions si tout
   est validé).
