/* eslint-disable @typescript-eslint/no-explicit-any */
// Type assertions needed for RPC functions not yet in database.ts
// Run `pnpm db:types` after migrations are pushed to remove this

/**
 * GET/POST /api/cleanup/all
 *
 * Unified cron job endpoint that performs all scheduled cleanup tasks:
 * 1. Clean up expired cache entries from server_cache table
 * 2. Clean up expired notifications (hard delete)
 *
 * This endpoint consolidates multiple cleanup operations into a single cron job,
 * reducing Vercel cron job quota usage (free tier: 2 jobs max).
 *
 * Vercel cron jobs use GET requests, but POST is also supported for manual triggers.
 *
 * @returns JSON with success status and detailed results for each cleanup operation
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { cleanupExpiredNotifications } from '$lib/server/notifications';
import { verifyCronAuth } from '$lib/server/auth/cron';

interface CleanupResults {
	success: boolean;
	cache: {
		success: boolean;
		deletedCount: number;
		error?: string;
	};
	notifications: {
		success: boolean;
		deletedCount: number;
		error?: string;
	};
	totalDeleted: number;
}

/**
 * Shared handler for both GET and POST requests
 * Authenticates request before executing cleanup logic
 */
const cleanupHandler: RequestHandler = async ({ request, locals: { supabase } }) => {
	// SECURITY: Verify CRON authentication BEFORE any processing
	// Throws 401 error if token is invalid or missing
	verifyCronAuth(request);

	// Create service role client for job logging (bypasses RLS)
	const serviceClient = createServiceRoleClient();
	let runId: string | null = null;

	const results: CleanupResults = {
		success: true,
		cache: { success: false, deletedCount: 0 },
		notifications: { success: false, deletedCount: 0 },
		totalDeleted: 0
	};

	try {
		// Start unified job run tracking
		const { data: startData, error: startError } = await serviceClient.rpc('start_job_run', {
			p_job_name: 'cleanup_all',
			p_metadata: {}
		});

		if (startError) {
			console.error('[Cleanup All] Failed to start job run:', startError);
			// Continue anyway - cleanup should still happen even if tracking fails
		} else {
			runId = startData;
		}

		// ============================================================
		// CLEANUP 1: Expired cache entries
		// ============================================================
		try {
			const { data: deletedCount, error: cacheError } = await serviceClient.rpc(
				'cleanup_expired_cache' as any
			);

			if (cacheError) {
				throw new Error(`Cache cleanup failed: ${cacheError.message}`);
			}

			const count = (deletedCount as number) ?? 0;
			results.cache = {
				success: true,
				deletedCount: count
			};

			console.log(`[Cleanup All] Cache cleanup success: ${count} entries deleted`);
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Unknown error';
			results.cache = {
				success: false,
				deletedCount: 0,
				error: errorMsg
			};
			results.success = false;
			console.error('[Cleanup All] Cache cleanup failed:', errorMsg);
		}

		// ============================================================
		// CLEANUP 2: Expired notifications
		// ============================================================
		try {
			const result = await cleanupExpiredNotifications(supabase);

			if (!result.success) {
				throw new Error(result.error || 'Notification cleanup failed');
			}

			results.notifications = {
				success: true,
				deletedCount: result.deletedCount || 0
			};

			console.log(
				`[Cleanup All] Notifications cleanup success: ${result.deletedCount} entries deleted`
			);
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Unknown error';
			results.notifications = {
				success: false,
				deletedCount: 0,
				error: errorMsg
			};
			results.success = false;
			console.error('[Cleanup All] Notifications cleanup failed:', errorMsg);
		}

		// ============================================================
		// Complete job run with aggregated results
		// ============================================================
		results.totalDeleted = results.cache.deletedCount + results.notifications.deletedCount;

		const status = results.success ? 'success' : 'partial_failure';
		const metadata = {
			cache_deleted: results.cache.deletedCount,
			notifications_deleted: results.notifications.deletedCount,
			total_deleted: results.totalDeleted,
			cache_success: results.cache.success,
			notifications_success: results.notifications.success
		};

		if (runId) {
			await serviceClient.rpc('complete_job_run', {
				p_run_id: runId,
				p_status: status,
				p_metadata: metadata
			});
		}

		console.log(
			`[Cleanup All] Complete: ${results.totalDeleted} total entries deleted (cache: ${results.cache.deletedCount}, notifications: ${results.notifications.deletedCount})`
		);

		return json(results, {
			status: results.success ? 200 : 207 // 207 Multi-Status for partial success
		});
	} catch (err) {
		// Complete job run (failed)
		const errorMsg = err instanceof Error ? err.message : 'Unknown error';

		if (runId) {
			await serviceClient.rpc('complete_job_run', {
				p_run_id: runId,
				p_status: 'failed',
				p_error_message: errorMsg,
				p_metadata: {
					cache_deleted: results.cache.deletedCount,
					notifications_deleted: results.notifications.deletedCount
				}
			});
		}

		console.error('[Cleanup All] Critical failure:', err);

		return json(
			{
				success: false,
				error: errorMsg,
				cache: results.cache,
				notifications: results.notifications
			},
			{ status: 500 }
		);
	}
};

// Export for both GET (Vercel cron) and POST (manual triggers)
export const GET = cleanupHandler;
export const POST = cleanupHandler;
