/**
 * Notebook Store
 *
 * Svelte 5 reactive store for Python notebooks with multi-cell execution.
 * Manages notebook state, cell operations, and persistent context execution.
 *
 * Uses NotebookExecutor for persistent context execution across cells.
 * The store adds notebook-specific features:
 * - Cell management (add, delete, move, update)
 * - Sequential cell execution with queue
 * - Per-cell output collection
 * - Notebook persistence (save/load)
 * - Kernel restart capability
 */

import { browser } from '$app/environment';
import { NotebookExecutor } from '$lib/shared/python';
import type { CompletionItem } from '$lib/shared/python';
import type {
	PythonNotebook,
	NotebookCell,
	CellOutput,
	CellDirection,
	AddCellOptions
} from '$lib/types/notebook';

// =============================================================================
// Constants
// =============================================================================

/** Maximum cells per notebook */
const MAX_CELLS = 200;

/** Maximum outputs per cell */
const MAX_OUTPUTS_PER_CELL = 100;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a unique cell ID
 */
function generateCellId(): string {
	return `cell-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Create a default empty code cell
 */
function createCodeCell(source = ''): NotebookCell {
	return {
		id: generateCellId(),
		type: 'code',
		source,
		execution_count: null,
		outputs: [],
		state: 'idle'
	};
}

/**
 * Create a default empty markdown cell
 */
function createMarkdownCell(source = ''): NotebookCell {
	return {
		id: generateCellId(),
		type: 'markdown',
		source,
		execution_count: null,
		outputs: [],
		state: 'idle'
	};
}

/**
 * Convert executor outputs to Jupyter-compatible cell outputs
 */
function convertExecutorOutputs(executor: NotebookExecutor): CellOutput[] {
	const outputs: CellOutput[] = [];

	// Add stdout
	if (executor.stdout.length > 0) {
		outputs.push({
			output_type: 'stream',
			name: 'stdout',
			text: executor.stdout
		});
	}

	// Add stderr
	if (executor.stderr.length > 0) {
		// Check if this is an error with traceback or just stderr
		if (executor.errorLine !== null) {
			// Parse error message for ename and evalue
			const errorLines = executor.stderr.split('\n');
			const lastLine = errorLines[errorLines.length - 1] || executor.stderr;
			const match = lastLine.match(/^(\w+(?:Error|Exception)): (.+)$/);

			if (match) {
				outputs.push({
					output_type: 'error',
					ename: match[1],
					evalue: match[2],
					traceback: errorLines
				});
			} else {
				outputs.push({
					output_type: 'error',
					ename: 'Error',
					evalue: executor.stderr,
					traceback: errorLines
				});
			}
		} else {
			// Just stderr output, not an error
			outputs.push({
				output_type: 'stream',
				name: 'stderr',
				text: executor.stderr
			});
		}
	}

	// Add plot
	if (executor.plotData) {
		outputs.push({
			output_type: 'display_data',
			data: {
				'image/png': executor.plotData.replace(/^data:image\/png;base64,/, '')
			}
		});
	}

	// Add LaTeX
	if (executor.latexOutput) {
		outputs.push({
			output_type: 'display_data',
			data: {
				'text/plain': executor.latexOutput
			}
		});
	}

	// Add Plotly
	if (executor.plotlyData) {
		outputs.push({
			output_type: 'display_data',
			data: {
				'application/json': executor.plotlyData
			}
		});
	}

	return outputs.slice(0, MAX_OUTPUTS_PER_CELL);
}

// =============================================================================
// Notebook Store Class
// =============================================================================

/**
 * Reactive store for Python notebooks.
 *
 * Features:
 * - Multi-cell notebook with code and markdown cells
 * - Persistent Python context across cell executions
 * - Sequential execution queue
 * - Per-cell output collection
 * - Kernel restart
 * - Cloud save/load
 *
 * @example
 * ```svelte
 * <script>
 * import { NotebookStore } from '$lib/stores/notebookStore.svelte';
 *
 * const notebook = new NotebookStore();
 * notebook.initPyodide();
 * notebook.loadNotebook('notebook-id-123');
 * </script>
 * ```
 */
export class NotebookStore {
	// ===========================================================================
	// Executor (handles worker management and execution)
	// ===========================================================================

	/** The executor that handles Pyodide worker and code execution */
	private _executor: NotebookExecutor | null = null;

	// ===========================================================================
	// Notebook State (Svelte 5 runes)
	// ===========================================================================

	/** Current notebook data (null if no notebook loaded) */
	notebook = $state<PythonNotebook | null>(null);

	/** Active cell ID (for highlighting/focus) */
	activeCell = $state<string | null>(null);

	/** Whether the notebook has unsaved changes */
	isModified = $state(false);

	/** Execution queue (cell IDs waiting to execute) */
	executionQueue = $state<string[]>([]);

	/** Global execution counter for the notebook */
	private executionCounter = $state(0);

	// ===========================================================================
	// Cloud State
	// ===========================================================================

	/** Whether a save operation is in progress */
	isSaving = $state(false);

	/** Whether an autosave operation is in progress */
	isAutoSaving = $state(false);

	/** Whether a load operation is in progress */
	isLoading = $state(false);

	/** Cloud operation error message */
	cloudError = $state<string | null>(null);

	/** Last saved timestamp */
	lastSavedTime = $state<Date | null>(null);

	/** Timeout ID for debounced autosave */
	private autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;

	// ===========================================================================
	// Derived State
	// ===========================================================================

	/** Cells in the notebook */
	cells = $derived(this.notebook?.content.cells ?? []);

	/** Whether any cell is currently executing */
	isExecutingAny = $derived(this.cells.some((c) => c.state === 'running'));

	/** Whether Pyodide is ready */
	isReady = $derived(this._executor?.isReady ?? false);

	/** Whether Pyodide is loading */
	isLoading2 = $derived(this._executor?.isLoading ?? false);

	/** Whether there's an error in Pyodide initialization */
	hasError = $derived(this._executor?.hasError ?? false);

	/** Loading progress (0-100) */
	loadingProgress = $derived(this._executor?.loadingProgress ?? 0);

	/** Loading stage description */
	loadingStage = $derived(this._executor?.loadingStage ?? '');

	/** Whether there are cells in the execution queue */
	hasQueuedCells = $derived(this.executionQueue.length > 0);

	// ===========================================================================
	// Initialization
	// ===========================================================================

	constructor() {
		// Executor will be created when a notebook is loaded
	}

	// ===========================================================================
	// Executor Lifecycle
	// ===========================================================================

	/**
	 * Initialize Pyodide for the current notebook.
	 * Must be called after loading or creating a notebook.
	 */
	initPyodide(): void {
		if (!this.notebook) {
			console.warn('[NotebookStore] Cannot init Pyodide - no notebook loaded');
			return;
		}

		if (!this._executor) {
			this._executor = new NotebookExecutor(this.notebook.id);
		}

		this._executor.initPyodide();
	}

	/**
	 * Terminate the worker and clean up resources.
	 * Call this when the notebook component unmounts.
	 */
	destroy(): void {
		if (this._executor) {
			this._executor.destroy();
			this._executor = null;
		}
		this.executionQueue = [];
		this.cancelAutoSave();
	}

	// ===========================================================================
	// Notebook Management
	// ===========================================================================

	/**
	 * Create a new notebook with a single empty code cell.
	 *
	 * @param title - The notebook title
	 * @param description - Optional description
	 * @param isPublic - Whether the notebook is public (default: false)
	 * @returns The created notebook or null on error
	 */
	async createNotebook(
		title: string,
		description?: string,
		isPublic = false
	): Promise<PythonNotebook | null> {
		if (!browser) return null;

		this.isSaving = true;
		this.cloudError = null;

		try {
			const response = await fetch('/api/notebooks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title,
					description: description ?? null,
					is_public: isPublic
				})
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				this.cloudError = errorData.message || `Erreur lors de la creation (${response.status})`;
				return null;
			}

			const data = await response.json();
			const notebook = data.notebook as PythonNotebook;

			// Set the notebook
			this.notebook = notebook;
			this.isModified = false;
			this.executionCounter = 0;
			this.lastSavedTime = new Date(notebook.updated_at);

			// Create executor for this notebook
			this._executor = new NotebookExecutor(notebook.id);

			return notebook;
		} catch (err) {
			console.error('[NotebookStore] Error creating notebook:', err);
			this.cloudError = err instanceof Error ? err.message : 'Erreur inconnue lors de la creation';
			return null;
		} finally {
			this.isSaving = false;
		}
	}

	/**
	 * Load a notebook from the server.
	 *
	 * @param id - The notebook ID
	 * @returns The loaded notebook or null on error
	 */
	async loadNotebook(id: string): Promise<PythonNotebook | null> {
		if (!browser) return null;

		this.isLoading = true;
		this.cloudError = null;

		try {
			const response = await fetch(`/api/notebooks/${id}`);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				this.cloudError = errorData.message || `Erreur lors du chargement (${response.status})`;
				return null;
			}

			const data = await response.json();
			const notebook = data.notebook as PythonNotebook;

			// Set the notebook
			this.notebook = notebook;
			this.isModified = false;
			this.executionCounter = this.getMaxExecutionCount();
			this.lastSavedTime = new Date(notebook.updated_at);

			// Destroy old executor if exists
			if (this._executor) {
				this._executor.destroy();
			}

			// Create new executor for this notebook
			this._executor = new NotebookExecutor(notebook.id);

			return notebook;
		} catch (err) {
			console.error('[NotebookStore] Error loading notebook:', err);
			this.cloudError = err instanceof Error ? err.message : 'Erreur inconnue lors du chargement';
			return null;
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Save the current notebook to the server.
	 *
	 * @returns true on success, false on error
	 */
	async saveNotebook(): Promise<boolean> {
		if (!browser || !this.notebook) return false;

		this.isSaving = true;
		this.cloudError = null;

		try {
			const response = await fetch(`/api/notebooks/${this.notebook.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					content: this.notebook.content
				})
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				this.cloudError = errorData.message || `Erreur lors de la sauvegarde (${response.status})`;
				return false;
			}

			const data = await response.json();
			this.notebook = data.notebook as PythonNotebook;
			this.isModified = false;
			this.lastSavedTime = new Date(this.notebook.updated_at);
			this.cancelAutoSave();
			return true;
		} catch (err) {
			console.error('[NotebookStore] Error saving notebook:', err);
			this.cloudError =
				err instanceof Error ? err.message : 'Erreur inconnue lors de la sauvegarde';
			return false;
		} finally {
			this.isSaving = false;
		}
	}

	/**
	 * Delete the current notebook.
	 *
	 * @returns true on success, false on error
	 */
	async deleteNotebook(): Promise<boolean> {
		if (!browser || !this.notebook) return false;

		this.cloudError = null;

		try {
			const response = await fetch(`/api/notebooks/${this.notebook.id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				this.cloudError = errorData.message || `Erreur lors de la suppression (${response.status})`;
				return false;
			}

			// Clean up
			this.destroy();
			this.notebook = null;
			this.isModified = false;
			return true;
		} catch (err) {
			console.error('[NotebookStore] Error deleting notebook:', err);
			this.cloudError =
				err instanceof Error ? err.message : 'Erreur inconnue lors de la suppression';
			return false;
		}
	}

	// ===========================================================================
	// Cell Management
	// ===========================================================================

	/**
	 * Add a new cell to the notebook.
	 *
	 * @param options - Cell creation options
	 * @returns The ID of the created cell, or null if failed
	 */
	addCell(options: AddCellOptions): string | null {
		if (!this.notebook) return null;

		const cells = this.notebook.content.cells;

		// Check max cells limit
		if (cells.length >= MAX_CELLS) {
			console.warn('[NotebookStore] Cannot add cell - max cells limit reached');
			return null;
		}

		// Create the new cell
		const newCell =
			options.type === 'markdown'
				? createMarkdownCell(options.source)
				: createCodeCell(options.source);

		// Determine insertion index
		const index = options.index ?? cells.length;
		const insertIndex = Math.max(0, Math.min(index, cells.length));

		// Insert the cell
		cells.splice(insertIndex, 0, newCell);

		// Mark as modified
		this.isModified = true;

		// Set as active cell
		this.activeCell = newCell.id;

		return newCell.id;
	}

	/**
	 * Delete a cell from the notebook.
	 *
	 * @param cellId - The cell ID to delete
	 * @returns true if deleted, false otherwise
	 */
	deleteCell(cellId: string): boolean {
		if (!this.notebook) return false;

		const cells = this.notebook.content.cells;
		const index = cells.findIndex((c) => c.id === cellId);

		if (index === -1) return false;

		// Don't allow deleting the last cell
		if (cells.length === 1) {
			console.warn('[NotebookStore] Cannot delete the last cell');
			return false;
		}

		// Remove from execution queue if present
		this.executionQueue = this.executionQueue.filter((id) => id !== cellId);

		// Delete the cell
		cells.splice(index, 1);

		// Update active cell
		if (this.activeCell === cellId) {
			this.activeCell = cells[Math.min(index, cells.length - 1)]?.id ?? null;
		}

		this.isModified = true;
		return true;
	}

	/**
	 * Move a cell up or down in the notebook.
	 *
	 * @param cellId - The cell ID to move
	 * @param direction - Direction to move ('up' or 'down')
	 * @returns true if moved, false otherwise
	 */
	moveCell(cellId: string, direction: CellDirection): boolean {
		if (!this.notebook) return false;

		const cells = this.notebook.content.cells;
		const index = cells.findIndex((c) => c.id === cellId);

		if (index === -1) return false;

		const newIndex = direction === 'up' ? index - 1 : index + 1;

		// Check bounds
		if (newIndex < 0 || newIndex >= cells.length) return false;

		// Swap cells
		const [cell] = cells.splice(index, 1);
		cells.splice(newIndex, 0, cell);

		this.isModified = true;
		return true;
	}

	/**
	 * Update the source code of a cell.
	 *
	 * @param cellId - The cell ID
	 * @param source - The new source code
	 * @returns true if updated, false otherwise
	 */
	updateCellSource(cellId: string, source: string): boolean {
		if (!this.notebook) return false;

		const cell = this.notebook.content.cells.find((c) => c.id === cellId);
		if (!cell) return false;

		cell.source = source;
		this.isModified = true;
		return true;
	}

	/**
	 * Get a cell by ID.
	 *
	 * @param cellId - The cell ID
	 * @returns The cell or undefined
	 */
	getCell(cellId: string): NotebookCell | undefined {
		return this.notebook?.content.cells.find((c) => c.id === cellId);
	}

	/**
	 * Get the index of a cell.
	 *
	 * @param cellId - The cell ID
	 * @returns The index or -1 if not found
	 */
	getCellIndex(cellId: string): number {
		return this.notebook?.content.cells.findIndex((c) => c.id === cellId) ?? -1;
	}

	// ===========================================================================
	// Execution
	// ===========================================================================

	/**
	 * Execute a single cell.
	 *
	 * @param cellId - The cell ID to execute
	 */
	async executeCell(cellId: string): Promise<void> {
		if (!this._executor || !this.notebook) {
			console.warn('[NotebookStore] Cannot execute - executor or notebook not ready');
			return;
		}

		const cell = this.getCell(cellId);
		if (!cell || cell.type !== 'code') return;

		// If already executing, add to queue
		if (this.isExecutingAny) {
			if (!this.executionQueue.includes(cellId)) {
				this.executionQueue.push(cellId);
			}
			return;
		}

		// Mark cell as running
		cell.state = 'running';
		cell.outputs = [];

		// Execute the code
		this._executor.execute(cell.source);

		// Wait for execution to complete
		await this.waitForExecution();

		// Collect outputs
		this.executionCounter++;
		cell.execution_count = this.executionCounter;
		cell.outputs = convertExecutorOutputs(this._executor);
		cell.state = this._executor.stderr.length > 0 ? 'error' : 'success';

		this.isModified = true;

		// Process next cell in queue if any
		if (this.executionQueue.length > 0) {
			const nextCellId = this.executionQueue.shift();
			if (nextCellId) {
				// Use setTimeout to avoid recursion issues
				setTimeout(() => this.executeCell(nextCellId), 0);
			}
		}
	}

	/**
	 * Execute all cells sequentially.
	 */
	async executeAllCells(): Promise<void> {
		if (!this.notebook) return;

		// Clear queue and add all code cells
		this.executionQueue = [];
		const codeCells = this.notebook.content.cells.filter((c) => c.type === 'code');

		if (codeCells.length === 0) return;

		// Execute first cell, rest will be queued automatically
		const [firstCell, ...restCells] = codeCells;
		this.executionQueue = restCells.map((c) => c.id);
		await this.executeCell(firstCell.id);
	}

	/**
	 * Stop the current execution and clear the queue.
	 */
	stopExecution(): void {
		if (this._executor) {
			this._executor.cancel();
		}

		// Clear queue and reset cell states
		this.executionQueue = [];
		if (this.notebook) {
			for (const cell of this.notebook.content.cells) {
				if (cell.state === 'running') {
					cell.state = 'idle';
				}
			}
		}
	}

	/**
	 * Reset the Python kernel (clear namespace).
	 * All variables and imports are lost.
	 */
	resetKernel(): void {
		if (!this._executor) return;

		this._executor.resetKernel();
		this.executionCounter = 0;

		// Reset all cell execution counts and states
		if (this.notebook) {
			for (const cell of this.notebook.content.cells) {
				cell.execution_count = null;
				cell.outputs = [];
				cell.state = 'idle';
			}
		}

		this.isModified = true;
	}

	/**
	 * Wait for current execution to complete.
	 * Polls the executor state until it's no longer executing.
	 */
	private async waitForExecution(): Promise<void> {
		return new Promise((resolve) => {
			const checkInterval = setInterval(() => {
				if (!this._executor || !this._executor.isExecuting) {
					clearInterval(checkInterval);
					resolve();
				}
			}, 100);
		});
	}

	// ===========================================================================
	// Autocompletion
	// ===========================================================================

	/**
	 * Request Python autocompletion for code at cursor position.
	 *
	 * @param code - The full Python code
	 * @param cursor - The cursor position (character offset)
	 * @returns Promise resolving to an array of completion items
	 */
	requestCompletion(code: string, cursor: number): Promise<CompletionItem[]> {
		if (!this._executor) {
			return Promise.resolve([]);
		}
		return this._executor.requestCompletion(code, cursor);
	}

	// ===========================================================================
	// Helpers
	// ===========================================================================

	/**
	 * Get the maximum execution count from all cells.
	 * Used to initialize the execution counter when loading a notebook.
	 */
	private getMaxExecutionCount(): number {
		if (!this.notebook) return 0;

		return this.notebook.content.cells.reduce((max, cell) => {
			return cell.execution_count !== null ? Math.max(max, cell.execution_count) : max;
		}, 0);
	}

	/**
	 * Set the active cell.
	 *
	 * @param cellId - The cell ID to activate
	 */
	setActiveCell(cellId: string | null): void {
		this.activeCell = cellId;
	}

	// ===========================================================================
	// Autosave
	// ===========================================================================

	/**
	 * Cancel any pending autosave.
	 * Clears the autosave timeout.
	 */
	cancelAutoSave(): void {
		if (this.autoSaveTimeout !== null) {
			clearTimeout(this.autoSaveTimeout);
			this.autoSaveTimeout = null;
		}
	}

	/**
	 * Mark the notebook as modified.
	 * Called when cells or notebook structure changes.
	 */
	markModified(): void {
		this.isModified = true;
	}

	/**
	 * Schedule an autosave with debouncing (2 seconds).
	 * Only saves if the notebook is modified.
	 *
	 * Debouncing: Cancels any previous autosave and schedules a new one,
	 * ensuring we only save 2 seconds after the last change.
	 */
	scheduleAutoSave(): void {
		// Cancel any existing timeout to reset the debounce timer
		this.cancelAutoSave();

		// Schedule a new autosave 2 seconds after the last change
		this.autoSaveTimeout = setTimeout(async () => {
			if (this.isModified && !this.isAutoSaving && !this.isSaving) {
				this.isAutoSaving = true;
				try {
					await this.saveNotebook();
				} catch (err) {
					console.error('[NotebookStore] Autosave failed:', err);
				} finally {
					this.isAutoSaving = false;
				}
			}
			this.autoSaveTimeout = null;
		}, 2000);
	}
}
