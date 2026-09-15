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
	// 307 et non 308 : un 308 est mis en cache DÉFINITIVEMENT par le navigateur.
	// Si la fusion était un jour défaite, les élèves ne pourraient plus atteindre
	// cette URL sans vider leurs données de site. Le gain du permanent (référencement,
	// favoris réécrits) est nul sur une route derrière authentification.
	redirect(307, '/dashboard/student/progression?onglet=objectifs');
};
