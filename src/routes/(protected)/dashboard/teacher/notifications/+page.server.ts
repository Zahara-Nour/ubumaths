import { redirect, fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import {
	getCreatedNotifications,
	createNotification,
	deleteNotification
} from '$lib/server/notifications';
import type { CreateNotificationData } from '$lib/types/notification';
import {
	createNotificationSchema,
	deleteNotificationSchema
} from '$lib/server/validation/notifications';
import {
	checkNotificationCreateRateLimit,
	checkNotificationDeleteRateLimit
} from '$lib/server/rateLimiter';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw redirect(303, '/auth/login');
	}

	// Get user profile to check role
	const { data: profileData, error: profileError } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (profileError || !profileData) {
		throw error(403, 'Profil non trouvé');
	}

	if (profileData.role !== 'teacher') {
		throw redirect(303, '/dashboard');
	}

	// Get teacher's classes
	const { data: classes, error: _classesError } = await supabase
		.from('classes')
		.select('id, name')
		.eq('teacher_id', user.id)
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
			.in('class_id', classIds)
			.eq('status', 'active');

		students =
			studentsData?.map((cm) => {
				const student = Array.isArray(cm.student) ? cm.student[0] : cm.student;
				return {
					id: student.id,
					firstname: student.firstname,
					lastname: student.lastname,
					class_id: cm.class_id
				};
			}) || [];
	}

	// Get teacher's created notifications with stats
	const notificationStats = await getCreatedNotifications(supabase, user.id);

	return {
		classes: classes || [],
		students,
		notificationStats
	};
};

export const actions: Actions = {
	create: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { error: 'Non authentifié' });
		}

		// ====================================================================
		// SECURITY: Rate Limiting
		// ====================================================================
		const rateLimitResult = await checkNotificationCreateRateLimit(user.id, 'teacher');
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
		if (targetType === 'classes') {
			if (!classIds || classIds.length === 0) {
				return fail(400, { error: 'Veuillez sélectionner au moins une classe' });
			}
			notificationData.target_class_ids = classIds;
		} else if (targetType === 'users') {
			if (!userIds || userIds.length === 0) {
				return fail(400, { error: 'Veuillez sélectionner au moins un élève' });
			}
			notificationData.target_user_ids = userIds;
		}

		// Create notification
		const result = await createNotification(supabase, notificationData, user.id);

		if (!result.success) {
			return fail(500, { error: result.error || 'Erreur lors de la création' });
		}

		return { success: true };
	},

	delete: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { error: 'Non authentifié' });
		}

		// ====================================================================
		// SECURITY: Rate Limiting
		// ====================================================================
		const rateLimitResult = await checkNotificationDeleteRateLimit(user.id, 'teacher');
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

		const result = await deleteNotification(supabase, notificationId, user.id);

		if (!result.success) {
			return fail(500, { error: result.error || 'Erreur lors de la suppression' });
		}

		return { success: true };
	}
};
