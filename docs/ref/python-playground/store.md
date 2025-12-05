# Python Playground - Store

Complete documentation for `pythonPlayground.svelte.ts`, the reactive state management store.

## Overview

The store is implemented as a **Svelte 5 class** using runes (`$state`, `$derived`) and exported as a **singleton**. It manages:

- Pyodide Web Worker lifecycle
- Code execution state
- Output capture (stdout, stderr, plots, LaTeX)
- localStorage persistence
- URL sharing
- Autocompletion requests

## Location

```
src/lib/stores/pythonPlayground.svelte.ts
```

## Import

```typescript
import { pythonStore } from '$lib/stores/pythonPlayground.svelte';
```

## Type Definitions

### PlaygroundState

```typescript
type PlaygroundState =
	| 'initial' // Before Pyodide initialization
	| 'loading-pyodide' // Downloading Pyodide WASM
	| 'loading-packages' // Loading NumPy, Matplotlib, SymPy
	| 'ready' // Ready for execution
	| 'executing' // Code is running
	| 'error'; // Fatal error (worker crash)
```

### SerializedPlaygroundState

```typescript
interface SerializedPlaygroundState {
	code: string;
	showPedagogicErrors: boolean;
	fontSize?: number;
}
```

## State Properties

### Reactive State (`$state`)

| Property              | Type              | Default         | Description                        |
| --------------------- | ----------------- | --------------- | ---------------------------------- |
| `state`               | `PlaygroundState` | `'initial'`     | Current execution state            |
| `code`                | `string`          | Default example | Python code in editor              |
| `stdout`              | `string`          | `''`            | Standard output                    |
| `stderr`              | `string`          | `''`            | Standard error                     |
| `plotData`            | `string \| null`  | `null`          | Matplotlib base64 PNG data URL     |
| `plotlyData`          | `string \| null`  | `null`          | Plotly JSON specification          |
| `latexOutput`         | `string \| null`  | `null`          | SymPy LaTeX output                 |
| `loadingProgress`     | `number`          | `0`             | Pyodide loading progress (0-100)   |
| `loadingStage`        | `string`          | `''`            | Current Pyodide loading stage text |
| `packagesLoading`     | `string[]`        | `[]`            | Packages currently being loaded    |
| `loadedPackages`      | `string[]`        | `[]`            | Packages loaded in this session    |
| `showPedagogicErrors` | `boolean`         | `true`          | Show French error explanations     |
| `executionTime`       | `number`          | `0`             | Last execution duration (ms)       |
| `errorLine`           | `number \| null`  | `null`          | Error line for highlighting        |
| `fontSize`            | `number`          | `14`            | Editor font size (10-24)           |

### Derived State (`$derived`)

| Property            | Type      | Expression                                                                                                           |
| ------------------- | --------- | -------------------------------------------------------------------------------------------------------------------- |
| `isReady`           | `boolean` | `this.state === 'ready'`                                                                                             |
| `isExecuting`       | `boolean` | `this.state === 'executing'`                                                                                         |
| `isLoading`         | `boolean` | `this.state === 'loading-pyodide' \|\| this.state === 'loading-packages'`                                            |
| `isLoadingPackages` | `boolean` | `this.packagesLoading.length > 0`                                                                                    |
| `hasError`          | `boolean` | `this.state === 'error'`                                                                                             |
| `hasOutput`         | `boolean` | `stdout.length > 0 \|\| stderr.length > 0 \|\| plotData !== null \|\| plotlyData !== null \|\| latexOutput !== null` |
| `isModified`        | `boolean` | `this.code !== this._lastSavedCode`                                                                                  |

## Public Methods

### `initPyodide(): void`

Initialize the Web Worker and load Pyodide.

```typescript
pythonStore.initPyodide();
```

**Behavior**:

1. Check Web Worker support
2. Create worker from `../workers/pyodide.worker.ts`
3. Set up message handler with Zod validation
4. Send `{ type: 'init' }` to worker

**Called from**: `PythonPlayground.svelte` on mount

### `execute(): void`

Execute the current Python code.

```typescript
pythonStore.execute();
```

**Behavior**:

1. Generate unique execution ID
2. Set state to `'executing'`
3. Clear previous output
4. Set 35-second timeout (30s + 5s buffer)
5. Send `{ type: 'execute', code, id }` to worker

**Prerequisites**: `isReady === true`

### `cancel(): void`

Cancel the current execution.

```typescript
pythonStore.cancel();
```

**Behavior**:

1. Send `{ type: 'cancel', id }` to worker
2. Set state to `'ready'`
3. Clear timeout

### `clearOutput(): void`

Clear all output (stdout, stderr, plot, LaTeX).

```typescript
pythonStore.clearOutput();
```

### `resetCode(): void`

Reset code to the default example.

```typescript
pythonStore.resetCode();
```

**Default code**:

```python
# Python Playground - UbuMaths
# Exécute avec Ctrl+Entrée

import numpy as np
import matplotlib.pyplot as plt

# Exemple : tracer une fonction
x = np.linspace(-2 * np.pi, 2 * np.pi, 200)
y = np.sin(x)

plt.figure(figsize=(8, 4))
plt.plot(x, y, 'b-', linewidth=2)
plt.title('Fonction sinus')
plt.xlabel('x')
plt.ylabel('sin(x)')
plt.grid(True)
plt.show()

print("Valeur de sin(π/2) :", np.sin(np.pi/2))
```

### `setCode(code: string): void`

Set the Python code and trigger auto-save.

```typescript
pythonStore.setCode('print("Hello")');
```

### `saveCode(): boolean`

Immediately save code to localStorage (bypasses debounce).

```typescript
const success = pythonStore.saveCode();
```

**Returns**: `true` if saved successfully

### `togglePedagogicErrors(): void`

Toggle French error message display.

```typescript
pythonStore.togglePedagogicErrors();
```

### `increaseFontSize(): void`

Increase editor font size by 2px (max 24px).

```typescript
pythonStore.increaseFontSize();
```

### `decreaseFontSize(): void`

Decrease editor font size by 2px (min 10px).

```typescript
pythonStore.decreaseFontSize();
```

### `generateShareUrl(): string`

Generate a shareable URL with compressed code.

```typescript
const url = pythonStore.generateShareUrl();
// https://ubumaths.fr/python?code=NobwRAxg9gJg...
```

**Throws**: Error if compressed code > 2000 characters

### `loadFromUrl(url: URL): boolean`

Load code from URL query parameter.

```typescript
const loaded = pythonStore.loadFromUrl(new URL(window.location.href));
```

**Returns**: `true` if code was loaded successfully

### `requestCompletion(code: string, cursor: number): Promise<CompletionItem[]>`

Request Python autocompletion from Pyodide.

```typescript
const completions = await pythonStore.requestCompletion(code, 42);
// [{ label: 'print', type: 'function' }, ...]
```

**Features**:

- 150ms debounce
- 500ms timeout
- Cancels previous pending requests

### `destroy(): void`

Clean up resources (called on component unmount).

```typescript
pythonStore.destroy();
```

**Behavior**:

1. Terminate Web Worker
2. Clear all timeouts
3. Reject pending autocomplete requests
4. Reset state to `'initial'`

## Private Implementation

### Worker Management

```typescript
private worker: Worker | null = null;
private currentExecutionId: string | null = null;
private executionTimeout: ReturnType<typeof setTimeout> | null = null;
```

### Message Handling

```typescript
private handleWorkerMessage(message: FromWorkerMessage): void {
  switch (message.type) {
    case 'loading-progress':
      this.loadingProgress = message.percent;
      this.loadingStage = message.stage;
      break;

    case 'packages-loading':
      this.packagesLoading = message.packages;
      break;

    case 'packages-loaded':
      this.loadedPackages = [...new Set([...this.loadedPackages, ...message.packages])];
      this.packagesLoading = [];
      break;

    case 'pyodide-ready':
      this.state = 'ready';
      break;

    case 'stdout':
      if (message.id === this.currentExecutionId) {
        this.stdout += message.data;
      }
      break;

    case 'stderr':
      if (message.id === this.currentExecutionId) {
        this.stderr += message.data;
      }
      break;

    case 'plot':
      if (message.id === this.currentExecutionId) {
        this.plotData = `data:image/png;base64,${message.imageData}`;
      }
      break;

    case 'plotly':
      if (message.id === this.currentExecutionId) {
        this.plotlyData = message.jsonSpec;
      }
      break;

    case 'latex':
      if (message.id === this.currentExecutionId) {
        this.latexOutput = message.latex;
      }
      break;

    case 'error':
      if (message.id === this.currentExecutionId || message.id === '') {
        this.stderr = message.message;
        this.errorLine = message.line ?? null;
        this.state = message.id === '' ? 'error' : 'ready';
      }
      break;

    case 'complete':
      if (message.id === this.currentExecutionId) {
        this.executionTime = message.duration;
        this.state = 'ready';
      }
      break;

    case 'timeout':
      if (message.id === this.currentExecutionId) {
        this.stderr = "Délai d'exécution dépassé (30 secondes)";
        this.state = 'ready';
      }
      break;

    case 'autocomplete-result':
      this.handleAutocompleteResult(message.id, message.completions);
      break;
  }
}
```

### localStorage Persistence

```typescript
const STORAGE_KEY = 'ubumaths-python-playground';
const STORAGE_SAVE_DEBOUNCE_MS = 500;

private loadFromStorage(): void {
  const stored = localStorage.getItem(STORAGE_KEY);
  const parsed = JSON.parse(stored);
  this.code = parsed.code;
  this.showPedagogicErrors = parsed.showPedagogicErrors;
  this.fontSize = parsed.fontSize;
}

private saveToStorage(): void {
  // Debounced by 500ms
  const serialized = {
    code: this.code,
    showPedagogicErrors: this.showPedagogicErrors,
    fontSize: this.fontSize
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
}
```

### Autocompletion Management

```typescript
private pendingCompletions = new Map<string, {
  resolve: (completions: CompletionItem[]) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();

private autocompleteDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
private lastAutocompleteRequestId: string | null = null;

const AUTOCOMPLETE_TIMEOUT_MS = 500;
const AUTOCOMPLETE_DEBOUNCE_MS = 150;
```

## Zod Validation

All worker messages are validated with Zod:

```typescript
const fromWorkerMessageSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('loading-progress'),
		percent: z.number().min(0).max(100),
		stage: z.string()
	}),
	z.object({ type: z.literal('packages-loading'), packages: z.array(z.string()) }),
	z.object({ type: z.literal('packages-loaded'), packages: z.array(z.string()) }),
	z.object({ type: z.literal('pyodide-ready') }),
	z.object({ type: z.literal('stdout'), data: z.string(), id: z.string() }),
	z.object({ type: z.literal('stderr'), data: z.string(), id: z.string() }),
	z.object({ type: z.literal('plot'), imageData: z.string(), id: z.string() }),
	z.object({ type: z.literal('plotly'), jsonSpec: z.string(), id: z.string() }),
	z.object({
		type: z.literal('error'),
		message: z.string(),
		line: z.number().int().positive().optional(),
		id: z.string()
	}),
	z.object({
		type: z.literal('complete'),
		id: z.string(),
		duration: z.number().int().nonnegative()
	}),
	z.object({ type: z.literal('timeout'), id: z.string() }),
	z.object({ type: z.literal('latex'), latex: z.string(), id: z.string() }),
	z.object({
		type: z.literal('autocomplete-result'),
		completions: z.array(completionItemSchema),
		id: z.string()
	})
]);
```

## Constants

```typescript
const STORAGE_KEY = 'ubumaths-python-playground';
const STORAGE_SAVE_DEBOUNCE_MS = 500;
const TIMEOUT_BUFFER_MS = 5000;
const AUTOCOMPLETE_TIMEOUT_MS = 500;
const AUTOCOMPLETE_DEBOUNCE_MS = 150;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 24;
const DEFAULT_FONT_SIZE = 14;
```

## Usage Examples

### Basic Execution

```svelte
<script>
	import { pythonStore } from '$lib/stores/pythonPlayground.svelte';
	import { onMount, onDestroy } from 'svelte';

	onMount(() => pythonStore.initPyodide());
	onDestroy(() => pythonStore.destroy());

	function run() {
		pythonStore.execute();
	}
</script>

<textarea bind:value={pythonStore.code}></textarea>
<button onclick={run} disabled={!pythonStore.isReady}>Run</button>

{#if pythonStore.stdout}
	<pre>{pythonStore.stdout}</pre>
{/if}

{#if pythonStore.plotData}
	<img src={pythonStore.plotData} alt="Plot" />
{/if}

{#if pythonStore.plotlyData}
	<div id="plotly-container"></div>
{/if}
```

### Matplotlib Example

```python
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 10, 100)
y = np.sin(x)

plt.figure(figsize=(8, 4))
plt.plot(x, y, 'b-', linewidth=2)
plt.title('Sine wave')
plt.xlabel('x')
plt.ylabel('sin(x)')
plt.grid(True)
plt.show()
```

### Plotly Example

```python
import plotly.graph_objects as go
import numpy as np

x = np.linspace(0, 10, 100)
y = np.sin(x)

fig = go.Figure(data=go.Scatter(x=x, y=y, mode='lines'))
fig.update_layout(title='Sine Wave', xaxis_title='x', yaxis_title='sin(x)')

# Assign to global variable for extraction
_ubumaths_plotly_fig = fig
```

### Loading State

```svelte
{#if pythonStore.isLoading}
	<div class="loading">
		<p>{pythonStore.loadingStage}</p>
		<progress value={pythonStore.loadingProgress} max="100" />
	</div>
{/if}
```

### URL Sharing

```svelte
<script>
	async function share() {
		try {
			const url = pythonStore.generateShareUrl();
			await navigator.clipboard.writeText(url);
			alert('URL copied!');
		} catch (e) {
			alert(e.message);
		}
	}
</script>

<button onclick={share}>Share Code</button>
```

## Testing

```bash
pnpm test:client src/lib/stores/pythonPlayground.svelte.test.ts
```

45 tests covering:

- State transitions
- Code execution flow
- localStorage persistence
- URL compression/decompression
- Autocompletion requests
- Error handling
- Timeout behavior
