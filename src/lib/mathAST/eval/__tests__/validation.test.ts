/**
 * Zod Validation Tests
 *
 * Tests for Zod schemas validating eval bindings and parser options.
 */

import { describe, it, expect } from 'vitest';
import {
	VariableNameSchema,
	NumericValueSchema,
	EvalBindingsSchema,
	ParserSecurityOptionsSchema,
	validateVariableName,
	validateEvalBindings
} from '../validation';

// =============================================================================
// VariableNameSchema
// =============================================================================

describe('VariableNameSchema', () => {
	describe('valid names', () => {
		it('should accept single letters', () => {
			expect(VariableNameSchema.safeParse('x').success).toBe(true);
			expect(VariableNameSchema.safeParse('a').success).toBe(true);
			expect(VariableNameSchema.safeParse('Z').success).toBe(true);
		});

		it('should accept Greek letter names', () => {
			expect(VariableNameSchema.safeParse('alpha').success).toBe(true);
			expect(VariableNameSchema.safeParse('beta').success).toBe(true);
			expect(VariableNameSchema.safeParse('theta').success).toBe(true);
		});

		it('should accept names with underscores', () => {
			expect(VariableNameSchema.safeParse('var_1').success).toBe(true);
			expect(VariableNameSchema.safeParse('_private').success).toBe(true);
			expect(VariableNameSchema.safeParse('x_y_z').success).toBe(true);
		});

		it('should accept names with numbers after first char', () => {
			expect(VariableNameSchema.safeParse('x1').success).toBe(true);
			expect(VariableNameSchema.safeParse('var123').success).toBe(true);
		});
	});

	describe('invalid names', () => {
		it('should reject empty string', () => {
			const result = VariableNameSchema.safeParse('');
			expect(result.success).toBe(false);
		});

		it('should reject names starting with numbers', () => {
			const result = VariableNameSchema.safeParse('123');
			expect(result.success).toBe(false);
		});

		it('should reject names with special characters', () => {
			expect(VariableNameSchema.safeParse('@var').success).toBe(false);
			expect(VariableNameSchema.safeParse('var@').success).toBe(false);
			expect(VariableNameSchema.safeParse('a+b').success).toBe(false);
			expect(VariableNameSchema.safeParse('x y').success).toBe(false);
		});

		it('should reject names starting with digit', () => {
			const result = VariableNameSchema.safeParse('1x');
			expect(result.success).toBe(false);
		});
	});
});

// =============================================================================
// NumericValueSchema
// =============================================================================

describe('NumericValueSchema', () => {
	describe('valid values', () => {
		it('should accept integers', () => {
			expect(NumericValueSchema.safeParse(0).success).toBe(true);
			expect(NumericValueSchema.safeParse(42).success).toBe(true);
			expect(NumericValueSchema.safeParse(-10).success).toBe(true);
		});

		it('should accept decimals', () => {
			expect(NumericValueSchema.safeParse(3.14).success).toBe(true);
			expect(NumericValueSchema.safeParse(-0.5).success).toBe(true);
		});

		it('should accept very large numbers', () => {
			expect(NumericValueSchema.safeParse(1e100).success).toBe(true);
			expect(NumericValueSchema.safeParse(-1e100).success).toBe(true);
		});
	});

	describe('invalid values', () => {
		it('should reject NaN', () => {
			const result = NumericValueSchema.safeParse(NaN);
			expect(result.success).toBe(false);
		});

		it('should reject Infinity', () => {
			expect(NumericValueSchema.safeParse(Infinity).success).toBe(false);
			expect(NumericValueSchema.safeParse(-Infinity).success).toBe(false);
		});
	});
});

// =============================================================================
// EvalBindingsSchema
// =============================================================================

describe('EvalBindingsSchema', () => {
	describe('valid bindings', () => {
		it('should accept empty bindings', () => {
			const result = EvalBindingsSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		it('should accept numeric bindings', () => {
			const result = EvalBindingsSchema.safeParse({
				x: 1,
				y: 2.5,
				z: -3
			});
			expect(result.success).toBe(true);
		});

		it('should accept string bindings', () => {
			const result = EvalBindingsSchema.safeParse({
				a: 'value',
				b: 'another'
			});
			expect(result.success).toBe(true);
		});

		it('should accept mixed bindings', () => {
			const result = EvalBindingsSchema.safeParse({
				x: 1,
				name: 'test'
			});
			expect(result.success).toBe(true);
		});
	});

	describe('invalid bindings', () => {
		it('should reject invalid variable names', () => {
			const result = EvalBindingsSchema.safeParse({
				'': 1 // empty name
			});
			expect(result.success).toBe(false);
		});

		it('should reject NaN values', () => {
			const result = EvalBindingsSchema.safeParse({
				x: NaN
			});
			expect(result.success).toBe(false);
		});

		it('should reject Infinity values', () => {
			const result = EvalBindingsSchema.safeParse({
				x: Infinity
			});
			expect(result.success).toBe(false);
		});

		it('should reject empty string values', () => {
			const result = EvalBindingsSchema.safeParse({
				x: ''
			});
			expect(result.success).toBe(false);
		});
	});
});

// =============================================================================
// ParserSecurityOptionsSchema
// =============================================================================

describe('ParserSecurityOptionsSchema', () => {
	describe('valid options', () => {
		it('should accept empty options', () => {
			const result = ParserSecurityOptionsSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		it('should accept valid limits', () => {
			const result = ParserSecurityOptionsSchema.safeParse({
				maxInputLength: 1000,
				maxASTDepth: 50,
				maxNodeCount: 5000
			});
			expect(result.success).toBe(true);
		});

		it('should accept partial options', () => {
			const result = ParserSecurityOptionsSchema.safeParse({
				maxInputLength: 500
			});
			expect(result.success).toBe(true);
		});
	});

	describe('invalid options', () => {
		it('should reject negative limits', () => {
			expect(
				ParserSecurityOptionsSchema.safeParse({
					maxInputLength: -1
				}).success
			).toBe(false);
		});

		it('should reject zero limits', () => {
			expect(
				ParserSecurityOptionsSchema.safeParse({
					maxASTDepth: 0
				}).success
			).toBe(false);
		});

		it('should reject non-integer limits', () => {
			expect(
				ParserSecurityOptionsSchema.safeParse({
					maxNodeCount: 10.5
				}).success
			).toBe(false);
		});
	});
});

// =============================================================================
// Helper Functions
// =============================================================================

describe('validateVariableName', () => {
	it('should return valid result for valid names', () => {
		const result = validateVariableName('x');
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe('x');
		}
	});

	it('should return error for invalid names', () => {
		const result = validateVariableName('123');
		expect(result.success).toBe(false);
	});
});

describe('validateEvalBindings', () => {
	it('should return valid result for valid bindings', () => {
		const result = validateEvalBindings({ x: 1, y: 2 });
		expect(result.success).toBe(true);
	});

	it('should return error for invalid bindings', () => {
		const result = validateEvalBindings({ x: NaN });
		expect(result.success).toBe(false);
	});
});
