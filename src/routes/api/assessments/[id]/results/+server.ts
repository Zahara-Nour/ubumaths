/**
 * API Route: /api/assessments/[id]/results
 * GET - Get assessment results (teacher view)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAssessmentResults, getAssessmentStatistics, getClassStatistics } from '$lib/server/assessments';

/**
 * GET /api/assessments/[id]/results
 * Get all results for an assessment
 */
export const GET: RequestHandler = async ({ locals, params, url }) => {
	const session = await locals.safeGetSession();
	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const { user } = session;
	const { id: assessmentId } = params;

	// Only teachers can view results
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'teacher') {
		throw error(403, 'Forbidden - Teachers only');
	}

	// Verify teacher owns the assessment
	const { data: assessment } = await locals.supabase
		.from('assessments')
		.select('created_by')
		.eq('id', assessmentId)
		.single();

	if (!assessment || assessment.created_by !== user.id) {
		throw error(403, 'Forbidden - Not your assessment');
	}

	// Get what data the client wants
	const includeStats = url.searchParams.get('stats') === 'true';
	const includeClassStats = url.searchParams.get('class_stats') === 'true';

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
