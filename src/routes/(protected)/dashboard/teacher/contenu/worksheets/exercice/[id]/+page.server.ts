/**
 * Résolution d'une référence « exercice de fiche ».
 *
 * Les liens `[[worksheet_exercise:<id>|…]]` portent l'identifiant de la JONCTION
 * `worksheet_exercises`, pas celui de la fiche. Le registre d'adressage étant
 * synchrone — il ne peut pas interroger la base pour construire une URL — c'est
 * cette route qui fait la traduction, puis redirige vers la fiche.
 *
 * Elle n'affiche donc rien : elle existe pour que le registre reste une simple
 * table de constantes.
 */

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { resolve } from '$app/paths';
import { requireRole } from '$lib/server/middleware/auth';
import { validateUuidParam } from '$lib/server/validation/params';

export const load: PageServerLoad = async ({ params, locals }) => {
	await requireRole(locals, 'teacher');

	const id = validateUuidParam(params.id, 'exercice de fiche');

	const { data, error: lookupError } = await locals.supabase
		.from('worksheet_exercises')
		.select('worksheet_id')
		.eq('id', id)
		.maybeSingle();

	if (lookupError) {
		console.error('[worksheet-exercise] résolution impossible:', lookupError);
		throw error(500, 'Erreur lors de la résolution de la référence');
	}

	// Référence morte : l'exercice a été retiré de la fiche depuis que la séance a
	// été écrite. On le dit franchement plutôt que de rediriger vers une fiche au
	// hasard.
	if (!data) {
		throw error(404, 'Cet exercice ne fait plus partie de la fiche référencée');
	}

	redirect(
		303,
		resolve('/(protected)/dashboard/teacher/contenu/worksheets/[id]', {
			id: data.worksheet_id
		})
	);
};
