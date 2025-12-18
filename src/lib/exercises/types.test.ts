/**
 * Exercise Types Helper Functions Tests
 * ======================================
 *
 * Tests for type helper functions related to exercise variations system:
 * - isVariationsExercise()
 * - mergeExerciseVariables()
 * - resolveExerciseVariationWithShared()
 */

import { describe, it, expect } from 'vitest';
import {
	isVariationsExercise,
	mergeExerciseVariables,
	resolveExerciseVariationWithShared
} from './types';
import type { Exercise, ExerciseVariation, SharedExerciseDefaults, Variable } from './types';

// ============================================================================
// HELPER: CREATE MINIMAL EXERCISE
// ============================================================================

/**
 * Create a minimal valid exercise for testing
 */
function createExercise(overrides: Partial<Exercise> = {}): Exercise {
	return {
		id: 'test-exercise-id',
		difficulty: 1,
		tags: ['test'],
		statement_md: 'Test statement',
		solution_md: 'Test solution',
		distribution_mode: 'on_demand',
		created_at: '2024-01-01T00:00:00Z',
		updated_at: '2024-01-01T00:00:00Z',
		created_by: 'test-user-id',
		...overrides
	};
}

// ============================================================================
// isVariationsExercise() TESTS
// ============================================================================

describe('isVariationsExercise()', () => {
	it('should return true if exercise has non-empty variations array', () => {
		const exercise = createExercise({
			variations: [
				{
					label: 'guided',
					statement_md: 'Statement',
					solution_md: 'Solution'
				}
			]
		});

		expect(isVariationsExercise(exercise)).toBe(true);
	});

	it('should return false if exercise has no variations property', () => {
		const exercise = createExercise({
			variations: undefined
		});

		expect(isVariationsExercise(exercise)).toBe(false);
	});

	it('should return false if exercise has empty variations array', () => {
		const exercise = createExercise({
			variations: []
		});

		expect(isVariationsExercise(exercise)).toBe(false);
	});

	it('should return true for exercise with multiple variations', () => {
		const exercise = createExercise({
			variations: [
				{ label: 'guided', statement_md: 'S1', solution_md: 'Sol1' },
				{ label: 'intermediate', statement_md: 'S2', solution_md: 'Sol2' },
				{ label: 'autonomous', statement_md: 'S3', solution_md: 'Sol3' }
			]
		});

		expect(isVariationsExercise(exercise)).toBe(true);
	});

	it('should work as TypeScript type guard', () => {
		const exercise = createExercise({
			variations: [{ label: 'guided', statement_md: 'S', solution_md: 'Sol' }]
		});

		if (isVariationsExercise(exercise)) {
			// TypeScript should know variations is defined here
			expect(exercise.variations).toBeDefined();
			expect(exercise.variations!.length).toBeGreaterThan(0);
		}
	});
});

// ============================================================================
// mergeExerciseVariables() TESTS
// ============================================================================

describe('mergeExerciseVariables()', () => {
	it('should return undefined when both inputs are undefined', () => {
		const result = mergeExerciseVariables(undefined, undefined);
		expect(result).toBeUndefined();
	});

	it('should return shared variables when per-variation is undefined', () => {
		const shared: Variable[] = [
			{ name: 'a', expression: '{{1..10}}' },
			{ name: 'b', expression: '{{1..10}}' }
		];

		const result = mergeExerciseVariables(shared, undefined);

		expect(result).toBe(shared); // Should return same reference
		expect(result).toHaveLength(2);
	});

	it('should return per-variation variables when shared is undefined', () => {
		const perVariation: Variable[] = [
			{ name: 'x', expression: '{{5..15}}' },
			{ name: 'y', expression: '{{eval:x*2}}' }
		];

		const result = mergeExerciseVariables(undefined, perVariation);

		expect(result).toBe(perVariation); // Should return same reference
		expect(result).toHaveLength(2);
	});

	it('should return shared variables when per-variation is empty', () => {
		const shared: Variable[] = [{ name: 'a', expression: '5' }];
		const perVariation: Variable[] = [];

		const result = mergeExerciseVariables(shared, perVariation);

		expect(result).toBe(shared);
	});

	it('should return per-variation when shared is empty', () => {
		const shared: Variable[] = [];
		const perVariation: Variable[] = [{ name: 'x', expression: '10' }];

		const result = mergeExerciseVariables(shared, perVariation);

		expect(result).toBe(perVariation);
	});

	it('should merge different variables from shared and per-variation', () => {
		const shared: Variable[] = [{ name: 'a', expression: '{{1..10}}' }];
		const perVariation: Variable[] = [{ name: 'b', expression: '{{eval:a*2}}' }];

		const result = mergeExerciseVariables(shared, perVariation);

		expect(result).toHaveLength(2);
		expect(result![0].name).toBe('a');
		expect(result![1].name).toBe('b');
	});

	it('should override shared variable with per-variation variable (same name)', () => {
		const shared: Variable[] = [
			{ name: 'x', expression: '{{1..10}}' },
			{ name: 'y', expression: '5' }
		];
		const perVariation: Variable[] = [
			{ name: 'x', expression: '{{5..15}}' } // Override x
		];

		const result = mergeExerciseVariables(shared, perVariation);

		expect(result).toHaveLength(2);

		// y should be from shared
		const yVar = result!.find((v) => v.name === 'y');
		expect(yVar).toBeDefined();
		expect(yVar!.expression).toBe('5');

		// x should be from per-variation (overrides shared)
		const xVar = result!.find((v) => v.name === 'x');
		expect(xVar).toBeDefined();
		expect(xVar!.expression).toBe('{{5..15}}');
	});

	it('should override multiple shared variables', () => {
		const shared: Variable[] = [
			{ name: 'a', expression: '1' },
			{ name: 'b', expression: '2' },
			{ name: 'c', expression: '3' }
		];
		const perVariation: Variable[] = [
			{ name: 'a', expression: '10' }, // Override
			{ name: 'c', expression: '30' } // Override
		];

		const result = mergeExerciseVariables(shared, perVariation);

		expect(result).toHaveLength(3);

		const aVar = result!.find((v) => v.name === 'a');
		expect(aVar!.expression).toBe('10');

		const bVar = result!.find((v) => v.name === 'b');
		expect(bVar!.expression).toBe('2'); // Not overridden

		const cVar = result!.find((v) => v.name === 'c');
		expect(cVar!.expression).toBe('30');
	});

	it('should maintain order: shared (non-overridden) then per-variation', () => {
		const shared: Variable[] = [
			{ name: 'a', expression: '1' },
			{ name: 'b', expression: '2' },
			{ name: 'c', expression: '3' }
		];
		const perVariation: Variable[] = [
			{ name: 'b', expression: '20' }, // Override b
			{ name: 'd', expression: '4' } // New variable
		];

		const result = mergeExerciseVariables(shared, perVariation);

		expect(result).toHaveLength(4);

		// Order should be: a, c (non-overridden shared), b, d (per-variation)
		expect(result![0].name).toBe('a');
		expect(result![1].name).toBe('c');
		expect(result![2].name).toBe('b');
		expect(result![2].expression).toBe('20'); // Overridden value
		expect(result![3].name).toBe('d');
	});
});

// ============================================================================
// resolveExerciseVariationWithShared() TESTS
// ============================================================================

describe('resolveExerciseVariationWithShared()', () => {
	it('should return variation unchanged if shared is undefined', () => {
		const variation: ExerciseVariation = {
			label: 'guided',
			statement_md: 'Statement',
			solution_md: 'Solution'
		};

		const result = resolveExerciseVariationWithShared(undefined, variation);

		expect(result).toEqual(variation);
	});

	it('should use variation statement when defined', () => {
		const shared: SharedExerciseDefaults = {
			statement_md: 'Shared statement'
		};
		const variation: ExerciseVariation = {
			label: 'guided',
			statement_md: 'Variation statement',
			solution_md: 'Solution'
		};

		const result = resolveExerciseVariationWithShared(shared, variation);

		expect(result.statement_md).toBe('Variation statement');
	});

	it('should use shared statement when variation statement is empty', () => {
		const shared: SharedExerciseDefaults = {
			statement_md: 'Shared statement'
		};
		const variation: ExerciseVariation = {
			label: 'guided',
			statement_md: '',
			solution_md: 'Solution'
		};

		const result = resolveExerciseVariationWithShared(shared, variation);

		expect(result.statement_md).toBe('Shared statement');
	});

	it('should use variation solution when defined', () => {
		const shared: SharedExerciseDefaults = {
			solution_md: 'Shared solution'
		};
		const variation: ExerciseVariation = {
			label: 'guided',
			statement_md: 'Statement',
			solution_md: 'Variation solution'
		};

		const result = resolveExerciseVariationWithShared(shared, variation);

		expect(result.solution_md).toBe('Variation solution');
	});

	it('should use shared solution when variation solution is empty', () => {
		const shared: SharedExerciseDefaults = {
			solution_md: 'Shared solution'
		};
		const variation: ExerciseVariation = {
			label: 'guided',
			statement_md: 'Statement',
			solution_md: ''
		};

		const result = resolveExerciseVariationWithShared(shared, variation);

		expect(result.solution_md).toBe('Shared solution');
	});

	it('should use empty string when neither shared nor variation define statement', () => {
		const shared: SharedExerciseDefaults = {
			solution_md: 'Solution'
		};
		const variation: ExerciseVariation = {
			label: 'guided',
			statement_md: '',
			solution_md: 'Solution'
		};

		const result = resolveExerciseVariationWithShared(shared, variation);

		expect(result.statement_md).toBe('');
	});

	it('should merge variables using mergeExerciseVariables logic', () => {
		const shared: SharedExerciseDefaults = {
			variables: [
				{ name: 'a', expression: '{{1..10}}' },
				{ name: 'b', expression: '{{1..10}}' }
			]
		};
		const variation: ExerciseVariation = {
			label: 'guided',
			statement_md: 'Statement',
			solution_md: 'Solution',
			variables: [{ name: 'c', expression: '{{eval:a+b}}' }]
		};

		const result = resolveExerciseVariationWithShared(shared, variation);

		expect(result.variables).toHaveLength(3);
		expect(result.variables!.map((v) => v.name)).toEqual(['a', 'b', 'c']);
	});

	it('should preserve variation hints', () => {
		const shared: SharedExerciseDefaults = {
			statement_md: 'Shared'
		};
		const variation: ExerciseVariation = {
			label: 'guided',
			statement_md: 'Statement',
			solution_md: 'Solution',
			hints: [
				{
					id: 'hint1',
					type: 'video',
					url: 'https://example.com',
					title: 'Video Hint'
				}
			]
		};

		const result = resolveExerciseVariationWithShared(shared, variation);

		expect(result.hints).toHaveLength(1);
		expect(result.hints![0].id).toBe('hint1');
	});

	it('should preserve variation label', () => {
		const shared: SharedExerciseDefaults = {
			statement_md: 'Shared'
		};
		const variation: ExerciseVariation = {
			label: 'autonomous',
			statement_md: 'Statement',
			solution_md: 'Solution'
		};

		const result = resolveExerciseVariationWithShared(shared, variation);

		expect(result.label).toBe('autonomous');
	});

	it('should handle all fields together', () => {
		const shared: SharedExerciseDefaults = {
			variables: [{ name: 'a', expression: '5' }],
			statement_md: 'Shared statement',
			solution_md: 'Shared solution'
		};
		const variation: ExerciseVariation = {
			label: 'guided',
			statement_md: 'Override statement',
			solution_md: '', // Use shared
			variables: [{ name: 'b', expression: '{{eval:a*2}}' }],
			hints: [
				{
					id: 'hint1',
					type: 'video',
					url: 'https://example.com',
					title: 'Hint'
				}
			]
		};

		const result = resolveExerciseVariationWithShared(shared, variation);

		expect(result.label).toBe('guided');
		expect(result.statement_md).toBe('Override statement');
		expect(result.solution_md).toBe('Shared solution');
		expect(result.variables).toHaveLength(2);
		expect(result.hints).toHaveLength(1);
	});

	it('should handle variation with no variables (use shared only)', () => {
		const shared: SharedExerciseDefaults = {
			variables: [
				{ name: 'a', expression: '{{1..10}}' },
				{ name: 'b', expression: '{{1..10}}' }
			],
			solution_md: 'Shared solution'
		};
		const variation: ExerciseVariation = {
			label: 'autonomous',
			statement_md: 'Statement',
			solution_md: 'Solution'
			// No variables field
		};

		const result = resolveExerciseVariationWithShared(shared, variation);

		expect(result.variables).toHaveLength(2);
		expect(result.variables).toBe(shared.variables); // Should use shared
	});

	it('should handle empty shared and variation (no variables)', () => {
		const shared: SharedExerciseDefaults = {
			statement_md: 'Shared statement'
		};
		const variation: ExerciseVariation = {
			label: 'guided',
			statement_md: '',
			solution_md: 'Solution'
		};

		const result = resolveExerciseVariationWithShared(shared, variation);

		expect(result.variables).toBeUndefined();
		expect(result.statement_md).toBe('Shared statement');
	});
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Type Helpers Integration', () => {
	it('should work together to resolve a complete exercise with variations', () => {
		const exercise = createExercise({
			shared: {
				variables: [
					{ name: 'a', expression: '{{3..10}}' },
					{ name: 'b', expression: '{{3..10}}' }
				],
				solution_md: 'AC = {{c}} cm'
			},
			variations: [
				{
					label: 'guided',
					statement_md: 'Calculate with hints',
					solution_md: '', // Will use shared
					variables: [{ name: 'c', expression: '{{eval:Math.sqrt(a*a + b*b)}}' }],
					hints: [
						{
							id: 'pythagore',
							type: 'video',
							url: 'https://example.com',
							title: 'Pythagore'
						}
					]
				},
				{
					label: 'autonomous',
					statement_md: 'Calculate directly',
					solution_md: 'Direct solution',
					variables: [{ name: 'c', expression: '{{eval:Math.sqrt(a*a + b*b)}}' }]
				}
			]
		});

		// Check that it's a variations exercise
		expect(isVariationsExercise(exercise)).toBe(true);

		// Resolve the first variation with shared defaults
		const resolvedVariation = resolveExerciseVariationWithShared(
			exercise.shared,
			exercise.variations![0]
		);

		expect(resolvedVariation.label).toBe('guided');
		expect(resolvedVariation.statement_md).toBe('Calculate with hints');
		expect(resolvedVariation.solution_md).toBe('AC = {{c}} cm'); // From shared
		expect(resolvedVariation.variables).toHaveLength(3); // a, b from shared, c from variation
		expect(resolvedVariation.hints).toHaveLength(1);
	});

	it('should handle legacy exercise (no variations)', () => {
		const exercise = createExercise({
			variables: [{ name: 'x', expression: '{{1..10}}' }],
			statement_md: 'Calculate {{x}}',
			solution_md: 'Answer: {{x}}'
		});

		// Should not be a variations exercise
		expect(isVariationsExercise(exercise)).toBe(false);

		// Type guard should work
		if (isVariationsExercise(exercise)) {
			// This block should not execute
			throw new Error('Should not reach here');
		}
	});
});
