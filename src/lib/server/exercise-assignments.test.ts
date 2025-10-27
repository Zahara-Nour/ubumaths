/**
 * Exercise Assignment Server Functions - Unit Tests
 * ===================================================
 *
 * Comprehensive test suite for exercise assignment system functions.
 * Tests assignment CRUD, completion tracking, access control, and statistics.
 *
 * Uses mocked Supabase client to isolate business logic from database.
 *
 * @module server/exercise-assignments.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import * as assignments from './exercise-assignments';
import type {
	ExerciseAssignment,
	ExerciseCompletion,
	CreateExerciseAssignment,
	BulkAssignmentData,
	StudentExerciseFilters,
	TeacherAssignmentFilters
} from '$lib/exercises/types';
import { validateAssignmentData } from '$lib/exercises/types';

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
const mockExerciseId = 'ex-789';
const mockClassId = 'class-abc';
const mockAssignmentId = 'assign-xyz';

const mockExercise = {
	id: mockExerciseId,
	created_by: mockTeacherId,
	title: 'Test Exercise',
	difficulty: 1,
	tags: ['test'],
	statement_md: 'Test statement',
	solution_md: 'Test solution',
	distribution_mode: 'on_demand',
	is_public: false,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z'
};

const mockAssignment: ExerciseAssignment = {
	id: mockAssignmentId,
	exercise_id: mockExerciseId,
	assigned_by: mockTeacherId,
	assigned_to_type: 'student',
	student_id: mockStudentId,
	class_id: null,
	assigned_at: '2024-01-15T10:00:00Z',
	optional_deadline: '2024-01-20T23:59:59Z',
	notes: 'Test assignment',
	is_active: true
};

const mockCompletion: ExerciseCompletion = {
	id: 'completion-123',
	exercise_id: mockExerciseId,
	assignment_id: mockAssignmentId,
	student_id: mockStudentId,
	completed_at: null,
	last_viewed_at: '2024-01-15T10:30:00Z',
	view_count: 1,
	created_at: '2024-01-15T10:30:00Z'
};

// ============================================================================
// ASSIGNMENT CREATION TESTS
// ============================================================================

describe('createExerciseAssignment', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		supabase = createMockSupabase();
		vi.clearAllMocks();
	});

	it('should create a valid student assignment', async () => {
		const assignmentData: CreateExerciseAssignment = {
			exercise_id: mockExerciseId,
			assigned_to_type: 'student',
			student_id: mockStudentId,
			optional_deadline: '2024-01-20T23:59:59Z',
			notes: 'Complete this week'
		};

		// Mock exercise ownership check
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: mockExercise,
			error: null
		});

		// Mock assignment creation
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: mockAssignment,
			error: null
		});

		const result = await assignments.createExerciseAssignment(
			supabase,
			assignmentData,
			mockTeacherId
		);

		expect(result.error).toBeNull();
		expect(result.data).toEqual(mockAssignment);
		expect(supabase.from).toHaveBeenCalledWith('exercises');
		expect(supabase.from).toHaveBeenCalledWith('exercise_assignments');
	});

	it('should reject assignment when teacher does not own exercise', async () => {
		const assignmentData: CreateExerciseAssignment = {
			exercise_id: mockExerciseId,
			assigned_to_type: 'student',
			student_id: mockStudentId
		};

		// Mock exercise owned by different teacher
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { ...mockExercise, created_by: 'other-teacher' },
			error: null
		});

		const result = await assignments.createExerciseAssignment(
			supabase,
			assignmentData,
			mockTeacherId
		);

		expect(result.error).toBe('Not authorized to assign this exercise');
		expect(result.data).toBeNull();
	});

	it('should reject invalid assignment data (student type without student_id)', async () => {
		const assignmentData: CreateExerciseAssignment = {
			exercise_id: mockExerciseId,
			assigned_to_type: 'student'
			// Missing student_id
		};

		const result = await assignments.createExerciseAssignment(
			supabase,
			assignmentData,
			mockTeacherId
		);

		expect(result.error).toBe('student_id required for student assignment');
		expect(result.data).toBeNull();
	});

	it('should reject assignment when exercise not found', async () => {
		const assignmentData: CreateExerciseAssignment = {
			exercise_id: 'non-existent-id',
			assigned_to_type: 'public'
		};

		// Mock exercise not found
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: null,
			error: { message: 'Not found' }
		});

		const result = await assignments.createExerciseAssignment(
			supabase,
			assignmentData,
			mockTeacherId
		);

		expect(result.error).toBe('Exercise not found');
		expect(result.data).toBeNull();
	});

	it('should create class assignment with correct fields', async () => {
		const assignmentData: CreateExerciseAssignment = {
			exercise_id: mockExerciseId,
			assigned_to_type: 'class',
			class_id: mockClassId,
			notes: 'For class 3ème A'
		};

		// Mock ownership check
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: mockExercise,
			error: null
		});

		// Mock creation
		const classAssignment = {
			...mockAssignment,
			assigned_to_type: 'class',
			student_id: null,
			class_id: mockClassId
		};
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: classAssignment,
			error: null
		});

		const result = await assignments.createExerciseAssignment(
			supabase,
			assignmentData,
			mockTeacherId
		);

		expect(result.error).toBeNull();
		expect(result.data?.assigned_to_type).toBe('class');
		expect(result.data?.class_id).toBe(mockClassId);
		expect(result.data?.student_id).toBeNull();
	});

	it('should create public assignment', async () => {
		const assignmentData: CreateExerciseAssignment = {
			exercise_id: mockExerciseId,
			assigned_to_type: 'public'
		};

		// Mock ownership check
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: mockExercise,
			error: null
		});

		// Mock creation
		const publicAssignment = {
			...mockAssignment,
			assigned_to_type: 'public',
			student_id: null,
			class_id: null
		};
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: publicAssignment,
			error: null
		});

		const result = await assignments.createExerciseAssignment(
			supabase,
			assignmentData,
			mockTeacherId
		);

		expect(result.error).toBeNull();
		expect(result.data?.assigned_to_type).toBe('public');
		expect(result.data?.student_id).toBeNull();
		expect(result.data?.class_id).toBeNull();
	});
});

// ============================================================================
// BULK ASSIGNMENT TESTS
// ============================================================================

describe('createBulkAssignments', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		supabase = createMockSupabase();
		vi.clearAllMocks();
	});

	it('should create multiple student assignments', async () => {
		const bulkData: BulkAssignmentData = {
			exercise_id: mockExerciseId,
			students: ['student-1', 'student-2', 'student-3'],
			optional_deadline: '2024-01-20T23:59:59Z',
			notes: 'Homework'
		};

		// Mock ownership check
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: mockExercise,
			error: null
		});

		// Mock bulk insert
		(supabase as any)._mockChain.then.mockResolvedValueOnce({
			data: [{}, {}, {}], // 3 assignments created
			error: null
		});

		const result = await assignments.createBulkAssignments(supabase, bulkData, mockTeacherId);

		expect(result.error).toBeNull();
		expect(result.count).toBe(3);
	});

	it('should create multiple class assignments', async () => {
		const bulkData: BulkAssignmentData = {
			exercise_id: mockExerciseId,
			classes: ['class-3a', 'class-3b'],
			notes: 'For all 3ème classes'
		};

		// Mock ownership check
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: mockExercise,
			error: null
		});

		// Mock bulk insert
		(supabase as any)._mockChain.then.mockResolvedValueOnce({
			data: [{}, {}], // 2 assignments created
			error: null
		});

		const result = await assignments.createBulkAssignments(supabase, bulkData, mockTeacherId);

		expect(result.error).toBeNull();
		expect(result.count).toBe(2);
	});

	it('should create mix of students, classes, and public', async () => {
		const bulkData: BulkAssignmentData = {
			exercise_id: mockExerciseId,
			students: ['student-1'],
			classes: ['class-3a'],
			make_public: true
		};

		// Mock ownership check
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: mockExercise,
			error: null
		});

		// Mock bulk insert (1 student + 1 class + 1 public = 3)
		(supabase as any)._mockChain.then.mockResolvedValueOnce({
			data: [{}, {}, {}],
			error: null
		});

		const result = await assignments.createBulkAssignments(supabase, bulkData, mockTeacherId);

		expect(result.error).toBeNull();
		expect(result.count).toBe(3);
	});

	it('should reject bulk assignment without targets', async () => {
		const bulkData: BulkAssignmentData = {
			exercise_id: mockExerciseId
			// No students, classes, or make_public
		};

		const result = await assignments.createBulkAssignments(supabase, bulkData, mockTeacherId);

		expect(result.error).toBe('At least one assignment target required');
		expect(result.count).toBe(0);
	});

	it('should reject bulk assignment when not authorized', async () => {
		const bulkData: BulkAssignmentData = {
			exercise_id: mockExerciseId,
			students: ['student-1']
		};

		// Mock exercise owned by different teacher
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { ...mockExercise, created_by: 'other-teacher' },
			error: null
		});

		const result = await assignments.createBulkAssignments(supabase, bulkData, mockTeacherId);

		expect(result.error).toBe('Not authorized to assign this exercise');
		expect(result.count).toBe(0);
	});
});

// ============================================================================
// ASSIGNMENT UPDATE TESTS
// ============================================================================

describe('updateAssignment', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		supabase = createMockSupabase();
		vi.clearAllMocks();
	});

	it('should update assignment deadline', async () => {
		const updates = {
			optional_deadline: '2024-01-25T23:59:59Z'
		};

		// Mock ownership check
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { assigned_by: mockTeacherId },
			error: null
		});

		// Mock update
		const updatedAssignment = { ...mockAssignment, ...updates };
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: updatedAssignment,
			error: null
		});

		const result = await assignments.updateAssignment(
			supabase,
			mockAssignmentId,
			updates,
			mockTeacherId
		);

		expect(result.error).toBeNull();
		expect(result.data?.optional_deadline).toBe('2024-01-25T23:59:59Z');
	});

	it('should update assignment notes', async () => {
		const updates = {
			notes: 'Updated notes'
		};

		// Mock ownership check
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { assigned_by: mockTeacherId },
			error: null
		});

		// Mock update
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { ...mockAssignment, ...updates },
			error: null
		});

		const result = await assignments.updateAssignment(
			supabase,
			mockAssignmentId,
			updates,
			mockTeacherId
		);

		expect(result.error).toBeNull();
		expect(result.data?.notes).toBe('Updated notes');
	});

	it('should deactivate assignment', async () => {
		const updates = {
			is_active: false
		};

		// Mock ownership check
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { assigned_by: mockTeacherId },
			error: null
		});

		// Mock update
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { ...mockAssignment, is_active: false },
			error: null
		});

		const result = await assignments.updateAssignment(
			supabase,
			mockAssignmentId,
			updates,
			mockTeacherId
		);

		expect(result.error).toBeNull();
		expect(result.data?.is_active).toBe(false);
	});

	it('should reject update when not authorized', async () => {
		const updates = { notes: 'New notes' };

		// Mock ownership check - different teacher
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { assigned_by: 'other-teacher' },
			error: null
		});

		const result = await assignments.updateAssignment(
			supabase,
			mockAssignmentId,
			updates,
			mockTeacherId
		);

		expect(result.error).toBe('Not authorized to update this assignment');
		expect(result.data).toBeNull();
	});

	it('should reject update when assignment not found', async () => {
		const updates = { notes: 'New notes' };

		// Mock assignment not found
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: null,
			error: { message: 'Not found' }
		});

		const result = await assignments.updateAssignment(
			supabase,
			'non-existent-id',
			updates,
			mockTeacherId
		);

		expect(result.error).toBe('Assignment not found');
		expect(result.data).toBeNull();
	});
});

// ============================================================================
// ASSIGNMENT DELETION TESTS
// ============================================================================

describe('deleteAssignment', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		supabase = createMockSupabase();
		vi.clearAllMocks();
	});

	it('should soft delete assignment (default)', async () => {
		// Mock ownership check
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { assigned_by: mockTeacherId },
			error: null
		});

		// Mock update (soft delete)
		(supabase as any)._mockChain.then.mockResolvedValueOnce({
			data: {},
			error: null
		});

		const result = await assignments.deleteAssignment(supabase, mockAssignmentId, mockTeacherId);

		expect(result.success).toBe(true);
		expect(result.error).toBeNull();
		expect(supabase.from).toHaveBeenCalledWith('exercise_assignments');
	});

	it('should hard delete assignment when specified', async () => {
		// Mock ownership check
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { assigned_by: mockTeacherId },
			error: null
		});

		// Mock delete
		(supabase as any)._mockChain.then.mockResolvedValueOnce({
			data: {},
			error: null
		});

		const result = await assignments.deleteAssignment(
			supabase,
			mockAssignmentId,
			mockTeacherId,
			true
		);

		expect(result.success).toBe(true);
		expect(result.error).toBeNull();
	});

	it('should reject delete when not authorized', async () => {
		// Mock ownership check - different teacher
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: { assigned_by: 'other-teacher' },
			error: null
		});

		const result = await assignments.deleteAssignment(supabase, mockAssignmentId, mockTeacherId);

		expect(result.success).toBe(false);
		expect(result.error).toBe('Not authorized to delete this assignment');
	});

	it('should reject delete when assignment not found', async () => {
		// Mock assignment not found
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: null,
			error: { message: 'Not found' }
		});

		const result = await assignments.deleteAssignment(supabase, 'non-existent-id', mockTeacherId);

		expect(result.success).toBe(false);
		expect(result.error).toBe('Assignment not found');
	});
});

// ============================================================================
// COMPLETION TRACKING TESTS
// ============================================================================

describe('markExerciseAsViewed', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		supabase = createMockSupabase();
		vi.clearAllMocks();
	});

	it('should create new completion record on first view', async () => {
		// Mock no existing completion
		(supabase as any)._mockChain.maybeSingle.mockResolvedValueOnce({
			data: null,
			error: null
		});

		// Mock creation
		const newCompletion = { ...mockCompletion, view_count: 1 };
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: newCompletion,
			error: null
		});

		const result = await assignments.markExerciseAsViewed(
			supabase,
			mockExerciseId,
			mockStudentId,
			mockAssignmentId
		);

		expect(result.error).toBeNull();
		expect(result.data?.view_count).toBe(1);
		expect(result.data?.completed_at).toBeNull();
	});

	it('should increment view count on subsequent views', async () => {
		// Mock existing completion
		const existingCompletion = { ...mockCompletion, view_count: 2 };
		(supabase as any)._mockChain.maybeSingle.mockResolvedValueOnce({
			data: existingCompletion,
			error: null
		});

		// Mock update
		const updatedCompletion = { ...existingCompletion, view_count: 3 };
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: updatedCompletion,
			error: null
		});

		const result = await assignments.markExerciseAsViewed(supabase, mockExerciseId, mockStudentId);

		expect(result.error).toBeNull();
		expect(result.data?.view_count).toBe(3);
	});

	it('should update last_viewed_at timestamp', async () => {
		const now = new Date().toISOString();

		// Mock existing completion
		(supabase as any)._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockCompletion,
			error: null
		});

		// Mock update with new timestamp
		const updatedCompletion = {
			...mockCompletion,
			view_count: 2,
			last_viewed_at: now
		};
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: updatedCompletion,
			error: null
		});

		const result = await assignments.markExerciseAsViewed(supabase, mockExerciseId, mockStudentId);

		expect(result.error).toBeNull();
		expect(result.data?.last_viewed_at).toBeDefined();
	});
});

describe('markExerciseAsComplete', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		supabase = createMockSupabase();
		vi.clearAllMocks();
	});

	it('should mark exercise as complete (new completion record)', async () => {
		// Mock no existing completion
		(supabase as any)._mockChain.maybeSingle.mockResolvedValueOnce({
			data: null,
			error: null
		});

		// Mock creation with completed_at set
		const now = new Date().toISOString();
		const completedRecord = {
			...mockCompletion,
			completed_at: now,
			last_viewed_at: now,
			view_count: 1
		};
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: completedRecord,
			error: null
		});

		const result = await assignments.markExerciseAsComplete(
			supabase,
			mockExerciseId,
			mockStudentId
		);

		expect(result.error).toBeNull();
		expect(result.data?.completed_at).toBeTruthy();
		expect(result.data?.view_count).toBe(1);
	});

	it('should mark exercise as complete (existing completion record)', async () => {
		// Mock existing completion (not yet completed)
		(supabase as any)._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockCompletion,
			error: null
		});

		// Mock update with completed_at set
		const now = new Date().toISOString();
		const completedRecord = {
			...mockCompletion,
			completed_at: now,
			view_count: 2
		};
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: completedRecord,
			error: null
		});

		const result = await assignments.markExerciseAsComplete(
			supabase,
			mockExerciseId,
			mockStudentId
		);

		expect(result.error).toBeNull();
		expect(result.data?.completed_at).toBeTruthy();
		expect(result.data?.view_count).toBe(2);
	});
});

describe('markExerciseAsIncomplete', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		supabase = createMockSupabase();
		vi.clearAllMocks();
	});

	it('should unmark exercise as complete', async () => {
		// Mock update clearing completed_at
		const now = new Date().toISOString();
		const incompletedRecord = {
			...mockCompletion,
			completed_at: null,
			last_viewed_at: now
		};
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: incompletedRecord,
			error: null
		});

		const result = await assignments.markExerciseAsIncomplete(
			supabase,
			mockExerciseId,
			mockStudentId
		);

		expect(result.error).toBeNull();
		expect(result.data?.completed_at).toBeNull();
	});

	it('should preserve view count when unmarking', async () => {
		const incompletedRecord = {
			...mockCompletion,
			completed_at: null,
			view_count: 5 // Preserve existing view count
		};
		(supabase as any)._mockChain.single.mockResolvedValueOnce({
			data: incompletedRecord,
			error: null
		});

		const result = await assignments.markExerciseAsIncomplete(
			supabase,
			mockExerciseId,
			mockStudentId
		);

		expect(result.error).toBeNull();
		expect(result.data?.view_count).toBe(5);
	});
});

// ============================================================================
// ACCESS CONTROL TESTS
// ============================================================================

describe('studentHasAccess', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		supabase = createMockSupabase();
		vi.clearAllMocks();
	});

	it('should return true when student has access', async () => {
		// Mock RPC call returning true
		(supabase.rpc as any).mockResolvedValueOnce({
			data: true,
			error: null
		});

		const hasAccess = await assignments.studentHasAccess(supabase, mockExerciseId, mockStudentId);

		expect(hasAccess).toBe(true);
		expect(supabase.rpc).toHaveBeenCalledWith('student_has_exercise_access', {
			p_exercise_id: mockExerciseId,
			p_student_id: mockStudentId
		});
	});

	it('should return false when student does not have access', async () => {
		// Mock RPC call returning false
		(supabase.rpc as any).mockResolvedValueOnce({
			data: false,
			error: null
		});

		const hasAccess = await assignments.studentHasAccess(supabase, mockExerciseId, mockStudentId);

		expect(hasAccess).toBe(false);
	});

	it('should return false on error', async () => {
		// Mock RPC error
		(supabase.rpc as any).mockResolvedValueOnce({
			data: null,
			error: { message: 'Database error' }
		});

		const hasAccess = await assignments.studentHasAccess(supabase, mockExerciseId, mockStudentId);

		expect(hasAccess).toBe(false);
	});
});

describe('getStudentClasses', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		supabase = createMockSupabase();
		vi.clearAllMocks();
	});

	it('should return list of class IDs', async () => {
		// Mock class membership query
		(supabase as any)._mockChain.then.mockResolvedValueOnce({
			data: [{ class_id: 'class-1' }, { class_id: 'class-2' }, { class_id: 'class-3' }],
			error: null
		});

		const result = await assignments.getStudentClasses(supabase, mockStudentId);

		expect(result.error).toBeNull();
		expect(result.data).toEqual(['class-1', 'class-2', 'class-3']);
	});

	it('should return empty array when student has no classes', async () => {
		// Mock empty result
		(supabase as any)._mockChain.then.mockResolvedValueOnce({
			data: [],
			error: null
		});

		const result = await assignments.getStudentClasses(supabase, mockStudentId);

		expect(result.error).toBeNull();
		expect(result.data).toEqual([]);
	});

	it('should handle error gracefully', async () => {
		// Mock error
		(supabase as any)._mockChain.then.mockResolvedValueOnce({
			data: null,
			error: { message: 'Database error' }
		});

		const result = await assignments.getStudentClasses(supabase, mockStudentId);

		expect(result.error).toBe('Database error');
		expect(result.data).toEqual([]);
	});
});

// ============================================================================
// STATISTICS TESTS
// ============================================================================

describe('getStudentProgress', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		supabase = createMockSupabase();
		vi.clearAllMocks();
	});

	it('should calculate progress correctly', async () => {
		// Mock get_student_exercises RPC
		(supabase.rpc as any).mockResolvedValueOnce({
			data: ['ex-1', 'ex-2', 'ex-3', 'ex-4', 'ex-5'], // 5 exercises
			error: null
		});

		// Mock completions query (3 completed)
		(supabase as any)._mockChain.then.mockResolvedValueOnce({
			data: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }],
			error: null
		});

		const result = await assignments.getStudentProgress(supabase, mockStudentId);

		expect(result.error).toBeNull();
		expect(result.total_assigned).toBe(5);
		expect(result.total_completed).toBe(3);
		expect(result.completion_percentage).toBe(60); // 3/5 = 60%
	});

	it('should return zero progress when no exercises assigned', async () => {
		// Mock empty exercises list
		(supabase.rpc as any).mockResolvedValueOnce({
			data: [],
			error: null
		});

		const result = await assignments.getStudentProgress(supabase, mockStudentId);

		expect(result.error).toBeNull();
		expect(result.total_assigned).toBe(0);
		expect(result.total_completed).toBe(0);
		expect(result.completion_percentage).toBe(0);
	});

	it('should handle 100% completion', async () => {
		// Mock exercises
		(supabase.rpc as any).mockResolvedValueOnce({
			data: ['ex-1', 'ex-2'],
			error: null
		});

		// Mock all completed
		(supabase as any)._mockChain.then.mockResolvedValueOnce({
			data: [{ id: 'c1' }, { id: 'c2' }],
			error: null
		});

		const result = await assignments.getStudentProgress(supabase, mockStudentId);

		expect(result.error).toBeNull();
		expect(result.total_assigned).toBe(2);
		expect(result.total_completed).toBe(2);
		expect(result.completion_percentage).toBe(100);
	});
});

// ============================================================================
// HELPER FUNCTION TESTS
// ============================================================================

describe('validateAssignmentData', () => {
	it('should validate student assignment with student_id', () => {
		const data: CreateExerciseAssignment = {
			exercise_id: 'ex-123',
			assigned_to_type: 'student',
			student_id: 'student-456'
		};

		const result = validateAssignmentData(data);
		expect(result.valid).toBe(true);
		expect(result.error).toBeUndefined();
	});

	it('should reject student assignment without student_id', () => {
		const data: CreateExerciseAssignment = {
			exercise_id: 'ex-123',
			assigned_to_type: 'student'
		};

		const result = validateAssignmentData(data);
		expect(result.valid).toBe(false);
		expect(result.error).toBe('student_id required for student assignment');
	});

	it('should validate class assignment with class_id', () => {
		const data: CreateExerciseAssignment = {
			exercise_id: 'ex-123',
			assigned_to_type: 'class',
			class_id: 'class-abc'
		};

		const result = validateAssignmentData(data);
		expect(result.valid).toBe(true);
	});

	it('should reject class assignment without class_id', () => {
		const data: CreateExerciseAssignment = {
			exercise_id: 'ex-123',
			assigned_to_type: 'class'
		};

		const result = validateAssignmentData(data);
		expect(result.valid).toBe(false);
		expect(result.error).toBe('class_id required for class assignment');
	});

	it('should validate public assignment without target IDs', () => {
		const data: CreateExerciseAssignment = {
			exercise_id: 'ex-123',
			assigned_to_type: 'public'
		};

		const result = validateAssignmentData(data);
		expect(result.valid).toBe(true);
	});

	it('should reject public assignment with student_id', () => {
		const data: CreateExerciseAssignment = {
			exercise_id: 'ex-123',
			assigned_to_type: 'public',
			student_id: 'student-456'
		};

		const result = validateAssignmentData(data);
		expect(result.valid).toBe(false);
		expect(result.error).toBe('public assignment cannot have student_id or class_id');
	});

	it('should reject public assignment with class_id', () => {
		const data: CreateExerciseAssignment = {
			exercise_id: 'ex-123',
			assigned_to_type: 'public',
			class_id: 'class-abc'
		};

		const result = validateAssignmentData(data);
		expect(result.valid).toBe(false);
	});
});
