/**
 * API — Curriculum point (level 3) — update, archive & delete.
 *
 * PATCH  /api/teacher/curriculum/points/[pointId]   — rename / reorder / kind / archive
 * DELETE /api/teacher/curriculum/points/[pointId]   — hard delete (cascade coverage)
 *
 * Soft-archive (`archived: true`) is preferred over hard delete when a point
 * already has coverage history. Teacher/admin only.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { updatePointSchema } from '$lib/server/validation/curriculum';
import { curriculumDbError, POINT_COLS } from '$lib/server/curriculum';
import type { CurriculumPoint } from '$lib/types/database-helpers';
import type { TablesUpdate } from '$lib/types/database';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Corps JSON invalide' }, { status: 400 });
	}

	const parsed = updatePointSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: parsed.error.issues[0].message }, { status: 400 });
	}

	const updates: TablesUpdate<'curriculum_points'> = {};
	if (parsed.data.name !== undefined) updates.name = parsed.data.name;
	if (parsed.data.display_order !== undefined) updates.display_order = parsed.data.display_order;
	if (parsed.data.kind !== undefined) updates.kind = parsed.data.kind;
	if (parsed.data.knowledge_type !== undefined) updates.knowledge_type = parsed.data.knowledge_type;
	if (parsed.data.exigence !== undefined) updates.exigence = parsed.data.exigence;
	if (parsed.data.rang !== undefined) updates.rang = parsed.data.rang;
	if (parsed.data.archived !== undefined) {
		updates.archived_at = parsed.data.archived ? new Date().toISOString() : null;
	}

	const { data, error: dbErr } = await locals.supabase
		.from('curriculum_points')
		.update(updates)
		.eq('id', params.pointId)
		.select(POINT_COLS)
		.single();

	if (dbErr) {
		if (dbErr.code === 'PGRST116') {
			return json({ error: 'Point introuvable' }, { status: 404 });
		}
		const mapped = curriculumDbError(dbErr, 'Un point de ce nom existe déjà dans cet item');
		if (mapped) return mapped;
		console.error('[curriculum] point PATCH failed:', dbErr);
		return json({ error: dbErr.message }, { status: 500 });
	}

	return json({ point: data as CurriculumPoint });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	const { error: dbErr } = await locals.supabase
		.from('curriculum_points')
		.delete()
		.eq('id', params.pointId);

	if (dbErr) {
		const mapped = curriculumDbError(dbErr);
		if (mapped) return mapped;
		console.error('[curriculum] point DELETE failed:', dbErr);
		return json({ error: dbErr.message }, { status: 500 });
	}

	return json({ success: true });
};
