/**
 * API — Point de programme (génération neuve) — renommer, archiver.
 *
 * PATCH /api/teacher/curriculum/points/[pointId]   — { name?, archived? }
 *
 * Seuls les points NEUFS (rattachés à un nœud de l'arbre, ADR 0020) se
 * modifient, et seulement leur libellé et leur archivage : le code ne change
 * jamais, et créer, supprimer, déplacer ou réordonner un point passe par une
 * migration (le BO fait foi). Un ancien point (rattaché à un objectif) est
 * refusé en 409. Teacher/admin only.
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

	// Lecture d'abord, pour distinguer « inconnu » (404) de « ancienne
	// génération » (409) avec un message qui dit pourquoi.
	const { data: existing, error: readErr } = await locals.supabase
		.from('curriculum_points')
		.select('id, node_id')
		.eq('id', id.data)
		.maybeSingle();

	if (readErr) {
		console.error('[curriculum] point PATCH read failed:', readErr);
		return json({ error: 'Impossible de lire ce point' }, { status: 500 });
	}
	const found = existing as { id: string; node_id: string | null } | null;
	if (!found) {
		return json({ error: 'Point introuvable' }, { status: 404 });
	}
	if (found.node_id === null) {
		return json(
			{ error: 'Ce point appartient à l’ancien référentiel : il ne se modifie plus.' },
			{ status: 409 }
		);
	}

	const updates: TablesUpdate<'curriculum_points'> = {};
	if (parsed.data.name !== undefined) updates.name = parsed.data.name;
	if (parsed.data.archived !== undefined) {
		updates.archived_at = parsed.data.archived ? new Date().toISOString() : null;
	}

	// Le filtre `node_id` non nul refait la garde au moment de l'écriture. Et la
	// RLS échoue en silence : zéro ligne rendue = rien d'écrit, pas un succès.
	const { data, error: dbErr } = await locals.supabase
		.from('curriculum_points')
		.update(updates)
		.eq('id', id.data)
		.not('node_id', 'is', null)
		.select(PROGRAMME_POINT_COLS)
		.maybeSingle();

	if (dbErr) {
		const mapped = curriculumDbError(dbErr);
		if (mapped) return mapped;
		console.error('[curriculum] point PATCH failed:', dbErr);
		return json({ error: 'Échec de la mise à jour du point' }, { status: 500 });
	}
	if (!data) {
		return json({ error: 'Point introuvable ou non modifiable' }, { status: 404 });
	}

	return json({ point: data as ProgrammePoint });
};
