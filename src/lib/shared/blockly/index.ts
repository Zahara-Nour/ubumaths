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
