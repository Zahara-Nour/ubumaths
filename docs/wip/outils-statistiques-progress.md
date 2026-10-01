# Chantier : outils statistiques (blocs ubumark + atelier)

Worktree `../ubumaths-wt-stats`, branche `feat/outils-statistiques`. Démarré le 2026-10-01.

## État : phase 0 — tours 1-2 tranchés, spécification TDD du lot 1 soumise (aucun code écrit)

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

## Questions ouvertes

- Spécification TDD du lot 1 (ci-dessous) : en attente de validation.
- `.linreg` = 3ᵉ implémentation (ajustement recalculé, `web-repl-engine.ts` ~l.1780) : le
  rebrancher sur `fitAffine` au lot 1 ? (reco : oui)
