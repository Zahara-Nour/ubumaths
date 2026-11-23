/**
 * POST /api/series — enregistrer le panier comme série (B11). Prof et admin.
 *
 * Corps : { title, grade, description?, items: SeriesItem[] (1 à 50, ADR 0035) }.
 * Réponse 201 : { series }.
 */

import type { RequestHandler } from './$types';
import { requireRoles } from '#lib/server/middleware/auth.ts';
import { createSeriesSchema } from '#lib/server/validation/evaluations.ts';
import { createSeries, SeriesError } from '#lib/server/series.ts';

export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await requireRoles(locals, ['teacher', 'admin']);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'Corps de requête illisible' }, { status: 400 });
	}

	const validation = createSeriesSchema.safeParse(body);
	if (!validation.success) {
		return Response.json({ error: validation.error.issues[0].message }, { status: 400 });
	}

	try {
		const series = await createSeries(locals.supabase, validation.data, user.id);
		return Response.json({ series }, { status: 201 });
	} catch (e) {
		if (e instanceof SeriesError) return Response.json({ error: e.message }, { status: e.status });
		throw e;
	}
};
