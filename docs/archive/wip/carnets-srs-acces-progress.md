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

Complément d'audit (PR A) : `filterGalleryTemplates`
(`src/lib/server/notebook-template-gallery.ts`). La galerie des templates du prof ne montre un
template partagé que si son auteur est prof ou admin.

## PR B — migration `20261004213000_carnets_srs_acces` (fait, non poussée)

Branche `fix/carnets-srs-acces-rls`, créée depuis la PR A (à rebaser sur `main` après son
merge).

- Règle 1 étendue à `is_template` (audit des carnets).
- Règle 2 : INSERT et UPDATE refusent `is_assigned`, `is_auto_managed` et `source_deck_id`
  pour tout compte connecté.
- Règle 3 : INSERT et UPDATE des checkpoint runs exigent prof/admin ou un carnet assigné.
  Constat : la sous-requête `pn.is_public` de l'ancienne policy était évaluée sous la RLS de
  l'élève, donc la seule brèche réelle était son PROPRE carnet public.
- Défense en profondeur : l'UPDATE de `python_notebook_assignments` reçoit le contrôle de
  l'INSERT. Aucun chemin applicatif ne modifie une assignation.
- Constat, non corrigé : `assign/+server.ts` marque le deck source `is_assigned` avec le client
  du prof. C'était déjà refusé avant (policy UPDATE à USING seul), et l'erreur est ignorée.
- `tests/integration/chapter-decks.test.ts` adapté : il exigeait que la forge élève réussisse.
  La copie sans assignation est désormais posée hors RLS, et le refus de la forge est asserté.

Preuves : sans la migration, 13 refus échouent et 12 témoins passent ; avec, 25/25. La suite
complète passe (167 fichiers, 2423 tests), `test:definer-guard` aussi (6/6).
