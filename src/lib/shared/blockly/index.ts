/**
 * Shared Blockly Module
 *
 * Central export point for Blockly types and configuration.
 */

// Export all types
export type {
	ExecutorState,
	ExecutionLanguage,
	LoadingStage,
	OutputLineType,
	OutputLine,
	BlocklyWorkspaceState,
	CodeGenerationResult,
	ExecutionContext,
	WorkspaceOptions
} from './types';

export { LoadingStageIndex } from './types';

// Export all configuration
export {
	BLOCKLY_CONFIG,
	LOADING_STAGES,
	DEFAULT_WORKSPACE_OPTIONS,
	ERROR_MESSAGES,
	CODE_TEMPLATES,
	DISPLAY_CONFIG
} from './config';

// Export toolbox definitions
export { STANDARD_TOOLBOX, type ToolboxDefinition } from './toolbox/standard';

// Export code generation
export {
	generateCode,
	generateCodeFromXml,
	getRawCode,
	countExecutableBlocks,
	wrapJavaScriptCode,
	wrapPythonCode,
	detectJsInfiniteLoops,
	detectPyInfiniteLoops,
	validateJsCodeLength,
	validatePyCodeLength,
	JS_MATH_HELPERS,
	PYTHON_IMPORTS,
	PYTHON_MATH_HELPERS
} from './generators/index';

// Export worker message schemas and types
export {
	// Schemas
	toWorkerMessageSchema as jsSandboxToWorkerMessageSchema,
	fromWorkerMessageSchema as jsSandboxFromWorkerMessageSchema,
	executeMessageSchema as jsSandboxExecuteMessageSchema,
	cancelMessageSchema as jsSandboxCancelMessageSchema,
	// Types
	type ToWorkerMessage as JsSandboxToWorkerMessage,
	type FromWorkerMessage as JsSandboxFromWorkerMessage,
	type ExecuteMessage as JsSandboxExecuteMessage,
	type CancelMessage as JsSandboxCancelMessage,
	type ReadyMessage as JsSandboxReadyMessage,
	type StdoutMessage as JsSandboxStdoutMessage,
	type StderrMessage as JsSandboxStderrMessage,
	type ErrorMessage as JsSandboxErrorMessage,
	type CompleteMessage as JsSandboxCompleteMessage,
	type TimeoutMessage as JsSandboxTimeoutMessage
} from './worker/messages';

// Export execution module
export {
	JsExecutor,
	BlocklyExecutor,
	type BlocklyExecutorState,
	type JsExecutorState,
	type ToJsWorkerMessage,
	type FromJsWorkerMessage,
	type JsExecutionContext,
	DEFAULT_JS_EXECUTION_CONTEXT
} from './execution';
