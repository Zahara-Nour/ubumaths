# Python Executor Pattern

Documentation du pattern d'abstraction qui sépare la **gestion du worker Pyodide** des **concerns UI/persistance** dans l'écosystème Python d'UbuMaths.

> Vue d'ensemble fonctionnelle → [`README.md`](./README.md) · Worker → [`worker.md`](./worker.md) · Store playground → [`store.md`](./store.md)

---

## Pourquoi un pattern

Avant le refactor de décembre 2025, toute la logique worker + state vivait dans `PythonPlaygroundStore`. Quand on a voulu ajouter le notebook (cellules avec namespace persistant) et le debugger (snapshots + step), on s'est retrouvés à devoir dupliquer ~500 lignes de bootstrap Pyodide, de routage des messages, et de gestion du timeout.

Le pattern résout ce problème en extrayant ce socle dans `BasePythonExecutor` (abstrait), avec deux concrétisations actuelles :

| Sous-classe          | `contextId`                | `persistent` | Consommateur                                 |
| -------------------- | -------------------------- | ------------ | -------------------------------------------- |
| `PlaygroundExecutor` | `undefined`                | `false`      | `pythonStore`, `ExerciseForm`, page exercice |
| `NotebookExecutor`   | `'notebook_' + notebookId` | `true`       | `notebookStore` (une instance par notebook)  |

---

## Architecture

```
                ┌──────────────────────────────┐
                │     BasePythonExecutor       │  (abstract, ~900 LoC)
                │                              │
                │  • Worker lifecycle          │
                │  • Message routing (Zod)     │
                │  • Reactive state ($state)   │
                │  • Autocomplete (debounce)   │
                │  • Exercise validation       │
                │  • Debug session protocol    │
                └──────────────┬───────────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
   ┌──────────▼──────────┐           ┌──────────▼──────────┐
   │ PlaygroundExecutor  │           │   NotebookExecutor  │
   │                     │           │                     │
   │ getContextId()      │           │ getContextId()      │
   │   → undefined       │           │   → "notebook_<id>" │
   │ isPersistentContext │           │ isPersistentContext │
   │   → false           │           │   → true            │
   │                     │           │                     │
   │ Hook debug-snapshot │           │ resetKernel(): clear│
   │   → debugStore.push │           │   namespace via     │
   │                     │           │   reset-context msg │
   └──────────┬──────────┘           └──────────┬──────────┘
              │                                 │
   ┌──────────▼──────────┐           ┌──────────▼──────────┐
   │ PythonPlaygroundStore│          │    notebookStore    │
   │                     │           │                     │
   │  + code / fontSize  │           │  + cells / outputs  │
   │  + localStorage     │           │  + execution queue  │
   │  + cloud files      │           │  + DB sync          │
   │  + URL sharing      │           │  + cell management  │
   │  + 12 thèmes        │           │  + autosave         │
   └─────────────────────┘           └─────────────────────┘
```

`PythonEditor.svelte` reçoit un `executor: CompletionProvider | null` (interface minimaliste : `requestCompletion`). Le playground passe `pythonStore.executor`, le notebook passe son `NotebookExecutor` directement → autocomplétion **contexte-aware** (les variables du notebook A ne polluent pas le notebook B).

---

## API de `BasePythonExecutor`

**Localisation** : `src/lib/shared/python/execution/base-executor.svelte.ts`

### État réactif (Svelte 5 runes)

```typescript
state: ExecutorState           // 'initial'|'loading-pyodide'|'loading-packages'|'ready'|'executing'|'error'
loadingProgress: number        // 0-100
loadingStage: string
stdout, stderr: string
plotData, latexOutput, plotlyData: string | null
errorLine: number | null
executionTime: number          // ms
packagesLoading, loadedPackages: string[]

// Derived
isReady, isExecuting, isLoading, hasError, hasOutput, isLoadingPackages: boolean
```

### Méthodes publiques

| Méthode                                | Retour                              | Rôle                                                                          |
| -------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------- |
| `initPyodide()`                        | `void`                              | Crée le worker via Vite URL, envoie `init`                                    |
| `execute(code)`                        | `void`                              | Génère un `id`, arme le watchdog 30 s + `TIMEOUT_BUFFER_MS`, envoie `execute` |
| `cancel()`                             | `void`                              | Arrête de traiter les messages de l'`id` courant                              |
| `clearOutput()`                        | `void`                              | Vide stdout/stderr/plot/latex/plotly                                          |
| `requestCompletion(code, cursor)`      | `Promise<CompletionItem[]>`         | Debounce 150 ms, timeout 500 ms, cancel des requêtes en cours                 |
| `validateExercise(code, config)`       | `Promise<ExerciseValidationResult>` | N'altère **pas** l'état réactif ; runs en parallèle d'un `execute`            |
| `startDebugSession(code, breakpoints)` | `void`                              | Démarre une session debug                                                     |
| `debugStep(action)`                    | `void`                              | Step Into / Over / Out / Continue / Stop                                      |
| `stopDebugSession()`                   | `void`                              | Termine la session debug                                                      |
| `isDebugSessionActive()`               | `boolean`                           |                                                                               |
| `getDebugExecutionId()`                | `string \| null`                    |                                                                               |
| `destroy()`                            | `void`                              | Termine le worker, reject toutes les promesses pending                        |

### Méthodes abstraites (sous-classe DOIT implémenter)

| Méthode                                       | Rôle                                                                   |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| `getContextId(): string \| undefined`         | `undefined` → namespace éphémère ; string → namespace persistant nommé |
| `isPersistentContext(): boolean`              | Drapeau de cohérence (utilisé pour les checks et l'introspection)      |
| `onExecutionComplete(duration: number): void` | Hook fin OK                                                            |
| `onExecutionError(message, line?): void`      | Hook erreur d'exécution                                                |

### Hooks debug (sous-classe PEUT overrider)

| Hook                        | Quand                                       | Default |
| --------------------------- | ------------------------------------------- | ------- |
| `onDebugSnapshot(snapshot)` | Snapshot reçu du worker                     | no-op   |
| `onDebugPaused(reason)`     | Pause atteinte (breakpoint, step, entry, …) | no-op   |
| `onDebugFinished(duration)` | Session debug terminée                      | no-op   |

### Constantes internes

```typescript
TIMEOUT_BUFFER_MS = 5000; // Watchdog main = PYODIDE_CONFIG.TIMEOUT_MS + buffer
DEFAULT_EXERCISE_TIMEOUT_MS = 5000; // Si config.timeout_ms omis
AUTOCOMPLETE_TIMEOUT_MS = 500;
AUTOCOMPLETE_DEBOUNCE_MS = 150;
```

---

## `PlaygroundExecutor`

**Localisation** : `src/lib/shared/python/execution/playground-executor.svelte.ts`

Implémentation pour exécution isolée (chaque `execute` repart d'un namespace vide).

```typescript
export class PlaygroundExecutor extends BasePythonExecutor {
	getContextId(): undefined {
		return undefined;
	}
	isPersistentContext(): boolean {
		return false;
	}

	protected onExecutionComplete(_duration: number): void {}
	protected onExecutionError(_message: string, _line?: number): void {}

	// Debug snapshots routés vers debugStore (consommé par le DebugPanel UI)
	protected onDebugSnapshot(snapshot: DebugSnapshot): void {
		debugStore.pushSnapshot(snapshot);
	}
	protected onDebugPaused(reason: DebugPauseReason): void {
		debugStore.setPaused(reason);
	}
	protected onDebugFinished(duration: number): void {
		debugStore.finish(duration);
	}
}
```

Consommateurs :

- **`PythonPlaygroundStore`** (singleton) — wrappe l'executor pour le playground
- **`ExerciseForm.svelte`** — instancie son propre `PlaygroundExecutor` pour le bouton "Vérifier" sans interférer avec le store global
- **Page exercice élève** (`/python-exercises/[id]/+page.svelte`) — idem

---

## `NotebookExecutor`

**Localisation** : `src/lib/shared/python/execution/notebook-executor.svelte.ts`

Implémentation pour exécution persistante. Une instance par notebook ouvert (cycle de vie aligné sur le composant `NotebookView`).

```typescript
export class NotebookExecutor extends BasePythonExecutor {
	private notebookContextId: string;

	constructor(notebookId: string) {
		super();
		this.notebookContextId = `notebook_${notebookId}`;
	}

	getContextId(): string {
		return this.notebookContextId;
	}
	isPersistentContext(): boolean {
		return true;
	}

	/** Envoie `reset-context` au worker → namespace vidé sans détruire le contexte */
	resetKernel(): void {
		/* postMessage reset-context */
	}

	protected onExecutionComplete(_duration: number): void {
		/* notebookStore update */
	}
	protected onExecutionError(_message: string, _line?: number): void {
		/* notebookStore update */
	}
}
```

Le notebook a sa propre file d'attente de cellules (gérée par `notebookStore`) : un `execute` par cellule, séquentiel, dans le **même contexte**. Les variables d'une cellule restent visibles pour les suivantes.

---

## Composition côté store (pas d'héritage)

`PythonPlaygroundStore` **wrappe** son executor au lieu d'en hériter :

```typescript
class PythonPlaygroundStore {
	private _executor = new PlaygroundExecutor();

	// Forward state via getters (préserve la réactivité Svelte)
	get state() {
		return this._executor.state;
	}
	get stdout() {
		return this._executor.stdout;
	}
	get isReady() {
		return this._executor.isReady;
	}
	// … 15+ autres getters

	// Forward methods avec un peu de logique métier
	execute(): void {
		this._executor.execute(this.code);
	}
	cancel(): void {
		this._executor.cancel();
	}

	// Couche playground-specific (pas dans l'executor)
	code = $state(DEFAULT_CODE);
	editorTheme = $state<EditorTheme>('default');
	currentFile = $state<PythonFile | null>(null);
	saveToCloud() {
		/* … */
	}
	generateShareUrl() {
		/* LZ-String → URL */
	}
}
```

`notebookStore` suit le même pattern avec son `NotebookExecutor`.

### Pourquoi composition et pas héritage ?

1. **Séparation des concerns** — l'executor sait exécuter du Python ; le store gère UI, localStorage, cloud, URL. Mélanger les deux interdit de tester l'executor en isolation.
2. **Multiples executors par store** — théoriquement possible (par ex. `ExerciseForm` instancie un `PlaygroundExecutor` dédié, indépendant du singleton `pythonStore`).
3. **Pas de conflit Svelte 5 runes** — un seul `class` avec runes, pas de méta-classe ambiguë.

---

## `CompletionProvider` : interface mince pour découpler l'éditeur

`PythonEditor.svelte` ne veut surtout pas dépendre du singleton `pythonStore` (le notebook a besoin de **son** executor pour l'auto-complétion contexte-aware). On a donc extrait une interface minimaliste :

```typescript
// src/lib/shared/python/types.ts
export interface CompletionProvider {
	requestCompletion(code: string, cursor: number): Promise<CompletionItem[]>;
}
```

`BasePythonExecutor` l'implémente naturellement. `PythonPlaygroundStore` aussi (en forwardant à son executor). `PythonEditor` accepte un prop `executor?: CompletionProvider | null` et fait un fallback :

```typescript
const provider = props.executor ?? pythonStore;
const completions = await provider.requestCompletion(code, pos);
```

Côté playground :

```svelte
<PythonEditor bind:value={pythonStore.code} executor={pythonStore.executor} … />
```

Côté notebook (par cellule) :

```svelte
<CodeCell editor={notebookStore.executor} … />
```

→ Chaque notebook autocomplete contre son propre namespace, sans pollution croisée.

---

## Flux d'exécution end-to-end

```
1. composant Svelte appelle    pythonStore.execute()
2. store forwarde              this._executor.execute(this.code)
3. executor génère un id, état → 'executing', arme le watchdog 30 s
4. executor postMessage        { type: 'execute', code, id, contextId: undefined }
5. worker reçoit, route au handler 'execute'
6. worker lazy-loads imports   → postMessage { type: 'packages-loading', … }
7. executor reçoit             → packagesLoading = […], loadingStage updated
8. worker exécute le code dans un dict() neuf
9. worker postMessage          stdout / latex / plot / plotly au fur et à mesure
10. executor accumule          this.stdout += …, plotData = …, etc.
11. worker postMessage         { type: 'complete', duration }
12. executor état → 'ready', appelle onExecutionComplete(duration)
13. PlaygroundExecutor.onExecutionComplete = no-op
14. composant Svelte voit pythonStore.state === 'ready' (réactivité)
```

Les messages `error` / `timeout` suivent le même cycle avec `onExecutionError`.

---

## Validation d'exercice : un cas particulier

`validateExercise(code, config)` est délibérément **isolée du flux réactif** :

```typescript
const result = await pythonStore.executor.validateExercise(code, {
  ast_requirements: [{ type: 'uses_loop', message: 'Use a loop' }],
  behavior: { kind: 'unit_test', function_name: 'sum_n', test_cases: [...] }
});
```

- N'altère pas `stdout` / `stderr` / `state` du store (l'élève peut continuer à voir sa dernière exécution `Run`).
- Tourne **en parallèle** d'un `execute` actif si besoin (le worker sérialise via sa queue interne).
- Le namespace de validation est éphémère, créé pour la durée du `validateExercise` puis détruit (anti-contamination).
- La promesse rejette seulement en cas de timeout ou worker détruit ; un test échoué résoud avec `valid: false`.

Utilisée par `ExerciseForm` (bouton "Vérifier") et par la page consultation exercice (bouton "Vérifier" + "Soumettre").

---

## Tests

```bash
# Lifecycle de l'executor (init, execute, cancel, destroy, autocomplete)
pnpm test:client src/lib/shared/python/execution/base-executor.svelte.test.ts             # 14 tests

# Validation d'exercice avec Pyodide réel (lent, ~30 s)
pnpm test:client src/lib/shared/python/execution/exercise-validation-real.svelte.test.ts  # 57 tests
```

L'executor abstrait est testé via une `TestExecutor` minimal qui implémente les 4 méthodes abstraites et expose les hooks pour assertion.

---

## Décisions de design (historique)

### Abstract class plutôt qu'interface

- **Implémentation partagée** — la logique worker/timeout/messages est identique entre playground et notebook.
- **Runes Svelte 5** — `$state` et `$derived` doivent vivre dans une **classe** pour rester réactifs ; une interface ne suffirait pas.
- **Type safety** — `abstract` impose au TypeScript de vérifier que les sous-classes implémentent.

### Getters pour le forwarding d'état (store → executor)

- **Réactivité préservée** — un getter `get stdout() { return this._executor.stdout; }` reste réactif côté consommateur Svelte.
- **Protection en lecture seule** — les consommateurs du store ne peuvent pas accidentellement muter l'état de l'executor.
- **API stable** — la surface publique de `pythonStore` est inchangée par rapport à avant le refactor (compat sémantique).

### Pas de système d'événements

On aurait pu utiliser `EventEmitter` ou pub/sub pour les hooks. On a préféré les méthodes virtuelles classiques :

- moins de boilerplate (pas de subscribe/unsubscribe à gérer dans `destroy()`)
- typage natif des hooks (signatures dans la classe abstraite)
- ordre d'exécution déterministe (overrides synchrones)

---

## Pointeurs

- Worker (l'autre côté du fil) → [`worker.md`](./worker.md)
- Store playground (consommateur principal) → [`store.md`](./store.md)
- Composants Svelte → [`components.md`](./components.md)
- Vue d'ensemble fonctionnelle → [`README.md`](./README.md)
- Refactor d'origine (Dec 2025) → [`progress/python-executor-pattern.md`](./progress/python-executor-pattern.md)
- Worker multi-context → [`progress/python-worker-multicontext.md`](./progress/python-worker-multicontext.md)
