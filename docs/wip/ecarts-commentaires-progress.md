---
title: Chantier ecarts-commentaires — commentaires périmés du code
date: 2026-11-28
status: en cours
---

# Chantier `ecarts-commentaires`

Lot `commentaires` de [ecarts-lots.md](ecarts-lots.md) : C21, C22, C23, C24, C25, C27, C28, C30,
C31, C33, C34, C37, C38, C40, C42, C43 (code, une PR) ; C26, C29, C41 (docs, commit direct).
Lot sans décision : aucune question à David.

## Reprendre ici

_Mis à jour le 2026-11-28, ouverture du chantier._

- **État** : les 19 écarts sont corrigés sur la branche, les 17 preuves par commande passent au vert ;
  C26, C29 (doc, preuve à la main) faits dans la même PR (leurs `couvre:` touchent les mêmes docs).
- **Prochaine action** : PR, CI, merge ; puis clore le lot sur `main` (registre barré, `fait (#PR)`,
  journal archivé).
- **En attente de David** : rien.
- **Pièges en cours** : ne changer que des commentaires ; C41 (`openapi/generator.ts`) est du code
  hors `docs/` malgré son étiquette « docs ».
- **Worktree / branche** : `../ubumaths-wt-ecarts-commentaires` · `chore/ecarts-commentaires`.

## Historique

- 2026-11-28 : lot pris, worktree ouvert.
- 2026-11-28 : 19 écarts corrigés. C24 : quatre en-têtes (et non deux) disaient « teaches the
  student » ; les quatre sont corrigés. C41 : `openapi/generator.ts` perd les quatre chemins absents
  et le `POST /api/classes` (seul le GET existe), ainsi que les étiquettes devenues sans route ;
  son en-tête dit que la description est partielle. C26 : `cours-et-chapitres.md` ne couvre plus
  les fiches du cahier ni `api/teacher/chapters/*/worksheets`. C29 : signalements de fiches →
  `fiches-et-pdf.md`, `grades.ts` (niveaux scolaires) → `questions.md`.
