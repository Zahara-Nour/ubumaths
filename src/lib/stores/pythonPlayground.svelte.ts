/**
 * Python Playground Store
 *
 * Svelte 5 reactive store for the Python playground.
 * Manages Pyodide state, code execution, and localStorage persistence.
 */

import { browser } from '$app/environment';

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = 'ubumaths-python-playground';

const DEFAULT_CODE = `# Python Playground - UbuMaths
# Exécute avec Ctrl+Entrée

import numpy as np
import matplotlib.pyplot as plt

# Exemple : tracer une fonction
x = np.linspace(-2 * np.pi, 2 * np.pi, 200)
y = np.sin(x)

plt.figure(figsize=(8, 4))
plt.plot(x, y, 'b-', linewidth=2)
plt.title('Fonction sinus')
plt.xlabel('x')
plt.ylabel('sin(x)')
plt.grid(True)
plt.show()

print("Valeur de sin(π/2) :", np.sin(np.pi/2))
`;

// =============================================================================
// Types
// =============================================================================

/**
 * Playground execution state.
 */
export type PlaygroundState =
	| 'initial'
	| 'loading-pyodide'
	| 'loading-packages'
	| 'ready'
	| 'executing'
	| 'error';

/**
 * Serialized state for localStorage.
 */
interface SerializedPlaygroundState {
	code: string;
	showPedagogicErrors: boolean;
}

// =============================================================================
// Python Playground Store Class
// =============================================================================

/**
 * Reactive store for the Python playground.
 *
 * Features:
 * - Pyodide loading state tracking
 * - Code execution with stdout/stderr capture
 * - Plot output (base64 PNG)
 * - Pedagogic error toggle
 * - localStorage persistence
 *
 * @example
 * ```svelte
 * <script>
 * import { pythonStore } from '$lib/stores/pythonPlayground.svelte';
 *
 * function handleExecute() {
 *   pythonStore.execute();
 * }
 * </script>
 *
 * <textarea bind:value={pythonStore.code}></textarea>
 * <button onclick={handleExecute}>Run</button>
 * <pre>{pythonStore.stdout}</pre>
 * ```
 */
class PythonPlaygroundStore {
	// ===========================================================================
	// State (Svelte 5 runes)
	// ===========================================================================

	/** Current execution state */
	state = $state<PlaygroundState>('initial');

	/** Python code in the editor */
	code = $state(DEFAULT_CODE);

	/** Standard output from execution */
	stdout = $state('');

	/** Standard error from execution */
	stderr = $state('');

	/** Plot output as base64 PNG data URL */
	plotData = $state<string | null>(null);

	/** Loading progress (0-100) */
	loadingProgress = $state(0);

	/** Current loading stage description */
	loadingStage = $state('');

	/** Whether to show pedagogic (user-friendly) error messages */
	showPedagogicErrors = $state(true);

	/** Last execution time in milliseconds */
	executionTime = $state(0);

	// ===========================================================================
	// Derived State
	// ===========================================================================

	/** Whether Pyodide is ready for execution */
	isReady = $derived(this.state === 'ready');

	/** Whether code is currently executing */
	isExecuting = $derived(this.state === 'executing');

	/** Whether Pyodide is currently loading */
	isLoading = $derived(this.state === 'loading-pyodide' || this.state === 'loading-packages');

	/** Whether there is an error state */
	hasError = $derived(this.state === 'error');

	/** Whether there is any output to display */
	hasOutput = $derived(this.stdout.length > 0 || this.stderr.length > 0 || this.plotData !== null);

	/** Whether the code has been modified from default */
	isModified = $derived(this.code !== DEFAULT_CODE);

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
	 * Execute the current Python code.
	 *
	 * This is a placeholder that will be implemented when the Pyodide
	 * web worker is added in Phase 2.
	 */
	execute(): void {
		if (!this.isReady) {
			console.warn('Pyodide is not ready yet');
			return;
		}

		const trimmedCode = this.code.trim();
		if (!trimmedCode) return;

		// Placeholder: will be implemented with Pyodide worker
		this.state = 'executing';
		this.clearOutput();

		// Simulate execution (to be replaced with actual Pyodide call)
		const startTime = performance.now();

		// For now, just show a placeholder message
		setTimeout(() => {
			this.stdout = '# Pyodide worker not yet implemented\n# Code to execute:\n\n' + trimmedCode;
			this.executionTime = Math.round(performance.now() - startTime);
			this.state = 'ready';
		}, 100);
	}

	/**
	 * Clear all output (stdout, stderr, plotData).
	 */
	clearOutput(): void {
		this.stdout = '';
		this.stderr = '';
		this.plotData = null;
		this.executionTime = 0;
	}

	/**
	 * Reset code to the default example.
	 */
	resetCode(): void {
		this.code = DEFAULT_CODE;
		this.clearOutput();
		this.saveToStorage();
	}

	/**
	 * Set the Python code.
	 *
	 * @param code - The new code to set
	 */
	setCode(code: string): void {
		this.code = code;
		this.saveToStorage();
	}

	/**
	 * Toggle pedagogic error display.
	 */
	togglePedagogicErrors(): void {
		this.showPedagogicErrors = !this.showPedagogicErrors;
		this.saveToStorage();
	}

	/**
	 * Set the loading state and progress.
	 *
	 * @param state - The new state
	 * @param progress - Optional progress percentage (0-100)
	 * @param stage - Optional stage description
	 */
	setLoadingState(state: PlaygroundState, progress?: number, stage?: string): void {
		this.state = state;
		if (progress !== undefined) {
			this.loadingProgress = progress;
		}
		if (stage !== undefined) {
			this.loadingStage = stage;
		}
	}

	// ===========================================================================
	// localStorage Persistence
	// ===========================================================================

	/** Timeout for debounced save */
	private saveTimeout: ReturnType<typeof setTimeout> | null = null;

	/**
	 * Load state from localStorage.
	 */
	private loadFromStorage(): void {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (!stored) return;

			const parsed = JSON.parse(stored) as SerializedPlaygroundState;

			if (typeof parsed.code === 'string') {
				this.code = parsed.code;
			}
			if (typeof parsed.showPedagogicErrors === 'boolean') {
				this.showPedagogicErrors = parsed.showPedagogicErrors;
			}
		} catch (error) {
			console.error('Failed to load Python playground state from localStorage:', error);
		}
	}

	/**
	 * Save state to localStorage with debounce.
	 * Debounces writes to avoid excessive localStorage operations during typing.
	 */
	private saveToStorage(): void {
		if (!browser) return;

		// Clear existing timeout
		if (this.saveTimeout) {
			clearTimeout(this.saveTimeout);
		}

		// Debounce: wait 500ms before saving
		this.saveTimeout = setTimeout(() => {
			try {
				const serialized: SerializedPlaygroundState = {
					code: this.code,
					showPedagogicErrors: this.showPedagogicErrors
				};
				localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
			} catch (error) {
				console.error('Failed to save Python playground state to localStorage:', error);
			}
		}, 500);
	}
}

// =============================================================================
// Export Singleton
// =============================================================================

/**
 * Singleton instance of the Python playground store.
 *
 * Use this in components to access playground state and methods.
 */
export const pythonStore = new PythonPlaygroundStore();
