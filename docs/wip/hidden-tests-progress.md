# Tests cachés (`hidden`) — progression

Ajout d'un champ `hidden?: boolean` sur les test cases (output + unit_test) pour empêcher l'élève de hardcoder les valeurs attendues. Niveau honneur (cosmétique côté UI, mais redaction réelle dans le worker pour limiter les fuites par DevTools).

Plan : `~/.claude/plans/shimmying-cooking-hamster.md`.

## Phase 1 — Types + Zod ✅

**Fichiers modifiés :**

- `src/lib/types/python-exercises.ts` — ajout `hidden?: boolean` sur `OutputTestCase`, `UnitTestCase`, `TestCaseResult`.
- `src/lib/shared/python/types.ts` — pareil (copie worker).
- `src/lib/server/validation/python-exercises.ts` — champ Zod `hidden` (default false) + `.refine()` "au moins un visible" sur les 3 schémas (output, unit_test, ast.output_tests). `testCaseResultSchema` accueille `hidden`.
- `src/lib/shared/python/worker/messages.ts` — pareil côté worker.

**Décisions :**

- Le `.refine()` sur `output_tests` (AST) tolère un array vide (la stratégie ast peut n'avoir aucun output_test). Si non vide, au moins un visible.
- Pas de modification du barrel `index.ts` : les nouveaux champs optionnels se propagent automatiquement via les exports existants.

## Phase 2 — Worker redaction ⏳

## Phase 3 — UI auteur ⏳

## Phase 4 — UI résultat ⏳

## Phase 5 — Quality checks ⏳
