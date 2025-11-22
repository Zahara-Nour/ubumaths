/**
 * API Route: /api/worksheets
 * GET - List worksheets for current teacher with filters and pagination
 * POST - Create new worksheet
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import {
	validateListWorksheetsQuery,
	validateCreateWorksheet,
	worksheetListResponseSchema,
	createWorksheetResponseSchema
} from '$lib/server/validation/worksheets';
import { validateJsonResponse } from '$lib/server/validation/response-utils';

type ZodIssue = { path: (string | number)[]; message: string };

/**
 * GET /api/worksheets
 * List worksheets for the current teacher with optional filters and pagination
 * Teachers and admins only
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	// Validate query parameters
	const queryValidation = validateListWorksheetsQuery(url.searchParams);
	if (!queryValidation.success) {
		const errorMsg = queryValidation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Invalid query parameters: ${errorMsg}`);
	}

	const { page, limit, status, type, search } = queryValidation.data;

	// Build query
	let query = locals.supabase
		.from('worksheets')
		.select('*', { count: 'exact' })
		.order('created_at', { ascending: false });

	// Filter by creator (teachers see their own, admins see all from their school)
	if (profile.role === 'teacher') {
		query = query.eq('created_by', user.id);
	} else if (profile.role === 'admin' && profile.school_id) {
		query = query.eq('school_id', profile.school_id);
	}

	// Apply optional filters
	if (status) {
		query = query.eq('status', status);
	}

	if (type) {
		query = query.eq('type', type);
	}

	if (search) {
		query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
	}

	// Apply pagination
	const from = (page - 1) * limit;
	const to = from + limit - 1;
	query = query.range(from, to);

	const { data: worksheets, error: dbError, count } = await query;

	if (dbError) {
		console.error('Failed to fetch worksheets:', dbError);
		throw error(500, 'Failed to fetch worksheets');
	}

	const total = count ?? 0;
	const totalPages = Math.ceil(total / limit);

	// Validate response
	const validated = validateJsonResponse(
		worksheetListResponseSchema,
		{
			worksheets: worksheets ?? [],
			pagination: {
				page,
				limit,
				total,
				totalPages
			}
		},
		'GET /api/worksheets'
	);

	return json(validated);
};

/**
 * POST /api/worksheets
 * Create a new worksheet
 * Teachers and admins only
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const validation = validateCreateWorksheet(body);
	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation failed: ${errorMsg}`);
	}

	const data = validation.data;

	// Create worksheet
	const { data: worksheet, error: dbError } = await locals.supabase
		.from('worksheets')
		.insert({
			title: data.title,
			description: data.description ?? null,
			type: data.type,
			config: data.config ?? {},
			status: 'draft',
			version: 1,
			template_id: data.template_id ?? null,
			estimated_duration_minutes: data.estimated_duration_minutes ?? null,
			total_points: data.total_points ?? null,
			grade_levels: data.grade_levels ?? [],
			tags: data.tags ?? [],
			created_by: user.id,
			school_id: profile.school_id ?? null
		})
		.select()
		.single();

	if (dbError) {
		console.error('Failed to create worksheet:', dbError);
		throw error(500, 'Failed to create worksheet');
	}

	// Validate response
	const validated = validateJsonResponse(
		createWorksheetResponseSchema,
		{ worksheet },
		'POST /api/worksheets'
	);

	return json(validated, { status: 201 });
};
