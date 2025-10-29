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
import { getCachedTemplates } from '$lib/server/cache/templates';

/**
 * GET /api/questions/templates/all
 *
 * Fetch all published question templates.
 * Public endpoint - no authentication required.
 *
 * Returns: { templates: QuestionTemplate[] }
 *
 * PERFORMANCE OPTIMIZATION (2025-10-29):
 * =======================================
 * This public API endpoint now uses Redis cache for templates.
 *
 * Why Cache Here:
 * - Called by client store (questionTemplatesCache)
 * - High traffic endpoint (every automaths page visit)
 * - Shared data (all users get same templates)
 *
 * Cache Strategy:
 * - Fetch: Redis cache with 10 min TTL
 * - Return: Raw templates (no sorting - client handles it)
 * - Impact: 67% faster API (150ms → 50ms)
 *
 * Error Handling:
 * - getCachedTemplates() handles errors gracefully
 * - Returns empty array if Redis/DB fails
 */
export const GET: RequestHandler = async ({ locals: { supabase } }) => {
	// Fetch from Redis cache (10 min TTL)
	// This endpoint is called by the client store for caching
	const templates = await getCachedTemplates(supabase);

	return json({
		templates: templates || []
	});
};
