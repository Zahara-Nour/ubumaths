/**
 * API Route: /api/health
 * GET - Simple health check endpoint with database ping
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { HealthCheckResponse } from '$lib/server/validation/health';

/**
 * GET /api/health
 * Simple health check that pings the database
 *
 * Returns:
 * - status: 'ok' (latency < 500ms), 'degraded' (latency >= 500ms), or 'down' (error)
 * - latency_ms: Database response time in milliseconds
 * - timestamp: Current ISO timestamp
 * - error: Error message (only if status is 'degraded' or 'down')
 */
export const GET: RequestHandler = async ({ locals }) => {
	const startTime = Date.now();

	try {
		// Simple database ping - just count profiles (lightweight query)
		const { error: dbError } = await locals.supabase
			.from('profiles')
			.select('id', { count: 'exact', head: true })
			.limit(1);

		const latency = Date.now() - startTime;

		if (dbError) {
			const response: HealthCheckResponse = {
				status: 'degraded',
				latency_ms: latency,
				timestamp: new Date().toISOString(),
				error: dbError.message
			};
			return json(response, { status: 503 });
		}

		const response: HealthCheckResponse = {
			status: latency < 500 ? 'ok' : 'degraded',
			latency_ms: latency,
			timestamp: new Date().toISOString()
		};

		return json(response);
	} catch (err) {
		const latency = Date.now() - startTime;
		const response: HealthCheckResponse = {
			status: 'down',
			latency_ms: latency,
			timestamp: new Date().toISOString(),
			error: err instanceof Error ? err.message : 'Unknown error'
		};

		return json(response, { status: 503 });
	}
};
