/**
 * API Route: POST /api/errors/cleanup
 * Cleanup old resolved errors (admin only or cron)
 *
 * Job Tracking: Logs execution to background_job_runs table
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cleanupOldErrors } from '$lib/server/errorMonitoring';
import { cleanupErrorsSchema } from '$lib/server/validation/errors';
import { requireRole } from '$lib/server/middleware/auth';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';

export const POST: RequestHandler = async ({ request, locals }) => {
	await requireRole(locals, 'admin');

	// Create service role client for job logging (bypasses RLS)
	const serviceClient = createServiceRoleClient();
	let runId: string | null = null;

	try {
		// SECURITY: Validate request body with Zod schema
		const body = await request.json().catch(() => ({}));
		const validation = cleanupErrorsSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { days_old = 90 } = validation.data;

		// Start job run
		const { data: startData, error: startError } = await serviceClient.rpc('start_job_run', {
			job_name: 'cleanup_old_errors',
			metadata: { days_old }
		});

		if (startError) {
			console.error('Failed to start job run:', startError);
			// Continue anyway (don't block job execution)
		} else {
			runId = startData;
		}

		// Execute cleanup
		const result = await cleanupOldErrors(locals.supabase, days_old);

		if (!result.success) {
			// Complete job run (failed)
			if (runId) {
				await serviceClient.rpc('complete_job_run', {
					run_id: runId,
					status: 'failed',
					error_message: result.error || 'Failed to cleanup errors',
					metadata: { days_old }
				});
			}

			throw error(500, result.error || 'Failed to cleanup errors');
		}

		// Complete job run (success)
		if (runId) {
			await serviceClient.rpc('complete_job_run', {
				run_id: runId,
				status: 'success',
				metadata: { days_old, deleted_count: result.deletedCount }
			});
		}

		return json({
			success: true,
			deleted_count: result.deletedCount
		});
	} catch (err) {
		// Complete job run (failed) if not already completed
		if (runId) {
			await serviceClient.rpc('complete_job_run', {
				run_id: runId,
				status: 'failed',
				error_message: err instanceof Error ? err.message : 'Unknown error',
				metadata: {}
			});
		}

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('Error in /api/errors/cleanup:', err);
		throw error(500, 'Internal server error');
	}
};
