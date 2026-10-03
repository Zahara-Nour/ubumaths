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

## PR (c) — `série:` (Q106)
