import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getStudentAssignments } from '$lib/server/assessments';
import { loadMonitor } from '$lib/utils/loadTracer';

export const load: PageServerLoad = loadMonitor.traceServerLoad(async (event) => {
	const { locals } = event;

	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/auth/signin');
	}

	// Verify user is a student
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'student') {
		throw redirect(303, '/dashboard');
	}

	// Fetch assigned assessments
	const { data: assignments, error } = await getStudentAssignments(locals.supabase, user.id);

	if (error) {
		console.error('Failed to fetch assignments:', error);
		return { assignments: [] };
	}

	return {
		assignments: assignments || []
	};
});
