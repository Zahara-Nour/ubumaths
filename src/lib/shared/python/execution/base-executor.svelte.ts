/**
 * Base Python Executor
 *
 * Abstract base class for Python code execution using Pyodide Web Worker.
 * Provides common worker management, message handling, and reactive state
 * that can be shared between Playground (isolated) and Notebook (persistent) modes.
 *
 * @example
 * ```typescript
 * // Create a concrete implementation
 * class PlaygroundExecutor extends BasePythonExecutor {
 *   getContextId() { return undefined; }
 *   isPersistentContext() { return false; }
 *   protected onExecutionComplete(duration: number) { }
 *   protected onExecutionError(message: string, line?: number) { }
 * }
 * ```
 */

import type {
	ToWorkerMessage,
	FromWorkerMessage,
	CompletionItem,
	WorkerBreakpoint
} from '$lib/shared/python';
import { PYODIDE_CONFIG, fromWorkerMessageSchema } from '$lib/shared/python';
import type {
	DebugStepAction,
	DebugSnapshot,
	DebugPauseReason
} from '$lib/shared/python/debug/types';

// Use a simple browser check instead of $app/environment
// This avoids issues with SvelteKit runtime modules in worker-related contexts
const isBrowser = typeof window !== 'undefined';

// =============================================================================
// Types
// =============================================================================

/**
 * Executor state representing the lifecycle of Pyodide execution.
 */
export type ExecutorState =
	| 'initial'
	| 'loading-pyodide'
	| 'loading-packages'
	| 'ready'
	| 'executing'
	| 'error';

/**
 * Configuration for pending autocomplete requests
 */
interface PendingCompletion {
	resolve: (completions: CompletionItem[]) => void;
	reject: (error: Error) => void;
	timeout: ReturnType<typeof setTimeout>;
}

// =============================================================================
// Constants
// =============================================================================

/** Buffer time to ensure worker timeout fires before main thread timeout (ms) */
const TIMEOUT_BUFFER_MS = 5000;

/** Timeout for autocomplete requests (ms) */
const AUTOCOMPLETE_TIMEOUT_MS = 500;

/** Debounce delay for autocomplete requests (ms) */
const AUTOCOMPLETE_DEBOUNCE_MS = 150;

// =============================================================================
// Base Python Executor
// =============================================================================

/**
 * Abstract base class for Python code execution.
 *
 * Handles:
 * - Worker lifecycle (init, message handling, destroy)
 * - Reactive state management using Svelte 5 runes
 * - Code execution with timeout handling
 * - Autocompletion support
 *
 * Subclasses must implement abstract methods to customize behavior.
 */
export abstract class BasePythonExecutor {
	// ===========================================================================
	// Reactive State (Svelte 5 runes)
	// ===========================================================================

	/** Current execution state */
	state = $state<ExecutorState>('initial');

	/** Loading progress percentage (0-100) */
	loadingProgress = $state(0);

	/** Current loading stage description */
	loadingStage = $state('');

	/** Standard output from execution */
	stdout = $state('');

	/** Standard error from execution */
	stderr = $state('');

	/** Plot output as base64 PNG data URL */
	plotData = $state<string | null>(null);

	/** LaTeX output from sympy expressions */
	latexOutput = $state<string | null>(null);

	/** Plotly JSON spec for interactive charts */
	plotlyData = $state<string | null>(null);

	/** Error line number for highlighting */
	errorLine = $state<number | null>(null);

	/** Last execution time in milliseconds */
	executionTime = $state(0);

	/** Packages currently being loaded (lazy loading) */
	packagesLoading = $state<string[]>([]);

	/** Packages that have been loaded during this session */
	loadedPackages = $state<string[]>([]);

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
	hasOutput = $derived(
		this.stdout.length > 0 ||
			this.stderr.length > 0 ||
			this.plotData !== null ||
			this.latexOutput !== null ||
			this.plotlyData !== null
	);

	/** Whether packages are currently being loaded */
	isLoadingPackages = $derived(this.packagesLoading.length > 0);

	// ===========================================================================
	// Private State
	// ===========================================================================

	/** Web Worker instance */
	private worker: Worker | null = null;

	/** Current execution ID */
	private currentExecutionId: string | null = null;

	/** Timeout for main thread timeout tracking */
	private executionTimeout: ReturnType<typeof setTimeout> | null = null;

	/** Whether worker is supported in this browser */
	private workerSupported = true;

	/** Pending autocomplete requests */
	private pendingCompletions = new Map<string, PendingCompletion>();

	/** Debounce timeout for autocomplete */
	private autocompleteDebounceTimeout: ReturnType<typeof setTimeout> | null = null;

	/** Last autocomplete request ID for cancellation */
	private lastAutocompleteRequestId: string | null = null;

	// ===========================================================================
	// Debug State
	// ===========================================================================

	/** Current debug execution ID (null when not in debug session) */
	private debugExecutionId: string | null = null;

	/** Debug session start time for duration tracking */
	private debugStartTime: number = 0;

	// ===========================================================================
	// Abstract Methods - Must be implemented by subclasses
	// ===========================================================================

	/**
	 * Get the context ID for execution.
	 * Return undefined for isolated execution (playground mode).
	 * Return a string for persistent execution (notebook mode).
	 */
	abstract getContextId(): string | undefined;

	/**
	 * Whether this executor uses persistent context.
	 * Playground: false (state reset between runs)
	 * Notebook: true (state preserved across cells)
	 */
	abstract isPersistentContext(): boolean;

	/**
	 * Hook called when execution completes successfully.
	 * @param duration - Execution time in milliseconds
	 */
	protected abstract onExecutionComplete(duration: number): void;

	/**
	 * Hook called when execution encounters an error.
	 * @param message - Error message
	 * @param line - Optional line number where error occurred
	 */
	protected abstract onExecutionError(message: string, line?: number): void;

	// ===========================================================================
	// Constructor
	// ===========================================================================

	constructor() {
		if (isBrowser) {
			this.checkWorkerSupport();
		}
	}

	// ===========================================================================
	// Worker Lifecycle
	// ===========================================================================

	/**
	 * Check if Web Workers are supported
	 */
	private checkWorkerSupport(): void {
		this.workerSupported = typeof Worker !== 'undefined';
		if (!this.workerSupported) {
			console.warn('[BasePythonExecutor] Web Workers are not supported in this browser');
		}
	}

	/**
	 * Initialize Pyodide by creating and initializing the Web Worker.
	 * Should be called when the component mounts.
	 */
	initPyodide(): void {
		if (!isBrowser) return;

		if (!this.workerSupported) {
			this.state = 'error';
			this.stderr = 'Les Web Workers ne sont pas supportes dans ce navigateur.';
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
			// Path is relative from this file (src/lib/shared/python/execution/) to worker (src/lib/workers/)
			this.worker = new Worker(new URL('../../../workers/pyodide.worker.ts', import.meta.url), {
				type: 'module'
			});

			// Set up message handler with Zod validation
			this.worker.onmessage = (event: MessageEvent<unknown>) => {
				const validation = fromWorkerMessageSchema.safeParse(event.data);
				if (!validation.success) {
					console.error('[BasePythonExecutor] Invalid worker message:', validation.error.issues);
					return;
				}
				this.handleWorkerMessage(validation.data);
			};

			// Set up error handler
			this.worker.onerror = (event: ErrorEvent) => {
				console.error('[BasePythonExecutor] Worker error:', event);
				this.state = 'error';
				this.stderr = `Erreur du worker: ${event.message}`;
				// Clean up on worker error
				this.clearExecutionTimeout();
				this.currentExecutionId = null;
			};

			// Send init message to worker
			this.postToWorker({ type: 'init' });
		} catch (error) {
			console.error('[BasePythonExecutor] Failed to create worker:', error);
			this.state = 'error';
			this.stderr =
				error instanceof Error
					? `Echec de creation du worker: ${error.message}`
					: 'Echec de creation du worker';
		}
	}

	/**
	 * Terminate the worker and clean up resources.
	 * Call this when the component unmounts.
	 */
	destroy(): void {
		if (this.worker) {
			this.worker.terminate();
			this.worker = null;
		}
		this.clearExecutionTimeout();

		// Clean up autocomplete resources
		if (this.autocompleteDebounceTimeout) {
			clearTimeout(this.autocompleteDebounceTimeout);
			this.autocompleteDebounceTimeout = null;
		}

		// Reject all pending autocomplete requests
		for (const [, pending] of this.pendingCompletions) {
			clearTimeout(pending.timeout);
			pending.reject(new Error('Worker destroyed'));
		}
		this.pendingCompletions.clear();

		// Clean up debug session state
		this.debugExecutionId = null;
		this.debugStartTime = 0;

		this.state = 'initial';
		this.currentExecutionId = null;
	}

	// ===========================================================================
	// Message Handling
	// ===========================================================================

	/**
	 * Send a message to the worker
	 */
	protected postToWorker(message: ToWorkerMessage): void {
		if (this.worker) {
			this.worker.postMessage(message);
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
				this.loadingStage = 'Pret !';
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

			case 'latex':
				if (message.id === this.currentExecutionId) {
					this.latexOutput = message.latex;
				}
				break;

			case 'packages-loading':
				if (message.id === this.currentExecutionId) {
					this.packagesLoading = message.packages;
					this.loadingStage = `Chargement de ${message.packages.join(', ')}...`;
				}
				break;

			case 'packages-loaded':
				if (message.id === this.currentExecutionId) {
					this.packagesLoading = [];
					this.loadedPackages = [...new Set([...this.loadedPackages, ...message.packages])];
				}
				break;

			case 'plotly':
				if (message.id === this.currentExecutionId) {
					this.plotlyData = message.jsonSpec;
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
						this.currentExecutionId = null;
						// Notify subclass of error
						this.onExecutionError(message.message, message.line);
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
					// Notify subclass of completion
					this.onExecutionComplete(message.duration);
				}
				break;

			case 'timeout':
				if (message.id === this.currentExecutionId) {
					this.stderr = "Delai d'execution depasse (30 secondes)";
					this.state = 'ready';
					this.clearExecutionTimeout();
					this.currentExecutionId = null;
					// Notify subclass of error
					this.onExecutionError("Delai d'execution depasse (30 secondes)");
				}
				break;

			case 'autocomplete-result':
				this.handleAutocompleteResult(message.id, message.completions);
				break;

			// Debug-related messages
			case 'debug-snapshot':
				if (message.id === this.debugExecutionId) {
					this.onDebugSnapshot(message.snapshot);
				}
				break;

			case 'debug-paused':
				if (message.id === this.debugExecutionId) {
					this.onDebugPaused(message.reason);
				}
				break;

			case 'debug-finished':
				if (message.id === this.debugExecutionId) {
					const duration = message.duration;
					this.debugExecutionId = null;
					this.debugStartTime = 0;
					this.onDebugFinished(duration);
				}
				break;

			// Context-related messages (for notebook mode)
			case 'context-created':
			case 'context-destroyed':
			case 'context-reset':
			case 'validation-result':
				// These are handled by subclasses if needed
				break;
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

	// ===========================================================================
	// Execution Methods
	// ===========================================================================

	/**
	 * Execute Python code.
	 *
	 * @param code - The Python code to execute
	 */
	execute(code: string): void {
		if (!this.isReady) {
			console.warn('[BasePythonExecutor] Pyodide is not ready yet');
			return;
		}

		if (!this.worker) {
			console.warn('[BasePythonExecutor] Worker not initialized');
			return;
		}

		const trimmedCode = code.trim();
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
				this.stderr = "Delai d'execution depasse (30 secondes)";
				this.state = 'ready';
				this.currentExecutionId = null;
				// Send cancel to worker
				this.postToWorker({ type: 'cancel', id: executionId });
				// Notify subclass
				this.onExecutionError("Delai d'execution depasse (30 secondes)");
			}
		}, PYODIDE_CONFIG.TIMEOUT_MS + TIMEOUT_BUFFER_MS);

		// Send execute message to worker with optional context ID
		this.postToWorker({
			type: 'execute',
			code: trimmedCode,
			id: executionId,
			contextId: this.getContextId()
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
	 * Clear all output (stdout, stderr, plotData, latexOutput, plotlyData).
	 */
	clearOutput(): void {
		this.stdout = '';
		this.stderr = '';
		this.plotData = null;
		this.latexOutput = null;
		this.plotlyData = null;
		this.executionTime = 0;
		this.errorLine = null;
	}

	// ===========================================================================
	// Autocompletion
	// ===========================================================================

	/**
	 * Handle autocomplete result from worker
	 */
	private handleAutocompleteResult(id: string, completions: CompletionItem[]): void {
		const pending = this.pendingCompletions.get(id);
		if (pending) {
			clearTimeout(pending.timeout);
			pending.resolve(completions);
			this.pendingCompletions.delete(id);
		}
	}

	/**
	 * Request Python autocompletion for code at cursor position.
	 * Uses debouncing to avoid flooding the worker with requests.
	 *
	 * @param code - The full Python code
	 * @param cursor - The cursor position (character offset)
	 * @returns Promise resolving to an array of completion items
	 */
	requestCompletion(code: string, cursor: number): Promise<CompletionItem[]> {
		return new Promise((resolve) => {
			// Validate cursor position
			if (cursor < 0 || cursor > code.length) {
				resolve([]);
				return;
			}

			// Clear previous debounce timeout
			if (this.autocompleteDebounceTimeout) {
				clearTimeout(this.autocompleteDebounceTimeout);
			}

			// Cancel previous pending request if it exists (prevents memory leak)
			if (this.lastAutocompleteRequestId) {
				const oldPending = this.pendingCompletions.get(this.lastAutocompleteRequestId);
				if (oldPending) {
					clearTimeout(oldPending.timeout);
					oldPending.resolve([]); // Resolve with empty array to avoid hanging promises
					this.pendingCompletions.delete(this.lastAutocompleteRequestId);
				}
			}

			// Debounce the request
			this.autocompleteDebounceTimeout = setTimeout(() => {
				this.autocompleteDebounceTimeout = null;

				// Check if Pyodide is ready
				if (!this.isReady || !this.worker) {
					resolve([]);
					return;
				}

				// Generate unique request ID
				const requestId = `ac-${Date.now()}-${Math.random().toString(36).slice(2)}`;
				this.lastAutocompleteRequestId = requestId;

				// Set up timeout for the request
				const timeout = setTimeout(() => {
					const pending = this.pendingCompletions.get(requestId);
					if (pending) {
						this.pendingCompletions.delete(requestId);
						if (this.lastAutocompleteRequestId === requestId) {
							this.lastAutocompleteRequestId = null;
						}
						// Resolve with empty array on timeout (don't reject to avoid UI errors)
						resolve([]);
					}
				}, AUTOCOMPLETE_TIMEOUT_MS);

				// Store the pending request
				this.pendingCompletions.set(requestId, { resolve, reject: () => {}, timeout });

				// Send request to worker with optional context ID
				this.postToWorker({
					type: 'autocomplete',
					code,
					cursor,
					id: requestId,
					contextId: this.getContextId()
				});
			}, AUTOCOMPLETE_DEBOUNCE_MS);
		});
	}

	// ===========================================================================
	// Debug Execution Methods
	// ===========================================================================

	/**
	 * Start a debug session with the given code and breakpoints.
	 * The session will pause at the first line or first breakpoint.
	 *
	 * @param code - The Python code to debug
	 * @param breakpoints - Array of breakpoints to set
	 */
	startDebugSession(code: string, breakpoints: WorkerBreakpoint[]): void {
		if (!this.isReady) {
			console.warn('[BasePythonExecutor] Pyodide is not ready yet');
			return;
		}

		if (!this.worker) {
			console.warn('[BasePythonExecutor] Worker not initialized');
			return;
		}

		const trimmedCode = code.trim();
		if (!trimmedCode) return;

		// Generate unique debug execution ID
		const executionId = `debug-${Date.now()}-${Math.random().toString(36).slice(2)}`;
		this.debugExecutionId = executionId;
		this.debugStartTime = performance.now();

		// Clear previous output
		this.clearOutput();

		// Send debug-start message to worker
		this.postToWorker({
			type: 'debug-start',
			code: trimmedCode,
			id: executionId,
			breakpoints
		});
	}

	/**
	 * Send a step command during an active debug session.
	 *
	 * @param action - The step action to perform
	 */
	debugStep(action: DebugStepAction): void {
		if (!this.debugExecutionId) {
			console.warn('[BasePythonExecutor] No active debug session');
			return;
		}

		if (!this.worker) {
			console.warn('[BasePythonExecutor] Worker not initialized');
			return;
		}

		this.postToWorker({
			type: 'debug-step',
			id: this.debugExecutionId,
			action
		});
	}

	/**
	 * Stop the current debug session.
	 */
	stopDebugSession(): void {
		if (!this.debugExecutionId) {
			return;
		}

		if (this.worker) {
			this.postToWorker({
				type: 'debug-stop',
				id: this.debugExecutionId
			});
		}

		this.debugExecutionId = null;
		this.debugStartTime = 0;
	}

	/**
	 * Check if a debug session is currently active.
	 *
	 * @returns true if a debug session is active
	 */
	isDebugSessionActive(): boolean {
		return this.debugExecutionId !== null;
	}

	/**
	 * Get the current debug execution ID.
	 *
	 * @returns The debug execution ID or null
	 */
	getDebugExecutionId(): string | null {
		return this.debugExecutionId;
	}

	// ===========================================================================
	// Debug Hooks (for subclasses to override)
	// ===========================================================================

	/**
	 * Hook called when a debug snapshot is received.
	 * Override in subclasses to handle snapshots.
	 *
	 * @param snapshot - The execution snapshot
	 */
	protected onDebugSnapshot(snapshot: DebugSnapshot): void {
		// Default: no-op, subclasses override
		void snapshot;
	}

	/**
	 * Hook called when debug execution pauses.
	 * Override in subclasses to handle pause events.
	 *
	 * @param reason - Why execution paused
	 */
	protected onDebugPaused(reason: DebugPauseReason): void {
		// Default: no-op, subclasses override
		void reason;
	}

	/**
	 * Hook called when debug session finishes.
	 * Override in subclasses to handle session completion.
	 *
	 * @param duration - Total debug session duration in milliseconds
	 */
	protected onDebugFinished(duration: number): void {
		// Default: no-op, subclasses override
		void duration;
	}

	// ===========================================================================
	// State Accessors (for read-only access from store)
	// ===========================================================================

	/**
	 * Get the current execution ID (for debugging/tracking)
	 */
	getCurrentExecutionId(): string | null {
		return this.currentExecutionId;
	}

	/**
	 * Check if worker is initialized
	 */
	hasWorker(): boolean {
		return this.worker !== null;
	}
}
