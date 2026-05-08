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

## Phase 2 — Worker redaction ✅

**Fichiers modifiés :**

- `src/lib/workers/pyodide.worker.ts` :
  - Helper `redactIfHidden(result, hidden)` : retourne `{ passed, hidden: true, error? }` quand `hidden=true`, sinon retourne `result` tel quel.
  - `validateOutputComparison` : 4 sites de `testResults.push(...)` (succès + catch) enveloppés dans `redactIfHidden`.
  - `validateUnitTests` : pareil (succès + catch).
  - `validateAST.output_tests` : passe par `validateOutputComparison`, propagation automatique.
- `src/lib/shared/python/execution/exercise-validation-real.svelte.test.ts` : ajout de 3 tests Pyodide-réel (output passé caché, output échoué caché avec mode numeric, unit_test passé caché).

**Vérifié :** 17/17 tests Pyodide-réel passent.

**Décisions :**

- La redaction est faite **dans le worker** : les champs sensibles ne traversent jamais le `postMessage`. Même DevTools → Network → onglet "Workers" ne les verra pas.
- L'`error` est conservé (pas redacté) pour qu'un crash Python reste lisible. Risque acceptable : un message d'erreur Python ne révèle généralement pas l'attendu.

## Phase 3 — UI auteur ✅

**Fichier modifié :** `src/lib/components/python/exercises/ExerciseStrategyEditor.svelte`.

- Branche `output` : ajout d'un `<MyCheckbox label="Caché">` à droite du nom du test, avant le bouton supprimer. Bind via `onchange` (pour mutation immutable du tableau).
- Branche `unit_test` : pareil. Renommage de `_testCase` en `testCase` puisqu'on l'utilise désormais (`testCase.hidden`).
- Pas de section séparée, pas de réorganisation : le toggle est local à chaque carte.

**Décisions :**

- `onchange` callback (pas `bind:checked` direct) pour reconstruire le tableau via spread et garantir la réactivité Svelte 5 sur l'array config.test_cases.
- `testCase.hidden ?? false` au rendu pour gérer l'absence du champ sur les exos existants.
- Svelte autofixer : 0 issues, 0 suggestions.

## Phase 4 — UI résultat ✅

**Fichiers modifiés :**

- `src/lib/components/python/exercises/ExerciseValidationResult.svelte` :
  - Import de l'icône `Lock` depuis lucide-svelte.
  - Branche `{#if testCase.hidden}` qui rend une simple `<div>` (pas de `<details>`) avec icône cadenas + verdict + label "Test N (caché)" en muted. L'`error` reste affichée (cf B4).
  - Le branchement `{:else}` conserve le rendu `<details>` actuel pour les tests visibles.
- `src/lib/components/python/exercises/ExerciseValidationResult.svelte.test.ts` : ajout d'un 8e test qui vérifie le rendu opaque (présence de "Test 2 (caché)").

**Vérifié :** 8/8 tests svelte-browser passent.

**Décisions :**

- Une `<div>` plate (pas un `<details>` désactivé) : sémantiquement plus correct, plus simple à styler, accessibilité meilleure (rien de cliquable).
- Cadenas `<Lock>` + texte "(caché)" + couleur muted : trois signaux redondants pour que l'élève saisisse immédiatement la nature du test.
- L'`error` Python est affichée à côté du label, en rouge — utile pour distinguer un crash d'un mauvais résultat (acceptable pour le MVP, cf risque B4).
- Svelte autofixer : 0 issues, 0 suggestions.

## Phase 5 — Quality checks ⏳
