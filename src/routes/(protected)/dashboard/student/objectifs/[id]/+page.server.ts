/**
 * Ancienne page d'un objectif — conservée en redirection.
 *
 * Le programme se lit par notion depuis la bascule sur l'arbre des notions
 * (C5, étape 3, PR D). Un ancien objectif n'a pas de notion unique où renvoyer :
 * on ramène l'élève sur « Ma progression », plutôt que sur une page vide ou une
 * 404 depuis un favori. 307 et non 308, comme `../+page.server.ts`.
 */

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	redirect(307, '/dashboard/student/progression?onglet=objectifs');
};
