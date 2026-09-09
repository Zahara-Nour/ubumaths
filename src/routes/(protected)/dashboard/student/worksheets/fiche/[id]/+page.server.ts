/**
 * Résolution élève d'une référence « fiche d'exercices ».
 *
 * Pendant de `worksheets/exercice/[id]`, avec une traduction de moins : la
 * référence porte déjà l'identifiant de la fiche, il ne reste qu'à trouver la
 * DISTRIBUTION qui concerne cet élève — il n'atteint jamais une fiche
 * directement.
 *
 * La sélection ne filtre pas sur l'élève : les RLS de `worksheet_assignments`
 * ne laissent déjà passer que ce qui lui est destiné. Filtrer ici en plus
 * ferait croire que c'est ce filtre qui protège, ce qui est faux.
 */

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { resolve } from '$app/paths';
import { requireRole } from '$lib/server/middleware/auth';
import { validateUuidParam } from '$lib/server/validation/params';

export const load: PageServerLoad = async ({ params, locals }) => {
	await requireRole(locals, 'student');

	const worksheetId = validateUuidParam(params.id, 'fiche');

	// Plusieurs distributions de la même fiche sont possibles (une par classe, ou
	// une individuelle) : la plus récemment ouverte est celle dont on parle.
	const { data: assignment, error: assignmentError } = await locals.supabase
		.from('worksheet_assignments')
		.select('id')
		.eq('worksheet_id', worksheetId)
		.eq('status', 'active')
		.order('available_from', { ascending: false, nullsFirst: false })
		.limit(1)
		.maybeSingle();

	if (assignmentError) {
		console.error('[fiche/élève] distribution introuvable:', assignmentError);
		throw error(500, 'Erreur lors de la résolution de la référence');
	}

	// Le dire plutôt que de renvoyer vers une liste où il la chercherait en vain.
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
