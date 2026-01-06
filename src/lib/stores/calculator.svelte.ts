/**
 * Calculator Store
 *
 * Svelte 5 reactive store for the scientific calculator.
 * Provides expression evaluation, command execution, history management,
 * and localStorage persistence.
 */

import { browser } from '$app/environment';
import { WebReplEngine } from '$lib/mathAST/cli/web';
import { z } from 'zod';

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = 'ubumaths-calc-history';
const MAX_HISTORY = 100;
const MAX_EXPRESSION_LENGTH = 1000;

// =============================================================================
// Validation Schema
// =============================================================================

const CalculatorInputSchema = z.object({
	type: z.enum(['expression', 'command']),
	command: z.string().max(50).optional(),
	expression: z.string().max(MAX_EXPRESSION_LENGTH)
});

// =============================================================================
// Types
// =============================================================================

/**
 * Result of a calculation operation.
 */
export interface CalculationResult {
	/** Unique identifier for this entry */
	readonly id: string;

	/** Original input expression or command */
	readonly input: string;

	/** Result output (LaTeX format for rendering) */
	readonly output: string;

	/** HTML-formatted output for display */
	readonly outputHtml?: string;

	/** Whether this result is an error */
	readonly isError: boolean;

	/** Error message if isError is true */
	readonly errorMessage?: string;

	/** Unix timestamp (milliseconds) */
	readonly timestamp: number;
}

/**
 * Input type for execute method.
 */
export interface CalculatorInput {
	/** Type of input: expression or command */
	readonly type: 'expression' | 'command';

	/** Command name (required if type is 'command') */
	readonly command?: string;

	/** Expression or command argument */
	readonly expression: string;
}

/**
 * Command metadata for UI display.
 */
export interface CommandInfo {
	readonly name: string;
	readonly description: string;
	readonly aliases: readonly string[];
}

/**
 * Serialized history entry for localStorage.
 */
interface SerializedCalculationResult {
	id: string;
	input: string;
	output: string;
	outputHtml?: string;
	isError: boolean;
	errorMessage?: string;
	timestamp: number;
}

// =============================================================================
// Calculator Store Class
// =============================================================================

/**
 * Reactive store for the scientific calculator.
 *
 * Features:
 * - Expression evaluation via WebReplEngine
 * - Command execution (diff, simplify, etc.)
 * - History navigation (up/down arrows)
 * - localStorage persistence
 *
 * @example
 * ```svelte
 * <script>
 * import { calculatorStore } from '$lib/stores/calculator.svelte';
 *
 * async function handleCalculate(expr: string) {
 *   await calculatorStore.execute({
 *     type: 'expression',
 *     expression: expr
 *   });
 * }
 * </script>
 *
 * {#each calculatorStore.history as result}
 *   <div>{result.input} = {result.output}</div>
 * {/each}
 * ```
 */
class CalculatorStore {
	// ===========================================================================
	// State (Svelte 5 runes)
	// ===========================================================================

	/** Calculation history (newest first) */
	history = $state<CalculationResult[]>([]);

	/** Current position in history for up/down navigation (-1 = not navigating) */
	historyIndex = $state(-1);

	/** Whether a calculation is in progress */
	isLoading = $state(false);

	/** Temporary storage for current input when navigating history */
	private savedInput = $state('');

	// ===========================================================================
	// Engine
	// ===========================================================================

	private engine: WebReplEngine;

	// ===========================================================================
	// Derived State
	// ===========================================================================

	/** Whether there are any history entries */
	hasHistory = $derived(this.history.length > 0);

	/** Count of history entries */
	historyCount = $derived(this.history.length);

	/** Last calculation result (if any) */
	lastResult = $derived(this.history[0]);

	// ===========================================================================
	// Initialization
	// ===========================================================================

	constructor() {
		this.engine = new WebReplEngine();

		if (browser) {
			this.loadHistory();
		}
	}

	// ===========================================================================
	// Public Methods
	// ===========================================================================

	/**
	 * Execute an expression or command.
	 *
	 * For expressions: evaluates the mathematical expression.
	 * For commands: executes the specified command with the expression as argument.
	 *
	 * @param input - The input to execute
	 *
	 * @example
	 * ```typescript
	 * // Execute an expression
	 * await calculatorStore.execute({
	 *   type: 'expression',
	 *   expression: '2+3*4'
	 * });
	 *
	 * // Execute a command
	 * await calculatorStore.execute({
	 *   type: 'command',
	 *   command: 'diff',
	 *   expression: 'x^2'
	 * });
	 * ```
	 */
	async execute(input: CalculatorInput): Promise<void> {
		// Validate input
		const validation = CalculatorInputSchema.safeParse(input);
		if (!validation.success) {
			// Create error entry for invalid input
			const entry: CalculationResult = {
				id: crypto.randomUUID(),
				input: input.expression,
				output: 'Expression trop longue ou invalide',
				isError: true,
				errorMessage: validation.error.issues[0]?.message || 'Entrée invalide',
				timestamp: Date.now()
			};
			this.history = [entry, ...this.history].slice(0, MAX_HISTORY);
			this.saveHistory();
			return;
		}

		const trimmedExpr = input.expression.trim();
		if (!trimmedExpr && input.type === 'expression') return;

		this.isLoading = true;

		try {
			// Build the input string for the engine
			let engineInput: string;

			if (input.type === 'command' && input.command) {
				// Format: .command expression
				engineInput = `.${input.command} ${trimmedExpr}`;
			} else {
				// Direct expression
				engineInput = trimmedExpr;
			}

			// Execute via WebReplEngine
			const result = this.engine.execute(engineInput);

			// Create history entry
			const entry: CalculationResult = {
				id: crypto.randomUUID(),
				input: engineInput,
				output: result.latex || result.output,
				outputHtml: result.outputHtml,
				isError: !result.success,
				errorMessage: result.error?.message,
				timestamp: Date.now()
			};

			// Add to history (newest first)
			this.history = [entry, ...this.history].slice(0, MAX_HISTORY);

			// Reset navigation state
			this.historyIndex = -1;
			this.savedInput = '';

			// Save to localStorage
			this.saveHistory();
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Navigate through calculation history.
	 *
	 * Returns the input string at the new position, or null if navigation
	 * is not possible in the requested direction.
	 *
	 * @param direction - 'up' for older entries, 'down' for newer
	 * @param currentInput - Current input value (saved on first up press)
	 * @returns The input string at the new position, or null
	 *
	 * @example
	 * ```typescript
	 * // In a component:
	 * function handleKeyDown(event: KeyboardEvent, currentValue: string) {
	 *   if (event.key === 'ArrowUp') {
	 *     const prev = calculatorStore.navigateHistory('up', currentValue);
	 *     if (prev !== null) inputValue = prev;
	 *   }
	 * }
	 * ```
	 */
	navigateHistory(direction: 'up' | 'down', currentInput?: string): string | null {
		if (this.history.length === 0) return null;

		if (direction === 'up') {
			// Save current input on first up press
			if (this.historyIndex === -1 && currentInput !== undefined) {
				this.savedInput = currentInput;
			}

			// Move to older entry
			if (this.historyIndex < this.history.length - 1) {
				this.historyIndex++;
				return this.history[this.historyIndex].input;
			}
		} else {
			// Move to newer entry
			if (this.historyIndex > 0) {
				this.historyIndex--;
				return this.history[this.historyIndex].input;
			} else if (this.historyIndex === 0) {
				// Restore saved input
				this.historyIndex = -1;
				return this.savedInput;
			}
		}

		return null;
	}

	/**
	 * Reset history navigation state.
	 *
	 * Call this when the user starts typing or clears the input.
	 */
	resetNavigation(): void {
		this.historyIndex = -1;
		this.savedInput = '';
	}

	/**
	 * Clear all calculation history.
	 */
	clearHistory(): void {
		this.history = [];
		this.historyIndex = -1;
		this.savedInput = '';
		this.saveHistory();
	}

	/**
	 * Get all available commands from the engine.
	 *
	 * @returns Array of command metadata for UI display
	 */
	getCommands(): CommandInfo[] {
		return this.engine.getCommands().map((cmd) => ({
			name: cmd.name,
			description: cmd.description,
			aliases: cmd.aliases
		}));
	}

	// ===========================================================================
	// localStorage Persistence
	// ===========================================================================

	/**
	 * Load history from localStorage.
	 */
	private loadHistory(): void {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (!stored) return;

			const parsed = JSON.parse(stored);
			if (!Array.isArray(parsed)) return;

			// Deserialize and validate history entries
			this.history = (parsed as SerializedCalculationResult[])
				.filter((entry) => this.isValidEntry(entry))
				.map((entry) => ({
					id: entry.id,
					input: entry.input,
					output: entry.output,
					outputHtml: entry.outputHtml,
					isError: entry.isError,
					errorMessage: entry.errorMessage,
					timestamp: entry.timestamp
				}))
				.slice(0, MAX_HISTORY);
		} catch (error) {
			console.error('Failed to load calculator history from localStorage:', error);
			this.history = [];
		}
	}

	/**
	 * Save history to localStorage.
	 */
	private saveHistory(): void {
		if (!browser) return;

		try {
			const serialized: SerializedCalculationResult[] = this.history.map((entry) => ({
				id: entry.id,
				input: entry.input,
				output: entry.output,
				outputHtml: entry.outputHtml,
				isError: entry.isError,
				errorMessage: entry.errorMessage,
				timestamp: entry.timestamp
			}));

			localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
		} catch (error) {
			console.error('Failed to save calculator history to localStorage:', error);

			// Handle quota exceeded
			if (error instanceof DOMException && error.name === 'QuotaExceededError') {
				// Try with reduced history
				const reducedHistory = this.history.slice(0, Math.floor(MAX_HISTORY / 2));
				try {
					const serialized: SerializedCalculationResult[] = reducedHistory.map((entry) => ({
						id: entry.id,
						input: entry.input,
						output: entry.output,
						outputHtml: entry.outputHtml,
						isError: entry.isError,
						errorMessage: entry.errorMessage,
						timestamp: entry.timestamp
					}));
					localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
					this.history = reducedHistory;
				} catch {
					// If still failing, clear history
					this.history = [];
				}
			}
		}
	}

	/**
	 * Validate a serialized history entry.
	 */
	private isValidEntry(entry: unknown): entry is SerializedCalculationResult {
		if (typeof entry !== 'object' || entry === null) return false;

		const e = entry as Record<string, unknown>;
		return (
			typeof e.id === 'string' &&
			typeof e.input === 'string' &&
			typeof e.output === 'string' &&
			typeof e.isError === 'boolean' &&
			typeof e.timestamp === 'number'
		);
	}
}

// =============================================================================
// Export Singleton
// =============================================================================

/**
 * Singleton instance of the calculator store.
 *
 * Use this in components to access calculator state and methods.
 */
export const calculatorStore = new CalculatorStore();
