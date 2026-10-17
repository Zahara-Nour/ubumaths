/**
 * GET /api/worksheets/assignments/[assignmentId]/preview
 * ======================================================
 *
 * Teacher preview endpoint - shows worksheet as student would see it.
 * Allows teachers to preview their assignments before/after distribution.
 *
 * AUTH: Teacher (assignment creator) or Admin only
 *
 * QUERY PARAMS:
 * - studentId (optional): UUID of a student to simulate their view —
 *   EXACTEMENT sa copie, la même que celle de l'API élève (ADR 0023).
 *   Absent : la copie de la classe (sans élève), au niveau de l'affectation.
 *
 * RESPONSE:
 * Same format as /api/student/worksheets/[assignmentId]:
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
 *   exercises: StudentExerciseView[],
 *   // Additional preview metadata:
 *   preview_mode: 'teacher' | 'student',
 *   preview_student_id: string | null,
 *   preview_student_name: string | null
 * }
 *
 * SECURITY:
 * - Only assignment creator or admin can access
 * - If studentId provided, must be a valid student in the assignment
 */

import { exerciseCapitalPairs } from '$lib/questions/capital-pairs';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { getCorrectionVisibilityMap } from '$lib/server/worksheets/correction-visibility';
import {
	fetchAssignmentClasses,
	formatClassNames
} from '$lib/server/worksheets/assignment-classes';
import type { ExerciseResource } from '$lib/exercises/types';
import {
	assignmentCopyScope,
	copyExerciseOrder,
	hasPerStudentCopies,
	resolveWorksheetExerciseCopy,
	type ExerciseContentRow,
	type WorksheetForCopy
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
	StudentSectionView,
	StudentWorksheetView,
	WorksheetType
} from '$lib/types/worksheets';
import { isStudentOfAssignment } from '$lib/server/worksheets/assignment-recipients';
import { loadAuthorStyleTemplate } from '$lib/server/worksheets/worksheet-styles';
import { worksheetHeader } from '$lib/worksheets/worksheet-header';
import { estimateAnswerFrames } from '$lib/worksheets/document/answer-frames';
import {
	resolveAnswerFrames,
	toAnswerFrameLines
} from '$lib/worksheets/document/answer-frame-lines';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/worksheets/assignments/[assignmentId]/preview/+server');

// ============================================================================
// VALIDATION
// ============================================================================

const previewQuerySchema = z.object({
	studentId: z.string().uuid('Identifiant d’élève invalide').optional(),
	/**
	 * Vue prof d'une affectation dont chaque élève a sa version (D6) : l'élève
	 * dont la copie sert de référence (corrections toutes visibles, nom non servi)
	 */
	copyOf: z.string().uuid('Identifiant d’élève invalide').optional()
});

const assignmentParamSchema = z.object({
	assignmentId: z.string().uuid('Identifiant d’affectation invalide')
});

// ============================================================================
// TYPES (same as student API)
// ============================================================================

interface ExerciseData extends ExerciseContentRow {
	title: string | null;
	resources: ExerciseResource[] | null;
	generic_functions: string[] | null;
}

// ============================================================================
// ACCESS VERIFICATION
// ============================================================================

async function verifyTeacherAccess(
	supabase: App.Locals['supabase'],
	assignmentId: string,
	userId: string
): Promise<{ assignment: { id: string; created_by: string; worksheet_id: string } }> {
	// Fetch assignment
	const { data: assignment, error: fetchError } = await supabase
		.from('worksheet_assignments')
		.select('id, created_by, worksheet_id')
		.eq('id', assignmentId)
		.single();

	if (fetchError || !assignment) {
		throw error(404, 'Affectation introuvable');
	}

	// Check permissions
	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', userId)
		.single();

	// PGRST116 = pas de profil, et le refus qui suit est légitime. Toute AUTRE
	// panne produisait le même refus, indiscernable d'un refus mérité.
	if (profileError && profileError.code !== 'PGRST116') {
		logger.error('Rôle illisible :', profileError);
		throw error(500, 'Impossible de vérifier les droits d’accès');
	}

	const isCreator = assignment.created_by === userId;
	const isAdmin = profile?.role === 'admin';

	if (!isCreator && !isAdmin) {
		throw error(403, 'Accès refusé');
	}

	return { assignment };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export const GET: RequestHandler = async ({ locals, params, url }) => {
	// Auth check
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw error(401, 'Connexion requise');
	}

	// Validate assignment ID parameter
	const paramValidation = assignmentParamSchema.safeParse({
		assignmentId: params.assignmentId
	});

	if (!paramValidation.success) {
		throw error(400, paramValidation.error.issues[0].message);
	}

	const { assignmentId } = paramValidation.data;

	// Validate query params
	const studentIdParam = url.searchParams.get('studentId');
	const queryValidation = previewQuerySchema.safeParse({
		studentId: studentIdParam || undefined,
		copyOf: url.searchParams.get('copyOf') || undefined
	});

	if (!queryValidation.success) {
		throw error(400, queryValidation.error.issues[0].message);
	}

	const { studentId, copyOf } = queryValidation.data;

	try {
		// Verify teacher access
		const { assignment: _assignment } = await verifyTeacherAccess(
			locals.supabase,
			assignmentId,
			user.id
		);

		// If studentId provided, verify they have access to this assignment
		let previewStudentName: string | null = null;
		if (studentId) {
			// Nommément désigné, ou membre actif d'une classe visée
			const isRecipient = await isStudentOfAssignment(locals.supabase, assignmentId, studentId);

			if (!isRecipient) {
				throw error(400, 'Cet élève n’a pas accès à cette affectation');
			}

			// Get student name for display
			const { data: studentProfile, error: studentProfileError } = await locals.supabase
				.from('profiles')
				.select('firstname, lastname')
				.eq('id', studentId)
				.single();

			// Le nom n'est qu'un ornement d'affichage : le repli existe déjà.
			if (studentProfileError && studentProfileError.code !== 'PGRST116') {
				logger.error('Nom illisible :', studentProfileError);
			}

			if (studentProfile) {
				previewStudentName = [studentProfile.firstname, studentProfile.lastname]
					.filter(Boolean)
					.join(' ');
			}
		}

		// Fetch assignment with worksheet details
		const { data: fullAssignment, error: assignmentError } = await locals.supabase
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
					template_id,
					created_by,
					total_points,
					estimated_duration_minutes
				)
			`
			)
			.eq('id', assignmentId)
			.single();

		if (assignmentError || !fullAssignment) {
			logger.error('[Preview API] Error fetching assignment:', assignmentError);
			throw error(404, 'Affectation introuvable');
		}

		const getFirstOrSelf = <T>(val: T | T[]): T => (Array.isArray(val) ? val[0] : val);

		const worksheet = getFirstOrSelf(
			fullAssignment.worksheets as unknown as {
				id: string;
				title: string;
				description: string | null;
				type: string;
				config: Record<string, unknown>;
				translations: RowTranslations | null;
				style_id: string | null;
				template_id: string | null;
				created_by: string;
				total_points: number | null;
				estimated_duration_minutes: number | null;
			}
		);
		// Les classes visées, lues dans la jonction. Cet endpoint est réservé au
		// créateur et aux administrateurs (`verifyTeacherAccess` plus haut), qui les
		// voient donc toutes ; la colonne historique n'en nommait qu'une.
		const targetClasses = await fetchAssignmentClasses(locals.supabase, assignmentId);

		// Fetch worksheet exercises
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
			logger.error('[Preview API] Error fetching exercises:', exercisesError);
			throw error(500, 'Impossible de charger les exercices');
		}

		// Fetch worksheet sections
		const { data: sections, error: sectionsError } = await locals.supabase
			.from('worksheet_sections')
			.select('id, title, instructions, translations, position')
			.eq('worksheet_id', worksheet.id)
			.order('position', { ascending: true });

		if (sectionsError) {
			logger.error('[Preview API] Error fetching sections:', sectionsError);
			// Non-blocking: sections are optional
		}

		const isTeacherMode = !studentId;

		// Language of the whole sheet: exercise content and PDF chrome alike.
		const locale = worksheetLocale(asWorksheetConfig(worksheet.config));

		// Chaque élève a-t-il sa version (valeurs ou ordre) ? La vue prof
		// s'appuie alors sur la copie d'un élève choisi (`copyOf`, D6), comme le
		// corrigé de classe ; sans choix, la copie de la classe et la réponse le
		// dit (l'écran choisit alors le premier élève de la liste).
		const perStudentCopies = hasPerStudentCopies(
			{
				...worksheet,
				worksheet_exercises: worksheetExercises ?? []
			} as unknown as WorksheetForCopy,
			assignmentCopyScope(fullAssignment)
		);
		const referenceStudentId = isTeacherMode && perStudentCopies ? copyOf : undefined;
		if (
			referenceStudentId &&
			!(await isStudentOfAssignment(locals.supabase, assignmentId, referenceStudentId))
		) {
			throw error(400, 'Cet élève n’a pas accès à cette affectation');
		}

		// La copie de l'élève choisi (ou de l'élève de référence), sinon celle de
		// la classe : le même calcul que l'API élève (ADR 0023)
		const copyScope = assignmentCopyScope(fullAssignment, {
			studentId: studentId ?? referenceStudentId,
			locale
		});

		// Get correction visibility map (for student mode)
		const exerciseIds = (worksheetExercises ?? []).map((we) => we.id);
		const visibilityMap = isTeacherMode
			? null // Teacher always sees corrections
			: await getCorrectionVisibilityMap(locals.supabase, assignmentId, exerciseIds);

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
			throw error(500, 'Impossible de charger les exercices');
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
				continue;
			}

			const copy = resolveWorksheetExerciseCopy(
				{ id: we.id, variation_index: we.variation_index, exercise: exerciseData },
				copyScope
			);
			const resolved = {
				statement: copy.statement,
				correction: copy.solution || null,
				answers: copy.answers || null,
				hints: copy.hints
			};

			// In teacher mode, always show corrections
			// In student simulation mode, respect visibility settings
			const correctionVisible = isTeacherMode ? true : (visibilityMap?.get(we.id) ?? false);

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
				statement: resolved.statement,
				correction: correctionVisible ? resolved.correction : null,
				correction_visible: correctionVisible,
				// Réponses seules : EXACTEMENT sous la condition de la correction
				answers: correctionVisible ? resolved.answers : null,
				section_id: we.section_id ?? null,
				is_essential: we.is_essential ?? false
			};

			if (answersOnSheet) {
				exerciseView.printed_frame_lines = resolveAnswerFrames(
					estimateAnswerFrames(resolved.statement, resolved.correction),
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

			if (resolved.hints && resolved.hints.length > 0) {
				exerciseView.hints = resolved.hints;
			}

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

		// Build response with preview metadata
		const response: StudentWorksheetView & {
			preview_mode: 'teacher' | 'student';
			preview_student_id: string | null;
			preview_student_name: string | null;
			per_student_copies: boolean;
		} = {
			assignment_id: fullAssignment.id,
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
			instructions: fullAssignment.instructions,
			available_from: fullAssignment.available_from,
			closes_at: fullAssignment.closes_at,
			show_corrections: isTeacherMode ? true : (fullAssignment.show_corrections ?? false),
			class_name: formatClassNames(targetClasses),
			// L'aperçu est le geste du professeur : il n'est jamais en
			// consultation seule, ce mode ne concerne que l'élève archivé.
			read_only: false,
			...(shuffledRows ? { shuffled: true } : {}),
			exercises,
			sections: sectionViews,
			// Le style et la mise en page exactement comme l'élève les reçoit (D11) ;
			// l'accès du prof à l'affectation est vérifié plus haut
			style_id: worksheet.style_id,
			template_id: worksheet.template_id,
			template: await loadAuthorStyleTemplate(worksheet),
			// Cartouche du gabarit, comme le PDF du prof
			total_points: worksheet.total_points,
			estimated_duration_minutes: worksheet.estimated_duration_minutes,
			// Preview metadata
			preview_mode: isTeacherMode ? 'teacher' : 'student',
			preview_student_id: studentId ?? null,
			preview_student_name: previewStudentName,
			// Chaque élève a sa version : la vue prof est la copie d'un élève (D6)
			per_student_copies: perStudentCopies
		};

		return json(response);
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('[Preview API] Unexpected error:', err);
		throw error(500, 'Une erreur inattendue s’est produite');
	}
};
