/**
 * API — global resource search.
 *
 * GET /api/search?q=<texte>&kinds=exercise,question&limit=20
 *
 * Teacher/admin only: searching the catalogue is an authoring tool. Students
 * reach content through their assignments, not through a catalogue index.
 * Row-level filtering is done by RLS regardless — this gate is the product
 * decision, not the safety net.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { rateLimit } from '$lib/server/middleware/rateLimit';
import { searchQuerySchema } from '$lib/server/validation/search';
import { searchResources } from '$lib/server/search';

export const GET: RequestHandler = async ({ url, locals }) => {
	const { user } = await requireRoles(locals, ['teacher', 'admin']);

	// Une recherche est structurellement chère : UNION ALL de cinq balayages,
	// `unaccent` par ligne, aucun index utilisable (joker en tête + fonction non
	// immutable). Le `statement_timeout` de Supabase borne UNE requête, pas la
	// cadence — et la base est partagée avec l'auth et les soumissions d'élèves.
	rateLimit(`search:${user.id}`, 30, 60000);

	const parsed = searchQuerySchema.safeParse({
		q: url.searchParams.get('q') ?? '',
		kinds: url.searchParams.get('kinds') ?? undefined,
		tags: url.searchParams.get('tags') ?? undefined,
		grades: url.searchParams.get('grades') ?? undefined,
		limit: url.searchParams.get('limit') ?? undefined
	});

	if (!parsed.success) {
		return json({ error: parsed.error.issues[0].message }, { status: 400 });
	}

	const { rows, error } = await searchResources(locals.supabase, {
		query: parsed.data.q,
		kinds: parsed.data.kinds,
		tags: parsed.data.tags,
		grades: parsed.data.grades,
		limit: parsed.data.limit
	});

	if (error) {
		return json({ error }, { status: 500 });
	}

	return json({ results: rows });
};
