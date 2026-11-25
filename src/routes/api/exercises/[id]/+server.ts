/**
 * API Route: /api/exercises/[id]
 * GET - Get exercise by ID
 * PUT - Update exercise
 * DELETE - Delete exercise
 */

import { error } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import {
	getExercise,
	updateExercise,
	deleteExercise,
	EXERCISE_NOT_DELETED
} from '#lib/server/exercises.ts';
import type { Database } from '#lib/types/database.ts';
import { validateUpdateExercise } from '#lib/server/validation/index.ts';
import { requireRole } from '#lib/server/middleware/auth.ts';
import { validateUuidParam } from '#lib/server/validation/params.ts';
import {
	SEARCH_INDEXED_REQUIRES_PUBLIC_MESSAGE,
	isSearchIndexedViolation
} from '#lib/server/exercise-search-indexed.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('api/exercises/[id]/+server');

/** La version à modifier, seule clé lue ici ; les autres sont validées par l'exercice */
const versionTargetSchema = z.object({ version_id: z.string().uuid().optional() });

type ExerciseUpdate = Database['public']['Tables']['exercises']['Update'];
type ZodIssue = { path: (string | number)[]; message: string };

/**
 * GET /api/exercises/[id]
 * Get exercise by ID
 * Teachers only
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	await requireRole(locals, 'teacher');

	const { id } = params;

	// Fetch exercise
	const result = await getExercise(locals.supabase, id);

	if (result.error || !result.data) {
		throw error(404, 'Exercice introuvable');
	}

	return Response.json({ exercise: result.data });
};

/**
 * PUT /api/exercises/[id]
 * Update exercise
 * Only the creator can update
 */
export const PUT: RequestHandler = async ({ locals, params, request }) => {
	const { user } = await requireRole(locals, 'teacher');

	const { id } = params;

	// Parse and validate update data. `version_id` (facultatif) : la version modifiée sur place,
	// la dernière par défaut (ADR 0044) ; le reste est l'exercice.
	const rawBody: unknown = await request.json();
	const versionParse = versionTargetSchema.safeParse(rawBody);
	if (!versionParse.success) throw error(400, 'Version invalide');
	const { version_id: _versionId, ...body } = rawBody as Record<string, unknown>;
	const validation = validateUpdateExercise(body);

	if (!validation.success) {
		// « Privé + Google » : le message français seul, lisible tel quel par le professeur
		if (validation.error.issues.some((i) => i.message === SEARCH_INDEXED_REQUIRES_PUBLIC_MESSAGE)) {
			throw error(400, SEARCH_INDEXED_REQUIRES_PUBLIC_MESSAGE);
		}
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Données invalides : ${errorMsg}`);
	}

	const data = validation.data as Omit<ExerciseUpdate, 'id' | 'created_by' | 'created_at'>;

	// Update exercise
	const result = await updateExercise(
		locals.supabase,
		id,
		data,
		user.id,
		versionParse.data.version_id
	);

	if (result.error) {
		if (result.error.message === 'Unauthorized') {
			throw error(403, 'Seul l’auteur de l’exercice peut le modifier');
		}
		if (result.error.message === 'Exercise not found') {
			throw error(404, 'Exercice introuvable');
		}
		// Version absente, ou d'un autre exercice (`save_exercise_with_version`)
		if ((result.error as { code?: string }).code === 'P0002') {
			throw error(404, 'Version introuvable');
		}
		// « Privé + Google » : refus métier ou contrainte de la base (23514)
		if (isSearchIndexedViolation(result.error)) {
			throw error(400, SEARCH_INDEXED_REQUIRES_PUBLIC_MESSAGE);
		}
		logger.error('Failed to update exercise:', result.error);
		throw error(500, 'Impossible de modifier l’exercice');
	}

	return Response.json({ exercise: result.data });
};

/**
 * DELETE /api/exercises/[id]
 * Delete exercise
 * Only the creator can delete
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	const id = validateUuidParam(params.id);
	const { user } = await requireRole(locals, 'teacher');

	// Delete exercise
	const result = await deleteExercise(locals.supabase, id, user.id);

	if (result.error) {
		if (result.error.message === 'Unauthorized') {
			throw error(403, 'Seul l’auteur de l’exercice peut le supprimer');
		}
		if (result.error.message === 'Exercise not found') {
			throw error(404, 'Exercice introuvable');
		}
		// La base n'a supprimé aucune ligne (refus RLS silencieux) : jamais un succès.
		if (result.error.message === EXERCISE_NOT_DELETED) {
			throw error(403, 'La suppression de l’exercice a été refusée');
		}
		logger.error('Failed to delete exercise:', result.error);
		throw error(500, 'Impossible de supprimer l’exercice');
	}

	return Response.json({ success: true });
};
