import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getAssessment, updateAssessment } from '$lib/server/assessments';
import type { UpdateAssessmentData } from '$lib/types/assessment';
import { getCachedProfile } from '$lib/server/cache/profile';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/auth/signin');
	}

	// Verify user is a teacher
	const profile = await getCachedProfile(user.id, locals.supabase);

	if (!profile || profile.role !== 'teacher') {
		throw redirect(303, '/dashboard');
	}

	// Fetch assessment
	const { data: assessment, error: assessmentError } = await getAssessment(
		locals.supabase,
		params.id
	);

	if (assessmentError || !assessment) {
		throw error(404, 'Évaluation introuvable');
	}

	// Verify ownership
	if (assessment.created_by !== user.id) {
		throw error(403, 'Non autorisé');
	}

	// Can only edit drafts
	if (assessment.status !== 'draft') {
		throw redirect(303, `/dashboard/teacher/assessments/${params.id}`);
	}

	return {
		assessment
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) {
			return { success: false, error: 'Non authentifié' };
		}

		const formData = await request.formData();
		const title = formData.get('title') as string;
		const grade = formData.get('grade') as string;
		const description = formData.get('description') as string;
		const settingsJson = formData.get('settings') as string;

		if (!title || !grade || !settingsJson) {
			return { success: false, error: 'Données manquantes' };
		}

		const settings = JSON.parse(settingsJson);

		const updateData: UpdateAssessmentData = {
			title,
			grade,
			description: description || undefined,
			settings
		};

		const { error } = await updateAssessment(locals.supabase, params.id, updateData, user.id);

		if (error) {
			console.error('Failed to update assessment:', error);
			return { success: false, error: 'Échec de la mise à jour' };
		}

		return { success: true };
	}
};
