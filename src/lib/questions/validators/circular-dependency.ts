/**
 * Circular Dependency Detector
 * ============================
 *
 * Wrapper around shared library's circular dependency detection.
 * Maintains Questions-specific error format for backward compatibility.
 *
 * @module questions/validators/circular-dependency
 */

import type { QuestionVariable } from '../types';
import { detectCircularDependencies as sharedDetectCircular } from '$lib/shared/parameterization';

/**
 * Detect circular dependencies in variables
 *
 * Uses shared library implementation but converts to Questions error format.
 *
 * @param variables - Variable definitions
 * @returns Array of error messages (empty if no cycles)
 *
 * @example
 * ```typescript
 * // Valid: no cycles
 * const vars = [
 *   { name: 'a', expression: '{#:1-10}' },
 *   { name: 'b', expression: '{@:a} + 1' }
 * ];
 * detectCircularDependencies(vars);  // → []
 *
 * // Invalid: circular reference
 * const badVars = [
 *   { name: 'a', expression: '{@:b}' },
 *   { name: 'b', expression: '{@:a}' }
 * ];
 * detectCircularDependencies(badVars);  // → ["Circular reference detected: a -> b -> a"]
 * ```
 */
export function detectCircularDependencies(variables?: QuestionVariable[]): string[] {
	if (!variables || variables.length === 0) {
		return [];
	}

	// Use shared library detection
	const result = sharedDetectCircular(variables, 'questions');

	// Convert to Questions error format (array of strings)
	// Replace "Circular dependency" with "Circular reference" for backward compatibility
	if (!result.valid) {
		return result.errors.map((error) =>
			error.message.replace('Circular dependency', 'Circular reference')
		);
	}

	return [];
}

/**
 * Check if a variable directly or indirectly references itself
 *
 * Uses shared library for detection.
 *
 * @param varName - Variable name to check
 * @param variables - All variable definitions
 * @returns True if variable has circular reference
 */
export function hasCircularReference(varName: string, variables: QuestionVariable[]): boolean {
	// Use shared library to detect all cycles
	const result = sharedDetectCircular(variables, 'questions');

	if (!result.valid) {
		// Check if any error involves this variable
		return result.errors.some((error) => error.path && error.path.includes(varName));
	}

	return false;
}
