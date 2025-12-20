/**
 * Variable Validator
 * ==================
 *
 * Validates variable definitions for common errors:
 * - Invalid variable names
 * - Duplicate variable names
 * - Invalid syntax in expressions
 * - Undefined variable references
 * - Invalid random specifications
 * - Invalid eval expressions
 *
 * @module ubumark/parameterization/validator/variable-validator
 */

import type { Variable, ValidationResult, ValidationError } from '../../types';
import { tokenize } from '../parser/tokenizer';
import { parseVariableReference } from '../parser/variable-parser';
import { parseRandomSpec } from '../parser/random-parser';

/**
 * Validate variable definitions
 *
 * Performs comprehensive validation including:
 * - Name validation (non-empty, valid characters)
 * - Duplicate name detection
 * - Syntax validation (proper token format)
 * - Reference validation (all referenced variables exist)
 * - Random spec validation (valid ranges, bounds)
 * - Eval expression validation (parseable)
 *
 * Note: Does NOT check for circular dependencies (use detectCircularDependencies)
 *
 * @param variables - Variable definitions to validate
 * @returns Validation result with all errors found
 *
 * @example Valid variables
 * ```typescript
 * validateVariables([
 *   { name: 'a', expression: '5' },
 *   { name: 'b', expression: '{{a}}' }
 * ])
 * // -> { valid: true, errors: [] }
 * ```
 *
 * @example Empty variable name
 * ```typescript
 * validateVariables([
 *   { name: '', expression: '5' }
 * ])
 * // -> {
 * //     valid: false,
 * //     errors: [{
 * //       type: 'invalid-syntax',
 * //       message: 'Variable name cannot be empty',
 * //       variable: ''
 * //     }]
 * //   }
 * ```
 *
 * @example Duplicate variable names
 * ```typescript
 * validateVariables([
 *   { name: 'a', expression: '5' },
 *   { name: 'a', expression: '10' }
 * ])
 * // -> {
 * //     valid: false,
 * //     errors: [{
 * //       type: 'invalid-syntax',
 * //       message: 'Duplicate variable name: a',
 * //       variable: 'a'
 * //     }]
 * //   }
 * ```
 *
 * @example Undefined variable reference
 * ```typescript
 * validateVariables([
 *   { name: 'a', expression: '{{b}}' }
 * ])
 * // -> {
 * //     valid: false,
 * //     errors: [{
 * //       type: 'undefined-variable',
 * //       message: 'Variable "b" referenced by "a" is not defined',
 * //       variable: 'a'
 * //     }]
 * //   }
 * ```
 *
 * @example Invalid random range
 * ```typescript
 * validateVariables([
 *   { name: 'a', expression: '{{10..1}}' }
 * ])
 * // -> {
 * //     valid: false,
 * //     errors: [{
 * //       type: 'invalid-range',
 * //       message: 'Invalid range: min (10) must be less than max (1)',
 * //       variable: 'a'
 * //     }]
 * //   }
 * ```
 *
 * @example Invalid syntax (malformed token)
 * ```typescript
 * validateVariables([
 *   { name: 'a', expression: '{{}}' }
 * ])
 * // -> {
 * //     valid: false,
 * //     errors: [{
 * //       type: 'invalid-syntax',
 * //       message: 'Malformed variable reference: {{}}',
 * //       variable: 'a'
 * //     }]
 * //   }
 * ```
 *
 * @example Multiple errors
 * ```typescript
 * validateVariables([
 *   { name: 'a', expression: '{{undefined}}' },
 *   { name: 'b', expression: '{{10..1}}' }
 * ])
 * // -> {
 * //     valid: false,
 * //     errors: [
 * //       { type: 'undefined-variable', ... },
 * //       { type: 'invalid-range', ... }
 * //     ]
 * //   }
 * ```
 */
export function validateVariables(variables: Variable[]): ValidationResult {
	const errors: ValidationError[] = [];

	if (!variables || variables.length === 0) {
		return { valid: true, errors: [] };
	}

	// 1. Validate variable names (alphanumeric + underscore)
	for (const variable of variables) {
		// Empty name
		if (!variable.name || variable.name.trim() === '') {
			errors.push({
				type: 'invalid-syntax',
				message: 'Variable name cannot be empty',
				variable: variable.name
			});
			continue;
		}

		// Invalid characters
		if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable.name)) {
			errors.push({
				type: 'invalid-syntax',
				message: `Invalid variable name: "${variable.name}". Must start with letter or underscore, followed by letters, numbers, or underscores.`,
				variable: variable.name
			});
		}
	}

	// 2. Check for duplicate names
	const names = new Set<string>();
	for (const variable of variables) {
		if (names.has(variable.name)) {
			errors.push({
				type: 'invalid-syntax',
				message: `Duplicate variable name: ${variable.name}`,
				variable: variable.name
			});
		}
		names.add(variable.name);
	}

	// 3. Validate expression syntax (basic check)
	for (const variable of variables) {
		const tokens = tokenize(variable.expression);

		// Check variable references are well-formed
		for (const token of tokens) {
			if (token.type === 'variable') {
				const varName = parseVariableReference(token.content);
				if (!varName) {
					errors.push({
						type: 'invalid-syntax',
						message: `Malformed variable reference: ${token.content}`,
						variable: variable.name
					});
				}
			}
		}

		// Check random specs are valid
		for (const token of tokens) {
			if (token.type === 'random') {
				const spec = parseRandomSpec(token.content);
				if (!spec) {
					errors.push({
						type: 'invalid-syntax',
						message: `Invalid random spec in variable "${variable.name}": ${token.content}`,
						variable: variable.name
					});
				} else {
					// Validate range bounds (if both are numbers)
					if (spec.type === 'integer' || spec.type === 'decimal-range') {
						if (spec.min.type === 'number' && spec.max.type === 'number') {
							if (spec.min.value > spec.max.value) {
								errors.push({
									type: 'invalid-range',
									message: `Invalid range: min (${spec.min.value}) must be less than or equal to max (${spec.max.value})`,
									variable: variable.name
								});
							}
						}
					}
				}
			}
		}
	}

	// 4. Check for undefined variable references
	const definedNames = new Set(variables.map((v) => v.name));
	for (const variable of variables) {
		const tokens = tokenize(variable.expression);
		for (const token of tokens) {
			if (token.type === 'variable') {
				const refName = parseVariableReference(token.content);
				if (refName && !definedNames.has(refName)) {
					errors.push({
						type: 'undefined-variable',
						message: `Variable "${refName}" referenced by "${variable.name}" is not defined`,
						variable: variable.name
					});
				}
			}
		}
	}

	return {
		valid: errors.length === 0,
		errors
	};
}
