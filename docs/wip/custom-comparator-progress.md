# Comparateur Python custom (special judge) — progression

Ajout d'une 4e variante au discriminated union `OutputComparison` : `{ kind: 'custom', code: string, timeout_ms?: number }`. Le prof écrit une fonction Python `compare(expected, actual, stdin) -> bool | dict` qui décide à la place des comparaisons standard. Débloque les cas d'usage où plusieurs solutions sont valides (ordre libre, sortie probabiliste, vérification structurelle, etc.).

Décisions :

- **Niveau de garantie : honneur** (le code custom voyage côté élève dans le payload mais n'est pas affiché dans l'UI ; strippé par l'API pour les non-auteurs). Cohérent avec les tests cachés.
- **Bouton "Tester le comparateur"** dans l'éditeur : V1 ; exécute `compare(expected, expected, input)` sur chaque test case (tous doivent passer).
- **`unit_test`** : reporté en V2.
- **Timeout dédié** : 2 s par défaut, configurable jusqu'à 10 s.

## Phase 1 — Types + Zod ✅

**Fichiers modifiés :**

- `src/lib/types/python-exercises.ts` — `CustomComparison` ajouté à l'union `OutputComparison`.
- `src/lib/shared/python/types.ts` — pareil (copie worker).
- `src/lib/server/validation/python-exercises.ts` — `customComparisonSchema` Zod (code 1-10k chars, timeout_ms 100-10000ms default 2000), ajouté au discriminated union.
- `src/lib/shared/python/worker/messages.ts` — pareil côté worker.
- `src/lib/shared/python/index.ts` — barrel exports.

## Phase 2 — Worker custom comparator ✅

**Fichiers modifiés :**

- `src/lib/workers/pyodide.worker.ts` :
  - Nouvelle fonction `compareWithCustomScript(code, expected, actual, stdin, timeoutMs)` (~110 LOC) :
    - Crée un dict Python isolé (différent du namespace du code élève).
    - Charge le code custom dedans.
    - Vérifie que `compare` est défini et callable.
    - Injecte `expected`/`actual`/`stdin` via `namespace.set()` (pas d'interpolation).
    - Exécute `compare(...)` avec un `Promise.race` pour le timeout dédié.
    - Normalise le retour côté Python (bool → `{passed}`, dict avec `passed`/`diff`/`error`, autre → erreur explicite).
    - Sérialise via `json.dumps` puis `JSON.parse` côté JS (pas de PyProxy à manager).
    - `namespace.destroy()` en finally.
  - `validateOutputComparison` : branche `cmp.kind === 'custom'` → `compareWithCustomScript(...)`, sinon comportement précédent. Le `error` retourné par le comparateur est propagé au `TestCaseResult` (en plus de `diff`).
- `src/lib/shared/python/execution/exercise-validation-real.svelte.test.ts` : 5 tests Pyodide-réel.
  1. Retour `True` → passé.
  2. Retour `dict` avec `diff` → ordre indifférent, diff surfacé en cas d'échec.
  3. Crash dans `compare()` → `error` propagée.
  4. Pas de fonction `compare` → erreur claire.
  5. Comparateur isolé du namespace élève (pas de fuite de variables).

**Vérifié :** 22/22 tests Pyodide-réel verts.

**Décisions :**

- Sérialisation JSON Python → JS : robuste, pas de gestion PyProxy, gère les chaînes UTF-8 sans souci.
- Le timeout est un wrapper JS `Promise.race`, pas un signal côté Python (Pyodide ne supporte pas de manière fiable l'interruption d'un script en cours). Conséquence : si le comparateur boucle, le `runPythonAsync` continue à tourner même après le timeout JS. Pour la V1, c'est acceptable (le résultat n'est pas attendu, le worker reste vivant pour les test cases suivants).
- L'erreur `error` retournée par le comparateur (string) est ajoutée au `TestCaseResult` séparément du `diff`, pour distinguer "verdict avec indice pédagogique" (diff) de "panne du comparateur" (error).

## Phase 3 — Strip API du code custom ⏳

## Phase 4 — UI auteur ⏳

## Phase 5 — Quality checks ⏳
