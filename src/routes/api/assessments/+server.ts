/**
 * API Route: /api/assessments
 * GET - List teacher's assessments (filtered by status)
 * POST - Create new assessment
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAssessment, getTeacherAssessments } from '$lib/server/assessments';
import {
	createAssessmentSchema,
	listAssessmentsQuerySchema,
	assessmentListResponseSchema,
	createAssessmentResponseSchema
} from '$lib/server/validation/assessments';
import { validateJsonResponse } from '$lib/server/validation/response-utils';
import { requireRole } from '$lib/server/middleware/auth';

/**
 * GET /api/assessments
 * Get teacher's assessments with optional status filter
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const { user } = await requireRole(locals, 'teacher');

	// Validate query parameters
	const queryValidation = listAssessmentsQuerySchema.safeParse({
		status: url.searchParams.get('status'),
		grade: url.searchParams.get('grade'),
		page: url.searchParams.get('page'),
		limit: url.searchParams.get('limit')
	});

	if (!queryValidation.success) {
		throw error(400, queryValidation.error.issues[0].message);
	}

	const { status } = queryValidation.data;

	// Fetch assessments
	const result = await getTeacherAssessments(locals.supabase, user.id, status);

	if (result.error) {
		throw error(500, 'Failed to fetch assessments');
	}

	// Validate response
	const validated = validateJsonResponse(
		assessmentListResponseSchema,
		{ assessments: result.data },
		'GET /api/assessments'
	);

	return json(validated);
};

/**
 * POST /api/assessments
 * Create a new assessment
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await requireRole(locals, 'teacher');

	// Parse and validate request body
	const body = await request.json();
	const validation = createAssessmentSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	// Add default settings if not provided
	const assessmentData = {
		...validation.data,
		settings: {
			max_attempts: validation.data.max_attempts,
			duration_minutes: validation.data.duration
		}
	} as unknown as import('$lib/types/assessment').CreateAssessmentData;

	// Create assessment
	const result = await createAssessment(locals.supabase, assessmentData, user.id);

	if (result.error) {
		console.error('Failed to create assessment:', result.error);
		throw error(500, 'Failed to create assessment');
	}

	// Validate response
	const validated = validateJsonResponse(
		createAssessmentResponseSchema,
		{ assessment: result.data },
		'POST /api/assessments'
	);

	return json(validated);
};
