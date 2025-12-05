/// <reference lib="webworker" />

/**
 * Pyodide Web Worker
 *
 * Runs Python code in a separate thread using Pyodide.
 * Supports both isolated (playground) and persistent (notebook) execution contexts.
 *
 * Multi-context support:
 * - Playground mode: Isolated execution, state reset between runs
 * - Notebook mode: Persistent execution, state preserved across cells
 */

import type {
	FromWorkerMessage,
	PyodideInterface,
	LoadPyodideFunc,
	PyProxy,
	ValidationConfig,
	ValidationResult,
	ValidationIssue,
	ExerciseValidationConfig,
	ExerciseValidationResult,
	TestCaseResult,
	OutputValidationConfig,
	UnitTestValidationConfig,
	ASTValidationConfig
} from '$lib/shared/python';
import {
	PYODIDE_CONFIG,
	LOADING_STAGES,
	LoadingStageIndex,
	CONTEXT_CONFIG,
	ERROR_MESSAGES,
	toWorkerMessageSchema
} from '$lib/shared/python';

// =============================================================================
// Package Tracking for Lazy Loading
// =============================================================================

/**
 * Set of packages that have been loaded via lazy loading
 */
const loadedPackages = new Set<string>();

/**
 * Python standard library modules that don't require external packages
 */
const STDLIB_MODULES = new Set([
	'sys',
	'os',
	'io',
	'math',
	're',
	'json',
	'datetime',
	'random',
	'collections',
	'itertools',
	'functools',
	'typing',
	'abc',
	'copy',
	'base64',
	'gc',
	'warnings',
	'ast',
	'builtins',
	'keyword',
	'traceback',
	'time',
	'string',
	'decimal',
	'fractions',
	'numbers',
	'statistics',
	'operator',
	'pathlib',
	'textwrap',
	'difflib',
	'struct',
	'codecs',
	'unicodedata',
	'calendar',
	'heapq',
	'bisect',
	'array',
	'weakref',
	'types',
	'contextlib',
	'dataclasses',
	'enum',
	'graphlib',
	'pprint',
	'reprlib',
	'secrets',
	'hashlib',
	'hmac',
	'pickle',
	'shelve',
	'dbm',
	'sqlite3',
	'csv',
	'html',
	'xml',
	'urllib',
	'http',
	'email',
	'logging',
	'getpass',
	'platform',
	'errno',
	'ctypes',
	'threading',
	'queue',
	'asyncio',
	'concurrent',
	'socket',
	'ssl',
	'select',
	'signal',
	'mmap',
	'unittest',
	'doctest',
	'cmath',
	'zlib',
	'gzip',
	'bz2',
	'lzma',
	'zipfile',
	'tarfile',
	'tempfile',
	'shutil',
	'glob',
	'fnmatch',
	'linecache',
	'tokenize',
	'dis',
	'inspect',
	'site'
]);

// =============================================================================
// Context Management
// =============================================================================

/**
 * Execution context for multi-context support
 */
interface ExecutionContext {
	id: string;
	persistent: boolean;
	namespace: PyProxy | null; // Python globals dict for persistent contexts
	lastActivity: number;
}

/**
 * Map of active execution contexts
 */
const contexts = new Map<string, ExecutionContext>();

/**
 * Default context ID for backwards-compatible playground execution
 */
const DEFAULT_CONTEXT_ID = CONTEXT_CONFIG.DEFAULT_PLAYGROUND_CONTEXT;

/**
 * Interval for idle context cleanup
 */
let idleCleanupInterval: ReturnType<typeof setInterval> | null = null;

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
// Context Management Functions
// =============================================================================

/**
 * Create a new execution context
 */
function createContext(contextId: string, persistent: boolean): void {
	if (!pyodide) {
		postMessage({
			type: 'error',
			message: ERROR_MESSAGES.PYODIDE_NOT_READY,
			id: ''
		});
		return;
	}

	// Check max contexts limit
	if (contexts.size >= CONTEXT_CONFIG.MAX_CONTEXTS) {
		postMessage({
			type: 'error',
			message: ERROR_MESSAGES.MAX_CONTEXTS_REACHED,
			id: ''
		});
		return;
	}

	// Check if context already exists
	if (contexts.has(contextId)) {
		// Context already exists, just update activity
		const context = contexts.get(contextId)!;
		context.lastActivity = Date.now();
		postMessage({ type: 'context-created', contextId });
		return;
	}

	// Create namespace for persistent context
	let namespace: PyProxy | null = null;
	if (persistent) {
		// Create a new Python dict to serve as the namespace
		namespace = pyodide.runPython(`dict()`) as PyProxy;
	}

	contexts.set(contextId, {
		id: contextId,
		persistent,
		namespace,
		lastActivity: Date.now()
	});

	postMessage({ type: 'context-created', contextId });
}

/**
 * Destroy an execution context and clean up resources
 */
function destroyContext(contextId: string): void {
	const context = contexts.get(contextId);
	if (!context) {
		// Context doesn't exist, but we still send success message
		postMessage({ type: 'context-destroyed', contextId });
		return;
	}

	// Clean up PyProxy to avoid memory leaks
	if (context.namespace) {
		try {
			if (typeof (context.namespace as { destroy?: () => void }).destroy === 'function') {
				(context.namespace as { destroy: () => void }).destroy();
			}
		} catch (e) {
			console.warn('[Pyodide Worker] Error destroying context namespace:', e);
		}
	}

	contexts.delete(contextId);
	postMessage({ type: 'context-destroyed', contextId });
}

/**
 * Reset a context - clear all variables but keep the context alive
 */
function resetContext(contextId: string): void {
	if (!pyodide) {
		postMessage({
			type: 'error',
			message: ERROR_MESSAGES.PYODIDE_NOT_READY,
			id: ''
		});
		return;
	}

	const context = contexts.get(contextId);
	if (!context) {
		postMessage({
			type: 'error',
			message: ERROR_MESSAGES.CONTEXT_NOT_FOUND,
			id: ''
		});
		return;
	}

	// For persistent contexts, clear and recreate the namespace
	if (context.persistent && context.namespace) {
		try {
			// Destroy old namespace
			if (typeof (context.namespace as { destroy?: () => void }).destroy === 'function') {
				(context.namespace as { destroy: () => void }).destroy();
			}
			// Create new namespace
			context.namespace = pyodide.runPython(`dict()`) as PyProxy;
		} catch (e) {
			console.warn('[Pyodide Worker] Error resetting context namespace:', e);
		}
	}

	context.lastActivity = Date.now();
	postMessage({ type: 'context-reset', contextId });
}

/**
 * Get or create a context for execution
 * Returns the namespace PyProxy for persistent contexts, or null for isolated execution
 */
function getContextNamespace(contextId: string | undefined): PyProxy | null {
	if (!contextId) {
		// No context ID - use isolated execution (backwards compatible)
		return null;
	}

	const context = contexts.get(contextId);
	if (!context) {
		// Context not found - use isolated execution
		return null;
	}

	context.lastActivity = Date.now();
	return context.namespace;
}

/**
 * Clean up idle contexts
 */
function cleanupIdleContexts(): void {
	const now = Date.now();
	const idleThreshold = CONTEXT_CONFIG.IDLE_TIMEOUT_MS;

	for (const [contextId, context] of contexts) {
		// Don't clean up the default playground context
		if (contextId === DEFAULT_CONTEXT_ID) {
			continue;
		}

		if (now - context.lastActivity > idleThreshold) {
			console.log(`[Pyodide Worker] Cleaning up idle context: ${contextId}`);
			destroyContext(contextId);
		}
	}
}

/**
 * Start the idle context cleanup interval
 */
function startIdleCleanup(): void {
	if (idleCleanupInterval) {
		return;
	}
	// Check for idle contexts every minute
	idleCleanupInterval = setInterval(cleanupIdleContexts, 60_000);
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
		throw new Error(`Echec du chargement du module Pyodide: ${message}`);
	}
}

/**
 * Initialize Pyodide (lazy loading mode - no packages loaded at init)
 */
async function initializePyodide(): Promise<void> {
	try {
		// Stage 0: Initializing
		sendLoadingStage(LoadingStageIndex.INITIALIZING);

		// Load Pyodide module
		const loadPyodide = await loadPyodideModule();

		// Stage 1: Downloading Python
		sendLoadingStage(LoadingStageIndex.DOWNLOADING_PYTHON);

		// Initialize Pyodide (no packages loaded - lazy loading mode)
		pyodide = await loadPyodide({
			indexURL: PYODIDE_CONFIG.CDN_URL
		});

		// Define essential helper functions (no external dependencies)
		await pyodide.runPythonAsync(`
import sys
import gc
from io import StringIO

# Helper function to reformat the last exception for JavaScript
def _ubumaths_reformat_exception():
    """Reformat the last Python exception for JavaScript consumption.
    Returns only the essential error message (last line of traceback).
    """
    from traceback import format_exception

    exc = None
    if hasattr(sys, 'last_exc') and sys.last_exc is not None:
        # Python 3.12+ stores the exception directly
        exc = sys.last_exc
    elif hasattr(sys, 'last_type') and sys.last_type is not None:
        # Older Python versions - reconstruct exception
        exc = sys.last_value

    if exc is None:
        return None

    # Get the full traceback lines
    full_tb = format_exception(type(exc), exc, exc.__traceback__)

    # Extract line number info and final error message
    # Line info is like: '  File "<exec>", line 14'
    # Error is like: 'SyntaxError: unterminated string literal'
    line_info = None
    error_msg = None

    for line in full_tb:
        line = line.rstrip()
        if 'File "<' in line and ', line ' in line:
            # Keep only the last occurrence (actual error location)
            line_info = line.strip()
        elif line and not line.startswith(' ') and not line.startswith('Traceback'):
            # This is the final error message (e.g., "SyntaxError: ...")
            error_msg = line

    # Build concise message
    if error_msg:
        if line_info:
            return line_info + chr(10) + error_msg
        return error_msg

    # Fallback to full traceback if parsing failed
    return "".join(full_tb)

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
def _ubumaths_get_completions(code, cursor_pos, namespace=None):
    """Get completions for Python code at cursor position.

    Args:
        code: The code being edited
        cursor_pos: Cursor position in the code
        namespace: Optional namespace dict for context-aware completions
    """
    import re
    import builtins

    MAX_COMPLETIONS = 50

    # Use provided namespace or fall back to globals
    ns = namespace if namespace is not None else globals()

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
        prefix = parts[-1] if len(parts) > 1 else ''

        # SECURE: Use getattr navigation instead of eval()
        # Start with the first part from namespace
        try:
            obj = ns.get(parts[0])
            if obj is None:
                return []

            # Walk through remaining parts using getattr
            for part in parts[1:-1]:
                obj = getattr(obj, part)

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
        # Complete from namespace
        prefix = full_match
        completions = []

        # Check namespace and builtins
        all_names = set(ns.keys())

        # Add builtins
        builtin_names = dir(builtins)
        all_names.update(builtin_names)

        for name in all_names:
            if name.startswith(prefix) and not name.startswith('_'):
                try:
                    if name in ns:
                        val = ns[name]
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

# Helper function to validate Python code syntax
def _ubumaths_validate_syntax(code):
    """Validate Python code syntax using AST.

    Returns a dict with:
    - valid: bool
    - issues: list of issue dicts
    - hasAst: bool (True if AST was successfully parsed)
    """
    import ast

    try:
        ast.parse(code)
        return {
            'valid': True,
            'issues': [],
            'hasAst': True
        }
    except SyntaxError as e:
        issue = {
            'line': e.lineno or 1,
            'column': e.offset or 0,
            'message': e.msg or str(e),
            'severity': 'error',
            'rule': 'syntax-error'
        }
        if e.end_lineno:
            issue['endLine'] = e.end_lineno
        if e.end_offset:
            issue['endColumn'] = e.end_offset
        return {
            'valid': False,
            'issues': [issue],
            'hasAst': False
        }
    except Exception as e:
        return {
            'valid': False,
            'issues': [{
                'line': 1,
                'column': 0,
                'message': str(e),
                'severity': 'error',
                'rule': 'parse-error'
            }],
            'hasAst': False
        }
`);

		// Start idle context cleanup
		startIdleCleanup();

		// Ready (no packages to load in lazy mode)
		sendLoadingStage(LoadingStageIndex.READY);
		postMessage({ type: 'pyodide-ready' });
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		postMessage({
			type: 'error',
			message: `Echec du chargement de Pyodide: ${errorMessage}`,
			id: ''
		});
	}
}

// =============================================================================
// Package Setup Functions (called after lazy loading)
// =============================================================================

/**
 * Configure matplotlib after lazy loading
 */
async function setupMatplotlib(): Promise<void> {
	if (!pyodide) return;

	await pyodide.runPythonAsync(`
import matplotlib
matplotlib.use('AGG')
import matplotlib.pyplot as plt
import io
import base64
import warnings

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

# Helper function to clean up matplotlib figures
def _ubumaths_cleanup_matplotlib():
    """Clean up matplotlib figures."""
    plt.close('all')
`);
}

/**
 * Configure Plotly after lazy loading
 */
async function setupPlotly(): Promise<void> {
	if (!pyodide) return;

	await pyodide.runPythonAsync(`
# Initialize global variable for storing plotly figure
_ubumaths_plotly_fig = None

def _ubumaths_get_plotly_json():
    """Get current Plotly figure as JSON specification."""
    global _ubumaths_plotly_fig
    try:
        import plotly.io as pio
        if _ubumaths_plotly_fig is not None:
            result = pio.to_json(_ubumaths_plotly_fig)
            _ubumaths_plotly_fig = None  # Clear after export
            return result
    except Exception as e:
        print(f"Plotly error: {e}")
    return None

def _ubumaths_check_plotly_result(result):
    """Check if result is a Plotly figure and store it for export."""
    global _ubumaths_plotly_fig
    try:
        from plotly.graph_objs import Figure
        if isinstance(result, Figure):
            _ubumaths_plotly_fig = result
            return True
    except ImportError:
        pass
    return False
`);
}

// =============================================================================
// Lazy Package Loading
// =============================================================================

/**
 * Load required packages for the given code (lazy loading)
 * Detects imports and loads only the packages that are needed
 */
async function loadRequiredPackages(code: string, id: string): Promise<void> {
	if (!pyodide) return;

	// Detect imports using Pyodide's API
	const importsProxy = pyodide.runPython(`
from pyodide.code import find_imports
list(find_imports(${JSON.stringify(code)}))
`);

	// Convert PyProxy to JS array
	const imports = (importsProxy as { toJs: () => string[] }).toJs();

	// Clean up the PyProxy to avoid memory leaks
	if (
		importsProxy &&
		typeof importsProxy === 'object' &&
		'destroy' in importsProxy &&
		typeof (importsProxy as { destroy: () => void }).destroy === 'function'
	) {
		(importsProxy as { destroy: () => void }).destroy();
	}

	// Filter out stdlib modules and already loaded packages
	const packagesToLoad = imports.filter(
		(pkg: string) => !STDLIB_MODULES.has(pkg) && !loadedPackages.has(pkg)
	);

	if (packagesToLoad.length === 0) return;

	// Notify main thread that packages are being loaded
	postMessage({ type: 'packages-loading', packages: packagesToLoad, id });

	// Load packages from imports (Pyodide handles dependency resolution)
	await pyodide.loadPackagesFromImports(code, {
		messageCallback: (msg: string) => console.log('[Pyodide]', msg)
	});

	// Post-load configuration for specific packages
	for (const pkg of packagesToLoad) {
		loadedPackages.add(pkg);

		// Set up matplotlib helpers when first loaded
		if (pkg === 'matplotlib') {
			await setupMatplotlib();
		}

		// Set up plotly helpers when first loaded
		if (pkg === 'plotly') {
			await setupPlotly();
		}
	}

	// Notify main thread that packages are loaded
	postMessage({ type: 'packages-loaded', packages: packagesToLoad, id });
}

// =============================================================================
// Code Execution
// =============================================================================

/**
 * Extract line number from Python traceback
 * Finds the LAST occurrence from user code files (<exec>, <expr>, <unknown>)
 * which is where the actual error is in the traceback
 */
function extractLineNumber(errorMessage: string): number | undefined {
	// Match user code files: File "<exec>", line X or File "<expr>", line X or File "<unknown>", line X
	// Use matchAll to get ALL occurrences, then take the last one (actual error location)
	const userCodeRegex = /File\s+"<(?:exec|expr|unknown)>",\s+line\s+(\d+)/gi;
	const matches = [...errorMessage.matchAll(userCodeRegex)];

	if (matches.length > 0) {
		// Take the LAST match - this is where the actual error occurred
		const lastMatch = matches[matches.length - 1];
		return parseInt(lastMatch[1], 10);
	}

	// Fallback: match any "line X" pattern (less reliable)
	const lineMatch = errorMessage.match(/line\s+(\d+)/i);
	if (lineMatch) {
		return parseInt(lineMatch[1], 10);
	}
	return undefined;
}

/**
 * Fallback error message extraction when Python traceback is not available
 */
function extractErrorMessageFallback(error: unknown): string {
	if (error && typeof error === 'object') {
		const pyError = error as Record<string, unknown>;

		// Pyodide PythonError has a 'message' property that contains the full traceback
		if ('message' in pyError && typeof pyError.message === 'string' && pyError.message) {
			return pyError.message;
		}
		// Some versions use toString() which includes the traceback
		if (typeof (error as { toString?: () => string }).toString === 'function') {
			const str = String(error);
			// Check if toString gave us useful info (not just "[object Object]" or "PythonError")
			if (str && str !== '[object Object]' && str !== 'PythonError' && str.length > 15) {
				return str;
			}
		}
		return 'Erreur Python';
	}
	if (error instanceof Error) {
		return error.message || String(error);
	}
	return String(error) || 'Erreur Python inconnue';
}

/**
 * Execute Python code and capture output
 * Supports both isolated (no contextId) and persistent (with contextId) execution
 */
async function executeCode(code: string, id: string, contextId?: string): Promise<void> {
	if (!pyodide) {
		postMessage({
			type: 'error',
			message: ERROR_MESSAGES.PYODIDE_NOT_READY,
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
		// Load required packages before execution (lazy loading)
		await loadRequiredPackages(code, id);

		// Check if execution was cancelled during package loading
		if (currentExecutionId !== id) {
			return;
		}

		// Get namespace for context (null for isolated execution)
		const namespace = getContextNamespace(contextId);
		const useNamespace = namespace !== null;

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

		// Prepare the namespace for execution
		if (useNamespace) {
			pyodide.globals.set('_ubumaths_exec_namespace', namespace);
		}

		// Execute the user code and capture the last expression result for sympy detection
		// We use compile() with 'single' mode to get REPL-like behavior where
		// the last expression value is available
		const execCode = useNamespace
			? `
import ast

_ubumaths_last_result = None
_ubumaths_user_code = ${JSON.stringify(code)}
_ubumaths_ns = _ubumaths_exec_namespace

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
                exec(compile(_ubumaths_init_tree, '<exec>', 'exec'), _ubumaths_ns, _ubumaths_ns)

            # Evaluate the last expression and capture result
            _ubumaths_expr_tree = ast.Expression(body=_ubumaths_last_node.value)
            _ubumaths_last_result = eval(compile(_ubumaths_expr_tree, '<expr>', 'eval'), _ubumaths_ns, _ubumaths_ns)
        else:
            # No trailing expression, just execute everything
            exec(_ubumaths_user_code, _ubumaths_ns, _ubumaths_ns)
    else:
        # Empty code
        pass
except SyntaxError as e:
    # Re-raise SyntaxError to be caught by JavaScript
    raise e
`
			: `
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
except SyntaxError as e:
    # Re-raise SyntaxError to be caught by JavaScript
    raise e
`;

		await pyodide.runPythonAsync(execCode);

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

		// Check for Plotly output (only if plotly was loaded)
		if (loadedPackages.has('plotly')) {
			const isPlotlyFig = pyodide.runPython(
				'_ubumaths_check_plotly_result(_ubumaths_last_result)'
			) as boolean;
			if (isPlotlyFig) {
				const plotlyJson = pyodide.runPython('_ubumaths_get_plotly_json()') as string | null;
				if (plotlyJson) {
					postMessage({ type: 'plotly', jsonSpec: plotlyJson, id });
				}
			}
		}

		// Check for matplotlib plots (only if matplotlib was loaded)
		if (loadedPackages.has('matplotlib')) {
			const plotData = pyodide.runPython('_ubumaths_get_plot_base64()') as string | null;
			if (plotData) {
				postMessage({ type: 'plot', imageData: plotData, id });
			}
		}

		// Clean up (only if matplotlib was loaded)
		if (loadedPackages.has('matplotlib')) {
			pyodide.runPython('_ubumaths_cleanup_matplotlib()');
		}

		// General garbage collection
		pyodide.runPython('gc.collect()');

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
`);
			// Clean up matplotlib if loaded
			if (loadedPackages.has('matplotlib')) {
				pyodide.runPython('_ubumaths_cleanup_matplotlib()');
			}
			pyodide.runPython('gc.collect()');
		} catch (cleanupError) {
			// Log cleanup errors for debugging but don't fail
			console.warn('[Pyodide Worker] Cleanup error:', cleanupError);
		}

		// Extract error message from Pyodide PythonError
		// Use Python's traceback module to get the actual formatted exception
		let errorMessage: string;

		try {
			// Try to get the formatted exception from Python's sys.last_exc
			const formattedException = pyodide.runPython('_ubumaths_reformat_exception()') as
				| string
				| null;
			if (formattedException && formattedException.trim()) {
				errorMessage = formattedException;
			} else {
				// Fallback to JavaScript error properties
				errorMessage = extractErrorMessageFallback(error);
			}
		} catch {
			// If Python call fails, use fallback
			errorMessage = extractErrorMessageFallback(error);
		}

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
// Code Validation
// =============================================================================

/**
 * Validate Python code without executing
 */
async function validateCode(code: string, config: ValidationConfig, id: string): Promise<void> {
	if (!pyodide) {
		postMessage({
			type: 'error',
			message: ERROR_MESSAGES.PYODIDE_NOT_READY,
			id
		});
		return;
	}

	const issues: ValidationIssue[] = [];
	let hasAst = false;

	try {
		// Check code length
		if (config.maxCodeLength && code.length > config.maxCodeLength) {
			issues.push({
				line: 1,
				column: 0,
				message: ERROR_MESSAGES.CODE_TOO_LONG,
				severity: 'error',
				rule: 'max-code-length'
			});
		}

		// Check line count
		if (config.maxLines) {
			const lineCount = code.split('\n').length;
			if (lineCount > config.maxLines) {
				issues.push({
					line: 1,
					column: 0,
					message: ERROR_MESSAGES.TOO_MANY_LINES,
					severity: 'error',
					rule: 'max-lines'
				});
			}
		}

		// Check forbidden patterns
		if (config.forbiddenPatterns && config.forbiddenPatterns.length > 0) {
			for (const pattern of config.forbiddenPatterns) {
				try {
					const regex = new RegExp(pattern, 'gm');
					let match;
					while ((match = regex.exec(code)) !== null) {
						// Find line number
						const beforeMatch = code.substring(0, match.index);
						const lineNumber = beforeMatch.split('\n').length;
						const column = match.index - beforeMatch.lastIndexOf('\n') - 1;

						issues.push({
							line: lineNumber,
							column: Math.max(0, column),
							message: `Forbidden pattern detected: ${pattern}`,
							severity: 'error',
							rule: 'forbidden-pattern'
						});
					}
				} catch {
					// Invalid regex, skip
				}
			}
		}

		// Check syntax using Python AST
		if (config.checkSyntax) {
			pyodide.globals.set('_ubumaths_validate_code', code);
			try {
				const result = pyodide.runPython(`_ubumaths_validate_syntax(_ubumaths_validate_code)`);

				// Convert PyProxy to JS
				const jsResult = (result as { toJs: () => Record<string, unknown> }).toJs();

				hasAst = jsResult.hasAst as boolean;

				if (!jsResult.valid) {
					const pythonIssues = jsResult.issues as Array<Record<string, unknown>>;
					for (const issue of pythonIssues) {
						issues.push({
							line: issue.line as number,
							column: issue.column as number,
							endLine: issue.endLine as number | undefined,
							endColumn: issue.endColumn as number | undefined,
							message: issue.message as string,
							severity: issue.severity as 'error' | 'warning' | 'info',
							rule: issue.rule as string
						});
					}
				}

				// Clean up PyProxy
				if (
					result &&
					typeof result === 'object' &&
					'destroy' in result &&
					typeof (result as { destroy: () => void }).destroy === 'function'
				) {
					(result as { destroy: () => void }).destroy();
				}
			} finally {
				// Clean up global variable to prevent memory leaks
				pyodide.globals.delete('_ubumaths_validate_code');
			}
		}

		const validationResult: ValidationResult = {
			valid: issues.filter((i) => i.severity === 'error').length === 0,
			issues,
			hasAst
		};

		postMessage({
			type: 'validation-result',
			result: validationResult,
			id
		});
	} catch (error) {
		console.warn('[Pyodide Worker] Validation error:', error);
		postMessage({
			type: 'validation-result',
			result: {
				valid: false,
				issues: [
					{
						line: 1,
						column: 0,
						message: error instanceof Error ? error.message : String(error),
						severity: 'error',
						rule: 'validation-error'
					}
				],
				hasAst: false
			},
			id
		});
	}
}

// =============================================================================
// Exercise Validation
// =============================================================================

/**
 * Validate Python exercise code using various strategies
 */
async function validateExercise(
	code: string,
	config: ExerciseValidationConfig,
	id: string
): Promise<void> {
	if (!pyodide) {
		postMessage({
			type: 'error',
			message: ERROR_MESSAGES.PYODIDE_NOT_READY,
			id
		});
		return;
	}

	const startTime = performance.now();
	const timeout = config.timeout_ms || 5000;

	try {
		// Set up timeout
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => reject(new Error('Timeout')), timeout);
		});

		// Run validation based on strategy type
		const validationPromise = (async () => {
			switch (config.type) {
				case 'output':
					return await validateOutputComparison(code, config);
				case 'unit_test':
					return await validateUnitTests(code, config);
				case 'ast':
					return await validateAST(code, config);
			}
		})();

		const result = await Promise.race([validationPromise, timeoutPromise]);

		// Add execution time
		result.execution_time_ms = Math.round(performance.now() - startTime);

		postMessage({
			type: 'validation-exercise-result',
			result,
			id
		});
	} catch (error) {
		const executionTime = Math.round(performance.now() - startTime);

		if (error instanceof Error && error.message === 'Timeout') {
			postMessage({
				type: 'validation-exercise-result',
				result: {
					valid: false,
					strategy: config.type,
					test_results: [],
					error: "Délai d'exécution dépassé",
					execution_time_ms: executionTime
				},
				id
			});
		} else {
			postMessage({
				type: 'validation-exercise-result',
				result: {
					valid: false,
					strategy: config.type,
					test_results: [],
					error: error instanceof Error ? error.message : String(error),
					execution_time_ms: executionTime
				},
				id
			});
		}
	}
}

/**
 * Validate using output comparison strategy
 */
async function validateOutputComparison(
	code: string,
	config: OutputValidationConfig
): Promise<ExerciseValidationResult> {
	if (!pyodide) {
		throw new Error(ERROR_MESSAGES.PYODIDE_NOT_READY);
	}

	const testResults: TestCaseResult[] = [];
	let allPassed = true;

	for (const testCase of config.test_cases) {
		try {
			// Set up stdin redirection with test input
			await pyodide.runPythonAsync(`
import sys
from io import StringIO

_ubumaths_test_stdin = StringIO(${JSON.stringify(testCase.input)})
_ubumaths_test_stdout = StringIO()
_ubumaths_old_stdin = sys.stdin
_ubumaths_old_stdout = sys.stdout
sys.stdin = _ubumaths_test_stdin
sys.stdout = _ubumaths_test_stdout
`);

			// Execute student code
			await pyodide.runPythonAsync(code);

			// Capture output
			const actualOutput = (await pyodide.runPythonAsync(`
_actual = _ubumaths_test_stdout.getvalue()
sys.stdin = _ubumaths_old_stdin
sys.stdout = _ubumaths_old_stdout
_actual
`)) as string;

			// Compare outputs
			const expected = config.ignore_whitespace
				? testCase.expected_output.trim()
				: testCase.expected_output;
			const actual = config.ignore_whitespace ? actualOutput.trim() : actualOutput;

			const passed = expected === actual;
			allPassed = allPassed && passed;

			testResults.push({
				passed,
				input: testCase.input,
				expected: testCase.expected_output,
				actual: actualOutput
			});
		} catch (error) {
			allPassed = false;
			testResults.push({
				passed: false,
				input: testCase.input,
				expected: testCase.expected_output,
				error: error instanceof Error ? error.message : String(error)
			});

			// Clean up on error
			try {
				await pyodide.runPythonAsync(`
sys.stdin = _ubumaths_old_stdin
sys.stdout = _ubumaths_old_stdout
`);
			} catch {
				// Ignore cleanup errors
			}
		}
	}

	return {
		valid: allPassed,
		strategy: 'output',
		test_results: testResults,
		execution_time_ms: 0 // Will be set by caller
	};
}

/**
 * Validate using unit test strategy
 */
async function validateUnitTests(
	code: string,
	config: UnitTestValidationConfig
): Promise<ExerciseValidationResult> {
	if (!pyodide) {
		throw new Error(ERROR_MESSAGES.PYODIDE_NOT_READY);
	}

	const testResults: TestCaseResult[] = [];
	let allPassed = true;

	try {
		// Execute student code to define the function
		await pyodide.runPythonAsync(code);

		// Verify function exists
		const functionExists = (await pyodide.runPythonAsync(
			`'${config.function_name}' in dir()`
		)) as boolean;

		if (!functionExists) {
			return {
				valid: false,
				strategy: 'unit_test',
				test_results: [
					{
						passed: false,
						error: `La fonction '${config.function_name}' n'est pas définie`
					}
				],
				execution_time_ms: 0
			};
		}

		// Run test cases
		for (const testCase of config.test_cases) {
			try {
				// Set up test in Python
				pyodide.globals.set('_ubumaths_test_args', testCase.args);
				pyodide.globals.set('_ubumaths_test_expected', testCase.expected);

				// Call function and compare result
				const result = (await pyodide.runPythonAsync(`
import json
_args = _ubumaths_test_args
_expected = _ubumaths_test_expected
_actual = ${config.function_name}(*_args)
_passed = _actual == _expected
{
    'passed': _passed,
    'actual': _actual,
    'expected': _expected
}
`)) as PyProxy;

				const jsResult = result.toJs() as {
					passed: boolean;
					actual: unknown;
					expected: unknown;
				};

				// Clean up PyProxy
				if (typeof (result as { destroy?: () => void }).destroy === 'function') {
					(result as { destroy: () => void }).destroy();
				}

				allPassed = allPassed && jsResult.passed;

				testResults.push({
					passed: jsResult.passed,
					expected: JSON.stringify(jsResult.expected),
					actual: JSON.stringify(jsResult.actual),
					input: `${config.function_name}(${testCase.args.map((a) => JSON.stringify(a)).join(', ')})`
				});

				// Clean up globals
				pyodide.globals.delete('_ubumaths_test_args');
				pyodide.globals.delete('_ubumaths_test_expected');
			} catch (error) {
				allPassed = false;
				testResults.push({
					passed: false,
					input: `${config.function_name}(${testCase.args.map((a) => JSON.stringify(a)).join(', ')})`,
					expected: JSON.stringify(testCase.expected),
					error: error instanceof Error ? error.message : String(error)
				});

				// Clean up globals on error
				try {
					pyodide.globals.delete('_ubumaths_test_args');
					pyodide.globals.delete('_ubumaths_test_expected');
				} catch {
					// Ignore cleanup errors
				}
			}
		}
	} catch (error) {
		return {
			valid: false,
			strategy: 'unit_test',
			test_results: [
				{
					passed: false,
					error: error instanceof Error ? error.message : String(error)
				}
			],
			execution_time_ms: 0
		};
	}

	return {
		valid: allPassed,
		strategy: 'unit_test',
		test_results: testResults,
		execution_time_ms: 0
	};
}

/**
 * Validate using AST analysis strategy
 */
async function validateAST(
	code: string,
	config: ASTValidationConfig
): Promise<ExerciseValidationResult> {
	if (!pyodide) {
		throw new Error(ERROR_MESSAGES.PYODIDE_NOT_READY);
	}

	const astIssues: string[] = [];

	// Check AST requirements
	for (const requirement of config.requirements) {
		try {
			pyodide.globals.set('_ubumaths_ast_code', code);
			pyodide.globals.set('_ubumaths_ast_requirement_type', requirement.type);
			pyodide.globals.set('_ubumaths_ast_requirement_name', requirement.name || '');

			const passed = (await pyodide.runPythonAsync(`
import ast

_code = _ubumaths_ast_code
_req_type = _ubumaths_ast_requirement_type
_req_name = _ubumaths_ast_requirement_name
_passed = False

try:
    _tree = ast.parse(_code)

    if _req_type == 'uses_loop':
        # Check for For or While loops
        for node in ast.walk(_tree):
            if isinstance(node, (ast.For, ast.While)):
                _passed = True
                break

    elif _req_type == 'uses_recursion':
        # Check if function calls itself
        for node in ast.walk(_tree):
            if isinstance(node, ast.FunctionDef):
                func_name = node.name
                for child in ast.walk(node):
                    if isinstance(child, ast.Call):
                        if isinstance(child.func, ast.Name) and child.func.id == func_name:
                            _passed = True
                            break

    elif _req_type == 'defines_function':
        # Check for function definition with specific name
        for node in ast.walk(_tree):
            if isinstance(node, ast.FunctionDef):
                if _req_name and node.name == _req_name:
                    _passed = True
                    break
                elif not _req_name:
                    _passed = True
                    break

    elif _req_type == 'defines_class':
        # Check for class definition with specific name
        for node in ast.walk(_tree):
            if isinstance(node, ast.ClassDef):
                if _req_name and node.name == _req_name:
                    _passed = True
                    break
                elif not _req_name:
                    _passed = True
                    break

    elif _req_type == 'uses_list_comprehension':
        # Check for list comprehension
        for node in ast.walk(_tree):
            if isinstance(node, ast.ListComp):
                _passed = True
                break

    elif _req_type == 'no_global_variables':
        # Check for assignments outside functions
        _has_global_vars = False
        for node in _tree.body:
            if isinstance(node, (ast.Assign, ast.AugAssign, ast.AnnAssign)):
                _has_global_vars = True
                break
        _passed = not _has_global_vars

    elif _req_type == 'no_print':
        # Check for print() calls
        _has_print = False
        for node in ast.walk(_tree):
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name) and node.func.id == 'print':
                    _has_print = True
                    break
        _passed = not _has_print

    elif _req_type == 'uses_import':
        # Check for import of specific module
        for node in ast.walk(_tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if _req_name and alias.name == _req_name:
                        _passed = True
                        break
                    elif not _req_name:
                        _passed = True
                        break
            elif isinstance(node, ast.ImportFrom):
                if _req_name and node.module == _req_name:
                    _passed = True
                    break
                elif not _req_name:
                    _passed = True
                    break

except SyntaxError:
    _passed = False

_passed
`)) as boolean;

			pyodide.globals.delete('_ubumaths_ast_code');
			pyodide.globals.delete('_ubumaths_ast_requirement_type');
			pyodide.globals.delete('_ubumaths_ast_requirement_name');

			if (!passed) {
				astIssues.push(requirement.message);
			}
		} catch (error) {
			pyodide.globals.delete('_ubumaths_ast_code');
			pyodide.globals.delete('_ubumaths_ast_requirement_type');
			pyodide.globals.delete('_ubumaths_ast_requirement_name');

			astIssues.push(
				`${requirement.message} (erreur: ${error instanceof Error ? error.message : String(error)})`
			);
		}
	}

	// If AST validation passed and there are output tests, run them
	let testResults: TestCaseResult[] = [];
	let outputTestsPassed = true;

	if (astIssues.length === 0 && config.output_tests && config.output_tests.length > 0) {
		const outputConfig: OutputValidationConfig = {
			type: 'output',
			test_cases: config.output_tests,
			timeout_ms: config.timeout_ms
		};

		const outputResult = await validateOutputComparison(code, outputConfig);
		testResults = outputResult.test_results;
		outputTestsPassed = outputResult.valid;
	}

	return {
		valid: astIssues.length === 0 && outputTestsPassed,
		strategy: 'ast',
		test_results: testResults,
		ast_issues: astIssues.length > 0 ? astIssues : undefined,
		execution_time_ms: 0
	};
}

// =============================================================================
// Autocompletion
// =============================================================================

/**
 * Handle autocompletion request
 * Supports context-aware completions for persistent contexts
 */
async function handleAutocomplete(
	code: string,
	cursor: number,
	id: string,
	contextId?: string
): Promise<void> {
	if (!pyodide) {
		postMessage({
			type: 'autocomplete-result',
			completions: [],
			id
		});
		return;
	}

	// Validate cursor position against code length
	if (cursor < 0 || cursor > code.length) {
		postMessage({ type: 'autocomplete-result', completions: [], id });
		return;
	}

	// Get namespace for context-aware completions
	const namespace = getContextNamespace(contextId);

	// Set the code, cursor position, and optional namespace for the Python helper
	pyodide.globals.set('_ubumaths_autocomplete_code', code);
	pyodide.globals.set('_ubumaths_autocomplete_cursor', cursor);
	pyodide.globals.set('_ubumaths_autocomplete_namespace', namespace);

	try {
		// Call the Python completion function with namespace
		const result = await pyodide.runPythonAsync(`
_ubumaths_get_completions(_ubumaths_autocomplete_code, _ubumaths_autocomplete_cursor, _ubumaths_autocomplete_namespace)
`);

		// Convert PyProxy to JavaScript - result should be unknown
		const jsResult = (result as { toJs(): unknown }).toJs();

		// Clean up PyProxy
		if (
			result &&
			typeof result === 'object' &&
			'destroy' in result &&
			typeof (result as { destroy: () => void }).destroy === 'function'
		) {
			(result as { destroy: () => void }).destroy();
		}

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
	} finally {
		// Clean up global variables to prevent memory leaks
		pyodide.globals.delete('_ubumaths_autocomplete_code');
		pyodide.globals.delete('_ubumaths_autocomplete_cursor');
		pyodide.globals.delete('_ubumaths_autocomplete_namespace');
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
			await executeCode(message.code, message.id, message.contextId);
			break;

		case 'cancel':
			cancelExecution(message.id);
			break;

		case 'autocomplete':
			await handleAutocomplete(message.code, message.cursor, message.id, message.contextId);
			break;

		case 'create-context':
			createContext(message.contextId, message.persistent);
			break;

		case 'destroy-context':
			destroyContext(message.contextId);
			break;

		case 'reset-context':
			resetContext(message.contextId);
			break;

		case 'validate':
			await validateCode(message.code, message.config, message.id);
			break;

		case 'validate-exercise':
			await validateExercise(message.code, message.config, message.id);
			break;
	}
};

// Log that the worker is ready to receive messages
console.log('[Pyodide Worker] Worker initialized and ready');
