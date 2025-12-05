/**
 * Shared Python Module Types
 *
 * Type definitions for communication between the main thread
 * and the Pyodide Web Worker, supporting both playground (isolated)
 * and notebook (persistent) execution contexts.
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

// =============================================================================
// Context Management Types
// =============================================================================

/**
 * Execution context type
 * - 'playground': Isolated execution, state reset between runs
 * - 'notebook': Persistent execution, state preserved across cells
 */
export type ExecutionContextType = 'playground' | 'notebook';

/**
 * Execution context configuration
 */
export interface ExecutionContext {
	id: string;
	type: ExecutionContextType;
	persistent: boolean;
	createdAt: number;
}

// =============================================================================
// Validation Types
// =============================================================================

/**
 * Validation rule severity levels
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Individual validation issue
 */
export interface ValidationIssue {
	line: number;
	column: number;
	endLine?: number;
	endColumn?: number;
	message: string;
	severity: ValidationSeverity;
	rule: string;
}

/**
 * Configuration for code validation
 */
export interface ValidationConfig {
	/** Check for syntax errors */
	checkSyntax: boolean;
	/** Check for undefined variables */
	checkUndefined: boolean;
	/** Check for unused imports */
	checkUnusedImports: boolean;
	/** Maximum allowed code length in characters */
	maxCodeLength: number;
	/** Maximum allowed line count */
	maxLines: number;
	/** Custom forbidden patterns (regex strings) */
	forbiddenPatterns?: string[];
}

/**
 * Result of code validation
 */
export interface ValidationResult {
	valid: boolean;
	issues: ValidationIssue[];
	/** Parsed AST available for further analysis */
	hasAst: boolean;
}

// =============================================================================
// Messages: Main Thread -> Worker (Extended)
// =============================================================================

/**
 * Message to initialize Pyodide and load packages
 */
export interface InitMessage {
	type: 'init';
}

/**
 * Message to execute Python code
 * Extended with optional contextId for multi-context support
 */
export interface ExecuteMessage {
	type: 'execute';
	code: string;
	id: string;
	/** Optional context ID for persistent execution (notebook mode) */
	contextId?: string;
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
	/** Optional context ID for context-aware completions */
	contextId?: string;
}

/**
 * Message to create a new execution context
 */
export interface CreateContextMessage {
	type: 'create-context';
	contextId: string;
	persistent: boolean;
}

/**
 * Message to destroy an execution context
 */
export interface DestroyContextMessage {
	type: 'destroy-context';
	contextId: string;
}

/**
 * Message to reset a context (clear variables but keep context)
 */
export interface ResetContextMessage {
	type: 'reset-context';
	contextId: string;
}

/**
 * Message to validate Python code without executing
 */
export interface ValidateMessage {
	type: 'validate';
	code: string;
	config: ValidationConfig;
	id: string;
}

/**
 * Union type for all messages sent to the worker
 */
export type ToWorkerMessage =
	| InitMessage
	| ExecuteMessage
	| CancelMessage
	| AutocompleteMessage
	| CreateContextMessage
	| DestroyContextMessage
	| ResetContextMessage
	| ValidateMessage;

// =============================================================================
// Messages: Worker -> Main Thread (Extended)
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
 * Interface for objects that can provide Python autocompletion.
 * Implemented by executors (PlaygroundExecutor, NotebookExecutor) and stores.
 */
export interface CompletionProvider {
	/**
	 * Request Python autocompletion for code at cursor position.
	 * @param code - Full Python code
	 * @param cursor - Cursor position (character offset)
	 * @returns Promise resolving to completion items
	 */
	requestCompletion: (code: string, cursor: number) => Promise<CompletionItem[]>;
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
 * Packages are being loaded asynchronously (lazy loading)
 */
export interface PackagesLoadingMessage {
	type: 'packages-loading';
	packages: string[];
	id: string;
}

/**
 * Packages have been loaded successfully (lazy loading)
 */
export interface PackagesLoadedMessage {
	type: 'packages-loaded';
	packages: string[];
	id: string;
}

/**
 * Plotly visualization output as JSON specification
 */
export interface PlotlyMessage {
	type: 'plotly';
	jsonSpec: string;
	id: string;
}

/**
 * Context created successfully
 */
export interface ContextCreatedMessage {
	type: 'context-created';
	contextId: string;
}

/**
 * Context destroyed successfully
 */
export interface ContextDestroyedMessage {
	type: 'context-destroyed';
	contextId: string;
}

/**
 * Context reset successfully
 */
export interface ContextResetMessage {
	type: 'context-reset';
	contextId: string;
}

/**
 * Validation result from Python code validation
 */
export interface ValidationResultMessage {
	type: 'validation-result';
	result: ValidationResult;
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
	| AutocompleteResultMessage
	| PackagesLoadingMessage
	| PackagesLoadedMessage
	| PlotlyMessage
	| ContextCreatedMessage
	| ContextDestroyedMessage
	| ContextResetMessage
	| ValidationResultMessage;

// =============================================================================
// Pyodide Types (for worker internal use)
// =============================================================================

/**
 * Pyodide interface for the worker
 * Based on Pyodide v0.26.2 API
 */
export interface PyodideInterface {
	loadPackage(
		packages: string[],
		options?: { messageCallback?: (msg: string) => void }
	): Promise<void>;
	/** Load packages detected from import statements in code (lazy loading) */
	loadPackagesFromImports(
		code: string,
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
// Loading Stage Index
// =============================================================================

/**
 * Loading stage indices for type safety (lazy loading mode)
 */
export enum LoadingStageIndex {
	INITIALIZING = 0,
	DOWNLOADING_PYTHON = 1,
	READY = 2
}
