/**
 * API Route: /api/teacher/chapter-templates
 * GET - List chapter templates (own + public published)
 * POST - Create a new chapter template
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { createChapterTemplate, listChapterTemplates } from '$lib/server/chapter-templates';
import {
	createChapterTemplateSchema,
	listTemplatesQuerySchema,
	type CreateChapterTemplateInput,
	type ListTemplatesQuery
} from '$lib/server/validation/chapter-templates';

type ZodIssue = { path: (string | number)[]; message: string };

/**
 * GET /api/teacher/chapter-templates
 * List all chapter templates accessible to the authenticated teacher
 *
 * Query Parameters:
 * - status: Filter by template status (draft/published/archived)
 * - grades: Filter by grade levels (comma-separated)
 * - search: Search by title
 * - ownOnly: Only show user's own templates
 * - publicOnly: Only show public published templates
 * - sortBy: Sort field (title/createdAt/updatedAt/instantiationCount)
 * - sortDir: Sort direction (asc/desc)
 * - page: Page number (default 1)
 * - limit: Items per page (default 20)
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const { user } = await requireRole(locals, 'teacher');

	// Parse and validate query parameters
	const queryValidation = listTemplatesQuerySchema.safeParse(Object.fromEntries(url.searchParams));

	if (!queryValidation.success) {
		const errorMsg = queryValidation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Invalid query parameters: ${errorMsg}`);
	}

	const query: ListTemplatesQuery = queryValidation.data;

	// Fetch templates
	const result = await listChapterTemplates(query, user.id, locals.supabase);

	if (result.error) {
		console.error('[GET /api/teacher/chapter-templates] Error:', result.error);
		throw error(500, 'Failed to fetch chapter templates');
	}

	return json({
		templates: result.data,
		total: result.count
	});
};

/**
 * POST /api/teacher/chapter-templates
 * Create a new chapter template from scratch
 *
 * Body:
 * - title: Template title (required)
 * - description: Template description (optional)
 * - grades: Target grade levels (optional)
 * - color: Template color (optional)
 * - icon: Template icon (optional)
 * - contentSnapshot: Initial content (optional)
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await requireRole(locals, 'teacher');

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const validation = createChapterTemplateSchema.safeParse(body);

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation failed: ${errorMsg}`);
	}

	const data: CreateChapterTemplateInput = validation.data;

	// Create template
	const result = await createChapterTemplate(data, user.id, locals.supabase);

	if (result.error) {
		console.error('[POST /api/teacher/chapter-templates] Error:', result.error);
		throw error(500, 'Failed to create chapter template');
	}

	return json({ template: result.data }, { status: 201 });
};
