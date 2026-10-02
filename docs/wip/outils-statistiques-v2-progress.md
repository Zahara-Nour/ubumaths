# Chantier : outils statistiques v2

Suite du chantier v1 (`outils-statistiques-progress.md`, #595→#612). Démarré le 2026-10-02.

## Existant vérifié dans le code (2026-10-02)

- Hasard reproductible : `src/lib/utils/random.ts` (`createRandomSource(seed)`, mulberry32 ;
  `Math.random` sans graine), utilisé par les générateurs de questions → à réutiliser.
- Listes de l'atelier : nombres seulement (`readListValue`) ; un mot est compté « ignoré ».
- Programmes : simulation en 6e (rang 4, fréquence vs probabilité), 2de `2-179` (loi des grands
  nombres), 1re spé `1SPE-170`→`173` (simuler une VA, N échantillons de taille n, écart à
  l'espérance ≤ 2σ/√n) ; 2de `2-169` (comparer deux séries) ; 2de `2-174`/`2-175` [SF+]
  (filtres ET/OU/NON, tableau croisé depuis le fichier des individus). Boîte à moustaches : absente.
  Loi binomiale : Terminale, absente du dépôt.

## Décisions de David

Manche 1 (2026-10-02) — toutes les recommandations suivies :

67. **Périmètre, dans l'ordre** : (1) simulation ; (2) listes qualitatives dans l'atelier, filtres,
    tableau croisé depuis les individus ; (3) série brute dans les blocs (`données:`) ; (4) comparer
    deux séries. **Pas** de binomiale, **pas** de boîte à moustaches ; catégories numériques sur une
    vraie échelle : plus tard.
68. **Simulation dans l'atelier, sans Python** (Python = v3 de l'atelier) : « Simuler n tirages »
    (liste réutilisable), « Fréquence selon n » (loi des grands nombres), en 1re spé « N échantillons
    de taille n ». Bloc pour les fiches ensuite.
69. **Simulation dans une fiche : figée par une graine** (`graine: 42`), même résultat écran / PDF.
70. **Tirage reproductible** (générateur à graine) : partagé par URL, testable au chiffre près.
71. **Pas de nouvel objet** : une liste accepte aussi des mots et devient qualitative (effectifs,
    barres, tableau croisé ; pas de moyenne).

Manche 2 (2026-10-02), lot 1 « simulation » — toutes les recommandations suivies :

72. **On simule une loi** : deux listes appariées (valeurs, probabilités), comme l'action « Loi »
    de la v1 ; un événement de probabilité p = la loi `1 ; 0` / `p ; 1−p`.
73. **« Simuler n tirages »** → une nouvelle liste des EFFECTIFS observés par valeur (appariée aux
    valeurs), pas la liste brute : tient sous le plafond D8 (200 valeurs) jusqu'à n = 100 000.
    Historique : fréquences observées à côté des probabilités.
74. **« Fréquence selon n »** : courbe de la moyenne des tirages selon n, droite à E(X) ; pour `1 ; 0`
    c'est la fréquence du succès. Vue Données, même composant SVG ; n ≤ 10 000 ; non gardée en liste.
75. **« N échantillons de taille n »** (1SPE-173) : proportion des échantillons avec
    |m − μ| ≤ 2σ/√n, histogramme des N moyennes, μ, σ, 2σ/√n. N ≤ 1 000, n ≤ 1 000,
    N × n ≤ 10⁶. Moyennes non gardées en liste.
76. **Graine** : nouvelle à chaque simulation, affichée (« graine 4821 »), gardée dans l'URL.
77. **Saisie de n** : actions sur la carte de la liste des probabilités avec un petit champ
    (défaut 100), et commande dans la vue Calcul (`simuler(L, M, 1000)`). Bloc des fiches : lot à part.

Manche 3 (2026-10-02), en cours de PR (b) — recommandations suivies :

78. **Plafond de boutons par carte : 10** (Q46 disait 9). Un seul bouton de simulation sur la carte
    des valeurs (« Simuler avec probabilités M », prépare `.simuler L M 100`, convention de l'atelier :
    l'action prépare la saisie) ; `.fréquence` et `.échantillons` restent des commandes, proposées
    par le résultat de `.simuler`. Écart assumé avec Q77 (trois boutons, carte de M).
79. **Garde du catalogue** : un exemple peut déclarer son décor (`exampleSetup`, listes L et M) ; il
    doit alors créer un objet ou afficher une formule.

## Livré

- (a) moteur `src/lib/statistics/simulation.ts` — #652.
- (b) `.simuler` dans l'atelier — #655.
- (c) `.fréquence`, `.échantillons`, graphiques sous la ligne de l'historique — #656.

**Lot 1 (simulation) TERMINÉ.** Suivant (Q67) : lot 2, listes qualitatives dans l'atelier (filtres,
tableau croisé depuis les individus) ; puis bloc de simulation pour les fiches (Q69, graine).

Manche 4 (2026-10-02), PR (c) — recommandations suivies :

80. Graphiques de `.fréquence` / `.échantillons` **sous la ligne de l'historique** (vue Calcul),
    pas dans la vue Données (organisée par liste) — écart à Q74.
81. Courbe de la moyenne selon n : scène commune `moyenne-selon-n`, droite y = E(X) en pointillés,
    ≤ 500 points dessinés.
82. Histogramme des moyennes : classes de largeur (2σ/√n)/2 alignées sur μ, intervalle μ ± 2σ/√n
    en couleur, le reste en gris.
83. `.simuler` se termine par « Pour aller plus loin : .fréquence … · .échantillons … ».

Manche 5 (2026-10-02), lot 2 « listes qualitatives » — recommandations suivies :

84. Une liste est **qualitative** dès qu'une entrée n'est pas un nombre ; toutes ses entrées sont
    alors des modalités (texte).
85. Modalités comparées sans la casse ni les espaces autour, accents comptés ; affichées comme leur
    première occurrence.
86. `fille, garçon` → message « Sépare tes valeurs par des points-virgules », comme pour les nombres.
87. **Le renommage ne réécrit plus le contenu des listes** (constaté : renommer `A` réécrivait la
    liste `A ; B ; A ; O`).
88. Actions d'une liste qualitative : effectifs et fréquences, barres / circulaire ; actions
    numériques visibles mais désactivées avec leur raison ; « Tableau croisé avec M » (même longueur).
89. `.croiser L M [fréquences | lignes | colonnes]` : tableau de la v1 sous la ligne de l'historique.
90. `.filtrer L = fille et M = oui` (effectif, fréquence) ; `.filtrer N si …` crée une liste ;
    `=`, `≠`, `<`, `>`, `≤`, `≥` (et `!=`, `<=`, `>=`), `et`, `ou`, `non`, parenthèses ; même longueur.
91. Au plus 20 modalités distinctes, 40 caractères par modalité ; plafonds D8 inchangés.

PR prévues : (a) listes qualitatives (Q84-Q88, Q91) ; (b) `.croiser` ; (c) `.filtrer`.

92. (2026-10-02) Une entrée qui se lit comme un nombre n'est jamais un mot (`1e3` = 1000, comme en
    v1) ; une liste MÉLANGÉE nomme sa cause dans l'aperçu (« liste qualitative, à cause de « 2x » »).

**Lot 2 (listes qualitatives) TERMINÉ** : (a) listes qualitatives #661 ; Q92 #662 ; (b) `.croiser` #666 ; (c) `.filtrer` #667.
Suivant (Q67) : bloc de simulation pour les fiches (Q69, graine) ; série brute dans les blocs (`données:`) ; comparer deux séries.

93. (2026-10-02) Tableau croisé de l'atelier : jusqu'à **20** modalités par côté (défilant à
    l'écran) ; les blocs imprimés gardent 8 (Q34). `0x10` reste lu 16, comme en v1.
