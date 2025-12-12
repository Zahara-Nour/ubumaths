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
 *   due_at: string | null,
 *   show_corrections: boolean,
 *   class_name: string | null,
 *   exercises: StudentExerciseView[]
 * }
 *
 * SECURITY:
 * - Access verified via can_access_assignment function
 * - Only active assignments with available_from <= NOW are accessible
 * - Correction visibility respects assignment and exercise settings
 *
 * INSTANCE RESOLUTION:
 * - If a worksheet_instance exists, uses pre-resolved data
 * - Otherwise, resolves dynamically using deterministic seed
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import {
	validateStudentWorksheetParam,
	studentWorksheetDetailResponseSchema
} from '$lib/server/validation/worksheets';
import { validateJsonResponse } from '$lib/server/validation/response-utils';
import { getCorrectionVisibilityMap } from '$lib/server/worksheets/correction-visibility';
import { resolveVariables, resolveText } from '$lib/custom-markdown';
import type { Variable } from '$lib/custom-markdown';
import type {
	StudentExerciseView,
	StudentWorksheetView,
	WorksheetType
} from '$lib/types/worksheets';

// ============================================================================
// SEED GENERATION
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
// EXERCISE RESOLUTION
// ============================================================================

interface ExerciseData {
	id: string;
	title: string | null;
	statement_md: string;
	solution_md: string | null;
	variables: unknown[] | null;
}

interface WorksheetExerciseData {
	id: string;
	position: number;
	points: number | null;
	custom_instructions: string | null;
	correction_visible: boolean;
	exercise: ExerciseData;
}

/**
 * Resolves an exercise with parameterized content using the given seed.
 */
function resolveExercise(
	worksheetExercise: WorksheetExerciseData,
	seed: number
): { statement: string; correction: string | null } {
	const exercise = worksheetExercise.exercise;

	// Prepare variables from exercise
	const variables: Variable[] = [];

	if (exercise.variables && Array.isArray(exercise.variables)) {
		for (const variable of exercise.variables) {
			if (
				typeof variable === 'object' &&
				variable !== null &&
				'name' in variable &&
				'expression' in variable
			) {
				variables.push({
					name: String((variable as { name: unknown }).name),
					expression: String((variable as { expression: unknown }).expression)
				});
			}
		}
	}

	// Resolve variables with the seed + position for uniqueness
	const resolvedVariables = resolveVariables(variables, seed + worksheetExercise.position);

	// Resolve statement and solution with parameters
	const statement = resolveText(exercise.statement_md, resolvedVariables);
	const correction = exercise.solution_md
		? resolveText(exercise.solution_md, resolvedVariables)
		: null;

	return { statement, correction };
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
		// Verify access using the helper function (checks RLS + timing)
		const { data: canAccess } = await locals.supabase.rpc('can_access_assignment', {
			p_assignment_id: assignmentId
		});

		if (!canAccess) {
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
				instructions,
				available_from,
				due_at,
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

		if (assignmentError || !assignment) {
			console.error('[API] Error fetching assignment:', assignmentError);
			throw error(404, 'Devoir non trouve');
		}

		const worksheet = assignment.worksheets as {
			id: string;
			title: string;
			description: string | null;
			type: string;
			config: Record<string, unknown>;
		};
		const classData = assignment.classes as { name: string } | null;

		// Fetch worksheet exercises with exercise data
		const { data: worksheetExercises, error: exercisesError } = await locals.supabase
			.from('worksheet_exercises')
			.select(
				`
				id,
				position,
				points,
				custom_instructions,
				correction_visible,
				exercise:exercises (
					id,
					title,
					statement_md,
					solution_md,
					variables
				)
			`
			)
			.eq('worksheet_id', worksheet.id)
			.order('position', { ascending: true });

		if (exercisesError) {
			console.error('[API] Error fetching exercises:', exercisesError);
			throw error(500, 'Erreur lors de la recuperation des exercices');
		}

		// Check if a pre-resolved instance exists
		const { data: existingInstance } = await locals.supabase
			.from('worksheet_instances')
			.select('instance_data')
			.eq('worksheet_id', worksheet.id)
			.eq('student_id', user.id)
			.maybeSingle();

		// Get exercise IDs for correction visibility check
		const exerciseIds = (worksheetExercises ?? []).map((we) => we.id);

		// Get correction visibility map
		const visibilityMap = await getCorrectionVisibilityMap(
			locals.supabase,
			assignmentId,
			exerciseIds
		);

		// Generate seed for exercise resolution
		const seed = generateSeed(worksheet.id, user.id);

		// Build exercises array
		const exercises: StudentExerciseView[] = [];

		for (const we of worksheetExercises ?? []) {
			const exerciseData = we.exercise as ExerciseData | null;

			if (!exerciseData) {
				// Skip exercises without data (orphaned references)
				continue;
			}

			// Check if we have pre-resolved data in instance
			let statement: string;
			let correction: string | null;

			if (existingInstance?.instance_data) {
				// Use pre-resolved instance data
				const instanceData = existingInstance.instance_data as {
					exercises?: Array<{
						exercise_id: string;
						statement: string;
						solution: string;
					}>;
				};
				const instanceExercise = instanceData.exercises?.find(
					(e) => e.exercise_id === exerciseData.id
				);

				if (instanceExercise) {
					statement = instanceExercise.statement;
					correction = instanceExercise.solution || null;
				} else {
					// Fallback to dynamic resolution
					const resolved = resolveExercise(
						{
							...we,
							exercise: exerciseData
						},
						seed
					);
					statement = resolved.statement;
					correction = resolved.correction;
				}
			} else {
				// No instance exists - resolve dynamically
				const resolved = resolveExercise(
					{
						...we,
						exercise: exerciseData
					},
					seed
				);
				statement = resolved.statement;
				correction = resolved.correction;
			}

			// Determine if correction should be visible for this exercise
			const correctionVisible = visibilityMap.get(we.id) ?? false;

			exercises.push({
				id: we.id,
				position: we.position,
				points: we.points,
				custom_instructions: we.custom_instructions,
				statement,
				correction: correctionVisible ? correction : null,
				correction_visible: correctionVisible
			});
		}

		// Build response
		const response: StudentWorksheetView = {
			assignment_id: assignment.id,
			worksheet_id: worksheet.id,
			title: worksheet.title,
			description: worksheet.description,
			type: worksheet.type as WorksheetType,
			instructions: assignment.instructions,
			available_from: assignment.available_from,
			due_at: assignment.due_at,
			show_corrections: assignment.show_corrections ?? false,
			class_name: classData?.name ?? null,
			exercises
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

		console.error('[API] Unexpected error in GET /api/student/worksheets/[assignmentId]:', err);
		throw error(500, 'Une erreur inattendue est survenue');
	}
};
