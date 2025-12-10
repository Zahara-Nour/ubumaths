/**
 * Teacher Templates Gallery - Server Load & Actions
 * ===================================================
 *
 * Lists all templates accessible to the teacher (own + public).
 * Supports filtering, search, and pagination.
 */

import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { listChapterTemplates } from '$lib/server/chapter-templates';
import { listTemplatesQuerySchema } from '$lib/server/validation/chapter-templates';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Only teachers can access templates
	const { user } = await requireRole(locals, 'teacher');

	// Parse query parameters
	const queryParams = {
		page: url.searchParams.get('page') || '1',
		limit: url.searchParams.get('limit') || '20',
		grades: url.searchParams.get('grades') || undefined,
		search: url.searchParams.get('search') || undefined,
		status: url.searchParams.get('status') || undefined,
		sortBy: url.searchParams.get('sortBy') || 'updatedAt',
		sortDir: url.searchParams.get('sortDir') || 'desc'
	};

	// Validate query parameters
	const validation = listTemplatesQuerySchema.safeParse(queryParams);
	if (!validation.success) {
		console.error('[Templates Gallery] Invalid query:', validation.error);
		// Use defaults if validation fails
	}

	const query = validation.success ? validation.data : { page: 1, limit: 20 };

	// Fetch templates
	const {
		data: templates,
		error,
		count
	} = await listChapterTemplates(query, user.id, locals.supabase);

	if (error) {
		console.error('[Templates Gallery] Error loading templates:', error);
		return {
			templates: [],
			total: 0,
			page: query.page ?? 1,
			limit: query.limit ?? 20,
			error: 'Erreur lors du chargement des templates'
		};
	}

	return {
		templates,
		total: count,
		page: query.page ?? 1,
		limit: query.limit ?? 20
	};
};
