/**
 * API endpoint for worksheet variant preview
 * ===========================================
 *
 * Allows teachers to preview what students will see with resolved parameters
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import {
	generatePreviewInstance,
	GENERATION_EXERCISE_FIELDS
} from '$lib/server/worksheets/instance-generator';
import type { WorksheetExerciseWithExercise } from '$lib/types/worksheets';
import { asWorksheetConfig, toWorksheetExerciseRow } from '$lib/types/worksheets';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/worksheets/[id]/preview/+server');

// Input validation schema
const previewRequestSchema = z.object({
	studentId: z.string().uuid().optional(),
	variantSeed: z.number().int().min(0).max(2147483647).optional()
});

export const POST: RequestHandler = async ({ params, request, locals: { supabase, user } }) => {
	try {
		// Authenticate user
		if (!user) {
			return error(401, 'Connexion requise');
		}

		// Validate worksheet ID
		const worksheetId = params.id;
		if (!worksheetId) {
			return error(400, 'Identifiant de fiche requis');
		}

		// Parse and validate request body
		const validation = previewRequestSchema.safeParse(await request.json());
		if (!validation.success) {
			return error(400, validation.error.issues[0].message);
		}

		const { studentId, variantSeed } = validation.data;

		// Check if user is a teacher (has permission to preview)
		const { data: profile, error: profileError } = await supabase
			.from('profiles')
			.select('role, school_id')
			.eq('id', user.id)
			.single();

		// PGRST116 = pas de profil, et le refus qui suit est légitime. Toute AUTRE
		// panne produisait le même refus, indiscernable d'un refus mérité.
		if (profileError && profileError.code !== 'PGRST116') {
			logger.error('Rôle illisible :', profileError);
			return error(500, 'Impossible de vérifier les droits d’accès');
		}

		if (!profile || profile.role !== 'teacher') {
			return error(403, 'Aperçu des variantes réservé aux professeurs');
		}

		// Fetch worksheet details
		const { data: worksheet, error: worksheetError } = await supabase
			.from('worksheets')
			.select(
				`
				id,
				title,
				config,
				created_by,
				school_id
			`
			)
			.eq('id', worksheetId)
			.single();

		if (worksheetError || !worksheet) {
			return error(404, 'Fiche introuvable');
		}

		// Check if user has access to this worksheet
		// (either creator or from same school)
		const hasAccess =
			worksheet.created_by === user.id ||
			(worksheet.school_id && profile.school_id === worksheet.school_id);

		if (!hasAccess) {
			return error(403, 'Accès refusé à cette fiche');
		}

		// Fetch worksheet exercises with exercise details
		const { data: worksheetExercises, error: exercisesError } = await supabase
			.from('worksheet_exercises')
			.select(
				`
				*,
				exercise:exercises (${GENERATION_EXERCISE_FIELDS})
			`
			)
			.eq('worksheet_id', worksheetId)
			.order('section_id', { ascending: true, nullsFirst: true })
			.order('position', { ascending: true });

		if (exercisesError) {
			logger.error('Error fetching exercises:', exercisesError);
			return error(500, 'Impossible de charger les exercices de la fiche');
		}

		if (!worksheetExercises || worksheetExercises.length === 0) {
			return json({
				instanceData: {
					exercises: [],
					variant_info: {
						seed: 0,
						version: 'Preview'
					}
				},
				worksheet: {
					id: worksheet.id,
					title: worksheet.title
				}
			});
		}

		// If a specific student is provided, fetch their details
		let studentInfo = null;
		if (studentId) {
			const { data: student, error: studentError } = await supabase
				.from('profiles')
				.select('id, firstname, lastname')
				.eq('id', studentId)
				.single();

			// Enrichissement d'affichage : son absence ne ferme pas l'écran, mais elle
			// laisse une trace.
			if (studentError) {
				logger.error('Enrichissement illisible :', studentError);
			}

			if (student) {
				studentInfo = {
					id: student.id,
					name: `${student.firstname || ''} ${student.lastname || ''}`.trim() || 'Élève inconnu'
				};
			}
		}

		// Generate the preview instance
		const instanceData = generatePreviewInstance({
			worksheetId,
			studentId,
			variantSeed,
			// Colonnes plus permissives en base qu'en type métier.
			exercises: (worksheetExercises ?? []).map((we) => ({
				...toWorksheetExerciseRow(we),
				exercise: we.exercise
			})) as WorksheetExerciseWithExercise[],
			config: asWorksheetConfig(worksheet.config)
		});

		// Return the preview data
		return json({
			instanceData,
			worksheet: {
				id: worksheet.id,
				title: worksheet.title,
				config: worksheet.config
			},
			student: studentInfo,
			metadata: {
				generatedAt: new Date().toISOString(),
				totalExercises: instanceData.exercises.length,
				variantMode: worksheetExercises[0]?.variant_mode || 'none',
				seed: variantSeed || instanceData.variant_info?.seed
			}
		});
	} catch (err) {
		logger.error('Error generating worksheet preview:', err);
		return error(500, err instanceof Error ? err.message : 'Une erreur inattendue s’est produite');
	}
};
