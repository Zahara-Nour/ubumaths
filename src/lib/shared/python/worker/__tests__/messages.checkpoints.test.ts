/**
 * Tests for the schema additions introduced by the notebook checkpoints
 * feature: `assert` behavior + optional `contextId` on `validate-exercise`.
 *
 * The other 4 behavior strategies are already exercised indirectly through
 * `execution/exercise-validation-real.svelte.test.ts`; here we cover only
 * the new surface so a regression doesn't slip past `discriminatedUnion`.
 */

import { describe, it, expect } from 'vitest';
import {
	behaviorCheckSchema,
	behaviorKindSchema,
	exerciseValidationResultSchema,
	validateExerciseMessageSchema
} from '../messages';

describe('behaviorCheckSchema — assert kind', () => {
	it('accepts a minimal assert behavior', () => {
		const result = behaviorCheckSchema.safeParse({
			kind: 'assert',
			code: 'assert moyenne([1, 2, 3]) == 2'
		});
		expect(result.success).toBe(true);
	});

	it('rejects an empty code', () => {
		const result = behaviorCheckSchema.safeParse({
			kind: 'assert',
			code: ''
		});
		expect(result.success).toBe(false);
	});

	it('rejects a missing code', () => {
		const result = behaviorCheckSchema.safeParse({ kind: 'assert' });
		expect(result.success).toBe(false);
	});

	it('rejects code longer than the 5 KB limit', () => {
		const result = behaviorCheckSchema.safeParse({
			kind: 'assert',
			code: 'x'.repeat(5001)
		});
		expect(result.success).toBe(false);
	});

	it('accepts code right at the 5 KB limit', () => {
		const result = behaviorCheckSchema.safeParse({
			kind: 'assert',
			code: 'x'.repeat(5000)
		});
		expect(result.success).toBe(true);
	});

	it('rejects an unknown kind', () => {
		const result = behaviorCheckSchema.safeParse({
			kind: 'asserrt',
			code: 'assert True'
		});
		expect(result.success).toBe(false);
	});
});

describe('validateExerciseMessageSchema — contextId', () => {
	const baseAssertConfig = {
		behavior: { kind: 'assert' as const, code: 'assert True' }
	};

	it('accepts a message without contextId (standard exercise mode)', () => {
		const result = validateExerciseMessageSchema.safeParse({
			type: 'validate-exercise',
			code: 'def f(): pass',
			config: baseAssertConfig,
			id: 'exec-12345'
		});
		expect(result.success).toBe(true);
	});

	it('accepts a message with contextId (notebook checkpoint mode)', () => {
		const result = validateExerciseMessageSchema.safeParse({
			type: 'validate-exercise',
			code: '',
			config: baseAssertConfig,
			id: 'exec-12345',
			contextId: 'notebook_abc-123-def'
		});
		expect(result.success).toBe(true);
	});

	it('rejects an empty contextId when present', () => {
		const result = validateExerciseMessageSchema.safeParse({
			type: 'validate-exercise',
			code: 'def f(): pass',
			config: baseAssertConfig,
			id: 'exec-12345',
			contextId: ''
		});
		expect(result.success).toBe(false);
	});

	it('rejects a contextId longer than 100 chars (shared contextIdSchema bound)', () => {
		const result = validateExerciseMessageSchema.safeParse({
			type: 'validate-exercise',
			code: 'def f(): pass',
			config: baseAssertConfig,
			id: 'exec-12345',
			contextId: 'x'.repeat(101)
		});
		expect(result.success).toBe(false);
	});

	it('rejects a contextId with disallowed characters (shared contextIdSchema regex)', () => {
		const result = validateExerciseMessageSchema.safeParse({
			type: 'validate-exercise',
			code: 'def f(): pass',
			config: baseAssertConfig,
			id: 'exec-12345',
			contextId: 'notebook ABC' // space disallowed
		});
		expect(result.success).toBe(false);
	});
});

describe('behaviorKindSchema — assert', () => {
	it("accepts 'assert' alongside the 4 pre-existing kinds", () => {
		expect(behaviorKindSchema.parse('assert')).toBe('assert');
		expect(behaviorKindSchema.parse('output')).toBe('output');
		expect(behaviorKindSchema.parse('unit_test')).toBe('unit_test');
		expect(behaviorKindSchema.parse('variable_check')).toBe('variable_check');
		expect(behaviorKindSchema.parse('reference_solution')).toBe('reference_solution');
	});
});

describe('exerciseValidationResultSchema — behavior_kind assert round-trip', () => {
	it("parses a result with behavior_kind = 'assert' (would crash if the response schema lacked the variant)", () => {
		const result = exerciseValidationResultSchema.safeParse({
			valid: true,
			failed_layer: null,
			behavior_kind: 'assert',
			test_results: [],
			execution_time_ms: 42
		});
		expect(result.success).toBe(true);
	});

	it('parses a failed assert run (worker response shape)', () => {
		const result = exerciseValidationResultSchema.safeParse({
			valid: false,
			failed_layer: 'behavior',
			behavior_kind: 'assert',
			test_results: [
				{
					passed: false,
					error: 'AssertionError: expected 6, got 5'
				}
			],
			execution_time_ms: 18
		});
		expect(result.success).toBe(true);
	});
});
