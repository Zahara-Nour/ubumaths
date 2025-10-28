/**
 * Notifications validation schemas
 */

import { z } from 'zod';
import { uuidSchema, paginationSchema } from './common';

/**
 * Schema for marking a single notification as read
 */
export const markNotificationReadSchema = z.object({
	notificationId: uuidSchema
});

/**
 * Schema for marking all notifications as read
 * No body required - uses session user ID
 */
export const markAllReadSchema = z.object({});

/**
 * Schema for listing notifications with pagination
 */
export const listNotificationsQuerySchema = paginationSchema.extend({
	unreadOnly: z.coerce.boolean().default(false)
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Notification type schema
 */
export const notificationTypeSchema = z.enum([
	'assessment_assigned',
	'assessment_graded',
	'exercise_assigned',
	'message_received',
	'reward_earned',
	'achievement_unlocked',
	'deadline_reminder',
	'system_announcement'
]);

/**
 * Single notification response schema
 */
export const notificationResponseSchema = z.object({
	id: z.string().uuid(),
	user_id: z.string().uuid(),
	type: notificationTypeSchema,
	title: z.string(),
	message: z.string(),
	link: z.string().nullable().optional(),
	read: z.boolean(),
	metadata: z.record(z.string(), z.any()).nullable().optional(),
	created_at: z.string().datetime()
});

/**
 * Notifications list response schema (GET /api/notifications)
 */
export const notificationsListResponseSchema = z.object({
	notifications: z.array(notificationResponseSchema),
	pagination: z
		.object({
			page: z.number().int().positive(),
			limit: z.number().int().positive(),
			total: z.number().int().nonnegative(),
			totalPages: z.number().int().nonnegative()
		})
		.optional()
});

/**
 * Unread notifications response schema (GET /api/notifications/unread)
 */
export const unreadNotificationsResponseSchema = z.object({
	notifications: z.array(notificationResponseSchema)
});

/**
 * Unread count response schema (GET /api/notifications/unread-count)
 */
export const unreadCountResponseSchema = z.object({
	count: z.number().int().nonnegative()
});

/**
 * Mark read response schema (POST /api/notifications/mark-read)
 */
export const markReadResponseSchema = z.object({
	success: z.literal(true),
	notification_id: z.string().uuid()
});

/**
 * Mark all read response schema (POST /api/notifications/mark-all-read)
 */
export const markAllReadResponseSchema = z.object({
	success: z.literal(true),
	marked_count: z.number().int().nonnegative()
});
