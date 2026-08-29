/**
 * API — Curriculum points (level 3, tracking grain).
 *
 * GET  /api/teacher/curriculum/points?objective_id=<uuid>   — list points of an item
 * POST /api/teacher/curriculum/points                  — create a point
 *
 * Teacher/admin only (RLS also enforces is_teacher_or_admin()).
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { createPointSchema, pointListQuerySchema } from '$lib/server/validation/curriculum';
import { curriculumDbError, POINT_COLS, pointInsert } from '$lib/server/curriculum';
import type { CurriculumPoint } from '$lib/types/database-helpers';

export const GET: RequestHandler = async ({ url, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	const parsed = pointListQuerySchema.safeParse({
		objective_id: url.searchParams.get('objective_id')
	});
	if (!parsed.success) {
		return json({ error: parsed.error.issues[0].message }, { status: 400 });
	}

	const { data, error: dbErr } = await locals.supabase
		.from('curriculum_points')
		.select(POINT_COLS)
		.eq('objective_id', parsed.data.objective_id)
		.order('display_order', { ascending: true })
		.order('name', { ascending: true });

	if (dbErr) {
		console.error('[curriculum] points GET failed:', dbErr);
		return json({ error: 'Échec du chargement des points' }, { status: 500 });
	}

	return json({ points: (data ?? []) as CurriculumPoint[] });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Corps JSON invalide' }, { status: 400 });
	}

	const parsed = createPointSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: parsed.error.issues[0].message }, { status: 400 });
	}

	// `code` est absent volontairement : le trigger le calcule depuis le niveau
	// de l'objectif et attribue le suivant de la série (1SPE-154, 6-096, …).
	// Les champs omis par l'appelant retombent sur les défauts de la table
	// ('diversite', 'attendu', rang NULL) plutôt que sur `null`.
	const { data, error: dbErr } = await locals.supabase
		.from('curriculum_points')
		.insert(
			pointInsert({
				objective_id: parsed.data.objective_id,
				name: parsed.data.name,
				display_order: parsed.data.display_order ?? 0,
				kind: parsed.data.kind,
				...(parsed.data.regime_acquisition !== undefined && {
					regime_acquisition: parsed.data.regime_acquisition
				}),
				...(parsed.data.exigence !== undefined && { exigence: parsed.data.exigence }),
				...(parsed.data.rang !== undefined && { rang: parsed.data.rang })
			})
		)
		.select(POINT_COLS)
		.single();

	if (dbErr) {
		const mapped = curriculumDbError(dbErr, 'Un point de ce nom existe déjà dans cet item');
		if (mapped) return mapped;
		console.error('[curriculum] points POST failed:', dbErr);
		return json({ error: dbErr.message }, { status: 500 });
	}

	return json({ point: data as CurriculumPoint }, { status: 201 });
};
