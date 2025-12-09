import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	getAssessment,
	getAssessmentResults,
	getAssessmentStatistics
} from '$lib/server/assessments';
import { getTeacherTestMode } from '$lib/server/test-mode';
import { getUserProfile } from '$lib/server/auth';
import { validateUuidParam } from '$lib/server/validation/params';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/auth/signin');
	}

	const id = validateUuidParam(params.id);

	// ✅ STANDARDIZED: Use getUserProfile helper for consistent profile fetching
	const profile = await getUserProfile(locals.supabase, user.id);

	if (!profile) {
		throw error(403, 'Profil non trouvé');
	}

	if (profile.role !== 'teacher') {
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

	// Get test mode to filter results
	const isTestMode = await getTeacherTestMode(user.id, locals.supabase);

	// Fetch assessment results (direct DB query, no cache)
	const { data: results, error: resultsError } = await getAssessmentResults(
		locals.supabase,
		id,
		isTestMode
	);

	if (resultsError) {
		console.error('Failed to fetch results:', resultsError);
		return {
			assessment,
			results: [],
			statistics: null
		};
	}

	// Fetch assessment statistics (direct DB query, no cache)
	const { data: statistics } = await getAssessmentStatistics(locals.supabase, id, isTestMode);

	return {
		assessment,
		results: results || [],
		statistics
	};
};
