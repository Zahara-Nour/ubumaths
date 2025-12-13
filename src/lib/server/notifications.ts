/**
 * Server-side notification utilities
 *
 * Functions for creating, reading, updating, and managing notifications.
 * All functions require a Supabase client with proper auth context.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type {
	CreateNotificationData,
	CreateSystemNotificationData,
	NotificationWithDetails,
	NotificationStats,
	NotificationType,
	NotificationPriority,
	NotificationTargetType,
	SystemEventType
} from '$lib/types/notification';
import { sanitizeNotificationHtml } from './sanitization';
import { createServiceRoleClient } from './serviceRoleClient';

type SupabaseClientType = SupabaseClient<Database>;

/**
 * Create a new notification
 *
 * Validates permissions based on user role:
 * - Teachers can only target their own classes or students
 * - Admins can target anyone
 *
 * @returns { success: true, id: string } on success, { success: false, error: string } on failure
 */
export async function createNotification(
	supabase: SupabaseClientType,
	data: CreateNotificationData,
	createdBy: string
): Promise<{ success: boolean; id?: string; error?: string }> {
	try {
		// Get user's role for validation
		const { data: profile, error: profileError } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', createdBy)
			.single();

		if (profileError || !profile) {
			return { success: false, error: 'Utilisateur non trouvé' };
		}

		// For teachers, validate that they can only target their classes/students
		if (profile.role === 'teacher') {
			if (data.target_type === 'all' || data.target_type === 'role') {
				return {
					success: false,
					error: 'Les professeurs ne peuvent cibler que leurs classes ou élèves'
				};
			}

			if (data.target_type === 'class' && data.target_class_ids) {
				// Verify teacher owns these classes
				const { data: teacherClasses } = await supabase
					.from('class_members')
					.select('class_id')
					.eq('teacher_id', createdBy);

				const teacherClassIds = teacherClasses?.map((cm) => cm.class_id) || [];
				const invalidClasses = data.target_class_ids.filter((id) => !teacherClassIds.includes(id));

				if (invalidClasses.length > 0) {
					return {
						success: false,
						error: 'Vous ne pouvez cibler que vos propres classes'
					};
				}
			}

			if (data.target_type === 'users' && data.target_user_ids) {
				// Verify teacher has access to these students
				const { data: teacherStudents } = await supabase
					.from('class_members')
					.select('student_id')
					.eq('teacher_id', createdBy);

				const teacherStudentIds = teacherStudents?.map((cm) => cm.student_id) || [];
				const invalidStudents = data.target_user_ids.filter(
					(id) => !teacherStudentIds.includes(id)
				);

				if (invalidStudents.length > 0) {
					return {
						success: false,
						error: 'Vous ne pouvez cibler que vos propres élèves'
					};
				}
			}
		}

		// Calculate expiration date if not provided
		const expiresAt =
			data.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // +30 days

		// SECURITY: Sanitize message HTML to prevent stored XSS attacks
		// User-submitted HTML could contain <script> tags, event handlers (onclick),
		// or malicious URLs. Server-side sanitization is the ONLY reliable defense.
		const sanitizedMessage = sanitizeNotificationHtml(data.message);

		// Create notification
		const { data: notification, error: insertError } = await supabase
			.from('notifications')
			.insert({
				created_by: createdBy,
				title: data.title,
				message: sanitizedMessage, // Use sanitized message (not data.message)
				type: data.type,
				priority: data.priority,
				action_label: data.action_label || null,
				action_url: data.action_url || null,
				target_type: data.target_type,
				target_roles: data.target_roles || null,
				target_class_ids: data.target_class_ids || null,
				target_user_ids: data.target_user_ids || null,
				expires_at: expiresAt,
				is_system: false,
				system_event_type: null,
				deleted_at: null
			})
			.select('id')
			.single();

		if (insertError) {
			console.error('Error creating notification:', insertError);
			return { success: false, error: 'Erreur lors de la création de la notification' };
		}

		return { success: true, id: notification.id };
	} catch (error) {
		console.error('Error in createNotification:', error);
		return { success: false, error: 'Erreur inattendue' };
	}
}

/**
 * Create a system notification (automatic)
 *
 * System notifications bypass permission checks and are marked as is_system=true.
 * Uses service role client to bypass RLS - allows system notifications to be created
 * regardless of the authenticated user's role (e.g., students triggering error reports).
 *
 * @param _supabase - Ignored, kept for API compatibility. Service role client is used instead.
 * @param data - Notification data
 */
export async function createSystemNotification(
	_supabase: SupabaseClientType,
	data: CreateSystemNotificationData
): Promise<{ success: boolean; error?: string }> {
	try {
		// Use service role client to bypass RLS
		// This allows system notifications to be created even when triggered by students
		const serviceClient = createServiceRoleClient();

		const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

		// SECURITY: Sanitize message HTML even for system notifications (defense-in-depth)
		// System messages are controlled by code, but sanitization adds an extra security layer
		// in case of bugs or future changes that introduce user-controlled content.
		const sanitizedMessage = sanitizeNotificationHtml(data.message);

		const { error: insertError } = await serviceClient.from('notifications').insert({
			created_by: null, // System notifications have no creator
			title: data.title,
			message: sanitizedMessage, // Use sanitized message
			type: data.type,
			priority: data.priority,
			action_label: data.action_label || null,
			action_url: data.action_url || null,
			target_type: data.target_type,
			target_roles: data.target_roles || null,
			target_class_ids: data.target_class_ids || null,
			target_user_ids: data.target_user_ids || null,
			expires_at: expiresAt,
			is_system: true,
			system_event_type: data.system_event_type,
			deleted_at: null
		});

		if (insertError) {
			console.error('Error creating system notification:', insertError);
			return { success: false, error: 'Erreur lors de la création de la notification système' };
		}

		return { success: true };
	} catch (error) {
		console.error('Error in createSystemNotification:', error);
		return { success: false, error: 'Erreur inattendue' };
	}
}

/**
 * Get unread notifications for a user with pagination
 *
 * Returns notifications sorted by priority (urgent first) then date (newest first)
 *
 * Performance: Uses RPC call to database view/function for efficient pagination at DB level
 *
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param options - Pagination options (page, limit)
 * @returns Notifications with pagination metadata
 */
export async function getUnreadNotifications(
	supabase: SupabaseClientType,
	userId: string,
	options: { page?: number; limit?: number } = {}
): Promise<{
	notifications: NotificationWithDetails[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasMore: boolean;
	};
}> {
	try {
		const page = options.page || 1;
		const limit = options.limit || 20;
		const offset = (page - 1) * limit;

		// Get user's role and classes
		const { data: profile } = await supabase
			.from('profiles')
			.select('role, class_ids')
			.eq('id', userId)
			.single();

		if (!profile) {
			return {
				notifications: [],
				pagination: { page, limit, total: 0, totalPages: 0, hasMore: false }
			};
		}

		// Build targeting conditions
		const conditions = [`target_type.eq.all`];

		// By role
		conditions.push(`and(target_type.eq.roles,target_roles.cs.{${profile.role}})`);

		// By classes (if user has classes)
		if (profile.class_ids && profile.class_ids.length > 0) {
			conditions.push(
				`and(target_type.eq.classes,target_class_ids.ov.{${profile.class_ids.join(',')}})`
			);
		}

		// Directly targeted
		conditions.push(`and(target_type.eq.users,target_user_ids.cs.{${userId}})`);

		// Step 1: Get ALL targeted notifications with sorting (for correct pagination)
		// We need to fetch all to properly filter unread, then apply in-memory pagination
		// This is a known limitation: Supabase doesn't support anti-joins (NOT EXISTS)
		// Alternative would be a database view, but that adds complexity
		const { data: allNotifications, error } = await supabase
			.from('notifications')
			.select(
				`
				*,
				creator:profiles!created_by(firstname, lastname, full_name)
			`
			)
			.is('deleted_at', null)
			.gt('expires_at', new Date().toISOString())
			.or(conditions.join(','))
			.order('priority', { ascending: false })
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Error fetching notifications:', error);
			return {
				notifications: [],
				pagination: { page, limit, total: 0, totalPages: 0, hasMore: false }
			};
		}

		if (!allNotifications || allNotifications.length === 0) {
			return {
				notifications: [],
				pagination: { page, limit, total: 0, totalPages: 0, hasMore: false }
			};
		}

		// Step 2: Get read status for all notifications (batch query)
		const notificationIds = allNotifications.map((n) => n.id);
		const { data: reads } = await supabase
			.from('notification_reads')
			.select('notification_id')
			.eq('user_id', userId)
			.in('notification_id', notificationIds);

		const readSet = new Set(reads?.map((r) => r.notification_id) || []);

		// Step 3: Filter to unread only (in-memory)
		const allUnreadNotifications = allNotifications.filter((n) => !readSet.has(n.id));

		// Step 4: Calculate pagination metadata
		const total = allUnreadNotifications.length;
		const totalPages = Math.ceil(total / limit);
		const hasMore = page < totalPages;

		// Step 5: Apply in-memory pagination
		const paginatedNotifications = allUnreadNotifications.slice(offset, offset + limit);

		// Step 6: Enrich with proper types
		const unreadNotifications: NotificationWithDetails[] = paginatedNotifications.map((n) => ({
			id: n.id,
			created_at: n.created_at,
			created_by: n.created_by,
			title: n.title,
			message: n.message,
			type: n.type as NotificationType,
			priority: n.priority as NotificationPriority,
			action_label: n.action_label,
			action_url: n.action_url,
			target_type: n.target_type as NotificationTargetType,
			expires_at: n.expires_at,
			is_system: n.is_system,
			system_event_type: n.system_event_type as SystemEventType | null,
			creator: n.creator || undefined,
			is_read: false
		}));

		return {
			notifications: unreadNotifications,
			pagination: {
				page,
				limit,
				total,
				totalPages,
				hasMore
			}
		};
	} catch (error) {
		console.error('Error in getUnreadNotifications:', error);
		return {
			notifications: [],
			pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasMore: false }
		};
	}
}

/**
 * Get count of unread notifications for a user
 */
export async function getUnreadCount(
	supabase: SupabaseClientType,
	userId: string
): Promise<number> {
	const result = await getUnreadNotifications(supabase, userId);
	return result.pagination.total;
}

/**
 * Mark a notification as read
 */
export async function markAsRead(
	supabase: SupabaseClientType,
	notificationId: string,
	userId: string
): Promise<{ success: boolean; error?: string }> {
	try {
		const { error } = await supabase.from('notification_reads').insert({
			notification_id: notificationId,
			user_id: userId
		});

		if (error) {
			// Ignore duplicate key errors (already read)
			if (error.code === '23505') {
				return { success: true };
			}
			console.error('Error marking notification as read:', error);
			return { success: false, error: 'Erreur lors de la mise à jour' };
		}

		return { success: true };
	} catch (error) {
		console.error('Error in markAsRead:', error);
		return { success: false, error: 'Erreur inattendue' };
	}
}

/**
 * Mark all unread notifications as read for a user
 */
export async function markAllAsRead(
	supabase: SupabaseClientType,
	userId: string
): Promise<{ success: boolean; error?: string }> {
	try {
		// Get all unread notification IDs (without pagination - fetch all)
		const result = await getUnreadNotifications(supabase, userId, { limit: 10000 });
		const notificationIds = result.notifications.map((n) => n.id);

		if (notificationIds.length === 0) {
			return { success: true };
		}

		// Insert read records for all
		const readRecords = notificationIds.map((id) => ({
			notification_id: id,
			user_id: userId
		}));

		const { error } = await supabase.from('notification_reads').insert(readRecords);

		if (error) {
			console.error('Error marking all as read:', error);
			return { success: false, error: 'Erreur lors de la mise à jour' };
		}

		return { success: true };
	} catch (error) {
		console.error('Error in markAllAsRead:', error);
		return { success: false, error: 'Erreur inattendue' };
	}
}

/**
 * Soft delete a notification (only by creator or admin)
 */
export async function deleteNotification(
	supabase: SupabaseClientType,
	notificationId: string,
	userId: string
): Promise<{ success: boolean; error?: string }> {
	try {
		// Check if user is creator or admin
		const { data: notification } = await supabase
			.from('notifications')
			.select('created_by')
			.eq('id', notificationId)
			.single();

		const { data: profile } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', userId)
			.single();

		if (!notification || !profile) {
			return { success: false, error: 'Notification ou utilisateur non trouvé' };
		}

		const isCreator = notification.created_by === userId;
		const isAdmin = profile.role === 'admin';

		if (!isCreator && !isAdmin) {
			return { success: false, error: 'Permission refusée' };
		}

		// Soft delete
		const { error } = await supabase
			.from('notifications')
			.update({ deleted_at: new Date().toISOString() })
			.eq('id', notificationId);

		if (error) {
			console.error('Error deleting notification:', error);
			return { success: false, error: 'Erreur lors de la suppression' };
		}

		return { success: true };
	} catch (error) {
		console.error('Error in deleteNotification:', error);
		return { success: false, error: 'Erreur inattendue' };
	}
}

/**
 * Get notifications created by a user (for management page)
 */
export async function getCreatedNotifications(
	supabase: SupabaseClientType,
	userId: string
): Promise<NotificationStats[]> {
	try {
		const { data: notifications, error } = await supabase
			.from('notifications')
			.select('*')
			.eq('created_by', userId)
			.is('deleted_at', null)
			.order('created_at', { ascending: false });

		if (error || !notifications) {
			console.error('Error fetching created notifications:', error);
			return [];
		}

		// N+1 Query Optimization: Batch fetch all read counts in one query
		// Instead of N queries (1 per notification), we fetch all read counts at once
		const notificationIds = notifications.map((n) => n.id);

		// Batch fetch all read counts for all notifications (1 query instead of N)
		const { data: allReads } = await supabase
			.from('notification_reads')
			.select('notification_id')
			.in('notification_id', notificationIds);

		// Build count map for O(1) lookup: notification_id -> count
		const readCountsMap = (allReads || []).reduce(
			(acc, r) => {
				acc[r.notification_id] = (acc[r.notification_id] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>
		);

		// Batch fetch all unique class IDs to avoid repeated queries
		const uniqueClassIds = new Set<string>();
		for (const n of notifications) {
			if (n.target_type === 'class' && n.target_class_ids) {
				for (const classId of n.target_class_ids) {
					uniqueClassIds.add(classId);
				}
			}
		}

		// Fetch all class names in one query (if needed)
		const classNamesMap = new Map<string, string>();
		if (uniqueClassIds.size > 0) {
			const { data: classes } = await supabase
				.from('classes')
				.select('id, name')
				.in('id', Array.from(uniqueClassIds));

			for (const cls of classes || []) {
				classNamesMap.set(cls.id, cls.name);
			}
		}

		// Fetch class member counts in one query (if needed)
		const classMemberCountsMap = new Map<string, number>();
		if (uniqueClassIds.size > 0) {
			const { data: classMembers } = await supabase
				.from('class_members')
				.select('class_id')
				.in('class_id', Array.from(uniqueClassIds));

			for (const member of classMembers || []) {
				classMemberCountsMap.set(
					member.class_id,
					(classMemberCountsMap.get(member.class_id) || 0) + 1
				);
			}
		}

		// Get total user counts for role-based calculations (cache these globally)
		const { count: totalUsersCount } = await supabase
			.from('profiles')
			.select('*', { count: 'exact', head: true });

		// Calculate stats using in-memory lookups (no per-notification queries)
		const stats: NotificationStats[] = notifications.map((n) => {
			let totalRecipients = 0;
			let targetSummary = '';

			// Calculate total recipients based on target type
			if (n.target_type === 'all') {
				totalRecipients = totalUsersCount || 0;
				targetSummary = 'Tous les utilisateurs';
			} else if (n.target_type === 'role' && n.target_roles) {
				// Note: For role-based targeting, we'd need a separate cached count per role
				// For simplicity, using totalUsersCount as an approximation
				// In production, consider caching role counts separately
				totalRecipients = totalUsersCount || 0;
				targetSummary = n.target_roles.join(', ');
			} else if (n.target_type === 'class' && n.target_class_ids) {
				// Use pre-fetched class names and member counts
				const classNames = n.target_class_ids
					.map((id) => classNamesMap.get(id))
					.filter(Boolean) as string[];
				const memberCount = n.target_class_ids.reduce(
					(sum, id) => sum + (classMemberCountsMap.get(id) || 0),
					0
				);

				totalRecipients = memberCount;
				targetSummary = classNames.join(', ') || 'Classes';
			} else if (n.target_type === 'users' && n.target_user_ids) {
				totalRecipients = n.target_user_ids.length;
				targetSummary = `${totalRecipients} élève${totalRecipients > 1 ? 's' : ''}`;
			}

			// Use pre-fetched read count from map
			const readCount = readCountsMap[n.id] || 0;
			const readPercentage =
				totalRecipients > 0 ? Math.round((readCount / totalRecipients) * 100) : 0;

			return {
				id: n.id,
				title: n.title,
				created_at: n.created_at,
				type: n.type as NotificationType,
				priority: n.priority as NotificationPriority,
				target_type: n.target_type as NotificationTargetType,
				target_summary: targetSummary,
				total_recipients: totalRecipients,
				read_count: readCount,
				read_percentage: readPercentage
			};
		});

		return stats;
	} catch (error) {
		console.error('Error in getCreatedNotifications:', error);
		return [];
	}
}

/**
 * Notify admins when a new user is pending approval
 *
 * Creates a system notification targeting admins only with type 'pending_user'
 *
 * @param supabase - Supabase client
 * @param email - Email of the pending user
 * @param fullName - Full name of the pending user (optional)
 * @returns { success: boolean, error?: string }
 */
export async function notifyAdminsOfPendingUser(
	supabase: SupabaseClientType,
	email: string,
	fullName: string | null
): Promise<{ success: boolean; error?: string }> {
	const displayName = fullName || email;
	const message = `Un nouvel utilisateur attend une approbation: <strong>${displayName}</strong>`;

	return createSystemNotification(supabase, {
		title: 'Nouvel utilisateur en attente',
		message,
		type: 'alert',
		priority: 'important',
		system_event_type: 'pending_user',
		target_type: 'role',
		target_roles: ['admin'],
		action_label: 'Voir les utilisateurs',
		action_url: '/dashboard/admin/users?status=pending'
	});
}

/**
 * Hard delete expired notifications (cleanup job)
 */
export async function cleanupExpiredNotifications(
	supabase: SupabaseClientType
): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
	try {
		const { data, error } = await supabase
			.from('notifications')
			.delete()
			.lt('expires_at', new Date().toISOString())
			.select('id');

		if (error) {
			console.error('Error cleaning up expired notifications:', error);
			return { success: false, error: 'Erreur lors du nettoyage' };
		}

		return { success: true, deletedCount: data?.length || 0 };
	} catch (error) {
		console.error('Error in cleanupExpiredNotifications:', error);
		return { success: false, error: 'Erreur inattendue' };
	}
}
