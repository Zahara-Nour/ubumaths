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

	// Fetch existing tags for autocomplete (deduplicated)
	const { data: tagRows, error: tagRowsError } = await locals.supabase
		.from('constructions')
		.select('tags')
		.not('tags', 'is', null);

	// Enrichissement d'affichage : son absence ne ferme pas l'écran, mais elle
	// laisse une trace.
	if (tagRowsError) {
		console.error('Enrichissement illisible :', tagRowsError);
	}

	// Flatten and deduplicate tags
	const existingTags = [...new Set((tagRows ?? []).flatMap((row) => row.tags ?? []))].sort();

	return { existingTags };
};
