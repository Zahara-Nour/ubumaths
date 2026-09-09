/**
 * Conversion Page Server Load
 *
 * Loads existing tags from constructions for autocomplete suggestions.
 * Requires teacher or admin role.
 */

import type { PageServerLoad } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';

export const load: PageServerLoad = async ({ locals }) => {
	// Require teacher or admin role
	await requireRoles(locals, ['teacher', 'admin']);

	// Autocomplétion : le catalogue partagé remplace la colonne `constructions.tags`,
	// qui n'a d'ailleurs jamais porté la moindre valeur en production. Suggérer
	// depuis `tags` est aussi plus utile — le vocabulaire est commun à toutes les
	// ressources depuis l'unification.
	const { data: tagRows, error: tagRowsError } = await locals.supabase
		.from('tags')
		.select('name')
		.order('name', { ascending: true });

	// Enrichissement d'affichage : son absence ne ferme pas l'écran, mais elle
	// laisse une trace.
	if (tagRowsError) {
		console.error('Enrichissement illisible :', tagRowsError);
	}

	const existingTags = (tagRows ?? []).map((row) => row.name);

	return { existingTags };
};
