import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import {
	getCreatedNotifications,
	createNotification,
	deleteNotification
} from '$lib/server/notifications';
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

	if (profileError || !profile || profile.role !== 'teacher') {
		throw redirect(303, '/dashboard');
	}

	// Get teacher's classes
	const { data: classes, error: _classesError } = await supabase
		.from('classes')
		.select('id, name')
		.eq('teacher_id', session.user.id)
		.eq('is_active', true)
		.order('name');

	// Get students from teacher's classes
	const classIds = classes?.map((c) => c.id) || [];
	let students: Array<{ id: string; firstname: string; lastname: string; class_id: string }> = [];

	if (classIds.length > 0) {
		const { data: studentsData } = await supabase
			.from('class_members')
			.select(
				`
				student_id,
				class_id,
				student:profiles!class_members_student_id_fkey(id, firstname, lastname)
			`
			)
			.in('class_id', classIds);

		students =
			studentsData?.map((cm) => ({
				id: cm.student.id,
				firstname: cm.student.firstname,
				lastname: cm.student.lastname,
				class_id: cm.class_id
			})) || [];
	}

	// Get teacher's created notifications with stats
	const notificationStats = await getCreatedNotifications(supabase, session.user.id);

	return {
		classes: classes || [],
		students,
		notificationStats
	};
};

export const actions: Actions = {
	create: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();

		if (!session) {
			return fail(401, { error: 'Non authentifié' });
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
			type: type as unknown as CreateNotificationData['type'],
			priority: priority as unknown as CreateNotificationData['priority'],
			target_type: targetType as unknown as CreateNotificationData['target_type'],
			action_label: actionLabel || undefined,
			action_url: actionUrl || undefined
		};

		// Get target data based on type
		if (targetType === 'classes') {
			const classIds = formData.getAll('classIds') as string[];
			if (!classIds || classIds.length === 0) {
				return fail(400, { error: 'Veuillez sélectionner au moins une classe' });
			}
			notificationData.target_class_ids = classIds;
		} else if (targetType === 'users') {
			const userIds = formData.getAll('userIds') as string[];
			if (!userIds || userIds.length === 0) {
				return fail(400, { error: 'Veuillez sélectionner au moins un élève' });
			}
			notificationData.target_user_ids = userIds;
		}

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
