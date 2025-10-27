/**
 * Assessment API Routes - Integration Tests
 * ===========================================
 *
 * Tests for all assessment API endpoints.
 * Focuses on authentication, authorization, request validation, and responses.
 *
 * Tests 6 key endpoints:
 * - POST /api/assessments - Create assessment
 * - GET /api/assessments - List teacher's assessments
 * - GET /api/assessments/[id] - Get assessment by ID
 * - PUT /api/assessments/[id] - Update assessment
 * - DELETE /api/assessments/[id] - Archive assessment
 * - POST /api/assessments/[id]/assign - Assign assessment
 * - GET /api/assessments/[id]/results - Get results
 * - POST /api/assessments/[id]/validate-attempt - Validate attempt
 * - GET /api/assessments/assigned - Student assignments
 *
 * @module api/assessments/api-routes.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CreateAssessmentData, UpdateAssessmentData } from '$lib/types/assessment';
import { DEFAULT_ASSESSMENT_SETTINGS } from '$lib/types/assessment';
import {
	createMockSupabase,
	createMockLocals,
	createMockRequest,
	createMockURL
} from '../../../../tests/helpers/supabase-helpers';

// ============================================================================
// MOCK SETUP
// ============================================================================
// Using shared helpers from tests/helpers/supabase-helpers.ts

// ============================================================================
// TEST DATA
// ============================================================================

const mockTeacher = {
	id: 'teacher-123',
	email: 'teacher@voltairedoha.com',
	role: 'teacher'
};

const mockStudent = {
	id: 'student-456',
	email: 'student@voltairedoha.com',
	role: 'student'
};

const mockAssessmentId = 'assessment-789';
const mockAssignmentId = 'assign-abc';

const mockAssessment = {
	id: mockAssessmentId,
	title: 'Test Assessment',
	grade: '3ème',
	description: 'Test description',
	created_by: mockTeacher.id,
	categories: [],
	settings: DEFAULT_ASSESSMENT_SETTINGS,
	status: 'draft' as const,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z'
};

// ============================================================================
// POST /api/assessments - CREATE ASSESSMENT
// ============================================================================

describe('POST /api/assessments', () => {
	it('should reject unauthenticated requests', async () => {
		const { POST } = await import('./+server');

		const locals = createMockLocals(); // No user
		const request = createMockRequest({
			title: 'Test Assessment',
			grade: '3ème',
			categories: [],
			settings: DEFAULT_ASSESSMENT_SETTINGS,
			status: 'draft'
		});

		try {
			await POST({
				request,
				locals
			} as any);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(401);
			expect(err.body.message).toBe('Unauthorized');
		}
	});

	it('should reject non-teacher users', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockStudent.id, mockSupabase);

		// Mock student profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'student' },
			error: null
		});

		const request = createMockRequest({
			title: 'Test Assessment',
			grade: '3ème',
			categories: [],
			settings: DEFAULT_ASSESSMENT_SETTINGS,
			status: 'draft'
		});

		try {
			await POST({
				request,
				locals
			} as any);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(403);
			expect(err.body.message).toBe('Forbidden - Teachers only');
		}
	});

	it('should create draft assessment successfully', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock assessment creation
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: mockAssessment,
			error: null
		});

		const assessmentData: CreateAssessmentData = {
			title: 'Test Assessment',
			grade: '3ème',
			categories: [{ id: 'cat-1', bank_id: 'bank-1', count: 5, title: 'Test Category', filters: {} }],
			settings: DEFAULT_ASSESSMENT_SETTINGS,
			status: 'draft'
		};

		const request = createMockRequest(assessmentData);

		const response = await POST({
			request,
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(200);
		expect(data.assessment).toBeDefined();
		expect(data.assessment.title).toBe('Test Assessment');
	});

	it('should create published assessment', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock assessment creation
		const publishedAssessment = { ...mockAssessment, status: 'published' as const };
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: publishedAssessment,
			error: null
		});

		const assessmentData: CreateAssessmentData = {
			title: 'Published Assessment',
			grade: '4ème',
			categories: [{ id: 'cat-1', bank_id: 'bank-1', count: 5, title: 'Test Category', filters: {} }],
			settings: DEFAULT_ASSESSMENT_SETTINGS,
			status: 'published'
		};

		const request = createMockRequest(assessmentData);

		const response = await POST({
			request,
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(200);
		expect(data.assessment.status).toBe('published');
	});

	it('should validate required fields', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Missing title and categories
		const request = createMockRequest({
			grade: '3ème',
			settings: DEFAULT_ASSESSMENT_SETTINGS,
			status: 'draft'
		});

		try {
			await POST({
				request,
				locals
			} as any);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(400);
			expect(err.body.message).toBe('Missing required fields');
		}
	});

	it('should reject empty categories array', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		const request = createMockRequest({
			title: 'Test',
			grade: '3ème',
			categories: [], // Empty array
			settings: DEFAULT_ASSESSMENT_SETTINGS,
			status: 'draft'
		});

		try {
			await POST({
				request,
				locals
			} as any);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(400);
			expect(err.body.message).toBe('Missing required fields');
		}
	});

	it('should handle database errors', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock database error
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: null,
			error: { message: 'Database error' }
		});

		const assessmentData: CreateAssessmentData = {
			title: 'Test',
			grade: '3ème',
			categories: [{ id: 'cat-1', bank_id: 'bank-1', count: 5, title: 'Test', filters: {} }],
			settings: DEFAULT_ASSESSMENT_SETTINGS,
			status: 'draft'
		};

		const request = createMockRequest(assessmentData);

		try {
			await POST({
				request,
				locals
			} as any);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(500);
			expect(err.body.message).toBe('Failed to create assessment');
		}
	});
});

// ============================================================================
// GET /api/assessments - LIST TEACHER'S ASSESSMENTS
// ============================================================================

describe('GET /api/assessments', () => {
	it('should reject unauthenticated requests', async () => {
		const { GET } = await import('./+server');

		const locals = createMockLocals(); // No user
		const url = createMockURL();

		try {
			await GET({
				url,
				locals
			} as any);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(401);
			expect(err.body.message).toBe('Unauthorized');
		}
	});

	it('should reject non-teacher users', async () => {
		const { GET } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockStudent.id, mockSupabase);

		// Mock student profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'student' },
			error: null
		});

		const url = createMockURL();

		try {
			await GET({
				url,
				locals
			} as any);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(403);
			expect(err.body.message).toBe('Forbidden - Teachers only');
		}
	});

	it('should return all teacher assessments', async () => {
		const { GET } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock assessments fetch
		const assessments = [
			{ ...mockAssessment, creator: [{ firstname: 'John', lastname: 'Doe' }] },
			{
				...mockAssessment,
				id: 'assessment-2',
				title: 'Assessment 2',
				creator: [{ firstname: 'John', lastname: 'Doe' }]
			}
		];

		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: assessments,
					error: null
				})
			);
		});

		const url = createMockURL();

		const response = await GET({
			url,
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(200);
		expect(data.assessments).toHaveLength(2);
	});

	it('should filter assessments by status', async () => {
		const { GET } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock filtered assessments
		const publishedAssessments = [{ ...mockAssessment, status: 'published' as const, creator: [] }];

		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: publishedAssessments,
					error: null
				})
			);
		});

		const url = createMockURL({ status: 'published' });

		const response = await GET({
			url,
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(200);
		expect(data.assessments).toHaveLength(1);
		expect(data.assessments[0].status).toBe('published');
	});

	it('should handle database errors', async () => {
		const { GET } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock database error
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: null,
					error: { message: 'Database error' }
				})
			);
		});

		const url = createMockURL();

		try {
			await GET({
				url,
				locals
			} as any);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(500);
			expect(err.body.message).toBe('Failed to fetch assessments');
		}
	});
});

// ============================================================================
// GET /api/assessments/[id] - GET ASSESSMENT BY ID
// ============================================================================

describe('GET /api/assessments/[id]', () => {
	it('should reject unauthenticated requests', async () => {
		const { GET } = await import('./[id]/+server');

		const locals = createMockLocals(); // No user

		try {
			await GET({
				params: { id: mockAssessmentId },
				locals
			} as any);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(401);
			expect(err.body.message).toBe('Unauthorized');
		}
	});

	it('should allow teacher to view their own assessment', async () => {
		const { GET } = await import('./[id]/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock assessment fetch
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: mockAssessment,
			error: null
		});

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		const response = await GET({
			params: { id: mockAssessmentId },
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(200);
		expect(data.assessment).toBeDefined();
		expect(data.assessment.id).toBe(mockAssessmentId);
	});

	it("should reject teacher viewing another teacher's assessment", async () => {
		const { GET } = await import('./[id]/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock assessment owned by different teacher
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { ...mockAssessment, created_by: 'other-teacher' },
			error: null
		});

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		try {
			await GET({
				params: { id: mockAssessmentId },
				locals
			} as any);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(403);
			expect(err.body.message).toBe('Forbidden');
		}
	});

	it('should handle assessment not found', async () => {
		const { GET } = await import('./[id]/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock assessment not found
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: null,
			error: { message: 'Not found' }
		});

		try {
			await GET({
				params: { id: 'non-existent' },
				locals
			} as any);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(404);
			expect(err.body.message).toBe('Assessment not found');
		}
	});
});

// ============================================================================
// PUT /api/assessments/[id] - UPDATE ASSESSMENT
// ============================================================================

describe('PUT /api/assessments/[id]', () => {
	it('should reject unauthenticated requests', async () => {
		const { PUT } = await import('./[id]/+server');

		const locals = createMockLocals(); // No user
		const request = createMockRequest({ title: 'Updated Title' }, 'PUT');

		try {
			await PUT({
				request,
				params: { id: mockAssessmentId },
				locals
			} as any);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(401);
			expect(err.body.message).toBe('Unauthorized');
		}
	});

	it('should reject non-teacher users', async () => {
		const { PUT } = await import('./[id]/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockStudent.id, mockSupabase);

		// Mock student profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'student' },
			error: null
		});

		const request = createMockRequest({ title: 'Updated Title' }, 'PUT');

		try {
			await PUT({
				request,
				params: { id: mockAssessmentId },
				locals
			} as any);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(403);
			expect(err.body.message).toBe('Forbidden - Teachers only');
		}
	});

	it('should update assessment successfully', async () => {
		const { PUT } = await import('./[id]/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock ownership check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { created_by: mockTeacher.id },
			error: null
		});

		// Mock update
		const updatedAssessment = { ...mockAssessment, title: 'Updated Title' };
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: updatedAssessment,
			error: null
		});

		const updates: UpdateAssessmentData = {
			title: 'Updated Title'
		};

		const request = createMockRequest(updates, 'PUT');

		const response = await PUT({
			request,
			params: { id: mockAssessmentId },
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(200);
		expect(data.assessment.title).toBe('Updated Title');
	});

	it('should reject update when not authorized', async () => {
		const { PUT } = await import('./[id]/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock ownership check - different teacher
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { created_by: 'other-teacher' },
			error: null
		});

		const request = createMockRequest({ title: 'Updated Title' }, 'PUT');

		try {
			await PUT({
				request,
				params: { id: mockAssessmentId },
				locals
			} as any);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(403);
			expect(err.body.message).toBe('Forbidden - Not your assessment');
		}
	});
});

// ============================================================================
// DELETE /api/assessments/[id] - ARCHIVE ASSESSMENT
// ============================================================================

describe('DELETE /api/assessments/[id]', () => {
	it('should reject unauthenticated requests', async () => {
		const { DELETE } = await import('./[id]/+server');

		const locals = createMockLocals(); // No user

		try {
			await DELETE({
				params: { id: mockAssessmentId },
				locals
			} as any);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(401);
			expect(err.body.message).toBe('Unauthorized');
		}
	});

	it('should reject non-teacher users', async () => {
		const { DELETE } = await import('./[id]/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockStudent.id, mockSupabase);

		// Mock student profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'student' },
			error: null
		});

		try {
			await DELETE({
				params: { id: mockAssessmentId },
				locals
			} as any);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(403);
			expect(err.body.message).toBe('Forbidden - Teachers only');
		}
	});

	it('should archive assessment successfully', async () => {
		const { DELETE } = await import('./[id]/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock ownership check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { created_by: mockTeacher.id },
			error: null
		});

		// Mock archive
		const archivedAssessment = { ...mockAssessment, status: 'archived' as const };
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: archivedAssessment,
			error: null
		});

		const response = await DELETE({
			params: { id: mockAssessmentId },
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
	});

	it('should reject delete when not authorized', async () => {
		const { DELETE } = await import('./[id]/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock ownership check - different teacher
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { created_by: 'other-teacher' },
			error: null
		});

		try {
			await DELETE({
				params: { id: mockAssessmentId },
				locals
			} as any);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(403);
			expect(err.body.message).toBe('Forbidden - Not your assessment');
		}
	});
});

// ============================================================================
// POST /api/assessments/[id]/assign - ASSIGN ASSESSMENT
// ============================================================================

describe('POST /api/assessments/[id]/assign', () => {
	it('should reject unauthenticated requests', async () => {
		const { POST } = await import('./[id]/assign/+server');

		const locals = createMockLocals(); // No user
		const request = createMockRequest({
			class_ids: ['class-1']
		});

		try {
			await POST({
				request,
				params: { id: mockAssessmentId },
				locals
			} as any);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(401);
			expect(err.body.message).toBe('Unauthorized');
		}
	});

	it('should reject non-teacher users', async () => {
		const { POST } = await import('./[id]/assign/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockStudent.id, mockSupabase);

		// Mock student profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'student' },
			error: null
		});

		const request = createMockRequest({
			class_ids: ['class-1']
		});

		try {
			await POST({
				request,
				params: { id: mockAssessmentId },
				locals
			} as any);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(403);
			expect(err.body.message).toBe('Forbidden - Teachers only');
		}
	});

	it('should assign to classes successfully', async () => {
		const { POST } = await import('./[id]/assign/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher', firstname: 'John', lastname: 'Doe' },
			error: null
		});

		// Mock ownership and status check (in assignAssessment)
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { created_by: mockTeacher.id, status: 'published' },
			error: null
		});

		// Mock assignment creation (in assignAssessment)
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [{}, {}], // 2 assignments
					error: null
				})
			);
		});

		// Mock assessment fetch for notification (in getAssessment)
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: mockAssessment,
			error: null
		});

		// Mock notification creation queries (createSystemNotification makes 3 queries)
		// 1. Insert into notifications table
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { id: 'notif-1' },
			error: null
		});

		// 2. Get class members
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [{ student_id: 'student-1' }],
					error: null
				})
			);
		});

		// 3. Insert notification recipients
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [{}],
					error: null
				})
			);
		});

		const request = createMockRequest({
			class_ids: ['class-1', 'class-2']
		});

		const response = await POST({
			request,
			params: { id: mockAssessmentId },
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.count).toBe(2);
	});

	it('should assign to individual students', async () => {
		const { POST } = await import('./[id]/assign/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher', firstname: 'John', lastname: 'Doe' },
			error: null
		});

		// Mock ownership and status check (in assignAssessment)
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { created_by: mockTeacher.id, status: 'published' },
			error: null
		});

		// Mock assignment creation (in assignAssessment)
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [{}, {}, {}], // 3 assignments
					error: null
				})
			);
		});

		// Mock assessment fetch for notification (in getAssessment)
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: mockAssessment,
			error: null
		});

		// Mock notification creation queries (createSystemNotification for student_ids)
		// 1. Insert into notifications table
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { id: 'notif-1' },
			error: null
		});

		// 2. Insert notification recipients (for individual students)
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [{}, {}, {}],
					error: null
				})
			);
		});

		const request = createMockRequest({
			student_ids: ['student-1', 'student-2', 'student-3']
		});

		const response = await POST({
			request,
			params: { id: mockAssessmentId },
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(200);
		expect(data.count).toBe(3);
	});

	it('should reject when no targets specified', async () => {
		const { POST } = await import('./[id]/assign/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		const request = createMockRequest({
			// No class_ids or student_ids
		});

		try {
			await POST({
				request,
				params: { id: mockAssessmentId },
				locals
			} as any);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(400);
			expect(err.body.message).toBe('Must specify at least one class or student');
		}
	});

	it('should reject when assessment is not published', async () => {
		const { POST } = await import('./[id]/assign/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock ownership check - assessment is draft
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { created_by: mockTeacher.id, status: 'draft' },
			error: null
		});

		const request = createMockRequest({
			class_ids: ['class-1']
		});

		try {
			await POST({
				request,
				params: { id: mockAssessmentId },
				locals
			} as any);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(400);
			expect(err.body.message).toBe('Assessment must be published before assigning');
		}
	});

	it('should reject when not authorized', async () => {
		const { POST } = await import('./[id]/assign/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock ownership check - different teacher
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { created_by: 'other-teacher', status: 'published' },
			error: null
		});

		const request = createMockRequest({
			class_ids: ['class-1']
		});

		try {
			await POST({
				request,
				params: { id: mockAssessmentId },
				locals
			} as any);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(403);
			expect(err.body.message).toBe('Forbidden - Not your assessment');
		}
	});
});

// ============================================================================
// POST /api/assessments/[id]/validate-attempt - VALIDATE ATTEMPT
// ============================================================================

describe('POST /api/assessments/[id]/validate-attempt', () => {
	it('should reject unauthenticated requests', async () => {
		const { POST } = await import('./[id]/validate-attempt/+server');

		const locals = createMockLocals(); // No user

		try {
			await POST({
				params: { id: mockAssignmentId },
				locals
			} as any);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(401);
			expect(err.body.message).toBe('Unauthorized');
		}
	});

	it('should reject non-student users', async () => {
		const { POST } = await import('./[id]/validate-attempt/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		try {
			await POST({
				params: { id: mockAssignmentId },
				locals
			} as any);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(403);
			expect(err.body.message).toBe('Forbidden - Students only');
		}
	});

	it('should allow attempt when conditions are met', async () => {
		const { POST } = await import('./[id]/validate-attempt/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockStudent.id, mockSupabase);

		// Mock student profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'student' },
			error: null
		});

		// Mock assignment fetch
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: {
				id: mockAssignmentId,
				assessment: {
					...mockAssessment,
					settings: {
						...DEFAULT_ASSESSMENT_SETTINGS,
						max_attempts: 3,
						deadline: null
					}
				}
			},
			error: null
		});

		// Mock existing attempts (1 attempt)
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [{ id: 'attempt-1' }],
					error: null
				})
			);
		});

		const response = await POST({
			params: { id: mockAssignmentId },
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(200);
		expect(data.validation.can_attempt).toBe(true);
		expect(data.validation.attempts_remaining).toBe(2);
	});

	it('should reject when deadline has passed', async () => {
		const { POST } = await import('./[id]/validate-attempt/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockStudent.id, mockSupabase);

		// Mock student profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'student' },
			error: null
		});

		const pastDeadline = new Date('2020-01-01').toISOString();

		// Mock assignment fetch with past deadline
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: {
				id: mockAssignmentId,
				assessment: {
					...mockAssessment,
					settings: {
						...DEFAULT_ASSESSMENT_SETTINGS,
						deadline: pastDeadline
					}
				}
			},
			error: null
		});

		const response = await POST({
			params: { id: mockAssignmentId },
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(200);
		expect(data.validation.can_attempt).toBe(false);
		expect(data.validation.reason).toBe('Deadline has passed');
	});

	it('should reject when max attempts reached', async () => {
		const { POST } = await import('./[id]/validate-attempt/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockStudent.id, mockSupabase);

		// Mock student profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'student' },
			error: null
		});

		// Mock assignment fetch
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: {
				id: mockAssignmentId,
				assessment: {
					...mockAssessment,
					settings: {
						...DEFAULT_ASSESSMENT_SETTINGS,
						max_attempts: 2,
						deadline: null
					}
				}
			},
			error: null
		});

		// Mock existing attempts (2 attempts = max)
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [{ id: 'attempt-1' }, { id: 'attempt-2' }],
					error: null
				})
			);
		});

		const response = await POST({
			params: { id: mockAssignmentId },
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(200);
		expect(data.validation.can_attempt).toBe(false);
		expect(data.validation.reason).toBe('Maximum attempts reached');
	});
});

// ============================================================================
// GET /api/assessments/assigned - STUDENT ASSIGNMENTS
// ============================================================================

describe('GET /api/assessments/assigned', () => {
	it('should reject unauthenticated requests', async () => {
		const { GET } = await import('./assigned/+server');

		const locals = createMockLocals(); // No user

		try {
			await GET({
				locals
			} as any);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(401);
			expect(err.body.message).toBe('Unauthorized');
		}
	});

	it('should reject non-student users', async () => {
		const { GET } = await import('./assigned/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		try {
			await GET({
				locals
			} as any);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(403);
			expect(err.body.message).toBe('Forbidden - Students only');
		}
	});

	it('should return student assignments', async () => {
		const { GET } = await import('./assigned/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockStudent.id, mockSupabase);

		// Mock student profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'student' },
			error: null
		});

		// Mock student's classes
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [{ class_id: 'class-1' }],
					error: null
				})
			);
		});

		// Mock assignments
		const assignments = [
			{
				id: 'assign-1',
				assessment: { ...mockAssessment, status: 'published' as const }
			}
		];
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: assignments,
					error: null
				})
			);
		});

		// Mock attempts
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [],
					error: null
				})
			);
		});

		const response = await GET({
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(200);
		expect(data.assignments).toHaveLength(1);
	});

	it('should return empty array when student has no assignments', async () => {
		const { GET } = await import('./assigned/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockStudent.id, mockSupabase);

		// Mock student profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'student' },
			error: null
		});

		// Mock no classes
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [],
					error: null
				})
			);
		});

		// Mock no assignments
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [],
					error: null
				})
			);
		});

		const response = await GET({
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(200);
		expect(data.assignments).toEqual([]);
	});

	it('should handle database errors', async () => {
		const { GET } = await import('./assigned/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockStudent.id, mockSupabase);

		// Mock student profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'student' },
			error: null
		});

		// Mock get student's classes (getStudentAssignments)
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [],
					error: null
				})
			);
		});

		// Mock database error in assignments query
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: null,
					error: { message: 'Database error' }
				})
			);
		});

		try {
			await GET({
				locals
			} as any);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(500);
			expect(err.body.message).toBe('Failed to fetch assigned assessments');
		}
	});
});

// ============================================================================
// GET /api/assessments/[id]/results - GET RESULTS
// ============================================================================

describe('GET /api/assessments/[id]/results', () => {
	it('should reject unauthenticated requests', async () => {
		const { GET } = await import('./[id]/results/+server');

		const locals = createMockLocals(); // No user
		const url = createMockURL();

		try {
			await GET({
				params: { id: mockAssessmentId },
				url,
				locals
			} as any);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(401);
			expect(err.body.message).toBe('Unauthorized');
		}
	});

	it('should reject non-teacher users', async () => {
		const { GET } = await import('./[id]/results/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockStudent.id, mockSupabase);

		// Mock student profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'student' },
			error: null
		});

		const url = createMockURL();

		try {
			await GET({
				params: { id: mockAssessmentId },
				url,
				locals
			} as any);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(403);
			expect(err.body.message).toBe('Forbidden - Teachers only');
		}
	});

	it('should reject when teacher does not own assessment', async () => {
		const { GET } = await import('./[id]/results/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock assessment owned by different teacher
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { created_by: 'other-teacher' },
			error: null
		});

		const url = createMockURL();

		try {
			await GET({
				params: { id: mockAssessmentId },
				url,
				locals
			} as any);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(403);
			expect(err.body.message).toBe('Forbidden - Not your assessment');
		}
	});

	it('should return results successfully', async () => {
		const { GET } = await import('./[id]/results/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock assessment ownership check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { created_by: mockTeacher.id },
			error: null
		});

		// Mock assignments fetch
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [],
					error: null
				})
			);
		});

		const url = createMockURL();

		const response = await GET({
			params: { id: mockAssessmentId },
			url,
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(200);
		expect(data.results).toBeDefined();
	});

	it('should include statistics when requested', async () => {
		const { GET } = await import('./[id]/results/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock assessment ownership check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { created_by: mockTeacher.id },
			error: null
		});

		// Mock assignments fetch for getAssessmentResults (called 3 times - once for results, once for stats, once for class stats but we only request stats)
		// First call: getAssessmentResults
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [],
					error: null
				})
			);
		});

		// Second call: getAssessmentStatistics calls getAssessmentResults again
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [],
					error: null
				})
			);
		});

		const url = createMockURL({ stats: 'true' });

		const response = await GET({
			params: { id: mockAssessmentId },
			url,
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(200);
		expect(data.statistics).toBeDefined();
	});

	it('should include class statistics when requested', async () => {
		const { GET } = await import('./[id]/results/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(mockTeacher.id, mockSupabase);

		// Mock teacher profile check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock assessment ownership check
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { created_by: mockTeacher.id },
			error: null
		});

		// Mock assignments fetch for getAssessmentResults (called twice - once for results, once for class stats)
		// First call: getAssessmentResults
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [],
					error: null
				})
			);
		});

		// Second call: getClassStatistics calls getAssessmentResults again
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [],
					error: null
				})
			);
		});

		const url = createMockURL({ class_stats: 'true' });

		const response = await GET({
			params: { id: mockAssessmentId },
			url,
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(200);
		expect(data.class_statistics).toBeDefined();
	});
});
