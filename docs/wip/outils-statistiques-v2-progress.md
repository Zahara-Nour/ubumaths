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

Manche 6 (2026-10-02), lot 3 « simulation dans les fiches » — recommandations suivies :

94. Bloc ```simulation : les deux lignes du bloc `loi` (`X = …`, `P = …`, mêmes messages) + options.
95. `mode:` `tirages` (défaut : tableau valeur / effectif / fréquence observée / probabilité),
    `moyenne` (courbe selon n + droite E(X)), `échantillons` (histogramme, μ ± 2σ/√n, phrase).
96. `graine:` facultative, valeur fixe par défaut ; écrite sous la figure (« graine 42 »).
97. `tirages:` ; `échantillons:` + `taille:` ; plafonds d'une fiche : 10 000 tirages,
    N × n ≤ 100 000 ; au-delà, message d'auteur.
98. Variables `{{p}}` résolues avant, comme les autres blocs ; même graine pour toutes les instances.
99. Pas de masquage dans ce lot.

PR prévues lot 3 : (a) bloc + mode `tirages` ; (b) modes `moyenne` et `échantillons`.

- **(a) livrée #671** (2026-10-02) : `simulation` dans `STAT_CHART_KINDS`, `SimulationData`,
  `SimulationScene` (effectifs par `simulateCounts` + `createRandomSource(graine)`), Typst, tableau
  accessible. Défauts : 100 tirages, graine 1. Revue : arrondi au millième en millièmes ENTIERS
  (`toFixed` donnait 0,037 pour 3/80) ; « option inconnue » ne liste que les options du bloc.
  Fiche FR/EN compilée avec `compile-prod.mjs`. Détail : `bloc-simulation-progress.md`.
- Suivant : (b) modes `moyenne` et `échantillons` (Q95, Q97 : N × n ≤ 100 000).
- **(b) livrée #674** (2026-10-02) : modes `moyenne` (scène `moyenne-selon-n`) et `échantillons`
  (`échantillons:` + `taille:`, N × n ≤ 100 000 ; classes hors μ ± 2σ/√n grises aussi en Typst ;
  phrase « k échantillons sur N… » ; graine sous la figure ; textes anglais). Vu sur la fiche
  compilée : bornes de classes au millième (illisibles, atelier compris). Cas frère de #671 :
  `.simuler` et les moyennes arrondissaient mal un demi. Détail : `simulation-modes-progress.md`.

**Lot 3 (simulation dans les fiches) TERMINÉ** (#671, #674).
Suivant (Q67) : série brute dans les blocs (`données:`) ; puis comparer deux séries.

Manche 7 (2026-10-03), lot 4 « série brute dans les blocs » — recommandations suivies :

100. `données:` dans les quatre blocs dessinés (barres, circulaire, histogramme, polygone) : le bloc
     dépouille ; options, indicateurs et PDF inchangés. Pas le tableau croisé, la loi, la simulation.
101. `données: 12 ; 15 ; 8` (virgule décimale) ; plusieurs lignes `données:` mises bout à bout ;
     au plus 500 valeurs ; des mots pour barres / circulaire (série qualitative).
102. `données:` et lignes « catégorie = effectif » dans un même bloc : refusé, message situé.
103. Nombres dans l'ordre croissant ; mots dans l'ordre de première apparition (comparés comme Q85) ;
     plafonds 30 barres / 12 secteurs rappelés si trop de valeurs distinctes.
104. Histogramme : `classes: 0 ; 5 ; 10 ; 15 ; 20` (bornes → [0 ; 5[ …) ; valeur hors classes
     refusée et nommée ; pas de dernière classe fermée.
105. Indicateurs calculés sur la série brute (exacts, même pour l'histogramme) ; conventions v1.
106. `série: affichée` / `série: triée` écrit la liste sous le titre.
107. Bloc ```effectifs (tableau de dépouillement) : PAS dans ce lot, candidat après « comparer ».
108. Variables `{{…}}` résolues avant, comme Q98 ; pas de générateur de séries.

PR prévues : (a) barres / circulaire (Q100-Q103, Q105) ; (b) histogramme / polygone + `classes:`
(Q104) ; (c) `série:` (Q106).

- **Lot 4 (a) livrée #682** (2026-10-03) : `données:` dans barres / circulaire. Lecture des nombres
  PARTAGÉE avec l'atelier (`statistics/read-value.ts`, Q92). Détail : `blocs-donnees-progress.md`.
  Suivant : (b) histogramme / polygone + `classes:` (Q104) ; (c) `série:` (Q106).

109. (2026-10-03) Série brute en classes : la **classe médiane** est celle qui CONTIENT la médiane
     exacte (sinon « Médiane = 5 » à côté de « Classe médiane : [0 ; 5[ ») ; sans série brute,
     règle des 50 % inchangée.

- **Lot 4 (b) livrée #685** (2026-10-03) : `classes:` + `données:` dans histogramme / polygone ;
  moyenne et médiane exactes ; Q109. Suivant : (c) `série:` (Q106).

- **Lot 4 (c) livrée #688** (2026-10-03) : `série: affichée | triée | seule`.
  **Lot 4 (série brute dans les blocs) TERMINÉ** (#682, #685, #688).
  En attente : Q110 (étiquettes numériques des barres selon la langue : « 9,5 » / « -3 » dans un
  document anglais, hérité de la PR a). Suivant (Q67) : comparer deux séries.

110. (2026-10-03) Catégories numériques et classes **affichées selon la langue**, dans tous les
     blocs (écran et PDF) : séparateur décimal, vrai signe moins — comme le tableau d'une loi.
     Les données internes (et donc les indicateurs) ne changent pas.

Manche 8 (2026-10-03), lot 5 « comparer deux séries » (2de `2-169`) — recommandations suivies :

111. Atelier d'abord (`.comparer L M`), blocs ensuite (représentations graphiques données).
112. `.comparer` : tableau d'indicateurs, une colonne par série — effectif ; moyenne, écart type ;
     médiane, Q1, Q3, écart interquartile ; min, max, étendue. AUCUNE phrase de conclusion.
113. Deux listes numériques de longueurs quelconques ; qualitative refusée avec sa raison ; commande
     - action « Comparer avec M » sur la carte.
114. Pas de graphique dans l'atelier.
115. Blocs barres / histogramme : `données Garçons: …` et `données Filles: …` ; barres groupées par
     valeur ; deux histogrammes mêmes classes, même échelle, l'un au-dessus de l'autre ; exactement 2.
116. Fréquences (%) par défaut si effectifs différents, sinon effectifs ; `afficher:` force.
117. Deux couleurs, la seconde hachurée (daltonisme, noir et blanc) ; légende des noms.
118. `indicateurs:` → tableau sous la figure, une colonne par série ; `série:` une ligne par série.

PR prévues : (a) `.comparer` + action ; (b) barres à deux séries + tableau d'indicateurs ;
(c) deux histogrammes.

119. (2026-10-03) Plafond de boutons par carte : **11** (« Comparer avec M »).

- **Lot 5 (a) livrée #698** (2026-10-03) : `.comparer L M` + action « Comparer avec M ».
  Suivant : (b) barres à deux séries + tableau d'indicateurs ; (c) deux histogrammes.

- **Lot 5 (b) livrée #702** (2026-10-03) : barres à deux séries (`données Nom:`), seconde hachurée,
  tableau d'indicateurs. Connu : en-têtes / titres d'axe en français dans un document anglais
  (comme tous les indicateurs). Suivant : (c) deux histogrammes.
