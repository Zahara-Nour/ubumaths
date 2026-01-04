/**
 * Notification Types
 *
 * Types for the notification system including notification creation,
 * enriched notification data, and statistics.
 */

import type { Tables } from './database';

// Base notification type from database
export type Notification = Tables<'notifications'>;

// Notification enums (matching database constraints)
export type NotificationType =
	| 'info'
	| 'warning'
	| 'success'
	| 'error'
	| 'alert'
	| 'announcement'
	| 'system'
	| 'reminder';

export type NotificationPriority = 'normal' | 'important' | 'urgent';

export type NotificationTargetType =
	| 'all'
	| 'role'
	| 'roles'
	| 'class'
	| 'classes'
	| 'user'
	| 'users';

export type SystemEventType =
	| 'maintenance'
	| 'maintenance_scheduled'
	| 'update'
	| 'security'
	| 'feature'
	| 'feature_released'
	| 'announcement'
	| 'reminder'
	// Student/User events
	| 'pending_user'
	| 'user_approved'
	| 'student_approved'
	// Assessment/Assignment events
	| 'assessment_assigned'
	| 'assessment_graded'
	| 'assignment_created'
	| 'resource_added'
	// Reward events
	| 'badge_unlocked'
	| 'reward_earned'
	| 'weekly_reward'
	| 'daily_summary'
	// Error/Bug events
	| 'bug_reported'
	| 'error_critical'
	| 'error_report_validated'
	| 'error_report_rejected';

/**
 * Data required to create a new notification
 */
export interface CreateNotificationData {
	title: string;
	message: string; // Rich text HTML
	type: NotificationType;
	priority: NotificationPriority;
	action_label?: string;
	action_url?: string;
	target_type: NotificationTargetType;
	target_roles?: string[];
	target_class_ids?: string[];
	target_user_ids?: string[];
	expires_at?: string; // ISO date string, defaults to +30 days
}

/**
 * Data for creating a system notification
 */
export interface CreateSystemNotificationData {
	title: string;
	message: string; // Can include HTML
	type: NotificationType;
	priority: NotificationPriority;
	system_event_type: SystemEventType;
	target_type: NotificationTargetType;
	target_roles?: string[];
	target_class_ids?: string[];
	target_user_ids?: string[];
	action_label?: string;
	action_url?: string;
}

/**
 * Enriched notification with creator info and read status
 * Used for displaying notifications in the UI
 */
export interface NotificationWithDetails {
	id: string;
	created_at: string;
	created_by: string | null;
	title: string;
	message: string;
	type: NotificationType;
	priority: NotificationPriority;
	action_label: string | null;
	action_url: string | null;
	target_type: NotificationTargetType;
	expires_at: string;
	is_system: boolean;
	system_event_type: SystemEventType | null;
	/** Optional JSON metadata for system notifications (e.g., daily_summary raw data) */
	metadata?: Record<string, unknown> | null;

	// Enriched fields
	creator?: {
		firstname: string | null;
		lastname: string | null;
		full_name?: string | null;
	};
	is_read: boolean;
	read_at?: string;
}

/**
 * Statistics for a notification (for management pages)
 */
export interface NotificationStats {
	id: string;
	title: string;
	created_at: string;
	type: NotificationType;
	priority: NotificationPriority;
	target_type: NotificationTargetType;
	target_summary: string; // e.g., "Classe 5A (24 élèves)" or "3 élèves"
	total_recipients: number; // Total number of potential recipients
	read_count: number; // Number of users who read it
	read_percentage: number; // Calculated: (read_count / total_recipients) * 100
}

/**
 * Unread notification count
 */
export interface UnreadCount {
	count: number;
	last_checked: string; // ISO timestamp
}

/**
 * Icon mapping for notification types
 */
export const NOTIFICATION_TYPE_ICONS: Record<NotificationType, string> = {
	info: '🔔',
	warning: '⚠️',
	success: '✅',
	error: '❌',
	alert: '⚠️',
	announcement: '📢',
	system: '⚙️',
	reminder: '⏰'
};

/**
 * Color classes for notification priorities
 */
export const NOTIFICATION_PRIORITY_COLORS: Record<
	NotificationPriority,
	{
		bg: string;
		border: string;
		text: string;
	}
> = {
	urgent: {
		bg: 'bg-red-50 dark:bg-red-950',
		border: 'border-red-200 dark:border-red-800',
		text: 'text-red-900 dark:text-red-100'
	},
	important: {
		bg: 'bg-orange-50 dark:bg-orange-950',
		border: 'border-orange-200 dark:border-orange-800',
		text: 'text-orange-900 dark:text-orange-100'
	},
	normal: {
		bg: 'bg-blue-50 dark:bg-blue-950',
		border: 'border-blue-200 dark:border-blue-800',
		text: 'text-blue-900 dark:text-blue-100'
	}
};

/**
 * French labels for notification types
 */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
	info: 'Information',
	warning: 'Avertissement',
	success: 'Succès',
	error: 'Erreur',
	alert: 'Alerte',
	announcement: 'Annonce',
	system: 'Système',
	reminder: 'Rappel'
};

/**
 * French labels for notification priorities
 */
export const NOTIFICATION_PRIORITY_LABELS: Record<NotificationPriority, string> = {
	normal: 'Normale',
	important: 'Importante',
	urgent: 'Urgente'
};

/**
 * Helper function to format notification creator name
 */
export function formatCreatorName(notification: NotificationWithDetails): string {
	if (notification.is_system) {
		return 'Système';
	}

	if (!notification.creator) {
		return 'Utilisateur inconnu';
	}

	const { firstname, lastname, full_name } = notification.creator;

	if (firstname && lastname) {
		return `${firstname} ${lastname}`;
	}

	if (full_name) {
		return full_name;
	}

	return 'Utilisateur';
}

/**
 * Helper function to get relative time string
 */
export function getRelativeTime(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) {
		return "À l'instant";
	}

	if (diffMins < 60) {
		return `Il y a ${diffMins} min`;
	}

	if (diffHours < 24) {
		return `Il y a ${diffHours}h`;
	}

	if (diffDays === 1) {
		return 'Hier';
	}

	if (diffDays < 7) {
		return `Il y a ${diffDays} jours`;
	}

	// Format as date for older notifications
	return date.toLocaleDateString('fr-FR', {
		day: 'numeric',
		month: 'short'
	});
}
