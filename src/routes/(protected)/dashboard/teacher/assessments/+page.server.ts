import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getTeacherAssessments } from '$lib/server/assessments';

export const load: PageServerLoad = async ({ locals }) => {
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

	// Fetch all assessments (not filtered by status)
	// NOTE: Assessment listing is NOT filtered by test mode - teachers can see all their assessments
	// Test mode filtering only applies to students/results shown for each assessment
	const { data: assessments, error } = await getTeacherAssessments(
		locals.supabase,
		session.user.id
	);

	if (error) {
		console.error('Failed to fetch assessments:', error);
		return { assessments: [] };
	}

	return {
		assessments: assessments || []
	};
};
