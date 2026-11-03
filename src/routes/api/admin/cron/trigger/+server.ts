/**
 * POST /api/admin/cron/trigger
 *
 * Manually triggers a CRON job execution.
 * Admin-only endpoint with rate limiting (1 req/min per job, compté en base).
 *
 * Body:
 * - job_path: The API path of the job to trigger
 *   - HTTP jobs: "/api/cron/deleted-account-files"
 *   - RPC jobs: "rpc:cleanup_stale_trades" (pg_cron functions)
 */

import { json, error, isHttpError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/middleware/auth';
import { assertTypedConfirmation } from '$lib/server/confirmAction';
import { getEnv } from '$lib/server/env';
import {
	cronTriggerBodySchema,
	CRON_TRIGGER_CONFIRM_KEYWORD,
	type CronTriggerResponse
} from '$lib/server/validation/cron';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { checkEndpointRateLimit } from '$lib/server/rateLimiter';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/admin/cron/trigger/+server');

// Un lancement par minute et par tâche, compté en base (tient entre instances Vercel).
// Le lancement est compté dès la demande, qu'il réussisse ou non.
const RATE_LIMIT_SECONDS = 60;

export const POST: RequestHandler = async ({ request, locals, url }) => {
	// ✅ SECURITY: admin elevation OR real admin login. This handler triggers jobs
	// via fetch/service-role (no admin-context DB ops), so we only gate access.
	await requireAdmin(locals);

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête illisible');
	}

	const validation = cronTriggerBodySchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { job_path } = validation.data;

	// ✅ SECURITY: global destructive op → require the fixed keyword.
	assertTypedConfirmation(validation.data.confirm, CRON_TRIGGER_CONFIRM_KEYWORD);

	const limit = await checkEndpointRateLimit(`cron_trigger:${job_path}`, 1, RATE_LIMIT_SECONDS);
	if (!limit.allowed) {
		throw error(
			429,
			`Tâche lancée il y a peu : attendre ${limit.retryAfter ?? RATE_LIMIT_SECONDS} s avant de la relancer`
		);
	}

	try {
		logger.info(`[CRON Trigger] Admin triggering job: ${job_path}`);

		// Check if this is an RPC job (pg_cron function)
		if (job_path.startsWith('rpc:')) {
			const functionName = job_path.replace('rpc:', '');
			return await triggerRpcJob(functionName, job_path);
		}

		// HTTP job - requires CRON_SECRET
		const env = getEnv();
		if (!env.CRON_SECRET) {
			throw error(503, 'Lancement manuel désactivé : CRON_SECRET n’est pas configuré');
		}

		// Build the full URL for the CRON endpoint
		const baseUrl = url.origin;
		const cronUrl = `${baseUrl}${job_path}`;

		// Call the CRON endpoint with Bearer token
		const response = await fetch(cronUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				// Le fetch de Node n'envoie pas d'origine : sans elle, le contrôle CSRF de
				// hooks.server.ts refuse le POST (403) hors du dev sur localhost.
				Origin: baseUrl,
				Authorization: `Bearer ${env.CRON_SECRET}`
			}
		});

		// Handle response
		if (!response.ok) {
			const errorText = await response.text().catch(() => 'Unknown error');
			logger.error(`[CRON Trigger] Job failed with status ${response.status}:`, errorText);

			const triggerResponse: CronTriggerResponse = {
				success: false,
				message: `Échec de la tâche : ${response.status} ${response.statusText}`,
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

		logger.info(`[CRON Trigger] Job completed successfully:`, job_path);

		const triggerResponse: CronTriggerResponse = {
			success: true,
			message: 'Tâche lancée',
			job_path,
			triggered_at: new Date().toISOString()
		};

		// Include job result if available
		return json({
			...triggerResponse,
			result: jobResult
		});
	} catch (err) {
		logger.error(`[CRON Trigger] Failed to trigger job ${job_path}:`, err);

		// Une erreur SvelteKit (`error(503, …)`) n'est pas une `Response` : la relancer telle quelle.
		if (isHttpError(err)) throw err;

		const triggerResponse: CronTriggerResponse = {
			success: false,
			message: err instanceof Error ? err.message : 'Impossible de lancer la tâche',
			job_path,
			triggered_at: new Date().toISOString()
		};

		return json(triggerResponse, { status: 500 });
	}
};

/**
 * Trigger a pg_cron RPC function
 */
async function triggerRpcJob(functionName: string, job_path: string): Promise<Response> {
	const serviceClient = createServiceRoleClient();

	// Call the RPC function
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const { error: rpcError } = await serviceClient.rpc(functionName as any);

	if (rpcError) {
		logger.error(`[CRON Trigger] RPC job failed:`, rpcError);

		const triggerResponse: CronTriggerResponse = {
			success: false,
			message: `Échec de la tâche (RPC) : ${rpcError.message}`,
			job_path,
			triggered_at: new Date().toISOString()
		};

		return json(triggerResponse, { status: 500 });
	}

	logger.info(`[CRON Trigger] RPC job completed successfully:`, functionName);

	const triggerResponse: CronTriggerResponse = {
		success: true,
		message: 'Tâche lancée (RPC)',
		job_path,
		triggered_at: new Date().toISOString()
	};

	return json(triggerResponse);
}
