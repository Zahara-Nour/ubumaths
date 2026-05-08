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

## Phase 2 — Moteur JS pur (TDD) ✅

**Fichiers créés :**

- `src/lib/shared/python/validation/output-compare.ts` (~270 LOC) — `compareOutputs(expected, actual, cmp): { passed, diff? }`. Pas de dépendance Pyodide.
- `src/lib/shared/python/validation/output-compare.test.ts` (~370 LOC, **50 tests** verts) — couvre les comportements B1–B20 + 3 cas Python-réels.

**Décisions :**

- Comparaison faite intégralement en JS (pas de round-trip Python).
- `numericEqual` gère NaN, Inf±, -0 explicitement.
- Diff localisé en français : token + valeurs + écart calculé + tolérance.
- Tokenisation `flat` : `\s+`. `lines` : ligne par ligne, vides ignorées. `grid` : lignes × tokens, dimensions vérifiées.
- `non_numeric: 'ignore'` filtre les tokens non-numériques des deux côtés (mode `flat` typique).
- `accept_comma_decimal` : `1,41` parsé comme `1.41`.
- Helpers `formatNumber` / `quote` pour limiter la verbosité du diff (3 sig fig pour les très petits/gros nombres, troncature à 50 chars pour les strings).

## Phase 3 — Intégration worker ✅

**Fichiers modifiés :**

- `src/lib/workers/pyodide.worker.ts` :
  - Import de `compareOutputs` depuis le moteur V2.
  - `validateOutputComparison` (lignes ~2137-2229) : remplace `expected === actual` (avec `ignore_whitespace`) par `compareOutputs(expected, actualOutput, cmp)`. Applique la surcharge `testCase.comparison ?? config.comparison`. Inclut `diff` dans le `TestCaseResult` quand non vide.
  - `validateAST` (output_tests, lignes ~2517-2530) : passe `output_comparison ?? { kind: 'exact' }` à la sous-config output.
- `src/lib/shared/python/execution/exercise-validation-real.svelte.test.ts` (Pyodide réel) : refactor des 3 tests output → 5 tests V2 (exact match/mismatch + text/collapsed + numeric loose/tight). Mise à jour du test ast/output_tests pour fournir `output_comparison`. Mise à jour du test isolation pour ajouter `comparison`.
- `src/lib/shared/python/execution/base-executor.svelte.test.ts` : `makeOutputConfig` ajoute `comparison: { kind: 'exact' }`.

**Décisions :**

- `compareOutputs` est pure JS — aucun round-trip Python pour la comparaison. Le scaffolding stdin/stdout reste côté Python.
- L'isolation namespace est préservée (le `comparison` est purement client-side, ne touche pas au `dict()` Python).
- Le `diff` est ajouté conditionnellement au `TestCaseResult` (spread de `{}` si absent) pour ne pas polluer les sérialisations.

## Phase 4 — UI auteur (UX β) ⏳

## Phase 5 — UI résultat (diff) ⏳

## Phase 6 — Migration seeds ⏳

## Phase 7 — Quality checks ⏳
