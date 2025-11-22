/**
 * API Route: /api/worksheets/[id]/sections/[sectionId]
 * GET - Get a specific section
 * PUT - Update a section
 * DELETE - Delete a section
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import {
	validateUpdateWorksheetSection,
	worksheetSectionResponseSchema
} from '$lib/server/validation/worksheets';
import { uuidSchema } from '$lib/server/validation/common';
import { validateJsonResponse } from '$lib/server/validation/response-utils';

type ZodIssue = { path: (string | number)[]; message: string };

/**
 * Verify worksheet and section exist and user has permission
 */
async function verifyAccess(
	supabase: App.Locals['supabase'],
	worksheetId: string,
	sectionId: string,
	userId: string,
	role: string,
	schoolId: string | null
) {
	// Validate UUID formats
	const worksheetIdValidation = uuidSchema.safeParse(worksheetId);
	if (!worksheetIdValidation.success) {
		throw error(400, 'Invalid worksheet ID format');
	}

	const sectionIdValidation = uuidSchema.safeParse(sectionId);
	if (!sectionIdValidation.success) {
		throw error(400, 'Invalid section ID format');
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

	// Fetch section
	const { data: section, error: sectionError } = await supabase
		.from('worksheet_sections')
		.select('*')
		.eq('id', sectionId)
		.eq('worksheet_id', worksheetId)
		.single();

	if (sectionError || !section) {
		throw error(404, 'Section not found');
	}

	return { worksheet, section };
}

/**
 * GET /api/worksheets/[id]/sections/[sectionId]
 * Get a specific section
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	const { section } = await verifyAccess(
		locals.supabase,
		params.id,
		params.sectionId,
		user.id,
		profile.role as string,
		profile.school_id
	);

	const validated = validateJsonResponse(
		worksheetSectionResponseSchema,
		section,
		'GET /api/worksheets/[id]/sections/[sectionId]'
	);

	return json({ section: validated });
};

/**
 * PUT /api/worksheets/[id]/sections/[sectionId]
 * Update a section
 */
export const PUT: RequestHandler = async ({ locals, params, request }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	const { worksheet } = await verifyAccess(
		locals.supabase,
		params.id,
		params.sectionId,
		user.id,
		profile.role as string,
		profile.school_id
	);

	// Cannot modify published/archived worksheets
	if (worksheet.status !== 'draft') {
		throw error(
			400,
			`Cannot modify sections in worksheet with status '${worksheet.status}'. Only draft worksheets can be modified.`
		);
	}

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const validation = validateUpdateWorksheetSection(body);
	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation failed: ${errorMsg}`);
	}

	const data = validation.data;

	// Build update object
	const updateData: Record<string, unknown> = {};
	if (data.title !== undefined) updateData.title = data.title;
	if (data.instructions !== undefined) updateData.instructions = data.instructions;
	if (data.position !== undefined) updateData.position = data.position;
	if (data.points_total !== undefined) updateData.points_total = data.points_total;

	// Update section
	const { data: section, error: dbError } = await locals.supabase
		.from('worksheet_sections')
		.update(updateData)
		.eq('id', params.sectionId)
		.eq('worksheet_id', params.id)
		.select()
		.single();

	if (dbError) {
		console.error('Failed to update section:', dbError);
		throw error(500, 'Failed to update section');
	}

	const validated = validateJsonResponse(
		worksheetSectionResponseSchema,
		section,
		'PUT /api/worksheets/[id]/sections/[sectionId]'
	);

	return json({ section: validated });
};

/**
 * DELETE /api/worksheets/[id]/sections/[sectionId]
 * Delete a section (moves exercises to unsectioned)
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	const { worksheet } = await verifyAccess(
		locals.supabase,
		params.id,
		params.sectionId,
		user.id,
		profile.role as string,
		profile.school_id
	);

	// Cannot modify published/archived worksheets
	if (worksheet.status !== 'draft') {
		throw error(
			400,
			`Cannot delete sections in worksheet with status '${worksheet.status}'. Only draft worksheets can be modified.`
		);
	}

	// Move all exercises from this section to unsectioned (null section_id)
	const { error: moveError } = await locals.supabase
		.from('worksheet_exercises')
		.update({ section_id: null })
		.eq('section_id', params.sectionId)
		.eq('worksheet_id', params.id);

	if (moveError) {
		console.error('Failed to move exercises:', moveError);
		throw error(500, 'Failed to move exercises to unsectioned');
	}

	// Delete the section
	const { error: deleteError } = await locals.supabase
		.from('worksheet_sections')
		.delete()
		.eq('id', params.sectionId)
		.eq('worksheet_id', params.id);

	if (deleteError) {
		console.error('Failed to delete section:', deleteError);
		throw error(500, 'Failed to delete section');
	}

	return json({ success: true, message: 'Section deleted' });
};
