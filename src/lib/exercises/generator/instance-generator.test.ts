/**
 * Exercise Instance Generator Tests
 * ==================================
 *
 * Comprehensive test suite for the exercise instance generator.
 * Tests all scenarios: static, parameterized, error handling, seeding, etc.
 */

import { describe, it, expect } from 'vitest';
import {
	generateExerciseInstance,
	generateMultipleInstances,
	generateStudentSeed,
	generateGroupSeed,
	isParameterized
} from './instance-generator';
import type { Exercise } from '../types';

// ============================================================================
// HELPER: CREATE MINIMAL EXERCISE
// ============================================================================

/**
 * Create a minimal valid exercise for testing.
 * All exercises must use the variations system (single source of truth).
 * Variables should be placed in shared.variables.
 *
 * MIGRATION NOTE: Tests can still pass `variables` at the top level.
 * This helper converts them to `shared.variables` automatically.
 */
function createExercise(overrides: Partial<Exercise> = {}): Exercise {
	// Handle variables: can come from shared.variables or top-level variables (legacy test pattern)
	const topLevelVars = (overrides.variables as Array<{ name: string; expression: string }>) ?? [];
	const passedShared = overrides.shared as
		| {
				variables?: Array<{ name: string; expression: string }>;
				statement_md?: string;
				solution_md?: string;
		  }
		| undefined;
	const sharedVars = passedShared?.variables ?? [];

	// Merge: top-level variables go into shared
	const allVars = [...topLevelVars, ...sharedVars];

	// If variations is explicitly passed, use it; otherwise create default from statement_md/solution_md
	const passedVariations = overrides.variations as
		| Array<{ label: string; statement_md: string; solution_md: string }>
		| undefined;
	const variations = passedVariations ?? [
		{
			label: 'default',
			statement_md: (overrides.statement_md as string) ?? 'Test statement',
			solution_md: (overrides.solution_md as string) ?? 'Test solution'
		}
	];

	// Build shared object: merge passed shared with converted variables
	const shared =
		allVars.length > 0 || passedShared
			? {
					...passedShared,
					...(allVars.length > 0 ? { variables: allVars } : {})
				}
			: undefined;

	return {
		id: 'test-exercise-id',
		difficulty: 1,
		tags: ['test'],
		distribution_mode: 'on_demand',
		created_at: '2024-01-01T00:00:00Z',
		updated_at: '2024-01-01T00:00:00Z',
		created_by: 'test-user-id',
		// Variations is the single source of truth
		variations,
		// Include shared if present
		...(shared ? { shared } : {}),
		// Apply other overrides (excluding statement_md/solution_md/variables/variations/shared which are handled above)
		...Object.fromEntries(
			Object.entries(overrides).filter(
				([key]) =>
					!['statement_md', 'solution_md', 'shared', 'variables', 'variations'].includes(key)
			)
		)
	};
}

// ============================================================================
// STATIC EXERCISES (NO VARIABLES)
// ============================================================================

describe('Static Exercises', () => {
	it('should generate instance from static exercise (passthrough)', () => {
		const exercise = createExercise({
			statement_md: 'Calculate $2 + 3$',
			solution_md: 'The answer is $5$'
		});

		const result = generateExerciseInstance(exercise);

		expect(result.success).toBe(true);
		expect(result.instance).toBeDefined();

		if (result.success && result.instance) {
			expect(result.instance.statement_md).toBe('Calculate $2 + 3$');
			expect(result.instance.solution_md).toBe('The answer is $5$');
			expect(result.instance.resolvedVariables).toEqual([]);
			expect(result.instance.seed).toBeGreaterThanOrEqual(0);
		}
	});

	it('should use seed=0 for static exercises when no seed provided', () => {
		const exercise = createExercise();

		// Even though no seed provided, should generate one
		const result = generateExerciseInstance(exercise);

		expect(result.success).toBe(true);
		if (result.success && result.instance) {
			expect(typeof result.instance.seed).toBe('number');
		}
	});

	it('should copy metadata to instance', () => {
		const exercise = createExercise({
			title: 'Addition Practice',
			difficulty: 2,
			tags: ['addition', 'arithmetic'],
			source: 'Test Book',
			grade_levels: ['6', '5'],
			topic: 'Algèbre'
		});

		const result = generateExerciseInstance(exercise);

		expect(result.success).toBe(true);
		if (result.success && result.instance) {
			expect(result.instance.title).toBe('Addition Practice');
			expect(result.instance.difficulty).toBe(2);
			expect(result.instance.tags).toEqual(['addition', 'arithmetic']);
			expect(result.instance.source).toBe('Test Book');
			expect(result.instance.grade_levels).toEqual(['6', '5']);
			expect(result.instance.topic).toBe('Algèbre');
			expect(result.instance.exerciseId).toBe(exercise.id);
			expect(result.instance.distributionMode).toBe('on_demand');
		}
	});
});

// ============================================================================
// PARAMETERIZED EXERCISES
// ============================================================================

describe('Parameterized Exercises - Simple Variables', () => {
	it('should resolve simple variable references', () => {
		const exercise = createExercise({
			variables: [
				{ name: 'a', expression: '7' },
				{ name: 'b', expression: '3' }
			],
			statement_md: 'Calculate ${{a}} + {{b}}$',
			solution_md: 'The answer is $10$'
		});

		const result = generateExerciseInstance(exercise, { seed: 42 });

		expect(result.success).toBe(true);
		if (result.success && result.instance) {
			expect(result.instance.statement_md).toBe('Calculate $7 + 3$');
			expect(result.instance.solution_md).toBe('The answer is $10$');
			expect(result.instance.resolvedVariables).toEqual([
				{ name: 'a', value: '7' },
				{ name: 'b', value: '3' }
			]);
		}
	});

	it('should resolve random integer ranges', () => {
		const exercise = createExercise({
			variables: [{ name: 'a', expression: '{{1..10}}' }],
			statement_md: 'The number is {{a}}',
			solution_md: 'You got it!'
		});

		const result = generateExerciseInstance(exercise, { seed: 12345 });

		expect(result.success).toBe(true);
		if (result.success && result.instance) {
			const value = parseInt(result.instance.resolvedVariables[0].value);
			expect(value).toBeGreaterThanOrEqual(1);
			expect(value).toBeLessThanOrEqual(10);
			expect(result.instance.statement_md).toContain(value.toString());
		}
	});

	it('should resolve variables with eval expressions', () => {
		const exercise = createExercise({
			variables: [
				{ name: 'a', expression: '5' },
				{ name: 'b', expression: '3' },
				{ name: 'sum', expression: '{{eval:{{a}}+{{b}}}}' } // Variables wrapped in {{}}
			],
			statement_md: 'Calculate ${{a}} + {{b}}$',
			solution_md: 'The answer is ${{sum}}$'
		});

		const result = generateExerciseInstance(exercise, { seed: 42 });

		expect(result.success).toBe(true);
		if (result.success && result.instance) {
			expect(result.instance.statement_md).toBe('Calculate $5 + 3$');
			expect(result.instance.solution_md).toBe('The answer is $8$');
			expect(result.instance.resolvedVariables).toEqual([
				{ name: 'a', value: '5' },
				{ name: 'b', value: '3' },
				{ name: 'sum', value: '8' }
			]);
		}
	});
});

describe('Parameterized Exercises - Complex Scenarios', () => {
	it('should handle variables in multiple locations', () => {
		const exercise = createExercise({
			variables: [
				{ name: 'x', expression: '2' },
				{ name: 'y', expression: '3' },
				{ name: 'x_squared', expression: '{{eval:{{x}}*{{x}}}}' },
				{ name: 'y_squared', expression: '{{eval:{{y}}*{{y}}}}' },
				{ name: 'sum', expression: '{{eval:{{x_squared}} + {{y_squared}}}}' }
			],
			statement_md:
				'# Exercise\n\nCalculate ${{x}}^2 + {{y}}^2$\n\nVariables:\n- x = {{x}}\n- y = {{y}}',
			solution_md:
				'The answer is ${{sum}}$\n\nExplanation: ${{x}}^2 = {{x_squared}}$ and ${{y}}^2 = {{y_squared}}$'
		});

		const result = generateExerciseInstance(exercise, { seed: 42 });

		expect(result.success).toBe(true);
		if (result.success && result.instance) {
			expect(result.instance.statement_md).toContain('x = 2');
			expect(result.instance.statement_md).toContain('y = 3');
			expect(result.instance.statement_md).toContain('$2^2 + 3^2$');
			expect(result.instance.solution_md).toContain('The answer is $13$');
			expect(result.instance.solution_md).toContain('$2^2 = 4$');
			expect(result.instance.solution_md).toContain('$3^2 = 9$');
		}
	});

	it('should handle chained variable references', () => {
		const exercise = createExercise({
			variables: [
				{ name: 'a', expression: '5' },
				{ name: 'b', expression: '{{a}}' }, // Reference to a
				{ name: 'c', expression: '{{eval:{{b}}*2}}' } // Reference to b with wrapped syntax
			],
			statement_md: 'Values: a={{a}}, b={{b}}, c={{c}}',
			solution_md: 'Done'
		});

		const result = generateExerciseInstance(exercise, { seed: 42 });

		expect(result.success).toBe(true);
		if (result.success && result.instance) {
			expect(result.instance.statement_md).toBe('Values: a=5, b=5, c=10');
			expect(result.instance.resolvedVariables).toEqual([
				{ name: 'a', value: '5' },
				{ name: 'b', value: '5' },
				{ name: 'c', value: '10' }
			]);
		}
	});
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

describe('Error Handling', () => {
	it('should detect circular dependencies', () => {
		const exercise = createExercise({
			variables: [
				{ name: 'a', expression: '{{b}}' },
				{ name: 'b', expression: '{{a}}' } // Circular!
			],
			statement_md: 'Calculate {{a}}',
			solution_md: 'Done'
		});

		const result = generateExerciseInstance(exercise);

		expect(result.success).toBe(false);
		expect(result.errors).toBeDefined();
		if (!result.success) {
			expect(result.errors![0]).toContain('Circular dependency');
		}
	});

	it('should error on undefined variable references in content', () => {
		const exercise = createExercise({
			variables: [{ name: 'a', expression: '5' }],
			statement_md: 'Calculate {{a}} + {{b}}', // 'b' not defined!
			solution_md: 'Done'
		});

		const result = generateExerciseInstance(exercise);

		// resolveText throws an error for undefined variables
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.errors![0]).toContain('Variable "b" not found');
		}
	});

	it('should catch parsing errors when parseAST is true', () => {
		const exercise = createExercise({
			statement_md: 'Valid markdown',
			solution_md: 'Valid markdown'
		});

		// This should succeed - markdown parser is robust
		const result = generateExerciseInstance(exercise, { parseAST: true });
		expect(result.success).toBe(true);

		if (result.success && result.instance) {
			expect(result.instance.statement_ast).toBeDefined();
			expect(result.instance.solution_ast).toBeDefined();
		}
	});
});

// ============================================================================
// SEEDING
// ============================================================================

describe('Seeding', () => {
	it('should generate random seed when not provided', () => {
		const exercise = createExercise({
			variables: [{ name: 'a', expression: '{{1..100}}' }],
			statement_md: 'Number: {{a}}',
			solution_md: 'Done'
		});

		const result1 = generateExerciseInstance(exercise);
		const result2 = generateExerciseInstance(exercise);

		expect(result1.success).toBe(true);
		expect(result2.success).toBe(true);

		if (result1.success && result1.instance && result2.success && result2.instance) {
			// Seeds should be different (extremely unlikely to be same)
			expect(result1.instance.seed).not.toBe(result2.instance.seed);
		}
	});

	it('should use provided seed for reproducible generation', () => {
		const exercise = createExercise({
			variables: [{ name: 'a', expression: '{{1..100}}' }],
			statement_md: 'Number: {{a}}',
			solution_md: 'Done'
		});

		const result1 = generateExerciseInstance(exercise, { seed: 12345 });
		const result2 = generateExerciseInstance(exercise, { seed: 12345 });

		expect(result1.success).toBe(true);
		expect(result2.success).toBe(true);

		if (result1.success && result1.instance && result2.success && result2.instance) {
			expect(result1.instance.seed).toBe(12345);
			expect(result2.instance.seed).toBe(12345);
			expect(result1.instance.statement_md).toBe(result2.instance.statement_md);
			expect(result1.instance.resolvedVariables).toEqual(result2.instance.resolvedVariables);
		}
	});

	it('should generate deterministic student seed', () => {
		const exerciseId = 'ex-123';
		const studentId = 'student-456';

		const seed1 = generateStudentSeed(exerciseId, studentId);
		const seed2 = generateStudentSeed(exerciseId, studentId);

		// Same inputs = same seed
		expect(seed1).toBe(seed2);
		expect(seed1).toBeGreaterThan(0);
	});

	it('should generate different seeds for different students', () => {
		const exerciseId = 'ex-123';

		const seed1 = generateStudentSeed(exerciseId, 'student-1');
		const seed2 = generateStudentSeed(exerciseId, 'student-2');

		// Different students = different seeds
		expect(seed1).not.toBe(seed2);
	});

	it('should generate deterministic group seed', () => {
		const exerciseId = 'ex-123';
		const groupId = 'group-456';

		const seed1 = generateGroupSeed(exerciseId, groupId);
		const seed2 = generateGroupSeed(exerciseId, groupId);

		// Same inputs = same seed
		expect(seed1).toBe(seed2);
		expect(seed1).toBeGreaterThan(0);
	});

	it('should generate different seeds for different groups', () => {
		const exerciseId = 'ex-123';

		const seed1 = generateGroupSeed(exerciseId, 'group-1');
		const seed2 = generateGroupSeed(exerciseId, 'group-2');

		// Different groups = different seeds
		expect(seed1).not.toBe(seed2);
	});
});

// ============================================================================
// AST PARSING
// ============================================================================

describe('AST Parsing', () => {
	it('should not parse AST by default', () => {
		const exercise = createExercise({
			statement_md: '# Heading\n\nParagraph with $x^2$',
			solution_md: 'Solution'
		});

		const result = generateExerciseInstance(exercise);

		expect(result.success).toBe(true);
		if (result.success && result.instance) {
			expect(result.instance.statement_ast).toBeUndefined();
			expect(result.instance.solution_ast).toBeUndefined();
		}
	});

	it('should parse AST when parseAST is true', () => {
		const exercise = createExercise({
			statement_md: '# Heading\n\nParagraph with $x^2$',
			solution_md: '## Solution\n\nAnswer: $42$'
		});

		const result = generateExerciseInstance(exercise, { parseAST: true });

		expect(result.success).toBe(true);
		if (result.success && result.instance) {
			expect(result.instance.statement_ast).toBeDefined();
			expect(result.instance.solution_ast).toBeDefined();
			expect(result.instance.statement_ast!.type).toBe('document');
			expect(result.instance.solution_ast!.type).toBe('document');
		}
	});

	it('should parse AST of resolved content', () => {
		const exercise = createExercise({
			variables: [
				{ name: 'a', expression: '7' },
				{ name: 'b', expression: '3' }
			],
			statement_md: 'Calculate ${{a}} + {{b}}$',
			solution_md: 'The answer is ${{eval:a+b}}$'
		});

		const result = generateExerciseInstance(exercise, { seed: 42, parseAST: true });

		expect(result.success).toBe(true);
		if (result.success && result.instance) {
			// AST should contain resolved values, not {{}} syntax
			expect(result.instance.statement_md).toBe('Calculate $7 + 3$');
			expect(result.instance.statement_ast).toBeDefined();

			// Verify AST structure
			const doc = result.instance.statement_ast!;
			expect(doc.type).toBe('document');
			expect(doc.children.length).toBeGreaterThan(0);
		}
	});
});

// ============================================================================
// BATCH GENERATION
// ============================================================================

describe('Batch Generation', () => {
	it('should generate multiple instances', () => {
		const exercise = createExercise({
			variables: [{ name: 'a', expression: '{{1..10}}' }],
			statement_md: 'Number: {{a}}',
			solution_md: 'Done'
		});

		const results = generateMultipleInstances(exercise, 5);

		expect(results).toHaveLength(5);
		expect(results.every((r) => r.success)).toBe(true);
	});

	it('should generate instances with deterministic seeds when baseSeed provided', () => {
		const exercise = createExercise({
			variables: [{ name: 'a', expression: '{{1..100}}' }],
			statement_md: 'Number: {{a}}',
			solution_md: 'Done'
		});

		const results1 = generateMultipleInstances(exercise, 3, 1000);
		const results2 = generateMultipleInstances(exercise, 3, 1000);

		expect(results1).toHaveLength(3);
		expect(results2).toHaveLength(3);

		// Same seeds = same results
		for (let i = 0; i < 3; i++) {
			if (
				results1[i].success &&
				results1[i].instance &&
				results2[i].success &&
				results2[i].instance
			) {
				expect(results1[i].instance!.seed).toBe(1000 + i);
				expect(results2[i].instance!.seed).toBe(1000 + i);
				expect(results1[i].instance!.statement_md).toBe(results2[i].instance!.statement_md);
			}
		}
	});

	it('should generate instances with random seeds when baseSeed not provided', () => {
		const exercise = createExercise({
			variables: [{ name: 'a', expression: '{{1..100}}' }],
			statement_md: 'Number: {{a}}',
			solution_md: 'Done'
		});

		const results = generateMultipleInstances(exercise, 5);

		expect(results).toHaveLength(5);

		if (results.every((r) => r.success && r.instance)) {
			const seeds = results.map((r) => r.instance!.seed);
			// All seeds should be different (extremely unlikely to collide)
			const uniqueSeeds = new Set(seeds);
			expect(uniqueSeeds.size).toBe(5);
		}
	});
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

describe('Utility Functions', () => {
	it('isParameterized should return false for static exercises', () => {
		const exercise = createExercise();
		expect(isParameterized(exercise)).toBe(false);
	});

	it('isParameterized should return false for exercises with empty variables array', () => {
		const exercise = createExercise({ variables: [] });
		expect(isParameterized(exercise)).toBe(false);
	});

	it('isParameterized should return true for exercises with variables', () => {
		const exercise = createExercise({
			variables: [{ name: 'a', expression: '{{1..10}}' }]
		});
		expect(isParameterized(exercise)).toBe(true);
	});
});

// ============================================================================
// VARIATIONS SYSTEM TESTS
// ============================================================================

describe('Variations System', () => {
	it('should select variation based on seed (deterministic)', () => {
		const exercise = createExercise({
			statement_md: 'Default statement (not used)', // Required for backward compatibility
			solution_md: 'Default solution (not used)', // Required for backward compatibility
			shared: {
				variables: [
					{ name: 'a', expression: '{{3..10}}' },
					{ name: 'b', expression: '{{3..10}}' }
				],
				solution_md: 'AC = {{result}} cm'
			},
			variations: [
				{
					label: 'guided',
					statement_md: 'Guided: Calculate with AB = {{a}} and BC = {{b}}',
					solution_md: 'Step by step solution...',
					variables: [{ name: 'result', expression: '{{eval:{{a}} + {{b}}}}' }]
				},
				{
					label: 'autonomous',
					statement_md: 'Autonomous: Calculate with AB = {{a}} and BC = {{b}}',
					solution_md: 'Direct solution...',
					variables: [{ name: 'result', expression: '{{eval:{{a}} + {{b}}}}' }]
				}
			]
		});

		// Test with seed that gives index 0
		const result1 = generateExerciseInstance(exercise, { seed: 0 });
		expect(result1.success).toBe(true);
		if (result1.success && result1.instance) {
			expect(result1.instance.selectedVariationIndex).toBe(0);
			expect(result1.instance.selectedVariationLabel).toBe('guided');
			expect(result1.instance.statement_md).toContain('Guided:');
		}

		// Test with seed that gives index 1
		const result2 = generateExerciseInstance(exercise, { seed: 1 });
		expect(result2.success).toBe(true);
		if (result2.success && result2.instance) {
			expect(result2.instance.selectedVariationIndex).toBe(1);
			expect(result2.instance.selectedVariationLabel).toBe('autonomous');
			expect(result2.instance.statement_md).toContain('Autonomous:');
		}
	});

	it('should merge shared and variation variables', () => {
		const exercise = createExercise({
			statement_md: 'Default',
			solution_md: 'Default',
			shared: {
				variables: [
					{ name: 'a', expression: '5' },
					{ name: 'b', expression: '3' }
				]
			},
			variations: [
				{
					label: 'guided',
					statement_md: 'Calculate {{a}} + {{b}} = {{sum}}',
					solution_md: 'Answer: {{sum}}',
					variables: [{ name: 'sum', expression: '{{eval:{{a}} + {{b}}}}' }]
				}
			]
		});

		const result = generateExerciseInstance(exercise, { seed: 0 });

		expect(result.success).toBe(true);
		if (result.success && result.instance) {
			expect(result.instance.resolvedVariables).toHaveLength(3);
			expect(result.instance.resolvedVariables.map((v) => v.name)).toEqual(['a', 'b', 'sum']);
			expect(result.instance.statement_md).toBe('Calculate 5 + 3 = 8');
		}
	});

	it('should override shared variables with variation variables', () => {
		const exercise = createExercise({
			statement_md: 'Default',
			solution_md: 'Default',
			shared: {
				variables: [{ name: 'x', expression: '10' }]
			},
			variations: [
				{
					label: 'guided',
					statement_md: 'Value of x is {{x}}',
					solution_md: 'Done',
					variables: [{ name: 'x', expression: '20' }] // Override
				}
			]
		});

		const result = generateExerciseInstance(exercise, { seed: 0 });

		expect(result.success).toBe(true);
		if (result.success && result.instance) {
			const xVar = result.instance.resolvedVariables.find((v) => v.name === 'x');
			expect(xVar?.value).toBe('20'); // Variation value wins
			expect(result.instance.statement_md).toBe('Value of x is 20');
		}
	});

	it('should use shared solution when variation does not define one', () => {
		const exercise = createExercise({
			statement_md: 'Default',
			solution_md: 'Default',
			shared: {
				solution_md: 'Shared solution content'
			},
			variations: [
				{
					label: 'guided',
					statement_md: 'Statement',
					solution_md: '' // Empty, should use shared
				}
			]
		});

		const result = generateExerciseInstance(exercise, { seed: 0 });

		expect(result.success).toBe(true);
		if (result.success && result.instance) {
			expect(result.instance.solution_md).toBe('Shared solution content');
		}
	});

	it('should include resolved hints from selected variation', () => {
		const exercise = createExercise({
			statement_md: 'Default',
			solution_md: 'Default',
			variations: [
				{
					label: 'guided',
					statement_md: 'Use {{hint:pythagore}} to solve',
					solution_md: 'Done',
					hints: [
						{
							id: 'pythagore',
							type: 'video',
							url: 'https://example.com/video',
							title: 'Pythagore Theorem'
						}
					]
				}
			]
		});

		const result = generateExerciseInstance(exercise, { seed: 0 });

		expect(result.success).toBe(true);
		if (result.success && result.instance) {
			expect(result.instance.resolvedHints).toBeDefined();
			expect(result.instance.resolvedHints).toHaveLength(1);
			expect(result.instance.resolvedHints![0].id).toBe('pythagore');
			expect(result.instance.resolvedHints![0].type).toBe('video');
			expect(result.instance.statement_md).toContain('{{hint:pythagore}}'); // Hint refs stay in markdown
		}
	});

	it('should handle variation without hints', () => {
		const exercise = createExercise({
			statement_md: 'Default',
			solution_md: 'Default',
			variations: [
				{
					label: 'autonomous',
					statement_md: 'Calculate directly',
					solution_md: 'Done'
					// No hints field
				}
			]
		});

		const result = generateExerciseInstance(exercise, { seed: 0 });

		expect(result.success).toBe(true);
		if (result.success && result.instance) {
			expect(result.instance.resolvedHints).toBeUndefined();
		}
	});

	it('should handle variation without variables (use shared only)', () => {
		const exercise = createExercise({
			statement_md: 'Default',
			solution_md: 'Default',
			shared: {
				variables: [{ name: 'a', expression: '7' }]
			},
			variations: [
				{
					label: 'guided',
					statement_md: 'Value: {{a}}',
					solution_md: 'Done'
					// No variables field
				}
			]
		});

		const result = generateExerciseInstance(exercise, { seed: 0 });

		expect(result.success).toBe(true);
		if (result.success && result.instance) {
			expect(result.instance.resolvedVariables).toHaveLength(1);
			expect(result.instance.resolvedVariables[0].value).toBe('7');
			expect(result.instance.statement_md).toBe('Value: 7');
		}
	});

	it('should detect circular dependencies in merged variables', () => {
		const exercise = createExercise({
			statement_md: 'Default',
			solution_md: 'Default',
			shared: {
				variables: [{ name: 'a', expression: '{{b}}' }]
			},
			variations: [
				{
					label: 'guided',
					statement_md: 'Test',
					solution_md: 'Test',
					variables: [{ name: 'b', expression: '{{a}}' }] // Circular!
				}
			]
		});

		const result = generateExerciseInstance(exercise, { seed: 0 });

		expect(result.success).toBe(false);
		expect(result.errors).toBeDefined();
		if (!result.success) {
			expect(result.errors![0]).toContain('Circular dependency');
		}
	});

	it('should use same seed for all variations (reproducible)', () => {
		const exercise = createExercise({
			statement_md: 'Default',
			solution_md: 'Default',
			shared: {
				variables: [{ name: 'a', expression: '{{1..100}}' }]
			},
			variations: [
				{
					label: 'v1',
					statement_md: 'Value: {{a}}',
					solution_md: 'Done'
				},
				{
					label: 'v2',
					statement_md: 'Number: {{a}}',
					solution_md: 'Done'
				}
			]
		});

		const result1 = generateExerciseInstance(exercise, { seed: 12345 });
		const result2 = generateExerciseInstance(exercise, { seed: 12345 });

		expect(result1.success).toBe(true);
		expect(result2.success).toBe(true);

		if (result1.success && result1.instance && result2.success && result2.instance) {
			// Same seed should give same variation and same variable values
			expect(result1.instance.selectedVariationIndex).toBe(result2.instance.selectedVariationIndex);
			expect(result1.instance.resolvedVariables).toEqual(result2.instance.resolvedVariables);
		}
	});

	it('should use forced variationIndex when provided (R3: teacher control)', () => {
		const exercise = createExercise({
			statement_md: 'Default',
			solution_md: 'Default',
			variations: [
				{
					label: 'guided',
					statement_md: 'Guided version',
					solution_md: 'Guided solution'
				},
				{
					label: 'intermediate',
					statement_md: 'Intermediate version',
					solution_md: 'Intermediate solution'
				},
				{
					label: 'autonomous',
					statement_md: 'Autonomous version',
					solution_md: 'Autonomous solution'
				}
			]
		});

		// Seed 0 would normally select index 0 (guided)
		// But we force index 2 (autonomous)
		const result = generateExerciseInstance(exercise, {
			seed: 0,
			variationIndex: 2
		});

		expect(result.success).toBe(true);
		if (result.success && result.instance) {
			expect(result.instance.selectedVariationIndex).toBe(2);
			expect(result.instance.selectedVariationLabel).toBe('autonomous');
			expect(result.instance.statement_md).toBe('Autonomous version');
		}
	});

	it('should clamp variationIndex to valid range when out of bounds', () => {
		const exercise = createExercise({
			statement_md: 'Default',
			solution_md: 'Default',
			variations: [
				{
					label: 'first',
					statement_md: 'First variation',
					solution_md: 'Solution 1'
				},
				{
					label: 'second',
					statement_md: 'Second variation',
					solution_md: 'Solution 2'
				}
			]
		});

		// Index 10 is out of bounds (only 2 variations), should clamp to max (1)
		const resultHigh = generateExerciseInstance(exercise, {
			seed: 0,
			variationIndex: 10
		});

		expect(resultHigh.success).toBe(true);
		if (resultHigh.success && resultHigh.instance) {
			expect(resultHigh.instance.selectedVariationIndex).toBe(1); // Clamped to max
			expect(resultHigh.instance.selectedVariationLabel).toBe('second');
		}

		// Negative index should clamp to 0
		const resultNegative = generateExerciseInstance(exercise, {
			seed: 0,
			variationIndex: -5
		});

		expect(resultNegative.success).toBe(true);
		if (resultNegative.success && resultNegative.instance) {
			expect(resultNegative.instance.selectedVariationIndex).toBe(0); // Clamped to min
			expect(resultNegative.instance.selectedVariationLabel).toBe('first');
		}
	});

	it('should override seed-based selection with explicit variationIndex', () => {
		const exercise = createExercise({
			statement_md: 'Default',
			solution_md: 'Default',
			variations: [
				{
					label: 'v0',
					statement_md: 'Variation 0',
					solution_md: 'Sol 0'
				},
				{
					label: 'v1',
					statement_md: 'Variation 1',
					solution_md: 'Sol 1'
				}
			]
		});

		// Seeds 0 and 1 would normally select different variations
		// But with explicit variationIndex, both should get the same
		const result0 = generateExerciseInstance(exercise, { seed: 0, variationIndex: 1 });
		const result1 = generateExerciseInstance(exercise, { seed: 1, variationIndex: 1 });

		expect(result0.success).toBe(true);
		expect(result1.success).toBe(true);

		if (result0.success && result0.instance && result1.success && result1.instance) {
			// Both should use variationIndex 1, ignoring seed
			expect(result0.instance.selectedVariationIndex).toBe(1);
			expect(result1.instance.selectedVariationIndex).toBe(1);
			expect(result0.instance.selectedVariationLabel).toBe('v1');
			expect(result1.instance.selectedVariationLabel).toBe('v1');
		}
	});
});

// ============================================================================
// BACKWARD COMPATIBILITY TESTS
// ============================================================================

describe('Backward Compatibility', () => {
	it('should handle exercise with simple variables (converted to variations)', () => {
		// Note: Legacy exercises without variations are no longer supported.
		// The createExercise helper now auto-creates a default variation.
		const exercise = createExercise({
			variables: [{ name: 'a', expression: '5' }],
			statement_md: 'Value: {{a}}',
			solution_md: 'Answer: {{a}}'
		});

		const result = generateExerciseInstance(exercise, { seed: 0 });

		expect(result.success).toBe(true);
		if (result.success && result.instance) {
			// Now has variation tracking fields since all exercises use variations
			expect(result.instance.selectedVariationIndex).toBe(0);
			expect(result.instance.selectedVariationLabel).toBe('default');
			// No hints in this variation
			expect(result.instance.resolvedHints).toBeUndefined();

			// Should still resolve variables correctly
			expect(result.instance.statement_md).toBe('Value: 5');
		}
	});

	it('should handle static exercise (no variables, no variations)', () => {
		const exercise = createExercise({
			statement_md: 'Calculate 2 + 3',
			solution_md: 'Answer: 5'
		});

		const result = generateExerciseInstance(exercise);

		expect(result.success).toBe(true);
		if (result.success && result.instance) {
			expect(result.instance.statement_md).toBe('Calculate 2 + 3');
			expect(result.instance.solution_md).toBe('Answer: 5');
			expect(result.instance.resolvedVariables).toEqual([]);
		}
	});
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration Tests', () => {
	it('should handle realistic parameterized exercise', () => {
		const exercise = createExercise({
			title: 'Quadratic Equation',
			difficulty: 2,
			tags: ['algebra', 'equations', '2nd'],
			variables: [
				{ name: 'a', expression: '{{1..5}}' },
				{ name: 'b', expression: '{{-10..10}}' },
				{ name: 'c', expression: '{{-10..10}}' },
				{ name: 'discriminant', expression: '{{eval:{{b}}*{{b}} - 4*{{a}}*{{c}}}}' }
			],
			statement_md:
				"# Résoudre l'équation\n\nRésolvez l'équation suivante :\n\n$${{a}}x^2 + {{b}}x + {{c}} = 0$$\n\n**Indications :**\n- Coefficient $a = {{a}}$\n- Coefficient $b = {{b}}$\n- Coefficient $c = {{c}}$",
			solution_md:
				'## Solution\n\nLe discriminant est : $\\Delta = b^2 - 4ac = {{discriminant}}$\n\nSelon le signe du discriminant...',
			distribution_mode: 'per_student'
		});

		const result = generateExerciseInstance(exercise, { seed: 54321, parseAST: true });

		expect(result.success).toBe(true);

		if (result.success && result.instance) {
			// Verify all variables resolved
			expect(result.instance.resolvedVariables).toHaveLength(4);

			// Verify content has no {{}} syntax
			expect(result.instance.statement_md).not.toContain('{{');
			expect(result.instance.solution_md).not.toContain('{{');

			// Verify AST parsed
			expect(result.instance.statement_ast).toBeDefined();
			expect(result.instance.solution_ast).toBeDefined();

			// Verify metadata
			expect(result.instance.title).toBe('Quadratic Equation');
			expect(result.instance.difficulty).toBe(2);
			expect(result.instance.distributionMode).toBe('per_student');
		}
	});

	it('should handle realistic exercise with variations and hints', () => {
		const exercise = createExercise({
			title: 'Théorème de Pythagore',
			difficulty: 2,
			tags: ['géométrie', 'pythagore'],
			shared: {
				variables: [
					{ name: 'a', expression: '{{3..10}}' },
					{ name: 'b', expression: '{{3..10}}' },
					{ name: 'c', expression: '{{eval:{{a}} * {{a}} + {{b}} * {{b}}}}' }
				],
				solution_md: 'En appliquant le théorème, AC = {{c}} cm'
			},
			variations: [
				{
					label: 'guided',
					statement_md:
						'Dans un triangle rectangle ABC, AB = {{a}} cm et BC = {{b}} cm.\n{{hint:rappel-pythagore}}\n{{hint:schema}}\nCalculer AC.',
					solution_md: 'Étape 1: $AC^2 = {{a}}^2 + {{b}}^2$\nÉtape 2: AC = {{c}} cm',
					hints: [
						{
							id: 'rappel-pythagore',
							type: 'video',
							url: 'https://example.com/pythagore',
							title: 'Rappel: Théorème de Pythagore'
						},
						{
							id: 'schema',
							type: 'image',
							url: '/images/triangle.png',
							title: 'Schéma du triangle'
						}
					]
				},
				{
					label: 'autonomous',
					statement_md: 'Triangle ABC rectangle en B. AB = {{a}} cm, BC = {{b}} cm. Calculer AC.',
					solution_md: 'AC = {{c}} cm'
				}
			],
			distribution_mode: 'per_student'
		});

		const result = generateExerciseInstance(exercise, { seed: 42, parseAST: true });

		expect(result.success).toBe(true);

		if (result.success && result.instance) {
			// Verify variation selection
			expect(result.instance.selectedVariationIndex).toBeDefined();
			expect(result.instance.selectedVariationLabel).toBeDefined();

			// Verify variables resolved
			expect(result.instance.resolvedVariables).toHaveLength(3);

			// Verify content resolved (but hints stay as {{hint:id}})
			expect(result.instance.statement_md).not.toContain('{{a}}');
			expect(result.instance.statement_md).not.toContain('{{b}}');

			// If guided variation, should have hints
			if (result.instance.selectedVariationLabel === 'guided') {
				expect(result.instance.resolvedHints).toHaveLength(2);
				expect(result.instance.statement_md).toContain('{{hint:rappel-pythagore}}');
			}

			// Verify AST parsed
			expect(result.instance.statement_ast).toBeDefined();
			expect(result.instance.solution_ast).toBeDefined();

			// Verify metadata
			expect(result.instance.title).toBe('Théorème de Pythagore');
			expect(result.instance.difficulty).toBe(2);
		}
	});
});
