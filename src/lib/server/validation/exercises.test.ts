/**
 * Tests for exercise validation schemas
 */

import { describe, it, expect } from 'vitest';
import {
	createExerciseSchema,
	updateExerciseSchema,
	listExercisesQuerySchema,
	bulkAssignSchema,
	singleAssignSchema,
	assignmentQuerySchema,
	studentExerciseFiltersSchema,
	exportExercisesSchema,
	viewExerciseSchema,
	updateAssignmentSchema,
	exerciseResponseSchema,
	exerciseListResponseSchema,
	importExercisesSchema
} from './exercises';

describe('exercise validation schemas', () => {
	// ============================================================================
	// CREATE & UPDATE SCHEMAS
	// ============================================================================

	describe('createExerciseSchema', () => {
		it('should accept valid exercise data', () => {
			const data = {
				statement_md: '# Problem\nSolve for x: 2x + 3 = 7',
				solution_md: '# Solution\nx = 2',
				difficulty: 1,
				tags: ['algebra', 'equations'],
				grade_levels: ['6eme', '5eme'],
				topic: 'Linear Equations',
				source: 'Textbook Chapter 3',
				title: 'Simple Linear Equation',
				variables: { x: 2 },
				is_public: false
			};

			const result = createExerciseSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept minimal exercise data', () => {
			const data = {
				statement_md: 'Problem statement',
				solution_md: 'Solution',
				difficulty: 2
			};

			const result = createExerciseSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should use default values', () => {
			const data = {
				statement_md: 'Problem',
				solution_md: 'Solution',
				difficulty: 1
			};

			const result = createExerciseSchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.is_public).toBe(false);
				expect(result.data.tags).toEqual([]);
			}
		});

		it('should reject empty statement', () => {
			const data = {
				statement_md: '   ',
				solution_md: 'Solution',
				difficulty: 1
			};

			const result = createExerciseSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject empty solution', () => {
			const data = {
				statement_md: 'Problem',
				solution_md: '   ',
				difficulty: 1
			};

			const result = createExerciseSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid difficulty', () => {
			const invalidDifficulties = [0, 4, -1, 1.5, '2'];
			invalidDifficulties.forEach((difficulty) => {
				const data = {
					statement_md: 'Problem',
					solution_md: 'Solution',
					difficulty
				};

				const result = createExerciseSchema.safeParse(data);
				expect(result.success).toBe(false);
			});
		});

		it('should accept all valid difficulties', () => {
			[1, 2, 3].forEach((difficulty) => {
				const data = {
					statement_md: 'Problem',
					solution_md: 'Solution',
					difficulty
				};

				const result = createExerciseSchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});

		it('should reject too many tags', () => {
			const data = {
				statement_md: 'Problem',
				solution_md: 'Solution',
				difficulty: 1,
				tags: Array.from({ length: 21 }, (_, i) => `tag${i}`)
			};

			const result = createExerciseSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject tag exceeding max length', () => {
			const data = {
				statement_md: 'Problem',
				solution_md: 'Solution',
				difficulty: 1,
				tags: ['a'.repeat(51)]
			};

			const result = createExerciseSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject statement exceeding max length', () => {
			const data = {
				statement_md: 'a'.repeat(50001),
				solution_md: 'Solution',
				difficulty: 1
			};

			const result = createExerciseSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('updateExerciseSchema', () => {
		it('should accept partial updates', () => {
			const partialUpdates = [
				{ title: 'Updated Title' },
				{ difficulty: 3 },
				{ is_public: true },
				{ tags: ['new-tag'] }
			];

			partialUpdates.forEach((update) => {
				const result = updateExerciseSchema.safeParse(update);
				expect(result.success).toBe(true);
			});
		});

		it('should accept empty object', () => {
			const result = updateExerciseSchema.safeParse({});
			expect(result.success).toBe(true);
		});
	});

	// ============================================================================
	// QUERY SCHEMAS
	// ============================================================================

	describe('listExercisesQuerySchema', () => {
		it('should accept valid query parameters', () => {
			const data = {
				page: 2,
				limit: 25,
				difficulty: 1,
				grade_levels: '6eme,5eme',
				topic: 'Algebra',
				tags: 'equations,linear',
				search: 'solve for x'
			};

			const result = listExercisesQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should use default pagination', () => {
			const result = listExercisesQuerySchema.safeParse({});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.page).toBe(1);
				expect(result.data.limit).toBe(50);
			}
		});

		it('should coerce string numbers', () => {
			const data = {
				page: '3',
				limit: '10',
				difficulty: '2'
			};

			const result = listExercisesQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(typeof result.data.page).toBe('number');
				expect(typeof result.data.limit).toBe('number');
				expect(typeof result.data.difficulty).toBe('number');
			}
		});

		it('should reject invalid difficulty', () => {
			const data = {
				difficulty: 4
			};

			const result = listExercisesQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject search exceeding max length', () => {
			const data = {
				search: 'a'.repeat(201)
			};

			const result = listExercisesQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	// ============================================================================
	// ASSIGNMENT SCHEMAS
	// ============================================================================

	describe('bulkAssignSchema', () => {
		it('should accept assignment with students', () => {
			const data = {
				students: ['550e8400-e29b-41d4-a716-446655440000', '6ba7b810-9dad-11d1-80b4-00c04fd430c8']
			};

			const result = bulkAssignSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept assignment with classes', () => {
			const data = {
				classes: ['550e8400-e29b-41d4-a716-446655440000']
			};

			const result = bulkAssignSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept make_public only', () => {
			const data = {
				make_public: true
			};

			const result = bulkAssignSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept optional fields', () => {
			const data = {
				students: ['550e8400-e29b-41d4-a716-446655440000'],
				optional_deadline: '2025-12-31T23:59:59Z',
				notes: 'Complete by end of month'
			};

			const result = bulkAssignSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject assignment with no targets', () => {
			const data = {
				notes: 'No targets specified'
			};

			const result = bulkAssignSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject too many students', () => {
			const data = {
				students: Array.from(
					{ length: 201 },
					(_, i) => `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, '0')}`
				)
			};

			const result = bulkAssignSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject too many classes', () => {
			const data = {
				classes: Array.from(
					{ length: 51 },
					(_, i) => `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, '0')}`
				)
			};

			const result = bulkAssignSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid datetime format', () => {
			const data = {
				students: ['550e8400-e29b-41d4-a716-446655440000'],
				optional_deadline: '2025-12-31' // Missing time
			};

			const result = bulkAssignSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('singleAssignSchema', () => {
		it('should accept student assignment', () => {
			const data = {
				assigned_to_type: 'student',
				student_id: '550e8400-e29b-41d4-a716-446655440000'
			};

			const result = singleAssignSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept class assignment', () => {
			const data = {
				assigned_to_type: 'class',
				class_id: '550e8400-e29b-41d4-a716-446655440000'
			};

			const result = singleAssignSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept public assignment', () => {
			const data = {
				assigned_to_type: 'public'
			};

			const result = singleAssignSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject student assignment without student_id', () => {
			const data = {
				assigned_to_type: 'student'
				// Missing student_id
			};

			const result = singleAssignSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject class assignment without class_id', () => {
			const data = {
				assigned_to_type: 'class'
				// Missing class_id
			};

			const result = singleAssignSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should accept optional fields', () => {
			const data = {
				assigned_to_type: 'student',
				student_id: '550e8400-e29b-41d4-a716-446655440000',
				optional_deadline: '2025-12-31T23:59:59Z',
				notes: 'Priority assignment'
			};

			const result = singleAssignSchema.safeParse(data);
			expect(result.success).toBe(true);
		});
	});

	describe('assignmentQuerySchema', () => {
		it('should accept valid filters', () => {
			const data = {
				type: 'student',
				active: 'true',
				has_deadline: 'false'
			};

			const result = assignmentQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should transform string booleans', () => {
			const data = {
				active: 'true',
				has_deadline: 'false'
			};

			const result = assignmentQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.active).toBe(true);
				expect(result.data.has_deadline).toBe(false);
			}
		});

		it('should accept empty query', () => {
			const result = assignmentQuerySchema.safeParse({});
			expect(result.success).toBe(true);
		});
	});

	describe('studentExerciseFiltersSchema', () => {
		it('should accept valid filters', () => {
			const data = {
				completed: 'true',
				assigned_only: 'false',
				public: 'true',
				has_deadline: 'false',
				search: 'algebra'
			};

			const result = studentExerciseFiltersSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should transform string booleans', () => {
			const data = {
				completed: 'true',
				assigned_only: 'false'
			};

			const result = studentExerciseFiltersSchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.completed).toBe(true);
				expect(result.data.assigned_only).toBe(false);
			}
		});
	});

	// ============================================================================
	// IMPORT/EXPORT SCHEMAS
	// ============================================================================

	describe('importExercisesSchema', () => {
		it('should accept JSON format with string content', () => {
			const data = {
				format: 'json',
				content: '{"exercise": "data"}',
				options: {
					on_duplicate: 'skip',
					validate: true
				}
			};

			const result = importExercisesSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept JSON format with stringified object content', () => {
			const data = {
				format: 'json',
				content: JSON.stringify({ exercise: 'data', statement: 'Problem' }),
				options: {
					on_duplicate: 'replace'
				}
			};

			const result = importExercisesSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept markdown format', () => {
			const data = {
				format: 'markdown',
				content: '# Exercise\nSolve for x'
			};

			const result = importExercisesSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept missing options (defaults handled by endpoint)', () => {
			const data = {
				format: 'json',
				content: '{"test": "data"}'
			};

			const result = importExercisesSchema.safeParse(data);
			expect(result.success).toBe(true);
			// Options are optional at schema level (undefined if not provided)
			// Defaults are applied in the API endpoint logic, not the schema
		});

		it('should accept all on_duplicate values', () => {
			const onDuplicateValues = ['skip', 'replace', 'create-copy'];

			onDuplicateValues.forEach((on_duplicate) => {
				const data = {
					format: 'json',
					content: '{}',
					options: { on_duplicate }
				};

				const result = importExercisesSchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});

		it('should accept validate option', () => {
			[true, false].forEach((validate) => {
				const data = {
					format: 'json',
					content: '{}',
					options: { validate }
				};

				const result = importExercisesSchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});

		it('should accept missing options', () => {
			const data = {
				format: 'json',
				content: '{}'
			};

			const result = importExercisesSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject invalid format', () => {
			const data = {
				format: 'xml',
				content: '{}'
			};

			const result = importExercisesSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject empty content', () => {
			const data = {
				format: 'json',
				content: ''
			};

			const result = importExercisesSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid on_duplicate value', () => {
			const data = {
				format: 'json',
				content: '{}',
				options: {
					on_duplicate: 'invalid'
				}
			};

			const result = importExercisesSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should accept stringified complex object', () => {
			const data = {
				format: 'json',
				content: JSON.stringify({
					exercises: [
						{ id: '1', statement: 'Problem 1' },
						{ id: '2', statement: 'Problem 2' }
					],
					metadata: { author: 'Teacher', date: '2025-01-01' }
				})
			};

			const result = importExercisesSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept both formats with string content', () => {
			const testCases = [
				{ format: 'json', content: '{"key": "value"}' },
				{ format: 'json', content: JSON.stringify({ key: 'value' }) },
				{ format: 'markdown', content: '# Heading\nContent' }
			];

			testCases.forEach((data) => {
				const result = importExercisesSchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});

		it('should reject missing required fields', () => {
			const missingFields = [
				{ format: 'json' }, // Missing content
				{ content: '{}' } // Missing format
			];

			missingFields.forEach((data) => {
				const result = importExercisesSchema.safeParse(data);
				expect(result.success).toBe(false);
			});
		});
	});

	describe('exportExercisesSchema', () => {
		it('should accept valid export request', () => {
			const data = {
				exercise_ids: [
					'550e8400-e29b-41d4-a716-446655440000',
					'6ba7b810-9dad-11d1-80b4-00c04fd430c8'
				],
				format: 'json',
				pretty_print: true
			};

			const result = exportExercisesSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept markdown format', () => {
			const data = {
				exercise_ids: ['550e8400-e29b-41d4-a716-446655440000'],
				format: 'markdown'
			};

			const result = exportExercisesSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should use default pretty_print', () => {
			const data = {
				exercise_ids: ['550e8400-e29b-41d4-a716-446655440000'],
				format: 'json'
			};

			const result = exportExercisesSchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.pretty_print).toBe(true);
			}
		});

		it('should reject empty exercise_ids', () => {
			const data = {
				exercise_ids: [],
				format: 'json'
			};

			const result = exportExercisesSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject too many exercises', () => {
			const data = {
				exercise_ids: Array.from(
					{ length: 101 },
					(_, i) => `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, '0')}`
				),
				format: 'json'
			};

			const result = exportExercisesSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid format', () => {
			const data = {
				exercise_ids: ['550e8400-e29b-41d4-a716-446655440000'],
				format: 'pdf'
			};

			const result = exportExercisesSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	// ============================================================================
	// OTHER SCHEMAS
	// ============================================================================

	describe('viewExerciseSchema', () => {
		it('should accept optional assignment_id', () => {
			const data = {
				assignment_id: '550e8400-e29b-41d4-a716-446655440000'
			};

			const result = viewExerciseSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept empty object', () => {
			const result = viewExerciseSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		it('should reject invalid assignment_id', () => {
			const data = {
				assignment_id: 'not-a-uuid'
			};

			const result = viewExerciseSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('updateAssignmentSchema', () => {
		it('should accept partial updates', () => {
			const updates = [
				{ optional_deadline: '2025-12-31T23:59:59Z' },
				{ notes: 'Updated notes' },
				{ is_active: false }
			];

			updates.forEach((update) => {
				const result = updateAssignmentSchema.safeParse(update);
				expect(result.success).toBe(true);
			});
		});

		it('should reject empty object', () => {
			const result = updateAssignmentSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		it('should reject notes exceeding max length', () => {
			const data = {
				notes: 'a'.repeat(1001)
			};

			const result = updateAssignmentSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	// ============================================================================
	// RESPONSE SCHEMAS
	// ============================================================================

	describe('exerciseResponseSchema', () => {
		it('should accept valid exercise response', () => {
			const data = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				statement_md: 'Problem',
				solution_md: 'Solution',
				difficulty: 1,
				tags: ['algebra'],
				grade_levels: ['6eme'],
				topic: 'Equations',
				source: 'Textbook',
				title: 'Linear Equation',
				variables: { x: 2 },
				is_public: true,
				created_by: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
				created_at: '2025-01-01T00:00:00.000Z',
				updated_at: '2025-01-02T00:00:00.000Z'
			};

			const result = exerciseResponseSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept null optional fields', () => {
			const data = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				statement_md: 'Problem',
				solution_md: 'Solution',
				difficulty: 2,
				is_public: false,
				created_by: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
				created_at: '2025-01-01T00:00:00.000Z',
				updated_at: '2025-01-02T00:00:00.000Z'
			};

			const result = exerciseResponseSchema.safeParse(data);
			expect(result.success).toBe(true);
		});
	});

	describe('exerciseListResponseSchema', () => {
		it('should accept paginated response', () => {
			const data = {
				exercises: [
					{
						id: '550e8400-e29b-41d4-a716-446655440000',
						statement_md: 'Problem',
						solution_md: 'Solution',
						difficulty: 1,
						is_public: true,
						created_by: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
						created_at: '2025-01-01T00:00:00Z',
						updated_at: '2025-01-02T00:00:00Z'
					}
				],
				pagination: {
					page: 1,
					limit: 50,
					total: 100,
					totalPages: 2
				}
			};

			const result = exerciseListResponseSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject missing pagination', () => {
			const data = {
				exercises: []
			};

			const result = exerciseListResponseSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});
});
