/**
 * POST /api/moderation/restrict-user - API Integration Tests
 * ===========================================================
 *
 * Tests for restricting users (mute, timeout, ban) at conversation or global scope.
 * Focuses on authentication, authorization, validation, and error handling.
 *
 * Key security checks:
 * - Teachers can only restrict students (not other teachers/admins)
 * - Global restrictions require teacher-student relationship
 * - Conversation restrictions require teacher participation
 * - All input is validated with Zod
 *
 * @module api/moderation/restrict-user.test
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSupabase, createMockLocals, createMockRequest } from '$tests/helpers';

// ============================================================================
// TEST DATA
// ============================================================================

const TEST_IDS = {
	teacher: '550e8400-e29b-41d4-a716-446655440001',
	admin: '550e8400-e29b-41d4-a716-446655440002',
	student: '550e8400-e29b-41d4-a716-446655440003',
	student2: '550e8400-e29b-41d4-a716-446655440004',
	otherTeacher: '550e8400-e29b-41d4-a716-446655440005',
	conversation: '550e8400-e29b-41d4-a716-446655440011',
	restriction: '550e8400-e29b-41d4-a716-446655440021'
};

const mockProfiles = {
	teacher: { id: TEST_IDS.teacher, role: 'teacher' },
	admin: { id: TEST_IDS.admin, role: 'admin' },
	student: { id: TEST_IDS.student, role: 'student' },
	otherTeacher: { id: TEST_IDS.otherTeacher, role: 'teacher' }
};

const mockRestriction = {
	id: TEST_IDS.restriction,
	user_id: TEST_IDS.student,
	scope_type: 'global' as const,
	scope_id: null,
	restriction_type: 'mute' as const,
	reason: 'Test reason for restriction',
	restricted_by: TEST_IDS.teacher,
	expires_at: null,
	created_at: '2024-01-01T00:00:00Z'
};

// Helper to create locals with proper role
function createLocalsWithRole(
	userId: string,
	role: 'teacher' | 'admin' | 'student',
	mockSupabase: ReturnType<typeof createMockSupabase>
) {
	const locals = createMockLocals(userId, mockSupabase);

	locals.user = { id: userId, role } as any;
	return locals;
}

// ============================================================================
// TESTS: Authentication & Authorization
// ============================================================================

describe('POST /api/moderation/restrict-user - Authentication & Authorization', () => {
	beforeEach(() => {
		// Reset module cache to get fresh imports
		return import.meta.hot?.invalidate();
	});

	it('should reject unauthenticated requests with 401', async () => {
		const { POST } = await import('./+server');

		const locals = createMockLocals(); // No user
		const request = createMockRequest({
			userId: TEST_IDS.student,
			scopeType: 'global',
			scopeId: null,
			restrictionType: 'mute',
			reason: 'Test reason',
			expiresAt: null
		});

		try {
			await POST({ request, locals } as any);
			expect.fail('Should have thrown 401 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(401);
			expect(error.body.message).toBe('Not authenticated');
		}
	});

	it('should reject non-teacher/admin users with 403', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(TEST_IDS.student, mockSupabase);

		const request = createMockRequest({
			userId: TEST_IDS.student2,
			scopeType: 'global',
			scopeId: null,
			restrictionType: 'mute',
			reason: 'Test reason',
			expiresAt: null
		});

		try {
			await POST({ request, locals } as any);
			expect.fail('Should have thrown 403 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(403);
			expect(error.body.message).toBe('Only teachers and admins can restrict users');
		}
	});

	it('should allow teachers to restrict students', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock target user fetch (student)
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockProfiles.student,
			error: null
		});

		// Mock teacher-student relationship check
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { student_id: TEST_IDS.student },
			error: null
		});

		// Mock restriction insert
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: mockRestriction,
			error: null
		});

		// Mock moderation log RPC
		mockSupabase.rpc = vi.fn().mockResolvedValue({ data: null, error: null });

		const request = createMockRequest({
			userId: TEST_IDS.student,
			scopeType: 'global',
			scopeId: null,
			restrictionType: 'mute',
			reason: 'Inappropriate language',
			expiresAt: null
		});

		const response = await POST({ request, locals } as any);
		const data = await response.json();

		expect(response.status).toBe(201);
		expect(data.success).toBe(true);
		expect(data.restrictionId).toBe(TEST_IDS.restriction);
	});

	it('should reject teacher trying to restrict another teacher with 403', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock target user fetch (teacher)
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockProfiles.otherTeacher,
			error: null
		});

		const request = createMockRequest({
			userId: TEST_IDS.otherTeacher,
			scopeType: 'global',
			scopeId: null,
			restrictionType: 'mute',
			reason: 'Test reason',
			expiresAt: null
		});

		try {
			await POST({ request, locals } as any);
			expect.fail('Should have thrown 403 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(403);
			expect(error.body.message).toBe('Teachers can only restrict students');
		}
	});

	it('should allow admin to restrict anyone', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.admin, 'admin', mockSupabase);

		// Mock target user fetch (student)
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockProfiles.student,
			error: null
		});

		// Admin doesn't need teacher-student relationship check - skip that mock

		// Mock restriction insert
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: mockRestriction,
			error: null
		});

		// Mock moderation log RPC
		mockSupabase.rpc = vi.fn().mockResolvedValue({ data: null, error: null });

		const request = createMockRequest({
			userId: TEST_IDS.student,
			scopeType: 'global',
			scopeId: null,
			restrictionType: 'ban',
			reason: 'Severe violation',
			expiresAt: null
		});

		const response = await POST({ request, locals } as any);
		const data = await response.json();

		expect(response.status).toBe(201);
		expect(data.success).toBe(true);
	});
});

// ============================================================================
// TESTS: Input Validation
// ============================================================================

describe('POST /api/moderation/restrict-user - Input Validation', () => {
	beforeEach(() => {
		return import.meta.hot?.invalidate();
	});

	it('should reject invalid JSON with 400', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock request that throws on json()
		const request = {
			json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
		} as unknown as Request;

		try {
			await POST({ request, locals } as any);
			expect.fail('Should have thrown 400 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(400);
			expect(error.body.message).toBe('Invalid JSON');
		}
	});

	it('should reject invalid userId (not UUID) with 400', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		const request = createMockRequest({
			userId: 'not-a-uuid', // Invalid UUID
			scopeType: 'global',
			scopeId: null,
			restrictionType: 'mute',
			reason: 'Test reason',
			expiresAt: null
		});

		try {
			await POST({ request, locals } as any);
			expect.fail('Should have thrown 400 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(400);
			expect(error.body.message).toContain('UUID');
		}
	});

	it('should reject invalid scopeType with 400', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		const request = createMockRequest({
			userId: TEST_IDS.student,
			scopeType: 'invalid', // Invalid scope type
			scopeId: null,
			restrictionType: 'mute',
			reason: 'Test reason',
			expiresAt: null
		});

		try {
			await POST({ request, locals } as any);
			expect.fail('Should have thrown 400 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(400);
			expect(error.body.message).toContain('Invalid option');
		}
	});

	it('should reject invalid restrictionType with 400', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		const request = createMockRequest({
			userId: TEST_IDS.student,
			scopeType: 'global',
			scopeId: null,
			restrictionType: 'invalid', // Invalid restriction type
			reason: 'Test reason',
			expiresAt: null
		});

		try {
			await POST({ request, locals } as any);
			expect.fail('Should have thrown 400 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(400);
			expect(error.body.message).toContain('Invalid option');
		}
	});

	it('should reject reason that is too short (< 5 chars) with 400', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		const request = createMockRequest({
			userId: TEST_IDS.student,
			scopeType: 'global',
			scopeId: null,
			restrictionType: 'mute',
			reason: 'Abc', // Only 3 characters
			expiresAt: null
		});

		try {
			await POST({ request, locals } as any);
			expect.fail('Should have thrown 400 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(400);
			expect(error.body.message).toContain('at least 5 characters');
		}
	});

	it('should reject reason that is too long (> 500 chars) with 400', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		const request = createMockRequest({
			userId: TEST_IDS.student,
			scopeType: 'global',
			scopeId: null,
			restrictionType: 'mute',
			reason: 'A'.repeat(501), // 501 characters
			expiresAt: null
		});

		try {
			await POST({ request, locals } as any);
			expect.fail('Should have thrown 400 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(400);
			expect(error.body.message).toContain('cannot exceed 500 characters');
		}
	});

	it('should reject conversation scope without scopeId with 400', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		const request = createMockRequest({
			userId: TEST_IDS.student,
			scopeType: 'conversation',
			scopeId: null, // Missing scopeId for conversation scope
			restrictionType: 'mute',
			reason: 'Test reason',
			expiresAt: null
		});

		try {
			await POST({ request, locals } as any);
			expect.fail('Should have thrown 400 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(400);
			expect(error.body.message).toContain('conversation scope must have scopeId');
		}
	});

	it('should reject global scope with scopeId with 400', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		const request = createMockRequest({
			userId: TEST_IDS.student,
			scopeType: 'global',
			scopeId: TEST_IDS.conversation, // Should be null for global scope
			restrictionType: 'mute',
			reason: 'Test reason',
			expiresAt: null
		});

		try {
			await POST({ request, locals } as any);
			expect.fail('Should have thrown 400 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(400);
			expect(error.body.message).toContain('Global scope must have no scopeId');
		}
	});
});

// ============================================================================
// TESTS: Restriction Types & Expiration
// ============================================================================

describe('POST /api/moderation/restrict-user - Restriction Types', () => {
	beforeEach(() => {
		return import.meta.hot?.invalidate();
	});

	it('should successfully create a mute restriction', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock target user fetch
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockProfiles.student,
			error: null
		});

		// Mock teacher-student relationship
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { student_id: TEST_IDS.student },
			error: null
		});

		// Mock restriction insert
		const muteRestriction = { ...mockRestriction, restriction_type: 'mute' as const };
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: muteRestriction,
			error: null
		});

		// Mock moderation log
		mockSupabase.rpc = vi.fn().mockResolvedValue({ data: null, error: null });

		const request = createMockRequest({
			userId: TEST_IDS.student,
			scopeType: 'global',
			scopeId: null,
			restrictionType: 'mute',
			reason: 'Inappropriate language in chat',
			expiresAt: null
		});

		const response = await POST({ request, locals } as any);
		const data = await response.json();

		expect(response.status).toBe(201);
		expect(data.success).toBe(true);
	});

	it('should successfully create a timeout restriction with expiration', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		const expiresAt = new Date(Date.now() + 86400000).toISOString(); // 24 hours from now

		// Mock target user fetch
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockProfiles.student,
			error: null
		});

		// Mock teacher-student relationship
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { student_id: TEST_IDS.student },
			error: null
		});

		// Mock restriction insert
		const timeoutRestriction = {
			...mockRestriction,
			restriction_type: 'timeout' as const,
			expires_at: expiresAt
		};
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: timeoutRestriction,
			error: null
		});

		// Mock moderation log
		mockSupabase.rpc = vi.fn().mockResolvedValue({ data: null, error: null });

		const request = createMockRequest({
			userId: TEST_IDS.student,
			scopeType: 'global',
			scopeId: null,
			restrictionType: 'timeout',
			reason: 'Repeated warnings ignored',
			expiresAt
		});

		const response = await POST({ request, locals } as any);
		const data = await response.json();

		expect(response.status).toBe(201);
		expect(data.success).toBe(true);
	});

	it('should successfully create a permanent ban restriction', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock target user fetch
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockProfiles.student,
			error: null
		});

		// Mock teacher-student relationship
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { student_id: TEST_IDS.student },
			error: null
		});

		// Mock restriction insert
		const banRestriction = { ...mockRestriction, restriction_type: 'ban' as const };
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: banRestriction,
			error: null
		});

		// Mock moderation log
		mockSupabase.rpc = vi.fn().mockResolvedValue({ data: null, error: null });

		const request = createMockRequest({
			userId: TEST_IDS.student,
			scopeType: 'global',
			scopeId: null,
			restrictionType: 'ban',
			reason: 'Severe violation of community guidelines',
			expiresAt: null
		});

		const response = await POST({ request, locals } as any);
		const data = await response.json();

		expect(response.status).toBe(201);
		expect(data.success).toBe(true);
	});
});

// ============================================================================
// TESTS: Conversation-Scoped Restrictions
// ============================================================================

describe('POST /api/moderation/restrict-user - Conversation Scope', () => {
	beforeEach(() => {
		return import.meta.hot?.invalidate();
	});

	it('should allow conversation-scoped restriction when teacher is participant', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock target user fetch
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockProfiles.student,
			error: null
		});

		// Mock conversation exists
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { id: TEST_IDS.conversation },
			error: null
		});

		// Mock teacher is participant
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { user_id: TEST_IDS.teacher },
			error: null
		});

		// Mock restriction insert
		const conversationRestriction = {
			...mockRestriction,
			scope_type: 'conversation' as const,
			scope_id: TEST_IDS.conversation
		};
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: conversationRestriction,
			error: null
		});

		// Mock moderation log
		mockSupabase.rpc = vi.fn().mockResolvedValue({ data: null, error: null });

		const request = createMockRequest({
			userId: TEST_IDS.student,
			scopeType: 'conversation',
			scopeId: TEST_IDS.conversation,
			restrictionType: 'mute',
			reason: 'Off-topic messages in class channel',
			expiresAt: null
		});

		const response = await POST({ request, locals } as any);
		const data = await response.json();

		expect(response.status).toBe(201);
		expect(data.success).toBe(true);
	});

	it('should reject conversation restriction if conversation not found with 404', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock target user fetch
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockProfiles.student,
			error: null
		});

		// Mock conversation not found
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: null,
			error: null
		});

		const request = createMockRequest({
			userId: TEST_IDS.student,
			scopeType: 'conversation',
			scopeId: TEST_IDS.conversation,
			restrictionType: 'mute',
			reason: 'Test reason',
			expiresAt: null
		});

		try {
			await POST({ request, locals } as any);
			expect.fail('Should have thrown 404 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(404);
			expect(error.body.message).toBe('Conversation not found');
		}
	});

	it('should reject conversation restriction if teacher is not participant with 403', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock target user fetch
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockProfiles.student,
			error: null
		});

		// Mock conversation exists
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { id: TEST_IDS.conversation },
			error: null
		});

		// Mock teacher is NOT participant
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: null,
			error: null
		});

		const request = createMockRequest({
			userId: TEST_IDS.student,
			scopeType: 'conversation',
			scopeId: TEST_IDS.conversation,
			restrictionType: 'mute',
			reason: 'Test reason',
			expiresAt: null
		});

		try {
			await POST({ request, locals } as any);
			expect.fail('Should have thrown 403 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(403);
			expect(error.body.message).toBe('You do not have access to this conversation');
		}
	});
});

// ============================================================================
// TESTS: Global Restrictions & Teacher-Student Relationship
// ============================================================================

describe('POST /api/moderation/restrict-user - Global Scope Authorization', () => {
	beforeEach(() => {
		return import.meta.hot?.invalidate();
	});

	it('should allow global restriction when teacher has student in their class', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock target user fetch
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockProfiles.student,
			error: null
		});

		// Mock teacher-student relationship exists
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { student_id: TEST_IDS.student },
			error: null
		});

		// Mock restriction insert
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: mockRestriction,
			error: null
		});

		// Mock moderation log
		mockSupabase.rpc = vi.fn().mockResolvedValue({ data: null, error: null });

		const request = createMockRequest({
			userId: TEST_IDS.student,
			scopeType: 'global',
			scopeId: null,
			restrictionType: 'mute',
			reason: 'Multiple violations across channels',
			expiresAt: null
		});

		const response = await POST({ request, locals } as any);
		const data = await response.json();

		expect(response.status).toBe(201);
		expect(data.success).toBe(true);
	});

	it('should reject global restriction when student not in teacher class with 403', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock target user fetch
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockProfiles.student,
			error: null
		});

		// Mock teacher-student relationship NOT found
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: null,
			error: null
		});

		const request = createMockRequest({
			userId: TEST_IDS.student,
			scopeType: 'global',
			scopeId: null,
			restrictionType: 'mute',
			reason: 'Test reason',
			expiresAt: null
		});

		try {
			await POST({ request, locals } as any);
			expect.fail('Should have thrown 403 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(403);
			expect(error.body.message).toBe('You can only restrict students in your classes');
		}
	});

	it('should allow admin to globally restrict student not in their class', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.admin, 'admin', mockSupabase);

		// Mock target user fetch
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockProfiles.student,
			error: null
		});

		// Admin doesn't need teacher-student relationship check - skip that mock

		// Mock restriction insert
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: mockRestriction,
			error: null
		});

		// Mock moderation log
		mockSupabase.rpc = vi.fn().mockResolvedValue({ data: null, error: null });

		const request = createMockRequest({
			userId: TEST_IDS.student,
			scopeType: 'global',
			scopeId: null,
			restrictionType: 'ban',
			reason: 'Platform-wide violation',
			expiresAt: null
		});

		const response = await POST({ request, locals } as any);
		const data = await response.json();

		expect(response.status).toBe(201);
		expect(data.success).toBe(true);
	});
});

// ============================================================================
// TESTS: Error Handling
// ============================================================================

describe('POST /api/moderation/restrict-user - Error Handling', () => {
	beforeEach(() => {
		return import.meta.hot?.invalidate();
	});

	it('should return 404 when user not found', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock target user not found
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: null,
			error: null
		});

		const request = createMockRequest({
			userId: TEST_IDS.student,
			scopeType: 'global',
			scopeId: null,
			restrictionType: 'mute',
			reason: 'Test reason',
			expiresAt: null
		});

		try {
			await POST({ request, locals } as any);
			expect.fail('Should have thrown 404 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(404);
			expect(error.body.message).toBe('User not found');
		}
	});

	it('should return 409 when duplicate active restriction exists', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock target user fetch
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockProfiles.student,
			error: null
		});

		// Mock teacher-student relationship
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { student_id: TEST_IDS.student },
			error: null
		});

		// Mock unique constraint violation (code 23505)
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: null,
			error: { code: '23505', message: 'Duplicate key violation' }
		});

		const request = createMockRequest({
			userId: TEST_IDS.student,
			scopeType: 'global',
			scopeId: null,
			restrictionType: 'mute',
			reason: 'Test reason',
			expiresAt: null
		});

		try {
			await POST({ request, locals } as any);
			expect.fail('Should have thrown 409 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(409);
			expect(error.body.message).toBe(
				'User already has an active restriction of this type in this scope'
			);
		}
	});

	it('should return 500 on database error during insert', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock target user fetch
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockProfiles.student,
			error: null
		});

		// Mock teacher-student relationship
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { student_id: TEST_IDS.student },
			error: null
		});

		// Mock database error (not unique constraint)
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: null,
			error: { code: '42P01', message: 'Table does not exist' }
		});

		const request = createMockRequest({
			userId: TEST_IDS.student,
			scopeType: 'global',
			scopeId: null,
			restrictionType: 'mute',
			reason: 'Test reason',
			expiresAt: null
		});

		try {
			await POST({ request, locals } as any);
			expect.fail('Should have thrown 500 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(500);
			expect(error.body.message).toBe('Failed to create restriction');
		}
	});

	it('should still succeed even if moderation log fails', async () => {
		const { POST } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock target user fetch
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockProfiles.student,
			error: null
		});

		// Mock teacher-student relationship
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { student_id: TEST_IDS.student },
			error: null
		});

		// Mock restriction insert (success)
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: mockRestriction,
			error: null
		});

		// Mock moderation log failure (should not fail the request)
		mockSupabase.rpc = vi.fn().mockResolvedValue({
			data: null,
			error: { message: 'Logging failed' }
		});

		const request = createMockRequest({
			userId: TEST_IDS.student,
			scopeType: 'global',
			scopeId: null,
			restrictionType: 'mute',
			reason: 'Test reason',
			expiresAt: null
		});

		const response = await POST({ request, locals } as any);
		const data = await response.json();

		// Should still succeed
		expect(response.status).toBe(201);
		expect(data.success).toBe(true);
	});
});
