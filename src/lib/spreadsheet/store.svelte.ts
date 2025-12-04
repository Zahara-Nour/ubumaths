/**
 * Spreadsheet Store - Svelte 5 reactive store for the spreadsheet calculator
 *
 * This store manages the complete state of the spreadsheet including:
 * - Cell data (values and formulas)
 * - Computed values (evaluated formula results)
 * - Selection and editing state
 * - Dependency graph for automatic recalculation
 * - localStorage persistence with debounce and Zod validation
 *
 * @module spreadsheet/store
 */

import { browser } from '$app/environment';
import { SvelteMap } from 'svelte/reactivity';
import type { CellFormat, ComputedValue, SpreadsheetData, SpreadsheetMetadata } from './types';
import { spreadsheetDataSchema, createEmptySpreadsheet } from './types';
import { DependencyGraph } from './dependency-graph';
import { evaluateFormula } from './parser/evaluator';

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = 'ubumaths-spreadsheet-state';
const DEBOUNCE_MS = 500;

// =============================================================================
// SpreadsheetStore Class
// =============================================================================

/**
 * Reactive store for the spreadsheet calculator.
 *
 * Features:
 * - Cell management (get, set, clear)
 * - Formula evaluation with automatic recalculation
 * - Selection and editing state
 * - localStorage persistence with debounce
 * - Zod validation on load
 *
 * @example
 * ```svelte
 * <script>
 * import { spreadsheetStore } from '$lib/spreadsheet/store.svelte';
 *
 * // Set a cell value
 * spreadsheetStore.setCell('A1', '10');
 * spreadsheetStore.setCell('B1', '=A1*2');
 *
 * // Access computed values
 * const result = spreadsheetStore.getComputedValue('B1');
 * </script>
 * ```
 */
class SpreadsheetStore {
	// ===========================================================================
	// State (Svelte 5 runes)
	// ===========================================================================

	/** Spreadsheet data (cells, metadata) */
	private _data = $state<SpreadsheetData>(createEmptySpreadsheet());

	/** Computed values cache (formula results) */
	private _computedValues = new SvelteMap<string, ComputedValue>();

	/** Currently selected cell (e.g., "A1") */
	selectedCell = $state<string | null>('A1');

	/** Whether the selected cell is in edit mode */
	isEditing = $state(false);

	/** Current edit value (while editing) */
	editValue = $state('');

	/** Selection range for multi-select (future) */
	selectionRange = $state<{ start: string; end: string } | null>(null);

	// ===========================================================================
	// Private State
	// ===========================================================================

	/** Dependency graph for formula recalculation */
	private graph = new DependencyGraph();

	/** Timeout handle for debounced save */
	private saveTimeout: ReturnType<typeof setTimeout> | null = null;

	/** Flag to track unsaved changes */
	private _hasUnsavedChanges = $state(false);

	// ===========================================================================
	// Derived State
	// ===========================================================================

	/** Readonly access to spreadsheet data */
	data = $derived(this._data);

	/** Metadata shortcut */
	metadata = $derived(this._data.metadata);

	/** Number of rows */
	rows = $derived(this._data.metadata.rows);

	/** Number of columns */
	cols = $derived(this._data.metadata.cols);

	/** Spreadsheet name */
	name = $derived(this._data.metadata.name);

	/** Cell count (non-empty cells) */
	cellCount = $derived(Object.keys(this._data.cells).length);

	/** Has unsaved changes */
	hasUnsavedChanges = $derived(this._hasUnsavedChanges);

	/** Currently selected cell data */
	selectedCellData = $derived(this.selectedCell ? this._data.cells[this.selectedCell] : null);

	/** Currently selected cell computed value */
	selectedCellValue = $derived(
		this.selectedCell
			? (this._computedValues.get(this.selectedCell) ?? { type: 'empty' as const })
			: null
	);

	// ===========================================================================
	// Initialization
	// ===========================================================================

	constructor() {
		if (browser) {
			this.loadFromStorage();
		}
	}

	// ===========================================================================
	// Cell Operations
	// ===========================================================================

	/**
	 * Get the raw value of a cell (formula or value)
	 *
	 * @param ref - Cell reference (e.g., "A1", "B2")
	 * @returns The raw value string or empty string if cell is empty
	 */
	getCellValue(ref: string): string {
		const cell = this._data.cells[ref.toUpperCase()];
		return cell?.value ?? '';
	}

	/**
	 * Get the computed value of a cell (evaluated formula result)
	 *
	 * @param ref - Cell reference (e.g., "A1", "B2")
	 * @returns The computed value (number, string, boolean, error, or empty)
	 */
	getComputedValue(ref: string): ComputedValue {
		return this._computedValues.get(ref.toUpperCase()) ?? { type: 'empty' };
	}

	/**
	 * Get cell format
	 *
	 * @param ref - Cell reference
	 * @returns The cell format or undefined if not set
	 */
	getCellFormat(ref: string): CellFormat | undefined {
		return this._data.cells[ref.toUpperCase()]?.format;
	}

	/**
	 * Set a cell's value (and recalculate dependents)
	 *
	 * @param ref - Cell reference (e.g., "A1")
	 * @param value - New value (plain value or formula starting with "=")
	 *
	 * @example
	 * spreadsheetStore.setCell('A1', '42');
	 * spreadsheetStore.setCell('B1', '=A1*2');
	 * spreadsheetStore.setCell('C1', '=SOMME(A1:B1)');
	 */
	setCell(ref: string, value: string): void {
		const normalizedRef = ref.toUpperCase();

		// Update cell data
		if (value === '' || value === null || value === undefined) {
			// Delete empty cells
			const newCells = { ...this._data.cells };
			delete newCells[normalizedRef];
			this._data = { ...this._data, cells: newCells };
		} else {
			this._data = {
				...this._data,
				cells: {
					...this._data.cells,
					[normalizedRef]: {
						...this._data.cells[normalizedRef],
						value
					}
				}
			};
		}

		// Update dependency graph
		this.graph.updateCell(normalizedRef, value);

		// Recalculate affected cells
		this.recalculateFrom(normalizedRef);

		// Mark as changed and schedule save
		this._hasUnsavedChanges = true;
		this.scheduleSave();
	}

	/**
	 * Set cell format
	 *
	 * @param ref - Cell reference
	 * @param format - Partial format object (merged with existing format)
	 */
	setCellFormat(ref: string, format: Partial<CellFormat>): void {
		const normalizedRef = ref.toUpperCase();
		const currentCell = this._data.cells[normalizedRef];

		this._data = {
			...this._data,
			cells: {
				...this._data.cells,
				[normalizedRef]: {
					value: currentCell?.value ?? '',
					format: {
						...currentCell?.format,
						...format
					}
				}
			}
		};

		this._hasUnsavedChanges = true;
		this.scheduleSave();
	}

	/**
	 * Clear a cell's value and format
	 *
	 * @param ref - Cell reference to clear
	 */
	clearCell(ref: string): void {
		const normalizedRef = ref.toUpperCase();

		// Remove from cells
		const newCells = { ...this._data.cells };
		delete newCells[normalizedRef];
		this._data = { ...this._data, cells: newCells };

		// Update dependency graph
		this.graph.removeCell(normalizedRef);

		// Recalculate affected cells
		this.recalculateFrom(normalizedRef);

		// Mark as changed
		this._hasUnsavedChanges = true;
		this.scheduleSave();
	}

	/**
	 * Set multiple cells at once (batch update)
	 *
	 * More efficient than calling setCell multiple times as it
	 * only recalculates once after all cells are updated.
	 *
	 * @param cells - Object mapping cell references to values
	 *
	 * @example
	 * spreadsheetStore.setCells({
	 *   'A1': '10',
	 *   'A2': '20',
	 *   'A3': '=SOMME(A1:A2)'
	 * });
	 */
	setCells(cells: Record<string, string>): void {
		const changedCells: string[] = [];

		for (const [ref, value] of Object.entries(cells)) {
			const normalizedRef = ref.toUpperCase();
			changedCells.push(normalizedRef);

			if (value === '' || value === null || value === undefined) {
				const newCells = { ...this._data.cells };
				delete newCells[normalizedRef];
				this._data = { ...this._data, cells: newCells };
			} else {
				this._data = {
					...this._data,
					cells: {
						...this._data.cells,
						[normalizedRef]: {
							...this._data.cells[normalizedRef],
							value
						}
					}
				};
			}

			this.graph.updateCell(normalizedRef, value);
		}

		// Recalculate all affected cells at once
		this.recalculateFromMultiple(changedCells);

		this._hasUnsavedChanges = true;
		this.scheduleSave();
	}

	// ===========================================================================
	// Formula Evaluation
	// ===========================================================================

	/**
	 * Recalculate a cell and all its dependents
	 *
	 * @param ref - Cell reference that changed
	 */
	private recalculateFrom(ref: string): void {
		const cellsToRecalculate = this.graph.getRecalculationOrder([ref]);
		this.recalculateCells(cellsToRecalculate);
	}

	/**
	 * Recalculate from multiple changed cells
	 *
	 * @param refs - Cell references that changed
	 */
	private recalculateFromMultiple(refs: string[]): void {
		const cellsToRecalculate = this.graph.getRecalculationOrder(refs);
		this.recalculateCells(cellsToRecalculate);
	}

	/**
	 * Recalculate a list of cells in order
	 *
	 * @param cells - Ordered list of cells to recalculate
	 */
	private recalculateCells(cells: string[]): void {
		for (const cellRef of cells) {
			const cellValue = this.getCellValue(cellRef);
			const computed = this.evaluateCell(cellRef, cellValue);
			this._computedValues.set(cellRef, computed);
		}
		// SvelteMap mutations are automatically reactive, no reassignment needed
	}

	/**
	 * Evaluate a single cell
	 *
	 * @param ref - Cell reference
	 * @param value - Raw cell value
	 * @returns Computed value
	 */
	private evaluateCell(ref: string, value: string): ComputedValue {
		if (!value) {
			return { type: 'empty' };
		}

		// Check for circular reference
		const cycle = this.graph.detectCycle();
		if (cycle && cycle.includes(ref.toUpperCase())) {
			return {
				type: 'error',
				code: '#CIRC!',
				message: 'Reference circulaire detectee'
			};
		}

		// If it's a formula, evaluate it
		if (value.startsWith('=')) {
			return evaluateFormula(value, (cellRef) => this.getComputedValue(cellRef));
		}

		// Try to parse as number
		const num = parseFloat(value);
		if (!isNaN(num) && isFinite(num)) {
			return { type: 'number', value: num };
		}

		// Check for boolean
		const lowerValue = value.toLowerCase();
		if (lowerValue === 'vrai' || lowerValue === 'true') {
			return { type: 'boolean', value: true };
		}
		if (lowerValue === 'faux' || lowerValue === 'false') {
			return { type: 'boolean', value: false };
		}

		// Otherwise it's a string
		return { type: 'string', value };
	}

	/**
	 * Recalculate all cells in the spreadsheet
	 *
	 * Useful after loading data or when the graph might be out of sync.
	 */
	recalculateAll(): void {
		try {
			const order = this.graph.getCalculationOrder();
			for (const ref of order) {
				const cellValue = this.getCellValue(ref);
				if (cellValue) {
					const computed = this.evaluateCell(ref, cellValue);
					this._computedValues.set(ref, computed);
				}
			}
		} catch {
			// If there's a cycle, calculate cells individually and mark cycles
			for (const [ref, cell] of Object.entries(this._data.cells)) {
				if (cell.value) {
					const computed = this.evaluateCell(ref, cell.value);
					this._computedValues.set(ref, computed);
				}
			}
		}
		// SvelteMap mutations are automatically reactive
	}

	// ===========================================================================
	// Selection & Navigation
	// ===========================================================================

	/**
	 * Select a cell
	 *
	 * @param ref - Cell reference to select
	 */
	select(ref: string): void {
		this.selectedCell = ref.toUpperCase();
		this.isEditing = false;
		this.editValue = this.getCellValue(this.selectedCell);
	}

	/**
	 * Start editing the selected cell
	 *
	 * @param initialValue - Optional initial value for the edit (defaults to cell value)
	 */
	startEditing(initialValue?: string): void {
		if (!this.selectedCell) return;
		this.isEditing = true;
		this.editValue = initialValue ?? this.getCellValue(this.selectedCell);
	}

	/**
	 * Commit the current edit to the cell
	 */
	commitEdit(): void {
		if (!this.selectedCell || !this.isEditing) return;
		this.setCell(this.selectedCell, this.editValue);
		this.isEditing = false;
	}

	/**
	 * Cancel the current edit and restore original value
	 */
	cancelEdit(): void {
		if (!this.selectedCell) return;
		this.isEditing = false;
		this.editValue = this.getCellValue(this.selectedCell);
	}

	/**
	 * Navigate to an adjacent cell
	 *
	 * @param direction - Direction to navigate
	 */
	navigate(direction: 'up' | 'down' | 'left' | 'right'): void {
		if (!this.selectedCell) {
			this.select('A1');
			return;
		}

		const match = this.selectedCell.match(/^([A-Z]+)(\d+)$/);
		if (!match) return;

		let col = this.letterToColIndex(match[1]);
		let row = parseInt(match[2], 10) - 1; // 1-indexed to 0-indexed

		switch (direction) {
			case 'up':
				row = Math.max(0, row - 1);
				break;
			case 'down':
				row = Math.min(this.rows - 1, row + 1);
				break;
			case 'left':
				col = Math.max(0, col - 1);
				break;
			case 'right':
				col = Math.min(this.cols - 1, col + 1);
				break;
		}

		const newRef = this.colIndexToLetter(col) + (row + 1);
		this.select(newRef);
	}

	/**
	 * Convert column letter(s) to 0-indexed column number
	 * Supports multi-letter columns (e.g., "AA" = 26)
	 */
	private letterToColIndex(letter: string): number {
		let col = 0;
		for (let i = 0; i < letter.length; i++) {
			col = col * 26 + (letter.charCodeAt(i) - 64);
		}
		return col - 1; // Convert to 0-indexed
	}

	/**
	 * Convert 0-indexed column number to letter(s)
	 */
	private colIndexToLetter(col: number): string {
		let letter = '';
		let n = col + 1; // Convert to 1-indexed
		while (n > 0) {
			const remainder = (n - 1) % 26;
			letter = String.fromCharCode(65 + remainder) + letter;
			n = Math.floor((n - 1) / 26);
		}
		return letter;
	}

	// ===========================================================================
	// Metadata
	// ===========================================================================

	/**
	 * Set spreadsheet name
	 *
	 * @param name - New name for the spreadsheet
	 */
	setName(name: string): void {
		this._data = {
			...this._data,
			metadata: { ...this._data.metadata, name }
		};
		this._hasUnsavedChanges = true;
		this.scheduleSave();
	}

	/**
	 * Set spreadsheet description
	 *
	 * @param description - New description
	 */
	setDescription(description: string): void {
		this._data = {
			...this._data,
			metadata: { ...this._data.metadata, description }
		};
		this._hasUnsavedChanges = true;
		this.scheduleSave();
	}

	/**
	 * Update metadata
	 *
	 * @param metadata - Partial metadata to merge
	 */
	updateMetadata(metadata: Partial<SpreadsheetMetadata>): void {
		this._data = {
			...this._data,
			metadata: { ...this._data.metadata, ...metadata }
		};
		this._hasUnsavedChanges = true;
		this.scheduleSave();
	}

	// ===========================================================================
	// Persistence
	// ===========================================================================

	/**
	 * Load state from localStorage
	 *
	 * Validates with Zod and recalculates all formulas.
	 * Gracefully handles corrupted or incompatible data.
	 */
	private loadFromStorage(): void {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (!stored) return;

			const parsed = JSON.parse(stored);
			const validated = spreadsheetDataSchema.safeParse(parsed);

			if (!validated.success) {
				console.warn('Invalid spreadsheet state in localStorage:', validated.error.issues);
				return;
			}

			this._data = validated.data;

			// Rebuild dependency graph
			for (const [ref, cell] of Object.entries(this._data.cells)) {
				if (cell.value) {
					this.graph.updateCell(ref, cell.value);
				}
			}

			// Recalculate all computed values
			this.recalculateAll();
		} catch (error) {
			console.warn('Failed to load spreadsheet state from localStorage:', error);
		}
	}

	/**
	 * Schedule save with debounce
	 *
	 * Called after every state mutation. Uses debouncing to avoid
	 * excessive writes during rapid updates.
	 */
	private scheduleSave(): void {
		if (!browser) return;

		if (this.saveTimeout !== null) {
			clearTimeout(this.saveTimeout);
		}

		this.saveTimeout = setTimeout(() => {
			this.saveToStorage();
			this.saveTimeout = null;
		}, DEBOUNCE_MS);
	}

	/**
	 * Save state to localStorage immediately
	 */
	private saveToStorage(): void {
		if (!browser) return;

		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
			this._hasUnsavedChanges = false;
		} catch (error) {
			console.warn('Failed to save spreadsheet state to localStorage:', error);

			// Handle quota exceeded
			if (error instanceof DOMException && error.name === 'QuotaExceededError') {
				// Clear old data and try again with minimal state
				this.clearStorage();
				try {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
				} catch {
					// If still failing, just log the error
					console.error('Unable to save spreadsheet state - storage full');
				}
			}
		}
	}

	/**
	 * Force immediate save (bypasses debounce)
	 *
	 * Useful before page unload or when user explicitly saves.
	 */
	saveNow(): void {
		if (this.saveTimeout !== null) {
			clearTimeout(this.saveTimeout);
			this.saveTimeout = null;
		}
		this.saveToStorage();
	}

	/**
	 * Clear localStorage
	 */
	clearStorage(): void {
		if (!browser) return;
		localStorage.removeItem(STORAGE_KEY);
	}

	// ===========================================================================
	// Reset
	// ===========================================================================

	/**
	 * Reset to empty spreadsheet
	 *
	 * Clears all cells but keeps the localStorage sync.
	 */
	reset(): void {
		this._data = createEmptySpreadsheet();
		this._computedValues.clear();
		this.graph.clear();
		this.selectedCell = 'A1';
		this.isEditing = false;
		this.editValue = '';
		this._hasUnsavedChanges = true;
		this.scheduleSave();
	}

	/**
	 * Full reset including localStorage
	 *
	 * Completely clears the spreadsheet and removes all persisted data.
	 */
	fullReset(): void {
		this.reset();
		this.clearStorage();
		this._hasUnsavedChanges = false;
	}

	// ===========================================================================
	// Import/Export
	// ===========================================================================

	/**
	 * Export current data as SpreadsheetData object
	 *
	 * @returns A copy of the current spreadsheet data
	 */
	exportData(): SpreadsheetData {
		return structuredClone(this._data);
	}

	/**
	 * Import data from a SpreadsheetData object
	 *
	 * Validates the data with Zod before importing.
	 *
	 * @param data - The spreadsheet data to import
	 * @throws Error if the data is invalid
	 */
	importData(data: SpreadsheetData): void {
		const validated = spreadsheetDataSchema.safeParse(data);
		if (!validated.success) {
			throw new Error(`Invalid spreadsheet data: ${validated.error.issues[0].message}`);
		}

		this._data = validated.data;
		this.graph.clear();

		// Rebuild dependency graph
		for (const [ref, cell] of Object.entries(this._data.cells)) {
			if (cell.value) {
				this.graph.updateCell(ref, cell.value);
			}
		}

		// Recalculate all
		this.recalculateAll();

		// Reset selection
		this.selectedCell = 'A1';
		this.isEditing = false;
		this.editValue = '';

		this._hasUnsavedChanges = true;
		this.scheduleSave();
	}

	/**
	 * Export data as JSON string
	 *
	 * @returns JSON string representation of the spreadsheet
	 */
	toJSON(): string {
		return JSON.stringify(this._data, null, 2);
	}

	/**
	 * Import data from JSON string
	 *
	 * @param json - JSON string to import
	 * @throws Error if the JSON is invalid or doesn't match schema
	 */
	fromJSON(json: string): void {
		const data = JSON.parse(json);
		this.importData(data);
	}
}

// =============================================================================
// Export Singleton
// =============================================================================

/**
 * Singleton instance of the Spreadsheet store.
 *
 * Use this in components to access spreadsheet state and methods.
 *
 * @example
 * ```svelte
 * <script>
 * import { spreadsheetStore } from '$lib/spreadsheet/store.svelte';
 *
 * // Set a cell value
 * spreadsheetStore.setCell('A1', '42');
 *
 * // Access reactive state
 * $: console.log('Cell A1:', spreadsheetStore.getComputedValue('A1'));
 * </script>
 * ```
 */
export const spreadsheetStore = new SpreadsheetStore();

/**
 * Export the class for testing purposes
 */
export { SpreadsheetStore };
