/**
 * GET /api/student/worksheets/[assignmentId]
 * ===========================================
 *
 * Returns the detailed view of a worksheet assignment with resolved exercises.
 * Exercises are resolved with deterministic parameters based on student ID.
 *
 * AUTH: Student only (must have access to the assignment)
 *
 * PARAMS:
 * - assignmentId: UUID of the worksheet assignment
 *
 * RESPONSE:
 * {
 *   assignment_id: string,
 *   worksheet_id: string,
 *   title: string,
 *   description: string | null,
 *   type: WorksheetType,
 *   instructions: string | null,
 *   available_from: string,
 *   closes_at: string | null,
 *   show_corrections: boolean,
 *   class_name: string | null,
 *   exercises: StudentExerciseView[]
 * }
 *
 * SECURITY:
 * - Access verified via resolveAssignmentAccess (can_access_assignment, puis
 *   can_read_assignment pour la relecture d'un ancien membre)
 * - Only active assignments with available_from <= NOW are accessible
 * - Correction visibility respects assignment and exercise settings
 *
 * COPIE DE L'ÉLÈVE (ADR 0023) :
 * - Recalculée à chaque lecture par `resolveWorksheetExerciseCopy` : version
 *   d'après le niveau de guidage de l'affectation (jamais tirée), valeurs
 *   d'après la graine de l'affectation (et de l'élève si elle est
 *   individualisée). Rien n'est lu dans `worksheet_instances`.
 * - Fiche qui mélange ses exercices : `exercises` dans l'ordre de la copie
 *   (`copyExerciseOrder`) et `shuffled: true`.
 */

import { exerciseCapitalPairs } from '$lib/questions/capital-pairs';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { resolveAssignmentAccess } from '$lib/server/worksheets/assignment-access';
import { loadAuthorStyleTemplate } from '$lib/server/worksheets/worksheet-styles';
import {
	validateStudentWorksheetParam,
	studentWorksheetDetailResponseSchema
} from '$lib/server/validation/worksheets';
import { validateJsonResponse } from '$lib/server/validation/response-utils';
import { fetchAssignmentClasses } from '$lib/server/worksheets/assignment-classes';
import { getCorrectionVisibilityMap } from '$lib/server/worksheets/correction-visibility';
import type { ExerciseResource } from '$lib/exercises/types';
import {
	assignmentCopyScope,
	copyExerciseOrder,
	resolveWorksheetExerciseCopy,
	type ExerciseContentRow
} from '$lib/worksheets/worksheet-copy';
import {
	localizedText,
	asRowTranslations,
	worksheetLocale,
	asWorksheetConfig,
	viewTypeOptions,
	type RowTranslations
} from '$lib/types/worksheets';
import type {
	StudentExerciseView,
	StudentWorksheetView,
	StudentSectionView,
	WorksheetType
} from '$lib/types/worksheets';
import { worksheetHeader } from '$lib/worksheets/worksheet-header';
import { estimateAnswerFrames } from '$lib/worksheets/document/answer-frames';
import {
	resolveAnswerFrames,
	toAnswerFrameLines
} from '$lib/worksheets/document/answer-frame-lines';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/student/worksheets/[assignmentId]/+server');

// ============================================================================
// TYPES
// ============================================================================

/**
 * Exercise data from database query: its content (the copy is computed from
 * it) and what the student view carries alongside.
 */
interface ExerciseData extends ExerciseContentRow {
	title: string | null;
	/** Supplementary resources (videos, PDFs, links) */
	resources: ExerciseResource[] | null;
	/** Generic function names for math parsing */
	generic_functions: string[] | null;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export const GET: RequestHandler = async ({ locals, params }) => {
	// Auth check: Must be a student
	const { user } = await requireRole(locals, 'student');

	// Validate assignment ID parameter
	const paramValidation = validateStudentWorksheetParam(params);
	if (!paramValidation.success) {
		throw error(400, 'ID de devoir invalide');
	}

	const { assignmentId } = paramValidation.data;

	try {
		// Deux droits distincts : écrire (adhésion active) et relire (ancien
		// membre revenant sur ce qui lui avait été distribué). Le module dit
		// lequel s'applique ; une panne y lève un 500, jamais un refus.
		const { canRead, readOnly } = await resolveAssignmentAccess(locals.supabase, assignmentId);

		if (!canRead) {
			// Generic error to avoid information disclosure (don't reveal if assignment exists)
			throw error(404, 'Devoir non trouve');
		}

		// Fetch assignment with worksheet details
		const { data: assignment, error: assignmentError } = await locals.supabase
			.from('worksheet_assignments')
			.select(
				`
				id,
				worksheet_id,
				guidance_level,
				individualized,
				instructions,
				available_from,
				closes_at,
				show_corrections,
				worksheets!inner (
					id,
					title,
					description,
					type,
					config,
					translations,
					style_id,
					created_by,
					total_points,
					estimated_duration_minutes
				)
			`
			)
			.eq('id', assignmentId)
			.single();

		if (assignmentError || !assignment) {
			logger.error('[API] Error fetching assignment:', assignmentError);
			throw error(404, 'Devoir non trouve');
		}

		// Helper to extract first element from join result (can be array or object)
		const getFirstOrSelf = <T>(val: T | T[]): T => (Array.isArray(val) ? val[0] : val);

		const worksheet = getFirstOrSelf(
			assignment.worksheets as unknown as {
				id: string;
				title: string;
				description: string | null;
				type: string;
				config: Record<string, unknown>;
				translations: RowTranslations | null;
				style_id: string | null;
				created_by: string;
				total_points: number | null;
				estimated_duration_minutes: number | null;
			}
		);
		// La classe rapportée à l'élève est la SIENNE : la RLS ne lui montre de la
		// jonction que les lignes de ses propres classes. La colonne historique
		// nommait la première classe de l'affectation, dont il pouvait n'être pas
		// membre.
		const studentClass = (await fetchAssignmentClasses(locals.supabase, assignmentId))[0] ?? null;

		// Fetch worksheet exercises with exercise data (R4: include variations, shared, resources)
		const { data: worksheetExercises, error: exercisesError } = await locals.supabase
			.from('worksheet_exercises')
			.select(
				`
				id,
				position,
				points,
				custom_instructions,
				translations,
				correction_visible,
				variation_index,
				section_id,
				is_essential,
				answer_frame_lines,
				exercise:exercises (
					id,
					title,
					variables,
					shared,
					variations,
					resources,
					generic_functions,
					topic
				)
			`
			)
			.eq('worksheet_id', worksheet.id)
			.order('position', { ascending: true });

		if (exercisesError) {
			logger.error('[API] Error fetching exercises:', exercisesError);
			throw error(500, 'Erreur lors de la recuperation des exercices');
		}

		// Fetch worksheet sections
		const { data: sections, error: sectionsError } = await locals.supabase
			.from('worksheet_sections')
			.select('id, title, instructions, translations, position')
			.eq('worksheet_id', worksheet.id)
			.order('position', { ascending: true });

		if (sectionsError) {
			logger.error('[API] Error fetching sections:', sectionsError);
			// Non-blocking: sections are optional, continue without them
		}

		// Get exercise IDs for correction visibility check
		const exerciseIds = (worksheetExercises ?? []).map((we) => we.id);

		// Get correction visibility map
		const visibilityMap = await getCorrectionVisibilityMap(
			locals.supabase,
			assignmentId,
			exerciseIds
		);

		// Language of the whole sheet: exercise content and PDF chrome alike.
		const locale = worksheetLocale(asWorksheetConfig(worksheet.config));

		// La copie de CET élève pour CETTE affectation (ADR 0023)
		const copyScope = assignmentCopyScope(assignment, { studentId: user.id, locale });

		// Build exercises array
		const exercises: StudentExerciseView[] = [];

		// Option « mélanger les exercices » : l'ordre de CETTE copie, tiré comme
		// celui du PDF du prof (même fonction, même graine), sur les MÊMES lignes
		// que lui — avant d'écarter les exercices orphelins, sinon la permutation
		// de toute la section changerait. `null` : pas de mélange, l'ordre des
		// positions comme avant.
		const shuffledRows = copyExerciseOrder(
			worksheetExercises ?? [],
			sections ?? [],
			copyScope,
			worksheet.config
		);
		// Sections illisibles : tout tomberait hors section, avec une autre graine.
		// Mieux vaut une erreur qu'un ordre faux ; sans mélange, elles restent facultatives.
		if (sectionsError && shuffledRows) {
			throw error(500, 'Erreur lors de la recuperation des exercices');
		}

		// Réponses sur le sujet (ADR 0030, lots 3 et 4) : les cadres sont résolus
		// ici — réglage du prof, sinon estimation d'après le corrigé de la copie —
		// pour que l'élève dont la correction est masquée ait les mêmes cadres que
		// le prof. N'en partent que les lignes que le PDF imprime (audit S1)
		const typeOptions = viewTypeOptions(worksheet.config);
		const answersOnSheet = worksheetHeader(
			worksheet.type as WorksheetType,
			typeOptions
		).answersOnSheet;
		const answerFrameMode = typeOptions.answer_frames ?? 'question';

		for (const we of shuffledRows ?? worksheetExercises ?? []) {
			const exerciseData = getFirstOrSelf(we.exercise as unknown as ExerciseData | null);

			if (!exerciseData) {
				// Skip exercises without data (orphaned references)
				continue;
			}

			const copy = resolveWorksheetExerciseCopy(
				{ id: we.id, variation_index: we.variation_index, exercise: exerciseData },
				copyScope
			);
			const statement = copy.statement;
			const correction = copy.solution || null;
			const hints = copy.hints;

			// Determine if correction should be visible for this exercise
			const correctionVisible = visibilityMap.get(we.id) ?? false;

			// Build exercise view with optional hints and resources
			const exerciseView: StudentExerciseView = {
				id: we.id,
				exercise_id: exerciseData.id,
				title: exerciseData.title,
				position: we.position,
				points: we.points,
				custom_instructions: localizedText(
					we.custom_instructions,
					asRowTranslations(we.translations),
					'custom_instructions',
					locale
				),
				statement,
				correction: correctionVisible ? correction : null,
				correction_visible: correctionVisible,
				// Réponses seules : EXACTEMENT sous la condition de la correction
				answers: correctionVisible ? copy.answers || null : null,
				section_id: we.section_id ?? null,
				is_essential: we.is_essential ?? false
			};

			if (answersOnSheet) {
				exerciseView.printed_frame_lines = resolveAnswerFrames(
					estimateAnswerFrames(statement, correction),
					toAnswerFrameLines(we.answer_frame_lines),
					answerFrameMode
				);
			}

			// Fonctions déclarées, lues sur l'exercice : sans elles, le PDF imprime
			// `C'(x)` en erreur.
			if (exerciseData.generic_functions) {
				exerciseView.generic_functions = exerciseData.generic_functions;
			}

			// Sens de `AB` (longueur ou produit) résolu ici depuis le thème (Q-J) :
			// la vue reçoit le sens, pas le thème.
			exerciseView.capital_pairs = exerciseCapitalPairs(exerciseData.topic);

			// Add hints if present (from the version given)
			if (hints && hints.length > 0) {
				exerciseView.hints = hints;
			}

			// Add resources if present (from exercise definition)
			if (exerciseData.resources && exerciseData.resources.length > 0) {
				exerciseView.resources = exerciseData.resources;
			}

			exercises.push(exerciseView);
		}

		// Build sections array for response
		const sectionViews: StudentSectionView[] = (sections ?? []).map((s) => ({
			id: s.id,
			title: localizedText(s.title, asRowTranslations(s.translations), 'title', locale) ?? s.title,
			instructions: localizedText(
				s.instructions,
				asRowTranslations(s.translations),
				'instructions',
				locale
			),
			position: s.position
		}));

		// Build response
		const response: StudentWorksheetView = {
			assignment_id: assignment.id,
			worksheet_id: worksheet.id,
			title:
				localizedText(
					worksheet.title,
					asRowTranslations(worksheet.translations),
					'title',
					locale
				) ?? worksheet.title,
			// Drives both the exercise content and the chrome of the student PDF.
			language: locale,
			// Options du type de la fiche (ADR 0030) : l'en-tête et les points du PDF
			// suivent la même règle que pour le prof
			...viewTypeOptions(worksheet.config),
			description: worksheet.description,
			type: worksheet.type as WorksheetType,
			instructions: assignment.instructions,
			available_from: assignment.available_from,
			closes_at: assignment.closes_at,
			show_corrections: assignment.show_corrections ?? false,
			class_name: studentClass?.name || null,
			read_only: readOnly,
			...(shuffledRows ? { shuffled: true } : {}),
			exercises,
			sections: sectionViews,
			// Le style de la fiche et, pour un style de son auteur, sa mise en page
			// (D11) : l'accès de l'élève à l'affectation est vérifié plus haut
			style_id: worksheet.style_id,
			template: await loadAuthorStyleTemplate(worksheet),
			// Cartouche du gabarit, comme le PDF du prof
			total_points: worksheet.total_points,
			estimated_duration_minutes: worksheet.estimated_duration_minutes
		};

		// Validate response
		const validated = validateJsonResponse(
			studentWorksheetDetailResponseSchema,
			response,
			'GET /api/student/worksheets/[assignmentId]'
		);

		return json(validated);
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('[API] Unexpected error in GET /api/student/worksheets/[assignmentId]:', err);
		throw error(500, 'Une erreur inattendue est survenue');
	}
};
