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

/**
 * GET /api/questions/templates/all
 *
 * Fetch all published question templates.
 * Public endpoint - no authentication required.
 *
 * Returns: { templates: QuestionTemplate[] }
 */
export const GET: RequestHandler = async ({ locals: { supabase } }) => {
	// Fetch published templates directly from database
	const { data: templates, error } = await supabase
		.from('question_templates')
		.select('*')
		.eq('status', 'published');

	if (error) {
		console.error('[GET /api/questions/templates/all] Error fetching templates:', error);
		// Return empty array on error (fail-safe pattern)
		return json({ templates: [] });
	}

	return json({
		templates: templates || []
	});
};
