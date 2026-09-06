import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getStudentAssignments } from '$lib/server/assessments';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/auth/signin');
	}

	// Verify user is a student
	const { data: profile, error: profileError } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	// PGRST116 = pas de profil, et la redirection qui suit est légitime. Une
	// AUTRE panne renvoyait l'élève au tableau de bord sans rien expliquer.
	if (profileError && profileError.code !== 'PGRST116') {
		console.error('Profil illisible :', profileError);
		throw error(500, 'Impossible de vérifier votre profil');
	}

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
};
