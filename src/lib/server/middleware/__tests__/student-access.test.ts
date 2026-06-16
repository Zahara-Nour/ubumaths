/**
 * Student Access Middleware - Unit Tests
 * ========================================
 *
 * Test suite for teacher-student access verification under the single-teacher
 * model (Option B, refactor mono-professeur): the sole teacher (and admin) may
 * access ANY student. `verifyTeacherStudent` now returns true iff the caller is
 * teacher/admin AND the target is a student (looked up in `profiles`).
 *
 * Uses a mocked Supabase client to isolate business logic from the database.
 *
 * @module server/middleware/student-access.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { Profile } from '../../middleware/auth';
import { verifyTeacherStudent, verifyTeacherStudentWithRole } from '../student-access';

// ============================================================================
// MOCK SETUP
// ============================================================================

/**
 * Create a mock Supabase client with a chainable, thenable query builder.
 * verifyTeacherStudent ends in `.select(...).in(...)` awaited directly (no
 * .single()), so the chain must be thenable. Use _queueResult(...) to set the
 * response for the next awaited query.
 */
function createMockSupabase() {
	const resultQueue: Array<{ data: unknown; error: unknown }> = [];
	const mockChain = {
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		in: vi.fn().mockReturnThis(),
		then: (
			onFulfilled: (v: { data: unknown; error: unknown }) => unknown,
			onRejected?: (e: unknown) => unknown
		) => {
			const result = resultQueue.shift() ?? { data: null, error: null };
			return Promise.resolve(result).then(onFulfilled, onRejected);
		},
		_queueResult: (result: { data: unknown; error: unknown }) => {
			resultQueue.push(result);
		}
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
const mockAdminId = 'admin-uuid-999';

const teacherRow = { id: mockTeacherId, role: 'teacher' };
const studentRow = { id: mockStudentId, role: 'student' };
const adminRow = { id: mockAdminId, role: 'admin' };

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
	gidouilles: 0,
	grade: null,
	vip_cards: {},
	vip_cards_history: {},
	python_settings: null,
	rejection_reason: null,
	status: 'approved',
	status_changed_at: null,
	status_changed_by: null,
	// Consent fields (RGPD Article 8)
	consent_required: false,
	consent_granted_at: null,
	consent_grace_period_ends: null
};

const mockAdminProfile: Profile = {
	...mockTeacherProfile,
	id: mockAdminId,
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
// TESTS: verifyTeacherStudent()  — Option B (teacher/admin sees every student)
// ============================================================================

describe('verifyTeacherStudent', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		vi.clearAllMocks();
		supabase = createMockSupabase();
	});

	it('returns true when caller is a teacher and target is a student', async () => {
		supabase._mockChain._queueResult({ data: [teacherRow, studentRow], error: null });

		const result = await verifyTeacherStudent(mockTeacherId, mockStudentId, supabase);

		expect(result).toBe(true);
		expect(supabase.from).toHaveBeenCalledWith('profiles');
		expect(supabase._mockChain.select).toHaveBeenCalledWith('id, role');
		expect(supabase._mockChain.in).toHaveBeenCalledWith('id', [mockTeacherId, mockStudentId]);
	});

	it('returns true when caller is an admin and target is a student', async () => {
		supabase._mockChain._queueResult({
			data: [adminRow, studentRow],
			error: null
		});

		const result = await verifyTeacherStudent(mockAdminId, mockStudentId, supabase);

		expect(result).toBe(true);
	});

	it('returns false when the target is NOT a student (e.g. another teacher)', async () => {
		supabase._mockChain._queueResult({
			data: [teacherRow, { id: mockStudentId, role: 'teacher' }],
			error: null
		});

		const result = await verifyTeacherStudent(mockTeacherId, mockStudentId, supabase);

		expect(result).toBe(false);
	});

	it('returns false when the caller is not staff (e.g. a student)', async () => {
		supabase._mockChain._queueResult({
			data: [{ id: mockTeacherId, role: 'student' }, studentRow],
			error: null
		});

		const result = await verifyTeacherStudent(mockTeacherId, mockStudentId, supabase);

		expect(result).toBe(false);
	});

	it('returns false (no DB call) when teacherId === studentId', async () => {
		const result = await verifyTeacherStudent(mockTeacherId, mockTeacherId, supabase);

		expect(result).toBe(false);
		expect(supabase.from).not.toHaveBeenCalled();
	});

	it('returns false when the target profile is not found', async () => {
		supabase._mockChain._queueResult({ data: [teacherRow], error: null });

		const result = await verifyTeacherStudent(mockTeacherId, mockStudentId, supabase);

		expect(result).toBe(false);
	});

	it('returns false when the caller profile is not found', async () => {
		supabase._mockChain._queueResult({ data: [studentRow], error: null });

		const result = await verifyTeacherStudent(mockTeacherId, mockStudentId, supabase);

		expect(result).toBe(false);
	});

	it('returns false on database error (fail-closed)', async () => {
		const mockError = { message: 'Database connection failed', code: 'PGRST301' };
		supabase._mockChain._queueResult({ data: null, error: mockError });

		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await verifyTeacherStudent(mockTeacherId, mockStudentId, supabase);

		expect(result).toBe(false);
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			'[verifyTeacherStudent] Database error:',
			mockError
		);

		consoleErrorSpy.mockRestore();
	});

	it('returns false when query returns null data', async () => {
		supabase._mockChain._queueResult({ data: null, error: null });

		const result = await verifyTeacherStudent(mockTeacherId, mockStudentId, supabase);

		expect(result).toBe(false);
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

	it('returns true for admin without querying the database', async () => {
		const result = await verifyTeacherStudentWithRole(
			mockAdminId,
			mockStudentId,
			mockAdminProfile,
			supabase
		);

		expect(result).toBe(true);
		expect(supabase.from).not.toHaveBeenCalled();
	});

	it('bypasses the DB check for admin even with an invalid student ID', async () => {
		const result = await verifyTeacherStudentWithRole(
			mockAdminId,
			'non-existent-student',
			mockAdminProfile,
			supabase
		);

		expect(result).toBe(true);
		expect(supabase.from).not.toHaveBeenCalled();
	});

	it('returns true for a teacher accessing any student (Option B)', async () => {
		supabase._mockChain._queueResult({ data: [teacherRow, studentRow], error: null });

		const result = await verifyTeacherStudentWithRole(
			mockTeacherId,
			mockStudentId,
			mockTeacherProfile,
			supabase
		);

		expect(result).toBe(true);
		expect(supabase.from).toHaveBeenCalledWith('profiles');
	});

	it('returns false for a teacher when the target is not a student', async () => {
		supabase._mockChain._queueResult({
			data: [teacherRow, { id: mockStudentId, role: 'teacher' }],
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

	it('returns false for a student profile trying to verify access', async () => {
		supabase._mockChain._queueResult({
			data: [
				{ id: mockStudentId, role: 'student' },
				{ id: 'other-student-uuid', role: 'student' }
			],
			error: null
		});

		const result = await verifyTeacherStudentWithRole(
			mockStudentId,
			'other-student-uuid',
			mockStudentProfile,
			supabase
		);

		expect(result).toBe(false);
		// Not an admin → delegates to verifyTeacherStudent (DB queried)
		expect(supabase.from).toHaveBeenCalled();
	});

	it('returns false on database error for non-admin (fail-closed)', async () => {
		const mockError = { message: 'Database connection failed', code: 'PGRST301' };
		supabase._mockChain._queueResult({ data: null, error: mockError });

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
