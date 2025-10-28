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
	sendMessageResponseSchema
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
