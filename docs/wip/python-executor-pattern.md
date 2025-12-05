# Python Executor Pattern

## Overview

This document describes the executor pattern used for Python code execution in UbuMaths. The pattern separates worker management and code execution logic from UI-specific concerns, enabling code reuse between the Playground and future Notebook features.

## Architecture

```
                    +-----------------------+
                    |  BasePythonExecutor   |  (Abstract)
                    +-----------------------+
                    | - Worker lifecycle    |
                    | - Message handling    |
                    | - Execution state     |
                    | - Autocompletion      |
                    +-----------+-----------+
                                |
          +---------------------+---------------------+
          |                                           |
+---------v---------+                     +-----------v-----------+
| PlaygroundExecutor |                     |   NotebookExecutor    |
+-------------------+                     |      (Future)         |
| contextId: undef  |                     +-----------------------+
| persistent: false |                     | contextId: string     |
+-------------------+                     | persistent: true      |
          |                               | Variable persistence  |
          |                               +-----------------------+
+---------v---------+
|PythonPlaygroundStore|
+-------------------+
| - Code management |
| - localStorage    |
| - Cloud save/load |
| - URL sharing     |
| - Editor settings |
+-------------------+
```

## Key Components

### 1. BasePythonExecutor (`src/lib/shared/python/execution/base-executor.svelte.ts`)

Abstract base class providing:

- **Reactive State (Svelte 5 runes)**
  - `state`: Executor lifecycle state (`initial` | `loading-pyodide` | `loading-packages` | `ready` | `executing` | `error`)
  - `stdout`, `stderr`: Execution output
  - `plotData`, `latexOutput`, `plotlyData`: Rich output types
  - `loadingProgress`, `loadingStage`: Progress indicators
  - `executionTime`, `errorLine`: Execution metadata
  - `packagesLoading`, `loadedPackages`: Package management
  - Derived states: `isReady`, `isExecuting`, `isLoading`, `hasError`, `hasOutput`

- **Worker Lifecycle**
  - `initPyodide()`: Initialize worker and Pyodide
  - `destroy()`: Terminate worker and cleanup resources

- **Execution Methods**
  - `execute(code)`: Run Python code
  - `cancel()`: Cancel current execution
  - `clearOutput()`: Clear all outputs

- **Autocompletion**
  - `requestCompletion(code, cursor)`: Get code completions with debouncing

- **Abstract Methods** (must be implemented by subclasses)
  - `getContextId()`: Return context ID for execution (undefined = isolated)
  - `isPersistentContext()`: Whether state persists across executions
  - `onExecutionComplete(duration)`: Hook for completion handling
  - `onExecutionError(message, line?)`: Hook for error handling

### 2. PlaygroundExecutor (`src/lib/shared/python/execution/playground-executor.svelte.ts`)

Concrete implementation for the Python Playground:

```typescript
export class PlaygroundExecutor extends BasePythonExecutor {
	getContextId(): string | undefined {
		return undefined; // Isolated execution
	}

	isPersistentContext(): boolean {
		return false; // State reset between runs
	}

	protected onExecutionComplete(_duration: number): void {
		// No additional handling needed
	}

	protected onExecutionError(_message: string, _line?: number): void {
		// No additional handling needed
	}
}
```

### 3. PythonPlaygroundStore (`src/lib/stores/pythonPlayground.svelte.ts`)

Uses composition to wrap the executor and add playground-specific features:

```typescript
class PythonPlaygroundStore {
	private executor = new PlaygroundExecutor();

	// Forward execution state via getters
	get state() {
		return this.executor.state;
	}
	get stdout() {
		return this.executor.stdout;
	}
	// ... other forwarded state

	// Playground-specific state
	code = $state(DEFAULT_CODE);
	fontSize = $state(14);
	editorTheme = $state<EditorTheme>('default');
	currentFile = $state<PythonFile | null>(null);

	// Forward execution methods
	initPyodide() {
		this.executor.initPyodide();
	}
	execute() {
		this.executor.execute(this.code);
	}
	cancel() {
		this.executor.cancel();
	}

	// Playground-specific methods
	saveToStorage() {
		/* ... */
	}
	saveToCloud() {
		/* ... */
	}
	generateShareUrl() {
		/* ... */
	}
}
```

## Backwards Compatibility

The refactoring maintains full backwards compatibility:

1. **Public API unchanged**: All existing methods and properties on `pythonStore` work exactly as before
2. **State forwarding**: Executor state is forwarded through getters, maintaining reactivity
3. **Type exports**: `PlaygroundState` is re-exported as an alias for `ExecutorState`

## Creating a NotebookExecutor (Future)

To create a notebook executor with persistent context:

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

	protected onExecutionComplete(duration: number): void {
		// Update cell execution state
		// Increment execution counter
		// etc.
	}

	protected onExecutionError(message: string, line?: number): void {
		// Update cell error state
		// Log to notebook history
		// etc.
	}
}
```

## File Locations

- Base executor: `src/lib/shared/python/execution/base-executor.svelte.ts`
- Playground executor: `src/lib/shared/python/execution/playground-executor.svelte.ts`
- Store: `src/lib/stores/pythonPlayground.svelte.ts`
- Types: `src/lib/shared/python/execution/types.ts`
- Shared types (CompletionProvider): `src/lib/shared/python/types.ts`
- Worker: `src/lib/workers/pyodide.worker.ts`
- Editor component: `src/lib/components/python/PythonEditor.svelte`

## Phase 1.4: PythonEditor Decoupling

The PythonEditor component was refactored to accept an optional `executor` prop for autocompletion, decoupling it from the pythonStore singleton.

### CompletionProvider Interface

```typescript
// src/lib/shared/python/types.ts
export interface CompletionProvider {
	requestCompletion: (code: string, cursor: number) => Promise<CompletionItem[]>;
}
```

### Editor Props

```typescript
// PythonEditor.svelte
let {
	value = $bindable(''),
	errorLine = null as number | null,
	disabled = false,
	fontSize = 14,
	theme = 'default' as EditorTheme,
	executor = null as CompletionProvider | null, // NEW: optional executor
	onExecute = () => {},
	onSave = () => {}
} = $props();
```

### Usage with Fallback

```typescript
// Uses provided executor or falls back to pythonStore
const provider = executor ?? pythonStore;
const completions = await provider.requestCompletion(code, pos);
```

### Store Exposes Executor

```typescript
// pythonPlayground.svelte.ts
get executor() {
	return this._executor;
}
```

### Playground Usage

```svelte
<PythonEditor bind:value={pythonStore.code} executor={pythonStore.executor} ... />
```

This enables future notebook cells to use their own executors for context-aware autocompletion.

## Design Decisions

### Composition over Inheritance for Store

The store uses composition (wrapping the executor) rather than inheriting from it because:

1. **Separation of concerns**: Store handles UI/persistence, executor handles execution
2. **Flexibility**: Store can add/modify behavior without affecting executor
3. **Testability**: Executor can be tested independently
4. **Future extensibility**: Easy to swap executors or add middleware

### Abstract Class for Executor

Using an abstract class rather than an interface because:

1. **Shared implementation**: Most worker/execution logic is identical across use cases
2. **Svelte 5 runes**: State declarations with `$state` and `$derived` are shared
3. **Type safety**: Abstract methods enforce required overrides
4. **Code reuse**: No duplication of worker lifecycle code

### Getters for State Forwarding

Using getters to forward executor state to the store because:

1. **Reactivity preserved**: Getters return live reactive values from executor
2. **Read-only protection**: Store consumers can't accidentally mutate executor state
3. **Transparency**: Store API matches original, consumers don't know about executor
