/**
 * Assessment Server Functions - Unit Tests
 * =========================================
 *
 * Comprehensive test suite for assessment system server functions.
 * Tests CRUD operations, assignment management, attempt validation, and statistics.
 *
 * Uses mocked Supabase client to isolate business logic from database.
 *
 * @module server/assessments.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import * as assessments from './assessments';
import type {
	CreateAssessmentData,
	UpdateAssessmentData,
	AssignAssessmentData,
	DbAssessment,
	DbAssessmentAssignment
} from '$lib/types/assessment';
import { DEFAULT_ASSESSMENT_SETTINGS } from '$lib/types/assessment';

// ============================================================================
// MOCK SETUP
// ============================================================================

type MockSupabaseClient = SupabaseClient<Database>;

/**
 * Create a mock Supabase client with chainable query builder
 */
function createMockSupabase() {
	const mockChain = {
		select: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		update: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		neq: vi.fn().mockReturnThis(),
		in: vi.fn().mockReturnThis(),
		not: vi.fn().mockReturnThis(),
		or: vi.fn().mockReturnThis(),
		order: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		single: vi.fn(),
		maybeSingle: vi.fn(),
		// Terminal operations that return promises
		then: vi.fn()
	};

	return {
		from: vi.fn(() => mockChain),
		rpc: vi.fn(),
		_mockChain: mockChain
	} as unknown as MockSupabaseClient & { _mockChain: typeof mockChain };
}

// ============================================================================
// TEST DATA FIXTURES
// ============================================================================

const mockTeacherId = 'teacher-123';
const mockStudentId = 'student-456';
const mockAssessmentId = 'assessment-789';
const mockClassId = 'class-abc';
const mockAssignmentId = 'assign-xyz';

const mockAssessment: DbAssessment = {
	id: mockAssessmentId,
	title: 'Test Assessment',
	grade: '3ème',
	description: 'Test description',
	created_by: mockTeacherId,
	categories: [
		{
			id: 'cat-1',
			bank_id: 'bank-1',
			count: 5,
			title: 'Algebra',
			filters: {}
		}
	],
	settings: DEFAULT_ASSESSMENT_SETTINGS,
	status: 'draft',
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z'
};

const mockAssignment: DbAssessmentAssignment = {
	id: mockAssignmentId,
	assessment_id: mockAssessmentId,
	class_id: mockClassId,
	student_id: null,
	assigned_by: mockTeacherId,
	assigned_at: '2024-01-15T10:00:00Z'
};

// ============================================================================
// ASSESSMENT CRUD TESTS
// ============================================================================

describe('createAssessment', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		supabase = createMockSupabase();
		vi.clearAllMocks();
	});

	it('should create a draft assessment successfully', async () => {
		const assessmentData: CreateAssessmentData = {
			title: 'New Assessment',
			grade: '4ème',
			description: 'Test description',
			categories: [],
			settings: DEFAULT_ASSESSMENT_SETTINGS,
			status: 'draft'
		};

		// Mock successful creation
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: mockAssessment,
			error: null
		});

		const result = await assessments.createAssessment(supabase, assessmentData, mockTeacherId);

		expect(result.error).toBeNull();
		expect(result.data).toEqual(mockAssessment);
		expect(supabase.from).toHaveBeenCalledWith('assessments');
	});

	it('should create a published assessment', async () => {
		const assessmentData: CreateAssessmentData = {
			title: 'Published Assessment',
			grade: '3ème',
			categories: [],
			settings: DEFAULT_ASSESSMENT_SETTINGS,
			status: 'published'
		};

		const publishedAssessment = { ...mockAssessment, status: 'published' as const };
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: publishedAssessment,
			error: null
		});

		const result = await assessments.createAssessment(supabase, assessmentData, mockTeacherId);

		expect(result.error).toBeNull();
		expect(result.data?.status).toBe('published');
	});

	it('should handle database errors during creation', async () => {
		const assessmentData: CreateAssessmentData = {
			title: 'Test',
			grade: '5ème',
			categories: [],
			settings: DEFAULT_ASSESSMENT_SETTINGS,
			status: 'draft'
		};

		// Mock database error
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: null,
			error: { message: 'Database error' }
		});

		const result = await assessments.createAssessment(supabase, assessmentData, mockTeacherId);

		expect(result.error).toBeTruthy();
		expect(result.data).toBeNull();
	});

	it('should include categories and settings in JSONB format', async () => {
		const categories = [
			{ id: 'cat-1', bank_id: 'bank-1', count: 10, title: 'Geometry', filters: {} }
		];
		const settings = {
			...DEFAULT_ASSESSMENT_SETTINGS,
			max_attempts: 3,
			time_limit: 3600
		};

		const assessmentData: CreateAssessmentData = {
			title: 'Complex Assessment',
			grade: '6ème',
			categories,
			settings,
			status: 'draft'
		};

		const createdAssessment = {
			...mockAssessment,
			categories,
			settings
		};

		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: createdAssessment,
			error: null
		});

		const result = await assessments.createAssessment(supabase, assessmentData, mockTeacherId);

		expect(result.error).toBeNull();
		expect(result.data?.categories).toEqual(categories);
		expect(result.data?.settings).toEqual(settings);
	});
});

describe('getAssessment', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		supabase = createMockSupabase();
		vi.clearAllMocks();
	});

	it('should retrieve assessment by ID', async () => {
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: mockAssessment,
			error: null
		});

		const result = await assessments.getAssessment(supabase, mockAssessmentId);

		expect(result.error).toBeNull();
		expect(result.data).toEqual(mockAssessment);
	});

	it('should handle assessment not found', async () => {
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: null,
			error: { message: 'Not found' }
		});

		const result = await assessments.getAssessment(supabase, 'non-existent-id');

		expect(result.error).toBeTruthy();
		expect(result.data).toBeNull();
	});
});

describe('getTeacherAssessments', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		supabase = createMockSupabase();
		vi.clearAllMocks();
	});

	it('should retrieve all assessments for a teacher', async () => {
		const assessments_list = [
			{ ...mockAssessment, creator: [{ firstname: 'John', lastname: 'Doe' }] },
			{
				...mockAssessment,
				id: 'assessment-2',
				title: 'Assessment 2',
				creator: [{ firstname: 'John', lastname: 'Doe' }]
			}
		];

		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: assessments_list,
					error: null
				})
			);
		});

		const result = await assessments.getTeacherAssessments(supabase, mockTeacherId);

		expect(result.error).toBeNull();
		expect(result.data).toHaveLength(2);
		expect(result.data?.[0].creator).toEqual({ firstname: 'John', lastname: 'Doe' });
	});

	it('should filter assessments by status', async () => {
		const publishedAssessments = [{ ...mockAssessment, status: 'published' as const, creator: [] }];

		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: publishedAssessments,
					error: null
				})
			);
		});

		const result = await assessments.getTeacherAssessments(supabase, mockTeacherId, 'published');

		expect(result.error).toBeNull();
		expect(result.data?.[0].status).toBe('published');
	});

	it('should return empty array when teacher has no assessments', async () => {
		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [],
					error: null
				})
			);
		});

		const result = await assessments.getTeacherAssessments(supabase, mockTeacherId);

		expect(result.error).toBeNull();
		expect(result.data).toEqual([]);
	});
});

describe('updateAssessment', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		supabase = createMockSupabase();
		vi.clearAllMocks();
	});

	it('should update assessment title', async () => {
		const updates: UpdateAssessmentData = {
			title: 'Updated Title'
		};

		// Mock ownership check
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { created_by: mockTeacherId },
			error: null
		});

		// Mock update
		const updatedAssessment = { ...mockAssessment, title: 'Updated Title' };
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: updatedAssessment,
			error: null
		});

		const result = await assessments.updateAssessment(
			supabase,
			mockAssessmentId,
			updates,
			mockTeacherId
		);

		expect(result.error).toBeNull();
		expect(result.data?.title).toBe('Updated Title');
	});

	it('should merge settings with existing settings', async () => {
		const updates: UpdateAssessmentData = {
			settings: {
				max_attempts: 5
			}
		};

		// Mock ownership check
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { created_by: mockTeacherId },
			error: null
		});

		// Mock getting current assessment for settings merge
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: mockAssessment,
			error: null
		});

		// Mock update
		const updatedSettings = { ...DEFAULT_ASSESSMENT_SETTINGS, max_attempts: 5 };
		const updatedAssessment = { ...mockAssessment, settings: updatedSettings };
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: updatedAssessment,
			error: null
		});

		const result = await assessments.updateAssessment(
			supabase,
			mockAssessmentId,
			updates,
			mockTeacherId
		);

		expect(result.error).toBeNull();
		expect(result.data?.settings.max_attempts).toBe(5);
	});

	it('should reject update when not authorized', async () => {
		const updates: UpdateAssessmentData = {
			title: 'Unauthorized Update'
		};

		// Mock ownership check - different teacher
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { created_by: 'other-teacher' },
			error: null
		});

		const result = await assessments.updateAssessment(
			supabase,
			mockAssessmentId,
			updates,
			mockTeacherId
		);

		expect(result.error).toBeTruthy();
		expect(result.error?.message).toBe('Unauthorized');
		expect(result.data).toBeNull();
	});

	it('should reject update when assessment not found', async () => {
		const updates: UpdateAssessmentData = {
			title: 'Update Non-existent'
		};

		// Mock assessment not found
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: null,
			error: { message: 'Not found' }
		});

		const result = await assessments.updateAssessment(
			supabase,
			'non-existent-id',
			updates,
			mockTeacherId
		);

		expect(result.error).toBeTruthy();
		expect(result.data).toBeNull();
	});

	it('should update multiple fields at once', async () => {
		const updates: UpdateAssessmentData = {
			title: 'New Title',
			description: 'New Description',
			grade: '5ème',
			status: 'published'
		};

		// Mock ownership check
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { created_by: mockTeacherId },
			error: null
		});

		// Mock update
		const updatedAssessment = {
			...mockAssessment,
			...updates
		};
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: updatedAssessment,
			error: null
		});

		const result = await assessments.updateAssessment(
			supabase,
			mockAssessmentId,
			updates,
			mockTeacherId
		);

		expect(result.error).toBeNull();
		expect(result.data?.title).toBe('New Title');
		expect(result.data?.description).toBe('New Description');
		expect(result.data?.grade).toBe('5ème');
		expect(result.data?.status).toBe('published');
	});
});

describe('publishAssessment', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		supabase = createMockSupabase();
		vi.clearAllMocks();
	});

	it('should publish a draft assessment', async () => {
		// Mock ownership check
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { created_by: mockTeacherId },
			error: null
		});

		// Mock update
		const publishedAssessment = { ...mockAssessment, status: 'published' as const };
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: publishedAssessment,
			error: null
		});

		const result = await assessments.publishAssessment(supabase, mockAssessmentId, mockTeacherId);

		expect(result.error).toBeNull();
		expect(result.data?.status).toBe('published');
	});
});

describe('archiveAssessment', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		supabase = createMockSupabase();
		vi.clearAllMocks();
	});

	it('should archive an assessment', async () => {
		// Mock ownership check
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { created_by: mockTeacherId },
			error: null
		});

		// Mock update
		const archivedAssessment = { ...mockAssessment, status: 'archived' as const };
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: archivedAssessment,
			error: null
		});

		const result = await assessments.archiveAssessment(supabase, mockAssessmentId, mockTeacherId);

		expect(result.error).toBeNull();
		expect(result.data?.status).toBe('archived');
	});
});

describe('deleteAssessment', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		supabase = createMockSupabase();
		vi.clearAllMocks();
	});

	it('should soft delete by archiving', async () => {
		// Mock ownership check
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { created_by: mockTeacherId },
			error: null
		});

		// Mock archive (soft delete)
		const archivedAssessment = { ...mockAssessment, status: 'archived' as const };
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: archivedAssessment,
			error: null
		});

		const result = await assessments.deleteAssessment(supabase, mockAssessmentId, mockTeacherId);

		expect(result.error).toBeNull();
		expect(result.data?.status).toBe('archived');
	});
});

// ============================================================================
// ASSIGNMENT MANAGEMENT TESTS
// ============================================================================

describe('assignAssessment', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		vi.clearAllMocks();
		supabase = createMockSupabase();
	});

	it('should assign assessment to classes', async () => {
		const assignmentData: AssignAssessmentData = {
			assessment_id: mockAssessmentId,
			class_ids: ['class-1', 'class-2']
		};

		// Mock ownership and status check - first query
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { created_by: mockTeacherId, status: 'published' },
			error: null
		});

		// Mock assignment creation - second query: .insert().select() (awaited directly)
		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [{}, {}], // 2 assignments created
					error: null
				})
			);
		});

		const result = await assessments.assignAssessment(supabase, assignmentData, mockTeacherId);

		expect(result.error).toBeNull();
		expect(result.data).toHaveLength(2);
	});

	it('should assign assessment to individual students', async () => {
		const assignmentData: AssignAssessmentData = {
			assessment_id: mockAssessmentId,
			student_ids: ['student-1', 'student-2', 'student-3']
		};

		// Mock ownership and status check - first query
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { created_by: mockTeacherId, status: 'published' },
			error: null
		});

		// Mock assignment creation - second query: .insert().select() (awaited directly)
		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [{}, {}, {}], // 3 assignments created
					error: null
				})
			);
		});

		const result = await assessments.assignAssessment(supabase, assignmentData, mockTeacherId);

		expect(result.error).toBeNull();
		expect(result.data).toHaveLength(3);
	});

	it('should assign to both classes and students', async () => {
		const assignmentData: AssignAssessmentData = {
			assessment_id: mockAssessmentId,
			class_ids: ['class-1'],
			student_ids: ['student-1', 'student-2']
		};

		// Mock ownership and status check - first query
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { created_by: mockTeacherId, status: 'published' },
			error: null
		});

		// Mock assignment creation - second query: .insert().select() (awaited directly)
		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [{}, {}, {}], // 1 class + 2 students = 3 total
					error: null
				})
			);
		});

		const result = await assessments.assignAssessment(supabase, assignmentData, mockTeacherId);

		expect(result.error).toBeNull();
		expect(result.data).toHaveLength(3);
	});

	it('should reject assignment when not authorized', async () => {
		const assignmentData: AssignAssessmentData = {
			assessment_id: mockAssessmentId,
			class_ids: ['class-1']
		};

		// Mock ownership check - different teacher
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { created_by: 'other-teacher', status: 'published' },
			error: null
		});

		const result = await assessments.assignAssessment(supabase, assignmentData, mockTeacherId);

		expect(result.error).toBeTruthy();
		expect(result.error?.message).toBe('Unauthorized');
		expect(result.data).toBeNull();
	});

	it('should reject assignment when assessment is not published', async () => {
		const assignmentData: AssignAssessmentData = {
			assessment_id: mockAssessmentId,
			class_ids: ['class-1']
		};

		// Mock ownership check - assessment is draft
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { created_by: mockTeacherId, status: 'draft' },
			error: null
		});

		const result = await assessments.assignAssessment(supabase, assignmentData, mockTeacherId);

		expect(result.error).toBeTruthy();
		expect(result.error?.message).toContain('must be published');
		expect(result.data).toBeNull();
	});

	it('should reject assignment when no targets specified', async () => {
		const assignmentData: AssignAssessmentData = {
			assessment_id: mockAssessmentId
			// No class_ids or student_ids
		};

		// Mock ownership and status check
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { created_by: mockTeacherId, status: 'published' },
			error: null
		});

		const result = await assessments.assignAssessment(supabase, assignmentData, mockTeacherId);

		expect(result.error).toBeTruthy();
		expect(result.error?.message).toContain('No assignments specified');
		expect(result.data).toBeNull();
	});

	it('should reject assignment when assessment not found', async () => {
		const assignmentData: AssignAssessmentData = {
			assessment_id: 'non-existent',
			class_ids: ['class-1']
		};

		// Mock assessment not found
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: null,
			error: { message: 'Not found' }
		});

		const result = await assessments.assignAssessment(supabase, assignmentData, mockTeacherId);

		expect(result.error).toBeTruthy();
		expect(result.data).toBeNull();
	});
});

describe('getAssessmentAssignments', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		supabase = createMockSupabase();
		vi.clearAllMocks();
	});

	it('should retrieve all assignments for an assessment', async () => {
		const assignments = [
			{
				...mockAssignment,
				class: { id: mockClassId, name: '3ème A' },
				student: null
			},
			{
				...mockAssignment,
				id: 'assign-2',
				class_id: null,
				student_id: mockStudentId,
				class: null,
				student: { id: mockStudentId, firstname: 'John', lastname: 'Doe' }
			}
		];

		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: assignments,
					error: null
				})
			);
		});

		const result = await assessments.getAssessmentAssignments(supabase, mockAssessmentId);

		expect(result.error).toBeNull();
		expect(result.data).toHaveLength(2);
	});

	it('should return empty array when no assignments exist', async () => {
		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [],
					error: null
				})
			);
		});

		const result = await assessments.getAssessmentAssignments(supabase, mockAssessmentId);

		expect(result.error).toBeNull();
		expect(result.data).toEqual([]);
	});
});

describe('removeAssignment', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		supabase = createMockSupabase();
		vi.clearAllMocks();
	});

	it('should remove an assignment', async () => {
		// Mock assignment fetch
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { assessment_id: mockAssessmentId },
			error: null
		});

		// Mock assessment ownership check
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { created_by: mockTeacherId },
			error: null
		});

		// Mock deletion
		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: {},
					error: null
				})
			);
		});

		const result = await assessments.removeAssignment(supabase, mockAssignmentId, mockTeacherId);

		expect(result.error).toBeNull();
	});

	it('should reject removal when not authorized', async () => {
		// Mock assignment fetch
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { assessment_id: mockAssessmentId },
			error: null
		});

		// Mock assessment ownership check - different teacher
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { created_by: 'other-teacher' },
			error: null
		});

		const result = await assessments.removeAssignment(supabase, mockAssignmentId, mockTeacherId);

		expect(result.error).toBeTruthy();
		expect(result.error?.message).toBe('Unauthorized');
	});

	it('should reject removal when assignment not found', async () => {
		// Mock assignment not found
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: null,
			error: { message: 'Not found' }
		});

		const result = await assessments.removeAssignment(supabase, 'non-existent', mockTeacherId);

		expect(result.error).toBeTruthy();
		expect(result.error?.message).toBe('Assignment not found');
	});
});

// ============================================================================
// STUDENT ASSIGNMENTS TESTS
// ============================================================================

describe('getStudentAssignments', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		vi.clearAllMocks();
		supabase = createMockSupabase();
	});

	it('should get student assignments (direct + class-based)', async () => {
		// Mock student's classes - query 1: .select().eq() (awaited directly)
		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [{ class_id: 'class-1' }, { class_id: 'class-2' }],
					error: null
				})
			);
		});

		// Mock assignments - query 2: .select().eq().or() (awaited directly)
		const assignments = [
			{
				id: 'assign-1',
				assessment: { ...mockAssessment, status: 'published' as const }
			}
		];
		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: assignments,
					error: null
				})
			);
		});

		// Mock attempts fetch for each assignment - query 3: .select().eq().eq() (awaited directly)
		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [],
					error: null
				})
			);
		});

		const result = await assessments.getStudentAssignments(supabase, mockStudentId);

		expect(result.error).toBeNull();
		expect(result.data).toHaveLength(1);
	});

	it('should include attempt statistics for each assignment', async () => {
		// Mock student's classes - query 1: .select().eq() (awaited directly)
		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [],
					error: null
				})
			);
		});

		// Mock assignments - query 2: .select().eq().eq() (awaited directly)
		const assignments = [
			{
				id: 'assign-1',
				assessment: { ...mockAssessment, status: 'published' as const }
			}
		];
		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: assignments,
					error: null
				})
			);
		});

		// Mock attempts with scores - query 3: .select().eq().eq() (awaited directly)
		const attempts = [
			{ score: 7, completed_at: '2024-01-16T10:00:00Z' },
			{ score: 8, completed_at: '2024-01-17T10:00:00Z' },
			{ score: 9, completed_at: '2024-01-18T10:00:00Z' }
		];
		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: attempts,
					error: null
				})
			);
		});

		const result = await assessments.getStudentAssignments(supabase, mockStudentId);

		expect(result.error).toBeNull();
		expect(result.data?.[0].attempts_count).toBe(3);
		expect(result.data?.[0].best_score).toBe(9);
		expect(result.data?.[0].status).toBe('completed');
	});

	it('should return empty array when student has no assignments', async () => {
		// Mock no classes - query 1: .select().eq() (awaited directly)
		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [],
					error: null
				})
			);
		});

		// Mock no assignments - query 2: .select().eq().eq() (awaited directly)
		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [],
					error: null
				})
			);
		});

		const result = await assessments.getStudentAssignments(supabase, mockStudentId);

		expect(result.error).toBeNull();
		expect(result.data).toEqual([]);
	});
});

// ============================================================================
// ATTEMPT VALIDATION TESTS
// ============================================================================

describe('validateAttempt', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		vi.clearAllMocks();
		supabase = createMockSupabase();
	});

	it('should allow attempt when conditions are met', async () => {
		// Mock assignment fetch
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: {
				...mockAssignment,
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

		// Mock existing attempts - query 2: .select().eq().eq() (awaited directly)
		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [{ id: 'attempt-1' }],
					error: null
				})
			);
		});

		const result = await assessments.validateAttempt(supabase, mockAssignmentId, mockStudentId);

		expect(result.can_attempt).toBe(true);
		expect(result.attempts_remaining).toBe(2);
		expect(result.current_attempts).toBe(1);
		expect(result.deadline_passed).toBe(false);
	});

	it('should reject when deadline has passed', async () => {
		const pastDeadline = new Date('2020-01-01').toISOString();

		// Mock assignment fetch with past deadline
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: {
				...mockAssignment,
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

		const result = await assessments.validateAttempt(supabase, mockAssignmentId, mockStudentId);

		expect(result.can_attempt).toBe(false);
		expect(result.reason).toBe('Deadline has passed');
		expect(result.deadline_passed).toBe(true);
	});

	it('should reject when max attempts reached', async () => {
		// Mock assignment fetch
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: {
				...mockAssignment,
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

		// Mock existing attempts - query 2: .select().eq().eq() (awaited directly)
		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [{ id: 'attempt-1' }, { id: 'attempt-2' }],
					error: null
				})
			);
		});

		const result = await assessments.validateAttempt(supabase, mockAssignmentId, mockStudentId);

		expect(result.can_attempt).toBe(false);
		expect(result.reason).toBe('Maximum attempts reached');
		expect(result.attempts_remaining).toBe(0);
		expect(result.current_attempts).toBe(2);
	});

	it('should allow unlimited attempts when max_attempts is null', async () => {
		// Mock assignment fetch
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: {
				...mockAssignment,
				assessment: {
					...mockAssessment,
					settings: {
						...DEFAULT_ASSESSMENT_SETTINGS,
						max_attempts: null,
						deadline: null
					}
				}
			},
			error: null
		});

		// Mock many existing attempts - query 2: .select().eq().eq() (awaited directly)
		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }],
					error: null
				})
			);
		});

		const result = await assessments.validateAttempt(supabase, mockAssignmentId, mockStudentId);

		expect(result.can_attempt).toBe(true);
		expect(result.attempts_remaining).toBeNull(); // Unlimited
		expect(result.current_attempts).toBe(5);
	});

	it('should handle assignment not found', async () => {
		// Mock assignment not found
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: null,
			error: { message: 'Not found' }
		});

		const result = await assessments.validateAttempt(supabase, 'non-existent', mockStudentId);

		expect(result.can_attempt).toBe(false);
		expect(result.reason).toBe('Assignment not found');
	});
});

// ============================================================================
// RESULTS & STATISTICS TESTS
// ============================================================================

describe('getAssessmentResults', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		vi.clearAllMocks();
		supabase = createMockSupabase();
	});

	it('should get results for class assignments', async () => {
		// Query 1: Get assignments - .select().eq() (awaited directly)
		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [
						{
							id: 'assign-1',
							class_id: mockClassId,
							student_id: null
						}
					],
					error: null
				})
			);
		});

		// Query 2: Get class members - .select().eq().eq() (awaited directly)
		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [
						{
							student_id: 'student-1',
							profiles: { id: 'student-1', firstname: 'John', lastname: 'Doe', is_test: false }
						},
						{
							student_id: 'student-2',
							profiles: { id: 'student-2', firstname: 'Jane', lastname: 'Smith', is_test: false }
						}
					],
					error: null
				})
			);
		});

		// For each of 2 students, mock 4 queries from getStudentAssignmentResult
		for (let i = 0; i < 2; i++) {
			// Query 3+: Get assessment info - .select().eq().single()
			(supabase as any)._mockChain.single.mockResolvedValueOnce({
				data: { title: 'Test Assessment', grade: '3ème' },
				error: null
			});
			// Query 4+: Get student info - .select().eq().eq().single()
			(supabase as any)._mockChain.single.mockResolvedValueOnce({
				data: {
					id: `student-${i + 1}`,
					firstname: i === 0 ? 'John' : 'Jane',
					lastname: i === 0 ? 'Doe' : 'Smith',
					is_test: false
				},
				error: null
			});
			// Query 5+: Get class info - .select().eq().single()
			(supabase as any)._mockChain.single.mockResolvedValueOnce({
				data: { name: '3ème A' },
				error: null
			});
			// Query 6+: Get attempts - .select().eq().eq().order() (awaited directly)
			(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
				return Promise.resolve(
					onFulfilled({
						data: [],
						error: null
					})
				);
			});
		}

		const result = await assessments.getAssessmentResults(supabase, mockAssessmentId, false);

		expect(result.error).toBeNull();
		expect(result.data).toHaveLength(2);
	});

	it('should filter test students when isTestMode is true', async () => {
		// Query 1: Get assignments - .select().eq() (awaited directly)
		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [
						{
							id: 'assign-1',
							class_id: mockClassId,
							student_id: null
						}
					],
					error: null
				})
			);
		});

		// Query 2: Get class members - .select().eq().eq() (awaited directly)
		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [
						{
							student_id: 'test-student-1',
							profiles: { id: 'test-student-1', firstname: 'Test', lastname: 'User', is_test: true }
						}
					],
					error: null
				})
			);
		});

		// For 1 test student, mock 4 queries from getStudentAssignmentResult
		// Query 3: Get assessment info - .select().eq().single()
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { title: 'Test Assessment', grade: '3ème' },
			error: null
		});
		// Query 4: Get student info - .select().eq().eq().single()
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { id: 'test-student-1', firstname: 'Test', lastname: 'User', is_test: true },
			error: null
		});
		// Query 5: Get class info - .select().eq().single()
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { name: '3ème A' },
			error: null
		});
		// Query 6: Get attempts - .select().eq().eq().order() (awaited directly)
		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [],
					error: null
				})
			);
		});

		const result = await assessments.getAssessmentResults(supabase, mockAssessmentId, true);

		expect(result.error).toBeNull();
		expect(result.data).toHaveLength(1);
	});

	it('should return empty array when no assignments exist', async () => {
		// Query 1: Get assignments - .select().eq() (awaited directly)
		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [],
					error: null
				})
			);
		});

		const result = await assessments.getAssessmentResults(supabase, mockAssessmentId, false);

		expect(result.error).toBeNull();
		expect(result.data).toEqual([]);
	});
});

describe('getAssessmentStatistics', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		vi.clearAllMocks();
		supabase = createMockSupabase();
	});

	it('should calculate statistics from results', async () => {
		// Query 1: Get assignments - .select().eq() (awaited directly)
		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [{ id: 'assign-1', student_id: 'student-1', class_id: null }],
					error: null
				})
			);
		});

		// Individual student assignment (class_id is null), so getStudentAssignmentResult runs without class query
		// Query 2: Get assessment info - .select().eq().single()
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { title: 'Test', grade: '3ème' },
			error: null
		});
		// Query 3: Get student info - .select().eq().eq().single()
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { id: 'student-1', firstname: 'John', lastname: 'Doe', is_test: false },
			error: null
		});
		// Query 4: Get attempts - .select().eq().eq().order() (awaited directly)
		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [{ score: 8, completed_at: '2024-01-16T10:00:00Z', total_questions: 10 }],
					error: null
				})
			);
		});

		const result = await assessments.getAssessmentStatistics(supabase, mockAssessmentId, false);

		expect(result.error).toBeNull();
		expect(result.data?.total_assigned).toBe(1);
		expect(result.data?.completed).toBe(1);
		expect(result.data?.average_score).toBe(8);
		expect(result.data?.min_score).toBe(8);
		expect(result.data?.max_score).toBe(8);
		expect(result.data?.completion_rate).toBe(100);
	});

	it('should handle zero assignments', async () => {
		// Query 1: Get assignments - .select().eq() (awaited directly)
		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [],
					error: null
				})
			);
		});

		const result = await assessments.getAssessmentStatistics(supabase, mockAssessmentId, false);

		expect(result.error).toBeNull();
		expect(result.data?.total_assigned).toBe(0);
		expect(result.data?.completion_rate).toBe(0);
	});
});

describe('getClassStatistics', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		vi.clearAllMocks();
		supabase = createMockSupabase();
	});

	it('should calculate statistics per class', async () => {
		// Query 1: Get assignments - .select().eq() (awaited directly)
		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [{ id: 'assign-1', class_id: mockClassId, student_id: null }],
					error: null
				})
			);
		});

		// Query 2: Get class members - .select().eq().eq() (awaited directly)
		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [
						{
							student_id: 'student-1',
							profiles: { id: 'student-1', firstname: 'John', lastname: 'Doe', is_test: false }
						},
						{
							student_id: 'student-2',
							profiles: { id: 'student-2', firstname: 'Jane', lastname: 'Smith', is_test: false }
						}
					],
					error: null
				})
			);
		});

		// For each of 2 students, mock 4 queries from getStudentAssignmentResult
		for (let i = 0; i < 2; i++) {
			// Query 3+: Get assessment info - .select().eq().single()
			(supabase as any)._mockChain.single.mockResolvedValueOnce({
				data: { title: 'Test', grade: '3ème' },
				error: null
			});
			// Query 4+: Get student info - .select().eq().eq().single()
			(supabase as any)._mockChain.single.mockResolvedValueOnce({
				data: {
					id: `student-${i + 1}`,
					firstname: i === 0 ? 'John' : 'Jane',
					lastname: i === 0 ? 'Doe' : 'Smith',
					is_test: false
				},
				error: null
			});
			// Query 5+: Get class info - .select().eq().single()
			(supabase as any)._mockChain.single.mockResolvedValueOnce({
				data: { name: '3ème A' },
				error: null
			});
			// Query 6+: Get attempts - .select().eq().eq().order() (awaited directly)
			(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
				return Promise.resolve(
					onFulfilled({
						data: [
							{ score: i === 0 ? 7 : 9, completed_at: '2024-01-16T10:00:00Z', total_questions: 10 }
						],
						error: null
					})
				);
			});
		}

		const result = await assessments.getClassStatistics(supabase, mockAssessmentId, false);

		expect(result.error).toBeNull();
		expect(result.data).toHaveLength(1);
		expect(result.data?.[0].class_name).toBe('3ème A');
		expect(result.data?.[0].total_students).toBe(2);
		expect(result.data?.[0].completed).toBe(2);
		expect(result.data?.[0].average_score).toBe(8); // (7 + 9) / 2
		expect(result.data?.[0].completion_rate).toBe(100);
	});

	it('should return empty array when no class assignments exist', async () => {
		// Query 1: Get assignments (individual student, not class) - .select().eq() (awaited directly)
		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [{ id: 'assign-1', student_id: 'student-1', class_id: null }],
					error: null
				})
			);
		});

		// Individual student assignment (class_id is null), so getStudentAssignmentResult runs without class query
		// Query 2: Get assessment info - .select().eq().single()
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { title: 'Test', grade: '3ème' },
			error: null
		});
		// Query 3: Get student info - .select().eq().eq().single()
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { id: 'student-1', firstname: 'John', lastname: 'Doe', is_test: false },
			error: null
		});
		// Query 4: Get attempts - .select().eq().eq().order() (awaited directly)
		(supabase as any)._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [],
					error: null
				})
			);
		});

		const result = await assessments.getClassStatistics(supabase, mockAssessmentId, false);

		expect(result.error).toBeNull();
		expect(result.data).toEqual([]);
	});
});
