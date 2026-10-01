# Chantier : outils statistiques (blocs ubumark + atelier)

Worktree `../ubumaths-wt-stats`, branche `feat/outils-statistiques`. Démarré le 2026-10-01.

## État : lots 1-3 livrés (#595, #598, #600) ; lot 4 (tableau croisé) — spécification soumise

## Existant vérifié dans le code (2026-10-01)

- `src/lib/atelier/stats.ts` : `describeList` (variance de POPULATION, ÷ n) et `fitAffine`.
- ⚠️ **Deux implémentations** du même calcul : `.stats` du moteur
  (`web-repl-engine.ts` ~l.1605) recalcule moyenne / médiane / variance à la main.
  L'exigence « une seule source » impose de le brancher sur le futur module.
- ⚠️ **Doc périmée, pas le code** : le moteur divise bien par `n` (l.1615-1630),
  mais le 2ᵉ paragraphe de la JSDoc de `describeList` et
  `docs/wip/atelier-vue-donnees-progress.md` (§ « Le diviseur », l.16-30)
  affirment encore qu'il rend l'estimateur `n − 1` (« 9 contre 6 »). À corriger.
- Patron `courbe` présent : `types/courbe.ts`, `parser/courbe-parser.ts`,
  `utils/courbe-scene.ts`, `generators/courbe-typst.ts`, `nodes/Courbe.svelte`,
  aiguillage `markdown-parser.ts` l.1494-1519 (`variation`, `probtree`, `courbe`).
- Pas de `src/lib/statistics/`.
- Programmes : 2de §6.1 (`2-156`…`2-169`), §6.2 tableau croisé (`2-170`…`2-175`),
  `2-176` loi des grands nombres ; 1re spé `1SPE-157`…`1SPE-173` (loi, espérance,
  variance, écart type, échantillons) ; 6e rang 3 : barres + circulaire.
- ⚠️ **Boîte à moustaches** : aucune occurrence dans `docs/wip/referentiel/`.
  **Loi binomiale** : absente du programme de 1re spé du dépôt (Terminale).
- ⚠️ **Conflit de vocabulaire** : « Série » est déjà un terme du glossaire
  (composition de questions, `series`). « Série à effectifs » / « série
  statistique » demande un arbitrage avant de nommer quoi que ce soit.

## Décisions de David

Tour 1 (2026-10-01) — toutes les recommandations suivies :

1. **Vocabulaire** : « Série statistique » (toujours avec l'adjectif), distincte de « Série »
   (questions). Code : `Dataset` (valeurs brutes), `FrequencyTable` (valeurs + effectifs) ;
   jamais `series` pour des données.
2. **Lots, dans l'ordre** : (1) module `src/lib/statistics/` + rebrancher `describeList` et
   `.stats` + corriger la doc périmée ; (2) blocs barres + circulaire ; (3) histogramme +
   polygone des fréquences cumulées ; (4) tableau croisé (totaux, fréquences conditionnelles et
   marginales) ; (5) atelier ; (6) variable aléatoire finie (loi, E, V, σ), **sans binomiale**.
   **Boîte à moustaches hors périmètre.**
3. **Quartiles / déciles** : définition du programme de 2de (Q1 = plus petite valeur telle
   qu'au moins 25 % des données lui soient ≤ ; Q3 à 75 %, D1/D9 idem), étendue aux séries à
   effectifs par les fréquences cumulées. Médiane usuelle, jamais appelée « Q2 ». L'UI et la
   doc disent « définition du programme » (≠ calculatrices TI/Casio).
4. **Un bloc par diagramme**, noms français, grammaire des lignes de données partagée.
5. **Atelier : pas de nouvel objet** — deux listes appariées (valeurs + effectifs), comme
   `scatter:M` ; classes = bornes (n+1) + effectifs (n), reportables après le lot 5.
6. **Diagrammes de l'atelier dans la vue Données**, même composant SVG que le bloc ; le
   grapheur garde nuage et ajustement.
7. **Pas de simulation** dans ce chantier.

Tour 2 (2026-10-01) — toutes les recommandations suivies :

8. **Syntaxe** : `clé:` = option, `donnée = effectif` = donnée, `;` séparateur, `{{a}}` résolues
   avant ; une option l'emporte sur une catégorie homonyme (documenté). Blocs `barres`,
   `circulaire` (`étiquettes:` pourcentages | effectifs | angles | aucune), `histogramme`
   (`[a ; b[ = n`, aire ∝ effectif, `légende: 1 carreau = 2 élèves`), `frequences-cumulees`
   (`sens:`, `lecture: médiane`), `tableau-croise` (`lignes:`, `colonnes:`, `?` = case vide,
   `totaux:`, `afficher:`).
9. **Virgule décimale acceptée** (`12,5` et `12.5`) : la virgule n'y est jamais séparatrice
   (règle `;` de #520). Contexte vérifié : `parseCustom` lit `3,14` décimal (hors matrices) ;
   bloc `figure` REFUSE la virgule (88e7ba2ae) ; `variation` = séparateur. Affichage selon la
   langue du document (#448). `45,120` → erreur « effectif non entier ».
10. **Effectifs entiers ≥ 0 OU pourcentages**, jamais mélangés (erreur d'auteur). Série brute
    (`données:`) plus tard.
11. **`indicateurs:`** en option, au lot 3.
12. **Lot 1** : quartiles/déciles/EIQ (brut + effectifs), effectifs/fréquences/cumulées
    (croissantes, décroissantes), classes (moyenne aux centres, classe médiane, médiane par
    interpolation), rebrancher `describeList` + `.stats`, corriger la doc `n − 1`.
13. **Arrondis d'affichage** : entier exact ; sinon ≈ à 2 décimales ; % à 1 décimale ; angles au
    degré ; `arrondi: N` ; calcul interne jamais arrondi.

Tour 3 (2026-10-01) — recommandations suivies, spécification TDD du lot 1 validée :

14. **`.linreg` rebranché sur `fitAffine`** au lot 1 ; son erreur « X et Y de longueurs
    différentes » reste au niveau de la commande, avant l'appel ; sortie inchangée.
15. **Sortie de `.stats` inchangée au lot 1** (seule la source du calcul change) ; passage en
    français + quartiles au lot 5. Raison : `.stats`/`.ajustement` sont exposées DANS l'atelier
    (`OFF_REGISTRY`, `commands.ts:249`).
16. **Objectif écrit** dans `atelier-progress.md` : l'atelier a vocation à remplacer le REPL web
    (`/cas`) et garde `WebReplEngine` comme calculateur. Une note, pas d'ADR.

## Lot 1 — spécification TDD validée

Module `src/lib/statistics/`, pur. Entrée invalide → `{ ok: false, message }` (français, jamais
d'exception) ; série vide → `null`. ⚠️ **Aucun import `$lib`** dans ce module : `mathAST` n'en
fait jamais (`pnpm math` = `tsx`, sans alias) et le moteur l'importe en relatif.

- **A. Série brute** : rang de Q_p = ⌈n·p/100⌉ (entiers). `3;7;8;5;12;14;21;13;18` → médiane 12,
  Q1 7, Q3 14, EIQ 7 (≠ TI : 6 et 16). `1..8` → méd. 4,5, Q1 2, Q3 6. `1..30` → D1 3, D9 27.
  Ordre indifférent. Une valeur → tout = elle, EIQ/variance/étendue 0. Valeurs égales → EIQ 0.
  Vide → `null`. `NaN`/`Infinity` → erreur qui nomme la valeur.
- **B. Effectifs** : `0..4` / `5;8;4;2;1` → moyenne 1,3, variance 1,21, σ 1,1, médiane 1, Q1 0,
  Q3 2 ; fréquences `.25 .4 .2 .1 .05` ; cumulées croissantes `.25 .65 .85 .95 1` (effectifs
  `5 13 17 19 20`) ; décroissantes `1 .75 .35 .15 .05`. Dépliée = mêmes indicateurs. Effectif 0
  gardé dans le tableau, sans effet. Pourcentages = effectifs proportionnels. Erreurs :
  effectif < 0 ou non fini (situé), total nul, longueurs différentes. Lignes triées par valeur.
- **C. Classes** : `[0;10[ 12, [10;20[ 18, [20;40[ 10` → moyenne aux centres 15,75, classe
  médiane `[10;20[`, médiane estimée 130/9 ; 50 % pile en fin de classe (`20, 20`) → classe
  `[0;10[`, estimation 10 ; densité = effectif / amplitude exposée. Erreurs : borne gauche ≥
  droite (situé), classes non contiguës / chevauchantes (nomme les deux).
- **D. Non-régression** : tests existants de `describeList` verts sans modification ; `.stats` et
  `.linreg` même sortie, calcul délégué au module (test qui l'espionne) ; `STATISTICS_LIMITS`
  10 000 valeurs (`.stats`/`.linreg` gardent 1 000) ; doc `n − 1` corrigée.
- **Ajout constaté en préparant les tests** : `fitAffine([0.1;0.1;0.1], …)` passe le garde
  « abscisses identiques » (moyenne 0,10000000000000002 → variance ≈ 6e-34 ≠ 0) et rendrait une
  pente absurde. Garde réécrit en égalité des valeurs ; même chose pour la variance d'une série
  constante (0 exact).

## Lot 1 — fait

- `src/lib/statistics/` : `describe.ts` (`describeList`, `summarizeList`, `summarizeTable`),
  `fit.ts` (`fitAffine`), `classes.ts` (`summarizeClasses`), `outcome.ts`, `limits.ts`.
- Déplacés depuis `atelier/stats.ts` (git mv) ; importeurs mis à jour : `DataView.svelte`,
  `desk.svelte.ts`. Moteur : import relatif `../../../statistics/…`.
- Preuves : 40 tests rouges contre des stubs aux bonnes signatures (ancien calcul gardé),
  puis verts ; sortie `.stats`/`.linreg` comparée à `statistics-commands.golden.json` capturé
  AVANT (seul écart : `.stats 0.1, 0.1, 0.1` → écart type `0` au lieu de `1.38778e-17`) ;
  espions `vi.mock` prouvant la délégation. Atelier : 433 tests serveur + 198 client verts.
  `check:incremental` 0 erreur ; `lint:fast` propre.
- Défauts trouvés en route : `fitAffine` laissait passer des abscisses constantes décimales
  (pente absurde) et rendait R² = 0 pour des ordonnées constantes décimales → gardes par
  égalité des valeurs. `Infinity` désormais refusé par `.stats` (affichait `Infinity`).
- ⚠️ Test d'ordre de saisie : positions exactes, moyenne/variance à 1e-10 (sommes dans
  l'ordre de saisie, voulu pour le bit-à-bit avec l'ancien `.stats`).
- `svelte-autofixer` : non lancé (outil MCP absent de la session) ; seul changement `.svelte` =
  un chemin d'import dans `DataView.svelte`.

- Revue `code-reviewer` : 0 bloquant, 4 à corriger + 4 mineurs, tous traités : règle de cumul
  unique (`cumulative.ts`, la classe médiane se décalait sur des pourcentages décimaux),
  tolérance enfin testée (3 tests rouges en la neutralisant), `fitAffine` refuse le non-fini,
  `.stats`/`.linreg` refusent `Infinity`, poids nuls sautés dans moyenne/variance, lignes de
  même valeur fusionnées, atelier : échec ≠ absence (`summarizeList` + message).
- Constaté : une liste de l'atelier écarte déjà les valeurs non finies à la saisie
  (`2 ; 1/0` → `[2]`, « 1 valeur ignorée ») et la saisie plafonne à 10 000 caractères : le
  dépassement de `STATISTICS_LIMITS` n'est pas atteignable depuis l'atelier aujourd'hui.

## Lot 2 — barres + circulaire

Worktree `../ubumaths-wt-stats-lot2`, branche `feat/stats-barres-circulaire`.

Tour 4 (2026-10-01) — recommandations suivies :

17. **Un nœud interne `stat-chart`** avec `kind` (`barres` | `circulaire`, puis histogramme…) :
    les 7 points de câblage (markdown-parser, union AST, MarkdownRenderer, ListNode,
    typst-generator, markdown-import, index) une seule fois.
18. **Circulaire** : légende à côté (contenu selon `étiquettes:`, défaut pourcentages), premier
    secteur à midi, sens horaire, ordre de l'auteur.
19. **Barres** : `valeurs: oui` affiche les effectifs au-dessus, désactivé par défaut.
20. Catégories numériques = catégories (équidistantes, ordre écrit) en v1.
21. Couleurs : barres une couleur (`couleur:`, mots de `courbe`, bleu par défaut) ; circulaire
    palette automatique fixe (7 couleurs), 12 secteurs au plus.
22. Circulaire en % : erreur d'auteur si |somme − 100| > 0,5 ; barres : aucun contrôle.

### Spécification TDD validée

- **Parseur** — nominal : ordre écrit, `{{n}}` avant, `12,5`/`12.5`, options `titre:`
  `axes:` `description:` `taille:` `valeurs:` `couleur:` `étiquettes:`, option > catégorie
  homonyme. Limites : % décimal, effectif nul (barre vide / secteur absent), noms avec
  `# $ * " \` sans casser SVG ni PDF, ≤ 30 catégories (barres) / 12 (circulaire), nom ≤ 40
  caractères. Erreurs situées : clé inconnue, ligne sans `=`, effectif non entier (`45,12`),
  négatif, mélange effectifs / %, catégorie en double, aucune donnée, circulaire de total nul,
  circulaire % ≠ 100 ± 0,5.
- **Scène** (pure, SVG + Typst) : axe vertical depuis 0, pas auto (fonction de `courbe`), titre
  d'axe par défaut « Effectif » / « Fréquence (%) » ; circulaire Σ angles = 360°, départ midi
  horaire, angles légende au degré ; nombres selon la langue du document ; description auto
  qui énumère les données ; fréquences via `src/lib/statistics/`.
- **Écran** : SVG `role="img"`, `<title>`, `<desc>` ; erreurs prof / « Figure indisponible »
  élève ; budget document (20 figures) ; bloc en retrait de liste ; aller-retour éditeur riche ;
  `accessibility-tester`.
- **PDF** : même scène (même nombre de barres / secteurs) ; fiche FR + EN, énoncé + corrigé,
  noms hostiles + bloc en erreur → `compile-prod.mjs` (typst.ts 0.6.1-rc5) 4/4, page relue.

### Lot 2 — fait

- `ubumark/types/stat-chart.ts`, `parser/stat-chart-parser.ts`, `utils/stat-chart-scene.ts`,
  `generators/stat-chart-typst.ts`, `components/markdown/nodes/StatChart.svelte` ;
  `statistics/describe.ts` gagne `categoryFrequencies`.
- Câblage : markdown-parser (blocs repérés dans `lines` ET `originalLines`, masqués pour les
  blocs de code, langages `barres`/`circulaire` dans les items de liste), union AST, index,
  MarkdownRenderer, ListNode, typst-generator, markdown-import (bloc de code `barres` /
  `circulaire`, texte source gardé même en erreur).
- Preuves : tests rouges contre des stubs (65 puis 7 + 14), puis verts ; ubumark + rich-text +
  statistics 3667 tests verts, composants markdown 85 ; `check:incremental` 0 ; `lint:fast` propre.
- **PDF** : fiche de 2 exercices (noms hostiles `# $ * " \`, bloc en erreur, blocs en liste,
  `étiquettes: angles`, `%`) passée par `rendu-fiche.ts` puis `compile-prod.mjs` (typst.ts
  0.6.1-rc5) : 4/4 OK ; comptes `// barre` 5, `// secteur` 5, « Figure indisponible » 1 par
  énoncé (doublés dans le corrigé). Page relue : deux défauts vus et corrigés (rayon blanc d'un
  disque entier ; titre d'axe qui chevauchait un nom incliné → place calculée d'après le nom le
  plus long).
- Secteurs = polygones de la scène (pas `arc` de cetz) : même dessin écran / PDF.
- `svelte-autofixer` : outil MCP absent de la session, non lancé.

- Revues : `code-reviewer` (0 bloquant ; effectifs gradués en entiers, piste « Vélo = 3 »,
  repli « Figure indisponible » si la scène lève dans le PDF, constantes partagées) et
  `accessibility-tester` (texte rogné, contrastes erreurs / grille / orange, largeur minimale
  300 px, titre lu une fois : `<title>` = genre, titre auteur en `<figcaption>`).

Tour 5 (2026-10-01) — recommandations suivies :

23. **Repères numérotés** dans chaque secteur (dehors avec un trait sous 20°) et dans la
    légende, écran et PDF ; jamais deux couleurs identiques côte à côte (dernier / premier
    compris) ; 12 secteurs au plus maintenus.
24. **Description accessible = ce que la légende affiche** (étiquettes: aucune → catégories
    seules) ; barres : effectifs gardés (lisibles sur l'axe).
25. **Défauts hérités de `courbe`** (aussi `figure`, `stat-chart`) → PR séparée après ce lot :
    bloc non fermé dans un item de liste rendu en texte brut ; bloc non fermé suivi plus loin
    d'un ``` nu qui avale le texte intermédiaire.

## Questions ouvertes

(aucune)

## Lot 3 — histogramme, fréquences cumulées, `indicateurs:`

Worktree `../ubumaths-wt-stats-lot3`, branche `feat/stats-histogramme`.

Tour 6 (2026-10-01) — recommandations suivies :

26. **Histogramme** : amplitudes égales → axe « Effectif » gradué ; inégales → quadrillage +
    légende d'aire « 1 carreau = 2 élèves » (`légende:` fixe valeur et mot ; sinon automatique,
    plus haut rectangle ≈ 10 carreaux, légende « 1 carreau = N ») ; largeur d'un carreau = plus
    grand pas simple divisant toutes les amplitudes.
27. **Polygone** : `croissantes` → points aux bornes droites depuis (première borne ; 0 %) ;
    `décroissantes` → bornes gauches jusqu'à (dernière borne ; 0 %) ; axe en % de 0 à 100 par
    10 ; `lecture: médiane` (pointillés à 50 %, « Me ≈ 14,4 ») | `quartiles` (Q1, Me, Q3
    estimés par interpolation) | `aucune` (défaut).
28. **`indicateurs:`** — classes : effectif total, moyenne (centres), classe médiane, médiane
    estimée ; barres à catégories toutes numériques : effectif, moyenne, médiane, Q1, Q3, EIQ,
    étendue, écart type. Ligne sous la figure (écran + PDF), arrondis Q13. Circulaire ou barres
    non numériques → erreur d'auteur.
29. **Classes** : `[a ; b[` seulement (espaces facultatifs), sinon erreur avec exemple ;
    contiguës ; ≤ 20 classes.
30. **Lecteur d'écran, amplitudes inégales** : dimensions en carreaux + légende, pas les
    effectifs (sauf `valeurs: oui`) ; amplitudes égales : effectifs.

Constaté : dans les items de liste, le langage d'un bloc de code est lu par `(\w*)`
(`markdown-parser.ts:1494`) — `frequences-cumulees` (tiret) n'y serait pas reconnu → `[\w-]*`.

### Lot 3 — fait

- `statistics/classes.ts` : `estimateClassQuantile` (interpolation, borne droite exacte quand
  le cumul tombe pile), `decreasingCumulativeFrequency`. ⚠️ Spécification : la formule de Q1
  était écrite « 10/30 × 10 », la bonne est 10/12 × 10 (même valeur 8,33) — test sur la bonne.
- Parseur réécrit : classes `[a ; b[`, options `légende:` `sens:` `lecture:` `indicateurs:`
  réservées par bloc, contiguïté via `summarizeClasses` (une seule règle).
- Scène : `HistogramScene` (mode `axe` / `carreaux`, carreau = PGCD des amplitudes, valeur
  automatique 1/2/2,5/5 × 10^k), `CumulativeScene` (lectures via `estimateClassQuantile`),
  ligne `indicators` sur toutes les scènes (non répétée dans `<desc>`).
- `markdown-parser.ts` : langage d'un bloc de code en liste `[\w-]*` (avant : `\w*`).
- Preuves : 53 tests rouges contre stubs, puis verts ; 4 682 tests serveur + 235 client verts ;
  `check:incremental` 0 ; eslint sans erreur sur les fichiers modifiés.
- PDF (compile-prod, typst.ts 0.6.1-rc5) : fiche FR/EN énoncé/corrigé (amplitudes égales et
  inégales, bornes négatives et décimales, `légende:` hostile `"x" \b`, polygones croissant
  et décroissant en liste, lectures, indicateurs barres et classes, bloc en erreur) : 4/4 OK,
  comptes 9 rectangles / 2 polygones / 4 lectures / 3 indicateurs / 1 erreur, pages relues.
  Défaut vu et corrigé : étiquettes de lecture sur le polygone → déplacées au début du
  pointillé, côté libre (écran et PDF).
- Revue `code-reviewer` : **bloquant** — quadrillage sans plafond (amplitudes 1 et 10^9 →
  10^9 lignes, processus tué ; 6 Mo de Typst pour des cas banals) → module partagé
  `utils/stat-chart-carreaux.ts` (parseur refuse au-delà de 60 carreaux en largeur ou en
  hauteur, scène dessine), bornes à 4 décimales au plus ; PGCD nul → page entière cassée à
  l'écran → `try/catch` dans le composant (bloc en erreur, page intacte) ; % des séries en
  classes contrôlés (100 ± 0,5) ; médiane et quartiles estimés par UNE interpolation.
- Audit `accessibility-tester` : effectifs au-dessus des rectangles (contraste, rectangle
  nul), bordure couleur du fond, quadrillage à 50 % DEVANT les rectangles en mode carreaux,
  halo des étiquettes de lecture, pointillé 1,5 px, indicateurs en `<ul>` (« · » non lu),
  « Médiane » en toutes lettres dans `<desc>`. Légende d'aire gardée dans `<desc>` (Q30).

## Lot 4 — tableau croisé

Worktree `../ubumaths-wt-stats-lot4`, branche `feat/stats-tableau-croise`.

Tour 7 (2026-10-01) — recommandations suivies :

31. **Même nœud `stat-chart`**, genre `tableau-croise` (câblage du lot 2 réutilisé, compte
    dans le budget de figures) ; rendu `<table>` à l'écran, `table()` Typst.
32. **Le prof écrit toutes les valeurs** et cache avec `masquer: Fille/Demi-pensionnaire ;
Garçon/Total ; Total/Externe` : totaux toujours calculés ; case masquée vide, annoncée
    « case à compléter ». `?` reste un raccourci « inconnue ET cachée » : les totaux qui en
    dépendent sont cachés aussi. (Précision de la syntaxe Q8, accordée.)
33. **Fréquences en %, une décimale** ; `fréquences par ligne` : chaque ligne (et la colonne
    Total) fait 100 % ; `par colonne` : l'inverse.
34. Coin vide par défaut, `coin: Sexe \ Régime` ; `titre:` au-dessus et en `<caption>` ;
    ≤ 8 lignes × 8 colonnes ; effectifs entiers ou %, sans mélange.

## Reste à faire (hors lots 2-4)

- PR « blocs non fermés » (Q25) pour `courbe`, `figure`, `stat-chart`.
- Limite connue : des repères extérieurs de petits secteurs consécutifs peuvent se toucher.
- `--font-scale` non appliqué au texte des SVG (la légende HTML le suit).
