import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	getAssessment,
	getAssessmentResults,
	getAssessmentStatistics
} from '$lib/server/assessments';
import { getTeacherTestMode } from '$lib/server/test-mode';
import { getCached, CACHE_KEYS, TTL } from '$lib/server/cache';
import { getCachedProfile } from '$lib/server/cache/profile';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/auth/signin');
	}

	// Verify user is a teacher
	const profile = await getCachedProfile(user.id, locals.supabase);

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
	if (assessment.created_by !== user.id) {
		throw error(403, 'Non autorisé');
	}

	// Get test mode to filter results
	const isTestMode = await getTeacherTestMode(user.id, locals.supabase);

	// Cache assessment results (5 min TTL - données rarement modifiées)
	const { data: results, error: resultsError } = await getCached(
		CACHE_KEYS.ASSESSMENT_RESULTS(params.id, isTestMode),
		TTL.ASSESSMENT_RESULTS,
		async () => getAssessmentResults(locals.supabase, params.id, isTestMode)
	);

	if (resultsError) {
		console.error('Failed to fetch results:', resultsError);
		return {
			assessment,
			results: [],
			statistics: null
		};
	}

	// Cache assessment statistics (5 min TTL - synchronisé avec results)
	const { data: statistics } = await getCached(
		CACHE_KEYS.ASSESSMENT_STATS(params.id, isTestMode),
		TTL.ASSESSMENT_RESULTS,
		async () => getAssessmentStatistics(locals.supabase, params.id, isTestMode)
	);

	return {
		assessment,
		results: results || [],
		statistics
	};
};
