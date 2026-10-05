/**
 * Résultats d'un élève pour une évaluation. `[id]` est l'identifiant de
 * l'ASSIGNATION (celui des liens envoyés) ; les séances sont lues par
 * `test_sessions.evaluation_id`.
 */

import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { validateUuidParam } from '$lib/server/validation/params';
import {
	EvaluationError,
	getAssignmentWithEvaluation,
	isAssignmentRecipient
} from '$lib/server/evaluations';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/auth/login');
	}

	const id = validateUuidParam(params.id);

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

	try {
		const found = await getAssignmentWithEvaluation(locals.supabase, id);
		if (!found) throw error(404, 'Évaluation introuvable');

		// La RLS le garantit déjà ; on ne s'en remet pas à elle seule
		if (!(await isAssignmentRecipient(locals.supabase, found.assignment, user.id))) {
			throw error(403, 'Non autorisé');
		}

		const { data: attempts, error: attemptsError } = await locals.supabase
			.from('test_sessions')
			.select('*')
			.eq('evaluation_id', found.evaluation.id)
			.eq('user_id', user.id)
			.order('created_at', { ascending: false });

		// Des tentatives illisibles ne sont pas « aucune tentative »
		if (attemptsError) {
			console.error('[student results] Tentatives illisibles :', attemptsError);
			throw error(500, 'Impossible de charger vos résultats');
		}

		return {
			assignment: found.assignment,
			evaluation: found.evaluation,
			attempts: attempts ?? []
		};
	} catch (e) {
		if (e instanceof EvaluationError) throw error(e.status, e.message);
		throw e;
	}
};
