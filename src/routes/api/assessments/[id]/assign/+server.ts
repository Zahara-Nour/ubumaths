/**
 * API Route: /api/assessments/[id]/assign
 * POST - Assign assessment to classes/students
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assignAssessment, getAssessment } from '$lib/server/assessments';
import { notifyNewAssessment } from '$lib/server/auto-notifications';
import type { AssignAssessmentData } from '$lib/types/assessment';

/**
 * POST /api/assessments/[id]/assign
 * Assign assessment to classes and/or students
 */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	const session = await locals.sapabaseClient();
	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const { user } = session;
	const { id: assessmentId } = params;

	// Only teachers can assign
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role, firstname, lastname')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'teacher') {
		throw error(403, 'Forbidden - Teachers only');
	}

	// Parse request body
	const { class_ids, student_ids } = await request.json();

	const data: AssignAssessmentData = {
		assessment_id: assessmentId,
		class_ids,
		student_ids
	};

	// Validate that at least one target is specified
	if ((!data.class_ids || data.class_ids.length === 0) &&
	    (!data.student_ids || data.student_ids.length === 0)) {
		throw error(400, 'Must specify at least one class or student');
	}

	// Create assignments
	const result = await assignAssessment(locals.supabase, data, user.id);

	if (result.error) {
		if (result.error.message.includes('Unauthorized')) {
			throw error(403, 'Forbidden - Not your assessment');
		}
		if (result.error.message.includes('must be published')) {
			throw error(400, 'Assessment must be published before assigning');
		}
		console.error('Failed to assign assessment:', result.error);
		throw error(500, 'Failed to assign assessment');
	}

	// Get assessment title for notification
	const { data: assessment } = await getAssessment(locals.supabase, assessmentId);

	// Send notification to assigned students
	if (assessment) {
		const teacherName = profile.firstname && profile.lastname
			? `${profile.firstname} ${profile.lastname}`
			: 'Votre professeur';

		await notifyNewAssessment(locals.supabase, {
			assessmentId: assessment.id,
			assessmentTitle: assessment.title,
			teacherName,
			classIds: data.class_ids,
			studentIds: data.student_ids
		});
	}

	return json({
		success: true,
		assignments: result.data,
		count: result.data?.length || 0
	});
};
