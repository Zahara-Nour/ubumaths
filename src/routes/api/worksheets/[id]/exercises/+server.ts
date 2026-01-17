/**
 * API Route: /api/worksheets/[id]/exercises
 * GET - List exercises in a worksheet
 * POST - Add an exercise to the worksheet
 * PUT - Reorder exercises in the worksheet
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import {
	validateCreateWorksheetExercise,
	validateReorderExercises,
	worksheetExercisesResponseSchema,
	createWorksheetExerciseResponseSchema,
	reorderExercisesResponseSchema
} from '$lib/server/validation/worksheets';
import { uuidSchema } from '$lib/server/validation/common';
import { validateJsonResponse } from '$lib/server/validation/response-utils';

type ZodIssue = { path: (string | number)[]; message: string };

/**
 * Verify worksheet exists and user has permission to access it
 * Returns the worksheet if found and authorized
 */
async function verifyWorksheetAccess(
	supabase: App.Locals['supabase'],
	worksheetId: string,
	userId: string,
	role: string,
	schoolId: string | null
) {
	// Validate UUID format
	const idValidation = uuidSchema.safeParse(worksheetId);
	if (!idValidation.success) {
		throw error(400, 'Invalid worksheet ID format');
	}

	// Fetch worksheet (only need id and ownership fields)
	const { data: worksheet, error: dbError } = await supabase
		.from('worksheets')
		.select('id, created_by, school_id, status')
		.eq('id', worksheetId)
		.single();

	if (dbError || !worksheet) {
		throw error(404, 'Worksheet not found');
	}

	// Verify ownership/authorization
	if (role === 'teacher' && worksheet.created_by !== userId) {
		throw error(403, 'Forbidden - Not your worksheet');
	}

	if (role === 'admin' && schoolId && worksheet.school_id !== schoolId) {
		throw error(403, 'Forbidden - Worksheet belongs to different school');
	}

	return worksheet;
}

/**
 * GET /api/worksheets/[id]/exercises
 * List all exercises in a worksheet with joined exercise data
 * Teachers and admins only
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	// Verify worksheet access
	await verifyWorksheetAccess(
		locals.supabase,
		params.id,
		user.id,
		profile.role as string,
		profile.school_id
	);

	// Fetch worksheet exercises with joined exercise data
	const { data: exercises, error: dbError } = await locals.supabase
		.from('worksheet_exercises')
		.select(
			`
			*,
			exercise:exercises (
				id,
				title,
				difficulty,
				variables,
				shared,
				variations
			)
		`
		)
		.eq('worksheet_id', params.id)
		.order('position', { ascending: true });

	if (dbError) {
		console.error('Failed to fetch exercises:', dbError);
		throw error(500, 'Failed to fetch exercises');
	}

	// Validate response
	const validated = validateJsonResponse(
		worksheetExercisesResponseSchema,
		{ exercises: exercises ?? [] },
		'GET /api/worksheets/[id]/exercises'
	);

	return json(validated);
};

/**
 * POST /api/worksheets/[id]/exercises
 * Add an exercise to the worksheet
 * Teachers and admins only
 */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	// Verify worksheet access
	const worksheet = await verifyWorksheetAccess(
		locals.supabase,
		params.id,
		user.id,
		profile.role as string,
		profile.school_id
	);

	// Cannot modify published/archived worksheets
	if (worksheet.status !== 'draft') {
		throw error(
			400,
			`Cannot add exercises to worksheet with status '${worksheet.status}'. Only draft worksheets can be modified.`
		);
	}

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const validation = validateCreateWorksheetExercise(body);
	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation failed: ${errorMsg}`);
	}

	const data = validation.data;

	// Verify the exercise exists
	const { data: exerciseExists, error: exerciseError } = await locals.supabase
		.from('exercises')
		.select('id')
		.eq('id', data.exercise_id)
		.single();

	if (exerciseError || !exerciseExists) {
		throw error(404, 'Exercise not found');
	}

	// Verify section exists if provided
	if (data.section_id) {
		const { data: sectionExists, error: sectionError } = await locals.supabase
			.from('worksheet_sections')
			.select('id')
			.eq('id', data.section_id)
			.eq('worksheet_id', params.id)
			.single();

		if (sectionError || !sectionExists) {
			throw error(404, 'Section not found in this worksheet');
		}
	}

	// Create worksheet exercise
	const { data: worksheetExercise, error: dbError } = await locals.supabase
		.from('worksheet_exercises')
		.insert({
			worksheet_id: params.id,
			exercise_id: data.exercise_id,
			section_id: data.section_id ?? null,
			position: data.position,
			points: data.points ?? null,
			variant_mode: data.variant_mode ?? 'none',
			variant_config: data.variant_config ?? {},
			custom_instructions: data.custom_instructions ?? null
		})
		.select()
		.single();

	if (dbError) {
		console.error('Failed to add exercise to worksheet:', dbError);

		// Handle duplicate exercise in worksheet
		if (dbError.code === '23505') {
			throw error(400, 'This exercise is already in the worksheet at this position');
		}

		throw error(500, 'Failed to add exercise to worksheet');
	}

	// Validate response
	const validated = validateJsonResponse(
		createWorksheetExerciseResponseSchema,
		{ exercise: worksheetExercise },
		'POST /api/worksheets/[id]/exercises'
	);

	return json(validated, { status: 201 });
};

/**
 * PUT /api/worksheets/[id]/exercises
 * Reorder exercises in the worksheet
 * Teachers and admins only
 */
export const PUT: RequestHandler = async ({ locals, params, request }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	// Verify worksheet access
	const worksheet = await verifyWorksheetAccess(
		locals.supabase,
		params.id,
		user.id,
		profile.role as string,
		profile.school_id
	);

	// Cannot modify published/archived worksheets
	if (worksheet.status !== 'draft') {
		throw error(
			400,
			`Cannot reorder exercises in worksheet with status '${worksheet.status}'. Only draft worksheets can be modified.`
		);
	}

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const validation = validateReorderExercises(body);
	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation failed: ${errorMsg}`);
	}

	const { exercises } = validation.data;

	// Verify all exercises belong to this worksheet
	const exerciseIds = exercises.map((e) => e.id);
	const { data: existingExercises, error: fetchError } = await locals.supabase
		.from('worksheet_exercises')
		.select('id')
		.eq('worksheet_id', params.id)
		.in('id', exerciseIds);

	if (fetchError) {
		console.error('Failed to verify exercises:', fetchError);
		throw error(500, 'Failed to verify exercises');
	}

	const existingIds = new Set(existingExercises?.map((e) => e.id) ?? []);
	const invalidIds = exerciseIds.filter((id) => !existingIds.has(id));

	if (invalidIds.length > 0) {
		throw error(400, `Some exercises do not belong to this worksheet: ${invalidIds.join(', ')}`);
	}

	// Use RPC for atomic update in a single transaction
	// This avoids unique constraint conflicts and is much more efficient
	const { data: updatedCount, error: rpcError } = await locals.supabase.rpc(
		'reorder_worksheet_exercises',
		{
			p_worksheet_id: params.id,
			p_exercises: exercises.map((e) => ({
				id: e.id,
				new_position: e.position,
				new_section_id: e.section_id ?? null
			}))
		}
	);

	if (rpcError) {
		console.error('Failed to reorder exercises:', rpcError);
		throw error(500, rpcError.message || 'Failed to reorder exercises');
	}

	// Validate response
	const count = updatedCount ?? exercises.length;
	const validated = validateJsonResponse(
		reorderExercisesResponseSchema,
		{
			success: true as const,
			message: `Reordered ${count} exercises`,
			updated_count: count
		},
		'PUT /api/worksheets/[id]/exercises'
	);

	return json(validated);
};
