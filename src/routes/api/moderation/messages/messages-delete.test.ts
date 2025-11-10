/**
 * DELETE /api/moderation/messages/[id] - API Integration Tests
 * =============================================================
 *
 * Tests for soft deleting messages.
 * Focuses on authentication, authorization, and conversation access checks.
 *
 * Key security checks:
 * - Teachers can only moderate messages in their conversations
 * - Teachers must be participants in class channels
 * - Teachers can moderate 1-on-1 chats where both students are in their classes
 * - Admins can moderate any message
 * - All input validated with Zod
 *
 * @module api/moderation/messages.test
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
	student2: '550e8400-e29b-41d4-a716-446655440004',
	otherTeacher: '550e8400-e29b-41d4-a716-446655440005',
	conversation: '550e8400-e29b-41d4-a716-446655440011',
	message: '550e8400-e29b-41d4-a716-446655440021'
};

const mockMessages = {
	classChannelMessage: {
		id: TEST_IDS.message,
		conversation_id: TEST_IDS.conversation,
		sender_id: TEST_IDS.student,
		content: 'This is an inappropriate message',
		created_at: '2024-01-01T00:00:00Z',
		deleted_at: null
	},
	alreadyDeletedMessage: {
		id: TEST_IDS.message,
		conversation_id: TEST_IDS.conversation,
		sender_id: TEST_IDS.student,
		content: 'Deleted message',
		created_at: '2024-01-01T00:00:00Z',
		deleted_at: '2024-01-02T00:00:00Z'
	}
};

const mockConversations = {
	classChannel: {
		id: TEST_IDS.conversation,
		is_group: true
	},
	oneOnOne: {
		id: TEST_IDS.conversation,
		is_group: false
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

describe('DELETE /api/moderation/messages/[id] - Authentication & Authorization', () => {
	beforeEach(() => {
		return import.meta.hot?.invalidate();
	});

	it('should reject unauthenticated requests with 401', async () => {
		const { DELETE } = await import('./[id]/+server');

		const locals = createMockLocals(); // No user
		const request = createMockRequest(
			{
				reason: 'Inappropriate content'
			},
			'DELETE'
		);

		try {
			await DELETE({
				request,
				locals,
				params: { id: TEST_IDS.message }
			} as any);
			expect.fail('Should have thrown 401 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(401);
			expect(error.body.message).toBe('Not authenticated');
		}
	});

	it('should reject non-teacher/admin users with 403', async () => {
		const { DELETE } = await import('./[id]/+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.student, 'student', mockSupabase);

		const request = createMockRequest(
			{
				reason: 'Inappropriate content'
			},
			'DELETE'
		);

		try {
			await DELETE({
				request,
				locals,
				params: { id: TEST_IDS.message }
			} as any);
			expect.fail('Should have thrown 403 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(403);
			expect(error.body.message).toBe('Only teachers and admins can delete messages');
		}
	});

	it('should allow teacher to delete message in class channel they participate in', async () => {
		const { DELETE } = await import('./[id]/+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock message fetch
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockMessages.classChannelMessage,
			error: null
		});

		// Mock teacher is participant in conversation
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { user_id: TEST_IDS.teacher },
			error: null
		});

		// Mock message update (soft delete) - use then protocol
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(onFulfilled({ data: null, error: null }));
		});

		// Mock moderation log
		mockSupabase.rpc = vi.fn().mockResolvedValue({ data: null, error: null });

		const request = createMockRequest(
			{
				reason: 'Inappropriate language'
			},
			'DELETE'
		);

		const response = await DELETE({
			request,
			locals,
			params: { id: TEST_IDS.message }
		} as any);

		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.message).toBe('Message deleted successfully');
	});

	it('should allow admin to delete any message', async () => {
		const { DELETE } = await import('./[id]/+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.admin, 'admin', mockSupabase);

		// Mock message fetch
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockMessages.classChannelMessage,
			error: null
		});

		// Admin doesn't need authorization checks - skip those mocks

		// Mock message update (soft delete)
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(onFulfilled({ data: null, error: null }));
		});

		// Mock moderation log
		mockSupabase.rpc = vi.fn().mockResolvedValue({ data: null, error: null });

		const request = createMockRequest(
			{
				reason: 'Platform-wide policy violation'
			},
			'DELETE'
		);

		const response = await DELETE({
			request,
			locals,
			params: { id: TEST_IDS.message }
		} as any);

		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
	});

	it('should reject teacher not participating in class channel with 403', async () => {
		const { DELETE } = await import('./[id]/+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock message fetch
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockMessages.classChannelMessage,
			error: null
		});

		// Mock teacher is NOT participant
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: null,
			error: null
		});

		// Mock conversation is group
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockConversations.classChannel,
			error: null
		});

		const request = createMockRequest(
			{
				reason: 'Test reason'
			},
			'DELETE'
		);

		try {
			await DELETE({
				request,
				locals,
				params: { id: TEST_IDS.message }
			} as any);
			expect.fail('Should have thrown 403 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(403);
			expect(error.body.message).toBe('You do not have access to this conversation');
		}
	});
});

// ============================================================================
// TESTS: 1-on-1 Chat Moderation
// ============================================================================

describe('DELETE /api/moderation/messages/[id] - 1-on-1 Chat Moderation', () => {
	beforeEach(() => {
		return import.meta.hot?.invalidate();
	});

	it('should allow teacher to moderate 1-on-1 chat where both students are in their class', async () => {
		const { DELETE } = await import('./[id]/+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock message fetch
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockMessages.classChannelMessage,
			error: null
		});

		// Mock teacher is NOT participant (1-on-1 chat between students)
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: null,
			error: null
		});

		// Mock conversation is 1-on-1 (not group)
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockConversations.oneOnOne,
			error: null
		});

		// Mock conversation participants (2 students)
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [{ user_id: TEST_IDS.student }, { user_id: TEST_IDS.student2 }],
					error: null
				})
			);
		});

		// Mock class_members check (both students are in teacher's class)
		mockSupabase._mockChain.select.mockReturnValueOnce({
			eq: vi.fn().mockReturnThis(),
			in: vi.fn().mockResolvedValue({
				count: 2,
				error: null
			})
		});

		// Mock message update (soft delete)
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(onFulfilled({ data: null, error: null }));
		});

		// Mock moderation log
		mockSupabase.rpc = vi.fn().mockResolvedValue({ data: null, error: null });

		const request = createMockRequest(
			{
				reason: 'Bullying in private chat'
			},
			'DELETE'
		);

		const response = await DELETE({
			request,
			locals,
			params: { id: TEST_IDS.message }
		} as any);

		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
	});

	it('should reject teacher moderating 1-on-1 chat where students not in their class with 403', async () => {
		const { DELETE } = await import('./[id]/+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock message fetch
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockMessages.classChannelMessage,
			error: null
		});

		// Mock teacher is NOT participant
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: null,
			error: null
		});

		// Mock conversation is 1-on-1
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockConversations.oneOnOne,
			error: null
		});

		// Mock conversation participants
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [{ user_id: TEST_IDS.student }, { user_id: TEST_IDS.student2 }],
					error: null
				})
			);
		});

		// Mock class_members check (only 1 student in teacher's class, not both)
		mockSupabase._mockChain.select.mockReturnValueOnce({
			eq: vi.fn().mockReturnThis(),
			in: vi.fn().mockResolvedValue({
				count: 1, // Only 1 out of 2 students
				error: null
			})
		});

		const request = createMockRequest(
			{
				reason: 'Test reason'
			},
			'DELETE'
		);

		try {
			await DELETE({
				request,
				locals,
				params: { id: TEST_IDS.message }
			} as any);
			expect.fail('Should have thrown 403 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(403);
			expect(error.body.message).toBe(
				'You can only moderate conversations where all participants are your students'
			);
		}
	});

	it('should reject teacher moderating 1-on-1 chat with invalid participant count with 403', async () => {
		const { DELETE } = await import('./[id]/+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock message fetch
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockMessages.classChannelMessage,
			error: null
		});

		// Mock teacher is NOT participant
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: null,
			error: null
		});

		// Mock conversation is 1-on-1
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockConversations.oneOnOne,
			error: null
		});

		// Mock invalid participant count (should be 2 for 1-on-1)
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: [{ user_id: TEST_IDS.student }], // Only 1 participant
					error: null
				})
			);
		});

		const request = createMockRequest(
			{
				reason: 'Test reason'
			},
			'DELETE'
		);

		try {
			await DELETE({
				request,
				locals,
				params: { id: TEST_IDS.message }
			} as any);
			expect.fail('Should have thrown 403 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(403);
			expect(error.body.message).toBe('You do not have access to this conversation');
		}
	});
});

// ============================================================================
// TESTS: Input Validation
// ============================================================================

describe('DELETE /api/moderation/messages/[id] - Input Validation', () => {
	beforeEach(() => {
		return import.meta.hot?.invalidate();
	});

	it('should reject invalid JSON with 400', async () => {
		const { DELETE } = await import('./[id]/+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock request that throws on json()
		const request = {
			json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
		} as unknown as Request;

		try {
			await DELETE({
				request,
				locals,
				params: { id: TEST_IDS.message }
			} as any);
			expect.fail('Should have thrown 400 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(400);
			expect(error.body.message).toBe('Invalid JSON');
		}
	});

	it('should reject invalid message ID (not UUID) with 400', async () => {
		const { DELETE } = await import('./[id]/+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		const request = createMockRequest(
			{
				reason: 'Test reason'
			},
			'DELETE'
		);

		try {
			await DELETE({
				request,
				locals,
				params: { id: 'not-a-uuid' } // Invalid UUID
			} as any);
			expect.fail('Should have thrown 400 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(400);
			expect(error.body.message).toContain('Invalid message ID format');
		}
	});

	it('should reject reason that is too short (< 5 chars) with 400', async () => {
		const { DELETE } = await import('./[id]/+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		const request = createMockRequest(
			{
				reason: 'Bad' // Only 3 characters
			},
			'DELETE'
		);

		try {
			await DELETE({
				request,
				locals,
				params: { id: TEST_IDS.message }
			} as any);
			expect.fail('Should have thrown 400 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(400);
			expect(error.body.message).toContain('at least 5 characters');
		}
	});

	it('should reject reason that is too long (> 500 chars) with 400', async () => {
		const { DELETE } = await import('./[id]/+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		const request = createMockRequest(
			{
				reason: 'A'.repeat(501) // 501 characters
			},
			'DELETE'
		);

		try {
			await DELETE({
				request,
				locals,
				params: { id: TEST_IDS.message }
			} as any);
			expect.fail('Should have thrown 400 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(400);
			expect(error.body.message).toContain('cannot exceed 500 characters');
		}
	});

	it('should reject missing reason with 400', async () => {
		const { DELETE } = await import('./[id]/+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		const request = createMockRequest({}, 'DELETE'); // Missing reason

		try {
			await DELETE({
				request,
				locals,
				params: { id: TEST_IDS.message }
			} as any);
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
// TESTS: Error Handling
// ============================================================================

describe('DELETE /api/moderation/messages/[id] - Error Handling', () => {
	beforeEach(() => {
		return import.meta.hot?.invalidate();
	});

	it('should return 404 when message not found', async () => {
		const { DELETE } = await import('./[id]/+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock message not found
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: null,
			error: null
		});

		const request = createMockRequest(
			{
				reason: 'Test reason'
			},
			'DELETE'
		);

		try {
			await DELETE({
				request,
				locals,
				params: { id: TEST_IDS.message }
			} as any);
			expect.fail('Should have thrown 404 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(404);
			expect(error.body.message).toBe('Message not found');
		}
	});

	it('should return 400 when message is already deleted', async () => {
		const { DELETE } = await import('./[id]/+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock already deleted message
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockMessages.alreadyDeletedMessage,
			error: null
		});

		const request = createMockRequest(
			{
				reason: 'Test reason'
			},
			'DELETE'
		);

		try {
			await DELETE({
				request,
				locals,
				params: { id: TEST_IDS.message }
			} as any);
			expect.fail('Should have thrown 400 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(400);
			expect(error.body.message).toBe('Message is already deleted');
		}
	});

	it('should return 500 on database error during message fetch', async () => {
		const { DELETE } = await import('./[id]/+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock database error during fetch
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: null,
			error: { message: 'Database connection error' }
		});

		const request = createMockRequest(
			{
				reason: 'Test reason'
			},
			'DELETE'
		);

		try {
			await DELETE({
				request,
				locals,
				params: { id: TEST_IDS.message }
			} as any);
			expect.fail('Should have thrown 500 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(500);
			expect(error.body.message).toBe('Failed to fetch message');
		}
	});

	it('should return 500 on database error during delete', async () => {
		const { DELETE } = await import('./[id]/+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock message fetch (success)
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockMessages.classChannelMessage,
			error: null
		});

		// Mock teacher is participant
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { user_id: TEST_IDS.teacher },
			error: null
		});

		// Mock message update failure
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: null,
					error: { message: 'Update failed' }
				})
			);
		});

		const request = createMockRequest(
			{
				reason: 'Test reason'
			},
			'DELETE'
		);

		try {
			await DELETE({
				request,
				locals,
				params: { id: TEST_IDS.message }
			} as any);
			expect.fail('Should have thrown 500 error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(500);
			expect(error.body.message).toBe('Failed to delete message');
		}
	});

	it('should still succeed even if moderation log fails', async () => {
		const { DELETE } = await import('./[id]/+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock message fetch
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockMessages.classChannelMessage,
			error: null
		});

		// Mock teacher is participant
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { user_id: TEST_IDS.teacher },
			error: null
		});

		// Mock message update (success)
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(onFulfilled({ data: null, error: null }));
		});

		// Mock moderation log failure (should not fail the request)
		mockSupabase.rpc = vi.fn().mockResolvedValue({
			data: null,
			error: { message: 'Logging failed' }
		});

		const request = createMockRequest(
			{
				reason: 'Test reason'
			},
			'DELETE'
		);

		const response = await DELETE({
			request,
			locals,
			params: { id: TEST_IDS.message }
		} as any);

		const data = await response.json();

		// Should still succeed
		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
	});
});

// ============================================================================
// TESTS: Privacy & Logging
// ============================================================================

describe('DELETE /api/moderation/messages/[id] - Privacy & Logging', () => {
	beforeEach(() => {
		return import.meta.hot?.invalidate();
	});

	it('should log message length but not full content for privacy', async () => {
		const { DELETE } = await import('./[id]/+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		const messageContent = 'This is a sensitive message that should not be logged';
		const message = {
			...mockMessages.classChannelMessage,
			content: messageContent
		};

		// Mock message fetch
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: message,
			error: null
		});

		// Mock teacher is participant
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { user_id: TEST_IDS.teacher },
			error: null
		});

		// Mock message update
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(onFulfilled({ data: null, error: null }));
		});

		// Mock moderation log
		mockSupabase.rpc = vi.fn().mockResolvedValue({ data: null, error: null });

		const request = createMockRequest(
			{
				reason: 'Privacy violation'
			},
			'DELETE'
		);

		await DELETE({
			request,
			locals,
			params: { id: TEST_IDS.message }
		} as any);

		// Verify metadata includes length but not content
		expect(mockSupabase.rpc).toHaveBeenCalledWith(
			'log_moderation_action',
			expect.objectContaining({
				p_metadata: expect.objectContaining({
					message_length: messageContent.length
					// Should NOT contain the actual content
				})
			})
		);

		// Verify the actual content was NOT logged
		const rpcCall = mockSupabase.rpc.mock.calls[0][1];
		expect(JSON.stringify(rpcCall)).not.toContain(messageContent);
	});

	it('should include conversation and sender metadata in log', async () => {
		const { DELETE } = await import('./[id]/+server');

		const mockSupabase = createMockSupabase();
		const locals = createLocalsWithRole(TEST_IDS.teacher, 'teacher', mockSupabase);

		// Mock message fetch
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockMessages.classChannelMessage,
			error: null
		});

		// Mock teacher is participant
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { user_id: TEST_IDS.teacher },
			error: null
		});

		// Mock message update
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(onFulfilled({ data: null, error: null }));
		});

		// Mock moderation log
		mockSupabase.rpc = vi.fn().mockResolvedValue({ data: null, error: null });

		const request = createMockRequest(
			{
				reason: 'Test reason'
			},
			'DELETE'
		);

		await DELETE({
			request,
			locals,
			params: { id: TEST_IDS.message }
		} as any);

		// Verify metadata includes relevant context
		expect(mockSupabase.rpc).toHaveBeenCalledWith(
			'log_moderation_action',
			expect.objectContaining({
				p_action: 'delete_message',
				p_target_type: 'message',
				p_target_id: TEST_IDS.message,
				p_reason: 'Test reason',
				p_metadata: expect.objectContaining({
					conversation_id: TEST_IDS.conversation,
					sender_id: TEST_IDS.student,
					message_created_at: '2024-01-01T00:00:00Z'
				})
			})
		);
	});
});
