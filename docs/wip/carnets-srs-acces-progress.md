# Carnets Python et paquets SRS : quatre règles d'accès — progression

Worktree : `../ubumaths-wt-carnets-acces`. Décisions de David du 2026-10-04.

## Ordre de déploiement (IMPÉRATIF)

1. **PR A** (`fix/carnets-srs-acces`, code seul) mergée **et déployée en prod**.
2. **Ensuite seulement**, PR B (`fix/carnets-srs-acces-rls`, migration), puis `db:migrate`.

Pourquoi : avant la PR A, `ensureProgrammeDeck` créait le paquet Programme
(`is_auto_managed = true`) avec le client de l'ÉLÈVE. La règle 2 de la PR B
l'interdit. Migrer avant le déploiement de la PR A = plus aucun nouveau paquet
Programme, **en silence** (l'erreur est attrapée et seulement journalisée dans
`/api/skill-attempts`, `/api/srs/review/submit`, `recordSeriesReviews`).

## Règles (questions d'accès tranchées par David)

1. Seuls prof et admin rendent un carnet public (`python_notebooks.is_public`).
2. Un paquet assigné ou auto-géré (ou portant `source_deck_id`) n'est créé que
   par le serveur, jamais par un compte connecté (option a).
3. Un élève n'enregistre de checkpoint run que sur un carnet qui lui est ASSIGNÉ.
4. Un élève retiré d'une classe ne lit plus ses carnets — **déjà en prod**
   (`20260912170000`) : test de non-régression seulement.

## PR A — code (fait)

- `src/lib/server/srs/programme-deck.ts` : création du paquet par le client
  service, `owner_id` = `userId` de la session (les trois appelants passent
  `user.id` de `requireAuth` / `safeGetSession`). Lecture inchangée (client
  élève). Échecs journalisés par `logger.error`.
- `findAssignedDeckCopy` (`src/lib/server/srs/deck-copy.ts`) : l'écran
  `dashboard/teacher/srs/decks/[id]/assignments` retrouve la copie par
  `source_deck_id`, plus par le nom.
- Tests : `programme-deck.test.ts` (rouge 7/16 sur l'ancien code), `deck-copy.test.ts`,
  `tests/integration/srs-paquets-crees-par-le-serveur.test.ts`.
- ⚠️ À mesurer en prod (MCP non authentifié le 2026-10-04) : copies
  `is_assigned` sans `source_deck_id` — elles n'apparaîtraient plus à l'écran
  du professeur (rattrapage par nom fait en 20260915360000).

## PR B — migration

(voir section suivante, remplie au fil de l'eau)
