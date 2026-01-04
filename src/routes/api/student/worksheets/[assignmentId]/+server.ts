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
 * - Access verified via can_access_assignment function
 * - Only active assignments with available_from <= NOW are accessible
 * - Correction visibility respects assignment and exercise settings
 *
 * INSTANCE RESOLUTION:
 * - If a worksheet_instance exists, uses pre-resolved data
 * - Otherwise, resolves dynamically using generateExerciseInstance
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
import { generateExerciseInstance } from '$lib/exercises/generator/instance-generator';
import type { Exercise, ExerciseResource, ExerciseHint } from '$lib/exercises/types';
import { getExerciseContentSafe } from '$lib/exercises/types';
import type { Variable } from '$lib/ubumark';
import type { ExerciseVariation, SharedExerciseDefaults } from '$lib/exercises/types';
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
// TYPES
// ============================================================================

/**
 * Exercise data from database query (strongly typed)
 */
interface ExerciseData {
	id: string;
	title: string | null;
	statement_md: string;
	solution_md: string | null;
	variables: Variable[] | null;
	shared: SharedExerciseDefaults | null;
	variations: ExerciseVariation[] | null;
	/** Supplementary resources (videos, PDFs, links) */
	resources: ExerciseResource[] | null;
	/** Generic function names for math parsing */
	generic_functions: string[] | null;
	/** Exercise tags for categorization */
	tags: string[] | null;
}

interface WorksheetExerciseData {
	id: string;
	position: number;
	points: number | null;
	custom_instructions: string | null;
	correction_visible: boolean;
	/**
	 * Teacher control (R3): Force specific variation index.
	 * If null, variation is selected based on seed.
	 * If set, overrides seed-based selection for all students.
	 */
	variation_index: number | null;
	exercise: ExerciseData;
}

// ============================================================================
// EXERCISE RESOLUTION
// ============================================================================

/**
 * Result of resolving an exercise instance
 */
interface ResolvedExerciseResult {
	statement: string;
	correction: string | null;
	/** Hints from the selected variation (if applicable) */
	hints?: ExerciseHint[];
}

/**
 * Resolves an exercise using the central exercise generator.
 * Supports variations and AST parsing.
 */
function resolveExercise(
	worksheetExercise: WorksheetExerciseData,
	seed: number
): ResolvedExerciseResult {
	const exercise = worksheetExercise.exercise;

	// Convert to Exercise template for the generator
	const template: Exercise = {
		id: exercise.id,
		title: exercise.title ?? undefined,
		variables: exercise.variables ?? undefined,
		shared: exercise.shared ?? undefined,
		variations: exercise.variations ?? undefined,
		distribution_mode: 'on_demand',
		difficulty: 1,
		tags: [],
		// Audit fields (not used by generator but required by type)
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		created_by: 'system'
	};

	// Use the central generator with the seed + position for uniqueness
	// Variation selection (R3): Pass teacher-forced index if set
	const result = generateExerciseInstance(template, {
		seed: seed + worksheetExercise.position,
		parseAST: false, // Don't parse AST for student view (performance)
		variationIndex: worksheetExercise.variation_index ?? undefined
	});

	if (!result.success) {
		const errorMessage = result.errors?.join(', ') ?? 'Unknown error';
		console.error(`[API] Failed to resolve exercise ${exercise.id}: ${errorMessage}`);
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

		if (assignmentError || !assignment) {
			console.error('[API] Error fetching assignment:', assignmentError);
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
			}
		);
		const classData = getFirstOrSelf(assignment.classes as unknown as { name: string } | null);

		// Fetch worksheet exercises with exercise data (R4: include variations, shared, resources)
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
				exercise:exercises (
					id,
					title,
					statement_md,
					solution_md,
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
			const exerciseData = getFirstOrSelf(we.exercise as unknown as ExerciseData | null);

			if (!exerciseData) {
				// Skip exercises without data (orphaned references)
				continue;
			}

			// Check if we have pre-resolved data in instance
			let statement: string;
			let correction: string | null;
			let hints: ExerciseHint[] | undefined;

			if (existingInstance?.instance_data) {
				// Use pre-resolved instance data
				const instanceData = existingInstance.instance_data as {
					exercises?: Array<{
						exercise_id: string;
						statement: string;
						solution: string;
						hints?: ExerciseHint[];
					}>;
				};
				const instanceExercise = instanceData.exercises?.find(
					(e) => e.exercise_id === exerciseData.id
				);

				if (instanceExercise) {
					statement = instanceExercise.statement;
					correction = instanceExercise.solution || null;
					hints = instanceExercise.hints;
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
					hints = resolved.hints;
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
				hints = resolved.hints;
			}

			// Determine if correction should be visible for this exercise
			const correctionVisible = visibilityMap.get(we.id) ?? false;

			// Build exercise view with optional hints and resources
			const exerciseView: StudentExerciseView = {
				id: we.id,
				exercise_id: exerciseData.id,
				title: exerciseData.title,
				position: we.position,
				points: we.points,
				custom_instructions: we.custom_instructions,
				statement,
				correction: correctionVisible ? correction : null,
				correction_visible: correctionVisible
			};

			// Add hints if present (from variation or instance)
			if (hints && hints.length > 0) {
				exerciseView.hints = hints;
			}

			// Add resources if present (from exercise definition)
			if (exerciseData.resources && exerciseData.resources.length > 0) {
				exerciseView.resources = exerciseData.resources;
			}

			// Add tags if present
			if (exerciseData.tags && exerciseData.tags.length > 0) {
				exerciseView.tags = exerciseData.tags;
			}

			exercises.push(exerciseView);
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
			closes_at: assignment.closes_at,
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
