/**
 * Student Access Middleware - Unit Tests
 * ========================================
 *
 * Comprehensive test suite for teacher-student relationship verification.
 * Tests authorization logic for both basic verification and admin bypass.
 *
 * Uses mocked Supabase client to isolate business logic from database.
 *
 * @module server/middleware/student-access.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { Profile } from '../middleware/auth';
import { verifyTeacherStudent, verifyTeacherStudentWithRole } from './student-access';

// ============================================================================
// MOCK SETUP
// ============================================================================

/**
 * Create a mock Supabase client with chainable query builder
 */
function createMockSupabase() {
	const mockChain = {
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis()
	};

	return {
		from: vi.fn(() => mockChain),
		_mockChain: mockChain
	} as unknown as SupabaseClient<Database> & {
		_mockChain: typeof mockChain;
	};
}

type MockSupabaseClient = ReturnType<typeof createMockSupabase>;

// ============================================================================
// TEST DATA FIXTURES
// ============================================================================

const mockTeacherId = 'teacher-uuid-123';
const mockStudentId = 'student-uuid-456';
const mockOtherTeacherId = 'other-teacher-uuid-789';

const mockClassMembershipResponse = [
	{
		class_id: 'class-uuid-abc',
		classes: {
			teacher_id: mockTeacherId
		}
	}
];

const mockMultipleClassMembershipResponse = [
	{
		class_id: 'class-uuid-abc',
		classes: {
			teacher_id: mockTeacherId
		}
	},
	{
		class_id: 'class-uuid-def',
		classes: {
			teacher_id: mockTeacherId
		}
	}
];

const mockNoAccessClassMembershipResponse = [
	{
		class_id: 'class-uuid-xyz',
		classes: {
			teacher_id: mockOtherTeacherId
		}
	}
];

const mockTeacherProfile: Profile = {
	id: mockTeacherId,
	email: 'teacher@voltairedoha.com',
	role: 'teacher',
	firstname: 'John',
	lastname: 'Doe',
	avatar_url: null,
	school_id: 'school-123',
	is_test: false,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z',
	bonus: 0,
	class_ids: null,
	full_name: 'John Doe',
	gender: null,
	gidouilles: 0,
	grade: null,
	vip_cards: {},
	vip_cards_history: {},
	python_settings: null,
	rejection_reason: null,
	status: 'approved',
	status_changed_at: null,
	status_changed_by: null
};

const mockAdminProfile: Profile = {
	...mockTeacherProfile,
	id: 'admin-uuid-999',
	role: 'admin',
	email: 'admin@voltairedoha.com'
};

const mockStudentProfile: Profile = {
	...mockTeacherProfile,
	id: mockStudentId,
	role: 'student',
	email: 'student@voltairedoha.com'
};

// ============================================================================
// TESTS: verifyTeacherStudent()
// ============================================================================

describe('verifyTeacherStudent', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		vi.clearAllMocks();
		supabase = createMockSupabase();
	});

	// ------------------------------------------------------------------------
	// HAPPY PATH
	// ------------------------------------------------------------------------

	it('should return true when teacher teaches student', async () => {
		// Mock successful class membership query
		supabase._mockChain.eq.mockResolvedValueOnce({
			data: mockClassMembershipResponse,
			error: null
		});

		const result = await verifyTeacherStudent(mockTeacherId, mockStudentId, supabase);

		expect(result).toBe(true);
		expect(supabase.from).toHaveBeenCalledWith('class_members');
		expect(supabase._mockChain.select).toHaveBeenCalledWith(expect.stringContaining('class_id'));
		expect(supabase._mockChain.eq).toHaveBeenCalledWith('student_id', mockStudentId);
	});

	it('should return true when teacher teaches student in multiple classes', async () => {
		// Mock multiple class memberships
		supabase._mockChain.eq.mockResolvedValueOnce({
			data: mockMultipleClassMembershipResponse,
			error: null
		});

		const result = await verifyTeacherStudent(mockTeacherId, mockStudentId, supabase);

		expect(result).toBe(true);
	});

	// ------------------------------------------------------------------------
	// UNAUTHORIZED ACCESS
	// ------------------------------------------------------------------------

	it('should return false when teacher does NOT teach student', async () => {
		// Mock class memberships where student is taught by different teacher
		supabase._mockChain.eq.mockResolvedValueOnce({
			data: mockNoAccessClassMembershipResponse,
			error: null
		});

		const result = await verifyTeacherStudent(mockTeacherId, mockStudentId, supabase);

		expect(result).toBe(false);
	});

	it('should return false when student not found (no class memberships)', async () => {
		// Mock empty class memberships array
		supabase._mockChain.eq.mockResolvedValueOnce({
			data: [],
			error: null
		});

		const result = await verifyTeacherStudent(mockTeacherId, mockStudentId, supabase);

		expect(result).toBe(false);
	});

	it('should return false when student ID does not exist', async () => {
		// Mock empty result for non-existent student
		supabase._mockChain.eq.mockResolvedValueOnce({
			data: [],
			error: null
		});

		const result = await verifyTeacherStudent(mockTeacherId, 'non-existent-student-uuid', supabase);

		expect(result).toBe(false);
	});

	// ------------------------------------------------------------------------
	// DATABASE ERRORS (Fail-Closed Security)
	// ------------------------------------------------------------------------

	it('should return false on database error (fail-closed)', async () => {
		// Mock database error
		const mockError = {
			message: 'Database connection failed',
			code: 'PGRST301'
		};

		supabase._mockChain.eq.mockResolvedValueOnce({
			data: null,
			error: mockError
		});

		// Spy on console.error to verify error logging
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await verifyTeacherStudent(mockTeacherId, mockStudentId, supabase);

		expect(result).toBe(false);
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			'[verifyTeacherStudent] Database error:',
			mockError
		);

		consoleErrorSpy.mockRestore();
	});

	it('should return false when query returns null data', async () => {
		// Mock null data response
		supabase._mockChain.eq.mockResolvedValueOnce({
			data: null,
			error: null
		});

		const result = await verifyTeacherStudent(mockTeacherId, mockStudentId, supabase);

		expect(result).toBe(false);
	});

	// ------------------------------------------------------------------------
	// EDGE CASES: Response Format Variations
	// ------------------------------------------------------------------------

	it('should handle array response for classes (Supabase JOIN variation)', async () => {
		// Mock array-based classes response (alternative Supabase format)
		const arrayResponse = [
			{
				class_id: 'class-uuid-abc',
				classes: [
					{
						teacher_id: mockTeacherId
					}
				]
			}
		];

		supabase._mockChain.eq.mockResolvedValueOnce({
			data: arrayResponse,
			error: null
		});

		const result = await verifyTeacherStudent(mockTeacherId, mockStudentId, supabase);

		expect(result).toBe(true);
	});

	it('should return false when classes field is missing', async () => {
		// Mock malformed response without classes field
		const malformedResponse = [
			{
				class_id: 'class-uuid-abc'
				// Missing 'classes' field
			}
		];

		supabase._mockChain.eq.mockResolvedValueOnce({
			data: malformedResponse,
			error: null
		});

		const result = await verifyTeacherStudent(mockTeacherId, mockStudentId, supabase);

		expect(result).toBe(false);
	});

	it('should return false when classes field is null', async () => {
		// Mock response with null classes field
		const nullClassesResponse = [
			{
				class_id: 'class-uuid-abc',
				classes: null
			}
		];

		supabase._mockChain.eq.mockResolvedValueOnce({
			data: nullClassesResponse,
			error: null
		});

		const result = await verifyTeacherStudent(mockTeacherId, mockStudentId, supabase);

		expect(result).toBe(false);
	});

	it('should return false when teacher_id is missing in classes', async () => {
		// Mock response without teacher_id field
		const noTeacherIdResponse = [
			{
				class_id: 'class-uuid-abc',
				classes: {
					// Missing teacher_id
					id: 'class-uuid-abc'
				}
			}
		];

		supabase._mockChain.eq.mockResolvedValueOnce({
			data: noTeacherIdResponse,
			error: null
		});

		const result = await verifyTeacherStudent(mockTeacherId, mockStudentId, supabase);

		expect(result).toBe(false);
	});

	it('should handle empty array in classes field (JOIN variation)', async () => {
		// Mock empty array for classes field
		const emptyArrayResponse = [
			{
				class_id: 'class-uuid-abc',
				classes: []
			}
		];

		supabase._mockChain.eq.mockResolvedValueOnce({
			data: emptyArrayResponse,
			error: null
		});

		const result = await verifyTeacherStudent(mockTeacherId, mockStudentId, supabase);

		expect(result).toBe(false);
	});

	it('should handle mixed access scenario (some classes match, some do not)', async () => {
		// Mock mixed class memberships
		const mixedResponse = [
			{
				class_id: 'class-uuid-abc',
				classes: {
					teacher_id: mockTeacherId // This one matches
				}
			},
			{
				class_id: 'class-uuid-def',
				classes: {
					teacher_id: mockOtherTeacherId // This one doesn't match
				}
			}
		];

		supabase._mockChain.eq.mockResolvedValueOnce({
			data: mixedResponse,
			error: null
		});

		const result = await verifyTeacherStudent(mockTeacherId, mockStudentId, supabase);

		// Should return true because at least ONE class matches
		expect(result).toBe(true);
	});
});

// ============================================================================
// TESTS: verifyTeacherStudentWithRole()
// ============================================================================

describe('verifyTeacherStudentWithRole', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		vi.clearAllMocks();
		supabase = createMockSupabase();
	});

	// ------------------------------------------------------------------------
	// ADMIN BYPASS
	// ------------------------------------------------------------------------

	it('should return true for admin without checking database', async () => {
		const result = await verifyTeacherStudentWithRole(
			'admin-uuid-999',
			mockStudentId,
			mockAdminProfile,
			supabase
		);

		expect(result).toBe(true);
		// Verify database was NOT queried
		expect(supabase.from).not.toHaveBeenCalled();
	});

	it('should bypass database check for admin even with invalid student ID', async () => {
		const result = await verifyTeacherStudentWithRole(
			'admin-uuid-999',
			'non-existent-student',
			mockAdminProfile,
			supabase
		);

		expect(result).toBe(true);
		// Verify database was NOT queried
		expect(supabase.from).not.toHaveBeenCalled();
	});

	// ------------------------------------------------------------------------
	// TEACHER WITH ACCESS
	// ------------------------------------------------------------------------

	it('should return true for teacher with access to student', async () => {
		// Mock successful class membership query
		supabase._mockChain.eq.mockResolvedValueOnce({
			data: mockClassMembershipResponse,
			error: null
		});

		const result = await verifyTeacherStudentWithRole(
			mockTeacherId,
			mockStudentId,
			mockTeacherProfile,
			supabase
		);

		expect(result).toBe(true);
		expect(supabase.from).toHaveBeenCalledWith('class_members');
	});

	// ------------------------------------------------------------------------
	// TEACHER WITHOUT ACCESS
	// ------------------------------------------------------------------------

	it('should return false for teacher without access to student', async () => {
		// Mock class memberships for different teacher
		supabase._mockChain.eq.mockResolvedValueOnce({
			data: mockNoAccessClassMembershipResponse,
			error: null
		});

		const result = await verifyTeacherStudentWithRole(
			mockTeacherId,
			mockStudentId,
			mockTeacherProfile,
			supabase
		);

		expect(result).toBe(false);
	});

	it('should return false for teacher when student not found', async () => {
		// Mock empty class memberships
		supabase._mockChain.eq.mockResolvedValueOnce({
			data: [],
			error: null
		});

		const result = await verifyTeacherStudentWithRole(
			mockTeacherId,
			mockStudentId,
			mockTeacherProfile,
			supabase
		);

		expect(result).toBe(false);
	});

	// ------------------------------------------------------------------------
	// STUDENT PROFILE (Should not have access)
	// ------------------------------------------------------------------------

	it('should return false for student profile trying to verify access', async () => {
		// Mock empty class memberships (students are not teachers)
		supabase._mockChain.eq.mockResolvedValueOnce({
			data: [],
			error: null
		});

		const result = await verifyTeacherStudentWithRole(
			mockStudentId,
			'other-student-uuid',
			mockStudentProfile,
			supabase
		);

		expect(result).toBe(false);
		// Database should still be queried (not admin bypass)
		expect(supabase.from).toHaveBeenCalled();
	});

	// ------------------------------------------------------------------------
	// EDGE CASES: Role Variations
	// ------------------------------------------------------------------------

	it('should handle teacher role check case-sensitively', async () => {
		// Mock profile with non-admin role
		const customProfile = {
			...mockTeacherProfile,
			role: 'teacher' as const
		};

		supabase._mockChain.eq.mockResolvedValueOnce({
			data: mockClassMembershipResponse,
			error: null
		});

		const result = await verifyTeacherStudentWithRole(
			mockTeacherId,
			mockStudentId,
			customProfile,
			supabase
		);

		expect(result).toBe(true);
		// Should query database (not admin)
		expect(supabase.from).toHaveBeenCalled();
	});

	// ------------------------------------------------------------------------
	// DATABASE ERRORS (Delegated to verifyTeacherStudent)
	// ------------------------------------------------------------------------

	it('should return false on database error for non-admin (fail-closed)', async () => {
		// Mock database error
		const mockError = {
			message: 'Database connection failed',
			code: 'PGRST301'
		};

		supabase._mockChain.eq.mockResolvedValueOnce({
			data: null,
			error: mockError
		});

		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await verifyTeacherStudentWithRole(
			mockTeacherId,
			mockStudentId,
			mockTeacherProfile,
			supabase
		);

		expect(result).toBe(false);
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			'[verifyTeacherStudent] Database error:',
			expect.any(Object)
		);

		consoleErrorSpy.mockRestore();
	});
});
