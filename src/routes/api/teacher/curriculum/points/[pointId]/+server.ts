/**
 * API — Curriculum point (level 3) — update, archive & delete.
 *
 * PATCH  /api/teacher/curriculum/points/[pointId]   — rename / move / reorder /
 *                                                    kind / exigence / régime /
 *                                                    rang / archive
 * DELETE /api/teacher/curriculum/points/[pointId]   — delete, refused if referenced
 *
 * A point is the anchor for exercise tags, journal coverage and student
 * acquisition, and five of the six foreign keys pointing at it CASCADE. So a
 * delete is only allowed while nothing references the point; past that, the
 * answer is `archived: true` — the point leaves the views, the history stays.
 * Teacher/admin only.
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
	if (parsed.data.objective_id !== undefined) updates.objective_id = parsed.data.objective_id;
	if (parsed.data.name !== undefined) updates.name = parsed.data.name;
	if (parsed.data.display_order !== undefined) updates.display_order = parsed.data.display_order;
	if (parsed.data.kind !== undefined) updates.kind = parsed.data.kind;
	if (parsed.data.regime_acquisition !== undefined) {
		updates.regime_acquisition = parsed.data.regime_acquisition;
	}
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

/** Ce qui retient un point, en français, pour le message de refus. */
const REFERENCE_LABELS: Record<string, (n: number) => string> = {
	question_templates: (n) => `${n} question${n > 1 ? 's' : ''}`,
	exercises: (n) => `${n} exercice${n > 1 ? 's' : ''}`,
	journal_entries: (n) => `${n} séance${n > 1 ? 's' : ''} du cahier de texte`,
	student_states: (n) => `${n} élève${n > 1 ? 's' : ''}`,
	automatisme_lists: (n) => `${n} liste${n > 1 ? 's' : ''} d'automatismes`,
	srs_flags: (n) => `${n} signalement${n > 1 ? 's' : ''} SRS`
};

/** « 3 exercices, 12 élèves et 1 séance du cahier de texte » */
function describeReferences(counts: Record<string, number>): string {
	const parts = Object.entries(counts).map(([k, n]) => REFERENCE_LABELS[k]?.(n) ?? `${n} ${k}`);
	if (parts.length <= 1) return parts[0] ?? '';
	return `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}`;
}

export const DELETE: RequestHandler = async ({ params, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	// Compté côté base (SECURITY DEFINER) : compter à travers les politiques RLS
	// de l'appelant renverrait zéro là où un élève a de l'historique que le prof
	// ne voit pas, et laisserait passer la suppression.
	const { data: refs, error: refErr } = await locals.supabase.rpc(
		'curriculum_point_reference_counts',
		{ p_point_id: params.pointId }
	);

	if (refErr) {
		console.error('[curriculum] point references check failed:', refErr);
		return json({ error: 'Impossible de vérifier ce que ce point emporterait' }, { status: 500 });
	}

	const counts = (refs ?? {}) as Record<string, number>;
	if (Object.keys(counts).length > 0) {
		return json(
			{
				error: `Ce point est utilisé par ${describeReferences(counts)}. Le supprimer effacerait aussi ces liens — archivez-le plutôt.`,
				references: counts
			},
			{ status: 409 }
		);
	}

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
