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
	ExerciseValidationConfig
} from '$lib/shared/python';
import {
	PYODIDE_CONFIG,
	LOADING_STAGES,
	LoadingStageIndex,
	CONTEXT_CONFIG,
	ERROR_MESSAGES,
	toWorkerMessageSchema
} from '$lib/shared/python';
import { runExerciseValidation } from '$lib/shared/python/validation-core';

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
def _chiphre_reformat_exception():
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
def _chiphre_check_sympy_result(result):
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
def _chiphre_get_completions(code, cursor_pos, namespace=None):
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
def _chiphre_validate_syntax(code):
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
_CHIPHRE_DEBUG_MAX_SERIALIZE_DEPTH = 5
_CHIPHRE_DEBUG_MAX_SERIALIZE_ITEMS = 50
_CHIPHRE_DEBUG_MAX_STRING_LENGTH = 200
_CHIPHRE_DEBUG_MAX_KEY_LENGTH = 500

# Built-in types for type classification
_CHIPHRE_BUILTIN_TYPES = {'int', 'float', 'str', 'bool', 'list', 'dict', 'tuple', 'set', 'frozenset', 'NoneType', 'bytes', 'complex'}

# Types that should NOT be treated as user-class instances even if they have __dict__
import types as _chiphre_types
_CHIPHRE_NON_INSTANCE_TYPES = (
    type,                                       # classes themselves
    _chiphre_types.ModuleType,                 # modules
    _chiphre_types.FunctionType,               # def-based functions
    _chiphre_types.MethodType,                 # bound methods
    _chiphre_types.BuiltinFunctionType,        # builtins
    _chiphre_types.BuiltinMethodType,          # bound builtin methods
)


def _chiphre_truncate_key(key_str):
    """Truncate dict keys / instance attr names for safe serialization."""
    if len(key_str) > _CHIPHRE_DEBUG_MAX_KEY_LENGTH:
        return key_str[:_CHIPHRE_DEBUG_MAX_KEY_LENGTH] + '...'
    return key_str


def _chiphre_is_user_instance(value):
    """Detect a user-class instance (vs builtin / function / module / class)."""
    if isinstance(value, _CHIPHRE_NON_INSTANCE_TYPES):
        return False
    if not hasattr(value, '__dict__'):
        return False
    # Builtins and stdlib types (int, str, dict, ...) are excluded by the
    # isinstance checks performed before us in _chiphre_serialize_with_heap.
    return True


def _chiphre_serialize_with_heap(value, heap, depth=0):
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
    if depth >= _CHIPHRE_DEBUG_MAX_SERIALIZE_DEPTH:
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
        if len(value) > _CHIPHRE_DEBUG_MAX_STRING_LENGTH:
            return {'type': 'str', 'value': repr(value[:_CHIPHRE_DEBUG_MAX_STRING_LENGTH] + '...')}
        return {'type': 'str', 'value': repr(value)}

    if isinstance(value, bytes):
        if len(value) > _CHIPHRE_DEBUG_MAX_STRING_LENGTH:
            return {'type': 'bytes', 'value': repr(value[:_CHIPHRE_DEBUG_MAX_STRING_LENGTH]) + '...'}
        return {'type': 'bytes', 'value': repr(value)}

    # --- Heap objects (containers + user-class instances) ---------------------
    is_container = isinstance(value, (list, tuple, set, frozenset, dict))
    is_instance = _chiphre_is_user_instance(value)

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
                    if i >= _CHIPHRE_DEBUG_MAX_SERIALIZE_ITEMS:
                        entries.append({'value': {'type': 'truncated', 'value': 'items'}})
                        break
                    key_str = _chiphre_truncate_key(str(k))
                    entries.append({
                        'key': key_str,
                        'value': _chiphre_serialize_with_heap(v, heap, depth + 1)
                    })
            elif isinstance(value, (set, frozenset)):
                # Sort by repr for stable visual ordering across snapshots.
                try:
                    items = sorted(value, key=repr)
                except Exception:
                    items = list(value)
                length = len(items)
                for i, item in enumerate(items):
                    if i >= _CHIPHRE_DEBUG_MAX_SERIALIZE_ITEMS:
                        entries.append({'value': {'type': 'truncated', 'value': 'items'}})
                        break
                    entries.append({
                        'value': _chiphre_serialize_with_heap(item, heap, depth + 1)
                    })
            elif is_instance:
                try:
                    attrs = vars(value)
                except TypeError:
                    attrs = {}
                length = len(attrs)
                for i, (attr_name, attr_value) in enumerate(attrs.items()):
                    if i >= _CHIPHRE_DEBUG_MAX_SERIALIZE_ITEMS:
                        entries.append({'value': {'type': 'truncated', 'value': 'items'}})
                        break
                    entries.append({
                        'key': _chiphre_truncate_key(str(attr_name)),
                        'value': _chiphre_serialize_with_heap(attr_value, heap, depth + 1)
                    })
            else:
                # list, tuple
                length = len(value)
                for i, item in enumerate(value):
                    if i >= _CHIPHRE_DEBUG_MAX_SERIALIZE_ITEMS:
                        entries.append({'value': {'type': 'truncated', 'value': 'items'}})
                        break
                    entries.append({
                        'value': _chiphre_serialize_with_heap(item, heap, depth + 1)
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
    if len(repr_str) > _CHIPHRE_DEBUG_MAX_STRING_LENGTH:
        repr_str = repr_str[:_CHIPHRE_DEBUG_MAX_STRING_LENGTH] + '...'
    return {'type': type_name, 'value': repr_str}


def _chiphre_get_variables(namespace, prev_namespace=None, heap=None):
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
        # Skip internal _chiphre_ variables
        if name.startswith('_chiphre_'):
            continue

        # Skip dunder variables
        if name.startswith('__') and name.endswith('__'):
            continue

        type_name = type(value).__name__
        is_builtin = type_name in _CHIPHRE_BUILTIN_TYPES

        # Serialize the value (may insert into heap)
        serialized = _chiphre_serialize_with_heap(value, heap)

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


def _chiphre_record_trace(code, step_budget):
    """Record a full execution trace using sys.settrace.

    Unlike the legacy AST interpreter, this steps INTO user-defined function
    calls (real frames via the frame chain), so the call stack, recursion and
    call/return events all work. Only frames from the compiled user code are
    traced (library internals are skipped via the co_filename filter).

    Returns {'snapshots': [...], 'truncated': bool, 'error': str|None}.
    """
    import sys
    import time as _t
    import io

    filename = '<chiphre-debug>'
    snapshots = []
    state = {'truncated': False, 'sid': 0}
    prev_by_frame = {}

    class _BudgetExceeded(Exception):
        pass

    try:
        compiled = compile(code, filename, 'exec')
    except SyntaxError as e:
        return {
            'snapshots': [{
                'id': 'snap_1',
                'lineNumber': e.lineno or 1,
                'timestamp': _t.time() * 1000,
                'callStack': [{'functionName': '<module>', 'filename': '<exec>', 'lineNumber': e.lineno or 1, 'locals': [], 'isCurrentFrame': True}],
                'globals': [], 'loops': [], 'stdout': '', 'event': 'exception', 'heap': []
            }],
            'truncated': False,
            'error': 'SyntaxError: ' + (e.msg or '')
        }

    exec_globals = {'__name__': '__main__', '__builtins__': __builtins__}
    buffer = io.StringIO()

    def user_chain(frame):
        chain = []
        f = frame
        while f is not None:
            if f.f_code.co_filename == filename:
                chain.append(f)
            f = f.f_back
        chain.reverse()
        return chain

    def build_snapshot(frame, event, arg=None):
        state['sid'] += 1
        heap = {}
        chain = user_chain(frame)
        frames = []
        for idx, fr in enumerate(chain):
            name = '<module>' if idx == 0 else fr.f_code.co_name
            prev = prev_by_frame.get(id(fr))
            local_vars = _chiphre_get_variables(fr.f_locals, prev, heap)
            frames.append({
                'functionName': name,
                'filename': '<exec>',
                'lineNumber': max(1, fr.f_lineno),
                'locals': local_vars,
                'isCurrentFrame': False
            })
        if frames:
            frames[-1]['isCurrentFrame'] = True
        globals_vars = frames[0]['locals'] if frames else []
        snapshot = {
            'id': 'snap_' + str(state['sid']),
            'lineNumber': max(1, frame.f_lineno),
            'timestamp': _t.time() * 1000,
            'callStack': frames,
            'globals': globals_vars,
            'loops': [],
            'stdout': buffer.getvalue(),
            'event': event,
            'heap': list(heap.values())
        }
        # Capture the returned value (settrace passes it as 'arg' on 'return')
        # so the call/recursion tree can show f(args) -> result.
        if event == 'return':
            try:
                r = repr(arg)
            except Exception:
                r = '<non affichable>'
            snapshot['returnValue'] = r if len(r) <= 80 else r[:77] + '...'
        return snapshot

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != filename:
            return None
        if event in ('call', 'line', 'return', 'exception'):
            if frame.f_lineno < 1:
                # The module-level 'call' fires before any line runs (lineno 0);
                # skip it so the first recorded step is line 1.
                return tracer
            if len(snapshots) >= step_budget:
                state['truncated'] = True
                raise _BudgetExceeded()
            snapshots.append(build_snapshot(frame, event, arg))
            for fr in user_chain(frame):
                prev_by_frame[id(fr)] = dict(fr.f_locals)
        return tracer

    old_stdout = sys.stdout
    old_trace = sys.gettrace()
    sys.stdout = buffer
    error = None
    sys.settrace(tracer)
    try:
        exec(compiled, exec_globals)
    except _BudgetExceeded:
        state['truncated'] = True
    except Exception as e:
        error = type(e).__name__ + ': ' + str(e)
    finally:
        sys.settrace(old_trace)
        sys.stdout = old_stdout

    return {'snapshots': snapshots, 'truncated': state['truncated'], 'error': error}


def _chiphre_debug_generator(code, breakpoints_json):
    """Record the whole execution via sys.settrace, then replay snapshots.

    The step action sent via .send() is ignored — the record-then-replay model
    drives this to completion. Breakpoints are ignored here (the UI navigates to
    breakpoints in the recorded trace, client-side).
    """
    _rec = _chiphre_record_trace(code, 1000)
    for _snap in _rec['snapshots']:
        yield _snap
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
def _chiphre_get_plot_base64():
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
def _chiphre_cleanup_matplotlib():
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
_chiphre_plotly_fig = None

def _chiphre_get_plotly_json():
    """Get current Plotly figure as JSON specification."""
    global _chiphre_plotly_fig
    try:
        import plotly.io as pio
        if _chiphre_plotly_fig is not None:
            result = pio.to_json(_chiphre_plotly_fig)
            _chiphre_plotly_fig = None  # Clear after export
            return result
    except Exception as e:
        print(f"Plotly error: {e}")
    return None

def _chiphre_check_plotly_result(result):
    """Check if result is a Plotly figure and store it for export."""
    global _chiphre_plotly_fig
    try:
        from plotly.graph_objs import Figure
        if isinstance(result, Figure):
            _chiphre_plotly_fig = result
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

_chiphre_stdout = StringIO()
_chiphre_stderr = StringIO()
_chiphre_old_stdout = sys.stdout
_chiphre_old_stderr = sys.stderr
sys.stdout = _chiphre_stdout
sys.stderr = _chiphre_stderr
`);

		// Prepare the namespace for execution
		if (useNamespace) {
			pyodide.globals.set('_chiphre_exec_namespace', namespace);
		}

		// Execute the user code and capture the last expression result for sympy detection
		// We use compile() with 'single' mode to get REPL-like behavior where
		// the last expression value is available
		const execCode = useNamespace
			? `
import ast

_chiphre_last_result = None
_chiphre_user_code = ${JSON.stringify(code)}
_chiphre_ns = _chiphre_exec_namespace

# Parse the code to separate statements from the final expression
try:
    _chiphre_tree = ast.parse(_chiphre_user_code)

    if _chiphre_tree.body:
        # Check if the last item is an expression (not assignment, etc.)
        _chiphre_last_node = _chiphre_tree.body[-1]

        if isinstance(_chiphre_last_node, ast.Expr):
            # Execute all but the last statement
            if len(_chiphre_tree.body) > 1:
                _chiphre_init_tree = ast.Module(body=_chiphre_tree.body[:-1], type_ignores=[])
                exec(compile(_chiphre_init_tree, '<exec>', 'exec'), _chiphre_ns, _chiphre_ns)

            # Evaluate the last expression and capture result
            _chiphre_expr_tree = ast.Expression(body=_chiphre_last_node.value)
            _chiphre_last_result = eval(compile(_chiphre_expr_tree, '<expr>', 'eval'), _chiphre_ns, _chiphre_ns)
        else:
            # No trailing expression, just execute everything
            exec(_chiphre_user_code, _chiphre_ns, _chiphre_ns)
    else:
        # Empty code
        pass
except SyntaxError as e:
    # Re-raise SyntaxError to be caught by JavaScript
    raise e
`
			: `
import ast

_chiphre_last_result = None
_chiphre_user_code = ${JSON.stringify(code)}

# Parse the code to separate statements from the final expression
try:
    _chiphre_tree = ast.parse(_chiphre_user_code)

    if _chiphre_tree.body:
        # Check if the last item is an expression (not assignment, etc.)
        _chiphre_last_node = _chiphre_tree.body[-1]

        if isinstance(_chiphre_last_node, ast.Expr):
            # Execute all but the last statement
            if len(_chiphre_tree.body) > 1:
                _chiphre_init_tree = ast.Module(body=_chiphre_tree.body[:-1], type_ignores=[])
                exec(compile(_chiphre_init_tree, '<exec>', 'exec'))

            # Evaluate the last expression and capture result
            _chiphre_expr_tree = ast.Expression(body=_chiphre_last_node.value)
            _chiphre_last_result = eval(compile(_chiphre_expr_tree, '<expr>', 'eval'))
        else:
            # No trailing expression, just execute everything
            exec(_chiphre_user_code)
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
_stdout_value = _chiphre_stdout.getvalue()
sys.stdout = _chiphre_old_stdout
_stdout_value
`) as string;

		if (stdout && stdout.trim()) {
			postMessage({ type: 'stdout', data: stdout, id });
		}

		// Capture stderr
		const stderr = pyodide.runPython(`
_stderr_value = _chiphre_stderr.getvalue()
sys.stderr = _chiphre_old_stderr
_stderr_value
`) as string;

		if (stderr && stderr.trim()) {
			postMessage({ type: 'stderr', data: stderr, id });
		}

		// Check for sympy LaTeX output
		const latexResult = pyodide.runPython('_chiphre_check_sympy_result(_chiphre_last_result)') as
			| string
			| null;
		if (latexResult) {
			postMessage({ type: 'latex', latex: latexResult, id });
		}

		// Check for Plotly output (only if plotly was loaded)
		if (loadedPackages.has('plotly')) {
			const isPlotlyFig = pyodide.runPython(
				'_chiphre_check_plotly_result(_chiphre_last_result)'
			) as boolean;
			if (isPlotlyFig) {
				const plotlyJson = pyodide.runPython('_chiphre_get_plotly_json()') as string | null;
				if (plotlyJson) {
					postMessage({ type: 'plotly', jsonSpec: plotlyJson, id });
				}
			}
		}

		// Check for matplotlib plots (only if matplotlib was loaded)
		if (loadedPackages.has('matplotlib')) {
			const plotData = pyodide.runPython('_chiphre_get_plot_base64()') as string | null;
			if (plotData) {
				postMessage({ type: 'plot', imageData: plotData, id });
			}
		}

		// Clean up (only if matplotlib was loaded)
		if (loadedPackages.has('matplotlib')) {
			pyodide.runPython('_chiphre_cleanup_matplotlib()');
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
sys.stdout = _chiphre_old_stdout
sys.stderr = _chiphre_old_stderr
`);
			// Clean up matplotlib if loaded
			if (loadedPackages.has('matplotlib')) {
				pyodide.runPython('_chiphre_cleanup_matplotlib()');
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
			const formattedException = pyodide.runPython('_chiphre_reformat_exception()') as
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
			pyodide.globals.set('_chiphre_validate_code', code);
			try {
				const result = pyodide.runPython(`_chiphre_validate_syntax(_chiphre_validate_code)`);

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
				pyodide.globals.delete('_chiphre_validate_code');
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
 * Thin worker-side wrapper around the runtime-agnostic core in
 * `$lib/shared/python/validation-core`. Responsibilities kept here (transport):
 *   - guard on Pyodide readiness (`PYODIDE_NOT_READY`);
 *   - resolve the notebook checkpoint namespace via `getContextNamespace`;
 *   - post the result back to the main thread.
 * All validation logic (namespace ownership, AST + behavior layers, timeout
 * race, error capture) lives in `runExerciseValidation`.
 */
async function validateExercise(
	code: string,
	config: ExerciseValidationConfig,
	id: string,
	contextId?: string
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

	// Notebook checkpoint mode borrows the persistent context's namespace so the
	// student's prior cell state is visible; standard exercise mode lets the core
	// create and own a fresh isolated dict.
	let borrowedNamespace: PyProxy | undefined;
	if (contextId) {
		const borrowed = getContextNamespace(contextId);
		if (!borrowed) {
			postMessage({
				type: 'validation-exercise-result',
				result: {
					valid: false,
					failed_layer: null,
					behavior_kind: config.behavior?.kind,
					test_results: [],
					error: `Contexte d'exécution introuvable : ${contextId}`,
					execution_time_ms: Math.round(performance.now() - startTime)
				},
				id
			});
			return;
		}
		borrowedNamespace = borrowed;
	}

	const result = await runExerciseValidation(pyodide, code, config, {
		namespace: borrowedNamespace,
		skipCodeExec: Boolean(contextId)
	});

	postMessage({
		type: 'validation-exercise-result',
		result,
		id
	});
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
	pyodide.globals.set('_chiphre_autocomplete_code', code);
	pyodide.globals.set('_chiphre_autocomplete_cursor', cursor);
	pyodide.globals.set('_chiphre_autocomplete_namespace', namespace);

	try {
		// Call the Python completion function with namespace
		const result = await pyodide.runPythonAsync(`
_chiphre_get_completions(_chiphre_autocomplete_code, _chiphre_autocomplete_cursor, _chiphre_autocomplete_namespace)
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
		pyodide.globals.delete('_chiphre_autocomplete_code');
		pyodide.globals.delete('_chiphre_autocomplete_cursor');
		pyodide.globals.delete('_chiphre_autocomplete_namespace');
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
		pyodide.globals.set('_chiphre_debug_code', code);
		pyodide.globals.set('_chiphre_debug_breakpoints_json', breakpointsJson);

		const generator = pyodide.runPython(`
_chiphre_debug_generator(_chiphre_debug_code, _chiphre_debug_breakpoints_json)
`) as PyProxy;

		// Clean up globals
		pyodide.globals.delete('_chiphre_debug_code');
		pyodide.globals.delete('_chiphre_debug_breakpoints_json');

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
			await validateExercise(message.code, message.config, message.id, message.contextId);
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
