/**
 * POST /api/notifications/cleanup
 *
 * Cleanup expired notifications (hard delete)
 * This endpoint can be called manually or by a cron job
 *
 * For Vercel Cron: Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/notifications/cleanup",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 *
 * This will run daily at 2 AM UTC
 *
 * Job Tracking: Logs execution to background_job_runs table
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cleanupExpiredNotifications } from '$lib/server/notifications';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { verifyCronAuth } from '$lib/server/auth/cron';

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

	try {
		// Start job run
		const { data: startData, error: startError } = await serviceClient.rpc('start_job_run', {
			job_name: 'cleanup_old_notifications',
			metadata: {}
		});

		if (startError) {
			console.error('Failed to start job run:', startError);
			// Continue anyway (don't block job execution)
		} else {
			runId = startData;
		}

		// Run cleanup
		const result = await cleanupExpiredNotifications(supabase);

		if (!result.success) {
			// Complete job run (failed)
			if (runId) {
				await serviceClient.rpc('complete_job_run', {
					run_id: runId,
					status: 'failed',
					error_message: result.error || 'Unknown error',
					metadata: {}
				});
			}

			return json(
				{
					success: false,
					error: result.error
				},
				{ status: 500 }
			);
		}

		// Complete job run (success)
		if (runId) {
			await serviceClient.rpc('complete_job_run', {
				run_id: runId,
				status: 'success',
				metadata: { deleted_count: result.deletedCount }
			});
		}

		return json({
			success: true,
			deletedCount: result.deletedCount,
			message: `Cleaned up ${result.deletedCount} expired notification(s)`
		});
	} catch (err) {
		// Complete job run (failed)
		if (runId) {
			await serviceClient.rpc('complete_job_run', {
				run_id: runId,
				status: 'failed',
				error_message: err instanceof Error ? err.message : 'Unknown error',
				metadata: {}
			});
		}

		console.error('Error in notifications cleanup endpoint:', err);
		return json(
			{
				success: false,
				error: 'Internal server error'
			},
			{ status: 500 }
		);
	}
};

// Export for both POST (primary) and GET (also protected)
export const POST = cleanupHandler;
export const GET = cleanupHandler;
