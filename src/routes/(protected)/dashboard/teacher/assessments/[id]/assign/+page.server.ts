import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getAssessment, getAssessmentAssignments, assignAssessment } from '$lib/server/assessments';

export const load: PageServerLoad = async ({ params, locals }) => {
	const session = await locals.safeGetSession();
	if (!session) {
		throw redirect(303, '/auth/signin');
	}

	// Verify user is a teacher
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', session.user.id)
		.single();

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
	if (assessment.created_by !== session.user.id) {
		throw error(403, 'Non autorisé');
	}

	// Must be published to assign
	if (assessment.status !== 'published') {
		throw redirect(303, `/dashboard/teacher/assessments/${params.id}`);
	}

	// Get teacher's classes with student counts
	const { data: classes } = await locals.supabase
		.from('classes')
		.select(
			`
			id,
			name,
			level,
			class_members (
				student_id
			)
		`
		)
		.eq('teacher_id', session.user.id)
		.order('name');

	// Get existing assignments
	const { data: existingAssignments } = await getAssessmentAssignments(locals.supabase, params.id);

	// Format classes with student count and assignment status
	const formattedClasses = (classes || []).map((c: any) => ({
		id: c.id,
		name: c.name,
		level: c.level,
		student_count: c.class_members?.length || 0,
		is_assigned: existingAssignments?.some((a: any) => a.class_id === c.id) || false
	}));

	return {
		assessment,
		classes: formattedClasses,
		existingAssignments: existingAssignments || []
	};
};

export const actions: Actions = {
	assign: async ({ request, params, locals }) => {
		const session = await locals.safeGetSession();
		if (!session) {
			return { success: false, error: 'Non authentifié' };
		}

		const formData = await request.formData();
		const classIdsJson = formData.get('class_ids') as string;

		if (!classIdsJson) {
			return { success: false, error: 'Aucune classe sélectionnée' };
		}

		const classIds = JSON.parse(classIdsJson);

		const { error } = await assignAssessment(
			locals.supabase,
			{
				assessment_id: params.id,
				class_ids: classIds
			},
			session.user.id
		);

		if (error) {
			console.error('Failed to assign assessment:', error);
			return { success: false, error: "Échec de l'assignation" };
		}

		return { success: true };
	},

	unassign: async ({ request, params, locals }) => {
		const session = await locals.safeGetSession();
		if (!session) {
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
