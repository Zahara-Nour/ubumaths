# Output validation V2 — progression

Refonte de la stratégie `output` : remplacement du booléen `ignore_whitespace` par une comparaison expressive (`exact` / `text` / `numeric`) avec tolérance numérique.

Plan : `~/.claude/plans/shimmying-cooking-hamster.md`.

## Phase 1 — Types + Zod ✅

**Fichiers modifiés :**

- `src/lib/types/python-exercises.ts` — ajout de `OutputComparison` (union), `comparison` requis sur `OutputValidationConfig`, `comparison?` sur `OutputTestCase`, `output_comparison?` sur `ASTValidationConfig`, `diff?: string` sur `TestCaseResult`.
- `src/lib/server/validation/python-exercises.ts` — schemas Zod alignés (discriminated union avec borne `epsilon ∈ [0, 1]`).
- `src/lib/shared/python/worker/messages.ts` — schemas Zod worker alignés (mêmes contraintes que serveur).
- `src/lib/shared/python/types.ts` — copie des types pour le worker (alignée).
- `src/lib/shared/python/index.ts` — barrel re-export des nouveaux types et schemas.

**Décisions :**

- `comparison` est REQUIS sur `OutputValidationConfig` (pas de défaut implicite). Force l'auteur à exprimer son intention.
- Les bornes `eps ∈ [0, 1]` sont défensives : un epsilon > 1 n'a aucun sens pédagogique.
- Surcharge par test case (`OutputTestCase.comparison`) permise à l'API mais pas exposée par l'éditeur en V1.
- Champ `diff?: string` sur `TestCaseResult` pour feedback élève détaillé.

**État du repo après cette phase :**

- Le code TypeScript ne tient pas : `pyodide.worker.ts`, `ExerciseStrategyEditor.svelte`, `new/+page.svelte`, et les tests Pyodide-réel référencent encore `ignore_whitespace`. Ces erreurs sont réparées en Phases 3, 4, 5.
- Les quality checks sont reportés à la Phase 7 (conformément au plan).

## Phase 2 — Moteur JS pur (TDD) ⏳

À venir : `src/lib/shared/python/validation/output-compare.ts` + tests Vitest.

## Phase 3 — Intégration worker ⏳

## Phase 4 — UI auteur (UX β) ⏳

## Phase 5 — UI résultat (diff) ⏳

## Phase 6 — Migration seeds ⏳

## Phase 7 — Quality checks ⏳
