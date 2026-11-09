# Chantier `rapporteur-pdf` — rapporteur posé dans l'énoncé PDF

## Reprendre ici

_Mis à jour le 2026-11-09, PR ouverte._

- **État** : PR ouverte (branche `fix/rapporteur-pose-pdf`) · **Prochaine action** : CI verte → merge,
  ligne 23 d'[outils-manquants.md](outils-manquants.md) versée en « livré » · **En attente de David** :
  rien · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-rapporteur-pdf`,
  `fix/rapporteur-pose-pdf`.

---

## Origine

[outils-manquants.md](outils-manquants.md) § 1 n° 23 : `posedProtractorOf` n'était appelé que par
`FigureACompleterView.svelte` ; une question `verifier: mesure AOB, rapporteur posé` imprimée n'avait
pas de rapporteur.

## Fait

- `ubumark/generators/protractor-typst.ts` : le dessin de `Protractor.svelte` en lignes cetz, en
  unités du repère (corps, graduations extérieures et intérieures, mire, séparation, signature).
- `figure-typst.ts` : même pose que l'écran (`posedProtractorOf`, `allNamedPointPositions`,
  `figureShapes`).
- `exportToTypst` : option `overlay` (lignes après tout). Première version SOUS les objets : le côté
  [OB) cachait le nombre 50, celui à lire ; d'où le rapporteur au-dessus, translucide, comme l'écran.
- Preuve : PDF compilé par `scripts/fiches/compile-prod.mjs` (typst.ts 0.6.1-rc5), AOB et BOA, relu à
  l'œil ; tests `figure-rapporteur-pose-typst.test.ts` vérifiés rouges sans le branchement.
