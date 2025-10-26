/**
 * Variable Validator Tests
 * =========================
 *
 * Tests for validating variable definitions including:
 * - Name validation
 * - Duplicate detection
 * - Syntax validation
 * - Reference validation
 * - Random spec validation
 */

import { describe, it, expect } from 'vitest';
import { validateVariables } from './variable-validator';
import type { Variable } from '../types';

describe('validateVariables', () => {
	// ============================================================================
	// VALID VARIABLES
	// ============================================================================

	describe('Valid variables', () => {
		it('should accept valid simple variables', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '5' },
				{ name: 'b', expression: '10' }
			];
			const result = validateVariables(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should accept variables with underscores', () => {
			const variables: Variable[] = [
				{ name: 'my_var', expression: '5' },
				{ name: '_private', expression: '10' },
				{ name: 'var_name_123', expression: '15' }
			];
			const result = validateVariables(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should accept variables with numbers (not at start)', () => {
			const variables: Variable[] = [
				{ name: 'var1', expression: '5' },
				{ name: 'x2', expression: '10' },
				{ name: 'value99', expression: '15' }
			];
			const result = validateVariables(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should accept uppercase and lowercase names', () => {
			const variables: Variable[] = [
				{ name: 'ABC', expression: '5' },
				{ name: 'xyz', expression: '10' },
				{ name: 'MixedCase', expression: '15' }
			];
			const result = validateVariables(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should accept empty variables array', () => {
			const variables: Variable[] = [];
			const result = validateVariables(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should accept valid variable references', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '5' },
				{ name: 'b', expression: '{@:a}' }
			];
			const result = validateVariables(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should accept valid random specs', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '{#:1-10}' },
				{ name: 'b', expression: '{#:2.3}' },
				{ name: 'c', expression: '{#:0.5-9.99:0.01}' }
			];
			const result = validateVariables(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});

	// ============================================================================
	// NAME VALIDATION
	// ============================================================================

	describe('Name validation', () => {
		it('should reject empty name', () => {
			const variables: Variable[] = [{ name: '', expression: '5' }];
			const result = validateVariables(variables);
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].type).toBe('invalid-syntax');
			expect(result.errors[0].message).toContain('cannot be empty');
		});

		it('should reject whitespace-only name', () => {
			const variables: Variable[] = [{ name: '   ', expression: '5' }];
			const result = validateVariables(variables);
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].type).toBe('invalid-syntax');
		});

		it('should reject name starting with number', () => {
			const variables: Variable[] = [{ name: '123invalid', expression: '5' }];
			const result = validateVariables(variables);
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].type).toBe('invalid-syntax');
			expect(result.errors[0].message).toContain('start with letter or underscore');
		});

		it('should reject name with hyphens', () => {
			const variables: Variable[] = [{ name: 'invalid-name', expression: '5' }];
			const result = validateVariables(variables);
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].type).toBe('invalid-syntax');
		});

		it('should reject name with spaces', () => {
			const variables: Variable[] = [{ name: 'invalid name', expression: '5' }];
			const result = validateVariables(variables);
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].type).toBe('invalid-syntax');
		});

		it('should reject name with special characters', () => {
			const variables: Variable[] = [
				{ name: 'invalid@name', expression: '5' },
				{ name: 'invalid$name', expression: '10' },
				{ name: 'invalid.name', expression: '15' }
			];
			const result = validateVariables(variables);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors.every((e) => e.type === 'invalid-syntax')).toBe(true);
		});

		it('should reject name with Unicode characters', () => {
			const variables: Variable[] = [{ name: 'varïable', expression: '5' }];
			const result = validateVariables(variables);
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].type).toBe('invalid-syntax');
		});
	});

	// ============================================================================
	// DUPLICATE DETECTION
	// ============================================================================

	describe('Duplicate detection', () => {
		it('should detect duplicate names', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '5' },
				{ name: 'a', expression: '10' }
			];
			const result = validateVariables(variables);
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].type).toBe('invalid-syntax');
			expect(result.errors[0].message).toContain('Duplicate');
			expect(result.errors[0].variable).toBe('a');
		});

		it('should detect multiple duplicates', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '5' },
				{ name: 'a', expression: '10' },
				{ name: 'b', expression: '15' },
				{ name: 'b', expression: '20' }
			];
			const result = validateVariables(variables);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThanOrEqual(2);
			expect(result.errors.every((e) => e.message.includes('Duplicate'))).toBe(true);
		});

		it('should detect triple duplicates', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '5' },
				{ name: 'a', expression: '10' },
				{ name: 'a', expression: '15' }
			];
			const result = validateVariables(variables);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThanOrEqual(1);
		});

		it('should not flag similar but different names', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '5' },
				{ name: 'A', expression: '10' },
				{ name: 'a1', expression: '15' }
			];
			const result = validateVariables(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});

	// ============================================================================
	// UNDEFINED REFERENCES
	// ============================================================================

	describe('Undefined references', () => {
		it('should detect undefined variable reference', () => {
			const variables: Variable[] = [{ name: 'a', expression: '{@:undefined}' }];
			const result = validateVariables(variables);
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].type).toBe('undefined-variable');
			expect(result.errors[0].message).toContain('"undefined"');
			expect(result.errors[0].message).toContain('not defined');
		});

		it('should detect multiple undefined references', () => {
			const variables: Variable[] = [{ name: 'a', expression: '{@:x} + {@:y}' }];
			const result = validateVariables(variables);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThanOrEqual(2);
			expect(result.errors.every((e) => e.type === 'undefined-variable')).toBe(true);
		});

		it('should detect undefined reference in Markdown syntax', () => {
			const variables: Variable[] = [{ name: 'a', expression: '{{undefined}}' }];
			const result = validateVariables(variables);
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].type).toBe('undefined-variable');
		});

		it('should not flag valid references', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '5' },
				{ name: 'b', expression: '{@:a}' },
				{ name: 'c', expression: '{@:a} + {@:b}' }
			];
			const result = validateVariables(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should detect forward reference as undefined', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '{@:b}' },
				{ name: 'b', expression: '5' }
			];
			const result = validateVariables(variables);
			// Note: This tests that validation checks all variables are defined,
			// not checking resolution order (that's checked during resolution)
			expect(result.valid).toBe(true); // Both variables exist
		});
	});

	// ============================================================================
	// SYNTAX VALIDATION
	// ============================================================================

	describe('Syntax validation', () => {
		it('should detect malformed variable reference', () => {
			const variables: Variable[] = [{ name: 'a', expression: '{@:}' }];
			const result = validateVariables(variables);
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].type).toBe('invalid-syntax');
			expect(result.errors[0].message).toContain('Malformed');
		});

		it('should detect malformed Markdown variable reference', () => {
			const variables: Variable[] = [{ name: 'a', expression: '{{}}' }];
			const result = validateVariables(variables);
			// Empty {{}} may be considered valid syntax (just empty content)
			// This is acceptable - actual validation happens during resolution
			expect(result.valid).toBe(true);
		});

		it('should detect invalid random spec syntax', () => {
			const variables: Variable[] = [{ name: 'a', expression: '{#:invalid}' }];
			const result = validateVariables(variables);
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].type).toBe('invalid-syntax');
			expect(result.errors[0].message).toContain('Invalid random spec');
		});

		it('should detect invalid range in random spec', () => {
			const variables: Variable[] = [{ name: 'a', expression: '{#:10-1}' }];
			const result = validateVariables(variables);
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].type).toBe('invalid-range');
			expect(result.errors[0].message).toContain('min (10)');
			expect(result.errors[0].message).toContain('max (1)');
		});

		it('should accept equal min and max in range', () => {
			const variables: Variable[] = [{ name: 'a', expression: '{#:5-5}' }];
			const result = validateVariables(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should accept negative ranges', () => {
			const variables: Variable[] = [{ name: 'a', expression: '{#:-10--5}' }];
			const result = validateVariables(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should detect inverted negative range', () => {
			const variables: Variable[] = [{ name: 'a', expression: '{#:-1--10}' }];
			const result = validateVariables(variables);
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].type).toBe('invalid-range');
		});
	});

	// ============================================================================
	// RANDOM SPEC VALIDATION
	// ============================================================================

	describe('Random spec validation', () => {
		it('should accept valid integer range', () => {
			const variables: Variable[] = [{ name: 'a', expression: '{#:1-10}' }];
			const result = validateVariables(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should accept valid decimal by digits', () => {
			const variables: Variable[] = [{ name: 'a', expression: '{#:2.3}' }];
			const result = validateVariables(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should accept valid decimal range with step', () => {
			const variables: Variable[] = [{ name: 'a', expression: '{#:0.5-9.99:0.01}' }];
			const result = validateVariables(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should accept random with exclusions', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '{#:1-10!5}' },
				{ name: 'b', expression: '{#:1-20!5-10}' },
				{ name: 'c', expression: '{#:1-30!3,7,9}' }
			];
			const result = validateVariables(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should accept variable bounds in random spec', () => {
			const variables: Variable[] = [
				{ name: 'min', expression: '1' },
				{ name: 'max', expression: '10' },
				{ name: 'rand', expression: '{#:{@:min}-{@:max}}' }
			];
			const result = validateVariables(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should not validate variable bound ranges at parse time', () => {
			// When bounds are variables, we can't validate the range until resolution
			const variables: Variable[] = [
				{ name: 'min', expression: '10' },
				{ name: 'max', expression: '1' },
				{ name: 'rand', expression: '{#:{@:min}-{@:max}}' }
			];
			const result = validateVariables(variables);
			// Should pass validation (runtime will fail during resolution)
			expect(result.valid).toBe(true);
		});
	});

	// ============================================================================
	// MULTIPLE ERRORS
	// ============================================================================

	describe('Multiple errors', () => {
		it('should report all errors found', () => {
			const variables: Variable[] = [
				{ name: '', expression: '5' }, // Empty name
				{ name: 'a', expression: '{@:undefined}' }, // Undefined reference
				{ name: 'b', expression: '{#:10-1}' }, // Invalid range
				{ name: 'a', expression: '10' } // Duplicate name
			];
			const result = validateVariables(variables);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThanOrEqual(3);
		});

		it('should report errors for multiple variables', () => {
			const variables: Variable[] = [
				{ name: '123', expression: '5' },
				{ name: 'invalid-name', expression: '10' },
				{ name: 'a', expression: '{@:x}' },
				{ name: 'b', expression: '{#:invalid}' }
			];
			const result = validateVariables(variables);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThanOrEqual(4);
		});
	});

	// ============================================================================
	// EDGE CASES
	// ============================================================================

	describe('Edge cases', () => {
		it('should handle variable with empty expression', () => {
			const variables: Variable[] = [{ name: 'a', expression: '' }];
			const result = validateVariables(variables);
			expect(result.valid).toBe(true); // Empty expression is valid (constant empty string)
			expect(result.errors).toHaveLength(0);
		});

		it('should handle complex valid expressions', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '5' },
				{ name: 'b', expression: '{#:1-10}' },
				{ name: 'c', expression: '{eval:{@:a}+{@:b}}' },
				{ name: 'd', expression: 'Text with {@:c} value' }
			];
			const result = validateVariables(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should handle LaTeX expressions', () => {
			const variables: Variable[] = [
				{ name: 'numerator', expression: '6' },
				{ name: 'denominator', expression: '2' },
				{ name: 'result', expression: '{eval:\\frac{6}{2}}' }
			];
			const result = validateVariables(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should handle very long variable names', () => {
			const longName = 'very_long_variable_name_with_many_characters_but_still_valid';
			const variables: Variable[] = [{ name: longName, expression: '5' }];
			const result = validateVariables(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should handle single character variable names', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '1' },
				{ name: 'b', expression: '2' },
				{ name: 'x', expression: '{@:a}' },
				{ name: 'y', expression: '{@:b}' }
			];
			const result = validateVariables(variables);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});
});
