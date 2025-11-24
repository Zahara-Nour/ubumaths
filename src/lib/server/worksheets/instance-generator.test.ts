/**
 * Tests for the worksheet instance generator
 */

import { describe, it, expect } from 'vitest';
import { generateWorksheetInstance, generatePreviewInstance } from './instance-generator';
import type { WorksheetExerciseWithExercise } from '$lib/types/worksheets';

describe('Instance Generator', () => {
	// Mock worksheet exercises with parameterized content
	const mockExercises: WorksheetExerciseWithExercise[] = [
		{
			id: 'we1',
			worksheet_id: 'w1',
			exercise_id: 'e1',
			section_id: null,
			position: 0,
			points: 5,
			variant_mode: 'individual',
			variant_config: {},
			custom_instructions: null,
			created_at: '2024-01-01',
			updated_at: '2024-01-01',
			exercise: {
				id: 'e1',
				title: 'Addition simple',
				statement_md: 'Calculer {{a}} + {{b}}',
				solution_md: '{{a}} + {{b}} = {{sum}}',
				difficulty: 1,
				variables: [
					{ name: 'a', expression: '{{random:1-10}}' },
					{ name: 'b', expression: '{{random:1-10}}' },
					{ name: 'sum', expression: '{{eval:a+b}}' }
				]
			}
		},
		{
			id: 'we2',
			worksheet_id: 'w1',
			exercise_id: 'e2',
			section_id: null,
			position: 1,
			points: 5,
			variant_mode: 'individual',
			variant_config: {},
			custom_instructions: null,
			created_at: '2024-01-01',
			updated_at: '2024-01-01',
			exercise: {
				id: 'e2',
				title: 'Multiplication',
				statement_md: 'Calculer {{x}} × {{y}}',
				solution_md: '{{x}} × {{y}} = {{product}}',
				difficulty: 2,
				variables: [
					{ name: 'x', expression: '{{random:2-9}}' },
					{ name: 'y', expression: '{{random:2-9}}' },
					{ name: 'product', expression: '{{eval:x*y}}' }
				]
			}
		}
	];

	describe('generateWorksheetInstance', () => {
		it('should generate instance with resolved parameters', () => {
			const params = {
				worksheetId: 'worksheet-123',
				studentId: 'student-456',
				exercises: mockExercises,
				config: {}
			};

			const instance = generateWorksheetInstance(params);

			// Check structure
			expect(instance).toHaveProperty('exercises');
			expect(instance).toHaveProperty('variant_info');
			expect(instance.exercises).toHaveLength(2);

			// Check first exercise
			const ex1 = instance.exercises[0];
			expect(ex1.exercise_id).toBe('e1');
			expect(ex1.position).toBe(0);
			expect(ex1.parameters).toHaveProperty('a');
			expect(ex1.parameters).toHaveProperty('b');
			expect(typeof ex1.parameters.a).toBe('string');
			expect(typeof ex1.parameters.b).toBe('string');

			// Check that statement is resolved (no more {{}} tokens)
			expect(ex1.statement).not.toContain('{{');
			expect(ex1.statement).toMatch(/Calculer \d+ \+ \d+/);

			// Check that solution is resolved
			expect(ex1.solution).not.toContain('{{');
			expect(ex1.solution).toMatch(/\d+ \+ \d+ = \d+/);
		});

		it('should generate deterministic results with same seed', () => {
			const params = {
				worksheetId: 'worksheet-123',
				studentId: 'student-456',
				exercises: mockExercises,
				config: {}
			};

			const instance1 = generateWorksheetInstance(params);
			const instance2 = generateWorksheetInstance(params);

			// Same inputs should produce same outputs
			expect(instance1.exercises[0].parameters).toEqual(instance2.exercises[0].parameters);
			expect(instance1.exercises[0].statement).toBe(instance2.exercises[0].statement);
			expect(instance1.variant_info?.seed).toBe(instance2.variant_info?.seed);
		});

		it('should generate different results for different students', () => {
			const params1 = {
				worksheetId: 'worksheet-123',
				studentId: 'student-456',
				exercises: mockExercises,
				config: {}
			};

			const params2 = {
				...params1,
				studentId: 'student-789'
			};

			const instance1 = generateWorksheetInstance(params1);
			const instance2 = generateWorksheetInstance(params2);

			// Different students should get different parameters (with high probability)
			// Note: There's a small chance they could be the same due to random generation
			expect(instance1.variant_info?.seed).not.toBe(instance2.variant_info?.seed);
		});

		it('should handle variant mode: none (same for all)', () => {
			const exercisesWithNone = mockExercises.map((e) => ({
				...e,
				variant_mode: 'none' as const
			}));

			const params1 = {
				worksheetId: 'worksheet-123',
				studentId: 'student-456',
				exercises: exercisesWithNone,
				config: {}
			};

			const params2 = {
				...params1,
				studentId: 'student-789'
			};

			const instance1 = generateWorksheetInstance(params1);
			const instance2 = generateWorksheetInstance(params2);

			// With 'none' mode, all students should get the same parameters
			expect(instance1.exercises[0].parameters).toEqual(instance2.exercises[0].parameters);
		});

		it('should handle variant mode: n_versions', () => {
			const exercisesWithVersions = mockExercises.map((e) => ({
				...e,
				variant_mode: 'n_versions' as const,
				variant_config: { mode: 'n_versions' as const, n_versions: 3 }
			}));

			const params = {
				worksheetId: 'worksheet-123',
				studentId: 'student-456',
				exercises: exercisesWithVersions,
				config: {}
			};

			const instance = generateWorksheetInstance(params);

			// Should have a version identifier
			expect(instance.variant_info?.version).toMatch(/^[A-C]$/);
		});

		it('should shuffle exercises when configured', () => {
			const params = {
				worksheetId: 'worksheet-123',
				studentId: 'student-456',
				exercises: mockExercises,
				config: {
					shuffle_exercises: true
				}
			};

			const instance = generateWorksheetInstance(params);

			// Should have exercise_order array
			expect(instance.exercise_order).toBeDefined();
			expect(instance.exercise_order).toHaveLength(2);

			// Order might be shuffled (though not guaranteed with only 2 exercises)
			expect(instance.exercise_order).toContain(0);
			expect(instance.exercise_order).toContain(1);
		});

		it('should handle exercises with no variables', () => {
			const staticExercises: WorksheetExerciseWithExercise[] = [
				{
					...mockExercises[0],
					exercise: {
						id: 'e3',
						title: 'Static exercise',
						statement_md: 'What is 2 + 2?',
						solution_md: '2 + 2 = 4',
						difficulty: 1,
						variables: []
					}
				}
			];

			const params = {
				worksheetId: 'worksheet-123',
				studentId: 'student-456',
				exercises: staticExercises,
				config: {}
			};

			const instance = generateWorksheetInstance(params);

			// Should handle static content without errors
			expect(instance.exercises[0].statement).toBe('What is 2 + 2?');
			expect(instance.exercises[0].solution).toBe('2 + 2 = 4');
			expect(instance.exercises[0].parameters).toEqual({});
		});
	});

	describe('generatePreviewInstance', () => {
		it('should generate preview with custom seed', () => {
			const params = {
				worksheetId: 'worksheet-123',
				exercises: mockExercises,
				config: {},
				variantSeed: 12345
			};

			const instance = generatePreviewInstance(params);

			// Check that it uses the provided seed
			expect(instance.variant_info?.seed).toBe(12345);
			expect(instance.variant_info?.version).toBe('Preview');

			// Should have resolved content
			expect(instance.exercises[0].statement).not.toContain('{{');
		});

		it('should generate preview without student ID', () => {
			const params = {
				worksheetId: 'worksheet-123',
				exercises: mockExercises,
				config: {}
			};

			const instance = generatePreviewInstance(params);

			// Should work without student ID
			expect(instance).toHaveProperty('exercises');
			expect(instance.exercises).toHaveLength(2);
		});

		it('should generate deterministic preview with same seed', () => {
			const params = {
				worksheetId: 'worksheet-123',
				exercises: mockExercises,
				config: {},
				variantSeed: 99999
			};

			const instance1 = generatePreviewInstance(params);
			const instance2 = generatePreviewInstance(params);

			// Same seed should produce same results
			expect(instance1.exercises[0].parameters).toEqual(instance2.exercises[0].parameters);
			expect(instance1.exercises[0].statement).toBe(instance2.exercises[0].statement);
		});
	});

	describe('Edge cases', () => {
		it('should handle empty exercises array', () => {
			const params = {
				worksheetId: 'worksheet-123',
				studentId: 'student-456',
				exercises: [],
				config: {}
			};

			const instance = generateWorksheetInstance(params);

			expect(instance.exercises).toEqual([]);
		});

		it('should handle missing exercise data gracefully', () => {
			const invalidExercises: WorksheetExerciseWithExercise[] = [
				{
					...mockExercises[0],
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					exercise: undefined as any
				}
			];

			const params = {
				worksheetId: 'worksheet-123',
				studentId: 'student-456',
				exercises: invalidExercises,
				config: {}
			};

			// Should throw an error for missing exercise
			expect(() => generateWorksheetInstance(params)).toThrow();
		});

		it('should handle complex parameter expressions', () => {
			const complexExercises: WorksheetExerciseWithExercise[] = [
				{
					...mockExercises[0],
					exercise: {
						id: 'e4',
						title: 'Complex parameters',
						statement_md: 'Le résultat est {{result}}',
						solution_md: 'Détails: a={{a}}, b={{b}}, sum={{sum}}',
						difficulty: 3,
						variables: [
							{ name: 'a', expression: '{{random:10-20}}' },
							{ name: 'b', expression: '{{random:5-15}}' },
							{ name: 'sum', expression: '{{eval:a+b}}' },
							{ name: 'result', expression: '{{eval:(a+b)*2}}' }
						]
					}
				}
			];

			const params = {
				worksheetId: 'worksheet-123',
				studentId: 'student-456',
				exercises: complexExercises,
				config: {}
			};

			const instance = generateWorksheetInstance(params);

			// Should resolve complex chains
			expect(instance.exercises[0].statement).toMatch(/Le résultat est \d+/);
			expect(instance.exercises[0].parameters).toHaveProperty('a');
			expect(instance.exercises[0].parameters).toHaveProperty('b');
			expect(instance.exercises[0].parameters).toHaveProperty('sum');
			expect(instance.exercises[0].parameters).toHaveProperty('result');

			// Verify calculations are correct
			const a = parseInt(instance.exercises[0].parameters.a as string);
			const b = parseInt(instance.exercises[0].parameters.b as string);
			const sum = parseInt(instance.exercises[0].parameters.sum as string);
			const result = parseInt(instance.exercises[0].parameters.result as string);

			expect(sum).toBe(a + b);
			expect(result).toBe(sum * 2);
		});
	});
});
