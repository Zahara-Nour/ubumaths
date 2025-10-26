import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	getAssessment,
	getAssessmentResults,
	getAssessmentStatistics
} from '$lib/server/assessments';
import { getTeacherTestMode } from '$lib/server/test-mode';

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

	// Get test mode to filter results
	const isTestMode = await getTeacherTestMode(session.user.id, locals.supabase);

	// Fetch results - filtered by test mode
	const { data: results, error: resultsError } = await getAssessmentResults(
		locals.supabase,
		params.id,
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

	// Fetch statistics - filtered by test mode
	const { data: statistics } = await getAssessmentStatistics(
		locals.supabase,
		params.id,
		isTestMode
	);

	return {
		assessment,
		results: results || [],
		statistics
	};
};
