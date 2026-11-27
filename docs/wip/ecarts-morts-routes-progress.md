---
title: Chantier ecarts-morts-routes — code mort (routes d'API et fonctions sans appelant)
date: 2026-11-28
status: en cours
---

# Chantier `ecarts-morts-routes`

## Reprendre ici

_Mis à jour le 2026-11-28, avant l'ouverture de la PR._

- **État** : les 7 écarts du lot (M23, M24, M25, M26, M42, M43, M45) sont corrigés sur la branche, en une PR · **Prochaine action** : lire les revues `code-reviewer` + `security-auditor` lancées le 2026-11-28 (à relancer si la session a été vidée avant leur retour), corriger, puis pousser, ouvrir la PR, CI, merge ; puis clore le lot (registre barré par la tâche de nuit ou à la main, « fait (#PR) » dans [ecarts-lots.md](ecarts-lots.md), journal archivé) · **En attente de David** : rien (lot sans décision) · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-ecarts-morts-routes`, `chore/ecarts-morts-routes`

## Écarts du lot

M23, M24, M25, M26, M42, M43, M45 (7).

## Ce qui a été fait

- **M23** — le registre disait un seul appelant de `/api/classes` : il y en avait **deux**
  (`ShareNotebookDialog`, page d'une fiche). `/api/teacher/classes` rend la même liste, sous la même
  clé : les deux appelants y passent, la route est retirée, l'entrée OpenAPI renommée (son `post`
  n'existait plus).
- **M24** — vrai : `resolveAssignmentAccess` refait date limite et tentatives sans `validateAttempt`.
  `validateAttempt` et `AttemptValidation` retirés, le départ inchangé. Tests réécrits sur
  `countAttempts` + `getAttemptsRemaining` ; le 403 du départ reste testé
  (`evaluation-notee-serveur`, B7). **Preuve réécrite au registre** : l'ancienne n'était verte
  qu'avec un appelant, une suppression ne pouvait pas la passer.
- **M25** — vrai : 15 routes sans appelant, retirées. Deux tests d'intégration en appelaient
  trois : le refus 409 s'y teste maintenant par les actions de page (`deleteChecklistItem`,
  `unlinkExercise`), celui du document l'était déjà. Trois motifs morts retirés du filtre de
  `nightly-integration.yml`.
- **M26** — vrai, et `reorderChapters` ne servait plus qu'à l'action `reorder`, sans formulaire.
  Retirés : `reorderChapters`, `reorderDocuments`, `reorderExercises`, `getStudentChapters`,
  `getMyChecklistProgress`, `updateChapterDocument` (seuls appelants : les routes de M25), l'action
  `reorder`, les schémas `reorderChaptersSchema`, `updateDocumentSchema`, `linkWorksheetSchema`.
  `linkExerciseSchema` reste : `validateLinkExercise` s'en sert encore.
- **M42** — vrai : sept `notify*` et `cleanupExpiredNotifications` retirées.
- **M43** — vrai : route, `addWarning` (serveur) et `addWarningSchema` retirés. Le RPC SQL
  `add_warning` reste (pas de migration dans ce lot) ; seul un test d'intégration l'appelle encore.
- **M45** — vrai : le garde-fou « une mise à jour par carte et par jour » vit dans
  `srs/best-of-day.ts`. `reviewedToday` et son test retirés.

Vérifié : `check:incremental` 0 erreur ; `types:cliquet` tenu ; tests unitaires touchés verts (112) ;
intégration touchée verte (3 fichiers, 36 tests) ; gardes de doc et filtre d'intégration verts ;
page d'une fiche vue connecté en prof (`pnpm voir`) : `GET /api/teacher/classes` 200, 0 erreur.
Pas vu à l'écran : le dialogue de partage d'un notebook, qui n'appelle la route que si le cache des
classes est vide (même adresse, même clé que la page vue).

## Journal

- 2026-11-28 : lot pris, worktree ouvert ; les 7 écarts vérifiés puis corrigés ; revues
  `code-reviewer` + `security-auditor` (routes d'API retirées).
