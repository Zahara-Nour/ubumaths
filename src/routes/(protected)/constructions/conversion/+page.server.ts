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
	const { data: tagRows } = await locals.supabase
		.from('constructions')
		.select('tags')
		.not('tags', 'is', null);

	// Flatten and deduplicate tags
	const existingTags = [...new Set((tagRows ?? []).flatMap((row) => row.tags ?? []))].sort();

	return { existingTags };
};
