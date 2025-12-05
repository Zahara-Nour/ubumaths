/**
 * Playground Python Executor
 *
 * Concrete implementation of BasePythonExecutor for the Python Playground.
 * Uses isolated execution (no persistent context) - state is reset between runs.
 *
 * This executor is designed for the playground use case where:
 * - Each execution is independent
 * - Variables don't persist across runs (unless re-declared in code)
 * - Simple, straightforward execution model
 *
 * @example
 * ```typescript
 * const executor = new PlaygroundExecutor();
 * executor.initPyodide();
 * executor.execute('print("Hello, World!")');
 * ```
 */

import { BasePythonExecutor } from './base-executor.svelte';

// =============================================================================
// Playground Executor
// =============================================================================

/**
 * Python executor for playground mode (isolated execution).
 *
 * Features:
 * - No persistent context (contextId = undefined)
 * - State reset between executions
 * - Simple execution model suitable for quick code experiments
 *
 * Note: This executor handles the worker communication and state.
 * The PythonPlaygroundStore wraps this and adds additional features like:
 * - localStorage persistence
 * - Cloud save/load
 * - URL sharing
 * - Editor settings (theme, font size)
 */
export class PlaygroundExecutor extends BasePythonExecutor {
	// ===========================================================================
	// Abstract Method Implementations
	// ===========================================================================

	/**
	 * Get context ID for execution.
	 * Returns undefined for isolated execution (playground mode).
	 */
	getContextId(): string | undefined {
		return undefined;
	}

	/**
	 * Whether this executor uses persistent context.
	 * Playground mode does not persist state between runs.
	 */
	isPersistentContext(): boolean {
		return false;
	}

	/**
	 * Hook called when execution completes successfully.
	 * Playground doesn't need additional handling here.
	 *
	 * @param _duration - Execution time in milliseconds (unused)
	 */
	protected onExecutionComplete(_duration: number): void {
		// No additional handling needed for playground mode
		// The base class already updates executionTime
	}

	/**
	 * Hook called when execution encounters an error.
	 * Playground doesn't need additional handling here.
	 *
	 * @param _message - Error message (unused)
	 * @param _line - Optional line number (unused)
	 */
	protected onExecutionError(_message: string, _line?: number): void {
		// No additional handling needed for playground mode
		// The base class already updates stderr and errorLine
	}
}
