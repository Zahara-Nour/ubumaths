import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import {
	getCreatedNotifications,
	createNotification,
	deleteNotification
} from '$lib/server/notifications';
import { requireAdmin } from '$lib/server/middleware/auth';
import type { CreateNotificationData } from '$lib/types/notification';
import {
	createNotificationSchema,
	deleteNotificationSchema
} from '$lib/server/validation/notifications';
import {
	checkNotificationCreateRateLimit,
	checkNotificationDeleteRateLimit
} from '$lib/server/rateLimiter';

export const load: PageServerLoad = async ({ locals }) => {
	// Admin only (real admin login OR step-up elevation)
	const { supabase, adminUserId } = await requireAdmin(locals);

	// Get all classes
	const { data: classes } = await supabase
		.from('classes')
		.select('id, name')
		.eq('is_active', true)
		.order('name');

	// Get all users (for specific user targeting)
	const { data: users } = await supabase
		.from('profiles')
		.select('id, firstname, lastname, role, email')
		.order('role', { ascending: false })
		.order('lastname');

	// Get admin's created notifications with stats
	const notificationStats = await getCreatedNotifications(supabase, adminUserId);

	return {
		classes: classes || [],
		users: users || [],
		notificationStats
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		// Admin only (real admin login OR step-up elevation)
		const { supabase, adminUserId } = await requireAdmin(locals);

		// ====================================================================
		// SECURITY: Rate Limiting
		// ====================================================================
		const rateLimitResult = await checkNotificationCreateRateLimit(adminUserId, 'admin');
		if (!rateLimitResult.allowed) {
			return fail(429, { error: rateLimitResult.message });
		}

		// ====================================================================
		// SECURITY: Input Validation with Zod
		// ====================================================================
		const formData = await request.formData();

		// Convert FormData to plain object for Zod validation
		const rawData = {
			title: formData.get('title'),
			message: formData.get('message'),
			type: formData.get('type'),
			priority: formData.get('priority'),
			targetType: formData.get('targetType'),
			actionLabel: formData.get('actionLabel') || undefined,
			actionUrl: formData.get('actionUrl') || undefined,
			roles: formData.getAll('roles'),
			classIds: formData.getAll('classIds'),
			userIds: formData.getAll('userIds')
		};

		const validation = createNotificationSchema.safeParse(rawData);

		if (!validation.success) {
			const firstError = validation.error.issues[0];
			return fail(400, { error: firstError.message });
		}

		const {
			title,
			message,
			type,
			priority,
			targetType,
			actionLabel,
			actionUrl,
			roles,
			classIds,
			userIds
		} = validation.data;

		// ====================================================================
		// Business Logic
		// ====================================================================
		// Build notification data
		const notificationData: CreateNotificationData = {
			title,
			message,
			type: type as CreateNotificationData['type'],
			priority: priority as CreateNotificationData['priority'],
			target_type: targetType as CreateNotificationData['target_type'],
			action_label: actionLabel,
			action_url: actionUrl
		};

		// Add target data based on type
		if (targetType === 'role') {
			if (!roles || roles.length === 0) {
				return fail(400, { error: 'Veuillez sélectionner au moins un rôle' });
			}
			notificationData.target_roles = roles;
		} else if (targetType === 'classes') {
			if (!classIds || classIds.length === 0) {
				return fail(400, { error: 'Veuillez sélectionner au moins une classe' });
			}
			notificationData.target_class_ids = classIds;
		} else if (targetType === 'users') {
			if (!userIds || userIds.length === 0) {
				return fail(400, { error: 'Veuillez sélectionner au moins un utilisateur' });
			}
			notificationData.target_user_ids = userIds;
		}
		// 'all' doesn't need additional data

		// Create notification
		const result = await createNotification(supabase, notificationData, adminUserId);

		if (!result.success) {
			return fail(500, { error: result.error || 'Erreur lors de la création' });
		}

		return { success: true };
	},

	delete: async ({ request, locals }) => {
		// Admin only (real admin login OR step-up elevation)
		const { supabase, adminUserId } = await requireAdmin(locals);

		// ====================================================================
		// SECURITY: Rate Limiting
		// ====================================================================
		const rateLimitResult = await checkNotificationDeleteRateLimit(adminUserId, 'admin');
		if (!rateLimitResult.allowed) {
			return fail(429, { error: rateLimitResult.message });
		}

		// ====================================================================
		// SECURITY: Input Validation with Zod
		// ====================================================================
		const formData = await request.formData();
		const rawData = { notificationId: formData.get('notificationId') };

		const validation = deleteNotificationSchema.safeParse(rawData);
		if (!validation.success) {
			return fail(400, { error: validation.error.issues[0].message });
		}

		const { notificationId } = validation.data;

		const result = await deleteNotification(supabase, notificationId, adminUserId);

		if (!result.success) {
			return fail(500, { error: result.error || 'Erreur lors de la suppression' });
		}

		return { success: true };
	}
};
