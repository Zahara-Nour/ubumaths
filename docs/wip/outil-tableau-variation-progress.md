---
title: Chantier outil-tableau-variation — outils 63 puis 59
date: 2026-11-28
status: phase 0 du 63 posée, en attente de David
---

# Chantier `outil-tableau-variation`

## Reprendre ici

_Mis à jour le 2026-11-28, avant la première PR._

- **État** : outil 63 (choix + tableau à compléter) reproduit, cause trouvée ; phase 0 posée à
  David · **Prochaine action** : sa réponse, puis tests rouges → correctif → PR · **En attente de
  David** : validation de la phase 0 du 63 · **Pièges en cours** : le défaut ne se voit que si
  `blanks[]` liste aussi les cellules du tableau ET que le tableau porte des variables ·
  **Worktree / branche** : `../ubumaths-wt-outil-tableau-variation`, `feat/outil-tableau-variation`

Lot pris par `pnpm outils lancer` le 2026-11-28 ([outils-lots.md](outils-lots.md)) : 63, puis 59.

## Outil 63 — case choix et tableau à compléter dans la même variation

### Reproduction (2026-11-28)

Le vrai modèle N1 V0 de `idees-1re-variations` (homographique), tableau de signes à `?` remis
dans l'énoncé avant le choix, `blanks` = [numérateur, cellule vide, cellule vide, choix] :
`pnpm question:specs` → « Variation 1, case 3 (bloc choix) : aucune bonne réponse », 9 specs
rouges, tous les tirages de V0 et V1 en échec.

Formes qui **passent** : `blanks` qui omet les cellules du tableau ; tableau sans variables.

### Cause

`choiceCaseErrors` (`src/lib/questions/validators/choice-answer-count.ts`), appelé par
`validateTemplate` avant tout tirage, numérote les cases sur l'énoncé **non résolu**. Un tableau
dont le domaine porte `{{al}}` ne s'y lit pas : il compte pour **une** case au lieu de deux. Le
choix passe du rang 3 au rang 2 et lit la réponse d'une cellule (vide) → « aucune bonne réponse ».
Même fragilité dans l'éditeur (`withBlockCases` de `choice-case-editor.ts`) : `countsLikeResolved`
remplace les variables par `1`, le tableau reste illisible des deux côtés, les comptes
« concordent » à tort.
