/**
 * Whiteboard - Server Load
 *
 * Protected route for the educational whiteboard.
 * Réservé au prof et à l'admin (décision D5 de David, 2026-10-11) : outil de
 * projection en classe, mono-utilisateur, dont le lien n'est montré qu'au prof.
 * Un tableau partagé en direct pour les élèves serait une autre fonctionnalité.
 *
 * This route inherits authentication from (protected)/+layout.server.ts,
 * so we only need to verify role permissions.
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ parent }) => {
	const { profile } = await parent();

	// Prof et admin seulement (admin : tests et assistance)
	if (profile.role !== 'teacher' && profile.role !== 'admin') {
		throw error(403, 'Accès réservé aux enseignants');
	}

	return {
		// Profile is available from parent, no additional data needed
	};
};
