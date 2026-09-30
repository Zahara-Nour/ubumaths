/**
 * POST /api/series — enregistrer le panier comme série (B11). Prof et admin.
 *
 * Corps : { title, grade, description?, categories: CartItem[] (1 à 50) }.
 * Réponse 201 : { series }.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { createSeriesSchema } from '$lib/server/validation/evaluations';
import { createSeries, SeriesError } from '$lib/server/series';

export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await requireRoles(locals, ['teacher', 'admin']);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Corps de requête illisible' }, { status: 400 });
	}

	const validation = createSeriesSchema.safeParse(body);
	if (!validation.success) {
		return json({ error: validation.error.issues[0].message }, { status: 400 });
	}

	try {
		const series = await createSeries(locals.supabase, validation.data, user.id);
		return json({ series }, { status: 201 });
	} catch (e) {
		if (e instanceof SeriesError) return json({ error: e.message }, { status: e.status });
		throw e;
	}
};
