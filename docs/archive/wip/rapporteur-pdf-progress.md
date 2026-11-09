---
status: clos
---

# Chantier `rapporteur-pdf` — rapporteur posé dans l'énoncé PDF

## Reprendre ici

_Mis à jour le 2026-11-09, après #2504 : chantier clos, journal archivé._

- **État** : clos, #2504 mergée. Le durable est dans [questions.md](../../systeme/questions.md) (rapporteur
  posé) et [geometrie/README.md](../../systeme/geometrie/README.md) (option `overlay`) · **Prochaine
  action** : aucune · **En attente de David** : rien.

---

## Origine

[outils-manquants.md](../../wip/outils-manquants.md) § 1 n° 23 : `posedProtractorOf` n'était appelé que par
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
