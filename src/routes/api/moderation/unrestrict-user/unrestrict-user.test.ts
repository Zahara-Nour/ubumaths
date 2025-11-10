/**
 * DELETE /api/moderation/unrestrict-user - API Integration Tests
 * ==============================================================
 *
 * Tests for removing user restrictions (unmute, unban, etc).
 * Focuses on authentication, authorization, and permission checks.
 *
 * Key security checks:
 * - Only teachers/admins can unrestrict
 * - Teachers can only remove restrictions they created
 * - Admins can remove any restriction
 * - All input validated with Zod
 *
 * @module api/moderation/unrestrict-user.test
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	createMockSupabase,
	createMockLocals,
	createMockRequest
} from '../../../../../tests/helpers/supabase-helpers';

// ============================================================================
// TEST DATA
// ============================================================================

const TEST_IDS = {
	teacher: '550e8400-e29b-41d4-a716-446655440001',
	admin: '550e8400-e29b-41d4-a716-446655440002',
	student: '550e8400-e29b-41d4-a716-446655440003',
	otherTeacher: '550e8400-e29b-41d4-a716-446655440004',
	restriction: '550e8400-e29b-41d4-a716-446655440011',
	restriction2: '550e8400-e29b-41d4-a716-446655440012'
};

const mockRestrictions = {
	muteByTeacher: {
		id: TEST_IDS.restriction,
		user_id: TEST_IDS.student,
		scope_type: 'global' as const,
		scope_id: null,
		restriction_type: 'mute' as const,
		reason: 'Inappropriate language',
		restricted_by: TEST_IDS.teacher,
		expires_at: null,
		created_at: '2024-01-01T00:00:00Z'
	},
	banByOtherTeacher: {
		id: TEST_IDS.restriction2,
		user_id: TEST_IDS.student,
		scope_type: 'global' as const,
		scope_id: null,
		restriction_type: 'ban' as const,
		reason: 'Severe violation',
		restricted_by: TEST_IDS.otherTeacher,
		expires_at: null,
		created_at: '2024-01-01T00:00:00Z'
	}
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

describe('DELETE /api/moderation/unrestrict-user - Authentication & Authorization', () => {
	beforeEach(() => {
		return import.meta.hot?.invalidate();
	});

	it('should reject unauthenticated requests with 401', async () => {
		const { DELETE } = await import('./+server');

		const locals = createMockLocals(); // No user
		const request = createMockRequest(
			{
				restrictionId: TEST_IDS.restriction
			},
			'DELETE'
		);

		try {
			await DELETE({ request, locals } as any);
			expect.fail('Should have thrown 401 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(401);
			expect(error.body.message).toBe('Not authenticated');
		}
	});

	it('should reject non-teacher/admin users with 403', async () => {
		const { DELETE } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(TEST_IDS.student, mockSupabase);

		const request = createMockRequest(
			{
				restrictionId: TEST_IDS.restriction
			},
			'DELETE'
		);

		try {
			await DELETE({ request, locals } as any);
			expect.fail('Should have thrown 403 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(403);
			expect(error.body.message).toBe('Only teachers and admins can unrestrict users');
		}
	});

	it('should allow teacher to remove restriction they created', async () => {
		const { DELETE } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock restriction fetch (created by this teacher)
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockRestrictions.muteByTeacher,
			error: null
		});

		// Mock delete operation
		mockSupabase._mockChain.delete.mockReturnValue({
			eq: vi.fn().mockResolvedValue({ data: null, error: null })
		});

		// Mock moderation log
		mockSupabase.rpc = vi.fn().mockResolvedValue({ data: null, error: null });

		const request = createMockRequest(
			{
				restrictionId: TEST_IDS.restriction
			},
			'DELETE'
		);

		const response = await DELETE({ request, locals } as any);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.message).toBe('Restriction removed successfully');
	});

	it('should reject teacher removing restriction created by another teacher with 403', async () => {
		const { DELETE } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock restriction fetch (created by different teacher)
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockRestrictions.banByOtherTeacher,
			error: null
		});

		const request = createMockRequest(
			{
				restrictionId: TEST_IDS.restriction2
			},
			'DELETE'
		);

		try {
			await DELETE({ request, locals } as any);
			expect.fail('Should have thrown 403 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(403);
			expect(error.body.message).toBe('You can only remove restrictions that you created');
		}
	});

	it('should allow admin to remove any restriction', async () => {
		const { DELETE } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.admin, 'admin', mockSupabase);

		// Mock restriction fetch (created by someone else)
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockRestrictions.banByOtherTeacher,
			error: null
		});

		// Mock delete operation
		mockSupabase._mockChain.delete.mockReturnValue({
			eq: vi.fn().mockResolvedValue({ data: null, error: null })
		});

		// Mock moderation log
		mockSupabase.rpc = vi.fn().mockResolvedValue({ data: null, error: null });

		const request = createMockRequest(
			{
				restrictionId: TEST_IDS.restriction2
			},
			'DELETE'
		);

		const response = await DELETE({ request, locals } as any);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
	});
});

// ============================================================================
// TESTS: Input Validation
// ============================================================================

describe('DELETE /api/moderation/unrestrict-user - Input Validation', () => {
	beforeEach(() => {
		return import.meta.hot?.invalidate();
	});

	it('should reject invalid JSON with 400', async () => {
		const { DELETE } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock request that throws on json()
		const request = {
			json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
		} as unknown as Request;

		try {
			await DELETE({ request, locals } as any);
			expect.fail('Should have thrown 400 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(400);
			expect(error.body.message).toBe('Invalid JSON');
		}
	});

	it('should reject invalid restrictionId (not UUID) with 400', async () => {
		const { DELETE } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		const request = createMockRequest(
			{
				restrictionId: 'not-a-uuid' // Invalid UUID
			},
			'DELETE'
		);

		try {
			await DELETE({ request, locals } as any);
			expect.fail('Should have thrown 400 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(400);
			expect(error.body.message).toContain('UUID');
		}
	});

	it('should reject missing restrictionId with 400', async () => {
		const { DELETE } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		const request = createMockRequest({}, 'DELETE'); // Missing restrictionId

		try {
			await DELETE({ request, locals } as any);
			expect.fail('Should have thrown 400 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(400);
			// Zod will say "Invalid input" for required fields
			expect(error.body.message).toContain('Invalid input');
		}
	});
});

// ============================================================================
// TESTS: Restriction Types & Logging
// ============================================================================

describe('DELETE /api/moderation/unrestrict-user - Restriction Types', () => {
	beforeEach(() => {
		return import.meta.hot?.invalidate();
	});

	it('should successfully remove mute restriction', async () => {
		const { DELETE } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		const muteRestriction = {
			...mockRestrictions.muteByTeacher,
			restriction_type: 'mute' as const
		};

		// Mock restriction fetch
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: muteRestriction,
			error: null
		});

		// Mock delete operation
		mockSupabase._mockChain.delete.mockReturnValue({
			eq: vi.fn().mockResolvedValue({ data: null, error: null })
		});

		// Mock moderation log (should use 'unmute_user' action)
		mockSupabase.rpc = vi.fn().mockResolvedValue({ data: null, error: null });

		const request = createMockRequest(
			{
				restrictionId: TEST_IDS.restriction
			},
			'DELETE'
		);

		const response = await DELETE({ request, locals } as any);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);

		// Verify moderation log was called with correct action
		expect(mockSupabase.rpc).toHaveBeenCalledWith(
			'log_moderation_action',
			expect.objectContaining({
				p_action: 'unmute_user'
			})
		);
	});

	it('should successfully remove timeout restriction', async () => {
		const { DELETE } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		const timeoutRestriction = {
			...mockRestrictions.muteByTeacher,
			restriction_type: 'timeout' as const,
			expires_at: new Date(Date.now() + 86400000).toISOString()
		};

		// Mock restriction fetch
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: timeoutRestriction,
			error: null
		});

		// Mock delete operation
		mockSupabase._mockChain.delete.mockReturnValue({
			eq: vi.fn().mockResolvedValue({ data: null, error: null })
		});

		// Mock moderation log (should use 'unmute_user' for timeout as well)
		mockSupabase.rpc = vi.fn().mockResolvedValue({ data: null, error: null });

		const request = createMockRequest(
			{
				restrictionId: TEST_IDS.restriction
			},
			'DELETE'
		);

		const response = await DELETE({ request, locals } as any);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);

		// Verify moderation log was called with correct action
		expect(mockSupabase.rpc).toHaveBeenCalledWith(
			'log_moderation_action',
			expect.objectContaining({
				p_action: 'unmute_user' // timeout uses unmute_user action
			})
		);
	});

	it('should successfully remove ban restriction', async () => {
		const { DELETE } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		const banRestriction = {
			...mockRestrictions.muteByTeacher,
			restriction_type: 'ban' as const
		};

		// Mock restriction fetch
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: banRestriction,
			error: null
		});

		// Mock delete operation
		mockSupabase._mockChain.delete.mockReturnValue({
			eq: vi.fn().mockResolvedValue({ data: null, error: null })
		});

		// Mock moderation log (should use 'unban_user' action)
		mockSupabase.rpc = vi.fn().mockResolvedValue({ data: null, error: null });

		const request = createMockRequest(
			{
				restrictionId: TEST_IDS.restriction
			},
			'DELETE'
		);

		const response = await DELETE({ request, locals } as any);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);

		// Verify moderation log was called with correct action
		expect(mockSupabase.rpc).toHaveBeenCalledWith(
			'log_moderation_action',
			expect.objectContaining({
				p_action: 'unban_user'
			})
		);
	});

	it('should include original restriction metadata in log', async () => {
		const { DELETE } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock restriction fetch
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockRestrictions.muteByTeacher,
			error: null
		});

		// Mock delete operation
		mockSupabase._mockChain.delete.mockReturnValue({
			eq: vi.fn().mockResolvedValue({ data: null, error: null })
		});

		// Mock moderation log
		mockSupabase.rpc = vi.fn().mockResolvedValue({ data: null, error: null });

		const request = createMockRequest(
			{
				restrictionId: TEST_IDS.restriction
			},
			'DELETE'
		);

		await DELETE({ request, locals } as any);

		// Verify metadata includes original restriction details
		expect(mockSupabase.rpc).toHaveBeenCalledWith(
			'log_moderation_action',
			expect.objectContaining({
				p_metadata: expect.objectContaining({
					original_restriction_id: TEST_IDS.restriction,
					original_restriction_type: 'mute',
					original_scope_type: 'global',
					original_scope_id: null,
					original_created_at: '2024-01-01T00:00:00Z'
				})
			})
		);
	});
});

// ============================================================================
// TESTS: Error Handling
// ============================================================================

describe('DELETE /api/moderation/unrestrict-user - Error Handling', () => {
	beforeEach(() => {
		return import.meta.hot?.invalidate();
	});

	it('should return 404 when restriction not found', async () => {
		const { DELETE } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock restriction not found
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: null,
			error: null
		});

		const request = createMockRequest(
			{
				restrictionId: TEST_IDS.restriction
			},
			'DELETE'
		);

		try {
			await DELETE({ request, locals } as any);
			expect.fail('Should have thrown 404 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(404);
			expect(error.body.message).toBe('Restriction not found');
		}
	});

	it('should return 500 on database error during fetch', async () => {
		const { DELETE } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock database error during fetch
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: null,
			error: { message: 'Database connection error' }
		});

		const request = createMockRequest(
			{
				restrictionId: TEST_IDS.restriction
			},
			'DELETE'
		);

		try {
			await DELETE({ request, locals } as any);
			expect.fail('Should have thrown 500 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(500);
			expect(error.body.message).toBe('Failed to fetch restriction');
		}
	});

	it('should return 500 on database error during delete', async () => {
		const { DELETE } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock restriction fetch (success)
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockRestrictions.muteByTeacher,
			error: null
		});

		// Mock delete operation failure
		mockSupabase._mockChain.delete.mockReturnValue({
			eq: vi.fn().mockResolvedValue({
				data: null,
				error: { message: 'Delete failed' }
			})
		});

		const request = createMockRequest(
			{
				restrictionId: TEST_IDS.restriction
			},
			'DELETE'
		);

		try {
			await DELETE({ request, locals } as any);
			expect.fail('Should have thrown 500 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(500);
			expect(error.body.message).toBe('Failed to remove restriction');
		}
	});

	it('should still succeed even if moderation log fails', async () => {
		const { DELETE } = await import('./+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock restriction fetch
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockRestrictions.muteByTeacher,
			error: null
		});

		// Mock delete operation (success)
		mockSupabase._mockChain.delete.mockReturnValue({
			eq: vi.fn().mockResolvedValue({ data: null, error: null })
		});

		// Mock moderation log failure (should not fail the request)
		mockSupabase.rpc = vi.fn().mockResolvedValue({
			data: null,
			error: { message: 'Logging failed' }
		});

		const request = createMockRequest(
			{
				restrictionId: TEST_IDS.restriction
			},
			'DELETE'
		);

		const response = await DELETE({ request, locals } as any);
		const data = await response.json();

		// Should still succeed
		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
	});
});
