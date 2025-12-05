/// <reference lib="webworker" />

/**
 * Pyodide Web Worker
 *
 * Runs Python code in a separate thread using Pyodide.
 * Handles loading, package management, and code execution.
 */

import type {
	FromWorkerMessage,
	PyodideInterface,
	LoadPyodideFunc
} from '$lib/types/python-worker';
import { PYODIDE_CONFIG, LOADING_STAGES, LoadingStageIndex } from '$lib/types/python-worker';
import { z } from 'zod';

// =============================================================================
// Zod Schema for Message Validation
// =============================================================================

/**
 * Schema for validating messages from the main thread
 */
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

// =============================================================================
// Worker Global Declarations
// =============================================================================

declare const self: DedicatedWorkerGlobalScope;

// =============================================================================
// State
// =============================================================================

let pyodide: PyodideInterface | null = null;
let currentExecutionId: string | null = null;
let executionTimeout: ReturnType<typeof setTimeout> | null = null;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Send a message to the main thread
 */
function postMessage(message: FromWorkerMessage): void {
	self.postMessage(message);
}

/**
 * Send loading progress to main thread
 */
function sendProgress(percent: number, stage: string): void {
	postMessage({ type: 'loading-progress', percent, stage });
}

/**
 * Find and send the appropriate loading stage
 */
function sendLoadingStage(stageIndex: number): void {
	const stage = LOADING_STAGES[stageIndex];
	if (stage) {
		sendProgress(stage.percent, stage.stage);
	}
}

// =============================================================================
// Pyodide Initialization
// =============================================================================

/**
 * Load Pyodide module from CDN using dynamic import
 * @returns The loadPyodide function from the Pyodide module
 */
async function loadPyodideModule(): Promise<LoadPyodideFunc> {
	const pyodideUrl = `${PYODIDE_CONFIG.CDN_URL}pyodide.mjs`;

	try {
		// Use dynamic import for ES module worker
		const pyodideModule = await import(/* @vite-ignore */ pyodideUrl);
		return pyodideModule.loadPyodide as LoadPyodideFunc;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Échec du chargement du module Pyodide: ${message}`);
	}
}

/**
 * Initialize Pyodide and load required packages
 */
async function initializePyodide(): Promise<void> {
	try {
		// Stage 0: Initializing
		sendLoadingStage(LoadingStageIndex.INITIALIZING);

		// Load Pyodide module
		const loadPyodide = await loadPyodideModule();

		// Stage 1: Downloading Python
		sendLoadingStage(LoadingStageIndex.DOWNLOADING_PYTHON);

		// Initialize Pyodide
		pyodide = await loadPyodide({
			indexURL: PYODIDE_CONFIG.CDN_URL
		});

		// Load all packages in parallel for better performance
		// Stage 2: Loading packages (show NumPy as first visible package)
		sendLoadingStage(LoadingStageIndex.LOADING_NUMPY);

		// Load all packages at once - Pyodide handles dependencies automatically
		await pyodide.loadPackage([...PYODIDE_CONFIG.PACKAGES], {
			messageCallback: (msg: string) => {
				console.log('[Pyodide]', msg);
				// Update progress based on package loading messages
				if (msg.includes('matplotlib')) {
					sendLoadingStage(LoadingStageIndex.LOADING_MATPLOTLIB);
				} else if (msg.includes('sympy')) {
					sendLoadingStage(LoadingStageIndex.LOADING_SYMPY);
				}
			}
		});

		// Configure matplotlib for non-interactive use
		await pyodide.runPythonAsync(`
import matplotlib
matplotlib.use('AGG')
import matplotlib.pyplot as plt
import io
import base64
import sys
import gc
import warnings
from io import StringIO

# Suppress the "cannot show figure" warning from plt.show()
warnings.filterwarnings('ignore', message='.*Matplotlib.*using.*agg.*cannot show.*', category=UserWarning)

# Helper function to get plot as base64
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

# Helper function to clean up after execution
def _ubumaths_cleanup():
    """Clean up matplotlib figures and run garbage collection."""
    plt.close('all')
    gc.collect()

# Helper function to check if result is a sympy expression and convert to LaTeX
def _ubumaths_check_sympy_result(result):
    """Check if result is a sympy expression and convert to LaTeX."""
    if result is None:
        return None
    try:
        # Check if it's a sympy Basic type (base class for all sympy expressions)
        if hasattr(result, '__class__') and hasattr(result.__class__, '__module__'):
            if result.__class__.__module__.startswith('sympy'):
                import sympy
                latex_str = sympy.latex(result)
                # Return None if LaTeX conversion produces empty string
                return latex_str if latex_str and latex_str.strip() else None
    except:
        pass
    return None

# Helper function for Python autocompletion
def _ubumaths_get_completions(code, cursor_pos):
    """Get completions for Python code at cursor position."""
    import re
    import builtins

    MAX_COMPLETIONS = 50

    # Find the word/prefix being typed at cursor position
    code_before_cursor = code[:cursor_pos]

    # Pattern: find the last identifier or dotted path
    # e.g., "np.li" -> should complete "np.li"
    # eslint-disable-next-line no-useless-escape
    match = re.search(r'([a-zA-Z_][a-zA-Z0-9_]*(?:[.][a-zA-Z_][a-zA-Z0-9_]*)*)[.]?([a-zA-Z_][a-zA-Z0-9_]*)?$', code_before_cursor)

    if not match:
        return []

    full_match = match.group(0)

    # Helper to determine completion type
    def get_type(obj):
        try:
            if isinstance(obj, type):
                return 'class'
            elif callable(obj):
                return 'function'
            elif isinstance(obj, type(re)):  # module type
                return 'module'
            else:
                return 'variable'
        except:
            return 'property'

    # Check if we're completing after a dot
    if '.' in full_match:
        parts = full_match.split('.')
        obj_path = '.'.join(parts[:-1])
        prefix = parts[-1] if len(parts) > 1 else ''

        # Try to get the object
        try:
            obj = eval(obj_path, globals())
            attrs = dir(obj)
            completions = []
            for attr in attrs:
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
    else:
        # Complete from global namespace
        prefix = full_match
        completions = []

        # Check globals and builtins
        all_names = set(globals().keys())

        # Add builtins
        builtin_names = dir(builtins)
        all_names.update(builtin_names)

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

        # Add Python keywords
        import keyword
        for kw in keyword.kwlist:
            if kw.startswith(prefix):
                completions.append({'label': kw, 'type': 'keyword'})

        return completions[:MAX_COMPLETIONS]
`);

		// Stage 5: Ready
		sendLoadingStage(LoadingStageIndex.READY);
		postMessage({ type: 'pyodide-ready' });
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		postMessage({
			type: 'error',
			message: `Échec du chargement de Pyodide: ${errorMessage}`,
			id: ''
		});
	}
}

// =============================================================================
// Code Execution
// =============================================================================

/**
 * Extract line number from Python traceback
 */
function extractLineNumber(errorMessage: string): number | undefined {
	// Match patterns like "line 5" or "File \"<exec>\", line 3"
	const lineMatch = errorMessage.match(/line\s+(\d+)/i);
	if (lineMatch) {
		return parseInt(lineMatch[1], 10);
	}
	return undefined;
}

/**
 * Execute Python code and capture output
 */
async function executeCode(code: string, id: string): Promise<void> {
	if (!pyodide) {
		postMessage({
			type: 'error',
			message: 'Pyodide non initialisé',
			id
		});
		return;
	}

	// Validate execution ID
	if (!id || typeof id !== 'string') {
		console.error('[Pyodide Worker] Invalid execution ID:', id);
		return;
	}

	currentExecutionId = id;
	const startTime = performance.now();

	// Set up timeout
	executionTimeout = setTimeout(() => {
		if (currentExecutionId === id) {
			postMessage({ type: 'timeout', id });
			currentExecutionId = null;
		}
	}, PYODIDE_CONFIG.TIMEOUT_MS);

	try {
		// Set up stdout/stderr capture
		await pyodide.runPythonAsync(`
import sys
from io import StringIO

_ubumaths_stdout = StringIO()
_ubumaths_stderr = StringIO()
_ubumaths_old_stdout = sys.stdout
_ubumaths_old_stderr = sys.stderr
sys.stdout = _ubumaths_stdout
sys.stderr = _ubumaths_stderr
`);

		// Execute the user code and capture the last expression result for sympy detection
		// We use compile() with 'single' mode to get REPL-like behavior where
		// the last expression value is available
		await pyodide.runPythonAsync(`
import ast

_ubumaths_last_result = None
_ubumaths_user_code = ${JSON.stringify(code)}

# Parse the code to separate statements from the final expression
try:
    _ubumaths_tree = ast.parse(_ubumaths_user_code)

    if _ubumaths_tree.body:
        # Check if the last item is an expression (not assignment, etc.)
        _ubumaths_last_node = _ubumaths_tree.body[-1]

        if isinstance(_ubumaths_last_node, ast.Expr):
            # Execute all but the last statement
            if len(_ubumaths_tree.body) > 1:
                _ubumaths_init_tree = ast.Module(body=_ubumaths_tree.body[:-1], type_ignores=[])
                exec(compile(_ubumaths_init_tree, '<exec>', 'exec'))

            # Evaluate the last expression and capture result
            _ubumaths_expr_tree = ast.Expression(body=_ubumaths_last_node.value)
            _ubumaths_last_result = eval(compile(_ubumaths_expr_tree, '<expr>', 'eval'))
        else:
            # No trailing expression, just execute everything
            exec(_ubumaths_user_code)
    else:
        # Empty code
        pass
except SyntaxError:
    # If parsing fails, just execute normally
    exec(_ubumaths_user_code)
`);

		// Check if this execution was cancelled
		if (currentExecutionId !== id) {
			return;
		}

		// Capture stdout
		const stdout = pyodide.runPython(`
_stdout_value = _ubumaths_stdout.getvalue()
sys.stdout = _ubumaths_old_stdout
_stdout_value
`) as string;

		if (stdout && stdout.trim()) {
			postMessage({ type: 'stdout', data: stdout, id });
		}

		// Capture stderr
		const stderr = pyodide.runPython(`
_stderr_value = _ubumaths_stderr.getvalue()
sys.stderr = _ubumaths_old_stderr
_stderr_value
`) as string;

		if (stderr && stderr.trim()) {
			postMessage({ type: 'stderr', data: stderr, id });
		}

		// Check for sympy LaTeX output
		const latexResult = pyodide.runPython('_ubumaths_check_sympy_result(_ubumaths_last_result)') as
			| string
			| null;
		if (latexResult) {
			postMessage({ type: 'latex', latex: latexResult, id });
		}

		// Check for plots
		const plotData = pyodide.runPython('_ubumaths_get_plot_base64()') as string | null;
		if (plotData) {
			postMessage({ type: 'plot', imageData: plotData, id });
		}

		// Clean up
		pyodide.runPython('_ubumaths_cleanup()');

		// Calculate duration and send completion
		const duration = Math.round(performance.now() - startTime);
		postMessage({ type: 'complete', id, duration });
	} catch (error) {
		// Check if this execution was cancelled
		if (currentExecutionId !== id) {
			return;
		}

		// Restore stdout/stderr
		try {
			pyodide.runPython(`
sys.stdout = _ubumaths_old_stdout
sys.stderr = _ubumaths_old_stderr
_ubumaths_cleanup()
`);
		} catch (cleanupError) {
			// Log cleanup errors for debugging but don't fail
			console.warn('[Pyodide Worker] Cleanup error:', cleanupError);
		}

		const errorMessage = error instanceof Error ? error.message : String(error);
		const lineNumber = extractLineNumber(errorMessage);

		postMessage({
			type: 'error',
			message: errorMessage,
			line: lineNumber,
			id
		});
	} finally {
		// Clear timeout
		if (executionTimeout) {
			clearTimeout(executionTimeout);
			executionTimeout = null;
		}
		currentExecutionId = null;
	}
}

/**
 * Cancel the current execution
 */
function cancelExecution(id: string): void {
	if (currentExecutionId === id) {
		currentExecutionId = null;
		if (executionTimeout) {
			clearTimeout(executionTimeout);
			executionTimeout = null;
		}
	}
}

// =============================================================================
// Autocompletion
// =============================================================================

/**
 * Handle autocompletion request
 */
async function handleAutocomplete(code: string, cursor: number, id: string): Promise<void> {
	if (!pyodide) {
		postMessage({
			type: 'autocomplete-result',
			completions: [],
			id
		});
		return;
	}

	try {
		// Validate cursor position against code length
		if (cursor < 0 || cursor > code.length) {
			postMessage({ type: 'autocomplete-result', completions: [], id });
			return;
		}

		// Set the code and cursor position for the Python helper
		pyodide.globals.set('_ubumaths_autocomplete_code', code);
		pyodide.globals.set('_ubumaths_autocomplete_cursor', cursor);

		// Call the Python completion function
		const result = await pyodide.runPythonAsync(`
_ubumaths_get_completions(_ubumaths_autocomplete_code, _ubumaths_autocomplete_cursor)
`);

		// Convert PyProxy to JavaScript - result should be unknown
		const jsResult = (result as { toJs(): unknown }).toJs();

		// Validate that result is an array
		if (!Array.isArray(jsResult)) {
			console.warn('[Pyodide Worker] Autocomplete returned non-array:', jsResult);
			postMessage({ type: 'autocomplete-result', completions: [], id });
			return;
		}

		// Map and validate each item with runtime checks
		const validTypes = ['function', 'variable', 'module', 'class', 'property', 'keyword'];
		const safeCompletions: Array<{
			label: string;
			type: 'function' | 'variable' | 'module' | 'class' | 'property' | 'keyword';
		}> = [];

		for (const item of jsResult) {
			// Validate item structure
			if (
				item &&
				typeof item === 'object' &&
				'label' in item &&
				'type' in item &&
				typeof (item as Record<string, unknown>).label === 'string' &&
				typeof (item as Record<string, unknown>).type === 'string'
			) {
				const itemType = validTypes.includes((item as Record<string, unknown>).type as string)
					? ((item as Record<string, unknown>).type as
							| 'function'
							| 'variable'
							| 'module'
							| 'class'
							| 'property'
							| 'keyword')
					: 'variable'; // fallback to variable

				safeCompletions.push({
					label: (item as Record<string, unknown>).label as string,
					type: itemType
				});
			}
		}

		postMessage({
			type: 'autocomplete-result',
			completions: safeCompletions,
			id
		});
	} catch (error) {
		console.warn('[Pyodide Worker] Autocomplete error:', error);
		postMessage({
			type: 'autocomplete-result',
			completions: [],
			id
		});
	}
}

// =============================================================================
// Message Handler
// =============================================================================

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

// Log that the worker is ready to receive messages
console.log('[Pyodide Worker] Worker initialized and ready');
