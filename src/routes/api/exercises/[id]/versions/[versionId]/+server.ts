/**
 * API Route: /api/exercises/[id]/versions/[versionId] — une version d'un exercice (ADR 0044)
 * PATCH  - change la note
 * DELETE - supprime la version : refusé (409) si une fiche l'utilise (le refus nomme les fiches)
 *          ou si c'est la seule
 *
 * Auteur de l'exercice seulement (la RLS d'`exercise_versions` le tient aussi).
 */

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '#lib/server/middleware/auth.ts';
import { validateUuidParams } from '#lib/server/validation/params.ts';
import { updateVersionNoteSchema } from '#lib/server/validation/exercise-versions.ts';
import { requireExerciseAuthor } from '#lib/server/exercise-versions-access.ts';
import { deleteVersion, setVersionNote } from '#lib/server/exercise-versions.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('api/exercises/[id]/versions/[versionId]/+server');

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	const { user } = await requireRole(locals, 'teacher');
	const { id, versionId } = validateUuidParams(params, ['id', 'versionId']);

	const parsed = updateVersionNoteSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		throw error(400, parsed.error.issues[0]?.message ?? 'Données invalides');
	}
	await requireExerciseAuthor(locals.supabase, id, user.id);

	let version;
	try {
		version = await setVersionNote(locals.supabase, id, versionId, parsed.data.note);
	} catch (e) {
		logger.error('Note non modifiée :', e);
		throw error(500, 'Impossible de modifier la note');
	}
	if (!version) throw error(404, 'Version introuvable');
	return Response.json({ version });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const { user } = await requireRole(locals, 'teacher');
	const { id, versionId } = validateUuidParams(params, ['id', 'versionId']);
	await requireExerciseAuthor(locals.supabase, id, user.id);

	let result;
	try {
		result = await deleteVersion(locals.supabase, id, versionId);
	} catch (e) {
		logger.error('Version non supprimée :', e);
		throw error(500, 'Impossible de supprimer la version');
	}
	if (result.deleted) return Response.json({ success: true });

	switch (result.reason) {
		case 'not_found':
			throw error(404, 'Version introuvable');
		case 'only_version':
			throw error(409, 'C’est la seule version de l’exercice : elle ne se supprime pas');
		case 'in_use':
			throw error(
				409,
				result.worksheets.length > 0
					? `Cette version est utilisée par : ${result.worksheets.join(', ')}`
					: 'Cette version est utilisée par une fiche'
			);
	}
};
