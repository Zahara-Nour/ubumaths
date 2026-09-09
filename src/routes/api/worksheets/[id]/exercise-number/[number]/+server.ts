/**
 * GET /api/worksheets/[id]/exercise-number/[number]
 * =================================================
 *
 * Traduit « exercice 3 de cette fiche » en identifiant de jonction
 * `worksheet_exercises`, celui que porte une référence
 * `[[worksheet_exercise:…]]`.
 *
 * Le numéro est celui que l'élève LIT sur sa fiche — un ordinal continu calculé
 * à travers les sections, pas `worksheet_exercises.position` qui redémarre à 1
 * dans chacune. La règle vit dans `$lib/worksheets/exercise-numbering`, partagée
 * avec la page élève et le générateur PDF.
 *
 * AUTH : prof/admin. C'est un outil d'écriture du cahier de texte ; la RLS de
 * `worksheet_exercises` filtre de toute façon ce que l'appelant peut lire.
 */

import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { validateUuidParam } from '$lib/server/validation/params';
import { orderExercisesForDisplay } from '$lib/worksheets/exercise-numbering';

/** Borne haute large mais finie : aucune fiche réelle n'a mille exercices. */
const numberSchema = z.coerce.number().int().min(1).max(999);

export const GET: RequestHandler = async ({ params, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	const worksheetId = validateUuidParam(params.id, 'fiche');

	const parsedNumber = numberSchema.safeParse(params.number);
	if (!parsedNumber.success) {
		throw error(400, 'Numéro d’exercice invalide');
	}

	const [{ data: exercises, error: exercisesError }, { data: sections, error: sectionsError }] =
		await Promise.all([
			locals.supabase
				.from('worksheet_exercises')
				.select('id, section_id, position')
				.eq('worksheet_id', worksheetId),
			locals.supabase
				.from('worksheet_sections')
				.select('id, position')
				.eq('worksheet_id', worksheetId)
		]);

	if (exercisesError || sectionsError) {
		console.error('[exercise-number] fiche illisible:', exercisesError ?? sectionsError);
		throw error(500, 'Erreur lors de la lecture de la fiche');
	}

	const ordered = orderExercisesForDisplay(exercises ?? [], sections ?? []);
	const match = ordered.find((entry) => entry.number === parsedNumber.data);

	// Numéro hors de la fiche : le dire, pour que l'éditeur retombe sur une
	// référence vers la fiche entière plutôt que d'inventer un exercice.
	if (!match) {
		throw error(404, `Cette fiche n’a pas d’exercice ${parsedNumber.data}`);
	}

	return json({
		worksheet_exercise_id: match.exercise.id,
		number: match.number,
		total: ordered.length
	});
};
