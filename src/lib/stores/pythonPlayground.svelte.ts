/**
 * Python Playground Store
 *
 * Svelte 5 reactive store for the Python playground.
 * Manages Pyodide state, code execution, and localStorage persistence.
 */

import { browser } from '$app/environment';
import { z } from 'zod';
import type { ToWorkerMessage, FromWorkerMessage } from '$lib/types/python-worker';
import { PYODIDE_CONFIG } from '$lib/types/python-worker';

// =============================================================================
// Zod Schemas for Worker Message Validation
// =============================================================================

/**
 * Schema for validating messages from the worker
 */
const fromWorkerMessageSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('loading-progress'), percent: z.number(), stage: z.string() }),
	z.object({ type: z.literal('pyodide-ready') }),
	z.object({ type: z.literal('stdout'), data: z.string(), id: z.string() }),
	z.object({ type: z.literal('stderr'), data: z.string(), id: z.string() }),
	z.object({ type: z.literal('plot'), imageData: z.string(), id: z.string() }),
	z.object({
		type: z.literal('error'),
		message: z.string(),
		line: z.number().optional(),
		id: z.string()
	}),
	z.object({ type: z.literal('complete'), id: z.string(), duration: z.number() }),
	z.object({ type: z.literal('timeout'), id: z.string() })
]);

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = 'ubumaths-python-playground';

/** Debounce delay for saving to localStorage (ms) */
const STORAGE_SAVE_DEBOUNCE_MS = 500;

/** Buffer time to ensure worker timeout fires before main thread timeout (ms) */
const TIMEOUT_BUFFER_MS = 5000;

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
 * - Pyodide loading state tracking via Web Worker
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

	/** Error line number for highlighting */
	errorLine = $state<number | null>(null);

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
	// Private State
	// ===========================================================================

	/** Web Worker instance */
	private worker: Worker | null = null;

	/** Current execution ID */
	private currentExecutionId: string | null = null;

	/** Timeout for main thread timeout tracking */
	private executionTimeout: ReturnType<typeof setTimeout> | null = null;

	/** Timeout for debounced save */
	private saveTimeout: ReturnType<typeof setTimeout> | null = null;

	/** Whether worker is supported in this browser */
	private workerSupported = true;

	// ===========================================================================
	// Initialization
	// ===========================================================================

	constructor() {
		if (browser) {
			this.loadFromStorage();
			this.checkWorkerSupport();
		}
	}

	/**
	 * Check if Web Workers are supported
	 */
	private checkWorkerSupport(): void {
		this.workerSupported = typeof Worker !== 'undefined';
		if (!this.workerSupported) {
			console.warn('Web Workers are not supported in this browser');
		}
	}

	// ===========================================================================
	// Worker Management
	// ===========================================================================

	/**
	 * Initialize Pyodide by creating and initializing the Web Worker.
	 * Should be called when the playground component mounts.
	 */
	initPyodide(): void {
		if (!browser) return;

		if (!this.workerSupported) {
			this.state = 'error';
			this.stderr = 'Les Web Workers ne sont pas supportés dans ce navigateur.';
			return;
		}

		// Prevent multiple initializations
		if (this.worker || this.state !== 'initial') {
			return;
		}

		this.state = 'loading-pyodide';
		this.loadingProgress = 0;
		this.loadingStage = 'Initialisation...';

		try {
			// Create the worker using Vite's URL pattern
			this.worker = new Worker(new URL('../workers/pyodide.worker.ts', import.meta.url), {
				type: 'module'
			});

			// Set up message handler with Zod validation
			this.worker.onmessage = (event: MessageEvent<unknown>) => {
				const validation = fromWorkerMessageSchema.safeParse(event.data);
				if (!validation.success) {
					console.error('[Python Store] Invalid worker message:', validation.error.issues);
					return;
				}
				this.handleWorkerMessage(validation.data);
			};

			// Set up error handler
			this.worker.onerror = (event: ErrorEvent) => {
				console.error('[Python Store] Worker error:', event);
				this.state = 'error';
				this.stderr = `Erreur du worker: ${event.message}`;
				// Clean up on worker error
				this.clearExecutionTimeout();
				this.currentExecutionId = null;
			};

			// Send init message to worker
			this.postToWorker({ type: 'init' });
		} catch (error) {
			console.error('[Python Store] Failed to create worker:', error);
			this.state = 'error';
			this.stderr =
				error instanceof Error
					? `Échec de création du worker: ${error.message}`
					: 'Échec de création du worker';
		}
	}

	/**
	 * Handle messages from the Web Worker
	 */
	private handleWorkerMessage(message: FromWorkerMessage): void {
		switch (message.type) {
			case 'loading-progress':
				this.loadingProgress = message.percent;
				this.loadingStage = message.stage;
				// Update state based on progress
				if (message.percent > 20 && message.percent < 100) {
					this.state = 'loading-packages';
				}
				break;

			case 'pyodide-ready':
				this.state = 'ready';
				this.loadingProgress = 100;
				this.loadingStage = 'Prêt !';
				break;

			case 'stdout':
				if (message.id === this.currentExecutionId) {
					this.stdout += message.data;
				}
				break;

			case 'stderr':
				if (message.id === this.currentExecutionId) {
					this.stderr += message.data;
				}
				break;

			case 'plot':
				if (message.id === this.currentExecutionId) {
					// Convert base64 to data URL
					this.plotData = `data:image/png;base64,${message.imageData}`;
				}
				break;

			case 'error':
				if (message.id === this.currentExecutionId || message.id === '') {
					this.stderr = message.message;
					if (message.line !== undefined) {
						this.errorLine = message.line;
					}
					// Only set error state if it was a loading error (id = '')
					if (message.id === '') {
						this.state = 'error';
					} else {
						// Execution error, return to ready state
						this.state = 'ready';
					}
					this.clearExecutionTimeout();
				}
				break;

			case 'complete':
				if (message.id === this.currentExecutionId) {
					this.executionTime = message.duration;
					this.state = 'ready';
					this.clearExecutionTimeout();
					this.currentExecutionId = null;
				}
				break;

			case 'timeout':
				if (message.id === this.currentExecutionId) {
					this.stderr = "Délai d'exécution dépassé (30 secondes)";
					this.state = 'ready';
					this.clearExecutionTimeout();
					this.currentExecutionId = null;
				}
				break;
		}
	}

	/**
	 * Send a message to the worker
	 */
	private postToWorker(message: ToWorkerMessage): void {
		if (this.worker) {
			this.worker.postMessage(message);
		}
	}

	/**
	 * Clear the execution timeout
	 */
	private clearExecutionTimeout(): void {
		if (this.executionTimeout) {
			clearTimeout(this.executionTimeout);
			this.executionTimeout = null;
		}
	}

	/**
	 * Terminate the worker and clean up resources.
	 * Call this when the playground component unmounts.
	 */
	destroy(): void {
		if (this.worker) {
			this.worker.terminate();
			this.worker = null;
		}
		this.clearExecutionTimeout();
		if (this.saveTimeout) {
			clearTimeout(this.saveTimeout);
			this.saveTimeout = null;
		}
		this.state = 'initial';
		this.currentExecutionId = null;
	}

	// ===========================================================================
	// Public Methods
	// ===========================================================================

	/**
	 * Execute the current Python code.
	 */
	execute(): void {
		if (!this.isReady) {
			console.warn('Pyodide is not ready yet');
			return;
		}

		if (!this.worker) {
			console.warn('Worker not initialized');
			return;
		}

		const trimmedCode = this.code.trim();
		if (!trimmedCode) return;

		// Generate unique execution ID
		const executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2)}`;
		this.currentExecutionId = executionId;

		// Update state and clear previous output
		this.state = 'executing';
		this.clearOutput();

		// Set up main thread timeout as backup
		this.executionTimeout = setTimeout(() => {
			if (this.currentExecutionId === executionId && this.state === 'executing') {
				this.stderr = "Délai d'exécution dépassé (30 secondes)";
				this.state = 'ready';
				this.currentExecutionId = null;
				// Send cancel to worker
				this.postToWorker({ type: 'cancel', id: executionId });
			}
		}, PYODIDE_CONFIG.TIMEOUT_MS + TIMEOUT_BUFFER_MS);

		// Send execute message to worker
		this.postToWorker({
			type: 'execute',
			code: trimmedCode,
			id: executionId
		});
	}

	/**
	 * Cancel the current execution.
	 */
	cancel(): void {
		if (this.currentExecutionId && this.state === 'executing') {
			this.postToWorker({ type: 'cancel', id: this.currentExecutionId });
			this.state = 'ready';
			this.clearExecutionTimeout();
			this.currentExecutionId = null;
		}
	}

	/**
	 * Clear all output (stdout, stderr, plotData).
	 */
	clearOutput(): void {
		this.stdout = '';
		this.stderr = '';
		this.plotData = null;
		this.executionTime = 0;
		this.errorLine = null;
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

		// Debounce before saving
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
		}, STORAGE_SAVE_DEBOUNCE_MS);
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
