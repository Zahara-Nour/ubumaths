/**
 * Teacher global search page — server load.
 *
 * The query lives in the URL (`?q=…&kinds=…`) rather than in component state:
 * a search you can bookmark, share or reload is worth more than one that
 * evaporates on refresh, and it makes the page a plain GET with no client fetch.
 *
 * An empty or too-short query is not an error here — it is simply the page
 * before you have typed anything. The API is where a bad query earns a 400.
 */

import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { searchResources, type ResourceSearchRow } from '$lib/server/search';
import { RESOURCE_KINDS, isResourceKind, type ResourceKind } from '$lib/resources/kinds';

/** Same floor as the SQL function: below this, the search says nothing. */
const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 100;
const RESULT_LIMIT = 50;
const MAX_TAGS = 10;

export const load: PageServerLoad = async ({ locals, url }) => {
	// Volontairement plus étroit que `/api/search`, qui accepte teacher ET admin :
	// cette page vit sous `/dashboard/teacher`, dont le layout refuse déjà les
	// admins (`+layout.server.ts:51`). Élargir la garde ici ne rendrait pas la
	// page accessible, ça donnerait seulement l'illusion qu'elle l'est.
	// L'admin passe par l'API.
	await requireRole(locals, 'teacher');

	const rawQuery = (url.searchParams.get('q') ?? '').trim().slice(0, MAX_QUERY_LENGTH);
	const kinds = (url.searchParams.get('kinds') ?? '')
		.split(',')
		.map((kind) => kind.trim())
		.filter(isResourceKind);
	const tags = (url.searchParams.get('tags') ?? '')
		.split(',')
		.map((tag) => tag.trim())
		.filter(Boolean)
		.slice(0, MAX_TAGS);

	// Un tag seul est un critère suffisant : cliquer sur un `#hashtag` ne demande
	// pas de saisir aussi du texte.
	if (rawQuery.length < MIN_QUERY_LENGTH && tags.length === 0) {
		return {
			query: rawQuery,
			kinds,
			tags,
			results: [] as ResourceSearchRow[],
			searched: false,
			error: null
		};
	}

	const { rows, error } = await searchResources(locals.supabase, {
		query: rawQuery,
		kinds:
			kinds.length > 0 && kinds.length < RESOURCE_KINDS.length
				? (kinds as ResourceKind[])
				: undefined,
		tags: tags.length > 0 ? tags : undefined,
		limit: RESULT_LIMIT
	});

	return { query: rawQuery, kinds, tags, results: rows, searched: true, error };
};
