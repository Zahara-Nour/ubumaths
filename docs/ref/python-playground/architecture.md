# Python Playground - Architecture

Detailed architecture documentation for the Python Playground feature.

## System Design

### Design Principles

1. **Non-blocking execution**: Python runs in a Web Worker to keep UI responsive
2. **Type safety**: Full TypeScript with Zod validation for worker messages
3. **Reactive state**: Svelte 5 runes for automatic UI updates
4. **Progressive enhancement**: Fallback textarea if CodeMirror fails to load
5. **Offline-capable**: Pyodide cached by browser after first load

### Technology Choices

#### Why Pyodide?

- **Full CPython**: Real Python 3.12+, not a subset
- **Scientific stack**: NumPy, Matplotlib, SymPy work out of the box
- **No server**: Everything runs client-side
- **WebAssembly**: Near-native performance for computation

#### Why Web Worker?

- **Non-blocking**: Python execution doesn't freeze the UI
- **Timeout handling**: Can interrupt runaway code
- **Memory isolation**: Python memory separate from main thread
- **Clean messaging**: Structured postMessage communication

#### Why CodeMirror 6?

- **Modern architecture**: Modular, tree-shakeable
- **Excellent Python support**: Syntax highlighting, indentation
- **Extensible**: Custom autocompletion integration
- **Performance**: Virtual rendering for large files

## Data Flow

### Bidirectional Communication

```
┌─────────────────────────────────────────────────────────────────┐
│                        MAIN THREAD                              │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │   Editor    │◄──►│   Store     │◄──►│      Output         │  │
│  │ (CodeMirror)│    │  (pythonStore)   │   (Results)         │  │
│  └─────────────┘    └──────┬──────┘    └─────────────────────┘  │
│                            │                                    │
│                            │ postMessage                        │
└────────────────────────────┼────────────────────────────────────┘
                             │
                     ┌───────▼───────┐
                     │  MessagePort  │
                     └───────┬───────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                            │                                    │
│                     WEB WORKER                                  │
│                                                                 │
│  ┌─────────────────────────▼─────────────────────────────────┐  │
│  │                   Message Handler                          │  │
│  │   switch(message.type) {                                   │  │
│  │     case 'init': initializePyodide()                       │  │
│  │     case 'execute': executeCode()                          │  │
│  │     case 'cancel': cancelExecution()                       │  │
│  │     case 'autocomplete': handleAutocomplete()              │  │
│  │   }                                                        │  │
│  └─────────────────────────┬─────────────────────────────────┘  │
│                            │                                    │
│  ┌─────────────────────────▼─────────────────────────────────┐  │
│  │                      Pyodide                               │  │
│  │   ┌─────────┐ ┌─────────────┐ ┌─────────────┐             │  │
│  │   │  NumPy  │ │ Matplotlib  │ │   SymPy     │             │  │
│  │   └─────────┘ └─────────────┘ └─────────────┘             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Message Types

#### Main Thread → Worker

```typescript
type ToWorkerMessage =
	| { type: 'init' } // Initialize Pyodide
	| { type: 'execute'; code: string; id: string } // Run Python code
	| { type: 'cancel'; id: string } // Cancel execution
	| { type: 'autocomplete'; code: string; cursor: number; id: string };
```

#### Worker → Main Thread

```typescript
type FromWorkerMessage =
	| { type: 'loading-progress'; percent: number; stage: string }
	| { type: 'packages-loading'; packages: string[] } // Packages being loaded
	| { type: 'packages-loaded'; packages: string[] } // Packages loaded
	| { type: 'pyodide-ready' }
	| { type: 'stdout'; data: string; id: string }
	| { type: 'stderr'; data: string; id: string }
	| { type: 'plot'; imageData: string; id: string } // Matplotlib PNG
	| { type: 'plotly'; jsonSpec: string; id: string } // Plotly JSON
	| { type: 'latex'; latex: string; id: string } // SymPy LaTeX
	| { type: 'error'; message: string; line?: number; id: string }
	| { type: 'complete'; id: string; duration: number }
	| { type: 'timeout'; id: string }
	| { type: 'autocomplete-result'; completions: CompletionItem[]; id: string };
```

### Execution ID System

Every execution has a unique ID to prevent race conditions:

```typescript
const executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2)}`;
```

This ensures:

- Messages from old executions are ignored
- Cancellation targets the correct execution
- Timeout handling is precise

## Component Architecture

### Hierarchy

```
+page.svelte
│
└── PythonPlayground.svelte (container)
    │
    ├── PythonToolbar.svelte
    │   └── Action buttons with event handlers
    │
    ├── PythonEditor.svelte
    │   ├── CodeMirror 6 instance
    │   ├── Error line highlighting
    │   └── Autocompletion integration
    │
    ├── PythonSplitter.svelte (desktop only)
    │   └── Draggable resize handle
    │
    └── PythonOutput.svelte
        ├── stdout display
        ├── stderr display (with pedagogic messages)
        ├── Plot display (with download)
        └── LaTeX display (MathLive)
```

### Props Flow

```
                    pythonStore (singleton)
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌──────────────┐ ┌──────────┐ ┌────────────┐
    │ Toolbar      │ │ Editor   │ │ Output     │
    │              │ │          │ │            │
    │ canExecute   │ │ value    │ │ stdout     │
    │ isExecuting  │ │ errorLine│ │ stderr     │
    │ isModified   │ │ fontSize │ │ plotData   │
    │ fontSize     │ │          │ │ latexOutput│
    └──────────────┘ └──────────┘ └────────────┘
```

## State Management

### Store Class (Svelte 5 Runes)

```typescript
class PythonPlaygroundStore {
	// Reactive state
	state = $state<PlaygroundState>('initial');
	code = $state(DEFAULT_CODE);
	stdout = $state('');
	stderr = $state('');
	plotData = $state<string | null>(null);
	latexOutput = $state<string | null>(null);
	fontSize = $state(14);
	errorLine = $state<number | null>(null);

	// Derived state
	isReady = $derived(this.state === 'ready');
	isExecuting = $derived(this.state === 'executing');
	isLoading = $derived(this.state === 'loading-pyodide' || this.state === 'loading-packages');
	hasOutput = $derived(this.stdout.length > 0 || this.stderr.length > 0 || this.plotData !== null);
}

export const pythonStore = new PythonPlaygroundStore();
```

### State Transitions

```
initial ──initPyodide()──► loading-pyodide
                               │
                               ▼
                         loading-packages
                               │
                               ▼
ready ◄─────complete/error/timeout──── executing
  │                                        ▲
  └────────────execute()───────────────────┘
```

## Error Handling

### Layer 1: Worker Errors

```typescript
this.worker.onerror = (event: ErrorEvent) => {
	this.state = 'error';
	this.stderr = `Erreur du worker: ${event.message}`;
};
```

### Layer 2: Python Errors

```python
def _ubumaths_reformat_exception():
    """Extract concise error message from Python traceback."""
    # Returns: "File '<exec>', line 5\nNameError: name 'x' is not defined"
```

### Layer 3: Timeout Protection

```typescript
// Main thread timeout (backup)
this.executionTimeout = setTimeout(() => {
	this.stderr = "Délai d'exécution dépassé (30 secondes)";
	this.state = 'ready';
	this.postToWorker({ type: 'cancel', id: executionId });
}, PYODIDE_CONFIG.TIMEOUT_MS + TIMEOUT_BUFFER_MS);

// Worker timeout (primary)
executionTimeout = setTimeout(() => {
	postMessage({ type: 'timeout', id });
}, PYODIDE_CONFIG.TIMEOUT_MS);
```

### Layer 4: Pedagogic Messages

```typescript
const ERROR_TRANSLATIONS = {
	syntaxError: {
		pattern: /SyntaxError:\s*(.+)/i,
		message: 'Erreur de syntaxe : vérifiez la ponctuation...'
	},
	nameError: {
		pattern: /NameError:\s*name\s+'([^']+)'\s+is not defined/i,
		message: "Variable non définie : '$1' n'existe pas..."
	}
	// ... 11 more error types
};
```

## URL Sharing System

### Compression

Uses LZ-String for efficient URL-safe compression:

```typescript
import LZString from 'lz-string';

generateShareUrl(): string {
  const compressed = LZString.compressToEncodedURIComponent(this.code);
  if (compressed.length > 2000) {
    throw new Error('Le code est trop long pour être partagé via URL');
  }
  const url = new URL(window.location.href);
  url.searchParams.set('code', compressed);
  return url.toString();
}

loadFromUrl(url: URL): boolean {
  const codeParam = url.searchParams.get('code');
  const decompressed = LZString.decompressFromEncodedURIComponent(codeParam);
  this.code = decompressed;
  return true;
}
```

### URL Structure

```
https://ubumaths.fr/python?code=NobwRAxg9gJgpmAXGA9CgBAFQBYEsDO...
                          └─────────────────────────────────────┘
                               LZ-String compressed Python code
```

## Autocompletion System

### Flow

```
1. User types in editor
       │
2. CodeMirror calls pythonCompletions()
       │
3. Match word before cursor: /[\w.]+/
       │
4. Debounce 150ms
       │
5. Send to worker: { type: 'autocomplete', code, cursor }
       │
6. Worker: Python introspection
   - For "np.": dir(np) + getattr() for types
   - For "pri": globals() + builtins + keywords
       │
7. Return completions with types
       │
8. Map to CodeMirror format
```

### Python Introspection

```python
def _ubumaths_get_completions(code, cursor_pos):
    """Get completions at cursor position."""

    # For "np.lin" → complete np attributes starting with "lin"
    if '.' in word:
        obj = eval(base_path)
        return [
            {'label': attr, 'type': get_type(getattr(obj, attr))}
            for attr in dir(obj)
            if attr.startswith(prefix)
        ]

    # For "prin" → complete from globals + builtins + keywords
    else:
        return [
            {'label': name, 'type': get_type(globals().get(name))}
            for name in all_names
            if name.startswith(prefix)
        ]
```

## Responsive Design

### Breakpoints

```css
/* Mobile (< lg) */
flex-direction: column;
/* Editor on top, Output below */

/* Desktop (>= lg) */
flex-direction: row;
/* Editor left, Splitter, Output right */
```

### Splitter Constraints

```typescript
const MIN_WIDTH = 20; // Left panel minimum 20%
const MAX_WIDTH = 80; // Left panel maximum 80%
const DEFAULT_WIDTH = 50;
```

## Memory Management

### Worker Cleanup

```python
def _ubumaths_cleanup():
    """Clean up after execution."""
    plt.close('all')  # Close matplotlib figures
    gc.collect()      # Force garbage collection
```

### Main Thread Cleanup

```typescript
destroy(): void {
  this.worker?.terminate();
  this.clearExecutionTimeout();
  // Reject pending autocomplete requests
  for (const pending of this.pendingCompletions.values()) {
    pending.reject(new Error('Worker destroyed'));
  }
}
```

## Loading Stages

### Initial Pyodide Load

```typescript
const LOADING_STAGES = [
	{ percent: 0, stage: 'Initialisation...' },
	{ percent: 20, stage: 'Téléchargement de Python...' },
	{ percent: 100, stage: 'Prêt !' }
];
```

### Lazy Package Loading

When code imports numpy, matplotlib, or sympy:

```typescript
// Sent to main thread
{ type: 'packages-loading', packages: ['numpy'] }
// After loading
{ type: 'packages-loaded', packages: ['numpy'] }
```

Packages are cached after first load (no re-download on subsequent executions).

### Plotly Loading

Plotly.js is loaded from CDN on-demand when `plotlyData` message is received:

```typescript
const PLOTLY_CDN = 'https://cdn.plot.ly/plotly-2.27.0.min.js';

// Loaded and cached in browser
// No additional messages - renders directly in component
```

## Zod Validation

All messages are validated with Zod schemas:

```typescript
// Worker → Main validation
const fromWorkerMessageSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('loading-progress'), percent: z.number(), stage: z.string() }),
	z.object({ type: z.literal('pyodide-ready') }),
	z.object({ type: z.literal('stdout'), data: z.string(), id: z.string() })
	// ... more message types
]);

// In message handler
const validation = fromWorkerMessageSchema.safeParse(event.data);
if (!validation.success) {
	console.error('Invalid worker message:', validation.error.issues);
	return;
}
```
