import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getAssessment, getAssessmentAssignments, assignAssessment } from '$lib/server/assessments';
import { getTeacherClassesWithCounts } from '$lib/server/students';
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

	// Must be published to assign
	if (assessment.status !== 'published') {
		throw redirect(303, `/dashboard/teacher/assessments/${id}`);
	}

	// Use unified helper to get classes with student counts
	// Automatically handles test mode filtering
	const classesWithData = await getTeacherClassesWithCounts(user.id, locals.supabase);

	// Get existing assignments
	const { data: existingAssignments } = await getAssessmentAssignments(locals.supabase, id);

	// Add is_assigned field to classes
	const formattedClasses = classesWithData.map((c) => ({
		id: c.id,
		name: c.name,
		level: c.description, // Note: helper returns description, UI expects level
		student_count: c.student_count,
		is_assigned: existingAssignments?.some((a) => a.class_id === c.id) || false
	}));

	return {
		assessment,
		classes: formattedClasses,
		existingAssignments: existingAssignments || []
	};
};

export const actions: Actions = {
	assign: async ({ request, params, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) {
			return { success: false, error: 'Non authentifié' };
		}

		const id = validateUuidParam(params.id);
		const formData = await request.formData();
		const classIdsJson = formData.get('class_ids') as string;

		if (!classIdsJson) {
			return { success: false, error: 'Aucune classe sélectionnée' };
		}

		const classIds = JSON.parse(classIdsJson);

		const { error } = await assignAssessment(
			locals.supabase,
			{
				assessment_id: id,
				class_ids: classIds
			},
			user.id
		);

		if (error) {
			console.error('Failed to assign assessment:', error);
			return { success: false, error: "Échec de l'assignation" };
		}

		return { success: true };
	},

	unassign: async ({ request, params: _params, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) {
			return { success: false, error: 'Non authentifié' };
		}

		const formData = await request.formData();
		const assignmentId = formData.get('assignment_id') as string;

		if (!assignmentId) {
			return { success: false, error: "ID d'assignation manquant" };
		}

		// Remove the assignment
		const { error } = await locals.supabase
			.from('assessment_assignments')
			.delete()
			.eq('id', assignmentId);

		if (error) {
			console.error('Failed to remove assignment:', error);
			return { success: false, error: 'Échec de la suppression' };
		}

		return { success: true };
	}
};
