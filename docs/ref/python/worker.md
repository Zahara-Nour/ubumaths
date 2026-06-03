# Python Ecosystem — Web Worker

Documentation technique de `src/lib/workers/pyodide.worker.ts` (≈ 4 000 lignes), le Web Worker qui exécute tout le Python d'UbuMaths.

> Le worker est utilisé par 4 chemins distincts (playground, notebook, exercices, debugger). Pour la vue d'ensemble, voir [README.md](./README.md) ; pour le pattern d'abstraction côté main thread, voir [`BasePythonExecutor`](#executor-pattern-côté-main-thread).

---

## Localisation et schema commun

```
src/lib/workers/pyodide.worker.ts        # Le worker (entry Vite)
src/lib/shared/python/                   # Code partagé worker ↔ main
  ├── config.ts                          # PYODIDE_CONFIG, LOADING_STAGES, CONTEXT_CONFIG, ERROR_MESSAGES
  ├── types.ts                           # ToWorkerMessage, FromWorkerMessage, etc.
  ├── index.ts                           # Re-exports + Zod schemas
  ├── execution/                         # BasePythonExecutor, PlaygroundExecutor, NotebookExecutor
  ├── validation/                        # output-compare, variable-compare, schemas Zod
  ├── debug/                             # Types DebugSnapshot/DebugStepAction/DebugPauseReason
  └── worker/                            # Schemas Zod des messages
```

Le worker importe **`$lib/shared/python`** (pas d'`$app/...`), ce qui le rend testable hors navigateur via Vitest avec mocks.

---

## Configuration (`src/lib/shared/python/config.ts`)

```typescript
export const PYODIDE_CONFIG = {
	CDN_URL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
	INITIAL_PACKAGES: [] as const, // Lazy-loading complet, rien au boot
	TIMEOUT_MS: 30000, // 30 s par exécution
	MAX_CODE_LENGTH: 100_000, // 100 KB max
	MAX_LINES: 5000 // Limite indicative (validate-code seulement)
} as const;

export const LOADING_STAGES = [
	{ percent: 0, stage: 'Initialisation...' },
	{ percent: 50, stage: 'Telechargement de Python...' },
	{ percent: 100, stage: 'Pret !' }
] as const;

export const CONTEXT_CONFIG = {
	MAX_CONTEXTS: 10, // Plafond simultané
	IDLE_TIMEOUT_MS: 5 * 60 * 1000, // 5 min puis cleanup
	DEFAULT_PLAYGROUND_CONTEXT: '__playground__',
	NOTEBOOK_CONTEXT_PREFIX: 'notebook_'
} as const;
```

Les anciennes étapes par-package (NumPy / Matplotlib / SymPy) n'existent plus : depuis le passage au lazy-loading, les packages remontent dynamiquement via les messages `packages-loading` / `packages-loaded`, et l'UI affiche le nom du package en cours.

---

## Multi-context : un seul Pyodide, N namespaces

Un seul interpréteur Pyodide est chargé en mémoire. Chaque exécution cible un **namespace Python isolé** (un `dict()` Python), enregistré dans `contexts: Map<string, ExecutionContext>` (variable globale du worker).

```typescript
interface ExecutionContext {
	id: string;
	persistent: boolean; // false → un dict éphémère par exécution
	namespace: PyProxy | null; // null pour les contextes éphémères
	lastActivity: number; // Pour le cleanup idle
}
```

| Contexte                      | `persistent` | Usage                                            |
| ----------------------------- | ------------ | ------------------------------------------------ |
| `__playground__` (par défaut) | `false`      | Playground : namespace neuf à chaque `execute()` |
| `notebook_<uuid>`             | `true`       | Notebook : namespace préservé entre cellules     |
| `validate-<…>` (interne)      | éphémère     | Validation d'exercice (worker isole lui-même)    |

API interne : `createContext()`, `destroyContext()`, `resetContext()`, `getContextNamespace()`. Cleanup idle : tâche `setInterval` qui scrute les contextes inactifs depuis plus de `IDLE_TIMEOUT_MS`.

---

## Protocole de messages

Tous les messages traversent la frontière worker ↔ main avec **validation Zod stricte** (`fromWorkerMessageSchema`, `toWorkerMessageSchema`). Un message non conforme est loggé et ignoré.

### Main → Worker (`ToWorkerMessage`, `src/lib/shared/python/types.ts`)

| `type`              | Champs                                           | Usage                                                                             |
| ------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------- |
| `init`              | —                                                | Boot Pyodide (Pyodide CDN → matplotlib setup différé)                             |
| `execute`           | `code`, `id`, `contextId?`                       | Exécute du code dans le contexte demandé                                          |
| `cancel`            | `id`                                             | Annule (best-effort : Pyodide n'a pas d'interrupt fiable)                         |
| `autocomplete`      | `code`, `cursor`, `id`, `contextId?`             | Complétions Python (`dir()` + `getattr()` + builtins + keywords)                  |
| `create-context`    | `contextId`, `persistent`                        | Crée un namespace (notebook)                                                      |
| `destroy-context`   | `contextId`                                      | Détruit un namespace + `PyProxy.destroy()`                                        |
| `reset-context`     | `contextId`                                      | Vide le namespace sans détruire le contexte                                       |
| `validate`          | `code`, `config`, `id`                           | Validation Python statique (syntaxe + règles `ValidationConfig`)                  |
| `validate-exercise` | `code`, `config: ExerciseValidationConfig`, `id` | Validation exercice (AST + behavior) — voir [§ Exercices](#validation-dexercices) |
| `debug-start`       | `code`, `id`, `breakpoints: WorkerBreakpoint[]`  | Démarre une session debug                                                         |
| `debug-step`        | `id`, `action: DebugStepAction`                  | Step Into / Over / Out / Continue / Stop                                          |
| `debug-stop`        | `id`                                             | Stoppe la session                                                                 |

### Worker → Main (`FromWorkerMessage`)

| `type`                       | Champs                                   | Usage                                                |
| ---------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| `loading-progress`           | `percent`, `stage`                       | Avance le bandeau de chargement                      |
| `pyodide-ready`              | —                                        | Pyodide bootstrappé                                  |
| `packages-loading`           | `packages`, `id`                         | Lazy-load en cours (ex : `['numpy']`)                |
| `packages-loaded`            | `packages`, `id`                         | Lazy-load fini                                       |
| `stdout` / `stderr`          | `data`, `id`                             | Sortie incrémentale                                  |
| `plot`                       | `imageData` (base64 PNG), `id`           | Figure matplotlib                                    |
| `plotly`                     | `jsonSpec`, `id`                         | Figure Plotly (JSON spec → rendu CDN côté main)      |
| `latex`                      | `latex`, `id`                            | Expression SymPy en LaTeX                            |
| `error`                      | `message`, `line?`, `id`                 | Erreur d'exécution (id `''` = erreur init)           |
| `complete`                   | `id`, `duration`                         | Exécution terminée                                   |
| `timeout`                    | `id`                                     | Watchdog 30 s atteint                                |
| `autocomplete-result`        | `completions`, `id`                      | Réponse à `autocomplete`                             |
| `context-created`            | `contextId`                              | ack `create-context`                                 |
| `context-destroyed`          | `contextId`                              | ack `destroy-context`                                |
| `context-reset`              | `contextId`                              | ack `reset-context`                                  |
| `validation-result`          | `result`, `id`                           | Résultat `validate`                                  |
| `validation-exercise-result` | `result: ExerciseValidationResult`, `id` | Résultat `validate-exercise`                         |
| `debug-snapshot`             | `id`, `snapshot: DebugSnapshot`          | État runtime (frames, heap, locals)                  |
| `debug-paused`               | `id`, `reason: DebugPauseReason`         | Cause de la pause (`breakpoint`, `step`, `entry`, …) |
| `debug-finished`             | `id`, `duration`                         | Session debug terminée                               |

---

## Lazy package loading

Aucun package tiers n'est préchargé. Avant chaque `execute`, le worker :

1. Parse le code via `pyodide.code.find_imports()` (côté Python — gère même les imports planqués).
2. Filtre l'union avec `STDLIB_MODULES` (≈ 60 modules listés : `sys`, `os`, `math`, `re`, `json`, `datetime`, `random`, `collections`, `itertools`, `functools`, `typing`, `abc`, `copy`, `base64`, `gc`, `warnings`, `ast`, `decimal`, `fractions`, `unittest`, `cmath`, `asyncio`, …).
3. Filtre les packages déjà présents dans le `Set<string>` global `loadedPackages` du worker.
4. Envoie `packages-loading` au main thread, appelle `pyodide.loadPackagesFromImports(code)` (Pyodide gère les dépendances transitives), puis envoie `packages-loaded`.
5. Pour les packages avec setup spécifique, appelle un hook après chargement :
   - `matplotlib` → `setupMatplotlib()` (backend AGG, helpers `_ubumaths_get_plot_base64`, suppression warning)
   - `plotly` → `setupPlotly()` (helpers `_ubumaths_get_plotly_json`, `_ubumaths_check_plotly_result`)

`loadedPackages` est cumulatif sur la durée de vie du worker : un 2e `execute` qui importe NumPy ne recharge rien.

---

## Helpers Python injectés

Tous préfixés `_ubumaths_` pour ne pas polluer le namespace de l'utilisateur.

| Helper                                             | Rôle                                                                      |
| -------------------------------------------------- | ------------------------------------------------------------------------- |
| `_ubumaths_reformat_exception()`                   | Réduit le traceback à `File "<exec>", line N\n<ExceptionType>: <msg>`     |
| `_ubumaths_get_completions(code, pos, namespace?)` | Auto-complétion via `dir()` + `getattr()` + `builtins` + `keyword.kwlist` |
| `_ubumaths_get_plot_base64()`                      | Sérialise la figure matplotlib courante en base64 PNG (DPI 100, AGG)      |
| `_ubumaths_cleanup_matplotlib()`                   | `plt.close('all')` après chaque exécution                                 |
| `_ubumaths_get_plotly_json()`                      | Sérialise `_ubumaths_plotly_fig` en JSON spec et reset                    |
| `_ubumaths_check_plotly_result(result)`            | Détecte une `plotly.graph_objs.Figure` et la stocke pour export           |
| `_ubumaths_check_sympy_result(result)`             | Détecte une expression SymPy et renvoie `sympy.latex(result)`             |

### Détection de l'expression finale (SymPy / Plotly)

Le worker parse `code` avec `ast.parse()`, puis :

- si le dernier nœud est une `ast.Expr`, il `exec()` tout sauf le dernier et `eval()` le dernier → `_ubumaths_last_result`
- sinon `exec()` tout le code

Ce mécanisme permet d'afficher la valeur d'une expression finale style REPL (utilisé par les notebooks et la sortie LaTeX).

---

## Exécution complète d'un `execute`

`executeCode(code, id, contextId?)` (ligne 1622) suit ces étapes :

1. Sécurise l'ID et arme le timeout 30 s (worker-side).
2. **Lazy-load** des packages requis (`loadRequiredPackages`).
3. Récupère le namespace cible via `getContextNamespace(contextId)` (crée un `dict()` éphémère si playground, retourne le dict persistant si notebook).
4. Redirige `sys.stdout` / `sys.stderr` vers des `StringIO` capturables.
5. Exécute le code (split AST trailing expression, voir au-dessus).
6. Pousse `stdout` / `stderr` accumulés vers le main thread.
7. Détecte LaTeX SymPy (`_ubumaths_check_sympy_result`) → `latex`.
8. Détecte matplotlib (`plt.get_fignums()`) → `plot`.
9. Détecte Plotly (`_ubumaths_plotly_fig`) → `plotly`.
10. `_ubumaths_cleanup_matplotlib()`.
11. Envoie `complete` avec la durée.
12. En cas d'erreur Python : `_ubumaths_reformat_exception` + `extractLineNumber(...)` regex sur `File "<exec>"|"<expr>"|"<unknown>", line N` → `error`.

Le namespace éphémère n'est jamais réutilisé : il est détruit (`PyProxy.destroy()`) entre exécutions playground.

---

## Validation d'exercices

Couvert par la fonction `validateExercise(code, config, id)` (ligne 2056). La config est un `ExerciseValidationConfig` avec **deux axes orthogonaux** :

```typescript
interface ExerciseValidationConfig {
	ast_requirements?: ASTRequirement[]; // Pré-checks structurels (sans exécution)
	behavior?: BehaviorCheck; // Vérif runtime (5 kinds discriminés)
	timeout_ms?: number;
}
```

Au moins l'un des deux doit être présent.

### Couche 1 — AST (`runASTChecks`)

Parse le code avec `ast.parse()` et vérifie 8 prédicats : `uses_loop`, `uses_recursion`, `defines_function`, `defines_class`, `uses_list_comprehension`, `no_global_variables`, `no_print`, `uses_import`. Si un check échoue → `failed_layer: 'ast'`, on s'arrête.

### Couche 2 — Behavior (`runBehavior`)

Discriminée sur `kind` :

| `kind`               | Runner                         | Notes                                                                                                                                                                                                                               |
| -------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `output`             | `runOutputBehavior`            | Compare `stdout` à `expected_output`. Stratégies `exact`/`text`/`numeric`/`custom`. Le `custom` lance un script Python tiers (`compareWithCustomScript`) dans un namespace isolé.                                                   |
| `unit_test`          | `runUnitTestBehavior`          | Appelle `function_name(*args)` et compare au `expected` via une fonction Python `_ubumaths_compare` (tuple↔list, dict↔dict, tolérance `eps_abs`+`eps_rel`).                                                                       |
| `variable_check`     | `runVariableCheckBehavior`     | Exécute le code dans un namespace neuf et lit les variables nommées, comparaison via `validation/variable-compare.ts` (récursif, type-strict pour scalaires).                                                                       |
| `reference_solution` | `runReferenceSolutionBehavior` | Test différentiel : compare l'élève contre une solution de référence cachée sur des cas fixes (`runOneFixedRefCase`) + cas générés aléatoirement (`runOneGeneratorRefCase`, seed reproductible). Args deep-copy avant chaque appel. |

**Tests cachés** (`hidden: true`) : la fonction `redactIfHidden` efface `input` / `expected` / `actual` / `diff` avant `postMessage`. Les fields ne traversent jamais la frontière worker → main.

**Isolation** : chaque validation tourne dans un `dict()` Python neuf, jamais dans le namespace du contexte courant. Le commit fondateur est `4d39ceaf5`.

---

## Debugger

Documenté plus en détail dans [`README.md § 3. Debugger`](./README.md#3-debugger). Côté worker :

- `debugStartExecution(code, breakpoints, id)` (ligne 3624) compile le code en AST et installe un **tracer Python par générateur** (pas de `sys.settrace`).
- À chaque statement, le tracer yield un `DebugSnapshot` (frames + locals + heap + last-line) → `processSnapshot()` → message `debug-snapshot` au main thread.
- `debugStep(id, action)` route les actions `step-into` / `step-over` / `step-out` / `continue` / `run-to-end` / `step-back` / `step-forward` (l'historique back/forward est géré côté store).
- La heap est segmentée : containers (`list`, `dict`, `set`, `tuple`, `frozenset`) + instances de classes utilisateur (cycles gérés via placeholder pré-inséré). Primitives en inline.

---

## Executor pattern (côté main thread)

Le main thread ne parle **pas** directement au worker. Une classe abstraite `BasePythonExecutor` (≈ 900 LoC, `src/lib/shared/python/execution/base-executor.svelte.ts`) gère la lifecycle du worker, l'état réactif Svelte 5, le routage des messages, l'auto-complétion (debounce 150 ms), la validation d'exercice et le protocole debug.

Deux concrétisations :

| Classe               | `getContextId()`           | `isPersistentContext()` | Consommateur                                 |
| -------------------- | -------------------------- | ----------------------- | -------------------------------------------- |
| `PlaygroundExecutor` | `undefined`                | `false`                 | `pythonStore`, `ExerciseForm`, page exercice |
| `NotebookExecutor`   | `'notebook_' + notebookId` | `true`                  | Une instance par notebook ouvert             |

→ **Détails complets (API, hooks, état réactif, décisions de design)** : [`executor-pattern.md`](./executor-pattern.md).

---

## Sécurité

- **Sandboxing** : le worker est isolé thread + pas de DOM + pas d'accès réseau Python (Pyodide bloque `urllib`, `requests`, `socket`).
- **Watchdog 30 s** : `executionTimeout` worker-side + watchdog main-side `TIMEOUT_MS + TIMEOUT_BUFFER_MS`.
- **Zod strict** : tout message non conforme est ignoré (loggé en warn).
- **Redaction** : tests cachés expurgés au niveau du worker avant `postMessage`.
- **Isolation namespace** : validation d'exercice = dict Python neuf à chaque case (anti-contamination par effet de bord global).

---

## Limites connues

- **Cancellation imparfaite** : Pyodide ne propose pas d'interrupt fiable. `cancel` cesse de traiter les messages liés à l'`id` annulé mais le code Python continue de tourner jusqu'au prochain await ou jusqu'au timeout.
- **Lazy-load synchrone à l'exécution** : si l'élève importe un gros package pour la première fois, la 1re exécution paye le coût (~1-3 s pour NumPy, ~2-3 s pour Matplotlib).
- **Pas de FS persistant** : `pyodide.FS` est en mémoire, vidé à la fin de la session.
- **Stdin** : aucun support `input()` côté playground (les exercices passent par `args` ou variables, jamais stdin interactif).

---

## Tests

```bash
pnpm test:server src/lib/shared/python/worker/messages.debug.test.ts     # 70 tests, protocole debug
pnpm test:server src/lib/shared/python/debug/types.test.ts               # 43 tests, types debug
pnpm test:server src/lib/shared/python/validation/output-compare.test.ts # 50 tests, stratégies output
pnpm test:server src/lib/shared/python/validation/variable-compare.test.ts # 42 tests, comparateur récursif
pnpm test:client src/lib/shared/python/execution/base-executor.svelte.test.ts # 14 tests, lifecycle executor
pnpm test:client src/lib/shared/python/execution/exercise-validation-real.svelte.test.ts # 57 tests, Pyodide réel
```

Les tests Pyodide réels (`exercise-validation-real`) sont **lents** (~30 s/run) car ils chargent réellement Pyodide via le worker. À garder hors du watch loop.

---

## Pointeurs

- Executor pattern (côté main thread) → [`executor-pattern.md`](./executor-pattern.md)
- Architecture transversale → [`architecture.md`](./architecture.md)
- Store playground → [`store.md`](./store.md)
- Composants UI → [`components.md`](./components.md)
- Vue d'ensemble fonctionnelle → [`README.md`](./README.md)
- Progress / décisions historiques → [`progress/python-worker-multicontext.md`](./progress/python-worker-multicontext.md), [`progress/python-executor-pattern.md`](./progress/python-executor-pattern.md), [`progress/python-lazy-loading-plan.md`](./progress/python-lazy-loading-plan.md)
