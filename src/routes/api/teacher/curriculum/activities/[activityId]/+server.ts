/**
 * API — Journal entry activity — delete.
 *
 * DELETE /api/teacher/curriculum/activities/[activityId]
 *
 * Removing an activity that carried curriculum tags reconciles the entry's AUTO
 * coverage (auto points no longer backed by any activity are dropped; manual
 * rows kept). Teacher/admin only.
 */

import { serverErrorResponse } from '#lib/server/utils/error-handler.ts';
import type { RequestHandler } from './$types';
import { requireRoles } from '#lib/server/middleware/auth.ts';
import { curriculumDbError } from '#lib/server/curriculum.ts';
import { reconcileAutoCoverage } from '#lib/server/curriculum-coverage.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('api/teacher/curriculum/activities/[activityId]/+server');

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
		logger.error('[curriculum] activity fetch (DELETE) failed:', fetchErr);
		return Response.json({ error: 'Échec de la suppression' }, { status: 500 });
	}
	if (!activity) {
		return Response.json({ error: 'Activité introuvable' }, { status: 404 });
	}

	const { entry_id, kind } = activity as { entry_id: string; kind: string };

	const { error: dbErr } = await locals.supabase
		.from('journal_entry_activities')
		.delete()
		.eq('id', params.activityId);

	if (dbErr) {
		const mapped = curriculumDbError(dbErr);
		if (mapped) return mapped;
		return serverErrorResponse(
			'api/teacher/curriculum/activities/DELETE',
			dbErr,
			'Impossible de supprimer l’activité'
		);
	}

	if (TAGGED_KINDS.has(kind)) {
		try {
			await reconcileAutoCoverage(locals.supabase, entry_id);
		} catch (e) {
			logger.error('[curriculum] reconcile after activity DELETE failed:', e);
		}
	}

	return Response.json({ success: true });
};
