/**
 * API Route: /api/worksheets/templates
 * GET - List templates (public + user's own)
 * POST - Create new template
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import {
	validateListTemplatesQuery,
	validateCreateTemplate,
	templateListResponseSchema,
	createTemplateResponseSchema
} from '$lib/server/validation/worksheets';
import { validateJsonResponse } from '$lib/server/validation/response-utils';

type ZodIssue = { path: (string | number)[]; message: string };

/**
 * GET /api/worksheets/templates
 * List templates - returns public templates and user's own templates
 * Teachers and admins only
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const { user } = await requireRoles(locals, ['teacher', 'admin']);

	// Validate query parameters
	const queryValidation = validateListTemplatesQuery(url.searchParams);
	if (!queryValidation.success) {
		const errorMsg = queryValidation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Invalid query parameters: ${errorMsg}`);
	}

	const { page, limit, include_public, search } = queryValidation.data;

	// Build query - get public templates OR user's own templates
	let query = locals.supabase
		.from('worksheet_templates')
		.select('*', { count: 'exact' })
		.order('created_at', { ascending: false });

	// Filter: public templates OR created by current user
	if (include_public) {
		query = query.or(`is_public.eq.true,created_by.eq.${user.id}`);
	} else {
		query = query.eq('created_by', user.id);
	}

	// Apply search filter
	if (search) {
		query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
	}

	// Apply pagination
	const from = (page - 1) * limit;
	const to = from + limit - 1;
	query = query.range(from, to);

	const { data: templates, error: dbError, count } = await query;

	if (dbError) {
		console.error('Failed to fetch templates:', dbError);
		throw error(500, 'Failed to fetch templates');
	}

	const total = count ?? 0;
	const totalPages = Math.ceil(total / limit);

	// Validate response
	const validated = validateJsonResponse(
		templateListResponseSchema,
		{
			templates: templates ?? [],
			pagination: {
				page,
				limit,
				total,
				totalPages
			}
		},
		'GET /api/worksheets/templates'
	);

	return json(validated);
};

/**
 * POST /api/worksheets/templates
 * Create a new template
 * Teachers and admins only
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await requireRoles(locals, ['teacher', 'admin']);

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const validation = validateCreateTemplate(body);
	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation failed: ${errorMsg}`);
	}

	const data = validation.data;

	// Create template
	const { data: template, error: dbError } = await locals.supabase
		.from('worksheet_templates')
		.insert({
			name: data.name,
			description: data.description ?? null,
			template_content: data.template_content,
			placeholders: data.placeholders ?? [],
			is_public: data.is_public ?? false,
			created_by: user.id
		})
		.select()
		.single();

	if (dbError) {
		console.error('Failed to create template:', dbError);
		throw error(500, 'Failed to create template');
	}

	// Validate response
	const validated = validateJsonResponse(
		createTemplateResponseSchema,
		{ template },
		'POST /api/worksheets/templates'
	);

	return json(validated, { status: 201 });
};
