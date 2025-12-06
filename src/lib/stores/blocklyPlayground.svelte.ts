/**
 * Blockly Playground Store
 *
 * Svelte 5 reactive store for the Blockly playground.
 * Manages workspace state, code generation, and localStorage persistence.
 *
 * Provides:
 * - Workspace state management (XML serialization)
 * - Dual code generation (JavaScript and Python)
 * - Execution output management
 * - localStorage persistence
 * - Language switching
 */

import { browser } from '$app/environment';
import type { ExecutionLanguage, OutputLine } from '$lib/shared/blockly/types';

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = 'ubumaths-blockly-playground';

/** Debounce delay for saving to localStorage (ms) */
const STORAGE_SAVE_DEBOUNCE_MS = 500;

// =============================================================================
// Types
// =============================================================================

/**
 * Serialized state for localStorage.
 */
interface SerializedBlocklyState {
	workspaceState: string;
	language: ExecutionLanguage;
}

// =============================================================================
// Blockly Playground Store Class
// =============================================================================

/**
 * Reactive store for the Blockly playground.
 *
 * Manages Blockly workspace state, code generation, and output.
 * Uses Svelte 5 runes for reactivity.
 *
 * @example
 * ```svelte
 * <script>
 * import { blocklyStore } from '$lib/stores/blocklyPlayground.svelte';
 *
 * function handleLanguageChange() {
 *   blocklyStore.setLanguage('python');
 * }
 * </script>
 *
 * <select onchange={handleLanguageChange}>
 *   <option value="javascript">JavaScript</option>
 *   <option value="python">Python</option>
 * </select>
 * <pre>{blocklyStore.currentCode}</pre>
 * ```
 */
class BlocklyPlaygroundStore {
	// ===========================================================================
	// Reactive State (Svelte 5 runes)
	// ===========================================================================

	/** Selected execution language */
	language = $state<ExecutionLanguage>('javascript');

	/** Generated JavaScript code */
	jsCode = $state('');

	/** Generated Python code */
	pythonCode = $state('');

	/** Execution output lines */
	output = $state<OutputLine[]>([]);

	/** Workspace state (XML representation for persistence) */
	workspaceState = $state('');

	/** Loading progress percentage (0-100) */
	loadingPercent = $state(0);

	/** Current loading stage description */
	loadingStage = $state('');

	// ===========================================================================
	// Private State
	// ===========================================================================

	/** Timeout for debounced save */
	private saveTimeout: ReturnType<typeof setTimeout> | null = null;

	// ===========================================================================
	// Derived State
	// ===========================================================================

	/** Currently selected code based on language */
	currentCode = $derived(this.language === 'javascript' ? this.jsCode : this.pythonCode);

	/** Whether there is any output to display */
	hasOutput = $derived(this.output.length > 0);

	/** Whether the workspace has any state */
	hasWorkspaceState = $derived(this.workspaceState.length > 0);

	// ===========================================================================
	// Initialization
	// ===========================================================================

	constructor() {
		if (browser) {
			this.loadFromLocalStorage();
		}
	}

	// ===========================================================================
	// Public Methods
	// ===========================================================================

	/**
	 * Update generated code from workspace.
	 * Should be called by the Blockly component when workspace changes.
	 *
	 * @param jsCode - Generated JavaScript code
	 * @param pythonCode - Generated Python code
	 */
	updateCode(jsCode: string, pythonCode: string): void {
		this.jsCode = jsCode;
		this.pythonCode = pythonCode;
	}

	/**
	 * Update workspace state for persistence.
	 * Should be called by the Blockly component when workspace changes.
	 *
	 * @param state - XML representation of workspace
	 */
	updateWorkspaceState(state: string): void {
		this.workspaceState = state;
		this.saveToLocalStorage();
	}

	/**
	 * Add output line.
	 *
	 * @param type - Output type (stdout, stderr, or info)
	 * @param text - Output text
	 */
	addOutput(type: 'stdout' | 'stderr' | 'info', text: string): void {
		this.output.push({
			type,
			text,
			timestamp: Date.now()
		});
	}

	/**
	 * Clear all output.
	 */
	clearOutput(): void {
		this.output = [];
	}

	/**
	 * Set execution language.
	 *
	 * @param lang - Language to set (javascript or python)
	 */
	setLanguage(lang: ExecutionLanguage): void {
		this.language = lang;
		this.saveToLocalStorage();
	}

	/**
	 * Set loading progress.
	 *
	 * @param percent - Progress percentage (0-100)
	 * @param stage - Current loading stage description
	 */
	setLoading(percent: number, stage: string): void {
		this.loadingPercent = percent;
		this.loadingStage = stage;
	}

	/**
	 * Clear workspace state.
	 * Resets workspace to empty state and clears output.
	 */
	clearWorkspace(): void {
		this.workspaceState = '';
		this.jsCode = '';
		this.pythonCode = '';
		this.clearOutput();
		this.saveToLocalStorage();
	}

	// ===========================================================================
	// localStorage Persistence
	// ===========================================================================

	/**
	 * Load workspace state from localStorage.
	 *
	 * @returns The workspace XML state if found, null otherwise
	 */
	loadFromLocalStorage(): string | null {
		if (!browser) return null;

		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (!stored) return null;

			const parsed = JSON.parse(stored) as SerializedBlocklyState;

			if (typeof parsed.workspaceState === 'string') {
				this.workspaceState = parsed.workspaceState;
			}
			if (parsed.language === 'javascript' || parsed.language === 'python') {
				this.language = parsed.language;
			}

			return this.workspaceState;
		} catch (error) {
			console.error('Failed to load Blockly playground state from localStorage:', error);
			return null;
		}
	}

	/**
	 * Save workspace state to localStorage with debounce.
	 * Debounces writes to avoid excessive localStorage operations during block manipulation.
	 */
	saveToLocalStorage(): void {
		if (!browser) return;

		// Clear existing timeout
		if (this.saveTimeout) {
			clearTimeout(this.saveTimeout);
		}

		// Debounce before saving
		this.saveTimeout = setTimeout(() => {
			try {
				const serialized: SerializedBlocklyState = {
					workspaceState: this.workspaceState,
					language: this.language
				};
				localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
			} catch (error) {
				console.error('Failed to save Blockly playground state to localStorage:', error);
			}
		}, STORAGE_SAVE_DEBOUNCE_MS);
	}

	/**
	 * Clear localStorage.
	 * Removes all persisted Blockly playground state.
	 */
	clearLocalStorage(): void {
		if (!browser) return;

		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch (error) {
			console.error('Failed to clear Blockly playground state from localStorage:', error);
		}
	}

	// ===========================================================================
	// Cleanup
	// ===========================================================================

	/**
	 * Clean up resources.
	 * Call this when the playground component unmounts.
	 */
	destroy(): void {
		if (this.saveTimeout) {
			clearTimeout(this.saveTimeout);
			this.saveTimeout = null;
		}
	}
}

// =============================================================================
// Export Singleton
// =============================================================================

/**
 * Singleton instance of the Blockly playground store.
 *
 * Use this in components to access playground state and methods.
 */
export const blocklyStore = new BlocklyPlaygroundStore();
