import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getCreatedNotifications, createNotification, deleteNotification } from '$lib/server/notifications';
import type { CreateNotificationData } from '$lib/types/notification';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();

	if (!session) {
		throw redirect(303, '/auth/login');
	}

	// Get user profile to check role
	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', session.user.id)
		.single();

	if (profileError || !profile || profile.role !== 'admin') {
		throw redirect(303, '/dashboard');
	}

	// Get all classes
	const { data: classes } = await supabase
		.from('classes')
		.select('id, name, teacher_id')
		.eq('is_active', true)
		.order('name');

	// Get all users (for specific user targeting)
	const { data: users } = await supabase
		.from('profiles')
		.select('id, firstname, lastname, role, email')
		.order('role', { ascending: false })
		.order('lastname');

	// Get admin's created notifications with stats
	const notificationStats = await getCreatedNotifications(supabase, session.user.id);

	return {
		classes: classes || [],
		users: users || [],
		notificationStats
	};
};

export const actions: Actions = {
	create: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();

		if (!session) {
			return fail(401, { error: 'Non authentifié' });
		}

		// Check admin role
		const { data: profile } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', session.user.id)
			.single();

		if (!profile || profile.role !== 'admin') {
			return fail(403, { error: 'Permission refusée' });
		}

		const formData = await request.formData();
		const title = formData.get('title') as string;
		const message = formData.get('message') as string;
		const type = formData.get('type') as string;
		const priority = formData.get('priority') as string;
		const targetType = formData.get('targetType') as string;
		const actionLabel = formData.get('actionLabel') as string | null;
		const actionUrl = formData.get('actionUrl') as string | null;

		// Validation
		if (!title || !message || !type || !priority || !targetType) {
			return fail(400, { error: 'Tous les champs requis doivent être remplis' });
		}

		// Build notification data
		const notificationData: CreateNotificationData = {
			title,
			message,
			type: type as any,
			priority: priority as any,
			target_type: targetType as any,
			action_label: actionLabel || undefined,
			action_url: actionUrl || undefined
		};

		// Get target data based on type
		if (targetType === 'role') {
			const roles = formData.getAll('roles') as string[];
			if (!roles || roles.length === 0) {
				return fail(400, { error: 'Veuillez sélectionner au moins un rôle' });
			}
			notificationData.target_roles = roles;
		} else if (targetType === 'classes') {
			const classIds = formData.getAll('classIds') as string[];
			if (!classIds || classIds.length === 0) {
				return fail(400, { error: 'Veuillez sélectionner au moins une classe' });
			}
			notificationData.target_class_ids = classIds;
		} else if (targetType === 'users') {
			const userIds = formData.getAll('userIds') as string[];
			if (!userIds || userIds.length === 0) {
				return fail(400, { error: 'Veuillez sélectionner au moins un utilisateur' });
			}
			notificationData.target_user_ids = userIds;
		}
		// 'all' doesn't need additional data

		// Create notification
		const result = await createNotification(supabase, notificationData, session.user.id);

		if (!result.success) {
			return fail(500, { error: result.error || 'Erreur lors de la création' });
		}

		return { success: true };
	},

	delete: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();

		if (!session) {
			return fail(401, { error: 'Non authentifié' });
		}

		const formData = await request.formData();
		const notificationId = formData.get('notificationId') as string;

		if (!notificationId) {
			return fail(400, { error: 'ID de notification manquant' });
		}

		const result = await deleteNotification(supabase, notificationId, session.user.id);

		if (!result.success) {
			return fail(500, { error: result.error || 'Erreur lors de la suppression' });
		}

		return { success: true };
	}
};
