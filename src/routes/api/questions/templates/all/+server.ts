/**
 * Question Templates API - Get All Published Templates
 * ======================================================
 *
 * GET /api/questions/templates/all - Get all published question templates
 *
 * Public endpoint (no authentication required) that returns all published
 * question templates for use in automaths pages. Used by client-side cache
 * to avoid repeated database queries.
 *
 * Returns complete template data including variables, content, answers, etc.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerLogger } from '$lib/utils/logger';
import { readAllRows } from '$lib/server/read-all-rows';

const logger = createServerLogger('api/questions/templates/all/+server');

/**
 * GET /api/questions/templates/all
 *
 * Fetch all published question templates.
 * Public endpoint - no authentication required.
 *
 * Returns: { templates: QuestionTemplate[] }
 */
export const GET: RequestHandler = async ({ locals: { supabase } }) => {
	// Tous les modèles publiés, page par page (PostgREST tronque à 1000 lignes)
	try {
		const templates = await readAllRows(
			(from, to) =>
				supabase
					.from('question_templates')
					.select('*')
					.eq('status', 'published')
					.order('id')
					.range(from, to),
			'des modèles publiés'
		);
		return json({ templates });
	} catch (error) {
		logger.error('[GET /api/questions/templates/all] Error fetching templates:', error);
		// Return empty array on error (fail-safe pattern)
		return json({ templates: [] });
	}
};
