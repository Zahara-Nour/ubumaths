/**
 * API — Réordonnancement des thèmes d'un niveau.
 *
 * POST /api/teacher/curriculum/themes/reorder — renumérote 1..N d'un coup.
 *
 * Remplace l'échange deux-à-deux, qui n'était pas seulement lent mais FAUX dès
 * que deux thèmes partageaient une position : troquer 0 contre 0 ne fait rien,
 * et le niveau paraissait bloqué.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { reorderThemesSchema } from '$lib/server/validation/curriculum';

export const POST: RequestHandler = async ({ request, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Corps JSON invalide' }, { status: 400 });
	}

	const parsed = reorderThemesSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: parsed.error.issues[0].message }, { status: 400 });
	}

	const { error: dbErr } = await locals.supabase.rpc('reorder_curriculum_themes', {
		p_grade: parsed.data.grade,
		p_theme_ids: parsed.data.theme_ids
	});

	if (dbErr) {
		if (dbErr.code === 'P0001') return json({ error: dbErr.message }, { status: 400 });
		console.error('[curriculum] themes reorder failed:', dbErr);
		return json({ error: 'Échec du réordonnancement' }, { status: 500 });
	}

	return json({ success: true });
};
