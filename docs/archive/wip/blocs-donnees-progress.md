# `données:` dans les blocs (v2, lot 4) — progression

Décisions Q100-Q108 (`outils-statistiques-v2-progress.md`). Spec PR (a) validée le 2026-10-03.

## PR (a) — barres et circulaire

- [x] `données:` (plusieurs lignes bout à bout, ≤ 500 valeurs) → dépouillement dans le parseur
      (`tallyRawData`) : nombres croissants, mots par première occurrence (Q85)
- [x] Erreurs : mélange avec « catégorie = effectif », 500 valeurs, 30 barres / 12 secteurs,
      valeur vide, ligne vide, virgules en séparateur, modalité > 40 caractères
- [x] Refusé dans tableau croisé / loi / simulation ; « arrive bientôt » pour histogramme / polygone
- [x] Tests : `raw-data.test.ts` (17), navigateur (1) ; fiche compilée (`compile-prod.mjs`),
      effectifs et indicateurs recalculés à la main
- [x] Empreinte du parseur avant / après : 1 642 textes (970 contenus prod + .md du dépôt)
      IDENTIQUES — ⚠️ un seul bloc statistique dans ce corpus : la preuve de non-régression des
      blocs sans `données:` est la suite stat-chart (265 tests existants, verts)
- [x] Revue : lecture des nombres PARTAGÉE avec l’atelier (`statistics/read-value.ts`, Q92 : `+3`, `1e3`, fractions = nombres) ; noms récrits (`0012` → 12, `-0` → 0) ; virgules refusées aussi pour mots+nombres et fractions ; `12,5, 13` corrigé en `12,5 ; 13` ; modalité gardée telle quelle (−, NFC) ; tests aux bornes exactes
- [ ] PR, CI, merge

## PR (b) — histogramme / polygone, `classes:` (Q104)

Spec validée le 2026-10-03 : moyenne / médiane EXACTES ; la lecture graphique du polygone reste
une lecture ; pas d'autres indicateurs ouverts.

- [x] `classes: 0 ; 5 ; 10` → mêmes classes que les lignes `[a ; b[` (`parseClass`) ;
      `tallyIntoClasses` range, refuse et nomme une valeur hors classes ou non numérique
- [x] `spec.rawValues` → `classIndicators` prend moyenne / médiane sur la série brute
- [x] Erreurs : bornes non croissantes, < 2 bornes, > 20 classes, une option sans l'autre, mélange
- [x] Tests `raw-data-classes.test.ts` (16), preuve rouge des indicateurs exacts ; fiche compilée
      vérifiée à la main (2/3/3/2, moyenne 9,65, médiane 9,5, lecture Me = 10)
- [x] Revue : Q109 tranchée par David (classe médiane = celle qui contient la médiane exacte, si série brute) ; borne suggérée arrondie (0,4, pas 0,39999999999999997) ; décimales et grandeur vérifiées sur la borne écrite ; tests bornes décimales / négatives
- [ ] PR, CI, merge

## PR (c) — `série:` (Q106)

Spec validée le 2026-10-03 : `affichée` / `triée` / `seule` (l'énoncé, sans figure ni indicateurs).

- [x] `spec.series` (parseur) → `scene.series` / `scene.seriesOnly` posés par `buildStatChartScene`
      pour tous les genres ; écran (`.stat-serie`) et Typst (`#block`) affichent le même texte
- [x] Erreurs : sans `données:`, valeur inconnue, `triée` sur des mots ; message « ne s'applique
      pas » écrit avec l'orthographe de l'auteur (`série`, `étiquettes`)
- [x] Tests `raw-data-series.test.ts` (12) + navigateur (2) ; fiche énoncé / corrigé FR + EN compilée
- ⚠️ Vu sur le corrigé anglais : les étiquettes des barres venues de `données:` restent « 9,5 » et
  « -3 » (hérité de la PR a, nom canonique) → à proposer à David (affichage selon la langue)
- [x] Revue : règle CSS `.stat-legende-aire` cassée par l’insertion de `.stat-serie` (légende du carreau à gauche) — corrigée + test navigateur (preuve rouge) ; espace insécable avant « ; » ; tests tri stable, refus croisé / simulation, titre unique
- [ ] PR, CI, merge
