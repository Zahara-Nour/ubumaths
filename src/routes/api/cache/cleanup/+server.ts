/* eslint-disable @typescript-eslint/no-explicit-any */
// Type assertions needed for RPC functions not yet in database.ts
// Run `pnpm db:types` after migrations are pushed to remove this

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';

/**
 * GET/POST /api/cache/cleanup
 *
 * Cron job endpoint to clean up expired cache entries from server_cache table.
 * Calls cleanup_expired_cache() RPC function and tracks execution via job_runs.
 *
 * Expected to be called periodically (e.g., every 5-10 minutes) by a cron service.
 * Vercel cron jobs use GET requests, but POST is also supported for manual triggers.
 *
 * @returns JSON with success status and deleted count
 */
const cleanupHandler: RequestHandler = async () => {
	const serviceClient = createServiceRoleClient();
	let runId: string | null = null;

	try {
		// Start job run tracking
		const { data: startData, error: startError } = await serviceClient.rpc(
			'start_job_run' as any,
			{
				job_name: 'cleanup_expired_cache',
				metadata: {}
			} as any
		);

		if (startError) {
			console.error('[Cache Cleanup] Failed to start job run:', startError);
			// Continue anyway - cleanup should still happen even if tracking fails
		} else {
			runId = startData as string;
		}

		// Call cleanup function (returns deleted count)
		const { data: deletedCount, error: cleanupError } = await serviceClient.rpc(
			'cleanup_expired_cache' as any
		);

		if (cleanupError) {
			throw new Error(`Cleanup failed: ${cleanupError.message}`);
		}

		const count = (deletedCount as number) ?? 0;

		// Complete job run (success)
		if (runId) {
			await serviceClient.rpc(
				'complete_job_run' as any,
				{
					run_id: runId,
					status: 'success',
					metadata: { deleted_count: count }
				} as any
			);
		}

		console.log(`[Cache Cleanup] Success: ${count} expired entries deleted`);

		return json({
			success: true,
			deleted_count: count,
			message: `Cleaned up ${count} expired cache entries`
		});
	} catch (err) {
		// Complete job run (failed)
		if (runId) {
			await serviceClient.rpc(
				'complete_job_run' as any,
				{
					run_id: runId,
					status: 'failed',
					error_message: err instanceof Error ? err.message : 'Unknown error',
					metadata: {}
				} as any
			);
		}

		console.error('[Cache Cleanup] Failed:', err);

		return json(
			{
				success: false,
				error: err instanceof Error ? err.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

// Export for both GET (Vercel cron) and POST (manual triggers)
export const GET = cleanupHandler;
export const POST = cleanupHandler;
