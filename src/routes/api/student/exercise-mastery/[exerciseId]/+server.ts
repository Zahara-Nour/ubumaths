/**
 * PUT /api/student/exercise-mastery/[exerciseId]
 * ==============================================
 *
 * Create or update the mastery status for a specific exercise.
 * Uses UPSERT pattern for simplicity.
 *
 * AUTH: Student only
 *
 * URL PARAMS:
 * - exerciseId: UUID of the exercise
 *
 * REQUEST BODY:
 * {
 *   status: 'not_worked' | 'mastered' | 'needs_review'
 * }
 *
 * RESPONSE:
 * {
 *   success: true,
 *   exercise_id: string,
 *   status: MasteryStatus
 * }
 *
 * SECURITY:
 * - RLS policies ensure students can only modify their own records
 * - Validates exercise exists before creating mastery record
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import {
	validateExerciseIdParam,
	validateUpdateMastery
} from '$lib/server/validation/exercise-mastery';
import type { ExerciseMasteryUpdateResponse, MasteryStatus } from '$lib/types/exercise-mastery';

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	// Auth check: Must be a student
	const { user } = await requireRole(locals, 'student');

	// Validate URL parameter
	const paramValidation = validateExerciseIdParam(params);
	if (!paramValidation.success) {
		const errorMsg = paramValidation.error.issues
			.map((e) => `${e.path.join('.')}: ${e.message}`)
			.join('; ');
		throw error(400, `Parametre invalide: ${errorMsg}`);
	}

	const { exerciseId } = paramValidation.data;

	// Validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requete invalide (JSON attendu)');
	}

	const bodyValidation = validateUpdateMastery(body);
	if (!bodyValidation.success) {
		const errorMsg = bodyValidation.error.issues
			.map((e) => `${e.path.join('.')}: ${e.message}`)
			.join('; ');
		throw error(400, `Donnees invalides: ${errorMsg}`);
	}

	const { status } = bodyValidation.data;

	try {
		// Verify exercise exists
		const { data: exerciseExists, error: exerciseError } = await locals.supabase
			.from('exercises')
			.select('id')
			.eq('id', exerciseId)
			.maybeSingle();

		if (exerciseError) {
			console.error('[API] Error checking exercise existence:', exerciseError);
			throw error(500, "Erreur lors de la verification de l'exercice");
		}

		if (!exerciseExists) {
			throw error(404, 'Exercice non trouve');
		}

		// Upsert mastery record
		const { data: masteryRecord, error: upsertError } = await locals.supabase
			.from('student_exercise_mastery')
			.upsert(
				{
					student_id: user.id,
					exercise_id: exerciseId,
					status,
					updated_at: new Date().toISOString()
				},
				{
					onConflict: 'student_id,exercise_id'
				}
			)
			.select('exercise_id, status')
			.single();

		if (upsertError) {
			console.error('[API] Error upserting mastery:', upsertError);
			throw error(500, 'Erreur lors de la mise a jour du statut');
		}

		const response: ExerciseMasteryUpdateResponse = {
			success: true,
			exercise_id: masteryRecord.exercise_id,
			status: masteryRecord.status as MasteryStatus
		};

		return json(response);
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[API] Unexpected error in PUT /api/student/exercise-mastery/[exerciseId]:', err);
		throw error(500, 'Une erreur inattendue est survenue');
	}
};
