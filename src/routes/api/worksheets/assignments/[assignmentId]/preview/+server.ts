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
 * - studentId (optional): UUID of a student to simulate their view
 *   If not provided, uses a fixed seed for "teacher preview" mode
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

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { getCorrectionVisibilityMap } from '$lib/server/worksheets/correction-visibility';
import { generateExerciseInstance } from '$lib/exercises/generator/instance-generator';
import type { Exercise, ExerciseResource, ExerciseHint } from '$lib/exercises/types';
import { getExerciseContentSafe } from '$lib/exercises/types';
import type { Variable } from '$lib/ubumark';
import type { ExerciseVariation, SharedExerciseDefaults } from '$lib/exercises/types';
import type {
	StudentExerciseView,
	StudentSectionView,
	StudentWorksheetView,
	WorksheetType
} from '$lib/types/worksheets';

// ============================================================================
// VALIDATION
// ============================================================================

const previewQuerySchema = z.object({
	studentId: z.string().uuid('Invalid student ID format').optional()
});

const assignmentParamSchema = z.object({
	assignmentId: z.string().uuid("ID d'assignation invalide")
});

// ============================================================================
// SEED GENERATION (same as student API)
// ============================================================================

/**
 * Generates a deterministic seed based on worksheet ID and student ID.
 * Ensures each student gets consistent exercise variations.
 */
function generateSeed(worksheetId: string, studentId: string): number {
	const baseString = `${worksheetId}-${studentId}`;
	let hash = 0;
	for (let i = 0; i < baseString.length; i++) {
		const char = baseString.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash);
}

// ============================================================================
// TYPES (same as student API)
// ============================================================================

interface ExerciseData {
	id: string;
	title: string | null;
	statement_md: string;
	solution_md: string | null;
	variables: Variable[] | null;
	shared: SharedExerciseDefaults | null;
	variations: ExerciseVariation[] | null;
	resources: ExerciseResource[] | null;
	generic_functions: string[] | null;
	tags: string[] | null;
}

interface WorksheetExerciseData {
	id: string;
	position: number;
	points: number | null;
	custom_instructions: string | null;
	correction_visible: boolean;
	variation_index: number | null;
	exercise: ExerciseData;
}

interface ResolvedExerciseResult {
	statement: string;
	correction: string | null;
	hints?: ExerciseHint[];
}

// ============================================================================
// EXERCISE RESOLUTION (same as student API)
// ============================================================================

function resolveExercise(
	worksheetExercise: WorksheetExerciseData,
	seed: number
): ResolvedExerciseResult {
	const exercise = worksheetExercise.exercise;

	const template: Exercise = {
		id: exercise.id,
		title: exercise.title ?? undefined,
		variables: exercise.variables ?? undefined,
		shared: exercise.shared ?? undefined,
		variations: exercise.variations ?? undefined,
		distribution_mode: 'on_demand',
		category: 'application',
		tags: [],
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		created_by: 'system'
	};

	const result = generateExerciseInstance(template, {
		seed: seed + worksheetExercise.position,
		parseAST: false,
		variationIndex: worksheetExercise.variation_index ?? undefined
	});

	if (!result.success) {
		const errorMessage = result.errors?.join(', ') ?? 'Unknown error';
		console.error(`[Preview API] Failed to resolve exercise ${exercise.id}: ${errorMessage}`);
		// Fallback: use content from variations (single source of truth)
		const content = getExerciseContentSafe(template);
		return {
			statement: content.statement_md,
			correction: content.solution_md
		};
	}

	const instance = result.instance;
	if (!instance) {
		// Fallback: use content from variations (single source of truth)
		const content = getExerciseContentSafe(template);
		return {
			statement: content.statement_md,
			correction: content.solution_md
		};
	}

	return {
		statement: instance.statement_md,
		correction: instance.solution_md || null,
		hints: instance.resolvedHints
	};
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
		throw error(404, 'Assignation non trouvee');
	}

	// Check permissions
	const { data: profile } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', userId)
		.single();

	const isCreator = assignment.created_by === userId;
	const isAdmin = profile?.role === 'admin';

	if (!isCreator && !isAdmin) {
		throw error(403, 'Acces non autorise');
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
		throw error(401, 'Non authentifie');
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
		studentId: studentIdParam || undefined
	});

	if (!queryValidation.success) {
		throw error(400, queryValidation.error.issues[0].message);
	}

	const { studentId } = queryValidation.data;

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
			// Check individual assignment first (simple query)
			const { data: individualAccess } = await locals.supabase
				.from('worksheet_assignment_students')
				.select('id')
				.eq('assignment_id', assignmentId)
				.eq('student_id', studentId)
				.maybeSingle();

			// If not individually assigned, check class membership
			let hasClassAccess = false;
			if (!individualAccess) {
				// Get assigned class IDs
				const { data: assignedClasses } = await locals.supabase
					.from('worksheet_assignment_classes')
					.select('class_id')
					.eq('assignment_id', assignmentId);

				if (assignedClasses && assignedClasses.length > 0) {
					const classIds = assignedClasses.map((ac) => ac.class_id);

					// Check if student is member of any assigned class
					const { data: membership } = await locals.supabase
						.from('class_members')
						.select('id')
						.eq('student_id', studentId)
						.eq('status', 'active')
						.in('class_id', classIds)
						.limit(1)
						.maybeSingle();

					hasClassAccess = !!membership;
				}
			}

			if (!individualAccess && !hasClassAccess) {
				throw error(400, "Cet eleve n'a pas acces a cette assignation");
			}

			// Get student name for display
			const { data: studentProfile } = await locals.supabase
				.from('profiles')
				.select('firstname, lastname')
				.eq('id', studentId)
				.single();

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
				instructions,
				available_from,
				closes_at,
				show_corrections,
				class_id,
				worksheets!inner (
					id,
					title,
					description,
					type,
					config
				),
				classes (
					name
				)
			`
			)
			.eq('id', assignmentId)
			.single();

		if (assignmentError || !fullAssignment) {
			console.error('[Preview API] Error fetching assignment:', assignmentError);
			throw error(404, 'Devoir non trouve');
		}

		const getFirstOrSelf = <T>(val: T | T[]): T => (Array.isArray(val) ? val[0] : val);

		const worksheet = getFirstOrSelf(
			fullAssignment.worksheets as unknown as {
				id: string;
				title: string;
				description: string | null;
				type: string;
				config: Record<string, unknown>;
			}
		);
		const classData = getFirstOrSelf(fullAssignment.classes as unknown as { name: string } | null);

		// Fetch worksheet exercises
		const { data: worksheetExercises, error: exercisesError } = await locals.supabase
			.from('worksheet_exercises')
			.select(
				`
				id,
				position,
				points,
				custom_instructions,
				correction_visible,
				variation_index,
				section_id,
				is_essential,
				exercise:exercises (
					id,
					title,
					variables,
					shared,
					variations,
					resources,
					generic_functions,
					tags
				)
			`
			)
			.eq('worksheet_id', worksheet.id)
			.order('position', { ascending: true });

		if (exercisesError) {
			console.error('[Preview API] Error fetching exercises:', exercisesError);
			throw error(500, 'Erreur lors de la recuperation des exercices');
		}

		// Fetch worksheet sections
		const { data: sections, error: sectionsError } = await locals.supabase
			.from('worksheet_sections')
			.select('id, title, instructions, position')
			.eq('worksheet_id', worksheet.id)
			.order('position', { ascending: true });

		if (sectionsError) {
			console.error('[Preview API] Error fetching sections:', sectionsError);
			// Non-blocking: sections are optional
		}

		// Determine preview mode and seed
		const isTeacherMode = !studentId;
		const seedId = studentId || 'teacher-preview';
		const seed = generateSeed(worksheet.id, seedId);

		// Get correction visibility map (for student mode)
		const exerciseIds = (worksheetExercises ?? []).map((we) => we.id);
		const visibilityMap = isTeacherMode
			? null // Teacher always sees corrections
			: await getCorrectionVisibilityMap(locals.supabase, assignmentId, exerciseIds);

		// Build exercises array
		const exercises: StudentExerciseView[] = [];

		for (const we of worksheetExercises ?? []) {
			const exerciseData = getFirstOrSelf(we.exercise as unknown as ExerciseData | null);

			if (!exerciseData) {
				continue;
			}

			const resolved = resolveExercise(
				{
					...we,
					exercise: exerciseData
				},
				seed
			);

			// In teacher mode, always show corrections
			// In student simulation mode, respect visibility settings
			const correctionVisible = isTeacherMode ? true : (visibilityMap?.get(we.id) ?? false);

			const exerciseView: StudentExerciseView = {
				id: we.id,
				exercise_id: exerciseData.id,
				title: exerciseData.title,
				position: we.position,
				points: we.points,
				custom_instructions: we.custom_instructions,
				statement: resolved.statement,
				correction: correctionVisible ? resolved.correction : null,
				correction_visible: correctionVisible,
				section_id: we.section_id ?? null,
				is_essential: we.is_essential ?? false
			};

			if (resolved.hints && resolved.hints.length > 0) {
				exerciseView.hints = resolved.hints;
			}

			if (exerciseData.resources && exerciseData.resources.length > 0) {
				exerciseView.resources = exerciseData.resources;
			}

			if (exerciseData.tags && exerciseData.tags.length > 0) {
				exerciseView.tags = exerciseData.tags;
			}

			exercises.push(exerciseView);
		}

		// Build sections array for response
		const sectionViews: StudentSectionView[] = (sections ?? []).map((s) => ({
			id: s.id,
			title: s.title,
			instructions: s.instructions,
			position: s.position
		}));

		// Build response with preview metadata
		const response: StudentWorksheetView & {
			preview_mode: 'teacher' | 'student';
			preview_student_id: string | null;
			preview_student_name: string | null;
		} = {
			assignment_id: fullAssignment.id,
			worksheet_id: worksheet.id,
			title: worksheet.title,
			description: worksheet.description,
			type: worksheet.type as WorksheetType,
			instructions: fullAssignment.instructions,
			available_from: fullAssignment.available_from,
			closes_at: fullAssignment.closes_at,
			show_corrections: isTeacherMode ? true : (fullAssignment.show_corrections ?? false),
			class_name: classData?.name ?? null,
			exercises,
			sections: sectionViews,
			// Preview metadata
			preview_mode: isTeacherMode ? 'teacher' : 'student',
			preview_student_id: studentId ?? null,
			preview_student_name: previewStudentName
		};

		return json(response);
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[Preview API] Unexpected error:', err);
		throw error(500, 'Une erreur inattendue est survenue');
	}
};
