/**
 * Blockly Code Executor
 *
 * Orchestrates code execution for Blockly-generated code.
 * Supports both JavaScript (via sandbox worker) and Python (via Pyodide).
 *
 * Architecture:
 * - JavaScript: Uses JsExecutor (lightweight, fast startup)
 * - Python: Uses PlaygroundExecutor (lazy-loaded for performance)
 *
 * @example
 * ```typescript
 * const executor = new BlocklyExecutor();
 * executor.init();
 *
 * // Execute JavaScript
 * await executor.execute('console.log("Hello");', 'javascript');
 *
 * // Execute Python
 * await executor.execute('print("Hello")', 'python');
 *
 * // Access reactive state
 * console.log(executor.output);
 *
 * executor.destroy();
 * ```
 */

import { JsExecutor } from './js-executor.svelte';
import type { ExecutionLanguage, OutputLine } from '$lib/shared/blockly/types';

// Lazy import for Python executor to avoid loading Pyodide until needed
type PlaygroundExecutorType =
	import('$lib/shared/python/execution/playground-executor.svelte').PlaygroundExecutor;

// Use a simple browser check
const isBrowser = typeof window !== 'undefined';

// =============================================================================
// Constants
// =============================================================================

/** Polling interval for state sync (ms) */
const STATE_POLL_INTERVAL_MS = 50;

/** Maximum wait time for executor ready (ms) */
const MAX_WAIT_TIME_MS = 60_000;

// =============================================================================
// Types
// =============================================================================

/**
 * Unified executor state
 */
export type BlocklyExecutorState =
	| 'initial'
	| 'loading-js' // JS worker initializing
	| 'loading-python' // Pyodide loading
	| 'ready'
	| 'executing'
	| 'error';

// =============================================================================
// Blockly Executor
// =============================================================================

/**
 * Unified code executor for Blockly playground.
 *
 * Manages both JavaScript and Python execution with:
 * - Lazy loading of Python executor (only when needed)
 * - Unified output handling
 * - Language-specific state management
 */
export class BlocklyExecutor {
	// ===========================================================================
	// Reactive State (Svelte 5 runes)
	// ===========================================================================

	/** Current executor state */
	state = $state<BlocklyExecutorState>('initial');

	/** Currently active language */
	language = $state<ExecutionLanguage>('javascript');

	/** Output lines (combined from all executions) */
	output = $state<OutputLine[]>([]);

	/** Error line number for highlighting */
	errorLine = $state<number | null>(null);

	/** Last execution time in milliseconds */
	executionTime = $state(0);

	/** Loading progress (0-100) for Python */
	loadingProgress = $state(0);

	/** Loading stage description */
	loadingStage = $state('');

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
	hasOutput = $derived(this.output.length > 0);

	/** Whether currently loading */
	isLoading = $derived(this.state === 'loading-js' || this.state === 'loading-python');

	// ===========================================================================
	// Private State
	// ===========================================================================

	/** JavaScript executor */
	private jsExecutor: JsExecutor | null = null;

	/** Python executor (lazy loaded) */
	private pythonExecutor: PlaygroundExecutorType | null = null;

	/** Whether Python module has been imported */
	private pythonModuleLoaded = false;

	/** Polling interval ID for state sync */
	private statePollingId: ReturnType<typeof setInterval> | null = null;

	// ===========================================================================
	// Initialization
	// ===========================================================================

	/**
	 * Initialize the executor.
	 * Starts with JavaScript executor (fast).
	 * Python executor is lazy-loaded on first Python execution.
	 */
	init(): void {
		if (!isBrowser) return;

		// Prevent multiple initializations
		if (this.state !== 'initial') {
			return;
		}

		this.state = 'loading-js';
		this.loadingStage = 'Initialisation JavaScript...';

		// Initialize JavaScript executor
		this.jsExecutor = new JsExecutor();
		this.jsExecutor.init();

		// Start polling to sync state from JS executor
		this.startStatePolling();
	}

	/**
	 * Start polling to sync state from child executors
	 */
	private startStatePolling(): void {
		if (this.statePollingId) return;

		this.statePollingId = setInterval(() => {
			this.syncStateFromExecutors();
		}, STATE_POLL_INTERVAL_MS);
	}

	/**
	 * Stop state polling
	 */
	private stopStatePolling(): void {
		if (this.statePollingId) {
			clearInterval(this.statePollingId);
			this.statePollingId = null;
		}
	}

	/**
	 * Sync state from child executors to unified state
	 */
	private syncStateFromExecutors(): void {
		// Sync from JS executor when in JS mode
		if (this.language === 'javascript' && this.jsExecutor) {
			if (this.jsExecutor.isReady && this.state === 'loading-js') {
				this.state = 'ready';
				this.loadingStage = 'Pret !';
				this.loadingProgress = 100;
			}
		}

		// Sync from Python executor when in Python mode
		if (this.language === 'python' && this.pythonExecutor) {
			if (this.state === 'loading-python') {
				this.loadingProgress = this.pythonExecutor.loadingProgress;
				this.loadingStage = this.pythonExecutor.loadingStage;

				if (this.pythonExecutor.isReady) {
					this.state = 'ready';
				} else if (this.pythonExecutor.hasError) {
					this.state = 'error';
				}
			}
		}
	}

	/**
	 * Lazy-load Python executor.
	 * Called automatically on first Python execution.
	 */
	private async loadPythonExecutor(): Promise<void> {
		if (this.pythonExecutor || this.pythonModuleLoaded) {
			return;
		}

		this.state = 'loading-python';
		this.loadingProgress = 0;
		this.loadingStage = 'Chargement de Python...';

		try {
			// Dynamic import of Python executor
			const { PlaygroundExecutor } =
				await import('$lib/shared/python/execution/playground-executor.svelte');

			this.pythonModuleLoaded = true;
			this.pythonExecutor = new PlaygroundExecutor();

			// Initialize Pyodide
			this.pythonExecutor.initPyodide();
		} catch (error) {
			console.error('[BlocklyExecutor] Failed to load Python executor:', error);
			this.state = 'error';
			this.addOutput(
				'stderr',
				error instanceof Error
					? `Echec du chargement de Python: ${error.message}`
					: 'Echec du chargement de Python'
			);
		}
	}

	/**
	 * Terminate all executors and clean up resources.
	 */
	destroy(): void {
		this.stopStatePolling();

		if (this.jsExecutor) {
			this.jsExecutor.destroy();
			this.jsExecutor = null;
		}

		if (this.pythonExecutor) {
			this.pythonExecutor.destroy();
			this.pythonExecutor = null;
		}

		this.state = 'initial';
		this.output = [];
	}

	// ===========================================================================
	// Execution Methods
	// ===========================================================================

	/**
	 * Execute code in the specified language.
	 *
	 * @param code - The code to execute
	 * @param language - The target language (javascript or python)
	 */
	async execute(code: string, language: ExecutionLanguage): Promise<void> {
		if (!isBrowser) return;

		const trimmedCode = code.trim();
		if (!trimmedCode) return;

		// Update language
		this.language = language;

		// Clear previous output
		this.clearOutput();

		if (language === 'javascript') {
			await this.executeJavaScript(trimmedCode);
		} else {
			await this.executePython(trimmedCode);
		}
	}

	/**
	 * Wait for an executor to be ready
	 */
	private async waitForReady(
		checkFn: () => boolean,
		errorCheckFn: () => boolean
	): Promise<boolean> {
		const startTime = Date.now();

		return new Promise((resolve) => {
			const check = () => {
				if (checkFn()) {
					resolve(true);
				} else if (errorCheckFn() || Date.now() - startTime > MAX_WAIT_TIME_MS) {
					resolve(false);
				} else {
					setTimeout(check, STATE_POLL_INTERVAL_MS);
				}
			};
			check();
		});
	}

	/**
	 * Execute JavaScript code
	 */
	private async executeJavaScript(code: string): Promise<void> {
		if (!this.jsExecutor) {
			this.addOutput('stderr', "L'executeur JavaScript n'est pas initialise");
			return;
		}

		// Wait for JS executor to be ready
		if (!this.jsExecutor.isReady) {
			const isReady = await this.waitForReady(
				() => this.jsExecutor?.isReady ?? false,
				() => this.jsExecutor?.hasError ?? false
			);

			if (!isReady) {
				this.addOutput('stderr', "L'executeur JavaScript n'a pas pu demarrer");
				return;
			}
		}

		this.state = 'executing';

		// Execute and wait for completion
		this.jsExecutor.execute(code);

		// Wait for execution to complete
		await this.waitForReady(
			() => !this.jsExecutor?.isExecuting,
			() => this.jsExecutor?.hasError ?? false
		);

		// Sync output from JS executor
		this.syncJsOutput();

		// Update state
		this.state = 'ready';
		this.executionTime = this.jsExecutor.executionTime;
		this.errorLine = this.jsExecutor.errorLine;
	}

	/**
	 * Sync output from JS executor to unified output
	 */
	private syncJsOutput(): void {
		if (!this.jsExecutor) return;

		// Clear and rebuild output from JS executor
		const newOutput: OutputLine[] = [];

		if (this.jsExecutor.stdout) {
			const lines = this.jsExecutor.stdout.split('\n');
			for (const line of lines) {
				newOutput.push({
					type: 'stdout',
					text: line,
					timestamp: Date.now()
				});
			}
		}

		if (this.jsExecutor.stderr) {
			newOutput.push({
				type: 'stderr',
				text: this.jsExecutor.stderr,
				timestamp: Date.now()
			});
		}

		this.output = newOutput;
	}

	/**
	 * Execute Python code
	 */
	private async executePython(code: string): Promise<void> {
		// Lazy load Python executor if not already loaded
		if (!this.pythonExecutor) {
			await this.loadPythonExecutor();
		}

		if (!this.pythonExecutor) {
			this.addOutput('stderr', "L'executeur Python n'est pas disponible");
			return;
		}

		// Wait for Python to be ready
		if (!this.pythonExecutor.isReady) {
			this.state = 'loading-python';

			const isReady = await this.waitForReady(
				() => this.pythonExecutor?.isReady ?? false,
				() => this.pythonExecutor?.hasError ?? false
			);

			if (!isReady) {
				this.addOutput('stderr', "Python n'a pas pu demarrer");
				this.state = 'error';
				return;
			}
		}

		this.state = 'executing';

		// Execute and wait for completion
		this.pythonExecutor.execute(code);

		// Wait for execution to complete
		await this.waitForReady(
			() => !this.pythonExecutor?.isExecuting,
			() => false // Don't treat Python errors as fatal
		);

		// Sync output from Python executor
		this.syncPythonOutput();

		// Update state
		this.state = 'ready';
		this.executionTime = this.pythonExecutor.executionTime;
		this.errorLine = this.pythonExecutor.errorLine;
	}

	/**
	 * Sync output from Python executor to unified output
	 */
	private syncPythonOutput(): void {
		if (!this.pythonExecutor) return;

		// Clear and rebuild output from Python executor
		const newOutput: OutputLine[] = [];

		if (this.pythonExecutor.stdout) {
			const lines = this.pythonExecutor.stdout.split('\n');
			for (const line of lines) {
				if (line) {
					// Skip empty lines
					newOutput.push({
						type: 'stdout',
						text: line,
						timestamp: Date.now()
					});
				}
			}
		}

		if (this.pythonExecutor.stderr) {
			newOutput.push({
				type: 'stderr',
				text: this.pythonExecutor.stderr,
				timestamp: Date.now()
			});
		}

		this.output = newOutput;
	}

	/**
	 * Cancel the current execution.
	 */
	cancel(): void {
		if (this.language === 'javascript' && this.jsExecutor) {
			this.jsExecutor.cancel();
		} else if (this.language === 'python' && this.pythonExecutor) {
			this.pythonExecutor.cancel();
		}
		this.state = 'ready';
	}

	/**
	 * Clear all output.
	 */
	clearOutput(): void {
		this.output = [];
		this.errorLine = null;
		this.executionTime = 0;

		if (this.jsExecutor) {
			this.jsExecutor.clearOutput();
		}

		if (this.pythonExecutor) {
			this.pythonExecutor.clearOutput();
		}
	}

	/**
	 * Add an output line.
	 *
	 * @param type - Output type
	 * @param text - Output text
	 */
	addOutput(type: 'stdout' | 'stderr' | 'info', text: string): void {
		this.output.push({
			type,
			text,
			timestamp: Date.now()
		});
	}

	// ===========================================================================
	// Language Management
	// ===========================================================================

	/**
	 * Set the current language.
	 * Triggers Python loading if switching to Python for the first time.
	 *
	 * @param language - The target language
	 */
	async setLanguage(language: ExecutionLanguage): Promise<void> {
		this.language = language;

		// Pre-load Python if switching to it
		if (language === 'python' && !this.pythonExecutor) {
			await this.loadPythonExecutor();
		}
	}

	// ===========================================================================
	// State Accessors
	// ===========================================================================

	/**
	 * Get the current language's executor.
	 */
	getCurrentExecutor(): JsExecutor | PlaygroundExecutorType | null {
		return this.language === 'javascript' ? this.jsExecutor : this.pythonExecutor;
	}

	/**
	 * Check if a specific language is ready.
	 */
	isLanguageReady(language: ExecutionLanguage): boolean {
		if (language === 'javascript') {
			return this.jsExecutor?.isReady ?? false;
		} else {
			return this.pythonExecutor?.isReady ?? false;
		}
	}

	/**
	 * Check if Python is available (loaded and ready).
	 */
	isPythonAvailable(): boolean {
		return this.pythonExecutor?.isReady ?? false;
	}
}
