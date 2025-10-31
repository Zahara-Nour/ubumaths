/**
 * API Route: /api/assessments/[id]/results
 * GET - Get assessment results (teacher view)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getAssessmentResults,
	getAssessmentStatistics,
	getClassStatistics
} from '$lib/server/assessments';
import { getResultsQuerySchema } from '$lib/server/validation/assessments';
import { uuidSchema } from '$lib/server/validation/common';
import { requireRole } from '$lib/server/middleware/auth';

/**
 * GET /api/assessments/[id]/results
 * Get all results for an assessment
 */
export const GET: RequestHandler = async ({ locals, params, url }) => {
	const { user } = await requireRole(locals, 'teacher');

	// Validate UUID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Invalid assessment ID format');
	}

	const assessmentId = idValidation.data;

	// Verify teacher owns the assessment
	const { data: assessment } = await locals.supabase
		.from('assessments')
		.select('created_by')
		.eq('id', assessmentId)
		.single();

	if (!assessment || assessment.created_by !== user.id) {
		throw error(403, 'Forbidden - Not your assessment');
	}

	// Validate query parameters
	const queryValidation = getResultsQuerySchema.safeParse({
		stats: url.searchParams.get('stats'),
		class_stats: url.searchParams.get('class_stats'),
		student_id: url.searchParams.get('student_id'),
		class_id: url.searchParams.get('class_id')
	});

	if (!queryValidation.success) {
		throw error(400, queryValidation.error.issues[0].message);
	}

	const { stats: includeStats, class_stats: includeClassStats } = queryValidation.data;

	// Get results
	const resultsPromise = getAssessmentResults(locals.supabase, assessmentId);
	const statsPromise = includeStats
		? getAssessmentStatistics(locals.supabase, assessmentId)
		: Promise.resolve({ data: null, error: null });
	const classStatsPromise = includeClassStats
		? getClassStatistics(locals.supabase, assessmentId)
		: Promise.resolve({ data: null, error: null });

	const [results, stats, classStats] = await Promise.all([
		resultsPromise,
		statsPromise,
		classStatsPromise
	]);

	if (results.error) {
		console.error('Failed to fetch results:', results.error);
		throw error(500, 'Failed to fetch results');
	}

	return json({
		results: results.data,
		statistics: stats.data,
		class_statistics: classStats.data
	});
};
