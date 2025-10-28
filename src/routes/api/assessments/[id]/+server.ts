/**
 * API Route: /api/assessments/[id]
 * GET - Get assessment by ID
 * PUT - Update assessment
 * DELETE - Delete (archive) assessment
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAssessment, updateAssessment, archiveAssessment } from '$lib/server/assessments';
import { updateAssessmentSchema } from '$lib/server/validation/assessments';
import { uuidSchema } from '$lib/server/validation/common';

/**
 * GET /api/assessments/[id]
 * Get assessment by ID
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const session = await locals.safeGetSession();
	if (!session) {
		throw error(401, 'Unauthorized');
	}

	// Validate UUID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Invalid assessment ID format');
	}

	const id = idValidation.data;

	const result = await getAssessment(locals.supabase, id);

	if (result.error || !result.data) {
		throw error(404, 'Assessment not found');
	}

	// Check authorization
	const { user } = session;
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	// Teachers can only view their own assessments
	if (profile?.role === 'teacher' && result.data.created_by !== user.id) {
		throw error(403, 'Forbidden');
	}

	// Students can only view published assessments assigned to them
	if (profile?.role === 'student') {
		// Check if assessment is assigned
		const { data: assignment } = await locals.supabase
			.from('assessment_assignments')
			.select('id')
			.eq('assessment_id', id)
			.or(
				`student_id.eq.${user.id},class_id.in.(${await getStudentClassIds(locals.supabase, user.id)})`
			)
			.single();

		if (!assignment || result.data.status !== 'published') {
			throw error(403, 'Forbidden');
		}
	}

	return json({ assessment: result.data });
};

/**
 * PUT /api/assessments/[id]
 * Update assessment
 */
export const PUT: RequestHandler = async ({ locals, params, request }) => {
	const session = await locals.safeGetSession();
	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const { user } = session;

	// Validate UUID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Invalid assessment ID format');
	}

	const id = idValidation.data;

	// Only teachers can update
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'teacher') {
		throw error(403, 'Forbidden - Teachers only');
	}

	// Parse and validate request body
	const body = await request.json();
	const validation = updateAssessmentSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	// Update assessment
	const result = await updateAssessment(locals.supabase, id, validation.data, user.id);

	if (result.error) {
		if (result.error.message === 'Unauthorized') {
			throw error(403, 'Forbidden - Not your assessment');
		}
		console.error('Failed to update assessment:', result.error);
		throw error(500, 'Failed to update assessment');
	}

	return json({ assessment: result.data });
};

/**
 * DELETE /api/assessments/[id]
 * Archive assessment
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	const session = await locals.safeGetSession();
	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const { user } = session;

	// Validate UUID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Invalid assessment ID format');
	}

	const id = idValidation.data;

	// Only teachers can delete
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'teacher') {
		throw error(403, 'Forbidden - Teachers only');
	}

	// Archive assessment
	const result = await archiveAssessment(locals.supabase, id, user.id);

	if (result.error) {
		if (result.error.message === 'Unauthorized') {
			throw error(403, 'Forbidden - Not your assessment');
		}
		console.error('Failed to archive assessment:', result.error);
		throw error(500, 'Failed to archive assessment');
	}

	return json({ success: true });
};

/**
 * Helper: Get student's class IDs
 */
async function getStudentClassIds(supabase: SupabaseClient, studentId: string): Promise<string> {
	const { data } = await supabase
		.from('class_members')
		.select('class_id')
		.eq('student_id', studentId);

	return data?.map((cm) => cm.class_id).join(',') || '';
}
