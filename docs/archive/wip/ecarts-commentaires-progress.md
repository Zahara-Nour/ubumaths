---
title: Chantier ecarts-commentaires — commentaires périmés du code
date: 2026-11-28
status: clos le 2026-11-28 (#3258)
---

# Chantier `ecarts-commentaires`

Lot `commentaires` de [ecarts-lots.md](../../wip/ecarts-lots.md) : C21, C22, C23, C24, C25, C27, C28, C30,
C31, C33, C34, C37, C38, C40, C42, C43 (code, une PR) ; C26, C29, C41 (docs, commit direct).
Lot sans décision : aucune question à David.

## Reprendre ici

_Mis à jour le 2026-11-28, après #3258._

- **État** : lot clos, 19 écarts barrés au registre. Rien à reprendre.

## Historique

- 2026-11-28 : lot pris, worktree ouvert.
- 2026-11-28 : 19 écarts corrigés. C24 : quatre en-têtes (et non deux) disaient « teaches the
  student » ; les quatre sont corrigés. C41 : `openapi/generator.ts` perd les quatre chemins absents
  et le `POST /api/classes` (seul le GET existe), ainsi que les étiquettes devenues sans route ;
  son en-tête dit que la description est partielle. C26 : `cours-et-chapitres.md` ne couvre plus
  les fiches du cahier ni `api/teacher/chapters/*/worksheets`. C29 : signalements de fiches →
  `fiches-et-pdf.md`, `grades.ts` (niveaux scolaires) → `questions.md`.
