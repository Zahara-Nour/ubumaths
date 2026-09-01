/**
 * API — Journal entry activity — delete.
 *
 * DELETE /api/teacher/curriculum/activities/[activityId]
 *
 * Removing an activity that carried curriculum tags reconciles the entry's AUTO
 * coverage (auto points no longer backed by any activity are dropped; manual
 * rows kept). Teacher/admin only.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { curriculumDbError } from '$lib/server/curriculum';
import { reconcileAutoCoverage } from '$lib/server/curriculum-coverage';

/** Kinds whose tags feed the entry's auto coverage. */
const TAGGED_KINDS = new Set(['exercise', 'question', 'assessment']);

export const DELETE: RequestHandler = async ({ params, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	// Fetch entry_id + kind first (needed to reconcile after delete).
	const { data: activity, error: fetchErr } = await locals.supabase
		.from('journal_entry_activities')
		.select('entry_id, kind')
		.eq('id', params.activityId)
		.maybeSingle();

	if (fetchErr) {
		console.error('[curriculum] activity fetch (DELETE) failed:', fetchErr);
		return json({ error: 'Échec de la suppression' }, { status: 500 });
	}
	if (!activity) {
		return json({ error: 'Activité introuvable' }, { status: 404 });
	}

	const { entry_id, kind } = activity as { entry_id: string; kind: string };

	const { error: dbErr } = await locals.supabase
		.from('journal_entry_activities')
		.delete()
		.eq('id', params.activityId);

	if (dbErr) {
		const mapped = curriculumDbError(dbErr);
		if (mapped) return mapped;
		console.error('[curriculum] activity DELETE failed:', dbErr);
		return json({ error: dbErr.message }, { status: 500 });
	}

	if (TAGGED_KINDS.has(kind)) {
		try {
			await reconcileAutoCoverage(locals.supabase, entry_id);
		} catch (e) {
			console.error('[curriculum] reconcile after activity DELETE failed:', e);
		}
	}

	return json({ success: true });
};
