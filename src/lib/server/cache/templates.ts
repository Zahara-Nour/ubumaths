/**
 * Question Templates Redis Cache Module
 * =====================================
 *
 * Caches published question templates for performance and consistency.
 *
 * WHY REDIS FOR TEMPLATES?
 * ------------------------
 * Question templates are a large dataset (potentially thousands of records)
 * that rarely change. Multiple users and endpoints query the same data:
 * - Assessment creation (selecting templates)
 * - Game pages (loading exercise templates)
 * - Admin panels (browsing published templates)
 * - API endpoints (generating questions)
 *
 * Redis cache provides:
 * - 10-minute TTL (templates published infrequently)
 * - Consistent data across distributed load balancers
 * - Reduced database load from repeated large queries
 * - Global visibility (all users/teachers benefit from cache hits)
 *
 * Example scenario:
 * - Published templates dataset = 500 records × 2KB = 1MB
 * - Without cache: 100 users loading templates = 100 large DB queries
 * - With cache: 1 DB query, 99 cache hits (Redis memory efficient)
 * - Result: Database I/O reduced by 99%
 *
 * FEATURES:
 * - 10-minute TTL (templates change occasionally)
 * - Filters by status='published' (draft templates never cached)
 * - Returns empty array on error (fail-safe)
 * - Automatic fallback on Redis errors
 *
 * USAGE (as of 2025-10-29):
 * ===========================
 * Used by 5 endpoints for consistent caching:
 * 1. /dashboard/teacher/assessments/new (teacher dashboard)
 * 2. /automaths (public template browser)
 * 3. /automaths/test (test generator)
 * 4. /automaths/panier (shopping cart)
 * 5. /api/questions/templates/all (public API)
 *
 * EXAMPLE USAGE:
 * ```typescript
 * import { getCachedTemplates, invalidateTemplatesCache } from '$lib/server/cache/templates';
 *
 * const templates = await getCachedTemplates(supabase);
 * templates.forEach(t => console.log(t.title, t.level));
 *
 * // After publishing new templates
 * await publishTemplate(...);
 * await invalidateTemplatesCache();
 * ```
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { getCached, invalidateCache, CACHE_KEYS, TTL } from '$lib/server/cache';

// ============================================================================
// TYPES
// ============================================================================

type QuestionTemplate = Database['public']['Tables']['question_templates']['Row'];

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Get published question templates with Redis caching
 *
 * Fetches all published question templates for use in assessments and games.
 * Only returns templates with status='published' (drafts are excluded).
 * Uses Redis cache with automatic fallback on errors.
 *
 * Returns empty array on error to prevent cascading failures.
 * (It's better to show no templates than to crash the page.)
 *
 * @param supabase - Supabase client instance
 * @returns Promise resolving to array of published templates (empty array on error)
 *
 * @example
 * const templates = await getCachedTemplates(supabase);
 * const level4Templates = templates.filter(t => t.level === 4);
 * console.log(`Found ${level4Templates.length} level 4 templates`);
 *
 * @example
 * // Filter by grade and domain
 * const sixiemeAlgebra = templates.filter(
 *   t => t.grades.includes('6eme') && t.domain === 'algebra'
 * );
 */
export async function getCachedTemplates(
	supabase: SupabaseClient<Database>
): Promise<QuestionTemplate[]> {
	const cacheKey = CACHE_KEYS.TEMPLATES_PUBLISHED();

	const fetchTemplates = async (): Promise<QuestionTemplate[]> => {
		console.log('[getCachedTemplates] Fetching from DB');

		const { data, error } = await supabase
			.from('question_templates')
			.select('*')
			.eq('status', 'published');

		if (error) {
			console.error('[getCachedTemplates] Error fetching templates:', error);
			// Return empty array on error (fail-safe pattern)
			// Better to show no templates than crash the app
			return [];
		}

		return data || [];
	};

	try {
		return await getCached<QuestionTemplate[]>(cacheKey, TTL.TEMPLATES, fetchTemplates);
	} catch (error) {
		console.error('[getCachedTemplates] Cache error, returning empty array:', error);
		// Fail-safe: return empty array instead of throwing
		return [];
	}
}

/**
 * Invalidate question templates cache
 *
 * Call this after publishing new templates or updating template status.
 * Affects all users and endpoints since templates are global data.
 *
 * @example
 * // After publishing templates
 * await publishTemplates(newTemplates, supabase);
 * await invalidateTemplatesCache();
 *
 * @example
 * // After admin bulk update
 * await updateTemplateStatuses(templateIds, 'published', supabase);
 * await invalidateTemplatesCache();
 */
export async function invalidateTemplatesCache(): Promise<void> {
	try {
		await invalidateCache(CACHE_KEYS.TEMPLATES_PUBLISHED());
	} catch (error) {
		console.error('[invalidateTemplatesCache] Error:', error);
		// Don't throw - invalidation failures shouldn't break the app
	}
}
