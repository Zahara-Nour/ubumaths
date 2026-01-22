/**
 * API Route: /api/worksheets/[id]/exercises/[exerciseId]
 * GET - Get a specific worksheet exercise
 * PUT - Update a worksheet exercise configuration
 * DELETE - Remove an exercise from the worksheet
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import {
	validateUpdateWorksheetExercise,
	worksheetExerciseResponseSchema
} from '$lib/server/validation/worksheets';
import { uuidSchema } from '$lib/server/validation/common';
import { validateJsonResponse } from '$lib/server/validation/response-utils';

type ZodIssue = { path: (string | number)[]; message: string };

/**
 * Verify worksheet and exercise exist and user has permission
 */
async function verifyAccess(
	supabase: App.Locals['supabase'],
	worksheetId: string,
	exerciseId: string,
	userId: string,
	role: string,
	schoolId: string | null
) {
	// Validate UUID formats
	const worksheetIdValidation = uuidSchema.safeParse(worksheetId);
	if (!worksheetIdValidation.success) {
		throw error(400, 'Invalid worksheet ID format');
	}

	const exerciseIdValidation = uuidSchema.safeParse(exerciseId);
	if (!exerciseIdValidation.success) {
		throw error(400, 'Invalid exercise ID format');
	}

	// Fetch worksheet
	const { data: worksheet, error: worksheetError } = await supabase
		.from('worksheets')
		.select('id, created_by, school_id, status')
		.eq('id', worksheetId)
		.single();

	if (worksheetError || !worksheet) {
		throw error(404, 'Worksheet not found');
	}

	// Verify ownership/authorization
	if (role === 'teacher' && worksheet.created_by !== userId) {
		throw error(403, 'Forbidden - Not your worksheet');
	}

	if (role === 'admin' && schoolId && worksheet.school_id !== schoolId) {
		throw error(403, 'Forbidden - Worksheet belongs to different school');
	}

	// Fetch worksheet exercise
	const { data: worksheetExercise, error: exerciseError } = await supabase
		.from('worksheet_exercises')
		.select('*')
		.eq('id', exerciseId)
		.eq('worksheet_id', worksheetId)
		.single();

	if (exerciseError || !worksheetExercise) {
		throw error(404, 'Exercise not found in this worksheet');
	}

	return { worksheet, worksheetExercise };
}

/**
 * GET /api/worksheets/[id]/exercises/[exerciseId]
 * Get a specific worksheet exercise
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	const { worksheetExercise } = await verifyAccess(
		locals.supabase,
		params.id,
		params.exerciseId,
		user.id,
		profile.role as string,
		profile.school_id
	);

	const validated = validateJsonResponse(
		worksheetExerciseResponseSchema,
		worksheetExercise,
		'GET /api/worksheets/[id]/exercises/[exerciseId]'
	);

	return json({ exercise: validated });
};

/**
 * PUT /api/worksheets/[id]/exercises/[exerciseId]
 * Update a worksheet exercise configuration
 */
export const PUT: RequestHandler = async ({ locals, params, request }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	const { worksheet } = await verifyAccess(
		locals.supabase,
		params.id,
		params.exerciseId,
		user.id,
		profile.role as string,
		profile.school_id
	);

	// Cannot modify published/archived worksheets
	if (worksheet.status !== 'draft') {
		throw error(
			400,
			`Cannot modify exercises in worksheet with status '${worksheet.status}'. Only draft worksheets can be modified.`
		);
	}

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const validation = validateUpdateWorksheetExercise(body);
	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation failed: ${errorMsg}`);
	}

	const data = validation.data;

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

	// Build update object
	const updateData: Record<string, unknown> = {};
	if (data.section_id !== undefined) updateData.section_id = data.section_id;
	if (data.position !== undefined) updateData.position = data.position;
	if (data.points !== undefined) updateData.points = data.points;
	if (data.variant_mode !== undefined) updateData.variant_mode = data.variant_mode;
	if (data.variant_config !== undefined) updateData.variant_config = data.variant_config;
	if (data.custom_instructions !== undefined)
		updateData.custom_instructions = data.custom_instructions;
	if (data.is_essential !== undefined) updateData.is_essential = data.is_essential;

	// Update exercise
	const { data: exerciseData, error: dbError } = await locals.supabase
		.from('worksheet_exercises')
		.update(updateData)
		.eq('id', params.exerciseId)
		.eq('worksheet_id', params.id)
		.select()
		.single();

	if (dbError) {
		console.error('Failed to update exercise:', dbError);
		throw error(500, 'Failed to update exercise');
	}

	const validated = validateJsonResponse(
		worksheetExerciseResponseSchema,
		exerciseData,
		'PUT /api/worksheets/[id]/exercises/[exerciseId]'
	);

	return json({ exercise: validated });
};

/**
 * DELETE /api/worksheets/[id]/exercises/[exerciseId]
 * Remove an exercise from the worksheet (does not delete the exercise itself)
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	const { worksheet } = await verifyAccess(
		locals.supabase,
		params.id,
		params.exerciseId,
		user.id,
		profile.role as string,
		profile.school_id
	);

	// Cannot modify published/archived worksheets
	if (worksheet.status !== 'draft') {
		throw error(
			400,
			`Cannot remove exercises from worksheet with status '${worksheet.status}'. Only draft worksheets can be modified.`
		);
	}

	// Delete the worksheet exercise record
	const { error: deleteError } = await locals.supabase
		.from('worksheet_exercises')
		.delete()
		.eq('id', params.exerciseId)
		.eq('worksheet_id', params.id);

	if (deleteError) {
		console.error('Failed to remove exercise:', deleteError);
		throw error(500, 'Failed to remove exercise from worksheet');
	}

	return json({ success: true, message: 'Exercise removed from worksheet' });
};
