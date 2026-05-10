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
	BehaviorCheck,
	ExerciseValidationConfig,
	ExerciseValidationResult,
	TestCaseResult,
	ASTRequirement
} from '$lib/shared/python';
import {
	PYODIDE_CONFIG,
	LOADING_STAGES,
	LoadingStageIndex,
	CONTEXT_CONFIG,
	ERROR_MESSAGES,
	toWorkerMessageSchema
} from '$lib/shared/python';
import { compareOutputs } from '$lib/shared/python/validation/output-compare';

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

# =============================================================================
# Debug Generator Functions (Generator-based approach for true pause)
# =============================================================================

# Debug configuration constants
_UBUMATHS_DEBUG_MAX_SERIALIZE_DEPTH = 5
_UBUMATHS_DEBUG_MAX_SERIALIZE_ITEMS = 50
_UBUMATHS_DEBUG_MAX_STRING_LENGTH = 200
_UBUMATHS_DEBUG_MAX_KEY_LENGTH = 500

# Built-in types for type classification
_UBUMATHS_BUILTIN_TYPES = {'int', 'float', 'str', 'bool', 'list', 'dict', 'tuple', 'set', 'frozenset', 'NoneType', 'bytes', 'complex'}

# Types that should NOT be treated as user-class instances even if they have __dict__
import types as _ubumaths_types
_UBUMATHS_NON_INSTANCE_TYPES = (
    type,                                       # classes themselves
    _ubumaths_types.ModuleType,                 # modules
    _ubumaths_types.FunctionType,               # def-based functions
    _ubumaths_types.MethodType,                 # bound methods
    _ubumaths_types.BuiltinFunctionType,        # builtins
    _ubumaths_types.BuiltinMethodType,          # bound builtin methods
)


def _ubumaths_truncate_key(key_str):
    """Truncate dict keys / instance attr names for safe serialization."""
    if len(key_str) > _UBUMATHS_DEBUG_MAX_KEY_LENGTH:
        return key_str[:_UBUMATHS_DEBUG_MAX_KEY_LENGTH] + '...'
    return key_str


def _ubumaths_is_user_instance(value):
    """Detect a user-class instance (vs builtin / function / module / class)."""
    if isinstance(value, _UBUMATHS_NON_INSTANCE_TYPES):
        return False
    if not hasattr(value, '__dict__'):
        return False
    # Builtins and stdlib types (int, str, dict, ...) are excluded by the
    # isinstance checks performed before us in _ubumaths_serialize_with_heap.
    return True


def _ubumaths_serialize_with_heap(value, heap, depth=0):
    """Serialize a Python value with a shared heap dict.

    Primitives (int, float, str, bool, None, complex, bytes) stay inline as
    a dict with type+value. Containers (list, dict, set, tuple, frozenset)
    and user-class instances become HeapObjects in the shared heap dict and
    yield a HeapRef so aliases naturally collapse.

    Cycles are handled by inserting a placeholder in the heap BEFORE recursing
    into the object's contents -- a back-reference encountered during recursion
    finds the placeholder and emits a ref instead of recursing.

    Args:
        value: Any Python value to serialize
        heap: dict mapping str(id(value)) to HeapObject, mutated in place
        depth: Current recursion depth (default 0)

    Returns:
        dict -- InlineValue, HeapRef, or TruncatedValue
    """
    type_name = type(value).__name__

    # Depth limit applies to the contents of containers; the container itself
    # remains addressable via its HeapRef even when deep entries are truncated.
    if depth >= _UBUMATHS_DEBUG_MAX_SERIALIZE_DEPTH:
        return {'type': 'truncated', 'value': 'depth'}

    # --- Primitives (inline) --------------------------------------------------
    if value is None:
        return {'type': 'NoneType', 'value': 'None'}

    if isinstance(value, bool):
        return {'type': 'bool', 'value': str(value)}

    if isinstance(value, (int, float)):
        return {'type': type_name, 'value': str(value)}

    if isinstance(value, complex):
        return {'type': 'complex', 'value': str(value)}

    if isinstance(value, str):
        if len(value) > _UBUMATHS_DEBUG_MAX_STRING_LENGTH:
            return {'type': 'str', 'value': repr(value[:_UBUMATHS_DEBUG_MAX_STRING_LENGTH] + '...')}
        return {'type': 'str', 'value': repr(value)}

    if isinstance(value, bytes):
        if len(value) > _UBUMATHS_DEBUG_MAX_STRING_LENGTH:
            return {'type': 'bytes', 'value': repr(value[:_UBUMATHS_DEBUG_MAX_STRING_LENGTH]) + '...'}
        return {'type': 'bytes', 'value': repr(value)}

    # --- Heap objects (containers + user-class instances) ---------------------
    is_container = isinstance(value, (list, tuple, set, frozenset, dict))
    is_instance = _ubumaths_is_user_instance(value)

    if is_container or is_instance:
        obj_id = str(id(value))

        # Already serialized (or being serialized — cycle detection).
        if obj_id in heap:
            return {'type': 'ref', 'objectId': obj_id}

        # Resolve heap object type label.
        if isinstance(value, list):
            heap_type = 'list'
        elif isinstance(value, tuple):
            heap_type = 'tuple'
        elif isinstance(value, set):
            heap_type = 'set'
        elif isinstance(value, frozenset):
            heap_type = 'frozenset'
        elif isinstance(value, dict):
            heap_type = 'dict'
        else:
            class_name = type(value).__name__
            heap_type = 'instance:' + class_name

        # PRE-INSERT placeholder BEFORE recursing into contents — so any
        # back-reference we hit while recursing emits a HeapRef instead of
        # infinite recursion.
        placeholder = {
            'id': obj_id,
            'type': heap_type,
            'length': 0,
            'entries': []
        }
        heap[obj_id] = placeholder

        entries = []
        try:
            if isinstance(value, dict):
                length = len(value)
                for i, (k, v) in enumerate(value.items()):
                    if i >= _UBUMATHS_DEBUG_MAX_SERIALIZE_ITEMS:
                        entries.append({'value': {'type': 'truncated', 'value': 'items'}})
                        break
                    key_str = _ubumaths_truncate_key(str(k))
                    entries.append({
                        'key': key_str,
                        'value': _ubumaths_serialize_with_heap(v, heap, depth + 1)
                    })
            elif isinstance(value, (set, frozenset)):
                # Sort by repr for stable visual ordering across snapshots.
                try:
                    items = sorted(value, key=repr)
                except Exception:
                    items = list(value)
                length = len(items)
                for i, item in enumerate(items):
                    if i >= _UBUMATHS_DEBUG_MAX_SERIALIZE_ITEMS:
                        entries.append({'value': {'type': 'truncated', 'value': 'items'}})
                        break
                    entries.append({
                        'value': _ubumaths_serialize_with_heap(item, heap, depth + 1)
                    })
            elif is_instance:
                try:
                    attrs = vars(value)
                except TypeError:
                    attrs = {}
                length = len(attrs)
                for i, (attr_name, attr_value) in enumerate(attrs.items()):
                    if i >= _UBUMATHS_DEBUG_MAX_SERIALIZE_ITEMS:
                        entries.append({'value': {'type': 'truncated', 'value': 'items'}})
                        break
                    entries.append({
                        'key': _ubumaths_truncate_key(str(attr_name)),
                        'value': _ubumaths_serialize_with_heap(attr_value, heap, depth + 1)
                    })
            else:
                # list, tuple
                length = len(value)
                for i, item in enumerate(value):
                    if i >= _UBUMATHS_DEBUG_MAX_SERIALIZE_ITEMS:
                        entries.append({'value': {'type': 'truncated', 'value': 'items'}})
                        break
                    entries.append({
                        'value': _ubumaths_serialize_with_heap(item, heap, depth + 1)
                    })

            placeholder['length'] = length
            placeholder['entries'] = entries
        except Exception as e:
            # Defensive: if a __getattr__ / iteration raises, mark as truncated
            # so the heap object stays valid rather than corrupting the snapshot.
            placeholder['length'] = 0
            placeholder['entries'] = [{'value': {'type': 'truncated', 'value': 'error: ' + repr(e)[:100]}}]

        return {'type': 'ref', 'objectId': obj_id}

    # --- Fallback: functions, modules, classes, exotic types — inline repr ---
    repr_str = repr(value)
    if len(repr_str) > _UBUMATHS_DEBUG_MAX_STRING_LENGTH:
        repr_str = repr_str[:_UBUMATHS_DEBUG_MAX_STRING_LENGTH] + '...'
    return {'type': type_name, 'value': repr_str}


def _ubumaths_get_variables(namespace, prev_namespace=None, heap=None):
    """Extract variables from a namespace, populating the heap along the way.

    Args:
        namespace: dict of variables
        prev_namespace: dict of previous namespace for change detection
        heap: dict mapping object id to HeapObject, shared across the snapshot
              (created when None)

    Returns:
        list of variable dicts. The 'value' field is a JSON string of either
        InlineValue, HeapRef, or TruncatedValue.
    """
    import json

    if prev_namespace is None:
        prev_namespace = {}

    if heap is None:
        heap = {}

    variables = []

    for name, value in namespace.items():
        # Skip internal _ubumaths_ variables
        if name.startswith('_ubumaths_'):
            continue

        # Skip dunder variables
        if name.startswith('__') and name.endswith('__'):
            continue

        type_name = type(value).__name__
        is_builtin = type_name in _UBUMATHS_BUILTIN_TYPES

        # Serialize the value (may insert into heap)
        serialized = _ubumaths_serialize_with_heap(value, heap)

        # Check if value changed
        is_changed = False
        is_new = name not in prev_namespace

        if not is_new:
            try:
                prev_value = prev_namespace[name]
                is_changed = value != prev_value
            except:
                is_changed = True

        variables.append({
            'name': name,
            'value': json.dumps(serialized),
            'type': type_name,
            'isBuiltin': is_builtin,
            'isChanged': is_changed,
            'isNew': is_new,
            'objectId': str(id(value))
        })

    return variables


def _ubumaths_debug_generator(code, breakpoints_json):
    """Generator that yields control at each step for true pause.

    This generator parses code into AST and executes statement-by-statement,
    yielding a snapshot BEFORE each statement executes. This allows JavaScript
    to truly pause execution by not calling next() on the generator.

    Usage:
        gen = _ubumaths_debug_generator(code, breakpoints)
        snapshot = next(gen)  # Get first snapshot (paused at first line)

        # To continue:
        snapshot = gen.send('step')  # or 'step-over', 'continue', etc.

        # To stop:
        gen.close()

    Args:
        code: Python code to debug
        breakpoints_json: JSON string of breakpoints list

    Yields:
        dict: Debug snapshot with lineNumber, variables, callStack, etc.
    """
    import ast
    import json
    import time

    breakpoints = json.loads(breakpoints_json)

    # Execution namespace
    namespace = {'__builtins__': __builtins__}
    prev_namespace = {}

    # State tracking
    snapshot_id = 0
    start_time = time.time()
    stdout_capture = ""
    mode = 'step'  # 'step', 'step-over', 'step-out', 'continue', 'run-to-end'
    step_depth = 0  # For step-over/step-out tracking

    # Call stack for function tracking
    call_stack = []  # List of {'name': str, 'lineno': int, 'locals': dict}

    # Loop tracking
    active_loops = []  # List of {'lineno': int, 'iteration': int, 'type': 'for'|'while'}

    def create_snapshot(lineno, event='line'):
        """Create a debug snapshot at the current point."""
        nonlocal snapshot_id, prev_namespace
        snapshot_id += 1

        # Shared heap dict — populated by _ubumaths_serialize_with_heap as we
        # extract variables from each frame. Same Python id() across multiple
        # variables / frames produces a single HeapObject entry so aliases
        # naturally collapse to one node in the visualization.
        heap = {}

        # Build call stack frames
        frames = []

        # Add module frame
        module_vars = _ubumaths_get_variables(namespace, prev_namespace, heap)
        frames.append({
            'functionName': '<module>',
            'filename': '<exec>',
            'lineNumber': lineno,
            'locals': module_vars,
            'isCurrentFrame': len(call_stack) == 0
        })

        # Add function frames from call stack
        for i, frame_info in enumerate(call_stack):
            frame_vars = _ubumaths_get_variables(
                frame_info.get('locals', {}),
                frame_info.get('prev_locals', {}),
                heap
            )
            frames.append({
                'functionName': frame_info['name'],
                'filename': '<exec>',
                'lineNumber': frame_info['lineno'],
                'locals': frame_vars,
                'isCurrentFrame': i == len(call_stack) - 1
            })

        # Mark current frame
        if frames:
            for f in frames:
                f['isCurrentFrame'] = False
            frames[-1]['isCurrentFrame'] = True

        # Get global variables (from module namespace)
        globals_vars = module_vars

        snapshot = {
            'id': f'snap_{snapshot_id}',
            'lineNumber': lineno,
            'timestamp': time.time() * 1000,
            'callStack': frames,
            'globals': globals_vars,
            'loops': [{'loopId': f"loop_{l['lineno']}", 'lineNumber': l['lineno'], 'iterationCount': l['iteration'], 'loopType': l['type']} for l in active_loops],
            'stdout': stdout_capture,
            'event': event,
            'heap': list(heap.values())
        }

        # Update prev_namespace for change detection
        prev_namespace = dict(namespace)

        return snapshot

    def should_pause(lineno):
        """Determine if we should pause at this line."""
        nonlocal mode, step_depth

        current_depth = len(call_stack) + 1  # +1 for module level

        # run-to-end ignores everything, including breakpoints
        if mode == 'run-to-end':
            return False, None

        # Check breakpoints first
        for bp in breakpoints:
            if bp.get('enabled', True) and bp.get('lineNumber') == lineno:
                condition = bp.get('condition')
                if condition:
                    try:
                        if eval(condition, namespace):
                            return True, 'breakpoint'
                    except:
                        pass  # Condition failed
                else:
                    return True, 'breakpoint'

        # Check mode
        if mode == 'step':
            return True, 'step'

        if mode == 'step-over':
            if current_depth <= step_depth:
                return True, 'step'
            return False, None

        if mode == 'step-out':
            if current_depth < step_depth:
                return True, 'step'
            return False, None

        if mode == 'continue':
            # Only breakpoints (checked above)
            return False, None

        return False, None

    def get_node_end_lineno(node):
        """Get the end line number of a node."""
        if hasattr(node, 'end_lineno') and node.end_lineno:
            return node.end_lineno
        return getattr(node, 'lineno', 1)

    def execute_node(node, local_ns=None):
        """Execute a single AST node.

        This is a generator that yields snapshots before executing.
        """
        nonlocal namespace, stdout_capture, mode, step_depth, call_stack, active_loops

        exec_ns = local_ns if local_ns is not None else namespace
        lineno = getattr(node, 'lineno', 1)

        # Check if we should pause before this line
        should_stop, reason = should_pause(lineno)
        if should_stop:
            action = yield create_snapshot(lineno)
            if action:
                mode = action
                step_depth = len(call_stack) + 1
            if action == 'stop':
                return

        # Handle different node types
        if isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef):
            # Define the function - don't execute its body yet
            code_obj = compile(ast.Module(body=[node], type_ignores=[]), '<exec>', 'exec')
            exec(code_obj, exec_ns)

        elif isinstance(node, ast.ClassDef):
            # Define the class
            code_obj = compile(ast.Module(body=[node], type_ignores=[]), '<exec>', 'exec')
            exec(code_obj, exec_ns)

        elif isinstance(node, ast.For):
            # For loop - track iterations
            loop_info = {'lineno': lineno, 'iteration': 0, 'type': 'for'}
            active_loops.append(loop_info)

            try:
                # Evaluate the iterable
                iter_code = compile(ast.Expression(body=node.iter), '<expr>', 'eval')
                iterable = eval(iter_code, exec_ns)

                for item in iterable:
                    loop_info['iteration'] += 1

                    # Assign loop variable
                    if isinstance(node.target, ast.Name):
                        exec_ns[node.target.id] = item
                    else:
                        # Handle tuple unpacking, etc.
                        assign_node = ast.Assign(targets=[node.target], value=ast.Constant(value=item))
                        assign_code = compile(ast.Module(body=[assign_node], type_ignores=[]), '<exec>', 'exec')
                        exec(assign_code, exec_ns)

                    # Execute body statements
                    break_loop = False
                    for body_node in node.body:
                        if isinstance(body_node, ast.Break):
                            break_loop = True
                            break
                        elif isinstance(body_node, ast.Continue):
                            break
                        else:
                            result = yield from execute_node(body_node, exec_ns)
                            if result == 'break':
                                break_loop = True
                                break
                            elif result == 'continue':
                                break

                    if break_loop:
                        break
                else:
                    # Execute else clause if no break
                    for else_node in node.orelse:
                        yield from execute_node(else_node, exec_ns)
            finally:
                active_loops.pop()

        elif isinstance(node, ast.While):
            # While loop - track iterations
            loop_info = {'lineno': lineno, 'iteration': 0, 'type': 'while'}
            active_loops.append(loop_info)

            try:
                while True:
                    # Check condition
                    test_code = compile(ast.Expression(body=node.test), '<expr>', 'eval')
                    if not eval(test_code, exec_ns):
                        # Execute else clause
                        for else_node in node.orelse:
                            yield from execute_node(else_node, exec_ns)
                        break

                    loop_info['iteration'] += 1

                    # Execute body
                    break_loop = False
                    for body_node in node.body:
                        if isinstance(body_node, ast.Break):
                            break_loop = True
                            break
                        elif isinstance(body_node, ast.Continue):
                            break
                        else:
                            result = yield from execute_node(body_node, exec_ns)
                            if result == 'break':
                                break_loop = True
                                break
                            elif result == 'continue':
                                break

                    if break_loop:
                        break
            finally:
                active_loops.pop()

        elif isinstance(node, ast.If):
            # If statement
            test_code = compile(ast.Expression(body=node.test), '<expr>', 'eval')
            if eval(test_code, exec_ns):
                for body_node in node.body:
                    yield from execute_node(body_node, exec_ns)
            else:
                for else_node in node.orelse:
                    yield from execute_node(else_node, exec_ns)

        elif isinstance(node, ast.Try):
            # Try/except/finally
            try:
                for body_node in node.body:
                    yield from execute_node(body_node, exec_ns)
            except Exception as e:
                handled = False
                for handler in node.handlers:
                    if handler.type is None:
                        # Bare except
                        handled = True
                    else:
                        handler_type_code = compile(ast.Expression(body=handler.type), '<expr>', 'eval')
                        handler_type = eval(handler_type_code, exec_ns)
                        if isinstance(e, handler_type):
                            handled = True

                    if handled:
                        if handler.name:
                            exec_ns[handler.name] = e
                        for handler_node in handler.body:
                            yield from execute_node(handler_node, exec_ns)
                        break

                if not handled:
                    raise
            else:
                for else_node in node.orelse:
                    yield from execute_node(else_node, exec_ns)
            finally:
                for finally_node in node.finalbody:
                    yield from execute_node(finally_node, exec_ns)

        elif isinstance(node, ast.With):
            # With statement
            items = []
            for item in node.items:
                ctx_code = compile(ast.Expression(body=item.context_expr), '<expr>', 'eval')
                ctx_mgr = eval(ctx_code, exec_ns)
                value = ctx_mgr.__enter__()
                items.append((ctx_mgr, value, item.optional_vars))

                if item.optional_vars:
                    if isinstance(item.optional_vars, ast.Name):
                        exec_ns[item.optional_vars.id] = value
                    else:
                        assign = ast.Assign(targets=[item.optional_vars], value=ast.Constant(value=value))
                        exec(compile(ast.Module(body=[assign], type_ignores=[]), '<exec>', 'exec'), exec_ns)

            try:
                for body_node in node.body:
                    yield from execute_node(body_node, exec_ns)
            except Exception as e:
                for ctx_mgr, _, _ in reversed(items):
                    if not ctx_mgr.__exit__(type(e), e, e.__traceback__):
                        raise
            else:
                for ctx_mgr, _, _ in reversed(items):
                    ctx_mgr.__exit__(None, None, None)

        elif isinstance(node, ast.Break):
            return 'break'

        elif isinstance(node, ast.Continue):
            return 'continue'

        elif isinstance(node, ast.Return):
            if node.value:
                value_code = compile(ast.Expression(body=node.value), '<expr>', 'eval')
                return ('return', eval(value_code, exec_ns))
            return ('return', None)

        elif isinstance(node, ast.Expr):
            # Expression statement (including function calls)
            if isinstance(node.value, ast.Call):
                # Check if calling a user-defined function
                call_node = node.value
                func_name = None

                if isinstance(call_node.func, ast.Name):
                    func_name = call_node.func.id
                elif isinstance(call_node.func, ast.Attribute):
                    func_name = call_node.func.attr

                # Check if it's a user-defined function we should step into
                if func_name and func_name in exec_ns:
                    func = exec_ns[func_name]
                    if callable(func) and hasattr(func, '__code__'):
                        # This is a user-defined function
                        # For simplicity, just execute it normally
                        # Full step-into would require more complex handling
                        pass

            # Execute the expression
            code_obj = compile(ast.Module(body=[node], type_ignores=[]), '<exec>', 'exec')

            # Capture stdout
            import sys
            from io import StringIO
            old_stdout = sys.stdout
            sys.stdout = StringIO()
            try:
                exec(code_obj, exec_ns)
                output = sys.stdout.getvalue()
                if output:
                    stdout_capture += output
            finally:
                sys.stdout = old_stdout

        else:
            # Other statements (assignments, imports, etc.)
            code_obj = compile(ast.Module(body=[node], type_ignores=[]), '<exec>', 'exec')

            # Capture stdout
            import sys
            from io import StringIO
            old_stdout = sys.stdout
            sys.stdout = StringIO()
            try:
                exec(code_obj, exec_ns)
                output = sys.stdout.getvalue()
                if output:
                    stdout_capture += output
            finally:
                sys.stdout = old_stdout

    # Parse the code
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        # Yield error snapshot
        yield {
            'id': 'snap_error',
            'lineNumber': e.lineno or 1,
            'timestamp': time.time() * 1000,
            'callStack': [{
                'functionName': '<module>',
                'filename': '<exec>',
                'lineNumber': e.lineno or 1,
                'locals': [],
                'isCurrentFrame': True
            }],
            'globals': [],
            'loops': [],
            'stdout': '',
            'event': 'exception',
            'heap': [],
            'error': f'SyntaxError: {e.msg}'
        }
        return

    if not tree.body:
        # Empty code
        return

    # Yield initial snapshot at first line (before any execution)
    first_lineno = tree.body[0].lineno if tree.body else 1
    action = yield create_snapshot(first_lineno, 'start')
    if action:
        mode = action
        step_depth = 1
    if action == 'stop':
        return

    # Execute each top-level statement
    try:
        for node in tree.body:
            result = yield from execute_node(node)
            if result == 'stop':
                break
    except Exception as e:
        # Yield exception snapshot
        import traceback
        lineno = getattr(e, 'lineno', None)
        if lineno is None:
            # Try to extract from traceback
            tb = traceback.extract_tb(e.__traceback__)
            for frame in reversed(tb):
                if frame.filename in ('<exec>', '<expr>', '<unknown>'):
                    lineno = frame.lineno
                    break

        # Shared heap dict for the exception snapshot — same semantics as
        # create_snapshot above (one HeapObject per Python id, aliases collapse).
        _err_heap = {}
        _err_vars = _ubumaths_get_variables(namespace, None, _err_heap)
        yield {
            'id': f'snap_{snapshot_id + 1}',
            'lineNumber': lineno or 1,
            'timestamp': time.time() * 1000,
            'callStack': [{
                'functionName': '<module>',
                'filename': '<exec>',
                'lineNumber': lineno or 1,
                'locals': _err_vars,
                'isCurrentFrame': True
            }],
            'globals': _err_vars,
            'loops': [],
            'stdout': stdout_capture,
            'event': 'exception',
            'heap': list(_err_heap.values()),
            'error': f'{type(e).__name__}: {str(e)}'
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
 * Validate Python exercise code with the orthogonal AST + behavior pipeline.
 *
 * Pipeline:
 *   1. If `config.ast_requirements` is non-empty → check syntax then run AST
 *      checks. If anything fails, short-circuit with `failed_layer: 'ast'`.
 *   2. Otherwise (or after AST passes): if `config.behavior` is defined,
 *      run it and report `failed_layer: 'behavior'` on failure.
 *
 * `behavior_kind` is set on the result whenever behavior was configured —
 * even when AST short-circuits — so callers can render a stable label.
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

	// Fresh isolated namespace per validation. Student code, test scaffolding
	// (stdin/stdout redirects, function lookups, AST checks) all execute here
	// — this prevents leakage to/from the playground's main namespace and
	// between consecutive validations.
	const namespace = pyodide.runPython('dict()') as PyProxy;

	const behaviorKind = config.behavior?.kind;
	const hasAST = (config.ast_requirements?.length ?? 0) > 0;

	try {
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => reject(new Error('Timeout')), timeout);
		});

		const validationPromise: Promise<ExerciseValidationResult> = (async () => {
			let astIssues: string[] | undefined;

			if (hasAST) {
				const requirements = config.ast_requirements as ASTRequirement[];
				const syntaxIssue = await detectSyntaxError(code, namespace);
				if (syntaxIssue) {
					return {
						valid: false,
						failed_layer: 'ast',
						behavior_kind: behaviorKind,
						ast_issues: [`Erreur de syntaxe Python : ${syntaxIssue}`],
						test_results: [],
						execution_time_ms: 0
					};
				}

				astIssues = await runASTChecks(code, requirements, namespace);

				if (astIssues.length > 0) {
					return {
						valid: false,
						failed_layer: 'ast',
						behavior_kind: behaviorKind,
						ast_issues: astIssues,
						test_results: [],
						execution_time_ms: 0
					};
				}
			}

			if (config.behavior) {
				const { valid, test_results } = await runBehavior(code, config.behavior, namespace);
				return {
					valid,
					failed_layer: valid ? null : 'behavior',
					behavior_kind: config.behavior.kind,
					ast_issues: astIssues,
					test_results,
					execution_time_ms: 0
				};
			}

			// AST-only success
			return {
				valid: true,
				failed_layer: null,
				behavior_kind: undefined,
				ast_issues: astIssues,
				test_results: [],
				execution_time_ms: 0
			};
		})();

		const result = await Promise.race([validationPromise, timeoutPromise]);
		result.execution_time_ms = Math.round(performance.now() - startTime);

		postMessage({
			type: 'validation-exercise-result',
			result,
			id
		});
	} catch (error) {
		const executionTime = Math.round(performance.now() - startTime);
		const isTimeout = error instanceof Error && error.message === 'Timeout';

		postMessage({
			type: 'validation-exercise-result',
			result: {
				valid: false,
				failed_layer: null,
				behavior_kind: behaviorKind,
				test_results: [],
				error: isTimeout
					? "Délai d'exécution dépassé"
					: error instanceof Error
						? error.message
						: String(error),
				execution_time_ms: executionTime
			},
			id
		});
	} finally {
		if (typeof (namespace as { destroy?: () => void }).destroy === 'function') {
			(namespace as { destroy: () => void }).destroy();
		}
	}
}

/**
 * Run the behavior layer of the new pipeline. Dispatches by `kind` and
 * returns `{ valid, test_results }` — the surrounding pipeline owns the
 * `failed_layer` / `behavior_kind` fields.
 */
async function runBehavior(
	code: string,
	behavior: BehaviorCheck,
	namespace: PyProxy
): Promise<{ valid: boolean; test_results: TestCaseResult[] }> {
	if (behavior.kind === 'output') {
		return runOutputBehavior(code, behavior, namespace);
	}
	return runUnitTestBehavior(code, behavior, namespace);
}

/**
 * Detect a Python SyntaxError without raising. Returns the formatted error
 * message on failure, or `null` if the code parses cleanly. Used as a
 * pre-check before AST requirements so a SyntaxError surfaces once with a
 * dedicated message rather than being absorbed by every requirement check.
 */
async function detectSyntaxError(code: string, namespace: PyProxy): Promise<string | null> {
	if (!pyodide) {
		throw new Error(ERROR_MESSAGES.PYODIDE_NOT_READY);
	}

	namespace.set('_ubumaths_syntax_code', code);
	try {
		const message = (await pyodide.runPythonAsync(
			`
import ast as _ubumaths_ast

_msg = None
try:
    _ubumaths_ast.parse(_ubumaths_syntax_code)
except SyntaxError as _e:
    _line = _e.lineno or 0
    _detail = _e.msg or 'erreur de syntaxe'
    _msg = f"ligne {_line} : {_detail}"
_msg
`,
			{ globals: namespace }
		)) as string | null;
		return message ?? null;
	} finally {
		try {
			namespace.delete('_ubumaths_syntax_code');
		} catch {
			// Ignore cleanup errors
		}
	}
}

/**
 * Run a teacher-defined Python `compare(expected, actual, stdin)` function in
 * an isolated namespace, normalise its return value, and enforce a dedicated
 * timeout. The comparator's namespace is separate from the student's: neither
 * can see the other's locals.
 *
 * Accepts either a bool return (treated as `{ passed: bool }`) or a dict with
 * `passed` (and optionally `diff`/`error`). Anything else degrades to a clear
 * `passed: false` with an explanatory error.
 */
async function compareWithCustomScript(
	code: string,
	expected: string,
	actual: string,
	stdin: string,
	timeoutMs: number
): Promise<{ passed: boolean; diff?: string; error?: string }> {
	if (!pyodide) {
		throw new Error(ERROR_MESSAGES.PYODIDE_NOT_READY);
	}

	const namespace = pyodide.runPython('dict()') as PyProxy;

	try {
		// Load the comparator code into the isolated namespace.
		try {
			await pyodide.runPythonAsync(code, { globals: namespace });
		} catch (e) {
			return {
				passed: false,
				error: `Erreur dans le comparateur : ${e instanceof Error ? e.message : String(e)}`
			};
		}

		// Verify that `compare` exists and is callable.
		const hasCompare = (await pyodide.runPythonAsync(`'compare' in dir() and callable(compare)`, {
			globals: namespace
		})) as boolean;
		if (!hasCompare) {
			return {
				passed: false,
				error: "Le comparateur doit définir une fonction 'compare(expected, actual, stdin)'."
			};
		}

		// Inject args into the namespace (no string interpolation, safe).
		namespace.set('_ubumaths_cmp_expected', expected);
		namespace.set('_ubumaths_cmp_actual', actual);
		namespace.set('_ubumaths_cmp_stdin', stdin);

		const compareCall = pyodide.runPythonAsync(
			`
import json as _ubumaths_json
_ubumaths_raw = compare(_ubumaths_cmp_expected, _ubumaths_cmp_actual, _ubumaths_cmp_stdin)
if isinstance(_ubumaths_raw, bool):
    _ubumaths_payload = {'passed': _ubumaths_raw}
elif isinstance(_ubumaths_raw, dict):
    _ubumaths_payload = {
        'passed': bool(_ubumaths_raw.get('passed', False)),
    }
    if 'diff' in _ubumaths_raw and _ubumaths_raw['diff'] is not None:
        _ubumaths_payload['diff'] = str(_ubumaths_raw['diff'])
    if 'error' in _ubumaths_raw and _ubumaths_raw['error'] is not None:
        _ubumaths_payload['error'] = str(_ubumaths_raw['error'])
else:
    _ubumaths_payload = {'passed': False, 'error': "Le comparateur doit retourner True/False ou un dict {'passed': ..., 'diff'?: ...}."}
_ubumaths_json.dumps(_ubumaths_payload)
`,
			{ globals: namespace }
		);

		const timeoutPromise = new Promise<never>((_, reject) =>
			setTimeout(() => reject(new Error('CompareTimeout')), timeoutMs)
		);

		const jsonStr = (await Promise.race([compareCall, timeoutPromise])) as string;

		try {
			namespace.delete('_ubumaths_cmp_expected');
			namespace.delete('_ubumaths_cmp_actual');
			namespace.delete('_ubumaths_cmp_stdin');
		} catch {
			// Ignore cleanup errors (keys may not exist on early failure)
		}

		const parsed = JSON.parse(jsonStr) as {
			passed?: boolean;
			diff?: string;
			error?: string;
		};
		return {
			passed: parsed.passed === true,
			...(parsed.diff ? { diff: parsed.diff } : {}),
			...(parsed.error ? { error: parsed.error } : {})
		};
	} catch (e) {
		if (e instanceof Error && e.message === 'CompareTimeout') {
			return { passed: false, error: 'Le comparateur a dépassé le temps imparti.' };
		}
		return {
			passed: false,
			error: `Erreur dans le comparateur : ${e instanceof Error ? e.message : String(e)}`
		};
	} finally {
		if (typeof (namespace as { destroy?: () => void }).destroy === 'function') {
			(namespace as { destroy: () => void }).destroy();
		}
	}
}

/**
 * Strip sensitive fields (input/expected/actual/diff) from a TestCaseResult
 * when the source test case is hidden. The student-visible result then only
 * contains `passed`, `hidden: true`, and `error` if there was a runtime crash.
 *
 * Done in the worker (not on the main thread) so the redacted fields never
 * cross the postMessage boundary — even DevTools won't see them.
 */
function redactIfHidden(result: TestCaseResult, hidden: boolean): TestCaseResult {
	if (!hidden) return result;
	const redacted: TestCaseResult = { passed: result.passed, hidden: true };
	if (result.error !== undefined) redacted.error = result.error;
	return redacted;
}

/**
 * Validate using output comparison strategy.
 *
 * @param namespace Isolated Python dict where the student code runs and
 *   `_ubumaths_test_*` scaffolding lives. Must be a fresh empty dict
 *   provided by the caller; not shared with the playground namespace.
 */
async function runOutputBehavior(
	code: string,
	behavior: Extract<BehaviorCheck, { kind: 'output' }>,
	namespace: PyProxy
): Promise<{ valid: boolean; test_results: TestCaseResult[] }> {
	if (!pyodide) {
		throw new Error(ERROR_MESSAGES.PYODIDE_NOT_READY);
	}

	const testResults: TestCaseResult[] = [];
	let allPassed = true;

	for (const testCase of behavior.test_cases) {
		try {
			// Set up stdin redirection with test input.
			// Note: sys.stdin/stdout swap is global Python state; restored on
			// every path (success and error) below.
			await pyodide.runPythonAsync(
				`
import sys
from io import StringIO

_ubumaths_test_stdin = StringIO(${JSON.stringify(testCase.input)})
_ubumaths_test_stdout = StringIO()
_ubumaths_old_stdin = sys.stdin
_ubumaths_old_stdout = sys.stdout
sys.stdin = _ubumaths_test_stdin
sys.stdout = _ubumaths_test_stdout
`,
				{ globals: namespace }
			);

			// Execute student code in the isolated namespace
			await pyodide.runPythonAsync(code, { globals: namespace });

			// Capture output
			const actualOutput = (await pyodide.runPythonAsync(
				`
_actual = _ubumaths_test_stdout.getvalue()
sys.stdin = _ubumaths_old_stdin
sys.stdout = _ubumaths_old_stdout
_actual
`,
				{ globals: namespace }
			)) as string;

			// Compare outputs. Custom comparators run a teacher-defined Python
			// `compare()` in an isolated namespace; everything else uses the
			// JS-pure engine.
			const cmp = testCase.comparison ?? behavior.comparison;
			const compareResult =
				cmp.kind === 'custom'
					? await compareWithCustomScript(
							cmp.code,
							testCase.expected_output,
							actualOutput,
							testCase.input,
							cmp.timeout_ms ?? 2000
						)
					: compareOutputs(testCase.expected_output, actualOutput, cmp);
			allPassed = allPassed && compareResult.passed;

			testResults.push(
				redactIfHidden(
					{
						passed: compareResult.passed,
						input: testCase.input,
						expected: testCase.expected_output,
						actual: actualOutput,
						...(compareResult.diff ? { diff: compareResult.diff } : {}),
						...(compareResult.error ? { error: compareResult.error } : {})
					},
					testCase.hidden === true
				)
			);
		} catch (error) {
			allPassed = false;
			testResults.push(
				redactIfHidden(
					{
						passed: false,
						input: testCase.input,
						expected: testCase.expected_output,
						error: error instanceof Error ? error.message : String(error)
					},
					testCase.hidden === true
				)
			);

			// Restore sys.stdin/stdout even on error
			try {
				await pyodide.runPythonAsync(
					`
import sys
sys.stdin = _ubumaths_old_stdin
sys.stdout = _ubumaths_old_stdout
`,
					{ globals: namespace }
				);
			} catch {
				// Ignore cleanup errors
			}
		}
	}

	return {
		valid: allPassed,
		test_results: testResults
	};
}

/**
 * Run the unit-test behavior layer.
 *
 * @param namespace Isolated Python dict where the student-defined function
 *   lives and is invoked. Test args/expected are also injected into this
 *   namespace via `namespace.set(...)` so they don't leak to globals.
 */
async function runUnitTestBehavior(
	code: string,
	behavior: Extract<BehaviorCheck, { kind: 'unit_test' }>,
	namespace: PyProxy
): Promise<{ valid: boolean; test_results: TestCaseResult[] }> {
	if (!pyodide) {
		throw new Error(ERROR_MESSAGES.PYODIDE_NOT_READY);
	}

	const testResults: TestCaseResult[] = [];
	let allPassed = true;

	try {
		// Execute student code to define the function in the isolated namespace
		await pyodide.runPythonAsync(code, { globals: namespace });

		// Verify the function exists *in the isolated namespace*. dir() with no
		// args in our globals returns the namespace's keys.
		const functionExists = (await pyodide.runPythonAsync(`'${behavior.function_name}' in dir()`, {
			globals: namespace
		})) as boolean;

		if (!functionExists) {
			return {
				valid: false,
				test_results: [
					{
						passed: false,
						error: `La fonction '${behavior.function_name}' n'est pas definie`
					}
				]
			};
		}

		// Run test cases
		for (const testCase of behavior.test_cases) {
			try {
				// Inject test args/expected into the isolated namespace
				namespace.set('_ubumaths_test_args', testCase.args);
				namespace.set('_ubumaths_test_expected', testCase.expected);

				// Call function and compare result, all within the namespace
				const result = (await pyodide.runPythonAsync(
					`
import json
_args = _ubumaths_test_args
_expected = _ubumaths_test_expected
_actual = ${behavior.function_name}(*_args)
_passed = _actual == _expected
{
    'passed': _passed,
    'actual': _actual,
    'expected': _expected
}
`,
					{ globals: namespace }
				)) as PyProxy;

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

				testResults.push(
					redactIfHidden(
						{
							passed: jsResult.passed,
							expected: JSON.stringify(jsResult.expected),
							actual: JSON.stringify(jsResult.actual),
							input: `${behavior.function_name}(${testCase.args.map((a) => JSON.stringify(a)).join(', ')})`
						},
						testCase.hidden === true
					)
				);

				// Clean up test args/expected from namespace
				namespace.delete('_ubumaths_test_args');
				namespace.delete('_ubumaths_test_expected');
			} catch (error) {
				allPassed = false;
				testResults.push(
					redactIfHidden(
						{
							passed: false,
							input: `${behavior.function_name}(${testCase.args.map((a) => JSON.stringify(a)).join(', ')})`,
							expected: JSON.stringify(testCase.expected),
							error: error instanceof Error ? error.message : String(error)
						},
						testCase.hidden === true
					)
				);

				// Clean up test args/expected on error too
				try {
					namespace.delete('_ubumaths_test_args');
					namespace.delete('_ubumaths_test_expected');
				} catch {
					// Ignore cleanup errors (key may not exist)
				}
			}
		}
	} catch (error) {
		return {
			valid: false,
			test_results: [
				{
					passed: false,
					error: error instanceof Error ? error.message : String(error)
				}
			]
		};
	}

	return {
		valid: allPassed,
		test_results: testResults
	};
}

/**
 * Run AST structural checks against the parsed code, returning the list of
 * issues (one entry per failed requirement). An empty array means every
 * requirement passed.
 *
 * @param namespace Isolated Python dict. AST analysis only inspects the
 *   parsed code and doesn't execute it, so isolation is not strictly required
 *   here, but reusing the namespace keeps the pipeline coherent in case
 *   behavior runs next.
 */
async function runASTChecks(
	code: string,
	requirements: ASTRequirement[],
	namespace: PyProxy
): Promise<string[]> {
	if (!pyodide) {
		throw new Error(ERROR_MESSAGES.PYODIDE_NOT_READY);
	}

	const astIssues: string[] = [];

	for (const requirement of requirements) {
		try {
			namespace.set('_ubumaths_ast_code', code);
			namespace.set('_ubumaths_ast_requirement_type', requirement.type);
			namespace.set('_ubumaths_ast_requirement_name', requirement.name || '');

			const passed = (await pyodide.runPythonAsync(
				`
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
`,
				{ globals: namespace }
			)) as boolean;

			namespace.delete('_ubumaths_ast_code');
			namespace.delete('_ubumaths_ast_requirement_type');
			namespace.delete('_ubumaths_ast_requirement_name');

			if (!passed) {
				astIssues.push(requirement.message);
			}
		} catch (error) {
			try {
				namespace.delete('_ubumaths_ast_code');
				namespace.delete('_ubumaths_ast_requirement_type');
				namespace.delete('_ubumaths_ast_requirement_name');
			} catch {
				// Ignore cleanup errors (key may not exist)
			}

			astIssues.push(
				`${requirement.message} (erreur: ${error instanceof Error ? error.message : String(error)})`
			);
		}
	}

	return astIssues;
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
// Debug Execution (Generator-based approach)
// =============================================================================

/**
 * Debug state tracking
 */
interface DebugState {
	isActive: boolean;
	executionId: string | null;
	timeout: ReturnType<typeof setTimeout> | null;
	generator: PyProxy | null;
	startTime: number;
}

const debugState: DebugState = {
	isActive: false,
	executionId: null,
	timeout: null,
	generator: null,
	startTime: 0
};

/**
 * Breakpoint interface for debug-start message
 */
interface WorkerBreakpoint {
	lineNumber: number;
	enabled: boolean;
	condition?: string;
}

/**
 * Debug step action type
 */
type DebugStepAction = 'step' | 'step-over' | 'step-out' | 'continue' | 'run-to-end';

/**
 * Convert JavaScript Map objects to plain objects recursively
 */
function convertMapToObject(obj: unknown): unknown {
	if (obj instanceof Map) {
		const result: Record<string, unknown> = {};
		obj.forEach((value, key) => {
			result[String(key)] = convertMapToObject(value);
		});
		return result;
	}

	if (Array.isArray(obj)) {
		return obj.map(convertMapToObject);
	}

	if (obj && typeof obj === 'object') {
		const result: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(obj)) {
			result[key] = convertMapToObject(value);
		}
		return result;
	}

	return obj;
}

/**
 * Process a snapshot from the Python generator
 */
function processSnapshot(
	snapshotProxy: PyProxy,
	_id: string
): { snapshot: Record<string, unknown>; hasError: boolean } | null {
	if (!snapshotProxy) {
		return null;
	}

	try {
		const snapshot = (snapshotProxy as { toJs: () => unknown }).toJs() as Record<string, unknown>;

		// Clean up PyProxy
		if (typeof (snapshotProxy as { destroy?: () => void }).destroy === 'function') {
			(snapshotProxy as { destroy: () => void }).destroy();
		}

		// Convert Map to object if needed
		const snapshotObj = convertMapToObject(snapshot) as Record<string, unknown>;

		// Check if this is an error snapshot
		const hasError = snapshotObj.event === 'exception' || 'error' in snapshotObj;

		return { snapshot: snapshotObj, hasError };
	} catch (e) {
		console.warn('[Pyodide Worker] Error processing snapshot:', e);
		return null;
	}
}

/**
 * Start debug execution using generator-based approach
 * The generator yields control at each step, allowing true pause
 */
async function debugStartExecution(
	code: string,
	id: string,
	breakpoints: WorkerBreakpoint[]
): Promise<void> {
	if (!pyodide) {
		postMessage({
			type: 'error',
			message: ERROR_MESSAGES.PYODIDE_NOT_READY,
			id
		});
		return;
	}

	// Check if another debug session is active
	if (debugState.isActive) {
		postMessage({
			type: 'error',
			message: 'Another debug session is already active',
			id
		});
		return;
	}

	debugState.isActive = true;
	debugState.executionId = id;
	debugState.startTime = performance.now();

	// Set up timeout (longer for debug sessions)
	const DEBUG_TIMEOUT_MS = 300_000; // 5 minutes for debug sessions
	debugState.timeout = setTimeout(() => {
		if (debugState.executionId === id) {
			debugStopExecution(id);
			postMessage({ type: 'timeout', id });
		}
	}, DEBUG_TIMEOUT_MS);

	try {
		// Load required packages before execution
		await loadRequiredPackages(code, id);

		// Check if execution was cancelled during package loading
		if (debugState.executionId !== id) {
			return;
		}

		// Convert breakpoints to JSON
		const breakpointsJson = JSON.stringify(breakpoints);

		// Create the generator
		pyodide.globals.set('_ubumaths_debug_code', code);
		pyodide.globals.set('_ubumaths_debug_breakpoints_json', breakpointsJson);

		const generator = pyodide.runPython(`
_ubumaths_debug_generator(_ubumaths_debug_code, _ubumaths_debug_breakpoints_json)
`) as PyProxy;

		// Clean up globals
		pyodide.globals.delete('_ubumaths_debug_code');
		pyodide.globals.delete('_ubumaths_debug_breakpoints_json');

		debugState.generator = generator;

		// Get first snapshot (paused at first line or error)
		const firstResult = (generator as unknown as { __next__: () => unknown }).__next__();

		const processed = processSnapshot(firstResult as PyProxy, id);

		if (!processed) {
			// Empty code or generator finished immediately
			debugStopExecution(id);
			postMessage({
				type: 'debug-finished',
				id,
				duration: Math.round(performance.now() - debugState.startTime)
			});
			return;
		}

		const { snapshot, hasError } = processed;

		// Send snapshot
		postMessage({
			type: 'debug-snapshot',
			id,
			snapshot: snapshot as FromWorkerMessage extends { type: 'debug-snapshot' }
				? FromWorkerMessage['snapshot']
				: never
		});

		if (hasError) {
			// Send error and finish
			postMessage({
				type: 'debug-paused',
				id,
				reason: 'exception'
			});
		} else {
			// Paused at start
			postMessage({
				type: 'debug-paused',
				id,
				reason: 'start'
			});
		}
	} catch (error) {
		// Check if this execution was cancelled
		if (debugState.executionId !== id) {
			return;
		}

		// Clean up
		if (debugState.generator) {
			try {
				if (typeof (debugState.generator as { destroy?: () => void }).destroy === 'function') {
					(debugState.generator as { destroy: () => void }).destroy();
				}
			} catch {
				// Ignore cleanup errors
			}
			debugState.generator = null;
		}

		debugState.isActive = false;
		debugState.executionId = null;

		if (debugState.timeout) {
			clearTimeout(debugState.timeout);
			debugState.timeout = null;
		}

		const errorMessage = error instanceof Error ? error.message : String(error);
		postMessage({
			type: 'error',
			message: errorMessage,
			id
		});
	}
}

/**
 * Handle debug step action using generator
 * Sends action to generator and receives next snapshot
 */
async function debugStep(id: string, action: DebugStepAction): Promise<void> {
	if (!pyodide) {
		postMessage({
			type: 'error',
			message: ERROR_MESSAGES.PYODIDE_NOT_READY,
			id
		});
		return;
	}

	if (!debugState.isActive || debugState.executionId !== id || !debugState.generator) {
		postMessage({
			type: 'error',
			message: 'No active debug session for this ID',
			id
		});
		return;
	}

	try {
		// Send action to generator and get next snapshot
		const result = (debugState.generator as unknown as { send: (value: string) => unknown }).send(
			action
		);

		const processed = processSnapshot(result as PyProxy, id);

		if (!processed) {
			// Generator finished - StopIteration was raised
			const duration = Math.round(performance.now() - debugState.startTime);
			debugStopExecution(id);
			postMessage({
				type: 'debug-finished',
				id,
				duration
			});
			return;
		}

		const { snapshot, hasError } = processed;

		// Send snapshot
		postMessage({
			type: 'debug-snapshot',
			id,
			snapshot: snapshot as FromWorkerMessage extends { type: 'debug-snapshot' }
				? FromWorkerMessage['snapshot']
				: never
		});

		if (hasError) {
			postMessage({
				type: 'debug-paused',
				id,
				reason: 'exception'
			});
		} else {
			// Determine pause reason based on snapshot
			const _lineNumber = snapshot.lineNumber as number;

			// Check if stopped at breakpoint
			const isBreakpoint = false;
			// We'd need to track breakpoints to check this properly
			// For now, default to 'step' (lineNumber could be used for breakpoint matching)

			postMessage({
				type: 'debug-paused',
				id,
				reason: isBreakpoint ? 'breakpoint' : 'step'
			});
		}
	} catch (error) {
		// Check if it's a StopIteration (generator finished)
		// Use type checking first for reliability, fall back to string matching
		const isPyodideError = error && typeof error === 'object' && 'type' in error;
		const isStopIteration = isPyodideError
			? (error as { type?: string }).type === 'StopIteration'
			: false;

		if (isStopIteration || String(error).includes('StopIteration')) {
			const duration = Math.round(performance.now() - debugState.startTime);
			debugStopExecution(id);
			postMessage({
				type: 'debug-finished',
				id,
				duration
			});
			return;
		}

		// Real error
		const errorMessage = error instanceof Error ? error.message : String(error);
		postMessage({
			type: 'error',
			message: errorMessage,
			id
		});
	}
}

/**
 * Stop debug execution
 * Cleans up generator and debug state
 */
function debugStopExecution(id: string): void {
	if (debugState.executionId !== id) {
		return;
	}

	// Clear timeout
	if (debugState.timeout) {
		clearTimeout(debugState.timeout);
		debugState.timeout = null;
	}

	// Close and destroy generator
	if (debugState.generator) {
		try {
			// Try to close the generator gracefully
			const gen = debugState.generator as unknown as { close?: () => void };
			if (typeof gen.close === 'function') {
				gen.close();
			}
		} catch {
			// Ignore errors during close
		}

		try {
			// Destroy the PyProxy
			if (typeof (debugState.generator as { destroy?: () => void }).destroy === 'function') {
				(debugState.generator as { destroy: () => void }).destroy();
			}
		} catch {
			// Ignore errors during destroy
		}

		debugState.generator = null;
	}

	debugState.isActive = false;
	debugState.executionId = null;

	// Don't send debug-finished here - caller should send it with duration
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

		case 'debug-start':
			await debugStartExecution(message.code, message.id, message.breakpoints);
			break;

		case 'debug-step':
			await debugStep(message.id, message.action);
			break;

		case 'debug-stop':
			debugStopExecution(message.id);
			postMessage({
				type: 'debug-finished',
				id: message.id,
				duration: Math.round(performance.now() - debugState.startTime)
			});
			break;
	}
};

// Log that the worker is ready to receive messages
console.log('[Pyodide Worker] Worker initialized and ready');
