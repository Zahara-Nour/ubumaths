/**
 * API Route: /api/admin/health-stats
 * GET - Fetch complete admin dashboard statistics with caching
 *
 * Cache Strategy:
 * - TTL: 5 minutes (300 seconds)
 * - Cache key: 'admin:health-stats'
 * - Cache storage: server_cache table in Supabase
 *
 * Security:
 * - Admin role required
 * - RLS policies enforce admin-only access to server_cache table
 *
 * Performance:
 * - First request: ~1-2s (fetches from database views)
 * - Cached requests: ~50-100ms (fetches from cache table)
 * - Reduces load on Supabase free tier by avoiding repeated expensive queries
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	fetchHealthStats,
	getCachedHealthStats,
	setCachedHealthStats
} from '$lib/server/healthStats';
import { requireRole } from '$lib/server/middleware/auth';

// Cache configuration
const CACHE_KEY = 'admin:health-stats';
const CACHE_TTL_SECONDS = 300; // 5 minutes

/**
 * GET /api/admin/health-stats
 * Returns complete admin dashboard statistics
 *
 * Response structure:
 * {
 *   errors: { critical, unresolved, lastHour, trend7d },
 *   users: { online, active24h, active7d, active30d, new7d, byRole },
 *   performance: { avgResponseTime, p95ResponseTime, errorRate, slowQueries },
 *   content: { exercises, assessments, riddles, srsDecks, assignments24h, completions24h },
 *   jobs: { total, running, failed, recentJobs },
 *   meta: { cached, generatedAt, cacheExpiresAt? }
 * }
 */
export const GET: RequestHandler = async ({ locals }) => {
	// ✅ SECURITY: Verify user is admin
	await requireRole(locals, 'admin');

	try {
		// Step 1: Try to get from cache first
		const cached = await getCachedHealthStats(locals.supabase, CACHE_KEY);

		if (cached) {
			// Cache hit - return cached data with metadata
			return json({
				...cached,
				meta: {
					...cached.meta,
					cached: true
				}
			});
		}

		// Step 2: Cache miss - fetch fresh stats from database
		// This queries multiple views and aggregates data (expensive operation)
		const stats = await fetchHealthStats(locals.supabase);

		// Step 3: Store in cache for next request
		// This is a fire-and-forget operation - we don't wait for it
		setCachedHealthStats(locals.supabase, CACHE_KEY, stats, CACHE_TTL_SECONDS).catch((err) => {
			// Log but don't fail the request if cache write fails
			console.error('Failed to cache health stats:', err);
		});

		// Step 4: Add cache metadata to response
		const expiresAt = new Date(Date.now() + CACHE_TTL_SECONDS * 1000);

		return json({
			...stats,
			meta: {
				...stats.meta,
				cached: false,
				cacheExpiresAt: expiresAt.toISOString()
			}
		});
	} catch (err) {
		console.error('Error fetching health stats:', err);
		throw error(500, err instanceof Error ? err.message : 'Failed to fetch health stats');
	}
};
