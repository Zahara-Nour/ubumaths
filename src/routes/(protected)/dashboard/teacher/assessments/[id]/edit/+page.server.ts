import { redirect, error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getAssessment, updateAssessment } from '$lib/server/assessments';
import type { UpdateAssessmentData } from '$lib/types/assessment';
import { assessmentEditFormSchema } from '$lib/server/validation/assessments';
import { validateUuidParam } from '$lib/server/validation/params';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/auth/signin');
	}

	const id = validateUuidParam(params.id);

	// Verify user is a teacher
	const { data: profileData, error: profileError } = await locals.supabase
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

	// Fetch assessment
	const { data: assessment, error: assessmentError } = await getAssessment(locals.supabase, id);

	if (assessmentError || !assessment) {
		throw error(404, 'Évaluation introuvable');
	}

	// Verify ownership
	if (assessment.created_by !== user.id) {
		throw error(403, 'Non autorisé');
	}

	// Can only edit drafts
	if (assessment.status !== 'draft') {
		throw redirect(303, `/dashboard/teacher/assessments/${id}`);
	}

	return {
		assessment
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) {
			return fail(401, { success: false, error: 'Non authentifié' });
		}

		const id = validateUuidParam(params.id);
		const formData = await request.formData();

		// Validate form data using Zod schema
		const validation = assessmentEditFormSchema.safeParse({
			title: formData.get('title'),
			grade: formData.get('grade'),
			description: formData.get('description'),
			settings: formData.get('settings')
		});

		if (!validation.success) {
			return fail(400, {
				success: false,
				error: validation.error.issues[0].message
			});
		}

		const updateData: UpdateAssessmentData = {
			title: validation.data.title,
			grade: validation.data.grade,
			description: validation.data.description,
			settings: validation.data.settings
		};

		const { error: updateError } = await updateAssessment(locals.supabase, id, updateData, user.id);

		if (updateError) {
			console.error('Failed to update assessment:', updateError);
			return fail(500, { success: false, error: 'Échec de la mise à jour' });
		}

		return { success: true };
	}
};
