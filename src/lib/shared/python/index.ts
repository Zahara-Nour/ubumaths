/**
 * Shared Python Module - Public API
 *
 * This module provides shared types, configuration, and validation schemas
 * for Python execution in both playground (isolated) and notebook (persistent) modes.
 *
 * @example
 * ```typescript
 * import {
 *   // Types
 *   type ExecuteMessage,
 *   type ValidationConfig,
 *   type NotebookCell,
 *
 *   // Config
 *   PYODIDE_CONFIG,
 *   LOADING_STAGES,
 *
 *   // Schemas
 *   executeCodeRequestSchema,
 *   validationConfigSchema
 * } from '$lib/shared/python';
 * ```
 */

// =============================================================================
// Types - Core message types and interfaces
// =============================================================================

export type {
	// Loading
	LoadingStage,

	// Context
	ExecutionContextType,
	ExecutionContext,

	// Validation types
	ValidationSeverity,
	ValidationIssue,
	ValidationConfig,
	ValidationResult,

	// Messages to worker
	InitMessage,
	ExecuteMessage,
	CancelMessage,
	AutocompleteMessage,
	CreateContextMessage,
	DestroyContextMessage,
	ResetContextMessage,
	ValidateMessage,
	ToWorkerMessage,

	// Messages from worker
	LoadingProgressMessage,
	PyodideReadyMessage,
	StdoutMessage,
	StderrMessage,
	PlotMessage,
	ErrorMessage,
	CompleteMessage,
	TimeoutMessage,
	LatexMessage,
	CompletionItem,
	AutocompleteResultMessage,
	PackagesLoadingMessage,
	PackagesLoadedMessage,
	PlotlyMessage,
	ContextCreatedMessage,
	ContextDestroyedMessage,
	ContextResetMessage,
	ValidationResultMessage,
	FromWorkerMessage,

	// Pyodide types
	PyodideInterface,
	PyProxy,
	LoadPyodideOptions,
	LoadPyodideFunc
} from './types';

// Re-export LoadingStageIndex enum (not just type)
export { LoadingStageIndex } from './types';

// =============================================================================
// Execution Types
// =============================================================================

export type {
	// Execution state
	ExecutionStatus,
	OutputType,
	OutputItem,
	ExecutionResult,
	ExecutionRequest,

	// Context state
	ContextVariable,
	ContextState,
	ContextEvent,
	ContextEventPayload,

	// Notebook types
	CellType,
	CellExecutionState,
	NotebookCell,
	NotebookMetadata,
	Notebook,

	// Queue types
	QueuedExecution,
	ExecutionQueueState,

	// Event types
	ExecutionEventType,
	ExecutionEvent,
	ExecutionEventHandler
} from './execution/types';

// =============================================================================
// Executor Classes
// =============================================================================

export { BasePythonExecutor, type ExecutorState } from './execution/base-executor.svelte';
export { PlaygroundExecutor } from './execution/playground-executor.svelte';

// =============================================================================
// Configuration
// =============================================================================

export {
	PYODIDE_CONFIG,
	LOADING_STAGES,
	CONTEXT_CONFIG,
	DEFAULT_VALIDATION_CONFIG,
	ERROR_MESSAGES
} from './config';

// =============================================================================
// Worker Message Schemas (for runtime validation)
// =============================================================================

export {
	// Base schemas
	executionIdSchema as workerExecutionIdSchema,
	contextIdSchema as workerContextIdSchema,
	codeSchema as workerCodeSchema,

	// To worker message schemas
	initMessageSchema,
	executeMessageSchema,
	cancelMessageSchema,
	autocompleteMessageSchema,
	createContextMessageSchema,
	destroyContextMessageSchema,
	resetContextMessageSchema,
	validateMessageSchema,
	toWorkerMessageSchema,

	// From worker message schemas
	loadingProgressMessageSchema,
	pyodideReadyMessageSchema,
	stdoutMessageSchema,
	stderrMessageSchema,
	plotMessageSchema,
	errorMessageSchema,
	completeMessageSchema,
	timeoutMessageSchema,
	latexMessageSchema,
	autocompleteResultMessageSchema,
	packagesLoadingMessageSchema,
	packagesLoadedMessageSchema,
	plotlyMessageSchema,
	contextCreatedMessageSchema,
	contextDestroyedMessageSchema,
	contextResetMessageSchema,
	validationResultMessageSchema,
	fromWorkerMessageSchema,

	// Validation schemas
	validationConfigSchema as workerValidationConfigSchema,
	validationIssueSchema as workerValidationIssueSchema,
	validationResultSchema as workerValidationResultSchema
} from './worker/messages';

// =============================================================================
// Validation Schemas (for API/form validation)
// =============================================================================

export {
	// Code schemas
	pythonCodeSchema,
	optionalPythonCodeSchema,

	// Context schemas
	contextIdSchema,
	contextTypeSchema,
	createContextRequestSchema,

	// Execution schemas
	executionIdSchema,
	executeCodeRequestSchema,
	executionStatusSchema,

	// Notebook schemas
	cellIdSchema,
	cellTypeSchema,
	notebookCellSchema,
	notebookMetadataSchema,
	createNotebookRequestSchema,
	updateNotebookRequestSchema,

	// Validation schemas
	validationSeveritySchema,
	validationConfigSchema,
	validationIssueSchema,
	validationResultSchema,
	validateCodeRequestSchema,

	// Output schemas
	outputTypeSchema,
	outputItemSchema,
	executionResultSchema
} from './validation/schemas';

// Re-export inferred types from validation schemas
export type {
	PythonCode,
	ContextId,
	ContextType,
	CreateContextRequest,
	ExecuteCodeRequest,
	CellId,
	ValidateCodeRequest
} from './validation/schemas';
