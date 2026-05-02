# Python Playground - Web Worker

Complete documentation for `pyodide.worker.ts`, the Pyodide Web Worker implementation.

## Overview

The worker runs Python code in a separate thread using **Pyodide** (Python compiled to WebAssembly). It handles:

- Pyodide initialization and package loading
- Python code execution with stdout/stderr capture
- Matplotlib plot extraction
- SymPy LaTeX conversion
- Python autocompletion via introspection
- Timeout management

## Location

```
src/lib/workers/pyodide.worker.ts
```

## Configuration

### Pyodide CDN

```typescript
const PYODIDE_CONFIG = {
	CDN_URL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
	PACKAGES: ['numpy', 'matplotlib', 'sympy'],
	TIMEOUT_MS: 30000 // 30 seconds
};
```

### Loading Stages

```typescript
const LOADING_STAGES = [
	{ percent: 0, stage: 'Initialisation...' },
	{ percent: 20, stage: 'Téléchargement de Python...' },
	{ percent: 50, stage: 'Chargement de NumPy...' },
	{ percent: 70, stage: 'Chargement de Matplotlib...' },
	{ percent: 90, stage: 'Chargement de SymPy...' },
	{ percent: 100, stage: 'Prêt !' }
];
```

## Message Protocol

### Incoming Messages (Main Thread → Worker)

```typescript
type ToWorkerMessage =
	| { type: 'init' }
	| { type: 'execute'; code: string; id: string }
	| { type: 'cancel'; id: string }
	| { type: 'autocomplete'; code: string; cursor: number; id: string };
```

### Outgoing Messages (Worker → Main Thread)

```typescript
type FromWorkerMessage =
	| { type: 'loading-progress'; percent: number; stage: string }
	| { type: 'packages-loading'; packages: string[] } // Packages loading
	| { type: 'packages-loaded'; packages: string[] } // Packages loaded
	| { type: 'pyodide-ready' }
	| { type: 'stdout'; data: string; id: string }
	| { type: 'stderr'; data: string; id: string }
	| { type: 'plot'; imageData: string; id: string } // Matplotlib PNG
	| { type: 'plotly'; jsonSpec: string; id: string } // Plotly interactive chart
	| { type: 'latex'; latex: string; id: string }
	| { type: 'error'; message: string; line?: number; id: string }
	| { type: 'complete'; id: string; duration: number }
	| { type: 'timeout'; id: string }
	| { type: 'autocomplete-result'; completions: CompletionItem[]; id: string };
```

## Initialization Flow

### `initializePyodide()`

```typescript
async function initializePyodide(): Promise<void> {
	// Stage 0: Initializing
	sendProgress(0, 'Initialisation...');

	// Load Pyodide module from CDN
	const loadPyodide = await loadPyodideModule();

	// Stage 1: Downloading Python (stdlib only)
	sendProgress(20, 'Téléchargement de Python...');

	pyodide = await loadPyodide({
		indexURL: PYODIDE_CONFIG.CDN_URL
	});

	// Configure matplotlib for non-interactive rendering
	await pyodide.runPythonAsync(PYTHON_SETUP_CODE);

	// Stage 5: Ready (packages loaded on-demand)
	postMessage({ type: 'pyodide-ready' });
}
```

### Lazy Package Loading

Packages are loaded on-demand using `loadRequiredPackages()` when user code imports them:

```typescript
async function loadRequiredPackages(code: string): Promise<void> {
	const requiredPackages = getRequiredPackages(code);

	if (requiredPackages.length > 0) {
		// Send to main thread which packages are loading
		postMessage({
			type: 'packages-loading',
			packages: requiredPackages
		});

		try {
			// Use Pyodide's loadPackagesFromImports()
			await pyodide.loadPackagesFromImports(code);

			postMessage({
				type: 'packages-loaded',
				packages: requiredPackages
			});
		} catch (error) {
			throw new Error(`Failed to load packages: ${error.message}`);
		}
	}
}
```

### Standard Library Detection

The `STDLIB_MODULES` set filters out standard library imports to avoid unnecessary loading:

```typescript
const STDLIB_MODULES = new Set([
	'sys',
	'os',
	'math',
	're',
	'json',
	'datetime',
	'collections',
	'itertools',
	'functools',
	'io',
	'pickle',
	'csv',
	'random',
	'statistics',
	'pathlib',
	'tempfile',
	'time',
	'timeit',
	'string'
	// ... all Python 3.12 stdlib
]);

function getRequiredPackages(code: string): string[] {
	const importRegex = /^(?:from|import)\s+([\w.]+)/gm;
	const matches = [...code.matchAll(importRegex)];
	const packages = new Set<string>();

	for (const match of matches) {
		const module = match[1].split('.')[0];
		// Only include third-party packages, not stdlib
		if (!STDLIB_MODULES.has(module)) {
			packages.add(module);
		}
	}

	return Array.from(packages);
}
```

## Python Helper Functions

Injected during initialization for use by the worker:

### `_ubumaths_get_plot_base64()`

Extract Matplotlib figure as base64 PNG:

```python
def _ubumaths_get_plot_base64():
    """Extract current matplotlib figure as base64 PNG."""
    if len(plt.get_fignums()) == 0:
        return None
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight', facecolor='white')
    buf.seek(0)
    result = base64.b64encode(buf.read()).decode('utf-8')
    plt.close('all')
    return result
```

### `_ubumaths_get_plotly_json()`

Extract Plotly figure as JSON specification:

```python
def _ubumaths_get_plotly_json():
    """Extract Plotly figure as JSON spec for interactive rendering."""
    if not hasattr(_ubumaths_plotly_fig, 'to_json'):
        return None
    try:
        json_spec = _ubumaths_plotly_fig.to_json()
        _ubumaths_plotly_fig = None  # Clear for next execution
        return json_spec
    except Exception:
        return None
```

**Note**: Users call `plotly.graph_objects.Figure` or `plotly.express` directly; the worker captures the global `_ubumaths_plotly_fig` variable set by user code.

### `_ubumaths_cleanup()`

Clean up after execution:

```python
def _ubumaths_cleanup():
    """Clean up matplotlib figures and run garbage collection."""
    plt.close('all')
    gc.collect()
```

### `_ubumaths_check_sympy_result(result)`

Detect SymPy expressions and convert to LaTeX:

```python
def _ubumaths_check_sympy_result(result):
    """Check if result is a sympy expression and convert to LaTeX."""
    if result is None:
        return None
    try:
        if hasattr(result, '__class__') and hasattr(result.__class__, '__module__'):
            if result.__class__.__module__.startswith('sympy'):
                import sympy
                return sympy.latex(result)
    except:
        pass
    return None
```

### `_ubumaths_reformat_exception()`

Format Python exceptions concisely:

```python
def _ubumaths_reformat_exception():
    """Reformat the last Python exception.
    Returns only the essential error message (last line of traceback).
    """
    import sys
    from traceback import format_exception

    exc = sys.last_exc if hasattr(sys, 'last_exc') else sys.last_value

    if exc is None:
        return None

    full_tb = format_exception(type(exc), exc, exc.__traceback__)

    # Extract line info and final error message
    line_info = None
    error_msg = None

    for line in full_tb:
        line = line.rstrip()
        if 'File "<' in line and ', line ' in line:
            line_info = line.strip()
        elif line and not line.startswith(' ') and not line.startswith('Traceback'):
            error_msg = line

    if error_msg:
        if line_info:
            return line_info + chr(10) + error_msg
        return error_msg

    return "".join(full_tb)
```

### `_ubumaths_get_completions(code, cursor_pos)`

Python introspection for autocompletion:

```python
def _ubumaths_get_completions(code, cursor_pos):
    """Get completions for Python code at cursor position."""
    import re
    import builtins
    import keyword

    MAX_COMPLETIONS = 50
    code_before_cursor = code[:cursor_pos]

    # Find word being typed: "np.lin" or "prin"
    match = re.search(
        r'([a-zA-Z_][a-zA-Z0-9_]*(?:[.][a-zA-Z_][a-zA-Z0-9_]*)*)[.]?([a-zA-Z_][a-zA-Z0-9_]*)?$',
        code_before_cursor
    )

    if not match:
        return []

    def get_type(obj):
        if isinstance(obj, type):
            return 'class'
        elif callable(obj):
            return 'function'
        elif isinstance(obj, type(re)):
            return 'module'
        else:
            return 'variable'

    full_match = match.group(0)

    # Attribute completion: "np.lin" → dir(np) filtered by "lin"
    if '.' in full_match:
        parts = full_match.split('.')
        obj_path = '.'.join(parts[:-1])
        prefix = parts[-1]

        try:
            obj = eval(obj_path, globals())
            completions = []
            for attr in dir(obj):
                if attr.startswith(prefix) and not attr.startswith('_'):
                    try:
                        val = getattr(obj, attr)
                        comp_type = get_type(val)
                    except:
                        comp_type = 'property'
                    completions.append({'label': attr, 'type': comp_type})
            return completions[:MAX_COMPLETIONS]
        except:
            return []

    # Global completion: "prin" → globals + builtins + keywords
    else:
        prefix = full_match
        completions = []

        all_names = set(globals().keys())
        all_names.update(dir(builtins))

        for name in all_names:
            if name.startswith(prefix) and not name.startswith('_'):
                try:
                    if name in globals():
                        val = globals()[name]
                    else:
                        val = getattr(builtins, name, None)
                    comp_type = get_type(val) if val is not None else 'variable'
                except:
                    comp_type = 'variable'
                completions.append({'label': name, 'type': comp_type})

        # Add keywords
        for kw in keyword.kwlist:
            if kw.startswith(prefix):
                completions.append({'label': kw, 'type': 'keyword'})

        return completions[:MAX_COMPLETIONS]
```

## Code Execution

### `executeCode(code: string, id: string)`

Main execution function with lazy package loading:

```typescript
async function executeCode(code: string, id: string): Promise<void> {
	currentExecutionId = id;
	const startTime = performance.now();

	// Set up timeout (30 seconds)
	executionTimeout = setTimeout(() => {
		postMessage({ type: 'timeout', id });
		currentExecutionId = null;
	}, PYODIDE_CONFIG.TIMEOUT_MS);

	try {
		// 1. Lazy-load required packages based on imports
		await loadRequiredPackages(code);

		// 2. Redirect stdout/stderr
		await pyodide.runPythonAsync(`
      import sys
      from io import StringIO

      _ubumaths_stdout = StringIO()
      _ubumaths_stderr = StringIO()
      sys.stdout = _ubumaths_stdout
      sys.stderr = _ubumaths_stderr
    `);

		// 3. Execute user code with AST parsing for SymPy detection
		await pyodide.runPythonAsync(`
      import ast

      _ubumaths_last_result = None
      _ubumaths_plotly_fig = None
      _ubumaths_user_code = ${JSON.stringify(code)}

      _ubumaths_tree = ast.parse(_ubumaths_user_code)

      if _ubumaths_tree.body:
          _ubumaths_last_node = _ubumaths_tree.body[-1]

          if isinstance(_ubumaths_last_node, ast.Expr):
              # Execute all but last, then eval last expression
              if len(_ubumaths_tree.body) > 1:
                  _ubumaths_init_tree = ast.Module(body=_ubumaths_tree.body[:-1], type_ignores=[])
                  exec(compile(_ubumaths_init_tree, '<exec>', 'exec'))

              _ubumaths_expr_tree = ast.Expression(body=_ubumaths_last_node.value)
              _ubumaths_last_result = eval(compile(_ubumaths_expr_tree, '<expr>', 'eval'))
          else:
              exec(_ubumaths_user_code)
    `);

		// 4. Capture stdout
		const stdout = pyodide.runPython(`
      sys.stdout = _ubumaths_old_stdout
      _ubumaths_stdout.getvalue()
    `);
		if (stdout.trim()) {
			postMessage({ type: 'stdout', data: stdout, id });
		}

		// 5. Capture stderr
		const stderr = pyodide.runPython(`
      sys.stderr = _ubumaths_old_stderr
      _ubumaths_stderr.getvalue()
    `);
		if (stderr.trim()) {
			postMessage({ type: 'stderr', data: stderr, id });
		}

		// 6. Check for SymPy LaTeX output
		const latex = pyodide.runPython('_ubumaths_check_sympy_result(_ubumaths_last_result)');
		if (latex) {
			postMessage({ type: 'latex', latex, id });
		}

		// 7. Check for Matplotlib plots
		const plotData = pyodide.runPython('_ubumaths_get_plot_base64()');
		if (plotData) {
			postMessage({ type: 'plot', imageData: plotData, id });
		}

		// 8. Check for Plotly interactive charts
		const plotlyJson = pyodide.runPython('_ubumaths_get_plotly_json()');
		if (plotlyJson) {
			postMessage({ type: 'plotly', jsonSpec: plotlyJson, id });
		}

		// 9. Cleanup
		pyodide.runPython('_ubumaths_cleanup()');

		// 10. Send completion
		const duration = Math.round(performance.now() - startTime);
		postMessage({ type: 'complete', id, duration });
	} catch (error) {
		// Extract and send error message
		const errorMessage = await getFormattedError(error);
		const lineNumber = extractLineNumber(errorMessage);
		postMessage({ type: 'error', message: errorMessage, line: lineNumber, id });
	} finally {
		clearTimeout(executionTimeout);
		currentExecutionId = null;
	}
}
```

### Error Line Extraction

```typescript
function extractLineNumber(errorMessage: string): number | undefined {
	// Match: File "<exec>", line X or File "<expr>", line X
	const userCodeRegex = /File\s+"<(?:exec|expr|unknown)>",\s+line\s+(\d+)/gi;
	const matches = [...errorMessage.matchAll(userCodeRegex)];

	if (matches.length > 0) {
		// Take the LAST match (actual error location in traceback)
		const lastMatch = matches[matches.length - 1];
		return parseInt(lastMatch[1], 10);
	}

	// Fallback: any "line X" pattern
	const lineMatch = errorMessage.match(/line\s+(\d+)/i);
	if (lineMatch) {
		return parseInt(lineMatch[1], 10);
	}

	return undefined;
}
```

## Autocompletion Handling

```typescript
async function handleAutocomplete(code: string, cursor: number, id: string): Promise<void> {
	if (!pyodide) {
		postMessage({ type: 'autocomplete-result', completions: [], id });
		return;
	}

	try {
		// Set parameters for Python helper
		pyodide.globals.set('_ubumaths_autocomplete_code', code);
		pyodide.globals.set('_ubumaths_autocomplete_cursor', cursor);

		// Call Python completion function
		const result = await pyodide.runPythonAsync(`
      _ubumaths_get_completions(_ubumaths_autocomplete_code, _ubumaths_autocomplete_cursor)
    `);

		// Convert PyProxy to JavaScript
		const jsResult = result.toJs();

		// Validate and type completions
		const validTypes = ['function', 'variable', 'module', 'class', 'property', 'keyword'];
		const safeCompletions = jsResult
			.filter((item) => item && typeof item.label === 'string' && typeof item.type === 'string')
			.map((item) => ({
				label: item.label,
				type: validTypes.includes(item.type) ? item.type : 'variable'
			}));

		postMessage({ type: 'autocomplete-result', completions: safeCompletions, id });
	} catch (error) {
		console.warn('[Pyodide Worker] Autocomplete error:', error);
		postMessage({ type: 'autocomplete-result', completions: [], id });
	}
}
```

## Message Handler

Main entry point for worker messages:

```typescript
self.onmessage = async (event: MessageEvent<unknown>) => {
	// Validate message with Zod
	const validation = toWorkerMessageSchema.safeParse(event.data);
	if (!validation.success) {
		console.error('[Pyodide Worker] Invalid message:', validation.error.issues);
		return;
	}

	const message = validation.data;

	switch (message.type) {
		case 'init':
			await initializePyodide();
			break;

		case 'execute':
			await executeCode(message.code, message.id);
			break;

		case 'cancel':
			cancelExecution(message.id);
			break;

		case 'autocomplete':
			await handleAutocomplete(message.code, message.cursor, message.id);
			break;
	}
};
```

## Cancellation

```typescript
function cancelExecution(id: string): void {
	if (currentExecutionId === id) {
		currentExecutionId = null;
		if (executionTimeout) {
			clearTimeout(executionTimeout);
			executionTimeout = null;
		}
	}
}
```

Note: True Python execution cancellation is not possible in WebAssembly. Cancellation:

- Stops processing of results for the cancelled execution
- Prevents timeout message from being sent
- Future messages with cancelled ID are ignored

## Zod Validation

All incoming messages are validated:

```typescript
const toWorkerMessageSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('init') }),
	z.object({ type: z.literal('execute'), code: z.string(), id: z.string() }),
	z.object({ type: z.literal('cancel'), id: z.string() }),
	z.object({
		type: z.literal('autocomplete'),
		code: z.string(),
		cursor: z.number().int().nonnegative(),
		id: z.string()
	})
]);
```

## Matplotlib Configuration

Configured for non-interactive (AGG) rendering:

```python
import matplotlib
matplotlib.use('AGG')
import matplotlib.pyplot as plt
import warnings

# Suppress "cannot show figure" warning from plt.show()
warnings.filterwarnings(
  'ignore',
  message='.*Matplotlib.*using.*agg.*cannot show.*',
  category=UserWarning
)
```

## Memory Management

### Figure Cleanup

Every execution cleans up matplotlib figures:

```python
plt.close('all')
gc.collect()
```

### Worker Creation

The worker is created with Vite's URL pattern:

```typescript
this.worker = new Worker(new URL('../workers/pyodide.worker.ts', import.meta.url), {
	type: 'module'
});
```

### Worker Termination

On component unmount, the worker is terminated:

```typescript
this.worker.terminate();
```

## Security Considerations

1. **Sandboxed execution**: Worker runs in separate thread
2. **No DOM access**: Worker cannot manipulate the DOM
3. **No network access**: Pyodide cannot make HTTP requests
4. **Virtual filesystem**: Only Pyodide's in-memory FS
5. **Timeout protection**: 30-second max execution
6. **Input validation**: Zod schemas on all messages

## Performance Notes

1. **Initial load**: ~15-20MB for Pyodide + packages
2. **Cached**: Browser caches Pyodide after first load
3. **Parallel loading**: All packages loaded in one `loadPackage()` call
4. **Non-blocking**: Main thread stays responsive during execution
5. **AST parsing**: User code is parsed to detect trailing expressions for SymPy

## Debugging

Worker console logs are prefixed:

```typescript
console.log('[Pyodide Worker] Worker initialized and ready');
console.log('[Pyodide]', msg); // Package loading messages
console.warn('[Pyodide Worker] Autocomplete error:', error);
console.warn('[Pyodide Worker] Cleanup error:', cleanupError);
```

## Type Definitions

See `src/lib/types/python-worker.ts` for:

- `ToWorkerMessage` - Messages to worker
- `FromWorkerMessage` - Messages from worker
- `CompletionItem` - Autocompletion item
- `PyodideInterface` - Pyodide API interface
- `LoadPyodideFunc` - loadPyodide function type
- `PYODIDE_CONFIG` - Configuration constants
- `LOADING_STAGES` - Loading progress stages
