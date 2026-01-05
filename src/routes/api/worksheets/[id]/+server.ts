/**
 * API Route: /api/worksheets/[id]
 * GET - Get worksheet with sections and exercises
 * PUT - Update worksheet
 * DELETE - Delete worksheet (draft only)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import {
	validateUpdateWorksheet,
	worksheetDetailResponseSchema,
	deleteWorksheetResponseSchema
} from '$lib/server/validation/worksheets';
import { uuidSchema } from '$lib/server/validation/common';
import { validateJsonResponse } from '$lib/server/validation/response-utils';

type ZodIssue = { path: (string | number)[]; message: string };

/**
 * Verify worksheet exists and user has permission to access it
 * Returns the worksheet if found and authorized
 */
async function getWorksheetWithAuth(
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

	// Fetch worksheet
	const { data: worksheet, error: dbError } = await supabase
		.from('worksheets')
		.select('*')
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
 * GET /api/worksheets/[id]
 * Get worksheet with sections, exercises and template
 * Teachers and admins only
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	const worksheet = await getWorksheetWithAuth(
		locals.supabase,
		params.id,
		user.id,
		profile.role as string,
		profile.school_id
	);

	// Fetch sections
	const { data: sections, error: sectionsError } = await locals.supabase
		.from('worksheet_sections')
		.select('*')
		.eq('worksheet_id', worksheet.id)
		.order('position', { ascending: true });

	if (sectionsError) {
		console.error('Failed to fetch sections:', sectionsError);
		throw error(500, 'Failed to fetch worksheet sections');
	}

	// Fetch exercises with joined exercise data
	const { data: exercises, error: exercisesError } = await locals.supabase
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
		.eq('worksheet_id', worksheet.id)
		.order('position', { ascending: true });

	if (exercisesError) {
		console.error('Failed to fetch exercises:', exercisesError);
		throw error(500, 'Failed to fetch worksheet exercises');
	}

	// Fetch template if template_id exists
	let template = null;
	if (worksheet.template_id) {
		const { data: templateData, error: templateError } = await locals.supabase
			.from('worksheet_templates')
			.select('id, name, description')
			.eq('id', worksheet.template_id)
			.single();

		if (!templateError && templateData) {
			template = templateData;
		}
	}

	// Validate response
	const validated = validateJsonResponse(
		worksheetDetailResponseSchema,
		{
			worksheet: {
				...worksheet,
				sections: sections ?? [],
				exercises: exercises ?? [],
				template
			}
		},
		'GET /api/worksheets/[id]'
	);

	return json(validated);
};

/**
 * PUT /api/worksheets/[id]
 * Update worksheet
 * Teachers and admins only
 */
export const PUT: RequestHandler = async ({ locals, params, request }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	// Verify worksheet exists and user has permission
	const existingWorksheet = await getWorksheetWithAuth(
		locals.supabase,
		params.id,
		user.id,
		profile.role as string,
		profile.school_id
	);

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const validation = validateUpdateWorksheet(body);
	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation failed: ${errorMsg}`);
	}

	const data = validation.data;

	// Build update object with only provided fields
	const updateData: Record<string, unknown> = {};

	if (data.title !== undefined) updateData.title = data.title;
	if (data.description !== undefined) updateData.description = data.description;
	if (data.type !== undefined) updateData.type = data.type;
	if (data.config !== undefined) updateData.config = data.config;
	if (data.template_id !== undefined) updateData.template_id = data.template_id;
	if (data.estimated_duration_minutes !== undefined)
		updateData.estimated_duration_minutes = data.estimated_duration_minutes;
	if (data.total_points !== undefined) updateData.total_points = data.total_points;
	if (data.grades !== undefined) updateData.grades = data.grades;
	if (data.tags !== undefined) updateData.tags = data.tags;

	// Handle status changes with timestamps
	if (data.status !== undefined) {
		updateData.status = data.status;

		if (data.status === 'published' && existingWorksheet.status !== 'published') {
			updateData.published_at = new Date().toISOString();
		}

		if (data.status === 'archived' && existingWorksheet.status !== 'archived') {
			updateData.archived_at = new Date().toISOString();
		}
	}

	// Only proceed if there are fields to update
	if (Object.keys(updateData).length === 0) {
		throw error(400, 'No fields provided for update');
	}

	// Update worksheet
	const { data: worksheet, error: dbError } = await locals.supabase
		.from('worksheets')
		.update(updateData)
		.eq('id', params.id)
		.select()
		.single();

	if (dbError) {
		console.error('Failed to update worksheet:', dbError);
		throw error(500, 'Failed to update worksheet');
	}

	return json({ worksheet });
};

/**
 * DELETE /api/worksheets/[id]
 * Delete worksheet (draft only)
 * Teachers and admins only
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	// Verify worksheet exists and user has permission
	const worksheet = await getWorksheetWithAuth(
		locals.supabase,
		params.id,
		user.id,
		profile.role as string,
		profile.school_id
	);

	// Only draft worksheets can be deleted
	if (worksheet.status !== 'draft') {
		throw error(
			400,
			`Cannot delete worksheet with status '${worksheet.status}'. Only draft worksheets can be deleted.`
		);
	}

	// Delete worksheet (cascade will handle sections and exercises)
	const { error: dbError } = await locals.supabase.from('worksheets').delete().eq('id', params.id);

	if (dbError) {
		console.error('Failed to delete worksheet:', dbError);
		throw error(500, 'Failed to delete worksheet');
	}

	// Validate response
	const validated = validateJsonResponse(
		deleteWorksheetResponseSchema,
		{
			success: true as const,
			message: 'Worksheet deleted successfully'
		},
		'DELETE /api/worksheets/[id]'
	);

	return json(validated);
};
