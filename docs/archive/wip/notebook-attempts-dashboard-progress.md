# Notebook — affichage tentatives élève sur dashboard Résultats

> Plan validé 2026-06-04, auto-mode.

## Décisions techniques

1. **Compteur hybride** : DB pour stats prof (cross-session), in-memory inchangé pour seuil indice (préserve « gagner l'indice »)
2. **Schéma** : extension de `python_notebook_checkpoint_runs` (option A — pas de nouvelle table)
3. **Champs ajoutés** : `attempt_count INTEGER NOT NULL DEFAULT 1`, `first_attempted_at TIMESTAMPTZ`, `succeeded_at TIMESTAMPTZ`, `hint_revealed BOOLEAN NOT NULL DEFAULT FALSE`
4. **Invariants** :
   - `attempt_count` sticky (jamais décrementé)
   - `succeeded_at` sticky (jamais effacé)
   - `hint_revealed` transition unique false→true
   - `first_attempted_at` set au premier INSERT, jamais modifié ensuite
5. **UPSERT** : SQL `attempt_count = attempt_count + 1`, `succeeded_at = COALESCE(succeeded_at, CASE WHEN status='passed' THEN now() END)`
6. **Dashboard** : N essais + 💡 inline si hint_revealed + tooltip timing + filtre "galéré" (>5 essais) + stats cards (moyenne + %)

## Phases

| Phase                              | Statut   | Fichiers                                                            |
| ---------------------------------- | -------- | ------------------------------------------------------------------- |
| 1 — Migration + types              | ✅       | `supabase/migrations/20260604085002_*.sql`, `database.ts` patch     |
| 2 — API UPSERT incrémental + PATCH | ✅       | `+server.ts` POST (RPC) + nouveau PATCH `/hint-revealed/+server.ts` |
| 3 — Store hint POST                | ✅       | `CheckpointCell.svelte` handleRevealHint (best-effort)              |
| 4 — Dashboard UI                   | ✅       | `results/+page.server.ts` + `+page.svelte` + tests                  |
| 5 — Review + commit + push         | en cours | —                                                                   |

## Code review — fixes appliqués

Le code-reviewer a relevé 2 issues importantes :

1. **Wrong type import path** — `import type { CheckpointDetail } from './+page.server'` croisait la frontière server.ts. Fix : déplacé dans `$lib/types/database-helpers.ts` (composite type, conformément au pattern du projet).
2. **Hint-before-attempt placeholder** — la row `attempt_count = 0` créée par `mark_checkpoint_hint_revealed` avant tout essai était rendue comme « Échec » sur le dashboard. Fix : helper `isPlaceholder(detail)` → render `CircleDashed` + label « Indice révélé sans essai ».

Non-actionables (polish reportable) :

- Backfill `first_attempted_at = ran_at` pour les rows existantes : V2 optionnel
- Newlines dans `title=` attribute : Chrome rend, Safari pas. V2 custom tooltip.
- Helper `roundTo1` : 2-line refactor mineur, skip

## Quality checks finaux

- `pnpm check:incremental` : 1651 fichiers, 9 ERRORS / 46 WARNINGS — **baseline maintenue**
- Tests : 9/9 server (`page.server.test.ts`) + 20/20 client (`CheckpointCell.svelte.test.ts`)
- `svelte-autofixer` : warning `goto()` sans `resolve()` (pattern projet) + `hintRevealed` dans `$effect` (reset logic intentionnel)

## TODOs côté utilisateur après merge

1. `pnpm db:migrate` — applique la migration sur prod Supabase
2. `pnpm db:types` — regen `database.ts` (mon patch manuel sera identique)
