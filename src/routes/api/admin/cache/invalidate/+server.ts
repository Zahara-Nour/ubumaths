/**
 * Admin Cache Invalidation API Endpoint
 * ======================================
 *
 * Admin-only endpoint for manual cache invalidation across all cache types.
 *
 * ## Authentication & Authorization
 *
 * - Requires authenticated user session (401 if not logged in)
 * - Requires admin role (403 if not admin)
 * - Uses getCachedProfile() for role verification (dogfooding cache system)
 *
 * ## Supported Cache Types
 *
 * 1. **School Cache** (Redis, 1-hour TTL):
 *    - Stores school profile, timetable, logo, metadata
 *    - Requires school ID parameter
 *    - Invalidate after: timetable updates, school profile changes
 *
 * 2. **Templates Cache** (Redis, 10-minute TTL):
 *    - Stores published question templates
 *    - No ID required (global cache)
 *    - Invalidate after: publishing templates, status changes
 *
 * 3. **Profile Cache** (In-memory, 15-minute TTL):
 *    - Stores user role for fast authorization checks
 *    - Requires user ID parameter
 *    - Invalidate after: role changes only (not regular profile updates)
 *
 * ## Query Parameters
 *
 * - `type`: (required) 'school' | 'templates' | 'profile'
 * - `id`: (required for school/profile) UUID of school or user
 *
 * ## Usage Examples
 *
 * ```bash
 * # Invalidate school cache after timetable update
 * curl -X POST "http://localhost:5175/api/admin/cache/invalidate?type=school&id=550e8400-e29b-41d4-a716-446655440000" \
 *   -H "Cookie: sb-access-token=..." \
 *   -H "Cookie: sb-refresh-token=..."
 *
 * # Invalidate all published templates cache after publishing new templates
 * curl -X POST "http://localhost:5175/api/admin/cache/invalidate?type=templates" \
 *   -H "Cookie: sb-access-token=..." \
 *   -H "Cookie: sb-refresh-token=..."
 *
 * # Invalidate user profile cache after role change
 * curl -X POST "http://localhost:5175/api/admin/cache/invalidate?type=profile&id=7c9e6679-7425-40de-944b-e07fc1f90ae7" \
 *   -H "Cookie: sb-access-token=..." \
 *   -H "Cookie: sb-refresh-token=..."
 * ```
 *
 * ## Response Format
 *
 * Success (200):
 * ```json
 * {
 *   "success": true,
 *   "message": "School cache invalidated"
 * }
 * ```
 *
 * Error (400/401/403/500):
 * ```json
 * {
 *   "message": "Missing school ID"
 * }
 * ```
 *
 * ## Error Codes
 *
 * - 400: Invalid cache type or missing required ID parameter
 * - 401: User not authenticated
 * - 403: User is not an admin
 * - 500: Internal server error (database or cache failure)
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { invalidateSchoolCache } from '$lib/server/cache/schools';
import { invalidateTemplatesCache } from '$lib/server/cache/templates';
import { invalidateProfileCache, getCachedProfile } from '$lib/server/cache/profile';

/**
 * POST /api/admin/cache/invalidate
 *
 * Manually invalidate Redis or in-memory cache entries.
 * Requires admin role for security (cache invalidation affects all users).
 */
export const POST: RequestHandler = async ({ url, locals: { supabase, user } }) => {
	// ============================================================================
	// AUTHENTICATION CHECK
	// ============================================================================

	if (!user) {
		throw error(401, 'Authentication required. Please log in.');
	}

	// ============================================================================
	// AUTHORIZATION CHECK (Admin Role Required)
	// ============================================================================

	const profile = await getCachedProfile(user.id, supabase);

	if (!profile) {
		throw error(500, 'Failed to load user profile. Please try again.');
	}

	if (profile.role !== 'admin') {
		throw error(403, 'Admin access required. This action is restricted to administrators.');
	}

	// ============================================================================
	// EXTRACT & VALIDATE PARAMETERS
	// ============================================================================

	const type = url.searchParams.get('type');
	const id = url.searchParams.get('id');

	if (!type) {
		throw error(400, 'Missing required parameter: type. Use: school, templates, or profile');
	}

	// ============================================================================
	// CACHE INVALIDATION LOGIC
	// ============================================================================

	switch (type) {
		case 'school':
			// School cache requires school ID
			if (!id) {
				throw error(400, 'Missing school ID. Provide ?type=school&id=SCHOOL_UUID');
			}

			try {
				await invalidateSchoolCache(id);
				console.log(`[Admin Cache] School cache invalidated: ${id} by admin ${user.id}`);
				return json({
					success: true,
					message: 'School cache invalidated successfully'
				});
			} catch (err) {
				console.error('[Admin Cache] Failed to invalidate school cache:', err);
				throw error(500, 'Failed to invalidate school cache. Please try again.');
			}

		case 'templates':
			// Templates cache is global (no ID required)
			try {
				await invalidateTemplatesCache();
				console.log(`[Admin Cache] Templates cache invalidated by admin ${user.id}`);
				return json({
					success: true,
					message: 'Templates cache invalidated successfully'
				});
			} catch (err) {
				console.error('[Admin Cache] Failed to invalidate templates cache:', err);
				throw error(500, 'Failed to invalidate templates cache. Please try again.');
			}

		case 'profile':
			// Profile cache requires user ID
			if (!id) {
				throw error(400, 'Missing user ID. Provide ?type=profile&id=USER_UUID');
			}

			try {
				invalidateProfileCache(id);
				console.log(`[Admin Cache] Profile cache invalidated: ${id} by admin ${user.id}`);
				return json({
					success: true,
					message: 'Profile cache invalidated successfully'
				});
			} catch (err) {
				console.error('[Admin Cache] Failed to invalidate profile cache:', err);
				throw error(500, 'Failed to invalidate profile cache. Please try again.');
			}

		default:
			throw error(400, `Invalid cache type: ${type}. Valid types: school, templates, profile`);
	}
};
