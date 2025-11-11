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
 * Schema for deleting a notification
 * Used by both teacher and admin delete actions
 */
export const deleteNotificationSchema = z.object({
	notificationId: uuidSchema
});

// ============================================================================
// NOTIFICATION CREATION SCHEMAS
// ============================================================================

/**
 * Notification type schema
 * Based on NotificationType from notification types
 */
export const notificationTypeFormSchema = z.enum(['info', 'alert', 'announcement', 'reminder']);

/**
 * Notification priority schema
 * Based on NotificationPriority from notification types
 */
export const notificationPriorityFormSchema = z.enum(['normal', 'important', 'urgent']);

/**
 * Notification target type schema
 * Based on NotificationTargetType from notification types
 */
export const notificationTargetTypeFormSchema = z.enum(['all', 'roles', 'classes', 'users']);

/**
 * User role schema (for target_roles validation)
 */
export const userRoleFormSchema = z.enum(['student', 'teacher', 'admin']);

/**
 * Schema for creating a notification via form action
 *
 * This schema validates the FormData submitted from teacher/admin notification creation forms.
 * It ensures all required fields are present and properly typed before processing.
 *
 * **Security**: All inputs are validated before database insertion to prevent injection attacks.
 *
 * @example Teacher form validation
 * ```typescript
 * const formData = await request.formData();
 * const validation = createNotificationSchema.safeParse({
 *   title: formData.get('title'),
 *   message: formData.get('message'),
 *   type: formData.get('type'),
 *   // ... other fields
 * });
 * if (!validation.success) {
 *   return fail(400, { error: validation.error.issues[0].message });
 * }
 * ```
 */
export const createNotificationSchema = z.object({
	// Core fields
	title: z.string().min(1, 'Le titre est requis').max(200, 'Le titre est trop long (200 max)'),
	message: z
		.string()
		.min(1, 'Le message est requis')
		.max(5000, 'Le message est trop long (5000 max)'),
	type: notificationTypeFormSchema,
	priority: notificationPriorityFormSchema,
	targetType: notificationTargetTypeFormSchema,

	// Optional action fields
	actionLabel: z.string().max(100, "Le label d'action est trop long (100 max)").optional(),
	actionUrl: z
		.string()
		.url("L'URL d'action est invalide")
		.max(500, "L'URL est trop longue")
		.optional(),

	// Target fields (conditional - validated separately based on targetType)
	roles: z.array(userRoleFormSchema).optional(),
	classIds: z.array(uuidSchema).min(1, 'Sélectionnez au moins une classe').optional(),
	userIds: z.array(uuidSchema).min(1, 'Sélectionnez au moins un utilisateur').optional()
});

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
 * Unread notifications count response schema (GET /api/notifications/unread-count)
 */
export const unreadNotificationsCountResponseSchema = z.object({
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
