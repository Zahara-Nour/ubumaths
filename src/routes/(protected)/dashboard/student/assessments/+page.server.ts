import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { EvaluationError, getStudentAssignments } from '$lib/server/evaluations';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/auth/login');
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

	// Évaluations assignées, avec les tentatives de l'élève. Une panne s'affiche :
	// une liste vide ferait croire qu'il n'y a rien à faire.
	try {
		return { assignments: await getStudentAssignments(locals.supabase, user.id) };
	} catch (e) {
		if (e instanceof EvaluationError) throw error(e.status, e.message);
		throw e;
	}
};
