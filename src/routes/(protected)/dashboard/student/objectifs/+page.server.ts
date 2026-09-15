/**
 * Ancienne URL « Mes objectifs » — conservée en redirection.
 *
 * La liste vit désormais dans l'onglet « Ce que je sais faire » de
 * `/dashboard/student/progression`. On ne supprime pas l'URL : elle est dans
 * les favoris des élèves, et `revisions/decks/programme` y renvoie.
 *
 * La route de détail `/dashboard/student/objectifs/[id]` n'est PAS concernée :
 * elle reste à son adresse.
 */

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// 308 : déplacement permanent, méthode préservée — les favoris se mettent à jour.
	redirect(308, '/dashboard/student/progression?onglet=objectifs');
};
