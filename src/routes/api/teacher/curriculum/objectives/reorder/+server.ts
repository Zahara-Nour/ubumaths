/**
 * API — Réordonnancement des objectifs d'un thème.
 *
 * POST /api/teacher/curriculum/objectives/reorder — renumérote 1..N d'un coup.
 *
 * Voir la route jumelle des thèmes : l'échange deux-à-deux qu'elle remplace
 * échouait en silence sur des positions en doublon.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { reorderObjectivesSchema } from '$lib/server/validation/curriculum';

export const POST: RequestHandler = async ({ request, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Corps JSON invalide' }, { status: 400 });
	}

	const parsed = reorderObjectivesSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: parsed.error.issues[0].message }, { status: 400 });
	}

	const { error: dbErr } = await locals.supabase.rpc('reorder_curriculum_objectives', {
		p_theme_id: parsed.data.theme_id,
		p_objective_ids: parsed.data.objective_ids
	});

	if (dbErr) {
		if (dbErr.code === 'P0001') return json({ error: dbErr.message }, { status: 400 });
		console.error('[curriculum] objectives reorder failed:', dbErr);
		return json({ error: 'Échec du réordonnancement' }, { status: 500 });
	}

	return json({ success: true });
};
