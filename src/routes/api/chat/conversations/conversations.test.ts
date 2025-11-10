/**
 * Tests for /api/chat/conversations endpoints
 */
import { describe, it, expect, vi } from 'vitest';
import { GET, POST } from './+server';

// Mock SvelteKit
vi.mock('@sveltejs/kit', () => ({
	json: (data: unknown, opts?: { status?: number }) => ({
		data,
		status: opts?.status || 200
	}),
	error: (status: number, message: string) => {
		const err = new Error(message);
		Object.assign(err, { status });
		throw err;
	}
}));

describe('GET /api/chat/conversations', () => {
	it('should return 401 if not authenticated', async () => {
		const locals = { user: null, supabase: null };

		await expect(
			GET({
				locals
			} as Parameters<typeof GET>[0])
		).rejects.toMatchObject({
			status: 401
		});
	});

	it('should return conversations on success', async () => {
		const mockConversations = [
			{
				id: '123e4567-e89b-12d3-a456-426614174000',
				name: 'Test Chat',
				is_group: false,
				unread_count: 2
			}
		];

		const mockSupabase = {
			rpc: vi.fn().mockResolvedValue({
				data: mockConversations,
				error: null
			})
		};

		const locals = {
			user: { id: 'user-123' },
			supabase: mockSupabase
		};

		const response = await GET({
			locals
		} as Parameters<typeof GET>[0]);

		expect(mockSupabase.rpc).toHaveBeenCalledWith('get_user_conversations', {
			p_user_id: 'user-123'
		});

		expect(response).toMatchObject({
			data: { conversations: mockConversations },
			status: 200
		});
	});

	it('should handle database errors gracefully', async () => {
		const mockSupabase = {
			rpc: vi.fn().mockResolvedValue({
				data: null,
				error: { message: 'Database error' }
			})
		};

		const locals = {
			user: { id: 'user-123' },
			supabase: mockSupabase
		};

		await expect(
			GET({
				locals
			} as Parameters<typeof GET>[0])
		).rejects.toMatchObject({
			status: 500
		});
	});
});

describe('POST /api/chat/conversations', () => {
	it('should return 401 if not authenticated', async () => {
		const locals = { user: null, supabase: null };
		const request = new Request('http://localhost', {
			method: 'POST',
			body: JSON.stringify({ friendId: '123e4567-e89b-12d3-a456-426614174000' })
		});

		await expect(
			POST({
				request,
				locals
			} as Parameters<typeof POST>[0])
		).rejects.toMatchObject({
			status: 401
		});
	});

	it('should return 400 for invalid JSON', async () => {
		const locals = { user: { id: 'user-123' }, supabase: null };
		const request = new Request('http://localhost', {
			method: 'POST',
			body: 'invalid json'
		});

		await expect(
			POST({
				request,
				locals
			} as Parameters<typeof POST>[0])
		).rejects.toMatchObject({
			status: 400,
			message: 'Invalid JSON'
		});
	});

	it('should return 400 for invalid friendId', async () => {
		const locals = { user: { id: 'user-123' }, supabase: null };
		const request = new Request('http://localhost', {
			method: 'POST',
			body: JSON.stringify({ friendId: 'not-a-uuid' })
		});

		await expect(
			POST({
				request,
				locals
			} as Parameters<typeof POST>[0])
		).rejects.toMatchObject({
			status: 400
		});
	});

	it('should create conversation successfully', async () => {
		const conversationId = '123e4567-e89b-12d3-a456-426614174000';

		const mockSupabase = {
			rpc: vi.fn().mockResolvedValue({
				data: conversationId,
				error: null
			})
		};

		const locals = {
			user: { id: 'user-123' },
			supabase: mockSupabase
		};

		const request = new Request('http://localhost', {
			method: 'POST',
			body: JSON.stringify({ friendId: '456e7890-e89b-12d3-a456-426614174000' })
		});

		const response = await POST({
			request,
			locals
		} as Parameters<typeof POST>[0]);

		expect(mockSupabase.rpc).toHaveBeenCalledWith('create_1on1_chat', {
			p_user1_id: 'user-123',
			p_user2_id: '456e7890-e89b-12d3-a456-426614174000'
		});

		expect(response).toMatchObject({
			data: { conversationId },
			status: 201
		});
	});

	it('should return 403 when users are not friends', async () => {
		const mockSupabase = {
			rpc: vi.fn().mockResolvedValue({
				data: null,
				error: { message: 'Users must be friends to create a conversation' }
			})
		};

		const locals = {
			user: { id: 'user-123' },
			supabase: mockSupabase
		};

		const request = new Request('http://localhost', {
			method: 'POST',
			body: JSON.stringify({ friendId: '456e7890-e89b-12d3-a456-426614174000' })
		});

		await expect(
			POST({
				request,
				locals
			} as Parameters<typeof POST>[0])
		).rejects.toMatchObject({
			status: 403
		});
	});

	it('should return 409 when conversation already exists', async () => {
		const mockSupabase = {
			rpc: vi.fn().mockResolvedValue({
				data: null,
				error: { message: 'Conversation already exists' }
			})
		};

		const locals = {
			user: { id: 'user-123' },
			supabase: mockSupabase
		};

		const request = new Request('http://localhost', {
			method: 'POST',
			body: JSON.stringify({ friendId: '456e7890-e89b-12d3-a456-426614174000' })
		});

		await expect(
			POST({
				request,
				locals
			} as Parameters<typeof POST>[0])
		).rejects.toMatchObject({
			status: 409
		});
	});

	it('should handle missing conversation ID gracefully', async () => {
		const mockSupabase = {
			rpc: vi.fn().mockResolvedValue({
				data: null,
				error: null
			})
		};

		const locals = {
			user: { id: 'user-123' },
			supabase: mockSupabase
		};

		const request = new Request('http://localhost', {
			method: 'POST',
			body: JSON.stringify({ friendId: '456e7890-e89b-12d3-a456-426614174000' })
		});

		await expect(
			POST({
				request,
				locals
			} as Parameters<typeof POST>[0])
		).rejects.toMatchObject({
			status: 500
		});
	});
});
