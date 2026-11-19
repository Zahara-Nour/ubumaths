/**
 * Module Blockly partagé : point d'entrée des types et de la configuration.
 */

export type { ExecutionLanguage, CodeGenerationResult } from './types';

export { BLOCKLY_CONFIG, DEFAULT_WORKSPACE_OPTIONS, ERROR_MESSAGES, CHIPHRE_THEME } from './config';

export { STANDARD_TOOLBOX, type ToolboxDefinition } from './toolbox/standard';

export {
	generateCode,
	wrapJavaScriptCode,
	wrapPythonCode,
	detectJsInfiniteLoops,
	detectPyInfiniteLoops,
	validateJsCodeLength,
	validatePyCodeLength,
	JS_MATH_HELPERS
} from './generators/index';
