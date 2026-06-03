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
// Exercise Validation Types
// =============================================================================

/**
 * Output comparison strategy — discriminated union of three intents.
 */
export interface ExactComparison {
	kind: 'exact';
}

export interface TextComparison {
	kind: 'text';
	whitespace: 'strict' | 'collapsed' | 'lines';
	case_insensitive?: boolean;
	trim_trailing_newline?: boolean;
}

export interface NumericComparison {
	kind: 'numeric';
	shape: 'flat' | 'lines' | 'grid';
	eps_abs: number;
	eps_rel: number;
	non_numeric?: 'match' | 'ignore';
	accept_comma_decimal?: boolean;
}

/** Custom Python comparator (special-judge style). */
export interface CustomComparison {
	kind: 'custom';
	code: string;
	timeout_ms?: number;
}

export type OutputComparison =
	| ExactComparison
	| TextComparison
	| NumericComparison
	| CustomComparison;

/**
 * Output test case
 */
export interface OutputTestCase {
	input: string;
	expected_output: string;
	/** Optional per-case override of the global comparison strategy. */
	comparison?: OutputComparison;
	/** When true, the worker redacts input/expected/actual/diff from the result. */
	hidden?: boolean;
}

/**
 * Unit test case
 */
export interface UnitTestCase {
	args: unknown[];
	expected: unknown;
	/** When true, the worker redacts args/expected/actual from the result. */
	hidden?: boolean;
}

/**
 * AST requirement types
 */
export type ASTRequirementType =
	| 'uses_loop'
	| 'uses_recursion'
	| 'defines_function'
	| 'defines_class'
	| 'uses_list_comprehension'
	| 'no_global_variables'
	| 'no_print'
	| 'uses_import';

/**
 * AST requirement
 */
export interface ASTRequirement {
	type: ASTRequirementType;
	name?: string;
	message: string;
}

/**
 * Test case result
 */
export interface TestCaseResult {
	passed: boolean;
	input?: string;
	expected?: string;
	actual?: string;
	/** Human-readable explanation when `passed === false`. Localised in French. */
	diff?: string;
	error?: string;
	/** True when the source test case had `hidden: true` — sensitive fields are redacted. */
	hidden?: boolean;
}

// =============================================================================
// ValidationConfig — orthogonal AST checks + behavior layer
//
// NOTE: these types are mirrored in `src/lib/types/python-exercises.ts`
// (`BehaviorCheck`, `ValidationConfig`, `ValidationResult`). The duplication
// exists because `shared/python/types.ts` must stay free of server-only
// imports for the worker bundle. Keep both files in sync.
// =============================================================================

/**
 * Behavior check — discriminated union on `kind`.
 * Defines what runtime behavior is verified on submitted code.
 */
/**
 * Numeric tolerance for unit_test float comparisons. See UnitTestTolerance
 * in $lib/types/python-exercises.ts for the full doc — kept in sync here
 * to avoid pulling server-only types into the worker bundle.
 */
export interface UnitTestTolerance {
	eps_abs: number;
	eps_rel: number;
}

export type BehaviorCheck =
	| {
			kind: 'output';
			test_cases: OutputTestCase[];
			comparison: OutputComparison;
	  }
	| {
			kind: 'unit_test';
			function_name: string;
			test_cases: UnitTestCase[];
			tolerance?: UnitTestTolerance;
	  }
	| {
			kind: 'assert';
			/**
			 * Python code containing one or more `assert` statements (or any
			 * code that raises on failure). Executed against the resolved
			 * namespace (persistent context for notebook checkpoints, fresh
			 * dict for exercise mode). A bare exception → `failed`; clean
			 * execution → `passed`.
			 */
			code: string;
	  }
	| {
			kind: 'variable_check';
			/**
			 * Map of variable name → expected value. After the student's code is
			 * executed in a fresh namespace, each named variable is looked up
			 * and compared against the expected value via the recursive engine
			 * in `validation/variable-compare.ts`. Type-strict for scalars
			 * (`True ≠ 1`, `"5" ≠ 5`); tuple ≡ list at the JSON boundary.
			 */
			expected_vars: Record<string, unknown>;
			tolerance?: UnitTestTolerance;
	  }
	| {
			kind: 'reference_solution';
			/**
			 * Differential testing: the teacher provides a hidden reference
			 * implementation; the worker compares the student's function
			 * against it on a mix of fixed cases (teacher-curated sentinels)
			 * and randomly-generated cases (broad coverage). At least one of
			 * `fixed` or `generator` must be present.
			 */
			function_name: string;
			reference_code: string;
			fixed?: { cases: UnitTestCase[] };
			generator?: {
				code: string;
				count: number;
				seed: number;
			};
			tolerance?: UnitTestTolerance;
	  };

/**
 * Exercise validation config — orthogonal AST checks + behavior layer.
 * At least one of `ast_requirements` (non-empty) and `behavior` must be present.
 */
export interface ExerciseValidationConfig {
	ast_requirements?: ASTRequirement[];
	behavior?: BehaviorCheck;
	timeout_ms?: number;
}

/**
 * Result of running the validation pipeline.
 * `failed_layer` indicates which orthogonal axis failed (or null on success).
 * `behavior_kind` is set whenever a behavior was configured (succeeded or not).
 */
export interface ExerciseValidationResult {
	valid: boolean;
	failed_layer: 'ast' | 'behavior' | null;
	behavior_kind?: 'output' | 'unit_test' | 'assert' | 'variable_check' | 'reference_solution';
	ast_issues?: string[];
	test_results: TestCaseResult[];
	error?: string;
	execution_time_ms: number;
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
 * Message to validate Python exercise code with various strategies.
 *
 * `contextId` is **optional** and changes the validation semantics:
 *
 * - **omitted** (exercise mode): the worker creates a fresh `dict()`, execs
 *   `code` into it, then runs the behavior against that fresh namespace.
 * - **provided** (notebook checkpoint mode): the worker resolves the existing
 *   persistent namespace via `getContextNamespace(contextId)`. `code` is the
 *   *test* code (e.g. assertion body, or no-op for `unit_test`/`variable_check`
 *   which don't need any pre-exec). The behavior runs against the
 *   already-populated namespace — i.e. against the variables/functions the
 *   student defined in the previous cells.
 */
export interface ValidateExerciseMessage {
	type: 'validate-exercise';
	code: string;
	config: ExerciseValidationConfig;
	id: string;
	/** Optional context ID for notebook checkpoints (persistent namespace lookup). */
	contextId?: string;
}

// =============================================================================
// Debug Messages: Main Thread -> Worker
// =============================================================================

/**
 * Worker breakpoint format (without id)
 */
export interface WorkerBreakpoint {
	lineNumber: number;
	enabled: boolean;
	condition?: string;
}

/**
 * Start a debug session with code and breakpoints
 */
export interface DebugStartMessage {
	type: 'debug-start';
	code: string;
	id: string;
	breakpoints: WorkerBreakpoint[];
}

/**
 * Send a step command during debug session
 */
export interface DebugStepMessage {
	type: 'debug-step';
	id: string;
	action: import('./debug/types').DebugStepAction;
}

/**
 * Stop the current debug session
 */
export interface DebugStopMessage {
	type: 'debug-stop';
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
	| ValidateMessage
	| ValidateExerciseMessage
	| DebugStartMessage
	| DebugStepMessage
	| DebugStopMessage;

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
 * Exercise validation result from Python code validation
 */
export interface ExerciseValidationResultMessage {
	type: 'validation-exercise-result';
	result: ExerciseValidationResult;
	id: string;
}

// =============================================================================
// Debug Messages: Worker -> Main Thread
// =============================================================================

/**
 * Debug snapshot message - sent when execution pauses
 */
export interface DebugSnapshotMessage {
	type: 'debug-snapshot';
	id: string;
	snapshot: import('./debug/types').DebugSnapshot;
}

/**
 * Debug paused message - indicates why execution paused
 */
export interface DebugPausedMessage {
	type: 'debug-paused';
	id: string;
	reason: import('./debug/types').DebugPauseReason;
}

/**
 * Debug finished message - sent when debug session completes
 */
export interface DebugFinishedMessage {
	type: 'debug-finished';
	id: string;
	duration: number;
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
	| ValidationResultMessage
	| ExerciseValidationResultMessage
	| DebugSnapshotMessage
	| DebugPausedMessage
	| DebugFinishedMessage;

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
	runPythonAsync(
		code: string,
		options?: { globals?: PyProxy; locals?: PyProxy; filename?: string }
	): Promise<unknown>;
	runPython(
		code: string,
		options?: { globals?: PyProxy; locals?: PyProxy; filename?: string }
	): unknown;
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
	/** Delete a key from the Python dict/namespace */
	delete(name: string): void;
	/** Destroy the proxy and free memory */
	destroy(): void;
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
