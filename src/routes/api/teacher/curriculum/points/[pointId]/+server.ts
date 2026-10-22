/**
 * API — Point de programme — renommer, archiver.
 *
 * PATCH /api/teacher/curriculum/points/[pointId]   — { name?, archived? }
 *
 * Seuls le libellé et l'archivage d'un point se modifient : le code ne change
 * jamais, et créer, supprimer, déplacer ou réordonner un point passe par une
 * migration (le BO fait foi). Teacher/admin only.
 */

import { json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { updateProgrammePointSchema } from '$lib/server/validation/curriculum';
import { curriculumDbError } from '$lib/server/curriculum';
import { PROGRAMME_POINT_COLS } from '$lib/server/programme-tree';
import type { ProgrammePoint } from '$lib/types/database-helpers';
import type { TablesUpdate } from '$lib/types/database';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/teacher/curriculum/points/[pointId]/+server');

const pointIdSchema = z.string().uuid('Identifiant de point invalide');

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	const id = pointIdSchema.safeParse(params.pointId);
	if (!id.success) {
		return json({ error: id.error.issues[0].message }, { status: 400 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Corps JSON invalide' }, { status: 400 });
	}

	const parsed = updateProgrammePointSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: parsed.error.issues[0].message }, { status: 400 });
	}

	const updates: TablesUpdate<'curriculum_points'> = {};
	if (parsed.data.name !== undefined) updates.name = parsed.data.name;
	if (parsed.data.archived !== undefined) {
		updates.archived_at = parsed.data.archived ? new Date().toISOString() : null;
	}

	// La RLS échoue en silence : zéro ligne rendue = rien d'écrit, pas un succès.
	const { data, error: dbErr } = await locals.supabase
		.from('curriculum_points')
		.update(updates)
		.eq('id', id.data)
		.select(PROGRAMME_POINT_COLS)
		.maybeSingle();

	if (dbErr) {
		const mapped = curriculumDbError(dbErr);
		if (mapped) return mapped;
		logger.error('[curriculum] point PATCH failed:', dbErr);
		return json({ error: 'Échec de la mise à jour du point' }, { status: 500 });
	}
	if (!data) {
		return json({ error: 'Point introuvable ou non modifiable' }, { status: 404 });
	}

	return json({ point: data as ProgrammePoint });
};
