# Arbre des notions et programme de Maths expertes : écarts (reprise ADR 0020)

> Reprise du 2026-10-07 — **le dernier lot** : la section « Expertes » de
> `programmes-ecarts.md` (ancien modèle) est réécrite ici au gabarit validé — chaque ligne
> du programme devient un **point rattaché à un nœud**, grain au **filtre**. Comparé à
> `arbre-notions.json` version 2026-10-07.11 (136 notions, 532 sous-notions). Avec ce
> document, **tous les programmes CP → Terminale, toutes voies, sont au gabarit v2** ;
> l'ancien `programmes-ecarts.md` n'est plus que de l'histoire.
> **Rien n'est modifié** : ce document propose, David tranche.

## Texte comparé

« Annexe — Programme d'enseignement optionnel de mathématiques expertes de terminale
générale », **fourni par David le 2026-10-07** au format BO classique (11 p., logo
Bulletin officiel) — contrairement aux autres programmes, pas de mouture au format
« annexe 2026 » (pas de mention IA) : le texte en vigueur est reconduit. Contenu **vérifié
identique** au texte déjà sauvegardé (`progs-lycee/expertes.txt`), base de l'ancienne
analyse (marqueurs : formule du binôme dans ℂ, Pell-Fermat, les réseaux et l'IA dans
l'histoire des graphes, Ehrenfest, PageRank). Structure minimale : un préambule et trois
thèmes — **Nombres complexes** (points de vue algébrique et géométrique · trigonométrie ·
équations polynomiales · utilisation en géométrie) · **Arithmétique** · **Graphes et
matrices** — en rubriques Contenus / Capacités attendues / Démonstrations / **Problèmes
possibles** (non obligatoires, pistes pour l'épreuve orale). Pas de Vocabulaire, pas
d'Algorithmique, pas d'Automatismes propres.

## Ce que l'ADR 0020 change pour les Expertes

1. **Les quatre branches concernées (`Nombres complexes`, `Arithmétique`, `Matrices`,
   `Graphes`) sont nées de ce programme** (elles reprennent les domaines actuels du site) :
   l'essentiel est [C] d'office. Les manques sont ceux que l'ancienne analyse avait vus —
   aucun lot intermédiaire ne les a comblés, personne d'autre ne touche ces branches.
2. **Le seed prod `T_EXP` est DÉJÀ sur ce texte** (vérifié le 2026-10-07, lecture seule) :
   153 points, les trois thèmes et onze objectifs conformes.
3. **Clin d'œil au Cabinet Noir** : les problèmes de chiffrement (affine, Vigenère, Hill,
   RSA) pointent `Congruences > chiffrement` — le nœud d'adossement de la section
   chiffrement du site (#892-#899).

## Légende

**[C]** nœud existant (la ligne devient un ou des points d'Expertes dessous) · **[P]**
sous-notion à créer (filtre justifié) · **[A]** notion à créer · **[T]** ni nœud ni point.

## Vue d'ensemble

**0 notion** à créer, **~5 sous-notions** (formule du binôme, formules d'addition et de
duplication, petit théorème de Fermat, équations ax ≡ b [n], distribution après n
transitions), 2 requalifications en points, le reste en points.

---

## Nombres complexes

- Point de vue algébrique : ℂ, parties réelle et imaginaire, opérations, calculs — **[C]**
  `Forme algébrique > calculs` ; conjugaison (+ démonstrations conjugué d'un produit, d'un
  inverse, d'une puissance) — **[C]** `> conjugaison` ; inverse d'un complexe non nul —
  **[C]** `> inverse et quotient` ; az = b, équations simples avec z et z̄ — **[C]**
  `> équations`.
- « Formule du binôme dans ℂ » (+ démonstration) — **[P]** `Forme algébrique` >
  **« formule du binôme »** (filtre : développer (a + b)ⁿ, calculer des puissances, lien
  avec les coefficients binomiaux — famille calculatoire propre, croisée avec le
  Dénombrement de Tle).
- Point de vue géométrique : image d'un complexe et du conjugué, affixe d'un point, d'un
  vecteur — **[C]** `Interprétation géométrique > affixes et distances` ; module,
  |z|² = zz̄, module d'un produit, d'un inverse (+ démonstrations) — **[C]** `Module et
argument > module` ; ensemble 𝕌 des complexes de module 1, stabilité — **[C]**
  `Interprétation géométrique > racines de l'unité` (𝕌 y prépare 𝕌ₙ) ; arguments,
  interprétation géométrique — **[C]** `Module et argument > argument` ; forme
  trigonométrique, déterminer module et arguments — **[C]** `Formes trigo. et
exponentielle > forme trigonométrique`.
- « Formules d'addition et de duplication à partir du produit scalaire »
  (+ démonstration d'une formule d'addition) — **[P]** `Formes trigo. et exponentielle` >
  **« formules d'addition et de duplication »** (filtre : cos(a + b), sin(2a)… — LA
  famille de transformation trigonométrique, qui n'existe nulle part ailleurs depuis que
  la 1re spé 2026 s'arrête aux angles associés).
- Exponentielle imaginaire e^(iθ), relation fonctionnelle, forme exponentielle, passer
  d'une forme à l'autre, choisir la forme adaptée — **[C]** `> forme exponentielle` ;
  formules d'Euler, formule de Moivre, transformer des expressions trigonométriques
  (intégration, suites…), puissances — **[C]** `> formules d'Euler, formule de Moivre`.
- Équations polynomiales : second degré à coefficients réels (discriminant négatif) —
  **[C]** `Équations polynomiales > second degré` ; factorisation de zⁿ − aⁿ par z − a,
  P(a) = 0 ⇒ factorisation par z − a (+ démonstrations) ; degré 3 avec une racine connue —
  **[C]** `> degré 3 et factorisation` ; un polynôme de degré n admet au plus n racines
  (+ démonstration) — **[C]** `> racines d'un polynôme`.
- Utilisation en géométrie : module et argument de (c − a)/(b − a) — **[C]**
  `Interprétation géométrique > angles et quotient` ; racines n-ièmes de l'unité, 𝕌ₙ,
  cas n = 2, 3, 4 (+ démonstration de la détermination de 𝕌ₙ), polygones réguliers —
  **[C]** `> racines de l'unité` ; configurations du plan (alignement, orthogonalité,
  longueurs, angles, ensembles de points) — **[C]** `> alignement et orthogonalité,
ensembles de points`.
- Problèmes possibles (zₙ₊₁ = azₙ + b, inégalité triangulaire, Mandelbrot et Julia,
  racines carrées d'un complexe, formules de Viète, radicaux du degré 3, cos(2π/5) et
  pentagone à la règle et au compas, somme des racines n-ièmes, Fourier discrète) —
  **[T]**.

## Arithmétique

- Divisibilité dans ℤ, diviseurs d'un entier, tests de divisibilité — **[C]**
  `Divisibilité > multiples et diviseurs, critères de divisibilité` ; division euclidienne
  d'un élément de ℤ par un élément de ℕ\* — **[C]** `> division euclidienne`.
- Congruences dans ℤ, compatibilité avec les opérations — **[C]** `Congruences >
congruences`.
- « Résoudre une congruence ax ≡ b [n] ; inverse de a modulo n lorsque a et n sont
  premiers entre eux » — **[P]** `Congruences` > **« équations ax ≡ b [n] »** (filtre : la
  famille des équations de congruence et des inverses modulaires — le socle calculatoire
  du RSA).
- « Petit théorème de Fermat » (+ démonstrations en problèmes possibles) — **[P]**
  `Congruences` > **« petit théorème de Fermat »** (filtre : puissances modulo n, tests de
  primalité — famille d'exercices à part entière).
- PGCD, algorithme d'Euclide (+ algorithme, couple de Bézout) — **[C]** `PGCD, Bézout et
Gauss > PGCD` ; « couples d'entiers premiers entre eux » — **[C]** simples **points**
  sous `PGCD` (l'ancienne analyse proposait une sous-notion ; requalifié : « montrer que a
  et b sont premiers entre eux » vit dans les fiches PGCD-Bézout) ; théorèmes de Bézout et
  de Gauss (+ démonstrations PGCD = ax + by et Gauss) — **[C]** `> théorèmes de Bézout et
de Gauss` ; équations diophantiennes simples — **[C]** `> équations diophantiennes`.
- Nombres premiers, étudier la primalité, crible d'Ératosthène — **[C]** `Nombres
premiers > reconnaître un nombre premier` ; « leur ensemble est infini »
  (+ démonstration) — **[C]** simples **points** dessous (requalifié : une connaissance et
  sa démonstration, pas une famille) ; existence et unicité de la décomposition en
  facteurs premiers (+ algorithme) — **[C]** `> décomposition en facteurs premiers`.
- Problèmes de chiffrement (affine, Vigenère, Hill, RSA) — **[C]** `Congruences >
chiffrement` ; autres problèmes possibles (lemme chinois, codes ISBN/RIB/Insee, témoins
  et nombres de Carmichaël, Mersenne et Fermat, codes correcteurs, triplets
  pythagoriciens, sommes de deux carrés, Pell-Fermat, racines rationnelles d'un
  polynôme) — **[T]**.

## Graphes et matrices

- Graphe, sommets, arêtes, graphe complet, sommets adjacents, degré, ordre — **[C]**
  `Vocabulaire des graphes > sommets, arêtes, degré` ; chaîne, longueur, graphe connexe —
  **[C]** `Chaînes et connexité > chaînes et cycles, connexité` ; modéliser une situation
  par un graphe — **[C]** `> modélisation par un graphe` (le graphe orienté arrive avec
  Markov).
- Notion de matrice, carrée/colonne/ligne, opérations, inverse, puissances (exemples
  d'ordre 2 ou 3) — **[C]** `Calcul matriciel > opérations, produit, inverse, puissances
de matrices` ; modéliser par une matrice — **[C]** `Suites et matrices > modélisation` ;
  représentations matricielles (adjacence, transformations du plan, systèmes linéaires,
  suites récurrentes) — **[C]** `Matrice d'adjacence`, `Transformations du plan > matrice
d'une transformation`, `Systèmes linéaires > écriture matricielle, résolution` ;
  Uₙ₊₁ = AUₙ + C, suites récurrentes linéaires — **[C]** `Suites et matrices > suites
couplées` ; nombre de chemins de longueur n par la puissance de la matrice d'adjacence
  (+ démonstration) — **[C]** `Matrice d'adjacence > nombre de chaînes de longueur n`.
- Chaînes de Markov à deux ou trois états : graphe orienté pondéré — **[C]** `Chaînes de
Markov > graphe probabiliste` ; distribution initiale π₀ (matrice ligne), matrice de
  transition — **[C]** `> matrice de transition` ; distributions invariantes — **[C]**
  `> état stable`.
- « Interprétation du coefficient (i, j) de Pⁿ ; distribution après n transitions,
  représentée comme la matrice ligne π₀Pⁿ » (+ démonstration) — **[P]** `Chaînes de
Markov` > **« distribution après n transitions »** (filtre : LA famille calculatoire des
  chaînes de Markov — puissances de P, évolution d'une distribution — distincte de la
  recherche d'état stable).
- Problèmes possibles (graphes eulériens, interpolation polynomiale, marche aléatoire sur
  un graphe, diffusion d'Ehrenfest, proie-prédateur discrétisé, PageRank) — **[T]**.

## Sens inverse : nœuds marqués Expertes sans pointeur d'Expertes

- `Chaînes et connexité > chaînes et cycles` : le « cycle » n'est au programme que via le
  problème possible des graphes eulériens — nœud conservé.
- Rien d'autre : les quatre branches ont été taillées sur ce programme, tout le reste est
  pointé. Les niveaux indicatifs sont déjà bons partout (notions « Expertes »,
  `Divisibilité` « CE1 à Expertes », `Nombres premiers` « 3e, Expertes »).

## Questions pour David

1. **AA1 — Nombres complexes** : « formule du binôme » (Forme algébrique) ; « formules
   d'addition et de duplication » (Formes trigo. et exponentielle). (reco : oui, oui.)
2. **AA2 — Arithmétique** : « petit théorème de Fermat » et « équations ax ≡ b [n] »
   (Congruences) ; les couples premiers entre eux et l'infinité des nombres premiers =
   simples points. (reco : oui, oui, points.)
3. **AA3 — Graphes et validation d'ensemble** : « distribution après n transitions »
   (Chaînes de Markov) ; puis application au JSON + diagramme — 136 notions,
   **537 sous-notions** si tout est validé. **C'est le dernier lot : le tour
   CP → Terminale, toutes voies, sera complet.**
