/**
 * POST /api/admin/cron/trigger
 *
 * Manually triggers a CRON job execution.
 * Admin-only endpoint with rate limiting (1 req/min per job).
 *
 * Body:
 * - job_path: The API path of the job to trigger
 *   - HTTP jobs: "/api/cron/daily-summaries-and-rewards"
 *   - RPC jobs: "rpc:cleanup_stale_trades" (pg_cron functions)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { getEnv } from '$lib/server/env';
import { cronTriggerBodySchema, type CronTriggerResponse } from '$lib/server/validation/cron';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';

// Simple in-memory rate limit store
// WARNING: Resets on server restart. In Vercel serverless, each cold start
// gets a fresh store. Acceptable for admin-only feature with low usage.
// For high-volume production use, consider Redis-backed rate limiting.
const rateLimitStore = new Map<string, number>();
const RATE_LIMIT_MINUTES = 1;
const RATE_LIMIT_MS = RATE_LIMIT_MINUTES * 60 * 1000;

export const POST: RequestHandler = async ({ request, locals, url }) => {
	// Verify admin access
	await requireRole(locals, 'admin');

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const validation = cronTriggerBodySchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { job_path } = validation.data;

	// Check rate limit
	const lastTrigger = rateLimitStore.get(job_path);
	const now = Date.now();

	if (lastTrigger && now - lastTrigger < RATE_LIMIT_MS) {
		const waitSeconds = Math.ceil((RATE_LIMIT_MS - (now - lastTrigger)) / 1000);
		throw error(
			429,
			`Rate limit exceeded. Please wait ${waitSeconds} seconds before triggering this job again.`
		);
	}

	try {
		console.log(`[CRON Trigger] Admin triggering job: ${job_path}`);

		// Check if this is an RPC job (pg_cron function)
		if (job_path.startsWith('rpc:')) {
			const functionName = job_path.replace('rpc:', '');
			return await triggerRpcJob(functionName, job_path, now);
		}

		// HTTP job - requires CRON_SECRET
		const env = getEnv();
		if (!env.CRON_SECRET) {
			throw error(503, 'CRON trigger disabled: CRON_SECRET not configured');
		}

		// Build the full URL for the CRON endpoint
		const baseUrl = url.origin;
		const cronUrl = `${baseUrl}${job_path}`;

		// Call the CRON endpoint with Bearer token
		const response = await fetch(cronUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${env.CRON_SECRET}`
			}
		});

		// Update rate limit
		rateLimitStore.set(job_path, now);

		// Handle response
		if (!response.ok) {
			const errorText = await response.text().catch(() => 'Unknown error');
			console.error(`[CRON Trigger] Job failed with status ${response.status}:`, errorText);

			const triggerResponse: CronTriggerResponse = {
				success: false,
				message: `Job execution failed: ${response.status} ${response.statusText}`,
				job_path,
				triggered_at: new Date().toISOString()
			};

			return json(triggerResponse, { status: response.status });
		}

		// Parse job response for details
		let jobResult: unknown;
		try {
			jobResult = await response.json();
		} catch {
			jobResult = null;
		}

		console.log(`[CRON Trigger] Job completed successfully:`, job_path);

		const triggerResponse: CronTriggerResponse = {
			success: true,
			message: 'Job triggered successfully',
			job_path,
			triggered_at: new Date().toISOString()
		};

		// Include job result if available
		return json({
			...triggerResponse,
			result: jobResult
		});
	} catch (err) {
		console.error(`[CRON Trigger] Failed to trigger job ${job_path}:`, err);

		if (err instanceof Response) throw err;

		const triggerResponse: CronTriggerResponse = {
			success: false,
			message: err instanceof Error ? err.message : 'Failed to trigger job',
			job_path,
			triggered_at: new Date().toISOString()
		};

		return json(triggerResponse, { status: 500 });
	}
};

/**
 * Trigger a pg_cron RPC function
 */
async function triggerRpcJob(
	functionName: string,
	job_path: string,
	now: number
): Promise<Response> {
	const serviceClient = createServiceRoleClient();

	// Call the RPC function
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const { error: rpcError } = await serviceClient.rpc(functionName as any);

	// Update rate limit
	rateLimitStore.set(job_path, now);

	if (rpcError) {
		console.error(`[CRON Trigger] RPC job failed:`, rpcError);

		const triggerResponse: CronTriggerResponse = {
			success: false,
			message: `RPC job failed: ${rpcError.message}`,
			job_path,
			triggered_at: new Date().toISOString()
		};

		return json(triggerResponse, { status: 500 });
	}

	console.log(`[CRON Trigger] RPC job completed successfully:`, functionName);

	const triggerResponse: CronTriggerResponse = {
		success: true,
		message: 'RPC job triggered successfully',
		job_path,
		triggered_at: new Date().toISOString()
	};

	return json(triggerResponse);
}
