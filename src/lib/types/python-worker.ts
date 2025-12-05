/**
 * Python Worker Message Types
 *
 * Type definitions for communication between the main thread
 * and the Pyodide Web Worker.
 */

// =============================================================================
// Loading Stages
// =============================================================================

/**
 * Loading stage descriptor for progress reporting
 */
export interface LoadingStage {
	percent: number;
	stage: string;
}

/**
 * Predefined loading stages for Pyodide initialization
 */
export const LOADING_STAGES: readonly LoadingStage[] = [
	{ percent: 0, stage: 'Initialisation...' },
	{ percent: 20, stage: 'Téléchargement de Python...' },
	{ percent: 50, stage: 'Chargement de NumPy...' },
	{ percent: 70, stage: 'Chargement de Matplotlib...' },
	{ percent: 90, stage: 'Chargement de SymPy...' },
	{ percent: 100, stage: 'Prêt !' }
] as const;

// =============================================================================
// Messages: Main Thread -> Worker
// =============================================================================

/**
 * Message to initialize Pyodide and load packages
 */
export interface InitMessage {
	type: 'init';
}

/**
 * Message to execute Python code
 */
export interface ExecuteMessage {
	type: 'execute';
	code: string;
	id: string;
}

/**
 * Message to cancel a running execution
 */
export interface CancelMessage {
	type: 'cancel';
	id: string;
}

/**
 * Message to request autocompletion suggestions
 */
export interface AutocompleteMessage {
	type: 'autocomplete';
	code: string;
	cursor: number;
	id: string;
}

/**
 * Union type for all messages sent to the worker
 */
export type ToWorkerMessage = InitMessage | ExecuteMessage | CancelMessage | AutocompleteMessage;

// =============================================================================
// Messages: Worker -> Main Thread
// =============================================================================

/**
 * Progress update during Pyodide loading
 */
export interface LoadingProgressMessage {
	type: 'loading-progress';
	percent: number;
	stage: string;
}

/**
 * Pyodide is ready for code execution
 */
export interface PyodideReadyMessage {
	type: 'pyodide-ready';
}

/**
 * Standard output from Python execution
 */
export interface StdoutMessage {
	type: 'stdout';
	data: string;
	id: string;
}

/**
 * Standard error from Python execution
 */
export interface StderrMessage {
	type: 'stderr';
	data: string;
	id: string;
}

/**
 * Matplotlib plot output as base64 PNG
 */
export interface PlotMessage {
	type: 'plot';
	imageData: string;
	id: string;
}

/**
 * Python execution error with optional line number
 */
export interface ErrorMessage {
	type: 'error';
	message: string;
	line?: number;
	id: string;
}

/**
 * Code execution completed successfully
 */
export interface CompleteMessage {
	type: 'complete';
	id: string;
	duration: number;
}

/**
 * Code execution timed out
 */
export interface TimeoutMessage {
	type: 'timeout';
	id: string;
}

/**
 * LaTeX output from sympy expressions
 */
export interface LatexMessage {
	type: 'latex';
	latex: string;
	id: string;
}

/**
 * Completion item from Python autocompletion
 */
export interface CompletionItem {
	label: string;
	type: 'function' | 'variable' | 'module' | 'class' | 'property' | 'keyword';
}

/**
 * Autocompletion result from Python
 */
export interface AutocompleteResultMessage {
	type: 'autocomplete-result';
	completions: CompletionItem[];
	id: string;
}

/**
 * Union type for all messages sent from the worker
 */
export type FromWorkerMessage =
	| LoadingProgressMessage
	| PyodideReadyMessage
	| StdoutMessage
	| StderrMessage
	| PlotMessage
	| ErrorMessage
	| CompleteMessage
	| TimeoutMessage
	| LatexMessage
	| AutocompleteResultMessage;

// =============================================================================
// Pyodide Types (for worker internal use)
// =============================================================================

/**
 * Pyodide interface for the worker
 * Based on Pyodide v0.25.0 API
 */
export interface PyodideInterface {
	loadPackage(
		packages: string[],
		options?: { messageCallback?: (msg: string) => void }
	): Promise<void>;
	runPythonAsync(code: string): Promise<unknown>;
	runPython(code: string): unknown;
	globals: PyProxy;
	FS: {
		writeFile(path: string, data: string | Uint8Array): void;
		readFile(path: string, options?: { encoding: string }): string | Uint8Array;
	};
}

/**
 * PyProxy for accessing Python objects from JavaScript
 */
export interface PyProxy {
	get(name: string): unknown;
	set(name: string, value: unknown): void;
	toJs(): unknown;
}

/**
 * Options for loadPyodide function
 */
export interface LoadPyodideOptions {
	indexURL?: string;
	fullStdLib?: boolean;
}

/**
 * Global loadPyodide function type
 */
export type LoadPyodideFunc = (options?: LoadPyodideOptions) => Promise<PyodideInterface>;

// =============================================================================
// Configuration
// =============================================================================

/**
 * Loading stage indices for type safety
 */
export enum LoadingStageIndex {
	INITIALIZING = 0,
	DOWNLOADING_PYTHON = 1,
	LOADING_NUMPY = 2,
	LOADING_MATPLOTLIB = 3,
	LOADING_SYMPY = 4,
	READY = 5
}

/**
 * Pyodide CDN configuration
 */
export const PYODIDE_CONFIG = {
	/** CDN URL for Pyodide v0.26.2 (stable, tested with this project) */
	CDN_URL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
	/** Packages to preload */
	PACKAGES: ['numpy', 'matplotlib', 'sympy'] as const,
	/** Execution timeout in milliseconds (30 seconds) */
	TIMEOUT_MS: 30000
} as const;
