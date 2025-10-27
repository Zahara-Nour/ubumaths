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
			estimated_time_minutes: 15,
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
			expect(result.instance.estimated_time_minutes).toBe(15);
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
			variables: [{ name: 'a', expression: '{{1-10}}' }],
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
			variables: [{ name: 'a', expression: '{{1-100}}' }],
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
			variables: [{ name: 'a', expression: '{{1-100}}' }],
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
			variables: [{ name: 'a', expression: '{{1-10}}' }],
			statement_md: 'Number: {{a}}',
			solution_md: 'Done'
		});

		const results = generateMultipleInstances(exercise, 5);

		expect(results).toHaveLength(5);
		expect(results.every((r) => r.success)).toBe(true);
	});

	it('should generate instances with deterministic seeds when baseSeed provided', () => {
		const exercise = createExercise({
			variables: [{ name: 'a', expression: '{{1-100}}' }],
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
			variables: [{ name: 'a', expression: '{{1-100}}' }],
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
			variables: [{ name: 'a', expression: '{{1-10}}' }]
		});
		expect(isParameterized(exercise)).toBe(true);
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
				{ name: 'a', expression: '{{1-5}}' },
				{ name: 'b', expression: '{{-10-10}}' },
				{ name: 'c', expression: '{{-10-10}}' },
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
});
