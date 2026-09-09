/**
 * Résolution élève d'une référence « exercice de fiche ».
 *
 * Pendant du chemin professeur (`contenu/worksheets/exercice/[id]`), mais l'élève
 * n'atteint pas une fiche : il atteint une **distribution** de cette fiche
 * (`worksheet_assignments`). La traduction est donc double — jonction → fiche,
 * puis fiche → distribution qui le concerne.
 *
 * La sélection ne filtre pas sur l'élève : les RLS de `worksheet_assignments` ne
 * laissent déjà passer que ce qui lui est destiné. Filtrer ici en plus ferait
 * croire que c'est ce filtre qui protège, ce qui est faux.
 */

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { resolve } from '$app/paths';
import { requireRole } from '$lib/server/middleware/auth';
import { validateUuidParam } from '$lib/server/validation/params';

export const load: PageServerLoad = async ({ params, locals }) => {
	await requireRole(locals, 'student');

	const id = validateUuidParam(params.id, 'exercice de fiche');

	const { data: link, error: linkError } = await locals.supabase
		.from('worksheet_exercises')
		.select('worksheet_id')
		.eq('id', id)
		.maybeSingle();

	if (linkError) {
		console.error('[worksheet-exercise/élève] résolution impossible:', linkError);
		throw error(500, 'Erreur lors de la résolution de la référence');
	}

	if (!link) {
		throw error(404, 'Cet exercice ne fait plus partie de la fiche référencée');
	}

	// Plusieurs distributions de la même fiche sont possibles (une par classe, ou
	// une individuelle) : la plus récemment ouverte est celle dont on parle.
	const { data: assignment, error: assignmentError } = await locals.supabase
		.from('worksheet_assignments')
		.select('id')
		.eq('worksheet_id', link.worksheet_id)
		.eq('status', 'active')
		.order('available_from', { ascending: false, nullsFirst: false })
		.limit(1)
		.maybeSingle();

	if (assignmentError) {
		console.error('[worksheet-exercise/élève] distribution introuvable:', assignmentError);
		throw error(500, 'Erreur lors de la résolution de la référence');
	}

	// La fiche existe, mais elle ne lui a pas été distribuée : le dire plutôt que
	// de renvoyer vers une liste où il la chercherait en vain.
	if (!assignment) {
		throw error(404, "Cette fiche ne t'a pas encore été distribuée");
	}

	redirect(
		303,
		resolve('/(protected)/dashboard/student/worksheets/[assignmentId]', {
			assignmentId: assignment.id
		})
	);
};
