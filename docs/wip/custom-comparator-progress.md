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

## Phase 3 — Strip API du code custom ✅ (no-op, documenté)

**Décision :** **pas de strip serveur** du `validation_config.comparison.code`.

Raison : on a choisi le niveau **honneur** (cf. décisions de la Phase 0). Le code du comparateur **doit** voyager côté navigateur élève, car `executor.validateExercise(code, validation_config)` tourne côté client (Pyodide). Si on strippait le code côté API, le worker rejetterait la config Zod (violation de `code: string().min(1)`) et l'élève ne pourrait plus valider l'exo du tout — pire UX que de simplement faire confiance.

La protection se fait à deux niveaux :

1. **L'UI consultation** (`/python-exercises/[id]/+page.svelte`) **n'affiche pas** le code du comparateur. Seule l'UI auteur (`ExerciseStrategyEditor.svelte`) le rend dans un `<textarea>`. Strip "naturel" : un élève qui n'ouvre pas DevTools ne voit jamais le code.
2. **DevTools possible** : un élève technique peut récupérer le `validation_config` via Network ou en inspectant `data.exercise`. Risque résiduel cohérent avec les tests cachés (mêmes garanties).

Pour passer en garantie stricte (server-side validation), il faudra Pyodide côté Node, queue, ressources Vercel — projet à part. À envisager en V2 si nécessaire.

**Aucun fichier modifié dans cette phase.**

## Phase 4 — UI auteur ✅

**Fichier modifié :** `src/lib/components/python/exercises/ExerciseStrategyEditor.svelte`.

- Ajout d'un 9e preset `'custom-python'` dans le `<MySelect>` "Comparaison" (avant l'option "Personnaliser…").
- Mapping `presetToComparison['custom-python']` vers `{ kind: 'custom', code: <template>, timeout_ms: 2000 }`.
- `detectPreset` renvoie `'custom-python'` quand `cmp.kind === 'custom'`.
- Nouveau panneau dédié rendu quand `selectedPreset === 'custom-python'` :
  - Texte d'aide expliquant la signature de `compare(expected, actual, stdin)`.
  - `<textarea>` 14 lignes pour le code Python (binding `oninput` → `setCustomCode`).
  - `<Input type="number">` pour le timeout (min 100ms, max 10000ms, step 100).
- Helpers `setCustomCode(code)` et `setCustomTimeout(ms)` (narrowing + spread).

**Décision plan-vs-implémentation :** pas de bouton "Tester le comparateur" séparé.

J'avais initialement prévu un bouton dédié dans l'éditeur. À l'analyse, il fait double-emploi avec le bouton **"Vérifier"** déjà présent au-dessus du formulaire `/python-exercises/new` : ce dernier appelle `executor.validateExercise(solution_code, validation_config)` qui passe par `compareWithCustomScript` avec le solution_code du prof comme `actual`. Si le comparateur tourne et accepte la solution de référence → vert ; sinon → diagnostic via `error`/`diff`. Pas besoin de doubler.

Un commentaire dans le panneau renvoie le prof vers ce bouton (texte "Pour vérifier que le comparateur tourne, clique sur **Vérifier** au-dessus du formulaire").

Svelte autofixer : 0 issue, 0 suggestion (après remplacement de `{'{'}`/`{'}'}` par les entités HTML `&lbrace;`/`&rbrace;`).

## Phase 5 — Quality checks ⏳
