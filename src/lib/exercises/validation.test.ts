/**
 * Validation Tests - Exercise Import/Export
 * ===========================================
 *
 * Unit tests for Zod validation schemas used in exercise import/export.
 */

import { describe, it, expect } from 'vitest';
import { validateExerciseExport, validateExercisesArray } from './validation';
import type { ExerciseExport } from './types';

describe('validateExerciseExport', () => {
	it('should validate a valid exercise export', () => {
		const validExport: ExerciseExport = {
			version: '1.0',
			difficulty: 2,
			tags: ['algèbre', 'équations'],
			statement_md: 'Résoudre $x^2 = 4$',
			solution_md: '$x = \\pm 2$',
			title: 'Équation du second degré',
			source: 'Livre de maths',
			grade_levels: ['3', '2'],
			topic: 'Algèbre'
		};

		const result = validateExerciseExport(validExport);

		expect(result.success).toBe(true);
		expect(result.data).toEqual(validExport);
		expect(result.error).toBeUndefined();
	});

	it('should validate minimal valid exercise (only required fields)', () => {
		const minimalExport: ExerciseExport = {
			version: '1.0',
			difficulty: 1,
			tags: [],
			statement_md: 'Simple question',
			solution_md: 'Simple answer'
		};

		const result = validateExerciseExport(minimalExport);

		expect(result.success).toBe(true);
		expect(result.data).toEqual(minimalExport);
	});

	it('should reject invalid version', () => {
		const invalidExport = {
			version: '2.0', // Invalid version
			difficulty: 2,
			tags: [],
			statement_md: 'Test',
			solution_md: 'Test'
		};

		const result = validateExerciseExport(invalidExport);

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(result.error).toContain('version');
	});

	it('should reject invalid difficulty', () => {
		const invalidExport = {
			version: '1.0',
			difficulty: 5, // Must be 1, 2, or 3
			tags: [],
			statement_md: 'Test',
			solution_md: 'Test'
		};

		const result = validateExerciseExport(invalidExport);

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(result.error).toContain('difficulty');
	});

	it('should reject empty statement', () => {
		const invalidExport = {
			version: '1.0',
			difficulty: 2,
			tags: [],
			statement_md: '   ', // Empty after trim
			solution_md: 'Test'
		};

		const result = validateExerciseExport(invalidExport);

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(result.error).toContain('statement');
	});

	it('should reject empty solution', () => {
		const invalidExport = {
			version: '1.0',
			difficulty: 2,
			tags: [],
			statement_md: 'Test',
			solution_md: '' // Empty
		};

		const result = validateExerciseExport(invalidExport);

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(result.error).toContain('solution');
	});

	it('should reject non-array tags', () => {
		const invalidExport = {
			version: '1.0',
			difficulty: 2,
			tags: 'not an array',
			statement_md: 'Test',
			solution_md: 'Test'
		};

		const result = validateExerciseExport(invalidExport);

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});

	it('should trim whitespace from strings', () => {
		const exportWithWhitespace = {
			version: '1.0',
			difficulty: 2,
			tags: ['  algèbre  ', 'équations'],
			statement_md: '  Test question  ',
			solution_md: '  Test answer  ',
			title: '  Title with spaces  '
		};

		const result = validateExerciseExport(exportWithWhitespace);

		expect(result.success).toBe(true);
		expect(result.data?.statement_md).toBe('Test question');
		expect(result.data?.solution_md).toBe('Test answer');
		expect(result.data?.title).toBe('Title with spaces');
		expect(result.data?.tags).toContain('algèbre');
		expect(result.data?.tags).not.toContain('  algèbre  ');
	});

	it('should handle optional fields as undefined when not provided', () => {
		const minimalExport = {
			version: '1.0',
			difficulty: 1,
			tags: [],
			statement_md: 'Test',
			solution_md: 'Test'
		};

		const result = validateExerciseExport(minimalExport);

		expect(result.success).toBe(true);
		expect(result.data?.title).toBeUndefined();
		expect(result.data?.source).toBeUndefined();
		expect(result.data?.grade_levels).toBeUndefined();
		expect(result.data?.topic).toBeUndefined();
	});
});

describe('validateExercisesArray', () => {
	it('should validate array of valid exercises', () => {
		const exercises: ExerciseExport[] = [
			{
				version: '1.0',
				difficulty: 1,
				tags: [],
				statement_md: 'Question 1',
				solution_md: 'Answer 1'
			},
			{
				version: '1.0',
				difficulty: 2,
				tags: ['test'],
				statement_md: 'Question 2',
				solution_md: 'Answer 2'
			}
		];

		const result = validateExercisesArray(exercises);

		expect(result.success).toBe(true);
		expect(result.data).toHaveLength(2);
		expect(result.error).toBeUndefined();
	});

	it('should reject non-array input', () => {
		const notAnArray = {
			version: '1.0',
			difficulty: 1,
			tags: [],
			statement_md: 'Test',
			solution_md: 'Test'
		};

		const result = validateExercisesArray(notAnArray);

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(result.error).toContain('array');
	});

	it('should reject array with invalid exercise', () => {
		const exercises = [
			{
				version: '1.0',
				difficulty: 1,
				tags: [],
				statement_md: 'Valid',
				solution_md: 'Valid'
			},
			{
				version: '1.0',
				difficulty: 99, // Invalid difficulty
				tags: [],
				statement_md: 'Invalid',
				solution_md: 'Invalid'
			}
		];

		const result = validateExercisesArray(exercises);

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});

	it('should reject empty array', () => {
		const result = validateExercisesArray([]);

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(result.error).toContain('At least one');
	});
});
