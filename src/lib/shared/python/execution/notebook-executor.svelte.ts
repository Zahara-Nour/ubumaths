/**
 * Notebook Python Executor
 *
 * Concrete implementation of BasePythonExecutor for Python Notebooks.
 * Uses persistent execution context - state is preserved across cell executions.
 *
 * This executor is designed for the notebook use case where:
 * - Variables persist across cell executions
 * - Execution order matters (cells share namespace)
 * - Multiple cells can be executed sequentially
 * - Kernel can be reset to clear all state
 *
 * @example
 * ```typescript
 * const executor = new NotebookExecutor('notebook-123');
 * executor.initPyodide();
 * executor.execute('x = 42'); // Cell 1
 * executor.execute('print(x)'); // Cell 2 - uses x from Cell 1
 * executor.resetKernel(); // Clear namespace
 * ```
 */

import { BasePythonExecutor } from './base-executor.svelte';

// =============================================================================
// Notebook Executor
// =============================================================================

/**
 * Python executor for notebook mode (persistent context).
 *
 * Features:
 * - Persistent context with unique context ID per notebook
 * - Variables preserved across cell executions
 * - Support for sequential cell execution
 * - Kernel reset capability to clear namespace
 *
 * Note: This executor handles the worker communication and persistent state.
 * The NotebookStore wraps this and adds additional features like:
 * - Cell management (add, delete, move, update)
 * - Execution queue management
 * - Notebook persistence (load/save)
 * - Cloud sync
 * - Output collection per cell
 */
export class NotebookExecutor extends BasePythonExecutor {
	/** Unique context ID for this notebook (format: "notebook_<notebookId>") */
	private notebookContextId: string;

	/** Notebook ID */
	private notebookId: string;

	// ===========================================================================
	// Constructor
	// ===========================================================================

	/**
	 * Create a new NotebookExecutor
	 *
	 * @param notebookId - The unique notebook ID
	 */
	constructor(notebookId: string) {
		super();
		this.notebookId = notebookId;
		this.notebookContextId = `notebook_${notebookId}`;
	}

	// ===========================================================================
	// Abstract Method Implementations
	// ===========================================================================

	/**
	 * Get context ID for execution.
	 * Returns the notebook's unique context ID for persistent execution.
	 */
	getContextId(): string {
		return this.notebookContextId;
	}

	/**
	 * Whether this executor uses persistent context.
	 * Notebook mode persists state across cell executions.
	 */
	isPersistentContext(): boolean {
		return true;
	}

	/**
	 * Hook called when execution completes successfully.
	 * Notebook can use this to track cell execution completion.
	 *
	 * @param _duration - Execution time in milliseconds (unused in base implementation)
	 */
	protected onExecutionComplete(_duration: number): void {
		// Base implementation does nothing
		// NotebookStore will handle cell-specific updates
		// through its own execution tracking
	}

	/**
	 * Hook called when execution encounters an error.
	 * Notebook can use this to track cell execution errors.
	 *
	 * @param _message - Error message (unused in base implementation)
	 * @param _line - Optional line number (unused in base implementation)
	 */
	protected onExecutionError(_message: string, _line?: number): void {
		// Base implementation does nothing
		// NotebookStore will handle cell-specific error tracking
		// through its own execution tracking
	}

	// ===========================================================================
	// Notebook-Specific Methods
	// ===========================================================================

	/**
	 * Reset the Python kernel (clear the namespace).
	 * This destroys the current context and creates a new one.
	 * All variables and imports are lost.
	 */
	resetKernel(): void {
		if (!this.isReady) {
			console.warn('[NotebookExecutor] Cannot reset kernel - Pyodide is not ready');
			return;
		}

		// Send reset-context message to worker
		this.postToWorker({
			type: 'reset-context',
			contextId: this.notebookContextId
		});

		// Clear all output
		this.clearOutput();
	}

	/**
	 * Get the notebook ID
	 */
	getNotebookId(): string {
		return this.notebookId;
	}

	/**
	 * Get the full context ID (with "notebook_" prefix)
	 */
	getFullContextId(): string {
		return this.notebookContextId;
	}
}
