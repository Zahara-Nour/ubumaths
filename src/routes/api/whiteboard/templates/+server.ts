/**
 * Whiteboard Templates Endpoint
 * ==============================
 *
 * Endpoint: GET/POST /api/whiteboard/templates
 * Purpose: List and create whiteboard templates
 *
 * Features:
 * - GET: List all public templates with optional category filter
 * - POST: Create new template (teachers/admins only)
 *
 * Security:
 * - GET: Any authenticated user
 * - POST: Teacher or Admin role required
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth, requireRoles } from '$lib/server/middleware/auth';
import {
	listWhiteboardTemplatesQuerySchema,
	createWhiteboardTemplateSchema
} from '$lib/server/validation/whiteboard-templates';
import { rowToTemplate, type WhiteboardTemplateRow } from '$lib/whiteboard/types/templates';

/**
 * List whiteboard templates
 *
 * GET /api/whiteboard/templates
 * GET /api/whiteboard/templates?category=grids
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	// Require authentication (any role)
	await requireAuth(locals);

	// Parse query parameters
	const queryParams = Object.fromEntries(url.searchParams);
	const validation = listWhiteboardTemplatesQuerySchema.safeParse(queryParams);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { category } = validation.data;

	try {
		// Build query
		let query = locals.supabase
			.from('whiteboard_templates')
			.select('*')
			.eq('is_public', true)
			.order('is_system', { ascending: false })
			.order('category')
			.order('name');

		// Apply category filter if specified
		if (category) {
			query = query.eq('category', category);
		}

		const { data: rows, error: dbError } = await query;

		if (dbError) {
			console.error('[Whiteboard Templates] Query error:', dbError);
			throw error(500, 'Erreur lors de la recuperation des templates');
		}

		// Transform database rows to API response
		const templates = ((rows as WhiteboardTemplateRow[]) || []).map(rowToTemplate);

		return json({ templates });
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[Whiteboard Templates] Error:', err);
		throw error(500, 'Une erreur interne est survenue');
	}
};

/**
 * Create a new whiteboard template
 *
 * POST /api/whiteboard/templates
 * Body: { name, description?, category, pageData, thumbnail? }
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// Require teacher or admin role
	const { user } = await requireRoles(locals, ['teacher', 'admin']);

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const validation = createWhiteboardTemplateSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { name, description, category, pageData, thumbnail } = validation.data;

	try {
		// Insert template into database
		const { data: row, error: insertError } = await locals.supabase
			.from('whiteboard_templates')
			.insert({
				name,
				description: description ?? null,
				category,
				page_data: pageData,
				thumbnail: thumbnail ?? null,
				created_by: user.id,
				is_system: false,
				is_public: true
			})
			.select()
			.single();

		if (insertError) {
			console.error('[Whiteboard Templates] Insert error:', insertError);
			throw error(500, 'Erreur lors de la creation du template');
		}

		const template = rowToTemplate(row as WhiteboardTemplateRow);

		return json({ template }, { status: 201 });
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[Whiteboard Templates] Error:', err);
		throw error(500, 'Une erreur interne est survenue');
	}
};
