/**
 * API Route: /api/worksheets/[id]/assignments/[assignmentId]/corrections
 *
 * Teacher API for managing correction visibility settings.
 *
 * GET - Get correction settings (global + per-exercise overrides)
 * PUT - Update correction settings (global, per-exercise, or bulk)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import {
	validateAssignmentParams,
	updateCorrectionSettingsSchema,
	updateExerciseCorrectionSchema,
	bulkUpdateExerciseCorrectionsSchema,
	correctionSettingsResponseSchema,
	updateCorrectionSettingsResponseSchema,
	updateExerciseCorrectionResponseSchema
} from '$lib/server/validation/worksheets';
import { validateJsonResponse } from '$lib/server/validation/response-utils';
import { z } from 'zod';

// ============================================================================
// REQUEST/RESPONSE SCHEMAS
// ============================================================================

const bulkUpdateResponseSchema = z.object({
	success: z.literal(true),
	updated_count: z.number().int().nonnegative()
});

// Union schema for PUT request body - validates all three update types
const putRequestSchema = z.union([
	updateCorrectionSettingsSchema,
	updateExerciseCorrectionSchema,
	bulkUpdateExerciseCorrectionsSchema
]);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Verify worksheet and assignment exist and user has permission
 * Returns the assignment if found and authorized
 */
async function verifyAssignmentAccess(
	supabase: App.Locals['supabase'],
	worksheetId: string,
	assignmentId: string,
	userId: string,
	role: string
) {
	// Validate UUID formats
	const paramsValidation = validateAssignmentParams({ id: worksheetId, assignmentId });
	if (!paramsValidation.success) {
		throw error(400, 'Format UUID invalide');
	}

	// Fetch worksheet with ownership check
	const { data: worksheet, error: worksheetError } = await supabase
		.from('worksheets')
		.select('id, created_by')
		.eq('id', worksheetId)
		.single();

	if (worksheetError || !worksheet) {
		throw error(404, 'Feuille de travail non trouvee');
	}

	// Verify ownership (teachers can only access their own worksheets)
	if (role === 'teacher' && worksheet.created_by !== userId) {
		throw error(403, 'Acces non autorise a cette feuille de travail');
	}

	// Fetch assignment and verify it belongs to this worksheet
	const { data: assignment, error: assignmentError } = await supabase
		.from('worksheet_assignments')
		.select('id, worksheet_id, created_by, show_corrections')
		.eq('id', assignmentId)
		.eq('worksheet_id', worksheetId)
		.single();

	if (assignmentError || !assignment) {
		throw error(404, 'Devoir non trouve');
	}

	// Additional ownership check for assignment
	if (role === 'teacher' && assignment.created_by !== userId) {
		throw error(403, 'Acces non autorise a ce devoir');
	}

	return { worksheet, assignment };
}

// ============================================================================
// GET HANDLER - Get correction settings
// ============================================================================

/**
 * GET /api/worksheets/[id]/assignments/[assignmentId]/corrections
 *
 * Returns global correction setting and per-exercise overrides
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	// Verify access and get assignment
	const { assignment } = await verifyAssignmentAccess(
		locals.supabase,
		params.id,
		params.assignmentId,
		user.id,
		profile.role as string
	);

	// Fetch per-exercise correction settings
	const { data: exerciseSettings, error: fetchError } = await locals.supabase
		.from('worksheet_assignment_exercise_settings')
		.select('worksheet_exercise_id, show_correction')
		.eq('assignment_id', params.assignmentId);

	if (fetchError) {
		console.error('Failed to fetch exercise settings:', fetchError);
		throw error(500, 'Erreur lors de la recuperation des parametres');
	}

	// Validate response
	const validated = validateJsonResponse(
		correctionSettingsResponseSchema,
		{
			show_corrections: assignment.show_corrections ?? false,
			exercise_settings: exerciseSettings ?? []
		},
		'GET /api/worksheets/[id]/assignments/[assignmentId]/corrections'
	);

	return json(validated);
};

// ============================================================================
// PUT HANDLER - Update correction settings
// ============================================================================

/**
 * PUT /api/worksheets/[id]/assignments/[assignmentId]/corrections
 *
 * Update correction settings. Supports three modes:
 * 1. Global update: { show_corrections: boolean }
 * 2. Per-exercise update: { worksheet_exercise_id: UUID, show_correction: boolean }
 * 3. Bulk update: { settings: [{ worksheet_exercise_id, show_correction }] }
 */
export const PUT: RequestHandler = async ({ locals, params, request }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	// Verify access
	await verifyAssignmentAccess(
		locals.supabase,
		params.id,
		params.assignmentId,
		user.id,
		profile.role as string
	);

	// Parse and validate request body with union schema
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps JSON invalide');
	}

	// Validate against union schema - ESLint requires Zod validation after request.json()
	const validation = putRequestSchema.safeParse(body);
	if (!validation.success) {
		throw error(
			400,
			'Corps de requete invalide: doit contenir show_corrections, worksheet_exercise_id, ou settings'
		);
	}

	const validatedData = validation.data;

	// Route to appropriate handler based on validated data shape
	if ('settings' in validatedData) {
		return handleBulkUpdate(locals, params.id, params.assignmentId, validatedData);
	}

	if ('worksheet_exercise_id' in validatedData) {
		return handleExerciseUpdate(locals, params.id, params.assignmentId, validatedData);
	}

	// Must be global update (has show_corrections)
	return handleGlobalUpdate(locals, params.assignmentId, validatedData);
};

// ============================================================================
// UPDATE HANDLERS
// ============================================================================

// Type aliases for validated data
type GlobalUpdateData = z.infer<typeof updateCorrectionSettingsSchema>;
type ExerciseUpdateData = z.infer<typeof updateExerciseCorrectionSchema>;
type BulkUpdateData = z.infer<typeof bulkUpdateExerciseCorrectionsSchema>;

/**
 * Handle global correction setting update
 */
async function handleGlobalUpdate(
	locals: App.Locals,
	assignmentId: string,
	data: GlobalUpdateData
) {
	const { show_corrections } = data;

	// Update the assignment's global correction setting
	const { error: updateError } = await locals.supabase
		.from('worksheet_assignments')
		.update({ show_corrections })
		.eq('id', assignmentId);

	if (updateError) {
		console.error('Failed to update correction settings:', updateError);
		throw error(500, 'Erreur lors de la mise a jour des parametres');
	}

	// Validate response
	const validated = validateJsonResponse(
		updateCorrectionSettingsResponseSchema,
		{
			success: true as const,
			show_corrections
		},
		'PUT /api/worksheets/[id]/assignments/[assignmentId]/corrections (global)'
	);

	return json(validated);
}

/**
 * Handle per-exercise correction setting update
 */
async function handleExerciseUpdate(
	locals: App.Locals,
	worksheetId: string,
	assignmentId: string,
	data: ExerciseUpdateData
) {
	const { worksheet_exercise_id, show_correction } = data;

	// Verify the exercise belongs to this worksheet
	const { data: exercise, error: exerciseError } = await locals.supabase
		.from('worksheet_exercises')
		.select('id')
		.eq('id', worksheet_exercise_id)
		.eq('worksheet_id', worksheetId)
		.single();

	if (exerciseError || !exercise) {
		throw error(404, 'Exercice non trouve dans cette feuille de travail');
	}

	// Upsert the exercise setting
	const { error: upsertError } = await locals.supabase
		.from('worksheet_assignment_exercise_settings')
		.upsert(
			{
				assignment_id: assignmentId,
				worksheet_exercise_id,
				show_correction
			},
			{ onConflict: 'assignment_id,worksheet_exercise_id' }
		);

	if (upsertError) {
		console.error('Failed to update exercise correction setting:', upsertError);
		throw error(500, 'Erreur lors de la mise a jour du parametre');
	}

	// Validate response
	const validated = validateJsonResponse(
		updateExerciseCorrectionResponseSchema,
		{
			success: true as const,
			worksheet_exercise_id,
			show_correction
		},
		'PUT /api/worksheets/[id]/assignments/[assignmentId]/corrections (exercise)'
	);

	return json(validated);
}

/**
 * Handle bulk exercise correction settings update
 */
async function handleBulkUpdate(
	locals: App.Locals,
	worksheetId: string,
	assignmentId: string,
	data: BulkUpdateData
) {
	const { settings } = data;

	// Extract all exercise IDs for validation
	const exerciseIds = settings.map((s) => s.worksheet_exercise_id);

	// Verify all exercises belong to this worksheet
	const { data: exercises, error: exercisesError } = await locals.supabase
		.from('worksheet_exercises')
		.select('id')
		.eq('worksheet_id', worksheetId)
		.in('id', exerciseIds);

	if (exercisesError) {
		console.error('Failed to verify exercises:', exercisesError);
		throw error(500, 'Erreur lors de la verification des exercices');
	}

	const validExerciseIds = new Set((exercises ?? []).map((e) => e.id));
	const invalidIds = exerciseIds.filter((id) => !validExerciseIds.has(id));

	if (invalidIds.length > 0) {
		throw error(
			400,
			`Certains exercices n'appartiennent pas a cette feuille de travail: ${invalidIds.length} ID(s) invalide(s)`
		);
	}

	// Prepare upsert data
	const upsertData = settings.map((s) => ({
		assignment_id: assignmentId,
		worksheet_exercise_id: s.worksheet_exercise_id,
		show_correction: s.show_correction
	}));

	// Bulk upsert
	const { error: upsertError } = await locals.supabase
		.from('worksheet_assignment_exercise_settings')
		.upsert(upsertData, { onConflict: 'assignment_id,worksheet_exercise_id' });

	if (upsertError) {
		console.error('Failed to bulk update exercise settings:', upsertError);
		throw error(500, 'Erreur lors de la mise a jour des parametres');
	}

	// Validate response
	const validated = validateJsonResponse(
		bulkUpdateResponseSchema,
		{
			success: true as const,
			updated_count: settings.length
		},
		'PUT /api/worksheets/[id]/assignments/[assignmentId]/corrections (bulk)'
	);

	return json(validated);
}
