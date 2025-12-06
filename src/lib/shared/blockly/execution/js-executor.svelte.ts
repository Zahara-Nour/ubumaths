/**
 * JavaScript Sandbox Executor
 *
 * Manages the JavaScript sandbox Web Worker for Blockly code execution.
 * Provides reactive state using Svelte 5 runes for integration with components.
 *
 * Features:
 * - Worker lifecycle management (init, destroy)
 * - Zod-validated message handling
 * - Console output capture (stdout, stderr)
 * - Timeout handling (10 seconds)
 * - Error reporting with line numbers
 *
 * @example
 * ```typescript
 * const executor = new JsExecutor();
 * executor.init();
 * executor.execute('console.log("Hello, World!");');
 * // Access reactive state: executor.stdout, executor.stderr, etc.
 * executor.destroy();
 * ```
 */

import type { ToWorkerMessage, FromWorkerMessage } from '$lib/shared/blockly/worker/messages';
import { fromWorkerMessageSchema } from '$lib/shared/blockly/worker/messages';
import type { JsExecutorState } from './types';

// Use a simple browser check instead of $app/environment
// This avoids issues with SvelteKit runtime modules in worker-related contexts
const isBrowser = typeof window !== 'undefined';

// =============================================================================
// Constants
// =============================================================================

/** Execution timeout in milliseconds (matches worker timeout) */
const TIMEOUT_MS = 10_000;

/** Buffer time to ensure worker timeout fires before main thread timeout (ms) */
const TIMEOUT_BUFFER_MS = 2_000;

// =============================================================================
// JavaScript Sandbox Executor
// =============================================================================

/**
 * JavaScript sandbox executor using Web Worker.
 *
 * Handles:
 * - Worker lifecycle (init, message handling, destroy)
 * - Reactive state management using Svelte 5 runes
 * - Code execution with timeout handling
 * - Console output capture
 */
export class JsExecutor {
	// ===========================================================================
	// Reactive State (Svelte 5 runes)
	// ===========================================================================

	/** Current executor state */
	state = $state<JsExecutorState>('initial');

	/** Standard output from execution (console.log, console.info) */
	stdout = $state('');

	/** Standard error from execution (console.error, console.warn, errors) */
	stderr = $state('');

	/** Error line number for highlighting */
	errorLine = $state<number | null>(null);

	/** Last execution time in milliseconds */
	executionTime = $state(0);

	// ===========================================================================
	// Derived State
	// ===========================================================================

	/** Whether the executor is ready for code execution */
	isReady = $derived(this.state === 'ready');

	/** Whether code is currently executing */
	isExecuting = $derived(this.state === 'executing');

	/** Whether there is an error state */
	hasError = $derived(this.state === 'error');

	/** Whether there is any output to display */
	hasOutput = $derived(this.stdout.length > 0 || this.stderr.length > 0);

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
			console.warn('[JsExecutor] Web Workers are not supported in this browser');
		}
	}

	/**
	 * Initialize the JavaScript sandbox worker.
	 * Should be called when the component mounts.
	 */
	init(): void {
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

		try {
			// Create the worker using Vite's URL pattern
			// Path is relative from this file (src/lib/shared/blockly/execution/) to worker (src/lib/workers/)
			// execution/ -> blockly/ -> shared/ -> lib/ -> workers/
			this.worker = new Worker(new URL('../../../workers/js-sandbox.worker.ts', import.meta.url), {
				type: 'module'
			});

			// Set up message handler with Zod validation
			this.worker.onmessage = (event: MessageEvent<unknown>) => {
				const validation = fromWorkerMessageSchema.safeParse(event.data);
				if (!validation.success) {
					console.error('[JsExecutor] Invalid worker message:', validation.error.issues);
					return;
				}
				this.handleWorkerMessage(validation.data);
			};

			// Set up error handler
			this.worker.onerror = (event: ErrorEvent) => {
				console.error('[JsExecutor] Worker error:', event);
				this.state = 'error';
				this.stderr = `Erreur du worker: ${event.message}`;
				// Clean up on worker error
				this.clearExecutionTimeout();
				this.currentExecutionId = null;
			};
		} catch (error) {
			console.error('[JsExecutor] Failed to create worker:', error);
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
		this.state = 'initial';
		this.currentExecutionId = null;
	}

	// ===========================================================================
	// Message Handling
	// ===========================================================================

	/**
	 * Send a message to the worker
	 */
	private postToWorker(message: ToWorkerMessage): void {
		if (this.worker) {
			this.worker.postMessage(message);
		}
	}

	/**
	 * Handle messages from the Web Worker
	 */
	private handleWorkerMessage(message: FromWorkerMessage): void {
		switch (message.type) {
			case 'ready':
				this.state = 'ready';
				break;

			case 'stdout':
				if (message.id === this.currentExecutionId) {
					// Append newline if there's already content
					this.stdout += (this.stdout.length > 0 ? '\n' : '') + message.data;
				}
				break;

			case 'stderr':
				if (message.id === this.currentExecutionId) {
					// Append newline if there's already content
					this.stderr += (this.stderr.length > 0 ? '\n' : '') + message.data;
				}
				break;

			case 'error':
				if (message.id === this.currentExecutionId) {
					this.stderr = message.message;
					if (message.line !== undefined) {
						this.errorLine = message.line;
					}
					this.state = 'ready';
					this.clearExecutionTimeout();
					this.currentExecutionId = null;
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
					this.stderr = "Delai d'execution depasse (10 secondes)";
					this.state = 'ready';
					this.clearExecutionTimeout();
					this.currentExecutionId = null;
				}
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
	 * Execute JavaScript code.
	 *
	 * @param code - The JavaScript code to execute
	 */
	execute(code: string): void {
		if (!this.isReady) {
			console.warn('[JsExecutor] Executor is not ready yet');
			return;
		}

		if (!this.worker) {
			console.warn('[JsExecutor] Worker not initialized');
			return;
		}

		const trimmedCode = code.trim();
		if (!trimmedCode) return;

		// Generate unique execution ID
		const executionId = `js-exec-${Date.now()}-${Math.random().toString(36).slice(2)}`;
		this.currentExecutionId = executionId;

		// Update state and clear previous output
		this.state = 'executing';
		this.clearOutput();

		// Set up main thread timeout as backup
		this.executionTimeout = setTimeout(() => {
			if (this.currentExecutionId === executionId && this.state === 'executing') {
				this.stderr = "Delai d'execution depasse (10 secondes)";
				this.state = 'ready';
				this.currentExecutionId = null;
				// Send cancel to worker
				this.postToWorker({ type: 'cancel', id: executionId });
			}
		}, TIMEOUT_MS + TIMEOUT_BUFFER_MS);

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
	 * Clear all output (stdout, stderr).
	 */
	clearOutput(): void {
		this.stdout = '';
		this.stderr = '';
		this.executionTime = 0;
		this.errorLine = null;
	}

	// ===========================================================================
	// State Accessors
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
