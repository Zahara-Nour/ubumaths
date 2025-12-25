# Python Worker Multi-Context Support - Phase 1.2

## Status: COMPLETED

**Date**: 2025-12-06

## What Was Implemented

### 1. Import Refactoring

- Replaced old imports from `$lib/types/python-worker` with new shared types from `$lib/shared/python`
- Now imports:
  - Types: `FromWorkerMessage`, `PyodideInterface`, `LoadPyodideFunc`, `PyProxy`, `ValidationConfig`, `ValidationResult`, `ValidationIssue`
  - Config: `PYODIDE_CONFIG`, `LOADING_STAGES`, `LoadingStageIndex`, `CONTEXT_CONFIG`, `ERROR_MESSAGES`
  - Schema: `toWorkerMessageSchema` (replaces local Zod schema)

### 2. Context Management System

Added a `Map<string, ExecutionContext>` to manage multiple execution contexts:

```typescript
interface ExecutionContext {
	id: string;
	persistent: boolean;
	namespace: PyProxy | null; // Python globals dict for persistent contexts
	lastActivity: number;
}
```

Key functions:

- `createContext(contextId, persistent)`: Creates new context with optional persistent namespace
- `destroyContext(contextId)`: Destroys context and cleans up PyProxy
- `resetContext(contextId)`: Clears variables but keeps context alive
- `getContextNamespace(contextId)`: Returns namespace for execution (null for isolated)
- `cleanupIdleContexts()`: Periodic cleanup of idle contexts (runs every minute)

### 3. New Message Handlers

| Message Type      | Description                                               |
| ----------------- | --------------------------------------------------------- |
| `create-context`  | Create new context with specified ID and persistence mode |
| `destroy-context` | Destroy context and clean up namespace                    |
| `reset-context`   | Clear variables in context but keep it alive              |
| `validate`        | Validate Python code syntax using AST                     |

### 4. Updated Execute Logic

The `executeCode` function now supports both modes:

- **Isolated execution** (no `contextId`): Uses fresh globals each time (backwards compatible)
- **Persistent execution** (with `contextId`): Uses the context's namespace, preserving variables

```python
# For persistent context:
exec(code, context_namespace, context_namespace)

# For isolated context (current behavior):
exec(code)  # Uses fresh globals each time
```

### 5. Code Validation

Added `validateCode()` function that:

- Checks code length limits (maxCodeLength)
- Checks line count limits (maxLines)
- Checks forbidden patterns (regex-based)
- Validates Python syntax using `ast.parse()`
- Returns detailed validation issues with line/column info

### 6. Idle Timeout Cleanup

- Contexts idle for > `CONTEXT_CONFIG.IDLE_TIMEOUT_MS` (5 minutes) are automatically cleaned up
- Cleanup runs every minute via `setInterval`
- Default playground context is never cleaned up

### 7. Context-Aware Autocompletion

Updated `_ubumaths_get_completions` Python function to accept an optional namespace parameter for context-aware completions in persistent contexts.

## New Messages Supported

### To Worker (from main thread)

```typescript
// Existing (unchanged API, but enhanced)
{ type: 'init' }
{ type: 'execute', code: string, id: string, contextId?: string }  // contextId is NEW
{ type: 'cancel', id: string }
{ type: 'autocomplete', code: string, cursor: number, id: string, contextId?: string }  // contextId is NEW

// New
{ type: 'create-context', contextId: string, persistent: boolean }
{ type: 'destroy-context', contextId: string }
{ type: 'reset-context', contextId: string }
{ type: 'validate', code: string, config: ValidationConfig, id: string }
```

### From Worker (to main thread)

```typescript
// Existing (unchanged)
{ type: 'loading-progress', percent: number, stage: string }
{ type: 'pyodide-ready' }
{ type: 'stdout', data: string, id: string }
{ type: 'stderr', data: string, id: string }
{ type: 'plot', imageData: string, id: string }
{ type: 'error', message: string, line?: number, id: string }
{ type: 'complete', id: string, duration: number }
{ type: 'timeout', id: string }
{ type: 'latex', latex: string, id: string }
{ type: 'autocomplete-result', completions: CompletionItem[], id: string }
{ type: 'packages-loading', packages: string[], id: string }
{ type: 'packages-loaded', packages: string[], id: string }
{ type: 'plotly', jsonSpec: string, id: string }

// New
{ type: 'context-created', contextId: string }
{ type: 'context-destroyed', contextId: string }
{ type: 'context-reset', contextId: string }
{ type: 'validation-result', result: ValidationResult, id: string }
```

## Backwards Compatibility

All existing functionality is preserved:

1. **Playground without contextId works exactly as before**

   - `execute` message without `contextId` uses isolated execution
   - Variables are not preserved between executions

2. **All existing tests should pass**

   - No breaking changes to existing message formats
   - Optional `contextId` parameter is backwards compatible

3. **Existing consumers don't need changes**
   - The worker accepts all old message formats
   - New features are opt-in via new message types

## Files Modified

- `/Users/david/Coding/js/ubumaths/src/lib/workers/pyodide.worker.ts` - Complete refactor with multi-context support

## Configuration Used

From `$lib/shared/python/config.ts`:

```typescript
CONTEXT_CONFIG = {
	MAX_CONTEXTS: 10,
	IDLE_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes
	DEFAULT_PLAYGROUND_CONTEXT: '__playground__',
	NOTEBOOK_CONTEXT_PREFIX: 'notebook_'
};
```

## Next Steps (Phase 1.3)

1. **Write unit tests** for:

   - Context management (create, destroy, reset)
   - Persistent execution (variables preserved)
   - Isolated execution (variables not preserved)
   - Validation functionality
   - Idle context cleanup

2. **Integration tests** for:
   - Multi-context scenarios
   - Context switching
   - Memory management

## Code Review & Security Audit Fixes

### Security Fixes Applied

1. **Critical: Replaced `eval()` in autocomplete**

   - Old: `eval(obj_path, ns)` allowed code injection
   - New: Safe `getattr()` navigation through namespace
   - Prevents context cross-contamination attacks

2. **Important: PyProxy cleanup in validateCode()**

   - Added `try/finally` to clean up `_ubumaths_validate_code` global
   - Prevents memory leaks from repeated validations

3. **Important: PyProxy cleanup in handleAutocomplete()**
   - Added `try/finally` to clean up 3 globals after autocomplete
   - Cleans up both result PyProxy and global variables
   - Critical for high-frequency autocomplete operations

### Known Limitations (Documented)

1. **sys.modules sharing**: All contexts share Python's module cache

   - Not a vulnerability for educational use
   - Teacher demonstrations should not store sensitive data in module attributes
   - Local variables are properly isolated

2. **Memory limits**: No hard memory limit enforced
   - Timeout protection (30s) mitigates infinite loops
   - Students guided not to use large data structures

## Technical Notes

### Memory Management

- PyProxy objects are properly destroyed when contexts are cleaned up
- Uses `destroy()` method on PyProxy to avoid memory leaks
- Namespace is recreated (not cleared) on reset for clean state
- Global variables cleaned up in finally blocks

### Python Namespace Pattern

```python
# Create namespace
namespace = dict()

# Execute in namespace (preserves variables)
exec(code, namespace, namespace)

# Variables accessible via namespace['var_name']
```

### Error Handling

- All context operations have proper error handling
- Errors are sent back to main thread via `error` message
- French error messages from `ERROR_MESSAGES` config
