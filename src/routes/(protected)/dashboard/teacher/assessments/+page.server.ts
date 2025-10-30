import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getTeacherAssessments } from '$lib/server/assessments';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/auth/signin');
	}

	// Verify user is a teacher
	const { data: profileData, error: profileError } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (profileError || !profileData) {
		throw error(403, 'Profil non trouvé');
	}

	if (profileData.role !== 'teacher') {
		throw redirect(303, '/dashboard');
	}

	// Fetch all assessments (not filtered by status)
	// NOTE: Assessment listing is NOT filtered by test mode - teachers can see all their assessments
	// Test mode filtering only applies to students/results shown for each assessment
	const { data: assessments, error: assessmentsError } = await getTeacherAssessments(
		locals.supabase,
		user.id
	);

	if (assessmentsError) {
		console.error('Failed to fetch assessments:', assessmentsError);
		return { assessments: [] };
	}

	return {
		assessments: assessments || []
	};
};
