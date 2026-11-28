/**
 * Blockly Code Generation Module
 *
 * Main generator module that generates JavaScript and Python code from Blockly workspaces.
 * Supports code validation, wrapping, and error detection.
 */

import type * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { pythonGenerator } from 'blockly/python';
import type { ExecutionLanguage, CodeGenerationResult } from '../types';
import { BLOCKLY_CONFIG, ERROR_MESSAGES } from '../config';
import {
	installerGenerateursChiphre,
	wrapJavaScriptCode,
	detectInfiniteLoops as detectJsInfiniteLoops,
	validateCodeLength as validateJsCodeLength
} from './javascript';
import {
	wrapPythonCode,
	detectInfiniteLoops as detectPyInfiniteLoops,
	validateCodeLength as validatePyCodeLength
} from './python';

// =============================================================================
// Main Code Generation Function
// =============================================================================

/**
 * Generate code from a Blockly workspace.
 *
 * This function:
 * 1. Validates the workspace has blocks
 * 2. Generates raw code using Blockly's built-in generators
 * 3. Wraps the code with language-specific helpers
 * 4. Performs safety checks (length, infinite loops)
 * 5. Returns a structured result with metadata
 *
 * @param workspace - Blockly workspace to generate code from
 * @param language - Target language ('javascript' or 'python')
 * @returns CodeGenerationResult with generated code and metadata
 *
 * @example
 * ```typescript
 * const result = generateCode(workspace, 'javascript');
 * if (result.success) {
 *   console.log('Generated:', result.code);
 * } else {
 *   console.error('Error:', result.error);
 * }
 * ```
 */
export function generateCode(
	workspace: Blockly.WorkspaceSvg,
	language: ExecutionLanguage
): CodeGenerationResult {
	installerGenerateursChiphre();
	try {
		// Validate language
		if (language !== 'javascript' && language !== 'python') {
			return {
				code: '',
				language,
				success: false,
				error: ERROR_MESSAGES.INVALID_LANGUAGE,
				blockCount: 0
			};
		}

		// Count blocks in workspace
		const blockCount = workspace.getAllBlocks(false).length;

		// Handle empty workspace
		if (blockCount === 0) {
			return {
				code: '',
				language,
				success: true,
				blockCount: 0,
				warnings: ["Aucun bloc dans l'espace de travail"]
			};
		}

		// Generate raw code using Blockly's generators
		let rawCode: string;
		const warnings: string[] = [];

		if (language === 'javascript') {
			rawCode = javascriptGenerator.workspaceToCode(workspace);
		} else {
			rawCode = pythonGenerator.workspaceToCode(workspace);
		}

		// Handle empty code generation (disconnected blocks)
		if (!rawCode || rawCode.trim().length === 0) {
			return {
				code: '',
				language,
				success: true,
				blockCount,
				warnings: ['Les blocs ne sont pas reliés ou ne génèrent pas de code']
			};
		}

		// Wrap code with language-specific helpers
		const wrappedCode =
			language === 'javascript' ? wrapJavaScriptCode(rawCode) : wrapPythonCode(rawCode);

		// Validate code length
		const isValidLength =
			language === 'javascript'
				? validateJsCodeLength(wrappedCode, BLOCKLY_CONFIG.MAX_CODE_LENGTH)
				: validatePyCodeLength(wrappedCode, BLOCKLY_CONFIG.MAX_CODE_LENGTH);

		if (!isValidLength) {
			return {
				code: '',
				language,
				success: false,
				error: ERROR_MESSAGES.CODE_TOO_LONG,
				blockCount
			};
		}

		// Detect potential infinite loops
		const hasInfiniteLoop =
			language === 'javascript' ? detectJsInfiniteLoops(rawCode) : detectPyInfiniteLoops(rawCode);

		if (hasInfiniteLoop) {
			warnings.push('Attention : boucle peut-être infinie');
		}

		// Return successful result
		return {
			code: wrappedCode,
			language,
			success: true,
			blockCount,
			hasInfiniteLoop,
			warnings: warnings.length > 0 ? warnings : undefined
		};
	} catch (error) {
		// Handle unexpected errors during generation
		return {
			code: '',
			language,
			success: false,
			error:
				error instanceof Error
					? `${ERROR_MESSAGES.CODE_GENERATION_FAILED}: ${error.message}`
					: ERROR_MESSAGES.CODE_GENERATION_FAILED,
			blockCount: 0
		};
	}
}

// =============================================================================
// Exports
// =============================================================================

// Re-export language-specific utilities
export {
	wrapJavaScriptCode,
	detectInfiniteLoops as detectJsInfiniteLoops,
	validateCodeLength as validateJsCodeLength,
	MATH_HELPERS as JS_MATH_HELPERS
} from './javascript';

export {
	wrapPythonCode,
	detectInfiniteLoops as detectPyInfiniteLoops,
	validateCodeLength as validatePyCodeLength
} from './python';
