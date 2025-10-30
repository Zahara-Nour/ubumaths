/**
 * Tests for rewards, messages, and notifications validation schemas
 */

import { describe, it, expect } from 'vitest';

// Rewards
import { awardGidouillesSchema } from './rewards';

// Messages
import {
	sendMessageSchema,
	saveDraftSchema,
	messageResponseSchema,
	sendMessageResponseSchema,
	searchMessagesQuerySchema,
	updateMessageSchema,
	inboxMessagesQuerySchema,
	sentMessagesQuerySchema,
	threadMessagesQuerySchema
} from './messages';

// Notifications
import {
	markNotificationReadSchema,
	markAllReadSchema,
	listNotificationsQuerySchema,
	notificationTypeSchema,
	notificationResponseSchema,
	unreadCountResponseSchema
} from './notifications';

describe('rewards, messages, notifications validation schemas', () => {
	// ============================================================================
	// REWARDS VALIDATION
	// ============================================================================

	describe('awardGidouillesSchema', () => {
		it('should accept valid gidouilles award', () => {
			const data = {
				studentId: '550e8400-e29b-41d4-a716-446655440000',
				amount: 50
			};

			const result = awardGidouillesSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject invalid student ID', () => {
			const data = {
				studentId: 'not-a-uuid',
				amount: 50
			};

			const result = awardGidouillesSchema.safeParse(data);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('Invalid student ID');
			}
		});

		it('should reject negative amount', () => {
			const data = {
				studentId: '550e8400-e29b-41d4-a716-446655440000',
				amount: -10
			};

			const result = awardGidouillesSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject zero amount', () => {
			const data = {
				studentId: '550e8400-e29b-41d4-a716-446655440000',
				amount: 0
			};

			const result = awardGidouillesSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject amount exceeding max', () => {
			const data = {
				studentId: '550e8400-e29b-41d4-a716-446655440000',
				amount: 1001
			};

			const result = awardGidouillesSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject decimal amount', () => {
			const data = {
				studentId: '550e8400-e29b-41d4-a716-446655440000',
				amount: 50.5
			};

			const result = awardGidouillesSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject infinite amount', () => {
			const data = {
				studentId: '550e8400-e29b-41d4-a716-446655440000',
				amount: Infinity
			};

			const result = awardGidouillesSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	// ============================================================================
	// MESSAGES VALIDATION
	// ============================================================================

	describe('sendMessageSchema', () => {
		it('should accept valid message', () => {
			const data = {
				recipientIds: [
					'550e8400-e29b-41d4-a716-446655440000',
					'6ba7b810-9dad-11d1-80b4-00c04fd430c8'
				],
				subject: 'Important Update',
				content: 'This is the message content.',
				isGroupMessage: false,
				classId: null,
				parentMessageId: null
			};

			const result = sendMessageSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should use default isGroupMessage', () => {
			const data = {
				subject: 'Test',
				content: 'Content'
			};

			const result = sendMessageSchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.isGroupMessage).toBe(false);
			}
		});

		it('should accept group message with classId', () => {
			const data = {
				subject: 'Class Announcement',
				content: 'Message to entire class',
				isGroupMessage: true,
				classId: '550e8400-e29b-41d4-a716-446655440000'
			};

			const result = sendMessageSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept reply with parentMessageId', () => {
			const data = {
				recipientIds: ['550e8400-e29b-41d4-a716-446655440000'],
				subject: 'Re: Original Subject',
				content: 'Reply content',
				parentMessageId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
			};

			const result = sendMessageSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject empty subject', () => {
			const data = {
				subject: '   ',
				content: 'Content'
			};

			const result = sendMessageSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject subject exceeding max length', () => {
			const data = {
				subject: 'a'.repeat(201),
				content: 'Content'
			};

			const result = sendMessageSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject empty content', () => {
			const data = {
				subject: 'Subject',
				content: ''
			};

			const result = sendMessageSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject content exceeding max length', () => {
			const data = {
				subject: 'Subject',
				content: 'a'.repeat(10001)
			};

			const result = sendMessageSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject too many recipients', () => {
			const data = {
				recipientIds: Array.from(
					{ length: 101 },
					(_, i) => `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, '0')}`
				),
				subject: 'Subject',
				content: 'Content'
			};

			const result = sendMessageSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid recipient UUID', () => {
			const data = {
				recipientIds: ['not-a-uuid'],
				subject: 'Subject',
				content: 'Content'
			};

			const result = sendMessageSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('saveDraftSchema', () => {
		it('should accept complete draft', () => {
			const data = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				subject: 'Draft Subject',
				content: 'Draft content',
				recipientIds: ['6ba7b810-9dad-11d1-80b4-00c04fd430c8'],
				isGroupMessage: false,
				classId: null,
				replyingToMessageId: null
			};

			const result = saveDraftSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept minimal draft', () => {
			const data = {};

			const result = saveDraftSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept partial draft', () => {
			const data = {
				subject: 'Partial Draft',
				content: 'Some content'
			};

			const result = saveDraftSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject subject exceeding max length', () => {
			const data = {
				subject: 'a'.repeat(201)
			};

			const result = saveDraftSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject content exceeding max length', () => {
			const data = {
				content: 'a'.repeat(10001)
			};

			const result = saveDraftSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('messageResponseSchema', () => {
		it('should accept valid message response', () => {
			const data = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				sender_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
				sender_name: 'John Doe',
				sender_email: 'john@example.com',
				subject: 'Test Message',
				content: 'Message content',
				is_group_message: false,
				class_id: null,
				parent_message_id: null,
				created_at: '2025-01-01T00:00:00Z',
				read: false
			};

			const result = messageResponseSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject invalid email', () => {
			const data = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				sender_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
				sender_name: 'John',
				sender_email: 'not-an-email',
				subject: 'Test',
				content: 'Content',
				is_group_message: false,
				created_at: '2025-01-01T00:00:00Z'
			};

			const result = messageResponseSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('sendMessageResponseSchema', () => {
		it('should accept valid send response', () => {
			const data = {
				success: true,
				message_id: '550e8400-e29b-41d4-a716-446655440000',
				recipients_count: 5
			};

			const result = sendMessageResponseSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject success: false', () => {
			const data = {
				success: false,
				message_id: '550e8400-e29b-41d4-a716-446655440000',
				recipients_count: 5
			};

			const result = sendMessageResponseSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject zero recipients_count', () => {
			const data = {
				success: true,
				message_id: '550e8400-e29b-41d4-a716-446655440000',
				recipients_count: 0
			};

			const result = sendMessageResponseSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('searchMessagesQuerySchema', () => {
		it('should accept valid search query', () => {
			const data = {
				q: 'important meeting',
				searchIn: 'inbox',
				hasAttachments: 'true',
				senderName: 'John Doe',
				dateFrom: '2025-01-01T00:00:00Z',
				dateTo: '2025-12-31T23:59:59Z',
				limit: 50,
				offset: 0
			};

			const result = searchMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should use default values', () => {
			const data = {
				q: 'test'
			};

			const result = searchMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.searchIn).toBe('all');
				expect(result.data.limit).toBe(50);
				expect(result.data.offset).toBe(0);
			}
		});

		it('should accept all searchIn values', () => {
			['inbox', 'sent', 'all'].forEach((searchIn) => {
				const data = {
					q: 'test',
					searchIn
				};

				const result = searchMessagesQuerySchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});

		it('should transform hasAttachments string to boolean', () => {
			const testCases = [
				{ input: 'true', expected: true },
				{ input: 'false', expected: false },
				{ input: 'invalid', expected: undefined }
			];

			testCases.forEach(({ input, expected }) => {
				const data = {
					q: 'test',
					hasAttachments: input
				};

				const result = searchMessagesQuerySchema.safeParse(data);
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.hasAttachments).toBe(expected);
				}
			});
		});

		it('should coerce limit to number', () => {
			const data = {
				q: 'test',
				limit: '25'
			};

			const result = searchMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.limit).toBe(25);
				expect(typeof result.data.limit).toBe('number');
			}
		});

		it('should coerce offset to number', () => {
			const data = {
				q: 'test',
				offset: '10'
			};

			const result = searchMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.offset).toBe(10);
				expect(typeof result.data.offset).toBe('number');
			}
		});

		it('should reject empty query', () => {
			const data = {
				q: '   '
			};

			const result = searchMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject query exceeding max length', () => {
			const data = {
				q: 'a'.repeat(201)
			};

			const result = searchMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid searchIn value', () => {
			const data = {
				q: 'test',
				searchIn: 'invalid'
			};

			const result = searchMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject senderName exceeding max length', () => {
			const data = {
				q: 'test',
				senderName: 'a'.repeat(201)
			};

			const result = searchMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid dateFrom format', () => {
			const data = {
				q: 'test',
				dateFrom: '2025-01-01' // Missing time
			};

			const result = searchMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid dateTo format', () => {
			const data = {
				q: 'test',
				dateTo: 'invalid-date'
			};

			const result = searchMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject limit exceeding max', () => {
			const data = {
				q: 'test',
				limit: 101
			};

			const result = searchMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject negative offset', () => {
			const data = {
				q: 'test',
				offset: -5
			};

			const result = searchMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should accept optional fields as undefined', () => {
			const data = {
				q: 'test',
				searchIn: undefined,
				hasAttachments: undefined,
				senderName: undefined,
				dateFrom: undefined,
				dateTo: undefined
			};

			const result = searchMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
		});
	});

	describe('updateMessageSchema', () => {
		it('should accept updateStatus action with status', () => {
			const data = {
				action: 'updateStatus',
				status: 'archived'
			};

			const result = updateMessageSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept all status values', () => {
			['inbox', 'archived', 'trash'].forEach((status) => {
				const data = {
					action: 'updateStatus',
					status
				};

				const result = updateMessageSchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});

		it('should accept toggleRead action without additional fields', () => {
			const data = {
				action: 'toggleRead'
			};

			const result = updateMessageSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept toggleStar action without additional fields', () => {
			const data = {
				action: 'toggleStar'
			};

			const result = updateMessageSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept moveToFolder action with folderId', () => {
			const data = {
				action: 'moveToFolder',
				folderId: '550e8400-e29b-41d4-a716-446655440000'
			};

			const result = updateMessageSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject updateStatus without status', () => {
			const data = {
				action: 'updateStatus'
			};

			const result = updateMessageSchema.safeParse(data);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('Champs requis manquants');
			}
		});

		it('should reject moveToFolder without folderId', () => {
			const data = {
				action: 'moveToFolder'
			};

			const result = updateMessageSchema.safeParse(data);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('Champs requis manquants');
			}
		});

		it('should reject invalid action', () => {
			const data = {
				action: 'invalid'
			};

			const result = updateMessageSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid status', () => {
			const data = {
				action: 'updateStatus',
				status: 'invalid'
			};

			const result = updateMessageSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid folderId UUID', () => {
			const data = {
				action: 'moveToFolder',
				folderId: 'not-a-uuid'
			};

			const result = updateMessageSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should allow updateStatus with extra folderId (ignored)', () => {
			const data = {
				action: 'updateStatus',
				status: 'inbox',
				folderId: '550e8400-e29b-41d4-a716-446655440000'
			};

			const result = updateMessageSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should allow moveToFolder with extra status (ignored)', () => {
			const data = {
				action: 'moveToFolder',
				folderId: '550e8400-e29b-41d4-a716-446655440000',
				status: 'inbox'
			};

			const result = updateMessageSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should validate refine logic for all actions', () => {
			const testCases = [
				{ action: 'updateStatus', status: 'inbox', shouldPass: true },
				{ action: 'updateStatus', shouldPass: false }, // Missing status
				{
					action: 'moveToFolder',
					folderId: '550e8400-e29b-41d4-a716-446655440000',
					shouldPass: true
				},
				{ action: 'moveToFolder', shouldPass: false }, // Missing folderId
				{ action: 'toggleRead', shouldPass: true },
				{ action: 'toggleStar', shouldPass: true }
			];

			testCases.forEach(({ action, shouldPass, ...rest }) => {
				const data = { action, ...rest };
				const result = updateMessageSchema.safeParse(data);
				expect(result.success).toBe(shouldPass);
			});
		});
	});

	describe('inboxMessagesQuerySchema', () => {
		it('should accept valid query with all parameters', () => {
			const data = {
				status: 'inbox',
				folderId: '550e8400-e29b-41d4-a716-446655440000',
				limit: 25,
				offset: 10
			};

			const result = inboxMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.status).toBe('inbox');
				expect(result.data.limit).toBe(25);
				expect(result.data.offset).toBe(10);
			}
		});

		it('should use default values', () => {
			const data = {};

			const result = inboxMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.status).toBe('inbox');
				expect(result.data.limit).toBe(50);
				expect(result.data.offset).toBe(0);
			}
		});

		it('should accept all valid status values', () => {
			const statuses = ['inbox', 'archived', 'trash'];
			statuses.forEach((status) => {
				const data = { status };
				const result = inboxMessagesQuerySchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});

		it('should reject invalid status values', () => {
			const invalidStatuses = ['sent', 'draft', 'invalid', ''];
			invalidStatuses.forEach((status) => {
				const data = { status };
				const result = inboxMessagesQuerySchema.safeParse(data);
				expect(result.success).toBe(false);
			});
		});

		it('should accept optional folderId UUID', () => {
			const data = {
				folderId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
			};

			const result = inboxMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.folderId).toBe('6ba7b810-9dad-11d1-80b4-00c04fd430c8');
			}
		});

		it('should reject invalid folderId UUID', () => {
			const data = {
				folderId: 'not-a-uuid'
			};

			const result = inboxMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should coerce limit to number', () => {
			const data = {
				limit: '30'
			};

			const result = inboxMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.limit).toBe(30);
				expect(typeof result.data.limit).toBe('number');
			}
		});

		it('should coerce offset to number', () => {
			const data = {
				offset: '20'
			};

			const result = inboxMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.offset).toBe(20);
				expect(typeof result.data.offset).toBe('number');
			}
		});

		it('should reject limit exceeding max (100)', () => {
			const data = {
				limit: 101
			};

			const result = inboxMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('Maximum 100 messages');
			}
		});

		it('should reject negative limit', () => {
			const data = {
				limit: -5
			};

			const result = inboxMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject negative offset', () => {
			const data = {
				offset: -10
			};

			const result = inboxMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject decimal limit', () => {
			const data = {
				limit: 25.5
			};

			const result = inboxMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject decimal offset', () => {
			const data = {
				offset: 10.5
			};

			const result = inboxMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('sentMessagesQuerySchema', () => {
		it('should accept valid pagination parameters', () => {
			const data = {
				limit: 30,
				offset: 15
			};

			const result = sentMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.limit).toBe(30);
				expect(result.data.offset).toBe(15);
			}
		});

		it('should use default values when not provided', () => {
			const data = {};

			const result = sentMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.limit).toBe(50);
				expect(result.data.offset).toBe(0);
			}
		});

		it('should coerce string limit to number', () => {
			const data = {
				limit: '20'
			};

			const result = sentMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.limit).toBe(20);
				expect(typeof result.data.limit).toBe('number');
			}
		});

		it('should coerce string offset to number', () => {
			const data = {
				offset: '10'
			};

			const result = sentMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.offset).toBe(10);
				expect(typeof result.data.offset).toBe('number');
			}
		});

		it('should reject limit exceeding max (100)', () => {
			const data = {
				limit: 101
			};

			const result = sentMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('Maximum 100 messages');
			}
		});

		it('should reject negative limit', () => {
			const data = {
				limit: -1
			};

			const result = sentMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject zero limit', () => {
			const data = {
				limit: 0
			};

			const result = sentMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject negative offset', () => {
			const data = {
				offset: -5
			};

			const result = sentMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject decimal limit', () => {
			const data = {
				limit: 50.7
			};

			const result = sentMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject decimal offset', () => {
			const data = {
				offset: 10.3
			};

			const result = sentMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should accept boundary value limit=1', () => {
			const data = {
				limit: 1
			};

			const result = sentMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept boundary value limit=100', () => {
			const data = {
				limit: 100
			};

			const result = sentMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject very large offset', () => {
			const data = {
				offset: Number.MAX_SAFE_INTEGER
			};

			const result = sentMessagesQuerySchema.safeParse(data);
			// Should still parse successfully (no max constraint on offset)
			expect(result.success).toBe(true);
		});
	});

	describe('threadMessagesQuerySchema', () => {
		it('should accept valid root message UUID', () => {
			const data = {
				rootId: '550e8400-e29b-41d4-a716-446655440000'
			};

			const result = threadMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.rootId).toBe('550e8400-e29b-41d4-a716-446655440000');
			}
		});

		it('should reject invalid UUID format', () => {
			const data = {
				rootId: 'not-a-uuid'
			};

			const result = threadMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('ID du message racine invalide');
			}
		});

		it('should reject empty string', () => {
			const data = {
				rootId: ''
			};

			const result = threadMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject missing rootId field', () => {
			const data = {};

			const result = threadMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject UUID with invalid characters', () => {
			const data = {
				rootId: '550e8400-e29b-41d4-a716-44665544000g'
			};

			const result = threadMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject UUID too short', () => {
			const data = {
				rootId: '550e8400-e29b-41d4-a716'
			};

			const result = threadMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject null rootId', () => {
			const data = {
				rootId: null
			};

			const result = threadMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject undefined rootId', () => {
			const data = {
				rootId: undefined
			};

			const result = threadMessagesQuerySchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should accept different valid UUID formats', () => {
			const validUuids = [
				'550e8400-e29b-41d4-a716-446655440000',
				'6ba7b810-9dad-11d1-80b4-00c04fd430c8',
				'00000000-0000-0000-0000-000000000000',
				'ffffffff-ffff-ffff-ffff-ffffffffffff'
			];

			validUuids.forEach((rootId) => {
				const data = { rootId };
				const result = threadMessagesQuerySchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});
	});

	// ============================================================================
	// NOTIFICATIONS VALIDATION
	// ============================================================================

	describe('markNotificationReadSchema', () => {
		it('should accept valid notification ID', () => {
			const data = {
				notificationId: '550e8400-e29b-41d4-a716-446655440000'
			};

			const result = markNotificationReadSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject invalid UUID', () => {
			const data = {
				notificationId: 'not-a-uuid'
			};

			const result = markNotificationReadSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('markAllReadSchema', () => {
		it('should accept empty object', () => {
			const result = markAllReadSchema.safeParse({});
			expect(result.success).toBe(true);
		});
	});

	describe('listNotificationsQuerySchema', () => {
		it('should accept valid query', () => {
			const data = {
				page: 2,
				limit: 25,
				unreadOnly: true
			};

			const result = listNotificationsQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should use defaults', () => {
			const result = listNotificationsQuerySchema.safeParse({});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.page).toBe(1);
				expect(result.data.limit).toBe(50);
				expect(result.data.unreadOnly).toBe(false);
			}
		});

		it('should coerce unreadOnly from string', () => {
			const data = {
				unreadOnly: 'true'
			};

			const result = listNotificationsQuerySchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.unreadOnly).toBe(true);
				expect(typeof result.data.unreadOnly).toBe('boolean');
			}
		});
	});

	describe('notificationTypeSchema', () => {
		it('should accept all valid notification types', () => {
			const validTypes = [
				'assessment_assigned',
				'assessment_graded',
				'exercise_assigned',
				'message_received',
				'reward_earned',
				'achievement_unlocked',
				'deadline_reminder',
				'system_announcement'
			];

			validTypes.forEach((type) => {
				const result = notificationTypeSchema.safeParse(type);
				expect(result.success).toBe(true);
			});
		});

		it('should reject invalid notification types', () => {
			const invalidTypes = ['invalid', 'unknown_type', ''];
			invalidTypes.forEach((type) => {
				const result = notificationTypeSchema.safeParse(type);
				expect(result.success).toBe(false);
			});
		});
	});

	describe('notificationResponseSchema', () => {
		it('should accept valid notification response', () => {
			const data = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				user_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
				type: 'assessment_assigned',
				title: 'New Assessment Available',
				message: 'A new math assessment has been assigned to you.',
				link: '/assessments/123',
				read: false,
				metadata: {
					assessment_id: '123',
					due_date: '2025-12-31'
				},
				created_at: '2025-01-01T00:00:00.000Z'
			};

			const result = notificationResponseSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept minimal notification', () => {
			const data = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				user_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
				type: 'system_announcement',
				title: 'Notice',
				message: 'System maintenance scheduled',
				link: null,
				read: true,
				metadata: null,
				created_at: '2025-01-01T00:00:00.000Z'
			};

			const result = notificationResponseSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject invalid type', () => {
			const data = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				user_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
				type: 'invalid_type',
				title: 'Title',
				message: 'Message',
				read: false,
				created_at: '2025-01-01T00:00:00.000Z'
			};

			const result = notificationResponseSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('unreadCountResponseSchema', () => {
		it('should accept valid count', () => {
			const data = {
				count: 42
			};

			const result = unreadCountResponseSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept zero count', () => {
			const data = {
				count: 0
			};

			const result = unreadCountResponseSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject negative count', () => {
			const data = {
				count: -5
			};

			const result = unreadCountResponseSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject decimal count', () => {
			const data = {
				count: 3.14
			};

			const result = unreadCountResponseSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});
});
