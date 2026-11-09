# Chantier `coupures-pdf` — quelles coupures de colonne et de page on autorise dans les PDF

## Reprendre ici

_Mis à jour le 2026-11-09, ouverture du chantier._

- **État** : principe des trois niveaux validé par David (§ 1) ; garde-fou « trou trop grand » à étudier en profondeur (§ 2).
- **Prochaine action** : étude typst (§ 3) — distinguer fin de colonne / fin de page, mesurer la place restante, convergence de la mise en page ; puis comportements de phase 0 à valider.
- **En attente de David** : rien pour l'instant.
- **Pièges en cours** : `sticky` de typst ne distingue pas colonne et page ; typst.ts 0.6.1-rc5 = Typst 0.13.1 (CLI local = 0.14, pas témoin : `scripts/fiches/compile-prod.mjs`).
- **Worktree / branche** : `../ubumaths-wt-coupures-pdf` · `feat/coupures-pdf`.

---

## Origine

Fiche `eval-premiere` (`f337aa82-…`, 1re spé, second degré) : l'exercice 2 (« Le massif de fleurs »)
part en colonne 2, un trou d'un cinquième de colonne reste en bas de la colonne 1, et la fin de
l'exercice 3 déborde sur une page 2. Cause : chaîne de règles « titre collé au paragraphe »
(`render-exercise.ts`) + « paragraphe collé au dessin » (`typst-generator.ts`, `keepsWithNext`,
décision du 2026-10-26) → un bloc insécable « titre + 5 lignes + dessin » d'une demi-colonne.

## 1. Décision de David (2026-11-09) : trois niveaux

But : **éviter les trous, sans gêner la lecture outre mesure**. Une coupure de colonne laisse les
deux morceaux sur la même feuille ; une coupure de page oblige à tourner la feuille.

| Niveau                                 | Coupures                                                                                                                 | Règles actuelles                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Toujours interdite                     | titre d'exercice seul en bas ; numéro de question seul ; cadre de réponse seul en haut ; dessin ou tableau coupé en deux | A (`render-exercise.ts:195, 265`), C (`ubu-item`, `tete:`), D (`fiches-et-pdf.md` § cadres) |
| Interdite en fin de **page** seulement | paragraphe d'introduction séparé du bloc qui le suit (dessin, formule, tableau, liste)                                   | B (`keepsWithNext`)                                                                         |
| Permise                                | entre deux questions, dans un énoncé long, entre énoncé et 1)                                                            | —                                                                                           |

## 2. Garde-fou : à étudier en profondeur (David, 2026-11-09)

Idée : couper quand même quand garder ensemble laisserait un trou de plus d'une fraction de
colonne (un tiers ?). Plus souple, moins prévisible, plus dur en typst. À étudier avant toute
décision : faisabilité, convergence, cas réels mesurés sur les fiches en base.

## 3. Étude typst

_(à remplir)_
