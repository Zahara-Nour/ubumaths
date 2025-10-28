/**
 * Messaging system validation schemas
 */

import { z } from 'zod';

/**
 * Schema for sending a message
 */
export const sendMessageSchema = z.object({
	recipientIds: z.array(z.string().uuid()).max(100).optional(),
	subject: z
		.string()
		.trim()
		.min(1, 'Subject is required')
		.max(200, 'Subject too long (max 200 characters)'),
	content: z
		.string()
		.min(1, 'Content is required')
		.max(10000, 'Content too long (max 10,000 characters)'),
	isGroupMessage: z.boolean().default(false),
	classId: z.string().uuid().optional().nullable(),
	parentMessageId: z.string().uuid().optional().nullable()
});

/**
 * Schema for saving a message draft
 */
export const saveDraftSchema = z.object({
	id: z.string().uuid().optional(),
	subject: z.string().max(200).optional(),
	content: z.string().max(10000).optional(),
	recipientIds: z.array(z.string().uuid()).max(100).optional(),
	isGroupMessage: z.boolean().default(false),
	classId: z.string().uuid().optional().nullable(),
	replyingToMessageId: z.string().uuid().optional().nullable()
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Message recipient schema
 */
export const messageRecipientSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	email: z.string().email()
});

/**
 * Single message response schema
 */
export const messageResponseSchema = z.object({
	id: z.string().uuid(),
	sender_id: z.string().uuid(),
	sender_name: z.string(),
	sender_email: z.string().email(),
	subject: z.string(),
	content: z.string(),
	is_group_message: z.boolean(),
	class_id: z.string().uuid().nullable().optional(),
	parent_message_id: z.string().uuid().nullable().optional(),
	created_at: z.string().datetime(),
	read: z.boolean().optional()
});

/**
 * Message inbox response schema (GET /api/messages/inbox)
 */
export const inboxMessagesResponseSchema = z.object({
	messages: z.array(messageResponseSchema),
	total: z.number().int().nonnegative().optional()
});

/**
 * Sent messages response schema (GET /api/messages/sent)
 */
export const sentMessagesResponseSchema = z.object({
	messages: z.array(messageResponseSchema),
	total: z.number().int().nonnegative().optional()
});

/**
 * Message thread response schema (GET /api/messages/thread)
 */
export const messageThreadResponseSchema = z.object({
	messages: z.array(messageResponseSchema)
});

/**
 * Message detail response schema (GET /api/messages/[id])
 */
export const messageDetailResponseSchema = z.object({
	message: messageResponseSchema
});

/**
 * Send message response schema (POST /api/messages/send)
 */
export const sendMessageResponseSchema = z.object({
	success: z.literal(true),
	message_id: z.string().uuid(),
	recipients_count: z.number().int().positive()
});

/**
 * Draft schema
 */
export const draftResponseSchema = z.object({
	id: z.string().uuid(),
	subject: z.string().nullable().optional(),
	content: z.string().nullable().optional(),
	recipient_ids: z.array(z.string().uuid()).nullable().optional(),
	is_group_message: z.boolean(),
	class_id: z.string().uuid().nullable().optional(),
	replying_to_message_id: z.string().uuid().nullable().optional(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime()
});

/**
 * Drafts list response schema (GET /api/messages/drafts)
 */
export const draftsListResponseSchema = z.object({
	drafts: z.array(draftResponseSchema)
});

/**
 * Save draft response schema (POST /api/messages/drafts)
 */
export const saveDraftResponseSchema = z.object({
	success: z.literal(true),
	draft_id: z.string().uuid()
});

/**
 * Recipients list response schema (GET /api/messages/recipients)
 */
export const recipientsListResponseSchema = z.object({
	recipients: z.array(messageRecipientSchema)
});

/**
 * Unread count response schema (GET /api/messages/unread-count)
 */
export const unreadCountResponseSchema = z.object({
	count: z.number().int().nonnegative()
});

/**
 * Search messages response schema (GET /api/messages/search)
 */
export const searchMessagesResponseSchema = z.object({
	messages: z.array(messageResponseSchema),
	total: z.number().int().nonnegative()
});
