/**
 * Tests for assessment validation schemas
 */

import { describe, it, expect } from 'vitest';
import {
	assessmentStatusSchema,
	createAssessmentSchema,
	updateAssessmentSchema,
	assignAssessmentSchema,
	listAssessmentsQuerySchema,
	getResultsQuerySchema,
	assessmentIdParamSchema,
	assessmentResponseSchema,
	assessmentListResponseSchema,
	assessmentStatsSchema
} from './assessments';

describe('assessment validation schemas', () => {
	// ============================================================================
	// ASSESSMENT STATUS
	// ============================================================================

	describe('assessmentStatusSchema', () => {
		it('should accept valid status values', () => {
			const validStatuses = ['draft', 'published', 'archived'];
			validStatuses.forEach((status) => {
				const result = assessmentStatusSchema.safeParse(status);
				expect(result.success).toBe(true);
			});
		});

		it('should reject invalid status values', () => {
			const invalidStatuses = ['active', 'pending', '', null];
			invalidStatuses.forEach((status) => {
				const result = assessmentStatusSchema.safeParse(status);
				expect(result.success).toBe(false);
			});
		});
	});

	// ============================================================================
	// CREATE & UPDATE SCHEMAS
	// ============================================================================

	describe('createAssessmentSchema', () => {
		it('should accept valid assessment data', () => {
			const data = {
				title: 'Math Test - Chapter 1',
				grade: '6eme',
				categories: [
					{
						category_id: '550e8400-e29b-41d4-a716-446655440000',
						question_count: 10
					}
				],
				duration: 60,
				max_attempts: 2,
				status: 'draft'
			};

			const result = createAssessmentSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should use default values', () => {
			const data = {
				title: 'Test',
				grade: '5eme',
				categories: [
					{
						category_id: '550e8400-e29b-41d4-a716-446655440000',
						question_count: 5
					}
				]
			};

			const result = createAssessmentSchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.max_attempts).toBe(1);
				expect(result.data.status).toBe('draft');
			}
		});

		it('should reject empty title', () => {
			const data = {
				title: '   ',
				grade: '6eme',
				categories: [
					{
						category_id: '550e8400-e29b-41d4-a716-446655440000',
						question_count: 10
					}
				]
			};

			const result = createAssessmentSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject title exceeding max length', () => {
			const data = {
				title: 'a'.repeat(201),
				grade: '6eme',
				categories: [
					{
						category_id: '550e8400-e29b-41d4-a716-446655440000',
						question_count: 10
					}
				]
			};

			const result = createAssessmentSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid grade', () => {
			const data = {
				title: 'Test',
				grade: 'invalid-grade',
				categories: [
					{
						category_id: '550e8400-e29b-41d4-a716-446655440000',
						question_count: 10
					}
				]
			};

			const result = createAssessmentSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject empty categories array', () => {
			const data = {
				title: 'Test',
				grade: '6eme',
				categories: []
			};

			const result = createAssessmentSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject too many categories', () => {
			const categories = Array.from({ length: 21 }, (_, i) => ({
				category_id: `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, '0')}`,
				question_count: 1
			}));

			const data = {
				title: 'Test',
				grade: '6eme',
				categories
			};

			const result = createAssessmentSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid category UUID', () => {
			const data = {
				title: 'Test',
				grade: '6eme',
				categories: [
					{
						category_id: 'not-a-uuid',
						question_count: 10
					}
				]
			};

			const result = createAssessmentSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject non-integer question count', () => {
			const data = {
				title: 'Test',
				grade: '6eme',
				categories: [
					{
						category_id: '550e8400-e29b-41d4-a716-446655440000',
						question_count: 10.5
					}
				]
			};

			const result = createAssessmentSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject negative question count', () => {
			const data = {
				title: 'Test',
				grade: '6eme',
				categories: [
					{
						category_id: '550e8400-e29b-41d4-a716-446655440000',
						question_count: -5
					}
				]
			};

			const result = createAssessmentSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject question count exceeding max', () => {
			const data = {
				title: 'Test',
				grade: '6eme',
				categories: [
					{
						category_id: '550e8400-e29b-41d4-a716-446655440000',
						question_count: 51
					}
				]
			};

			const result = createAssessmentSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject duration exceeding max', () => {
			const data = {
				title: 'Test',
				grade: '6eme',
				categories: [
					{
						category_id: '550e8400-e29b-41d4-a716-446655440000',
						question_count: 10
					}
				],
				duration: 181
			};

			const result = createAssessmentSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject max_attempts exceeding limit', () => {
			const data = {
				title: 'Test',
				grade: '6eme',
				categories: [
					{
						category_id: '550e8400-e29b-41d4-a716-446655440000',
						question_count: 10
					}
				],
				max_attempts: 11
			};

			const result = createAssessmentSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('updateAssessmentSchema', () => {
		it('should accept partial updates', () => {
			const updates = [
				{ title: 'Updated Title' },
				{ grade: '5eme' },
				{ duration: 90 },
				{ status: 'published' }
			];

			updates.forEach((update) => {
				const result = updateAssessmentSchema.safeParse(update);
				expect(result.success).toBe(true);
			});
		});

		it('should accept empty object', () => {
			const result = updateAssessmentSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		it('should validate partial data same as full schema', () => {
			const data = {
				title: 'a'.repeat(201) // Too long
			};

			const result = updateAssessmentSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	// ============================================================================
	// ASSIGNMENT SCHEMAS
	// ============================================================================

	describe('assignAssessmentSchema', () => {
		it('should accept assignment with class IDs', () => {
			const data = {
				class_ids: ['550e8400-e29b-41d4-a716-446655440000', '6ba7b810-9dad-11d1-80b4-00c04fd430c8']
			};

			const result = assignAssessmentSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept assignment with student IDs', () => {
			const data = {
				student_ids: [
					'550e8400-e29b-41d4-a716-446655440000',
					'6ba7b810-9dad-11d1-80b4-00c04fd430c8'
				]
			};

			const result = assignAssessmentSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept assignment with both class and student IDs', () => {
			const data = {
				class_ids: ['550e8400-e29b-41d4-a716-446655440000'],
				student_ids: ['6ba7b810-9dad-11d1-80b4-00c04fd430c8']
			};

			const result = assignAssessmentSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject empty arrays for both', () => {
			const data = {
				class_ids: [],
				student_ids: []
			};

			const result = assignAssessmentSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject missing both class_ids and student_ids', () => {
			const data = {};

			const result = assignAssessmentSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject too many classes', () => {
			const data = {
				class_ids: Array.from(
					{ length: 51 },
					(_, i) => `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, '0')}`
				)
			};

			const result = assignAssessmentSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject too many students', () => {
			const data = {
				student_ids: Array.from(
					{ length: 201 },
					(_, i) => `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, '0')}`
				)
			};

			const result = assignAssessmentSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	// ============================================================================
	// QUERY PARAMETER SCHEMAS
	// ============================================================================

	describe('listAssessmentsQuerySchema', () => {
		it('should accept valid query parameters', () => {
			const data = {
				status: 'published',
				grade: '6eme',
				page: 2,
				limit: 25
			};

			const result = listAssessmentsQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should use default pagination', () => {
			const data = {};

			const result = listAssessmentsQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.page).toBe(1);
				expect(result.data.limit).toBe(50);
			}
		});

		it('should accept optional filters', () => {
			const data = {
				status: 'draft'
			};

			const result = listAssessmentsQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should coerce string numbers to integers', () => {
			const data = {
				page: '3',
				limit: '10'
			};

			const result = listAssessmentsQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(typeof result.data.page).toBe('number');
				expect(typeof result.data.limit).toBe('number');
			}
		});
	});

	describe('getResultsQuerySchema', () => {
		it('should accept valid query parameters', () => {
			const data = {
				stats: 'true',
				class_stats: 'false',
				student_id: '550e8400-e29b-41d4-a716-446655440000',
				class_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
			};

			const result = getResultsQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should convert string booleans', () => {
			const data = {
				stats: 'true',
				class_stats: 'false'
			};

			const result = getResultsQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.stats).toBe(true);
				expect(result.data.class_stats).toBe(false);
			}
		});

		it('should accept empty query', () => {
			const result = getResultsQuerySchema.safeParse({});
			expect(result.success).toBe(true);
		});
	});

	describe('assessmentIdParamSchema', () => {
		it('should accept valid UUID', () => {
			const data = {
				id: '550e8400-e29b-41d4-a716-446655440000'
			};

			const result = assessmentIdParamSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject invalid UUID', () => {
			const data = {
				id: 'not-a-uuid'
			};

			const result = assessmentIdParamSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	// ============================================================================
	// RESPONSE SCHEMAS
	// ============================================================================

	describe('assessmentResponseSchema', () => {
		it('should accept valid assessment response', () => {
			const data = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				title: 'Math Test',
				grade: '6eme',
				categories: [
					{
						category_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
						question_count: 10
					}
				],
				duration: 60,
				max_attempts: 2,
				status: 'published',
				created_at: '2025-01-01T00:00:00Z',
				created_by: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
				updated_at: '2025-01-02T00:00:00Z'
			};

			const result = assessmentResponseSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept null duration', () => {
			const data = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				title: 'Math Test',
				grade: '6eme',
				categories: [
					{
						category_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
						question_count: 10
					}
				],
				duration: null,
				max_attempts: 1,
				status: 'draft',
				created_at: '2025-01-01T00:00:00Z',
				created_by: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
				updated_at: '2025-01-02T00:00:00Z'
			};

			const result = assessmentResponseSchema.safeParse(data);
			expect(result.success).toBe(true);
		});
	});

	describe('assessmentListResponseSchema', () => {
		it('should accept array of assessments', () => {
			const data = {
				assessments: [
					{
						id: '550e8400-e29b-41d4-a716-446655440000',
						title: 'Test 1',
						grade: '6eme',
						categories: [],
						duration: 60,
						max_attempts: 1,
						status: 'published',
						created_at: '2025-01-01T00:00:00Z',
						created_by: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
						updated_at: '2025-01-02T00:00:00Z'
					}
				]
			};

			const result = assessmentListResponseSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept empty array', () => {
			const data = {
				assessments: []
			};

			const result = assessmentListResponseSchema.safeParse(data);
			expect(result.success).toBe(true);
		});
	});

	describe('assessmentStatsSchema', () => {
		it('should accept valid stats', () => {
			const data = {
				total_attempts: 50,
				average_score: 75.5,
				completion_rate: 85.0
			};

			const result = assessmentStatsSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept null average_score', () => {
			const data = {
				total_attempts: 0,
				average_score: null,
				completion_rate: 0
			};

			const result = assessmentStatsSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject invalid score range', () => {
			const data = {
				total_attempts: 10,
				average_score: 150, // Over 100
				completion_rate: 50
			};

			const result = assessmentStatsSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject negative attempts', () => {
			const data = {
				total_attempts: -5,
				average_score: 75,
				completion_rate: 50
			};

			const result = assessmentStatsSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});
});
