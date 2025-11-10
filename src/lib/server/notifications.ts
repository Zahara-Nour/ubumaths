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
			if (data.target_type === 'all' || data.target_type === 'roles') {
				return {
					success: false,
					error: 'Les professeurs ne peuvent cibler que leurs classes ou élèves'
				};
			}

			if (data.target_type === 'classes' && data.target_class_ids) {
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
 * System notifications bypass permission checks and are marked as is_system=true
 */
export async function createSystemNotification(
	supabase: SupabaseClientType,
	data: CreateSystemNotificationData
): Promise<{ success: boolean; error?: string }> {
	try {
		const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

		// SECURITY: Sanitize message HTML even for system notifications (defense-in-depth)
		// System messages are controlled by code, but sanitization adds an extra security layer
		// in case of bugs or future changes that introduce user-controlled content.
		const sanitizedMessage = sanitizeNotificationHtml(data.message);

		const { error: insertError } = await supabase.from('notifications').insert({
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
 * Get unread notifications for a user
 *
 * Returns notifications sorted by priority (urgent first) then date (newest first)
 */
export async function getUnreadNotifications(
	supabase: SupabaseClientType,
	userId: string
): Promise<NotificationWithDetails[]> {
	try {
		// Get user's role and classes
		const { data: profile } = await supabase
			.from('profiles')
			.select('role, class_ids')
			.eq('id', userId)
			.single();

		if (!profile) {
			return [];
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

		// Fetch notifications
		const { data: notifications, error } = await supabase
			.from('notifications')
			.select(
				`
				*,
				creator:profiles!created_by(firstname, lastname, full_name)
			`
			)
			.is('deleted_at', null)
			.gt('expires_at', new Date().toISOString())
			.or(conditions.join(','));

		if (error) {
			console.error('Error fetching notifications:', error);
			return [];
		}

		if (!notifications || notifications.length === 0) {
			return [];
		}

		// Get read status for all notifications
		const notificationIds = notifications.map((n) => n.id);
		const { data: reads } = await supabase
			.from('notification_reads')
			.select('notification_id, read_at')
			.eq('user_id', userId)
			.in('notification_id', notificationIds);

		const readMap = new Map(reads?.map((r) => [r.notification_id, r.read_at]) || []);

		// Filter to unread only and enrich
		const unreadNotifications: NotificationWithDetails[] = notifications
			.filter((n) => !readMap.has(n.id))
			.map((n) => ({
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

		// Sort by priority (urgent=2, important=1, normal=0) then date
		const priorityOrder: Record<string, number> = { urgent: 2, important: 1, normal: 0 };
		unreadNotifications.sort((a, b) => {
			const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
			if (priorityDiff !== 0) return priorityDiff;
			return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
		});

		return unreadNotifications;
	} catch (error) {
		console.error('Error in getUnreadNotifications:', error);
		return [];
	}
}

/**
 * Get count of unread notifications for a user
 */
export async function getUnreadCount(
	supabase: SupabaseClientType,
	userId: string
): Promise<number> {
	const notifications = await getUnreadNotifications(supabase, userId);
	return notifications.length;
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
		// Get all unread notification IDs
		const unreadNotifications = await getUnreadNotifications(supabase, userId);
		const notificationIds = unreadNotifications.map((n) => n.id);

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
			if (n.target_type === 'classes' && n.target_class_ids) {
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
			} else if (n.target_type === 'roles' && n.target_roles) {
				// Note: For role-based targeting, we'd need a separate cached count per role
				// For simplicity, using totalUsersCount as an approximation
				// In production, consider caching role counts separately
				totalRecipients = totalUsersCount || 0;
				targetSummary = n.target_roles.join(', ');
			} else if (n.target_type === 'classes' && n.target_class_ids) {
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
