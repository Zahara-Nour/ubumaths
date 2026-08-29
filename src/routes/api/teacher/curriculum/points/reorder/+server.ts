/**
 * API — Réordonnancement des points d'un objectif.
 *
 * POST /api/teacher/curriculum/points/reorder — renumérote 1..N d'un coup.
 *
 * Remplace l'échange deux-à-deux qui coûtait deux PATCH et un rechargement par
 * cran : remonter un point de dix places demandait vingt requêtes. Ici le client
 * envoie l'ordre voulu et la base renumérote en une transaction.
 *
 * Teacher/admin only (la fonction PG est INVOKER : la RLS reste le vrai garde).
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { reorderPointsSchema } from '$lib/server/validation/curriculum';

export const POST: RequestHandler = async ({ request, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Corps JSON invalide' }, { status: 400 });
	}

	const parsed = reorderPointsSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: parsed.error.issues[0].message }, { status: 400 });
	}

	const { error: dbErr } = await locals.supabase.rpc('reorder_curriculum_points', {
		p_objective_id: parsed.data.objective_id,
		p_point_ids: parsed.data.point_ids
	});

	if (dbErr) {
		// La fonction lève sur une liste incomplète ou contenant un point étranger :
		// c'est une erreur d'appel, pas une panne.
		if (dbErr.code === 'P0001') {
			return json({ error: dbErr.message }, { status: 400 });
		}
		console.error('[curriculum] points reorder failed:', dbErr);
		return json({ error: 'Échec du réordonnancement' }, { status: 500 });
	}

	return json({ success: true });
};
