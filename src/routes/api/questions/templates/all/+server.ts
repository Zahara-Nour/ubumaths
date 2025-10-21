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

import { error, json } from '@sveltejs/kit';
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
	try {
		// Fetch all published templates
		const { data: templates, error: queryError } = await supabase
			.from('question_templates')
			.select('*')
			.eq('status', 'published')
			.order('theme', { ascending: true })
			.order('domain', { ascending: true })
			.order('subdomain', { ascending: true })
			.order('level', { ascending: true });

		if (queryError) {
			// Only log detailed error info, not stack traces (reduce noise when offline)
			console.error('[Templates API] Query error:', queryError.message);
			throw error(500, 'Failed to fetch templates');
		}

		// Return templates (may be empty array if no published templates)
		return json({
			templates: templates || []
		});
	} catch (err) {
		// Re-throw if already an HTTP error (avoid double logging)
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Only log message for network errors (e.g., fetch failed = offline)
		const errorMessage = err instanceof Error ? err.message : 'Unknown error';

		// Detect network errors and log less verbosely
		if (errorMessage.includes('fetch failed') || errorMessage.includes('network')) {
			console.error('[Templates API] Network error - likely offline');
		} else {
			console.error('[Templates API] Error:', errorMessage);
		}

		throw error(500, 'Internal server error');
	}
};
