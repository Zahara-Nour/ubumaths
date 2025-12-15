/**
 * Tests for generic_functions field validation in exercises
 *
 * TDD: These tests define the expected behavior for the generic_functions field
 * which allows exercises to specify custom function identifiers for math parsing.
 */

import { describe, it, expect } from 'vitest';
import { createExerciseSchema, updateExerciseSchema } from '../exercises';

describe('generic_functions field validation', () => {
	const validBaseExercise = {
		statement_md: 'Test statement',
		solution_md: 'Test solution',
		difficulty: 1 as const
	};

	describe('valid cases', () => {
		it('accepts undefined generic_functions (uses parser defaults)', () => {
			const result = createExerciseSchema.safeParse(validBaseExercise);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.generic_functions).toBeUndefined();
			}
		});

		it('accepts null generic_functions', () => {
			const result = createExerciseSchema.safeParse({
				...validBaseExercise,
				generic_functions: null
			});
			expect(result.success).toBe(true);
		});

		it('accepts empty array (disables generic function parsing)', () => {
			const result = createExerciseSchema.safeParse({
				...validBaseExercise,
				generic_functions: []
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.generic_functions).toEqual([]);
			}
		});

		it('accepts single letter function names', () => {
			const result = createExerciseSchema.safeParse({
				...validBaseExercise,
				generic_functions: ['f', 'g', 'P', 'Q']
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.generic_functions).toEqual(['f', 'g', 'P', 'Q']);
			}
		});

		it('accepts multi-character identifiers', () => {
			const result = createExerciseSchema.safeParse({
				...validBaseExercise,
				generic_functions: ['phi', 'func', 'myFunction', 'f1', 'g_prime']
			});
			expect(result.success).toBe(true);
		});

		it('accepts mixed case identifiers', () => {
			const result = createExerciseSchema.safeParse({
				...validBaseExercise,
				generic_functions: ['f', 'F', 'MyFunc', 'FUNC']
			});
			expect(result.success).toBe(true);
		});

		it('accepts identifiers with numbers (not at start)', () => {
			const result = createExerciseSchema.safeParse({
				...validBaseExercise,
				generic_functions: ['f1', 'func2', 'g123']
			});
			expect(result.success).toBe(true);
		});

		it('accepts identifiers with underscores', () => {
			const result = createExerciseSchema.safeParse({
				...validBaseExercise,
				generic_functions: ['f_prime', 'my_func', 'g_2']
			});
			expect(result.success).toBe(true);
		});

		it('accepts up to 50 function names', () => {
			const names = Array.from({ length: 50 }, (_, i) => `f${i}`);
			const result = createExerciseSchema.safeParse({
				...validBaseExercise,
				generic_functions: names
			});
			expect(result.success).toBe(true);
		});
	});

	describe('invalid cases', () => {
		it('rejects identifiers starting with a number', () => {
			const result = createExerciseSchema.safeParse({
				...validBaseExercise,
				generic_functions: ['1f', '2func']
			});
			expect(result.success).toBe(false);
		});

		it('rejects identifiers with special characters', () => {
			const result = createExerciseSchema.safeParse({
				...validBaseExercise,
				generic_functions: ['f+g', 'func!', 'f-prime']
			});
			expect(result.success).toBe(false);
		});

		it('rejects empty string identifiers', () => {
			const result = createExerciseSchema.safeParse({
				...validBaseExercise,
				generic_functions: ['f', '', 'g']
			});
			expect(result.success).toBe(false);
		});

		it('rejects identifiers with spaces', () => {
			const result = createExerciseSchema.safeParse({
				...validBaseExercise,
				generic_functions: ['my func', 'f g']
			});
			expect(result.success).toBe(false);
		});

		it('rejects more than 50 function names', () => {
			const names = Array.from({ length: 51 }, (_, i) => `f${i}`);
			const result = createExerciseSchema.safeParse({
				...validBaseExercise,
				generic_functions: names
			});
			expect(result.success).toBe(false);
		});

		it('rejects non-array values', () => {
			const result = createExerciseSchema.safeParse({
				...validBaseExercise,
				generic_functions: 'f,g,h'
			});
			expect(result.success).toBe(false);
		});

		it('rejects array with non-string values', () => {
			const result = createExerciseSchema.safeParse({
				...validBaseExercise,
				generic_functions: ['f', 123, 'g']
			});
			expect(result.success).toBe(false);
		});
	});

	describe('update schema', () => {
		it('accepts generic_functions in partial update', () => {
			const result = updateExerciseSchema.safeParse({
				generic_functions: ['f', 'P', 'Q']
			});
			expect(result.success).toBe(true);
		});

		it('accepts null to clear generic_functions', () => {
			const result = updateExerciseSchema.safeParse({
				generic_functions: null
			});
			expect(result.success).toBe(true);
		});
	});
});
