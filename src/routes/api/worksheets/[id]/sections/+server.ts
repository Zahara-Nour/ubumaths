/**
 * API Route: /api/worksheets/[id]/sections
 * GET - List sections for a worksheet
 * POST - Create a new section
 * PUT - Reorder sections in the worksheet
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import {
	validateCreateWorksheetSection,
	validateReorderSections,
	worksheetSectionsResponseSchema,
	createSectionResponseSchema,
	reorderSectionsResponseSchema
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
 * GET /api/worksheets/[id]/sections
 * List all sections for a worksheet
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

	// Fetch sections
	const { data: sections, error: dbError } = await locals.supabase
		.from('worksheet_sections')
		.select('*')
		.eq('worksheet_id', params.id)
		.order('position', { ascending: true });

	if (dbError) {
		console.error('Failed to fetch sections:', dbError);
		throw error(500, 'Failed to fetch sections');
	}

	// Validate response
	const validated = validateJsonResponse(
		worksheetSectionsResponseSchema,
		{ sections: sections ?? [] },
		'GET /api/worksheets/[id]/sections'
	);

	return json(validated);
};

/**
 * POST /api/worksheets/[id]/sections
 * Create a new section in the worksheet
 * Teachers and admins only
 */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	// Verify worksheet access
	await verifyWorksheetAccess(
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

	const validation = validateCreateWorksheetSection(body);
	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation failed: ${errorMsg}`);
	}

	const data = validation.data;

	// Create section
	const { data: section, error: dbError } = await locals.supabase
		.from('worksheet_sections')
		.insert({
			worksheet_id: params.id,
			title: data.title,
			instructions: data.instructions ?? null,
			position: data.position,
			points_total: data.points_total ?? null
		})
		.select()
		.single();

	if (dbError) {
		console.error('Failed to create section:', dbError);

		// Handle unique constraint violation (duplicate position)
		if (dbError.code === '23505') {
			throw error(400, 'A section already exists at this position');
		}

		throw error(500, 'Failed to create section');
	}

	// Validate response
	const validated = validateJsonResponse(
		createSectionResponseSchema,
		{ section },
		'POST /api/worksheets/[id]/sections'
	);

	return json(validated, { status: 201 });
};

/**
 * PUT /api/worksheets/[id]/sections
 * Reorder sections in the worksheet
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
			`Cannot reorder sections in worksheet with status '${worksheet.status}'. Only draft worksheets can be modified.`
		);
	}

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const validation = validateReorderSections(body);
	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation failed: ${errorMsg}`);
	}

	const { sections } = validation.data;

	// Verify all sections belong to this worksheet
	const sectionIds = sections.map((s) => s.id);
	const { data: existingSections, error: fetchError } = await locals.supabase
		.from('worksheet_sections')
		.select('id')
		.eq('worksheet_id', params.id)
		.in('id', sectionIds);

	if (fetchError) {
		console.error('Failed to verify sections:', fetchError);
		throw error(500, 'Failed to verify sections');
	}

	const existingIds = new Set(existingSections?.map((s) => s.id) ?? []);
	const invalidIds = sectionIds.filter((id) => !existingIds.has(id));

	if (invalidIds.length > 0) {
		throw error(400, `Some sections do not belong to this worksheet: ${invalidIds.join(', ')}`);
	}

	// Use RPC for atomic update in a single transaction
	const { data: updatedCount, error: rpcError } = await locals.supabase.rpc(
		'reorder_worksheet_sections',
		{
			p_worksheet_id: params.id,
			p_sections: sections.map((s) => ({
				id: s.id,
				new_position: s.position
			}))
		}
	);

	if (rpcError) {
		console.error('Failed to reorder sections:', rpcError);
		throw error(500, rpcError.message || 'Failed to reorder sections');
	}

	// Validate response
	const count = updatedCount ?? sections.length;
	const validated = validateJsonResponse(
		reorderSectionsResponseSchema,
		{
			success: true as const,
			message: `Reordered ${count} sections`,
			updated_count: count
		},
		'PUT /api/worksheets/[id]/sections'
	);

	return json(validated);
};
