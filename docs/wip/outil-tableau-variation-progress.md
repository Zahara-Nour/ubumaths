---
title: Chantier outil-tableau-variation — outils 63 puis 59
date: 2026-11-28
status: outil 63 en PR
---

# Chantier `outil-tableau-variation`

## Reprendre ici

_Mis à jour le 2026-11-28, revue du 63 appliquée, PR en cours d'ouverture._

- **État** : outil 63 codé, revue appliquée, PR ouverte sur `feat/outil-tableau-variation` ·
  **Prochaine action** : merge de la PR du 63 (`pnpm pr:merger`), puis outil 59 (phase 0) ·
  **En attente de David** : rien · **Pièges en cours** : le défaut ne se voit que si `blanks[]`
  liste aussi les cellules du tableau ET que les signes portent des variables (`?{{if:…}}` ; un
  domaine `{{al}}` seul se lit) ; `work-figure-editor.ts:36` même décalage possible (non vérifié) ·
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

### Phase 0 (validée par David le 2026-11-28, « oui »)

- Nominal : numérateur + tableau de signes à `?` à variables + choix, `blanks` complet : le modèle
  s'enregistre et se tire ; « décroissante » juste, « croissante » faux.
- Limite : tableau à variables → les cases choix ne sont plus contrôlées à l'enregistrement, mais
  à chaque tirage (énoncé résolu) ; une réponse « 5 » pour deux choix reste refusée.
- Erreur : un choix sans bonne réponse garde « aucune bonne réponse », au bon numéro de case.
- Éditeur : pas de réalignement des cases avec un tel tableau.

### Correctif

`variationCasesUnresolved` (`assign-blank-indices.ts`) : un tableau à compléter qui porte `{{`
ou `<<expr:`. `choiceCaseErrors` saute alors le contrôle statique ; `countsLikeResolved`
(`choice-case-editor.ts`) rend `false`. Tests : `generation-tableau-signes.test.ts` (4, rouges
avant). Vrai modèle N1 V0/V1 (tableau remis dans l'énoncé, copie du script dans le scratchpad) :
`question:specs` 22/22, 500 tirages sur 500. Doc : `docs/systeme/questions.md`.

### Revue appliquée (2026-11-28)

- `choice-answer-count.ts` : avec un tableau à variables, seule la lecture de la bonne réponse
  est sautée ; un bloc choix mal écrit reste signalé, « Variation 1, case choix : … » (sans
  numéro, le rang n'est pas sûr).
- `figure-name-check.ts` : même garde, seules les cases d'avant le premier tableau sont lues
  (une case texte après le tableau était lue comme case maths).
- Tests : `generation-tableau-signes.test.ts` (bloc mal écrit) et `capital-pairs.test.ts`
  (nom de figure), tous deux rouges sans le correctif. Constat : un tableau dont seul le
  domaine porte `{{al}}` se lit sur l'énoncé brut ; ce sont les signes `?{{if:…}}` qui le
  rendent illisible.
