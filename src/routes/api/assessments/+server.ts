/**
 * API Route: /api/assessments
 * GET - List teacher's assessments (filtered by status)
 * POST - Create new assessment
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAssessment, getTeacherAssessments } from '$lib/server/assessments';
import type { CreateAssessmentData } from '$lib/types/assessment';

/**
 * GET /api/assessments
 * Get teacher's assessments with optional status filter
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const session = await locals.safeGetSession();
	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const { user } = session;

	// Only teachers can access this
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'teacher') {
		throw error(403, 'Forbidden - Teachers only');
	}

	// Get optional status filter
	const status = url.searchParams.get('status') || undefined;

	// Fetch assessments
	const result = await getTeacherAssessments(locals.supabase, user.id, status);

	if (result.error) {
		throw error(500, 'Failed to fetch assessments');
	}

	return json({ assessments: result.data });
};

/**
 * POST /api/assessments
 * Create a new assessment
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const session = await locals.safeGetSession();
	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const { user } = session;

	// Only teachers can create assessments
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'teacher') {
		throw error(403, 'Forbidden - Teachers only');
	}

	// Parse request body
	const data: CreateAssessmentData = await request.json();

	// Validate required fields
	if (!data.title || !data.grade || !data.categories || data.categories.length === 0) {
		throw error(400, 'Missing required fields');
	}

	// Create assessment
	const result = await createAssessment(locals.supabase, data, user.id);

	if (result.error) {
		console.error('Failed to create assessment:', result.error);
		throw error(500, 'Failed to create assessment');
	}

	return json({ assessment: result.data });
};
