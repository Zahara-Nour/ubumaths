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

## Phase 4 — UI auteur (UX β) ✅

**Fichiers modifiés :**

- `src/lib/components/python/exercises/ExerciseStrategyEditor.svelte` :
  - Suppression complète de `ignore_whitespace` (init + onMount + template).
  - `setStrategy('output')` initialise `comparison: { kind: 'exact' }`.
  - Ajout d'un sélecteur preset `<MySelect>` "Comparaison" avec 8 valeurs (7 presets + "Personnaliser…").
  - Ajout d'un panneau "Configuration personnalisée" révélé quand `selectedPreset === 'custom'` : sélecteur `kind` (exact/text/numeric) + champs conditionnels (whitespace/case/trim pour text ; shape/eps_abs/eps_rel/non_numeric/accept_comma_decimal pour numeric).
  - `detectPreset(cmp)` : mapping inverse strict pour rester cohérent après reload (un comparison qui matche un preset s'affiche comme tel).
  - `setKind(kind)` : réinitialise les champs au changement de kind pour éviter les vestiges.
- `src/routes/(public)/python-exercises/new/+page.svelte` : `validation_config` initial utilise `comparison: { kind: 'exact' }`.

**Décisions :**

- UX β : 7 presets pédagogiques + "Personnaliser…" pour les cas avancés.
- `detectPreset` strict (pas de fuzzy match) pour éviter qu'une config légèrement différente d'un preset masque l'écart.
- `MyCheckbox` utilisé via `onchange` (alias documenté de `onCheckedChange`).
- Svelte autofixer : 0 issues, 0 suggestions.

## Phase 5 — UI résultat (diff) ✅

**Fichiers modifiés :**

- `src/lib/components/python/exercises/ExerciseValidationResult.svelte` : ajout d'un bloc `{#if testCase.diff}` dans le `<dl>` du panneau ouvert, étiqueté "Indice" en amber pour le distinguer visuellement de "Erreur" (qui reste rouge).
- `src/lib/components/python/exercises/ExerciseValidationResult.svelte.test.ts` : ajout d'un 7e test `'shows the diff message when present on a failed test case'` qui ouvre le `<details>` et vérifie que "Indice" + le motif `écart.*tolérance` sont affichés.

**Décisions :**

- Étiquette "Indice" plutôt que "Diff" — plus parlant pour un élève francophone.
- Couleur amber : niveau intermédiaire entre l'absence de feedback (gris muted) et l'erreur runtime (rouge).
- Pas d'usage `<details open>` automatique — l'élève clique pour révéler ; ça évite de submerger d'info quand de nombreux tests échouent.

## Phase 6 — Migration seeds ✅

**Fichier créé :** `supabase/migrations/20260508180000_update_seeds_for_output_v2.sql`.

**Stratégie :** deux `UPDATE` JSONB idempotents.

1. Pour les exos `output` (1, 2) : retire `ignore_whitespace` et ajoute `comparison: { kind: 'exact' }`. La clause `WHERE validation_config->'comparison' IS NULL` empêche la double-application.
2. Pour l'exo `ast` avec `output_tests` (5) : ajoute `output_comparison: { kind: 'exact' }`. Idempotence via `WHERE validation_config->'output_comparison' IS NULL`.

L'exo 4 (factorielle, ast sans output_tests) et l'exo 3 (unit_test) ne sont pas concernés.

**Application :** `pnpm db:migrate` côté utilisateur. Aucune migration des bases déjà en prod n'est nécessaire (validation_config restait JSONB côté DB ; seul le code applicatif change).

## Phase 7 — Quality checks ⏳
