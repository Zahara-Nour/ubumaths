/**
 * API Route: /api/assessments/[id]/assign
 * POST - Assign assessment to classes/students
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assignAssessment, getAssessment } from '$lib/server/assessments';
import { notifyNewAssessment } from '$lib/server/auto-notifications';
import { assignAssessmentSchema } from '$lib/server/validation/assessments';
import { uuidSchema } from '$lib/server/validation/common';
import { requireRole } from '$lib/server/middleware/auth';

/**
 * POST /api/assessments/[id]/assign
 * Assign assessment to classes and/or students
 */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { user, profile } = await requireRole(locals, 'teacher');

	// Validate UUID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Invalid assessment ID format');
	}

	const assessmentId = idValidation.data;

	// Parse and validate request body
	const body = await request.json();
	const validation = assignAssessmentSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { class_ids, student_ids } = validation.data;

	const data = {
		assessment_id: assessmentId,
		class_ids,
		student_ids
	};

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
		const teacherName =
			profile.firstname && profile.lastname
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
