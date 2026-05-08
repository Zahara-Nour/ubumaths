# Python Exercises — Étape 1 : Expose `validateExercise` via les executors

## Statut : ✅ TERMINÉ (TDD complet)

Première étape de l'intégration du système d'exercices Python : ajouter une méthode `validateExercise(code, config) → Promise<ExerciseValidationResult>` sur `BasePythonExecutor` afin que les stores (playground, notebook) et la future UI élève puissent exécuter une validation depuis le main thread.

## Contexte

Avant cette étape, le worker `pyodide.worker.ts` recevait déjà des messages `validate-exercise` et émettait `validation-exercise-result`, mais **aucun executor ne relayait ce flux** — l'API `/api/python-exercises/[id]/submit` attendait un `validation_result` que personne ne savait générer côté client. Cf. [presentation détaillée du système](../docs/ref/python/progress/python-exercises-api-progress.md) §6.

## Comportements implémentés

| #   | Cas                                                 | Comportement                                                       |
| --- | --------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | Pyodide pas chargé (`initial`/`loading`/`error`)    | promise rejette avec `Error("Pyodide n'est pas prêt")`             |
| 2   | Pyodide chargé (`ready` ou `executing`), happy path | poste `validate-exercise` au worker, résout avec le `result`       |
| 3   | Validation échouée (test failed, AST issue)         | promise **résout** avec `valid: false` (pas de rejection)          |
| 4   | Pendant `execute()` en cours                        | autorisé, état reste `executing`, pas de changement de stdout      |
| 5   | Validations concurrentes                            | routées par `id` indépendamment, ordre de réponse libre            |
| 6   | Résultat avec `id` inconnu                          | `console.warn` + ignoré, pas de crash                              |
| 7   | Aucune réponse worker (safety net)                  | rejette après `(config.timeout_ms ?? 5000) + 5000ms`               |
| 8   | `destroy()` avec validations pending                | toutes rejetées avec `Error("Worker destroyed")`, timeouts cleared |

## Fichiers modifiés

### `src/lib/shared/python/execution/base-executor.svelte.ts`

- Imports de `ExerciseValidationConfig` / `ExerciseValidationResult` ajoutés
- Constante `DEFAULT_EXERCISE_TIMEOUT_MS = 5000`
- Interface `PendingExerciseValidation` (mirror de `PendingCompletion`)
- Map `pendingExerciseValidations` (private)
- Méthode publique `validateExercise(code, config)`
- Helper privé `handleExerciseValidationResult(id, result)`
- `case 'validation-exercise-result'` ajouté dans `handleWorkerMessage`
- Cleanup des pending validations dans `destroy()`

### `src/lib/shared/python/execution/base-executor.svelte.test.ts` (nouveau)

14 tests couvrant les 8 comportements listés ci-dessus :

- `when not ready` (×2)
- `when ready` (×5) — post message, resolve, failed result, no state side-effect, in-flight execute
- `id routing` (×2) — concurrents, id inconnu
- `safety-net timeout` (×3) — explicite, default 5000ms, no fire si réponse à temps
- `destroy` (×2) — rejette les pending, clear les safety net timeouts

## Décisions techniques

### Garde "Pyodide chargé" plus permissive que `isReady`

`isReady` est `true` uniquement quand `state === 'ready'`. La méthode `validateExercise` accepte aussi `state === 'executing'` car :

- le worker peut router plusieurs messages en parallèle (single-threaded queue)
- le worker `pyodide.runPythonAsync` lui-même est awaité dans le dispatcher, donc pas de vrais concurrents
- l'UX attendue : un élève peut lancer une validation pendant qu'un précédent `execute()` traîne

### Pas de modification de l'état réactif

`validateExercise` n'écrit ni `stdout`/`stderr`/`plotData`/`state` ni les hooks `onExecutionComplete`/`onExecutionError`. La validation est conceptuellement orthogonale à `execute()`. Le résultat passe **uniquement** par la promise.

### Safety-net timeout

Le worker a déjà son propre timeout (`config.timeout_ms`, max 60s). Le main thread ajoute un buffer de `TIMEOUT_BUFFER_MS = 5000ms` (constante existante, partagée avec `execute()`). Cette protection ne se déclenche que si le worker meurt entièrement (cas exceptionnel). Si le worker time-out proprement, il émet un `validation-exercise-result` avec `error: 'Délai d'exécution dépassé'` et la promise **résout** normalement avec `valid: false`.

### Map plutôt que SvelteMap

Cohérent avec le pattern existant pour `pendingCompletions`. Ces Maps sont du bookkeeping interne, pas de l'état réactif. ESLint produit le même warning `svelte/prefer-svelte-reactivity` pour les deux ; warning préexistant accepté.

### Workaround TDZ dans les tests

Le test importe `BasePythonExecutor` via le **barrel** `$lib/shared/python` plutôt que directement depuis `./base-executor.svelte`. Sans ça, l'ordre de chargement déclenche un Temporal Dead Zone (base-executor → barrel → playground-executor `extends` BasePythonExecutor non encore défini). Cause racine : base-executor importe `PYODIDE_CONFIG`/`fromWorkerMessageSchema` depuis le barrel. Documenté dans le commentaire d'import du test.

## Vérifications

| Check                                                    | Résultat                                                 |
| -------------------------------------------------------- | -------------------------------------------------------- |
| `pnpm test:client` sur le nouveau test                   | 14/14 ✓                                                  |
| `pnpm test:client` sur `pythonPlayground.svelte.test.ts` | 61/61 ✓ (régression OK)                                  |
| `pnpm test:client` sur `pythonDebug.svelte.test.ts`      | 114/114 ✓ (régression OK)                                |
| `npx eslint` sur les 2 fichiers modifiés                 | 0 errors, 4 warnings préexistants                        |
| `pnpm check:incremental`                                 | 9 erreurs préexistantes inchangées (slides/demo, extern) |

## Reste à faire (étapes 2+ du plan d'origine)

1. **UI élève** — route `/python-exercises/[id]` qui :
   - charge l'exercice (sans `solution_code`)
   - affiche `instructions` (markdown)
   - démarre l'éditeur avec `starter_code`
   - bouton "Soumettre" : appelle `executor.validateExercise(code, exercise.validation_config)` puis poste `{ code, validation_result }` à `/api/python-exercises/[id]/submit`
   - affiche les `test_results` / `ast_issues` dans une UI claire
2. **UI enseignant** — formulaire de création (3 sous-formulaires selon le `type` choisi)
3. **Migration** : ajouter `UNIQUE(exercise_id, class_id)` et `UNIQUE(exercise_id, student_id)` sur `python_exercise_assignments`
4. **Tests** : couvrir les 3 stratégies de validation côté worker (output / unit_test / ast)
5. **Pollution namespace** : isoler la validation dans un context Pyodide dédié pour éviter qu'un état playground antérieur fasse passer un exercice (cf. présentation §1, gotcha)
