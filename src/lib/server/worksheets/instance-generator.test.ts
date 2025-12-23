/**
 * Tests for the worksheet instance generator
 */

import { describe, it, expect } from 'vitest';
import { generateWorksheetInstance, generatePreviewInstance } from './instance-generator';
import type { WorksheetExerciseWithExercise } from '$lib/types/worksheets';
import type { Variable } from '$lib/ubumark';
import type { ExerciseHint, ExerciseVariation, SharedExerciseDefaults } from '$lib/exercises/types';

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
			correction_visible: true,
			variation_index: null,
			created_at: '2024-01-01',
			updated_at: '2024-01-01',
			exercise: {
				id: 'e1',
				title: 'Addition simple',
				statement_md: 'Calculer {{a}} + {{b}}',
				solution_md: '{{a}} + {{b}} = {{sum}}',
				difficulty: 1,
				variables: [
					{ name: 'a', expression: '{{random:1..10}}' },
					{ name: 'b', expression: '{{random:1..10}}' },
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
			correction_visible: true,
			variation_index: null,
			created_at: '2024-01-01',
			updated_at: '2024-01-01',
			exercise: {
				id: 'e2',
				title: 'Multiplication',
				statement_md: 'Calculer {{x}} × {{y}}',
				solution_md: '{{x}} × {{y}} = {{product}}',
				difficulty: 2,
				variables: [
					{ name: 'x', expression: '{{random:2..9}}' },
					{ name: 'y', expression: '{{random:2..9}}' },
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
							{ name: 'a', expression: '{{random:10..20}}' },
							{ name: 'b', expression: '{{random:5..15}}' },
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

	// =========================================================================
	// NEW TESTS: Strong Typing (R1)
	// =========================================================================
	describe('Strong typing with Variable[]', () => {
		it('should accept properly typed Variable[] in exercise', () => {
			// This test verifies compile-time type safety
			const typedVariables: Variable[] = [
				{ name: 'x', expression: '{{random:1..10}}' },
				{ name: 'y', expression: '{{eval:x*2}}' }
			];

			const typedExercises: WorksheetExerciseWithExercise[] = [
				{
					...mockExercises[0],
					exercise: {
						id: 'typed-ex',
						title: 'Typed exercise',
						statement_md: 'x = {{x}}, y = {{y}}',
						solution_md: 'y = 2x',
						difficulty: 1,
						variables: typedVariables // Should be Variable[], not unknown[]
					}
				}
			];

			const params = {
				worksheetId: 'worksheet-typed',
				studentId: 'student-typed',
				exercises: typedExercises,
				config: {}
			};

			const instance = generateWorksheetInstance(params);

			expect(instance.exercises[0].statement).toMatch(/x = \d+, y = \d+/);
			const x = parseInt(instance.exercises[0].parameters.x as string);
			const y = parseInt(instance.exercises[0].parameters.y as string);
			expect(y).toBe(x * 2);
		});
	});

	// =========================================================================
	// NEW TESTS: Variations Support
	// =========================================================================
	describe('Exercise variations support', () => {
		const exerciseWithVariations: WorksheetExerciseWithExercise = {
			id: 'we-var',
			worksheet_id: 'w1',
			exercise_id: 'e-var',
			section_id: null,
			position: 0,
			points: 10,
			variant_mode: 'individual',
			variant_config: {},
			custom_instructions: null,
			correction_visible: true,
			variation_index: null, // Seed-based selection (default)
			created_at: '2024-01-01',
			updated_at: '2024-01-01',
			exercise: {
				id: 'e-var',
				title: 'Exercise with variations',
				statement_md: '', // Will be overridden by variation
				solution_md: 'AC = {{result}} cm',
				difficulty: 2,
				variables: [
					{ name: 'a', expression: '{{random:3..10}}' },
					{ name: 'b', expression: '{{random:3..10}}' }
				],
				shared: {
					variables: [
						{ name: 'a', expression: '{{random:3..10}}' },
						{ name: 'b', expression: '{{random:3..10}}' }
					],
					solution_md: 'AC = {{result}} cm'
				} as SharedExerciseDefaults,
				variations: [
					{
						label: 'guided',
						statement_md: 'Avec aide: Calculer AC sachant AB={{a}} et BC={{b}}',
						variables: [{ name: 'result', expression: '{{eval:a+b}}' }],
						hints: [
							{
								id: 'rappel',
								type: 'link', // Valid ExerciseResourceType
								url: '#',
								title: 'Rappel'
							}
						] as ExerciseHint[]
					},
					{
						label: 'autonomous',
						statement_md: 'Calculer AC sachant AB={{a}} et BC={{b}}',
						variables: [{ name: 'result', expression: '{{eval:a+b}}' }]
					}
				] as ExerciseVariation[]
			}
		};

		it('should select a variation based on seed', () => {
			const params = {
				worksheetId: 'worksheet-var',
				studentId: 'student-var',
				exercises: [exerciseWithVariations],
				config: {}
			};

			const instance = generateWorksheetInstance(params);

			// Should have resolved content from selected variation
			expect(instance.exercises[0].statement).not.toContain('{{');
			expect(instance.exercises[0].statement).toMatch(/Calculer AC/);

			// Should include variation info
			expect(instance.exercises[0]).toHaveProperty('selectedVariationIndex');
			expect(instance.exercises[0]).toHaveProperty('selectedVariationLabel');
			expect(['guided', 'autonomous']).toContain(instance.exercises[0].selectedVariationLabel);
		});

		it('should include hints from selected variation', () => {
			// Use a seed that selects the 'guided' variation (with hints)
			// We need to find a studentId that gives us the guided variation
			let guidedInstance = null;

			// Try multiple student IDs to find one that selects 'guided'
			for (let i = 0; i < 20; i++) {
				const params = {
					worksheetId: 'worksheet-var',
					studentId: `student-${i}`,
					exercises: [exerciseWithVariations],
					config: {}
				};

				const instance = generateWorksheetInstance(params);
				if (instance.exercises[0].selectedVariationLabel === 'guided') {
					guidedInstance = instance;
					break;
				}
			}

			// Should have found a guided instance
			expect(guidedInstance).not.toBeNull();
			expect(guidedInstance!.exercises[0].hints).toBeDefined();
			expect(guidedInstance!.exercises[0].hints).toHaveLength(1);
			expect(guidedInstance!.exercises[0].hints![0].id).toBe('rappel');
		});

		it('should deterministically select same variation for same seed', () => {
			const params = {
				worksheetId: 'worksheet-var',
				studentId: 'student-deterministic',
				exercises: [exerciseWithVariations],
				config: {}
			};

			const instance1 = generateWorksheetInstance(params);
			const instance2 = generateWorksheetInstance(params);

			expect(instance1.exercises[0].selectedVariationIndex).toBe(
				instance2.exercises[0].selectedVariationIndex
			);
			expect(instance1.exercises[0].selectedVariationLabel).toBe(
				instance2.exercises[0].selectedVariationLabel
			);
		});

		it('should use forced variation_index when set by teacher (R3)', () => {
			// Create exercise with variation_index set to force 'autonomous' (index 1)
			const exerciseWithForcedVariation: WorksheetExerciseWithExercise = {
				...exerciseWithVariations,
				id: 'we-forced-var',
				variation_index: 1 // Force 'autonomous' variation
			};

			const params = {
				worksheetId: 'worksheet-forced-var',
				studentId: 'student-1',
				exercises: [exerciseWithForcedVariation],
				config: {}
			};

			const instance = generateWorksheetInstance(params);

			// Should use the forced variation (index 1 = autonomous)
			expect(instance.exercises[0].selectedVariationIndex).toBe(1);
			expect(instance.exercises[0].selectedVariationLabel).toBe('autonomous');
			expect(instance.exercises[0].statement).toContain('Calculer AC sachant AB=');

			// Different student should get the SAME forced variation
			const params2 = {
				worksheetId: 'worksheet-forced-var',
				studentId: 'student-different',
				exercises: [exerciseWithForcedVariation],
				config: {}
			};

			const instance2 = generateWorksheetInstance(params2);
			expect(instance2.exercises[0].selectedVariationIndex).toBe(1);
			expect(instance2.exercises[0].selectedVariationLabel).toBe('autonomous');
		});

		it('should use seed-based selection when variation_index is null', () => {
			// Create exercise without forced variation_index
			const exerciseWithNullVariation: WorksheetExerciseWithExercise = {
				...exerciseWithVariations,
				id: 'we-null-var',
				variation_index: null // Seed-based selection
			};

			const params = {
				worksheetId: 'worksheet-null-var',
				studentId: 'student-1',
				exercises: [exerciseWithNullVariation],
				config: {}
			};

			const instance1 = generateWorksheetInstance(params);

			// Different student should potentially get different variation (seed-based)
			const params2 = {
				worksheetId: 'worksheet-null-var',
				studentId: 'student-very-different-id',
				exercises: [exerciseWithNullVariation],
				config: {}
			};

			const instance2 = generateWorksheetInstance(params2);

			// Both should have valid variation info (whether same or different)
			expect(instance1.exercises[0].selectedVariationIndex).toBeDefined();
			expect(instance2.exercises[0].selectedVariationIndex).toBeDefined();
			expect(['guided', 'autonomous']).toContain(instance1.exercises[0].selectedVariationLabel);
			expect(['guided', 'autonomous']).toContain(instance2.exercises[0].selectedVariationLabel);
		});
	});

	// =========================================================================
	// NEW TESTS: AST Support
	// =========================================================================
	describe('AST (Abstract Syntax Tree) support', () => {
		it('should include statement_ast and solution_ast in resolved exercises', () => {
			const params = {
				worksheetId: 'worksheet-ast',
				studentId: 'student-ast',
				exercises: mockExercises,
				config: {}
			};

			const instance = generateWorksheetInstance(params);

			// Should have AST for both statement and solution
			expect(instance.exercises[0]).toHaveProperty('statement_ast');
			expect(instance.exercises[0]).toHaveProperty('solution_ast');

			// AST should be a DocumentNode
			expect(instance.exercises[0].statement_ast).toHaveProperty('type', 'document');
			expect(instance.exercises[0].statement_ast).toHaveProperty('children');
			expect(Array.isArray(instance.exercises[0].statement_ast!.children)).toBe(true);

			expect(instance.exercises[0].solution_ast).toHaveProperty('type', 'document');
			expect(instance.exercises[0].solution_ast).toHaveProperty('children');
		});

		it('should have AST that matches the resolved content', () => {
			const staticExercises: WorksheetExerciseWithExercise[] = [
				{
					...mockExercises[0],
					exercise: {
						id: 'e-static-ast',
						title: 'Static for AST test',
						statement_md: 'Calculate $2 + 3$',
						solution_md: 'The answer is $5$',
						difficulty: 1,
						variables: []
					}
				}
			];

			const params = {
				worksheetId: 'worksheet-ast-static',
				studentId: 'student-ast',
				exercises: staticExercises,
				config: {}
			};

			const instance = generateWorksheetInstance(params);

			// The AST should contain the math content
			const statementAst = instance.exercises[0].statement_ast;
			expect(statementAst).toBeDefined();

			// Verify structure has paragraph with content
			expect(statementAst!.children.length).toBeGreaterThan(0);
		});

		it('should generate AST for preview instances too', () => {
			const params = {
				worksheetId: 'worksheet-ast-preview',
				exercises: mockExercises,
				config: {},
				variantSeed: 12345
			};

			const instance = generatePreviewInstance(params);

			expect(instance.exercises[0]).toHaveProperty('statement_ast');
			expect(instance.exercises[0]).toHaveProperty('solution_ast');
			expect(instance.exercises[0].statement_ast).toHaveProperty('type', 'document');
		});
	});
});
