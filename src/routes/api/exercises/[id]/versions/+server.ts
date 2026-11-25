/**
 * API Route: /api/exercises/[id]/versions — versions d'un exercice (ADR 0044)
 * GET  - les versions, chacune avec les fiches qui l'utilisent
 * POST - « Nouvelle version » : recopie de la dernière, note facultative
 *
 * Auteur de l'exercice seulement (la RLS d'`exercise_versions` le tient aussi).
 */

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '#lib/server/middleware/auth.ts';
import { validateUuidParam } from '#lib/server/validation/params.ts';
import { createVersionSchema } from '#lib/server/validation/exercise-versions.ts';
import { requireExerciseAuthor } from '#lib/server/exercise-versions-access.ts';
import { createNextVersion, listVersionsWithUsage } from '#lib/server/exercise-versions.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('api/exercises/[id]/versions/+server');

export const GET: RequestHandler = async ({ locals, params }) => {
	const { user } = await requireRole(locals, 'teacher');
	const id = validateUuidParam(params.id);
	await requireExerciseAuthor(locals.supabase, id, user.id);

	try {
		return Response.json({ versions: await listVersionsWithUsage(locals.supabase, id) });
	} catch (e) {
		logger.error('Versions illisibles :', e);
		throw error(500, 'Impossible de charger les versions');
	}
};

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { user } = await requireRole(locals, 'teacher');
	const id = validateUuidParam(params.id);

	const parsed = createVersionSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		throw error(400, parsed.error.issues[0]?.message ?? 'Données invalides');
	}
	await requireExerciseAuthor(locals.supabase, id, user.id);

	try {
		const version = await createNextVersion(locals.supabase, id, parsed.data.note);
		return Response.json({ version }, { status: 201 });
	} catch (e) {
		logger.error('Version non créée :', e);
		throw error(500, 'Impossible de créer la nouvelle version');
	}
};
