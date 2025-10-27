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

// ============================================================================
// MOCK SETUP
// ============================================================================

/**
 * Mock locals object (SvelteKit context)
 */
function createMockLocals(user: any = null, profile: any = null) {
	const mockSupabase = {
		from: vi.fn(() => ({
			select: vi.fn().mockReturnThis(),
			insert: vi.fn().mockReturnThis(),
			update: vi.fn().mockReturnThis(),
			delete: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			in: vi.fn().mockReturnThis(),
			not: vi.fn().mockReturnThis(),
			or: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis(),
			single: vi.fn(),
			maybeSingle: vi.fn(),
			then: vi.fn()
		})),
		rpc: vi.fn()
	};

	return {
		safeGetSession: vi.fn(async () => {
			if (!user) return null;
			return { user };
		}),
		supabase: mockSupabase
	};
}

/**
 * Mock Request object
 */
function createMockRequest(body: any = {}, method: string = 'POST') {
	return {
		method,
		json: vi.fn(async () => body),
		headers: new Headers()
	} as any;
}

/**
 * Mock URL with search params
 */
function createMockURL(searchParams: Record<string, string> = {}) {
	const url = new URL('http://localhost');
	Object.entries(searchParams).forEach(([key, value]) => {
		url.searchParams.set(key, value);
	});
	return url;
}

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

		const response = await POST({
			request,
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(401);
		expect(data.error).toBe('Unauthorized');
	});

	it('should reject non-teacher users', async () => {
		const { POST } = await import('./+server');

		const locals = createMockLocals(mockStudent);
		// Mock student profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
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

		const response = await POST({
			request,
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(403);
		expect(data.error).toBe('Forbidden - Teachers only');
	});

	it('should create draft assessment successfully', async () => {
		const { POST } = await import('./+server');

		const locals = createMockLocals(mockTeacher);

		// Mock teacher profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock assessment creation
		(locals.supabase.from('assessments') as any).single.mockResolvedValueOnce({
			data: mockAssessment,
			error: null
		});

		const assessmentData: CreateAssessmentData = {
			title: 'Test Assessment',
			grade: '3ème',
			categories: [],
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

		const locals = createMockLocals(mockTeacher);

		// Mock teacher profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock assessment creation
		const publishedAssessment = { ...mockAssessment, status: 'published' as const };
		(locals.supabase.from('assessments') as any).single.mockResolvedValueOnce({
			data: publishedAssessment,
			error: null
		});

		const assessmentData: CreateAssessmentData = {
			title: 'Published Assessment',
			grade: '4ème',
			categories: [],
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

		const locals = createMockLocals(mockTeacher);

		// Mock teacher profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Missing title and categories
		const request = createMockRequest({
			grade: '3ème',
			settings: DEFAULT_ASSESSMENT_SETTINGS,
			status: 'draft'
		});

		const response = await POST({
			request,
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(400);
		expect(data.error).toBe('Missing required fields');
	});

	it('should reject empty categories array', async () => {
		const { POST } = await import('./+server');

		const locals = createMockLocals(mockTeacher);

		// Mock teacher profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
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

		const response = await POST({
			request,
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(400);
		expect(data.error).toBe('Missing required fields');
	});

	it('should handle database errors', async () => {
		const { POST } = await import('./+server');

		const locals = createMockLocals(mockTeacher);

		// Mock teacher profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock database error
		(locals.supabase.from('assessments') as any).single.mockResolvedValueOnce({
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

		const response = await POST({
			request,
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(500);
		expect(data.error).toBe('Failed to create assessment');
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

		const response = await GET({
			url,
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(401);
		expect(data.error).toBe('Unauthorized');
	});

	it('should reject non-teacher users', async () => {
		const { GET } = await import('./+server');

		const locals = createMockLocals(mockStudent);

		// Mock student profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'student' },
			error: null
		});

		const url = createMockURL();

		const response = await GET({
			url,
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(403);
		expect(data.error).toBe('Forbidden - Teachers only');
	});

	it('should return all teacher assessments', async () => {
		const { GET } = await import('./+server');

		const locals = createMockLocals(mockTeacher);

		// Mock teacher profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
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

		(locals.supabase.from('assessments') as any).then.mockResolvedValueOnce({
			data: assessments,
			error: null
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

		const locals = createMockLocals(mockTeacher);

		// Mock teacher profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock filtered assessments
		const publishedAssessments = [
			{ ...mockAssessment, status: 'published' as const, creator: [] }
		];

		(locals.supabase.from('assessments') as any).then.mockResolvedValueOnce({
			data: publishedAssessments,
			error: null
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

		const locals = createMockLocals(mockTeacher);

		// Mock teacher profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock database error
		(locals.supabase.from('assessments') as any).then.mockResolvedValueOnce({
			data: null,
			error: { message: 'Database error' }
		});

		const url = createMockURL();

		const response = await GET({
			url,
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(500);
		expect(data.error).toBe('Failed to fetch assessments');
	});
});

// ============================================================================
// GET /api/assessments/[id] - GET ASSESSMENT BY ID
// ============================================================================

describe('GET /api/assessments/[id]', () => {
	it('should reject unauthenticated requests', async () => {
		const { GET } = await import('./[id]/+server');

		const locals = createMockLocals(); // No user

		const response = await GET({
			params: { id: mockAssessmentId },
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(401);
		expect(data.error).toBe('Unauthorized');
	});

	it('should allow teacher to view their own assessment', async () => {
		const { GET } = await import('./[id]/+server');

		const locals = createMockLocals(mockTeacher);

		// Mock assessment fetch
		(locals.supabase.from('assessments') as any).single.mockResolvedValueOnce({
			data: mockAssessment,
			error: null
		});

		// Mock teacher profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
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

	it('should reject teacher viewing another teacher\'s assessment', async () => {
		const { GET } = await import('./[id]/+server');

		const locals = createMockLocals(mockTeacher);

		// Mock assessment owned by different teacher
		(locals.supabase.from('assessments') as any).single.mockResolvedValueOnce({
			data: { ...mockAssessment, created_by: 'other-teacher' },
			error: null
		});

		// Mock teacher profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		const response = await GET({
			params: { id: mockAssessmentId },
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(403);
		expect(data.error).toBe('Forbidden');
	});

	it('should handle assessment not found', async () => {
		const { GET } = await import('./[id]/+server');

		const locals = createMockLocals(mockTeacher);

		// Mock assessment not found
		(locals.supabase.from('assessments') as any).single.mockResolvedValueOnce({
			data: null,
			error: { message: 'Not found' }
		});

		const response = await GET({
			params: { id: 'non-existent' },
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(404);
		expect(data.error).toBe('Assessment not found');
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

		const response = await PUT({
			request,
			params: { id: mockAssessmentId },
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(401);
		expect(data.error).toBe('Unauthorized');
	});

	it('should reject non-teacher users', async () => {
		const { PUT } = await import('./[id]/+server');

		const locals = createMockLocals(mockStudent);

		// Mock student profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'student' },
			error: null
		});

		const request = createMockRequest({ title: 'Updated Title' }, 'PUT');

		const response = await PUT({
			request,
			params: { id: mockAssessmentId },
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(403);
		expect(data.error).toBe('Forbidden - Teachers only');
	});

	it('should update assessment successfully', async () => {
		const { PUT } = await import('./[id]/+server');

		const locals = createMockLocals(mockTeacher);

		// Mock teacher profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock ownership check
		(locals.supabase.from('assessments') as any).single.mockResolvedValueOnce({
			data: { created_by: mockTeacher.id },
			error: null
		});

		// Mock update
		const updatedAssessment = { ...mockAssessment, title: 'Updated Title' };
		(locals.supabase.from('assessments') as any).single.mockResolvedValueOnce({
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

		const locals = createMockLocals(mockTeacher);

		// Mock teacher profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock ownership check - different teacher
		(locals.supabase.from('assessments') as any).single.mockResolvedValueOnce({
			data: { created_by: 'other-teacher' },
			error: null
		});

		const request = createMockRequest({ title: 'Updated Title' }, 'PUT');

		const response = await PUT({
			request,
			params: { id: mockAssessmentId },
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(403);
		expect(data.error).toBe('Forbidden - Not your assessment');
	});
});

// ============================================================================
// DELETE /api/assessments/[id] - ARCHIVE ASSESSMENT
// ============================================================================

describe('DELETE /api/assessments/[id]', () => {
	it('should reject unauthenticated requests', async () => {
		const { DELETE } = await import('./[id]/+server');

		const locals = createMockLocals(); // No user

		const response = await DELETE({
			params: { id: mockAssessmentId },
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(401);
		expect(data.error).toBe('Unauthorized');
	});

	it('should reject non-teacher users', async () => {
		const { DELETE } = await import('./[id]/+server');

		const locals = createMockLocals(mockStudent);

		// Mock student profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'student' },
			error: null
		});

		const response = await DELETE({
			params: { id: mockAssessmentId },
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(403);
		expect(data.error).toBe('Forbidden - Teachers only');
	});

	it('should archive assessment successfully', async () => {
		const { DELETE } = await import('./[id]/+server');

		const locals = createMockLocals(mockTeacher);

		// Mock teacher profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock ownership check
		(locals.supabase.from('assessments') as any).single.mockResolvedValueOnce({
			data: { created_by: mockTeacher.id },
			error: null
		});

		// Mock archive
		const archivedAssessment = { ...mockAssessment, status: 'archived' as const };
		(locals.supabase.from('assessments') as any).single.mockResolvedValueOnce({
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

		const locals = createMockLocals(mockTeacher);

		// Mock teacher profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock ownership check - different teacher
		(locals.supabase.from('assessments') as any).single.mockResolvedValueOnce({
			data: { created_by: 'other-teacher' },
			error: null
		});

		const response = await DELETE({
			params: { id: mockAssessmentId },
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(403);
		expect(data.error).toBe('Forbidden - Not your assessment');
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

		const response = await POST({
			request,
			params: { id: mockAssessmentId },
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(401);
		expect(data.error).toBe('Unauthorized');
	});

	it('should reject non-teacher users', async () => {
		const { POST } = await import('./[id]/assign/+server');

		const locals = createMockLocals(mockStudent);

		// Mock student profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'student' },
			error: null
		});

		const request = createMockRequest({
			class_ids: ['class-1']
		});

		const response = await POST({
			request,
			params: { id: mockAssessmentId },
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(403);
		expect(data.error).toBe('Forbidden - Teachers only');
	});

	it('should assign to classes successfully', async () => {
		const { POST } = await import('./[id]/assign/+server');

		const locals = createMockLocals(mockTeacher);

		// Mock teacher profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'teacher', firstname: 'John', lastname: 'Doe' },
			error: null
		});

		// Mock ownership and status check
		(locals.supabase.from('assessments') as any).single.mockResolvedValueOnce({
			data: { created_by: mockTeacher.id, status: 'published' },
			error: null
		});

		// Mock assignment creation
		(locals.supabase.from('assessment_assignments') as any).select.mockResolvedValueOnce({
			data: [{}, {}], // 2 assignments
			error: null
		});

		// Mock assessment fetch for notification
		(locals.supabase.from('assessments') as any).single.mockResolvedValueOnce({
			data: mockAssessment,
			error: null
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

		const locals = createMockLocals(mockTeacher);

		// Mock teacher profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'teacher', firstname: 'John', lastname: 'Doe' },
			error: null
		});

		// Mock ownership and status check
		(locals.supabase.from('assessments') as any).single.mockResolvedValueOnce({
			data: { created_by: mockTeacher.id, status: 'published' },
			error: null
		});

		// Mock assignment creation
		(locals.supabase.from('assessment_assignments') as any).select.mockResolvedValueOnce({
			data: [{}, {}, {}], // 3 assignments
			error: null
		});

		// Mock assessment fetch for notification
		(locals.supabase.from('assessments') as any).single.mockResolvedValueOnce({
			data: mockAssessment,
			error: null
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

		const locals = createMockLocals(mockTeacher);

		// Mock teacher profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		const request = createMockRequest({
			// No class_ids or student_ids
		});

		const response = await POST({
			request,
			params: { id: mockAssessmentId },
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(400);
		expect(data.error).toBe('Must specify at least one class or student');
	});

	it('should reject when assessment is not published', async () => {
		const { POST } = await import('./[id]/assign/+server');

		const locals = createMockLocals(mockTeacher);

		// Mock teacher profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock ownership check - assessment is draft
		(locals.supabase.from('assessments') as any).single.mockResolvedValueOnce({
			data: { created_by: mockTeacher.id, status: 'draft' },
			error: null
		});

		const request = createMockRequest({
			class_ids: ['class-1']
		});

		const response = await POST({
			request,
			params: { id: mockAssessmentId },
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(400);
		expect(data.error).toBe('Assessment must be published before assigning');
	});

	it('should reject when not authorized', async () => {
		const { POST } = await import('./[id]/assign/+server');

		const locals = createMockLocals(mockTeacher);

		// Mock teacher profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock ownership check - different teacher
		(locals.supabase.from('assessments') as any).single.mockResolvedValueOnce({
			data: { created_by: 'other-teacher', status: 'published' },
			error: null
		});

		const request = createMockRequest({
			class_ids: ['class-1']
		});

		const response = await POST({
			request,
			params: { id: mockAssessmentId },
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(403);
		expect(data.error).toBe('Forbidden - Not your assessment');
	});
});

// ============================================================================
// POST /api/assessments/[id]/validate-attempt - VALIDATE ATTEMPT
// ============================================================================

describe('POST /api/assessments/[id]/validate-attempt', () => {
	it('should reject unauthenticated requests', async () => {
		const { POST } = await import('./[id]/validate-attempt/+server');

		const locals = createMockLocals(); // No user

		const response = await POST({
			params: { id: mockAssignmentId },
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(401);
		expect(data.error).toBe('Unauthorized');
	});

	it('should reject non-student users', async () => {
		const { POST } = await import('./[id]/validate-attempt/+server');

		const locals = createMockLocals(mockTeacher);

		// Mock teacher profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		const response = await POST({
			params: { id: mockAssignmentId },
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(403);
		expect(data.error).toBe('Forbidden - Students only');
	});

	it('should allow attempt when conditions are met', async () => {
		const { POST } = await import('./[id]/validate-attempt/+server');

		const locals = createMockLocals(mockStudent);

		// Mock student profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'student' },
			error: null
		});

		// Mock assignment fetch
		(locals.supabase.from('assessment_assignments') as any).single.mockResolvedValueOnce({
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
		(locals.supabase.from('test_sessions') as any).select.mockResolvedValueOnce({
			data: [{ id: 'attempt-1' }],
			error: null
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

		const locals = createMockLocals(mockStudent);

		// Mock student profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'student' },
			error: null
		});

		const pastDeadline = new Date('2020-01-01').toISOString();

		// Mock assignment fetch with past deadline
		(locals.supabase.from('assessment_assignments') as any).single.mockResolvedValueOnce({
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

		const locals = createMockLocals(mockStudent);

		// Mock student profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'student' },
			error: null
		});

		// Mock assignment fetch
		(locals.supabase.from('assessment_assignments') as any).single.mockResolvedValueOnce({
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
		(locals.supabase.from('test_sessions') as any).select.mockResolvedValueOnce({
			data: [{ id: 'attempt-1' }, { id: 'attempt-2' }],
			error: null
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

		const response = await GET({
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(401);
		expect(data.error).toBe('Unauthorized');
	});

	it('should reject non-student users', async () => {
		const { GET } = await import('./assigned/+server');

		const locals = createMockLocals(mockTeacher);

		// Mock teacher profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		const response = await GET({
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(403);
		expect(data.error).toBe('Forbidden - Students only');
	});

	it('should return student assignments', async () => {
		const { GET } = await import('./assigned/+server');

		const locals = createMockLocals(mockStudent);

		// Mock student profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'student' },
			error: null
		});

		// Mock student's classes
		(locals.supabase.from('class_members') as any).select.mockResolvedValueOnce({
			data: [{ class_id: 'class-1' }],
			error: null
		});

		// Mock assignments
		const assignments = [
			{
				id: 'assign-1',
				assessment: { ...mockAssessment, status: 'published' as const }
			}
		];
		(locals.supabase.from('assessment_assignments') as any).then.mockResolvedValueOnce({
			data: assignments,
			error: null
		});

		// Mock attempts
		(locals.supabase.from('test_sessions') as any).select.mockResolvedValueOnce({
			data: [],
			error: null
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

		const locals = createMockLocals(mockStudent);

		// Mock student profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'student' },
			error: null
		});

		// Mock no classes
		(locals.supabase.from('class_members') as any).select.mockResolvedValueOnce({
			data: [],
			error: null
		});

		// Mock no assignments
		(locals.supabase.from('assessment_assignments') as any).then.mockResolvedValueOnce({
			data: [],
			error: null
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

		const locals = createMockLocals(mockStudent);

		// Mock student profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'student' },
			error: null
		});

		// Mock database error
		(locals.supabase.from('class_members') as any).select.mockResolvedValueOnce({
			data: null,
			error: { message: 'Database error' }
		});

		const response = await GET({
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(500);
		expect(data.error).toBe('Failed to fetch assigned assessments');
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

		const response = await GET({
			params: { id: mockAssessmentId },
			url,
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(401);
		expect(data.error).toBe('Unauthorized');
	});

	it('should reject non-teacher users', async () => {
		const { GET } = await import('./[id]/results/+server');

		const locals = createMockLocals(mockStudent);

		// Mock student profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'student' },
			error: null
		});

		const url = createMockURL();

		const response = await GET({
			params: { id: mockAssessmentId },
			url,
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(403);
		expect(data.error).toBe('Forbidden - Teachers only');
	});

	it('should reject when teacher does not own assessment', async () => {
		const { GET } = await import('./[id]/results/+server');

		const locals = createMockLocals(mockTeacher);

		// Mock teacher profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock assessment owned by different teacher
		(locals.supabase.from('assessments') as any).single.mockResolvedValueOnce({
			data: { created_by: 'other-teacher' },
			error: null
		});

		const url = createMockURL();

		const response = await GET({
			params: { id: mockAssessmentId },
			url,
			locals
		} as any);

		const data = await response.json();
		expect(response.status).toBe(403);
		expect(data.error).toBe('Forbidden - Not your assessment');
	});

	it('should return results successfully', async () => {
		const { GET } = await import('./[id]/results/+server');

		const locals = createMockLocals(mockTeacher);

		// Mock teacher profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock assessment ownership check
		(locals.supabase.from('assessments') as any).single.mockResolvedValueOnce({
			data: { created_by: mockTeacher.id },
			error: null
		});

		// Mock assignments fetch
		(locals.supabase.from('assessment_assignments') as any).select.mockResolvedValueOnce({
			data: [],
			error: null
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

		const locals = createMockLocals(mockTeacher);

		// Mock teacher profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock assessment ownership check
		(locals.supabase.from('assessments') as any).single.mockResolvedValueOnce({
			data: { created_by: mockTeacher.id },
			error: null
		});

		// Mock assignments fetch
		(locals.supabase.from('assessment_assignments') as any).select.mockResolvedValueOnce({
			data: [],
			error: null
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

		const locals = createMockLocals(mockTeacher);

		// Mock teacher profile check
		(locals.supabase.from('profiles') as any).single.mockResolvedValueOnce({
			data: { role: 'teacher' },
			error: null
		});

		// Mock assessment ownership check
		(locals.supabase.from('assessments') as any).single.mockResolvedValueOnce({
			data: { created_by: mockTeacher.id },
			error: null
		});

		// Mock assignments fetch
		(locals.supabase.from('assessment_assignments') as any).select.mockResolvedValueOnce({
			data: [],
			error: null
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
