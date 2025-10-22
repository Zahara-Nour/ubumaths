import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getStudentAssignments } from '$lib/server/assessments';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.safeGetSession();
	if (!session) {
		throw redirect(303, '/auth/signin');
	}

	// Verify user is a student
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', session.user.id)
		.single();

	if (!profile || profile.role !== 'student') {
		throw redirect(303, '/dashboard');
	}

	// Fetch assigned assessments
	const { data: assignments, error } = await getStudentAssignments(
		locals.supabase,
		session.user.id
	);

	if (error) {
		console.error('Failed to fetch assignments:', error);
		return { assignments: [] };
	}

	return {
		assignments: assignments || []
	};
};
