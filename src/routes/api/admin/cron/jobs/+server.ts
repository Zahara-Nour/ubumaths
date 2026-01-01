/**
 * GET /api/admin/cron/jobs
 *
 * Lists CRON job executions with filtering and pagination.
 * Admin-only endpoint.
 *
 * Query params:
 * - job_name: Filter by job name (optional)
 * - status: all|running|success|failed|timeout (default: all)
 * - period: 24h|7d|30d (default: 7d)
 * - limit: 1-100 (default: 50)
 * - offset: pagination offset (default: 0)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { cronJobsQuerySchema, type CronJobsResponse } from '$lib/server/validation/cron';

// Period to milliseconds mapping
const PERIOD_MS: Record<string, number> = {
	'24h': 24 * 60 * 60 * 1000,
	'7d': 7 * 24 * 60 * 60 * 1000,
	'30d': 30 * 24 * 60 * 60 * 1000
};

export const GET: RequestHandler = async ({ url, locals }) => {
	// Verify admin access
	await requireRole(locals, 'admin');

	// Parse and validate query params (Zod handles defaults and transforms)
	const queryParams = Object.fromEntries(url.searchParams.entries());
	const validation = cronJobsQuerySchema.safeParse(queryParams);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { job_name, status, period, limit, offset } = validation.data;

	// Calculate period start date
	const periodMs = PERIOD_MS[period];
	const periodStart = new Date(Date.now() - periodMs).toISOString();

	try {
		// Build query for job runs
		let query = locals.supabase
			.from('background_job_runs')
			.select(
				'id, job_name, status, started_at, completed_at, execution_time_ms, error_message, metadata',
				{ count: 'exact' }
			)
			.gte('started_at', periodStart)
			.order('started_at', { ascending: false });

		// Apply filters
		if (job_name) {
			query = query.eq('job_name', job_name);
		}

		if (status !== 'all') {
			query = query.eq('status', status);
		}

		// Execute with pagination
		const { data: jobs, error: jobsError, count } = await query.range(offset, offset + limit - 1);

		if (jobsError) {
			console.error('[CRON Jobs API] Query error:', jobsError);
			throw error(500, 'Failed to fetch job runs');
		}

		// Fetch stats for the period (separate query for aggregates)
		const statsQuery = locals.supabase
			.from('background_job_runs')
			.select('status, execution_time_ms')
			.gte('started_at', periodStart);

		// Apply same job_name filter to stats if specified
		const { data: statsData, error: statsError } = job_name
			? await statsQuery.eq('job_name', job_name)
			: await statsQuery;

		if (statsError) {
			console.error('[CRON Jobs API] Stats query error:', statsError);
			throw error(500, 'Failed to fetch job stats');
		}

		// Calculate stats
		const totalRuns = statsData?.length ?? 0;
		const successCount = statsData?.filter((j) => j.status === 'success').length ?? 0;
		const failedCount =
			statsData?.filter((j) => j.status === 'failed' || j.status === 'timeout').length ?? 0;

		const executionTimes =
			statsData
				?.filter((j) => j.execution_time_ms !== null)
				.map((j) => j.execution_time_ms as number) ?? [];

		const avgExecutionTime =
			executionTimes.length > 0
				? Math.round(executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length)
				: 0;

		const response: CronJobsResponse = {
			jobs: (jobs ?? []).map((job) => ({
				id: job.id,
				job_name: job.job_name,
				status: job.status as 'running' | 'success' | 'failed' | 'timeout',
				started_at: job.started_at,
				completed_at: job.completed_at,
				execution_time_ms: job.execution_time_ms,
				error_message: job.error_message,
				metadata: (job.metadata as Record<string, unknown>) ?? null
			})),
			stats: {
				total_runs_period: totalRuns,
				success_count: successCount,
				failed_count: failedCount,
				avg_execution_time_ms: avgExecutionTime
			},
			pagination: {
				total: count ?? 0,
				limit,
				offset
			}
		};

		return json(response);
	} catch (err) {
		if (err instanceof Response) throw err;
		console.error('[CRON Jobs API] Unexpected error:', err);
		throw error(500, 'Internal server error');
	}
};
