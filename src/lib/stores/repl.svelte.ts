/**
 * REPL Store
 *
 * Svelte 5 reactive store for the mathAST web REPL.
 * Manages input, execution history, UI state, and localStorage persistence.
 */

import { browser } from '$app/environment';
import { WebReplEngine } from '$lib/mathAST/cli/web';
import type { ReplInputMode, TabStyle, ReplHistoryEntry } from '$lib/mathAST/cli/web';

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = 'ubumaths-cas-repl';
const MAX_HISTORY = 100;

// =============================================================================
// Serialization Types
// =============================================================================

/**
 * Serialized history entry for localStorage.
 * Omits non-serializable AST nodes.
 */
interface SerializedHistoryEntry {
	id: string;
	timestamp: number;
	input: string;
	inputMode: ReplInputMode;
	isCommand: boolean;
	result: {
		success: boolean;
		output: string;
		outputHtml?: string;
		latex?: string;
		error?: {
			code: string;
			message: string;
			position?: number;
		};
	};
}

// =============================================================================
// REPL Store Class
// =============================================================================

/**
 * Reactive store for the web REPL.
 *
 * Features:
 * - Command and expression execution
 * - History navigation (up/down arrows)
 * - Input mode switching (latex/custom/auto)
 * - AST drawer for visualization
 * - Bidirectional highlighting (output <-> AST)
 * - localStorage persistence
 *
 * @example
 * ```svelte
 * <script>
 * import { replStore } from '$lib/stores/repl.svelte';
 *
 * function handleSubmit() {
 *   replStore.execute(replStore.currentInput);
 * }
 * </script>
 *
 * <input bind:value={replStore.currentInput} />
 * <button onclick={handleSubmit}>Execute</button>
 *
 * {#each replStore.history as entry}
 *   <div>{entry.input}: {entry.result.output}</div>
 * {/each}
 * ```
 */
class ReplStore {
	// ===========================================================================
	// State (Svelte 5 runes)
	// ===========================================================================

	/** Current input value (bound to textarea) */
	currentInput = $state('');

	/** Current input mode (latex/custom/auto) */
	inputMode = $state<ReplInputMode>('auto');

	/** Execution history (newest first after reverse) */
	history = $state<ReplHistoryEntry[]>([]);

	/** Active tab style (terminal/modern/hybrid) */
	activeTab = $state<TabStyle>('terminal');

	/** Whether AST drawer is visible */
	showAstDrawer = $state(false);

	/** ID of currently highlighted AST node */
	highlightedNodeId = $state<string | null>(null);

	/** Current position in history for up/down navigation */
	historyIndex = $state(-1);

	/** Temporary storage for current input when navigating history */
	private savedInput = $state('');

	// ===========================================================================
	// REPL Engine
	// ===========================================================================

	private engine = new WebReplEngine();

	// ===========================================================================
	// Derived State
	// ===========================================================================

	/** Last successfully parsed AST (for commands that need it) */
	lastAst = $derived(this.history[0]?.result.ast);

	/** Whether there are any history entries */
	hasHistory = $derived(this.history.length > 0);

	/** Count of history entries */
	historyCount = $derived(this.history.length);

	// ===========================================================================
	// Initialization
	// ===========================================================================

	constructor() {
		if (browser) {
			this.loadFromStorage();
		}
	}

	// ===========================================================================
	// Public Methods
	// ===========================================================================

	/**
	 * Execute a REPL input (command or expression).
	 *
	 * Adds the result to history and clears the input field.
	 * Updates lastAst if execution produces an AST.
	 *
	 * @param input - The input string to execute
	 */
	execute(input: string): void {
		const trimmedInput = input.trim();
		if (!trimmedInput) return;

		// Synchronize engine input mode with store
		this.engine.setInputMode(this.inputMode);

		// Execute the input
		const result = this.engine.execute(trimmedInput);

		// Create history entry
		const entry: ReplHistoryEntry = {
			id: crypto.randomUUID(),
			timestamp: Date.now(),
			input: trimmedInput,
			inputMode: this.inputMode,
			result,
			isCommand: trimmedInput.startsWith('.')
		};

		// Add to history (newest first)
		this.history = [entry, ...this.history].slice(0, MAX_HISTORY);

		// Reset navigation state
		this.historyIndex = -1;
		this.savedInput = '';

		// Clear input
		this.currentInput = '';

		// Save to localStorage
		this.saveToStorage();
	}

	/**
	 * Navigate through command history.
	 *
	 * @param direction - 'up' to go to older entries, 'down' to go to newer
	 */
	navigateHistory(direction: 'up' | 'down'): void {
		if (this.history.length === 0) return;

		if (direction === 'up') {
			// Save current input on first up press
			if (this.historyIndex === -1) {
				this.savedInput = this.currentInput;
			}

			// Move to older entry
			if (this.historyIndex < this.history.length - 1) {
				this.historyIndex++;
				this.currentInput = this.history[this.historyIndex].input;
			}
		} else {
			// Move to newer entry
			if (this.historyIndex > 0) {
				this.historyIndex--;
				this.currentInput = this.history[this.historyIndex].input;
			} else if (this.historyIndex === 0) {
				// Restore saved input
				this.historyIndex = -1;
				this.currentInput = this.savedInput;
			}
		}
	}

	/**
	 * Set input mode and update engine.
	 *
	 * @param mode - The input mode to use
	 */
	setInputMode(mode: ReplInputMode): void {
		this.inputMode = mode;
		this.engine.setInputMode(mode);
	}

	/**
	 * Set highlighted AST node for bidirectional linking.
	 *
	 * @param nodeId - Node ID to highlight, or null to clear
	 */
	setHighlightedNode(nodeId: string | null): void {
		this.highlightedNodeId = nodeId;
	}

	/**
	 * Toggle AST drawer visibility.
	 */
	toggleAstDrawer(): void {
		this.showAstDrawer = !this.showAstDrawer;
	}

	/**
	 * Clear all history entries.
	 */
	clearHistory(): void {
		this.history = [];
		this.historyIndex = -1;
		this.savedInput = '';
		this.saveToStorage();
	}

	/**
	 * Clear output (same as clearHistory for now).
	 */
	clearOutput(): void {
		this.clearHistory();
	}

	/**
	 * Get all available commands from the engine.
	 *
	 * @returns Array of command metadata for help/autocomplete
	 */
	getCommands(): ReadonlyArray<{
		name: string;
		aliases: readonly string[];
		description: string;
	}> {
		return this.engine.getCommands();
	}

	// ===========================================================================
	// localStorage Persistence
	// ===========================================================================

	/**
	 * Load history from localStorage.
	 *
	 * Handles migration and gracefully ignores corrupted data.
	 */
	private loadFromStorage(): void {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (!stored) return;

			const parsed = JSON.parse(stored);
			if (!Array.isArray(parsed)) return;

			// Deserialize history (AST nodes are not stored)
			this.history = (parsed as SerializedHistoryEntry[])
				.map((entry) => ({
					id: entry.id,
					timestamp: entry.timestamp,
					input: entry.input,
					inputMode: entry.inputMode,
					isCommand: entry.isCommand,
					result: {
						success: entry.result.success,
						output: entry.result.output,
						outputHtml: entry.result.outputHtml,
						latex: entry.result.latex,
						error: entry.result.error
						// AST is not persisted (too large and not serializable)
					}
				}))
				.slice(0, MAX_HISTORY);
		} catch (error) {
			console.error('Failed to load REPL history from localStorage:', error);
			this.history = [];
		}
	}

	/**
	 * Save history to localStorage.
	 *
	 * Omits AST nodes to keep storage size manageable.
	 */
	private saveToStorage(): void {
		if (!browser) return;

		try {
			// Serialize history without AST (too large)
			const serialized: SerializedHistoryEntry[] = this.history.map((entry) => ({
				id: entry.id,
				timestamp: entry.timestamp,
				input: entry.input,
				inputMode: entry.inputMode,
				isCommand: entry.isCommand,
				result: {
					success: entry.result.success,
					output: entry.result.output,
					outputHtml: entry.result.outputHtml,
					latex: entry.result.latex,
					error: entry.result.error
					// Omit AST (not serializable and too large)
				}
			}));

			localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
		} catch (error) {
			console.error('Failed to save REPL history to localStorage:', error);

			// Handle quota exceeded
			if (error instanceof DOMException && error.name === 'QuotaExceededError') {
				// Try to save with reduced history
				const reducedHistory = this.history.slice(0, Math.floor(MAX_HISTORY / 2));
				try {
					const serialized: SerializedHistoryEntry[] = reducedHistory.map((entry) => ({
						id: entry.id,
						timestamp: entry.timestamp,
						input: entry.input,
						inputMode: entry.inputMode,
						isCommand: entry.isCommand,
						result: {
							success: entry.result.success,
							output: entry.result.output,
							outputHtml: entry.result.outputHtml,
							latex: entry.result.latex,
							error: entry.result.error
						}
					}));
					localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
					this.history = reducedHistory;
				} catch {
					// If still failing, just clear history
					this.history = [];
				}
			}
		}
	}
}

// =============================================================================
// Export Singleton
// =============================================================================

/**
 * Singleton instance of the REPL store.
 *
 * Use this in components to access REPL state and methods.
 */
export const replStore = new ReplStore();
