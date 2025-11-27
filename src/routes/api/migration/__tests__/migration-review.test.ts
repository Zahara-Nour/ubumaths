/**
 * Migration Review API Tests
 * ===========================
 *
 * Tests for migration review endpoints:
 * - GET /api/migration/questions/[globalIndex]
 * - POST /api/migration/questions/[globalIndex]/approve
 * - POST /api/migration/questions/[globalIndex]/reject
 * - POST /api/migration/batch/approve
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../questions/[globalIndex]/+server';
import { POST as POST_APPROVE } from '../questions/[globalIndex]/approve/+server';
import { POST as POST_REJECT } from '../questions/[globalIndex]/reject/+server';
import { POST as POST_BATCH_APPROVE } from '../batch/approve/+server';
import * as questionLoader from '$lib/migration/question-data-loader';

// Mock dependencies
vi.mock('$lib/migration/question-data-loader');

describe('Migration Review API', () => {
	let mockLocals: {
		profile: { id: string; role: 'admin' | 'teacher' | 'student' } | null;
		supabase: unknown;
	};

	const adminId = '123e4567-e89b-12d3-a456-426614174000';
	const teacherId = '123e4567-e89b-12d3-a456-426614174001';

	beforeEach(() => {
		vi.clearAllMocks();
		mockLocals = {
			profile: { id: adminId, role: 'admin' },
			supabase: {}
		};
	});

	// ============================================================================
	// GET /api/migration/questions/[globalIndex]
	// ============================================================================

	describe('GET /api/migration/questions/[globalIndex]', () => {
		it('should return question data for valid index', async () => {
			const mockQuestionData = {
				globalIndex: 5,
				original: {
					description: 'Test question',
					type: 'simple'
				},
				transformed: {
					id: 'test-id',
					type: 'numerical_exact'
				},
				transformError: null
			};

			vi.mocked(questionLoader.loadQuestionWithTransform).mockResolvedValue(
				mockQuestionData as never
			);

			const response = await GET({
				locals: mockLocals,
				params: { globalIndex: '5' }
			} as never);

			const data = await response.json();

			expect(questionLoader.loadQuestionWithTransform).toHaveBeenCalledWith(5);
			expect(data).toEqual({
				success: true,
				data: mockQuestionData
			});
		});

		it('should reject non-admin users', async () => {
			mockLocals.profile = { id: teacherId, role: 'teacher' };

			await expect(
				GET({
					locals: mockLocals,
					params: { globalIndex: '5' }
				} as never)
			).rejects.toMatchObject({
				status: 403,
				body: { message: 'Admin access required' }
			});
		});

		it('should reject unauthenticated requests', async () => {
			mockLocals.profile = null;

			await expect(
				GET({
					locals: mockLocals,
					params: { globalIndex: '5' }
				} as never)
			).rejects.toMatchObject({
				status: 401,
				body: { message: 'Authentication required' }
			});
		});

		it('should reject invalid global index (negative)', async () => {
			await expect(
				GET({
					locals: mockLocals,
					params: { globalIndex: '-1' }
				} as never)
			).rejects.toMatchObject({
				status: 400
			});
		});

		it('should reject invalid global index (too large)', async () => {
			await expect(
				GET({
					locals: mockLocals,
					params: { globalIndex: '999' }
				} as never)
			).rejects.toMatchObject({
				status: 400
			});
		});

		it('should reject invalid global index (non-numeric)', async () => {
			await expect(
				GET({
					locals: mockLocals,
					params: { globalIndex: 'abc' }
				} as never)
			).rejects.toMatchObject({
				status: 400,
				body: { message: 'Global index must be a valid number' }
			});
		});

		it('should return 404 for non-existent question', async () => {
			vi.mocked(questionLoader.loadQuestionWithTransform).mockResolvedValue(null);

			await expect(
				GET({
					locals: mockLocals,
					params: { globalIndex: '500' }
				} as never)
			).rejects.toMatchObject({
				status: 404
			});
		});
	});

	// ============================================================================
	// POST /api/migration/questions/[globalIndex]/approve
	// ============================================================================

	describe('POST /api/migration/questions/[globalIndex]/approve', () => {
		it('should approve question with valid data', async () => {
			vi.mocked(questionLoader.isValidGlobalIndex).mockResolvedValue(true);
			vi.mocked(questionLoader.loadQuestionWithTransform).mockResolvedValue({
				globalIndex: 10,
				original: {},
				transformed: { id: 'test' },
				transformError: null
			} as never);

			const mockRequest = new Request('http://localhost/api/migration/questions/10/approve', {
				method: 'POST',
				body: JSON.stringify({ notes: 'Looks good' })
			});

			const response = await POST_APPROVE({
				request: mockRequest,
				locals: mockLocals,
				params: { globalIndex: '10' }
			} as never);

			const data = await response.json();

			expect(data.success).toBe(true);
			expect(data.message).toBe('Question approved');
			expect(data.data.globalIndex).toBe(10);
			expect(data.data.approved).toBe(true);
			expect(data.data.approvedBy).toBe(adminId);
			expect(data.data.notes).toBe('Looks good');
		});

		it('should approve question without notes', async () => {
			vi.mocked(questionLoader.isValidGlobalIndex).mockResolvedValue(true);
			vi.mocked(questionLoader.loadQuestionWithTransform).mockResolvedValue({
				globalIndex: 10,
				original: {},
				transformed: { id: 'test' },
				transformError: null
			} as never);

			const mockRequest = new Request('http://localhost/api/migration/questions/10/approve', {
				method: 'POST',
				body: JSON.stringify({})
			});

			const response = await POST_APPROVE({
				request: mockRequest,
				locals: mockLocals,
				params: { globalIndex: '10' }
			} as never);

			const data = await response.json();

			expect(data.success).toBe(true);
			expect(data.data.notes).toBeUndefined();
		});

		it('should reject approval if question has transformation errors', async () => {
			vi.mocked(questionLoader.isValidGlobalIndex).mockResolvedValue(true);
			vi.mocked(questionLoader.loadQuestionWithTransform).mockResolvedValue({
				globalIndex: 10,
				original: {},
				transformed: null,
				transformError: 'Invalid syntax'
			} as never);

			const mockRequest = new Request('http://localhost/api/migration/questions/10/approve', {
				method: 'POST',
				body: JSON.stringify({})
			});

			await expect(
				POST_APPROVE({
					request: mockRequest,
					locals: mockLocals,
					params: { globalIndex: '10' }
				} as never)
			).rejects.toMatchObject({
				status: 400
			});
		});

		it('should reject notes exceeding 1000 characters', async () => {
			const longNotes = 'a'.repeat(1001);

			const mockRequest = new Request('http://localhost/api/migration/questions/10/approve', {
				method: 'POST',
				body: JSON.stringify({ notes: longNotes })
			});

			await expect(
				POST_APPROVE({
					request: mockRequest,
					locals: mockLocals,
					params: { globalIndex: '10' }
				} as never)
			).rejects.toMatchObject({
				status: 400
			});
		});

		it('should reject non-admin users', async () => {
			mockLocals.profile = { id: teacherId, role: 'teacher' };

			const mockRequest = new Request('http://localhost/api/migration/questions/10/approve', {
				method: 'POST',
				body: JSON.stringify({})
			});

			await expect(
				POST_APPROVE({
					request: mockRequest,
					locals: mockLocals,
					params: { globalIndex: '10' }
				} as never)
			).rejects.toMatchObject({
				status: 403
			});
		});
	});

	// ============================================================================
	// POST /api/migration/questions/[globalIndex]/reject
	// ============================================================================

	describe('POST /api/migration/questions/[globalIndex]/reject', () => {
		it('should reject question with valid reason', async () => {
			vi.mocked(questionLoader.isValidGlobalIndex).mockResolvedValue(true);

			const mockRequest = new Request('http://localhost/api/migration/questions/10/reject', {
				method: 'POST',
				body: JSON.stringify({ reason: 'Incorrect math syntax' })
			});

			const response = await POST_REJECT({
				request: mockRequest,
				locals: mockLocals,
				params: { globalIndex: '10' }
			} as never);

			const data = await response.json();

			expect(data.success).toBe(true);
			expect(data.message).toBe('Question rejected');
			expect(data.data.globalIndex).toBe(10);
			expect(data.data.rejected).toBe(true);
			expect(data.data.rejectedBy).toBe(adminId);
			expect(data.data.reason).toBe('Incorrect math syntax');
		});

		it('should reject request without reason', async () => {
			const mockRequest = new Request('http://localhost/api/migration/questions/10/reject', {
				method: 'POST',
				body: JSON.stringify({})
			});

			await expect(
				POST_REJECT({
					request: mockRequest,
					locals: mockLocals,
					params: { globalIndex: '10' }
				} as never)
			).rejects.toMatchObject({
				status: 400
			});
		});

		it('should reject reason exceeding 1000 characters', async () => {
			const longReason = 'a'.repeat(1001);

			const mockRequest = new Request('http://localhost/api/migration/questions/10/reject', {
				method: 'POST',
				body: JSON.stringify({ reason: longReason })
			});

			await expect(
				POST_REJECT({
					request: mockRequest,
					locals: mockLocals,
					params: { globalIndex: '10' }
				} as never)
			).rejects.toMatchObject({
				status: 400
			});
		});

		it('should return 404 for non-existent question', async () => {
			vi.mocked(questionLoader.isValidGlobalIndex).mockResolvedValue(false);

			const mockRequest = new Request('http://localhost/api/migration/questions/500/reject', {
				method: 'POST',
				body: JSON.stringify({ reason: 'Test' })
			});

			await expect(
				POST_REJECT({
					request: mockRequest,
					locals: mockLocals,
					params: { globalIndex: '500' }
				} as never)
			).rejects.toMatchObject({
				status: 404
			});
		});
	});

	// ============================================================================
	// POST /api/migration/batch/approve
	// ============================================================================

	describe('POST /api/migration/batch/approve', () => {
		it('should approve multiple valid questions', async () => {
			vi.mocked(questionLoader.getQuestionCount).mockResolvedValue(633);
			vi.mocked(questionLoader.loadQuestionWithTransform)
				.mockResolvedValueOnce({
					globalIndex: 5,
					original: {},
					transformed: { id: 'test-5' },
					transformError: null
				} as never)
				.mockResolvedValueOnce({
					globalIndex: 10,
					original: {},
					transformed: { id: 'test-10' },
					transformError: null
				} as never)
				.mockResolvedValueOnce({
					globalIndex: 15,
					original: {},
					transformed: { id: 'test-15' },
					transformError: null
				} as never);

			const mockRequest = new Request('http://localhost/api/migration/batch/approve', {
				method: 'POST',
				body: JSON.stringify({ globalIndexes: [5, 10, 15] })
			});

			const response = await POST_BATCH_APPROVE({
				request: mockRequest,
				locals: mockLocals
			} as never);

			const data = await response.json();

			expect(data.success).toBe(true);
			expect(data.data.approved).toEqual([5, 10, 15]);
			expect(data.data.failed).toEqual([]);
			expect(data.data.summary.total).toBe(3);
			expect(data.data.summary.successCount).toBe(3);
			expect(data.data.summary.failureCount).toBe(0);
		});

		it('should handle mixed success and failure', async () => {
			vi.mocked(questionLoader.getQuestionCount).mockResolvedValue(633);
			vi.mocked(questionLoader.loadQuestionWithTransform)
				.mockResolvedValueOnce({
					globalIndex: 5,
					original: {},
					transformed: { id: 'test-5' },
					transformError: null
				} as never)
				.mockResolvedValueOnce({
					globalIndex: 10,
					original: {},
					transformed: null,
					transformError: 'Invalid syntax'
				} as never);

			const mockRequest = new Request('http://localhost/api/migration/batch/approve', {
				method: 'POST',
				body: JSON.stringify({ globalIndexes: [5, 10] })
			});

			const response = await POST_BATCH_APPROVE({
				request: mockRequest,
				locals: mockLocals
			} as never);

			const data = await response.json();

			expect(data.success).toBe(true);
			expect(data.data.approved).toEqual([5]);
			expect(data.data.failed).toHaveLength(1);
			expect(data.data.failed[0].globalIndex).toBe(10);
			expect(data.data.summary.successCount).toBe(1);
			expect(data.data.summary.failureCount).toBe(1);
		});

		it('should reject empty array', async () => {
			const mockRequest = new Request('http://localhost/api/migration/batch/approve', {
				method: 'POST',
				body: JSON.stringify({ globalIndexes: [] })
			});

			await expect(
				POST_BATCH_APPROVE({
					request: mockRequest,
					locals: mockLocals
				} as never)
			).rejects.toMatchObject({
				status: 400
			});
		});

		it('should reject array exceeding 100 items', async () => {
			const largeArray = Array.from({ length: 101 }, (_, i) => i);

			const mockRequest = new Request('http://localhost/api/migration/batch/approve', {
				method: 'POST',
				body: JSON.stringify({ globalIndexes: largeArray })
			});

			await expect(
				POST_BATCH_APPROVE({
					request: mockRequest,
					locals: mockLocals
				} as never)
			).rejects.toMatchObject({
				status: 400
			});
		});

		it('should reject invalid indices in array', async () => {
			const mockRequest = new Request('http://localhost/api/migration/batch/approve', {
				method: 'POST',
				body: JSON.stringify({ globalIndexes: [5, -1, 1000] })
			});

			await expect(
				POST_BATCH_APPROVE({
					request: mockRequest,
					locals: mockLocals
				} as never)
			).rejects.toMatchObject({
				status: 400
			});
		});

		it('should reject non-admin users', async () => {
			mockLocals.profile = { id: teacherId, role: 'teacher' };

			const mockRequest = new Request('http://localhost/api/migration/batch/approve', {
				method: 'POST',
				body: JSON.stringify({ globalIndexes: [5] })
			});

			await expect(
				POST_BATCH_APPROVE({
					request: mockRequest,
					locals: mockLocals
				} as never)
			).rejects.toMatchObject({
				status: 403
			});
		});
	});
});
