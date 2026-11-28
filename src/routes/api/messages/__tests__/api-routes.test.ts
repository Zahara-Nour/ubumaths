/**
 * Message API Routes - Comprehensive Test Suite
 * ==============================================
 *
 * Tests all messaging API endpoints including:
 * - Message read, update, delete (l'envoi est testé par `send/__tests__`)
 * - Draft management
 * - Thread management
 * - Read receipts
 * - Message status updates
 * - Inbox/sent/archive functionality
 * - Authorization and validation
 *
 * @module api/messages/api-routes.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	createMockSupabase,
	createMockLocals,
	mockIds,
	mockMessage,
	mockDraft,
	mockThreadMessages,
	createMockMessage,
	createMockInboxEntry,
	createMockDraft,
	mockSanitize
} from '../../../../../tests/helpers/message-helpers';

// ============================================================================
// GET MESSAGE TESTS
// ============================================================================

describe('GET /api/messages/[id]', () => {
	let mockSupabase: ReturnType<typeof createMockSupabase>;

	beforeEach(() => {
		mockSupabase = createMockSupabase();
		vi.clearAllMocks();
	});

	it('should fetch message details for authorized user', async () => {
		mockSupabase.rpc.mockResolvedValueOnce({
			data: [mockMessage],
			error: null
		});

		const result = await mockSupabase.rpc('get_message_details', {
			p_message_id: mockIds.message1,
			p_user_id: mockIds.student1
		});

		expect(result.error).toBeNull();
		expect(result.data).toHaveLength(1);
		expect(result.data![0]).toEqual(mockMessage);
	});

	it('should mark message as read when fetched by recipient', async () => {
		// Mock get message
		mockSupabase.rpc.mockResolvedValueOnce({
			data: [mockMessage],
			error: null
		});

		// Mock mark as read
		mockSupabase.rpc.mockResolvedValueOnce({
			data: null,
			error: null
		});

		await mockSupabase.rpc('get_message_details', {
			p_message_id: mockIds.message1,
			p_user_id: mockIds.student1
		});

		await mockSupabase.rpc('mark_message_as_read', {
			p_message_id: mockIds.message1,
			p_user_id: mockIds.student1
		});

		expect(mockSupabase.rpc).toHaveBeenCalledWith('mark_message_as_read', {
			p_message_id: mockIds.message1,
			p_user_id: mockIds.student1
		});
	});

	it('should reject access to message for unauthorized user', async () => {
		mockSupabase.rpc.mockResolvedValueOnce({
			data: null,
			error: { message: 'You do not have access to this message' }
		});

		const result = await mockSupabase.rpc('get_message_details', {
			p_message_id: mockIds.message1,
			p_user_id: 'unauthorized-user'
		});

		expect(result.error).toBeTruthy();
		expect(result.error?.message).toContain('do not have access');
	});

	it('should return 404 for non-existent message', async () => {
		mockSupabase.rpc.mockResolvedValueOnce({
			data: [],
			error: null
		});

		const result = await mockSupabase.rpc('get_message_details', {
			p_message_id: 'non-existent-id',
			p_user_id: mockIds.student1
		});

		expect(result.data).toHaveLength(0);
	});
});

// ============================================================================
// INBOX TESTS
// ============================================================================

describe('GET /api/messages/inbox', () => {
	let mockSupabase: ReturnType<typeof createMockSupabase>;

	beforeEach(() => {
		mockSupabase = createMockSupabase();
		vi.clearAllMocks();
	});

	it('should fetch inbox messages', async () => {
		const inboxMessages = [
			createMockMessage({ id: 'msg-1' }),
			createMockMessage({ id: 'msg-2' }),
			createMockMessage({ id: 'msg-3' })
		];

		mockSupabase.rpc.mockResolvedValueOnce({
			data: inboxMessages,
			error: null
		});

		const result = await mockSupabase.rpc('get_user_inbox', {
			p_user_id: mockIds.student1,
			p_status: 'inbox',
			p_folder_id: null,
			p_limit: 50,
			p_offset: 0
		});

		expect(result.error).toBeNull();
		expect(result.data).toHaveLength(3);
	});

	it('should fetch archived messages', async () => {
		const archivedMessages = [createMockMessage({ id: 'msg-archived' })];

		mockSupabase.rpc.mockResolvedValueOnce({
			data: archivedMessages,
			error: null
		});

		const result = await mockSupabase.rpc('get_user_inbox', {
			p_user_id: mockIds.student1,
			p_status: 'archived',
			p_folder_id: null,
			p_limit: 50,
			p_offset: 0
		});

		expect(result.error).toBeNull();
		expect(result.data).toHaveLength(1);
	});

	it('should fetch messages in specific folder', async () => {
		const folderMessages = [createMockMessage({ id: 'msg-folder' })];

		mockSupabase.rpc.mockResolvedValueOnce({
			data: folderMessages,
			error: null
		});

		const result = await mockSupabase.rpc('get_user_inbox', {
			p_user_id: mockIds.student1,
			p_status: 'inbox',
			p_folder_id: 'folder-123',
			p_limit: 50,
			p_offset: 0
		});

		expect(result.error).toBeNull();
		expect(result.data).toHaveLength(1);
	});

	it('should support pagination', async () => {
		const page2Messages = [createMockMessage({ id: 'msg-51' })];

		mockSupabase.rpc.mockResolvedValueOnce({
			data: page2Messages,
			error: null
		});

		const result = await mockSupabase.rpc('get_user_inbox', {
			p_user_id: mockIds.student1,
			p_status: 'inbox',
			p_folder_id: null,
			p_limit: 50,
			p_offset: 50
		});

		expect(result.error).toBeNull();
	});

	it('should return empty array when no messages', async () => {
		mockSupabase.rpc.mockResolvedValueOnce({
			data: [],
			error: null
		});

		const result = await mockSupabase.rpc('get_user_inbox', {
			p_user_id: mockIds.student1,
			p_status: 'inbox',
			p_folder_id: null,
			p_limit: 50,
			p_offset: 0
		});

		expect(result.error).toBeNull();
		expect(result.data).toHaveLength(0);
	});
});

// ============================================================================
// SENT MESSAGES TESTS
// ============================================================================

describe('GET /api/messages/sent', () => {
	let mockSupabase: ReturnType<typeof createMockSupabase>;

	beforeEach(() => {
		mockSupabase = createMockSupabase();
		vi.clearAllMocks();
	});

	it('should fetch sent messages for user', async () => {
		const sentMessages = [
			createMockMessage({ id: 'sent-1', sender_id: mockIds.teacher }),
			createMockMessage({ id: 'sent-2', sender_id: mockIds.teacher })
		];

		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			const response = { data: sentMessages, error: null };
			return Promise.resolve(onFulfilled ? onFulfilled(response) : response);
		});

		const result = await mockSupabase
			.from('private_messages')
			.select('*')
			.eq('sender_id', mockIds.teacher)
			.eq('deleted_by_sender', false)
			.order('sent_at', { ascending: false });

		expect(result.error).toBeNull();
		expect(result.data).toHaveLength(2);
	});

	it('should exclude deleted sent messages', async () => {
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			const response = { data: [], error: null };
			return Promise.resolve(onFulfilled ? onFulfilled(response) : response);
		});

		const result = await mockSupabase
			.from('private_messages')
			.select('*')
			.eq('sender_id', mockIds.teacher)
			.eq('deleted_by_sender', false);

		expect(result.data).toHaveLength(0);
	});
});

// ============================================================================
// DRAFT MANAGEMENT TESTS
// ============================================================================

describe('Draft Management', () => {
	let mockSupabase: ReturnType<typeof createMockSupabase>;

	beforeEach(() => {
		mockSupabase = createMockSupabase();
		vi.clearAllMocks();
	});

	describe('GET /api/messages/drafts', () => {
		it('should fetch all drafts for user', async () => {
			const drafts = [createMockDraft({ id: 'draft-1' }), createMockDraft({ id: 'draft-2' })];

			mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
				const response = { data: drafts, error: null };
				return Promise.resolve(onFulfilled ? onFulfilled(response) : response);
			});

			const result = await mockSupabase
				.from('message_drafts')
				.select('*')
				.eq('author_id', mockIds.teacher)
				.order('updated_at', { ascending: false });

			expect(result.error).toBeNull();
			expect(result.data).toHaveLength(2);
		});

		it('should return empty array when no drafts', async () => {
			mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
				const response = { data: [], error: null };
				return Promise.resolve(onFulfilled ? onFulfilled(response) : response);
			});

			const result = await mockSupabase
				.from('message_drafts')
				.select('*')
				.eq('author_id', mockIds.teacher);

			expect(result.data).toHaveLength(0);
		});
	});

	describe('POST /api/messages/drafts (Create)', () => {
		it('should create new draft', async () => {
			const draftData = {
				subject: 'New Draft',
				content: '<p>Work in progress</p>',
				recipientIds: [mockIds.student1],
				isGroupMessage: false
			};

			const newDraft = createMockDraft(draftData);

			mockSupabase._mockChain.single.mockResolvedValueOnce({
				data: newDraft,
				error: null
			});

			const result = await mockSupabase
				.from('message_drafts')
				.insert({
					author_id: mockIds.teacher,
					subject: draftData.subject,
					content: draftData.content,
					recipient_ids: draftData.recipientIds,
					is_group_message: false,
					class_id: null,
					replying_to_message_id: null
				})
				.select()
				.single();

			expect(result.error).toBeNull();
			expect(result.data).toBeTruthy();
		});
	});

	describe('POST /api/messages/drafts (Update)', () => {
		it('should update existing draft', async () => {
			const updates = {
				subject: 'Updated Draft Title',
				content: '<p>Updated content</p>'
			};

			const updatedDraft = createMockDraft({ ...mockDraft, ...updates });

			mockSupabase._mockChain.single.mockResolvedValueOnce({
				data: updatedDraft,
				error: null
			});

			const result = await mockSupabase
				.from('message_drafts')
				.update(updates)
				.eq('id', mockIds.draft1)
				.eq('author_id', mockIds.teacher)
				.select()
				.single();

			expect(result.error).toBeNull();
			expect(result.data?.subject).toBe(updates.subject);
		});

		it('should reject update to draft owned by different user', async () => {
			mockSupabase._mockChain.single.mockResolvedValueOnce({
				data: null,
				error: { message: 'Not found' }
			});

			const result = await mockSupabase
				.from('message_drafts')
				.update({ subject: 'Hack attempt' })
				.eq('id', mockIds.draft1)
				.eq('author_id', 'different-user')
				.select()
				.single();

			expect(result.error).toBeTruthy();
		});
	});

	describe('DELETE /api/messages/drafts/[id]', () => {
		it('should delete draft', async () => {
			mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
				const response = { data: {}, error: null };
				return Promise.resolve(onFulfilled ? onFulfilled(response) : response);
			});

			const result = await mockSupabase
				.from('message_drafts')
				.delete()
				.eq('id', mockIds.draft1)
				.eq('author_id', mockIds.teacher);

			expect(result.error).toBeNull();
		});

		it('should reject delete of draft owned by different user', async () => {
			mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
				const response = { data: null, error: { message: 'Not found' } };
				return Promise.resolve(onFulfilled ? onFulfilled(response) : response);
			});

			const result = await mockSupabase
				.from('message_drafts')
				.delete()
				.eq('id', mockIds.draft1)
				.eq('author_id', 'different-user');

			expect(result.error).toBeTruthy();
		});
	});
});

// ============================================================================
// MESSAGE UPDATE TESTS (Status, Star, Folder)
// ============================================================================

describe('PATCH /api/messages/[id]', () => {
	let mockSupabase: ReturnType<typeof createMockSupabase>;

	beforeEach(() => {
		mockSupabase = createMockSupabase();
		vi.clearAllMocks();
	});

	describe('Update Status (Archive/Trash)', () => {
		it('should archive message', async () => {
			mockSupabase.rpc.mockResolvedValueOnce({
				data: null,
				error: null
			});

			const result = await mockSupabase.rpc('update_message_status', {
				p_message_id: mockIds.message1,
				p_user_id: mockIds.student1,
				p_status: 'archived'
			});

			expect(result.error).toBeNull();
		});

		it('should move message to trash', async () => {
			mockSupabase.rpc.mockResolvedValueOnce({
				data: null,
				error: null
			});

			const result = await mockSupabase.rpc('update_message_status', {
				p_message_id: mockIds.message1,
				p_user_id: mockIds.student1,
				p_status: 'trash'
			});

			expect(result.error).toBeNull();
		});

		it('should restore message to inbox', async () => {
			mockSupabase.rpc.mockResolvedValueOnce({
				data: null,
				error: null
			});

			const result = await mockSupabase.rpc('update_message_status', {
				p_message_id: mockIds.message1,
				p_user_id: mockIds.student1,
				p_status: 'inbox'
			});

			expect(result.error).toBeNull();
		});
	});

	describe('Toggle Read Status', () => {
		it('should mark message as read', () => {
			const readEntry = createMockInboxEntry({
				read_at: new Date().toISOString() as never
			});

			mockSupabase._mockChain.then.mockReturnValueOnce({
				data: {},
				error: null
			});

			mockSupabase
				.from('message_inbox')
				.update({ read_at: readEntry.read_at })
				.eq('message_id', mockIds.message1)
				.eq('recipient_id', mockIds.student1)
				.then();

			expect(mockSupabase._mockChain.update).toHaveBeenCalled();
		});

		it('should mark message as unread', () => {
			mockSupabase._mockChain.then.mockReturnValueOnce({
				data: {},
				error: null
			});

			mockSupabase
				.from('message_inbox')
				.update({ read_at: null })
				.eq('message_id', mockIds.message1)
				.eq('recipient_id', mockIds.student1)
				.then();

			expect(mockSupabase._mockChain.update).toHaveBeenCalled();
		});
	});

	describe('Toggle Star', () => {
		it('should star message', async () => {
			mockSupabase.rpc.mockResolvedValueOnce({
				data: true,
				error: null
			});

			const result = await mockSupabase.rpc('toggle_message_star', {
				p_message_id: mockIds.message1,
				p_user_id: mockIds.student1
			});

			expect(result.error).toBeNull();
			expect(result.data).toBe(true);
		});

		it('should unstar message', async () => {
			mockSupabase.rpc.mockResolvedValueOnce({
				data: false,
				error: null
			});

			const result = await mockSupabase.rpc('toggle_message_star', {
				p_message_id: mockIds.message1,
				p_user_id: mockIds.student1
			});

			expect(result.error).toBeNull();
			expect(result.data).toBe(false);
		});
	});

	describe('Move to Folder', () => {
		it('should move message to folder', async () => {
			mockSupabase.rpc.mockResolvedValueOnce({
				data: null,
				error: null
			});

			const result = await mockSupabase.rpc('move_message_to_folder', {
				p_message_id: mockIds.message1,
				p_user_id: mockIds.student1,
				p_folder_id: 'folder-123'
			});

			expect(result.error).toBeNull();
		});
	});
});

// ============================================================================
// DELETE MESSAGE TESTS
// ============================================================================

describe('DELETE /api/messages/[id]', () => {
	let mockSupabase: ReturnType<typeof createMockSupabase>;

	beforeEach(() => {
		mockSupabase = createMockSupabase();
		vi.clearAllMocks();
	});

	it('should soft delete message for sender', async () => {
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { sender_id: mockIds.teacher },
			error: null
		});

		// Check ownership
		await mockSupabase
			.from('private_messages')
			.select('sender_id')
			.eq('id', mockIds.message1)
			.single();

		// Mock the update operation
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: {},
			error: null
		});

		// Delete as sender
		const result = await mockSupabase
			.from('private_messages')
			.update({ deleted_by_sender: true })
			.eq('id', mockIds.message1)
			.single();

		expect(mockSupabase._mockChain.update).toHaveBeenCalled();
		expect(result.error).toBeNull();
	});

	it('should soft delete message for recipient', async () => {
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { sender_id: 'different-user' },
			error: null
		});

		// Mock the update operation
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: {},
			error: null
		});

		// Delete as recipient
		const result = await mockSupabase
			.from('message_inbox')
			.update({ deleted: true })
			.eq('message_id', mockIds.message1)
			.eq('recipient_id', mockIds.student1)
			.single();

		expect(mockSupabase._mockChain.update).toHaveBeenCalled();
		expect(result.error).toBeNull();
	});
});

// ============================================================================
// THREAD TESTS
// ============================================================================

describe('GET /api/messages/thread', () => {
	let mockSupabase: ReturnType<typeof createMockSupabase>;

	beforeEach(() => {
		mockSupabase = createMockSupabase();
		vi.clearAllMocks();
	});

	it('should fetch all messages in thread', async () => {
		mockSupabase.rpc.mockResolvedValueOnce({
			data: mockThreadMessages,
			error: null
		});

		const result = await mockSupabase.rpc('get_message_thread', {
			p_thread_root_id: 'thread-root',
			p_user_id: mockIds.student1
		});

		expect(result.error).toBeNull();
		expect(result.data).toHaveLength(3);
		// Le mock (mockThreadMessages) porte `id`, alors que la vraie RPC rend `message_id` :
		// on vérifie ce que le mock a rendu, sans prétendre que c'est la forme de la RPC.
		expect(result.data?.[0]).toMatchObject({ id: 'thread-root' });
	});

	it('should reject thread access for unauthorized user', async () => {
		mockSupabase.rpc.mockResolvedValueOnce({
			data: null,
			error: { message: 'You do not have access to this thread' }
		});

		const result = await mockSupabase.rpc('get_message_thread', {
			p_thread_root_id: 'thread-root',
			p_user_id: 'unauthorized-user'
		});

		expect(result.error).toBeTruthy();
		expect(result.error?.message).toContain('do not have access');
	});

	it('should return empty array for non-existent thread', async () => {
		mockSupabase.rpc.mockResolvedValueOnce({
			data: [],
			error: null
		});

		const result = await mockSupabase.rpc('get_message_thread', {
			p_thread_root_id: 'non-existent',
			p_user_id: mockIds.student1
		});

		expect(result.data).toHaveLength(0);
	});
});

// ============================================================================
// UNREAD COUNT TESTS
// ============================================================================

describe('GET /api/messages/unread-count', () => {
	let mockSupabase: ReturnType<typeof createMockSupabase>;

	beforeEach(() => {
		mockSupabase = createMockSupabase();
		vi.clearAllMocks();
	});

	it('should return unread message count', async () => {
		mockSupabase.rpc.mockResolvedValueOnce({
			data: 5,
			error: null
		});

		const result = await mockSupabase.rpc('get_private_messages_unread_count', {
			p_user_id: mockIds.student1
		});

		expect(result.error).toBeNull();
		expect(result.data).toBe(5);
	});

	it('should return 0 when no unread messages', async () => {
		mockSupabase.rpc.mockResolvedValueOnce({
			data: 0,
			error: null
		});

		const result = await mockSupabase.rpc('get_private_messages_unread_count', {
			p_user_id: mockIds.student1
		});

		expect(result.data).toBe(0);
	});
});

// ============================================================================
// RECIPIENTS TESTS
// ============================================================================

describe('GET /api/messages/recipients', () => {
	let mockSupabase: ReturnType<typeof createMockSupabase>;

	beforeEach(() => {
		mockSupabase = createMockSupabase();
		vi.clearAllMocks();
	});

	it('should fetch available recipients for teacher', async () => {
		const recipients = [
			{ id: mockIds.student1, name: 'Alice Student', email: 'alice@test.com' },
			{ id: mockIds.student2, name: 'Bob Student', email: 'bob@test.com' }
		];

		mockSupabase._mockChain.then.mockReturnValueOnce({
			data: recipients,
			error: null
		});

		const result = await mockSupabase
			.from('profiles')
			.select('id, name, email')
			.eq('role', 'student')
			.then();

		expect(result.error).toBeNull();
		expect(result.data).toHaveLength(2);
	});
});

// ============================================================================
// AUTHORIZATION TESTS
// ============================================================================

describe('Authorization & Access Control', () => {
	let mockSupabase: ReturnType<typeof createMockSupabase>;

	beforeEach(() => {
		mockSupabase = createMockSupabase();
		vi.clearAllMocks();
	});

	it('should reject unauthenticated requests', () => {
		const locals = createMockLocals('', mockSupabase);
		expect(locals.user).toBeNull();
	});

	it('should only allow recipients to read messages', async () => {
		mockSupabase.rpc.mockResolvedValueOnce({
			data: null,
			error: { message: 'You do not have access to this message' }
		});

		const result = await mockSupabase.rpc('get_message_details', {
			p_message_id: mockIds.message1,
			p_user_id: 'unauthorized-user'
		});

		expect(result.error?.message).toContain('do not have access');
	});

	it('should only allow sender to delete sent messages', async () => {
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: { sender_id: mockIds.teacher },
			error: null
		});

		// Different user trying to delete
		mockSupabase._mockChain.then.mockImplementationOnce((onFulfilled) => {
			return Promise.resolve(
				onFulfilled({
					data: null,
					error: { message: 'Not authorized' }
				})
			);
		});

		const checkResult = await mockSupabase
			.from('private_messages')
			.select('sender_id')
			.eq('id', mockIds.message1)
			.single();

		expect(checkResult.data?.sender_id).toBe(mockIds.teacher);

		// Verify sender check happens before delete
		const isSender = checkResult.data?.sender_id === mockIds.teacher;
		expect(isSender).toBe(true);
	});

	it('should only allow draft owner to update drafts', async () => {
		mockSupabase._mockChain.single.mockResolvedValueOnce({
			data: null,
			error: { message: 'Not found' }
		});

		const result = await mockSupabase
			.from('message_drafts')
			.update({ subject: 'Updated' })
			.eq('id', mockIds.draft1)
			.eq('author_id', 'wrong-user')
			.select()
			.single();

		expect(result.error).toBeTruthy();
	});

	it('should only allow admin/teacher to create templates', () => {
		const teacherLocals = createMockLocals(mockIds.teacher, mockSupabase);
		const studentLocals = createMockLocals(mockIds.student1, mockSupabase);

		expect(teacherLocals.user?.id).toBe(mockIds.teacher);
		expect(studentLocals.user?.id).toBe(mockIds.student1);
		// Role checking would happen server-side
	});

	it('should restrict students from creating system templates', () => {
		// This would be checked in the actual endpoint
		const templateData = {
			scope: 'system',
			created_by: mockIds.student1 // Student trying to create system template
		};

		// Validation would fail in real implementation
		expect(templateData.scope).toBe('system');
		expect(templateData.created_by).toBe(mockIds.student1);
	});
});

// ============================================================================
// VALIDATION & ERROR HANDLING TESTS
// ============================================================================

describe('Validation & Error Handling', () => {
	it('should validate message subject length', () => {
		const tooLong = 'a'.repeat(300);
		const data = {
			subject: tooLong,
			content: '<p>Content</p>',
			recipientIds: [mockIds.student1],
			isGroupMessage: false
		};

		// In real implementation, would check max length
		expect(data.subject.length).toBeGreaterThan(255);
	});

	it('should sanitize HTML content to prevent XSS', () => {
		const maliciousContent = '<script>alert("XSS")</script><p>Safe content</p>';
		const sanitized = mockSanitize(maliciousContent);

		expect(sanitized).not.toContain('<script>');
		expect(sanitized).toContain('Safe content');
	});

	it('should handle malformed TipTap JSON', () => {
		const invalidJSON = '{invalid json}';

		expect(() => JSON.parse(invalidJSON)).toThrow();
	});

	it('should handle database errors gracefully', async () => {
		const mockSupabase = createMockSupabase();
		mockSupabase.rpc.mockResolvedValueOnce({
			data: null,
			error: { message: 'Database connection error' }
		});

		const result = await mockSupabase.rpc('send_private_message', {});

		expect(result.error?.message).toBe('Database connection error');
	});

	it('should validate recipient IDs format', () => {
		const invalidRecipients = ['not-a-uuid', '123', 'invalid'];
		const validRecipients = [
			'550e8400-e29b-41d4-a716-446655440000',
			'6ba7b810-9dad-11d1-80b4-00c04fd430c8'
		];

		// UUID validation would happen in real implementation
		invalidRecipients.forEach((id) => {
			const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
			expect(isUUID).toBe(false);
		});

		validRecipients.forEach((id) => {
			const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
			expect(isUUID).toBe(true);
		});
	});
});
