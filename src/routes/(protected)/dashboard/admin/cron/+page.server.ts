/**
 * Admin CRON Monitoring - Server Load
 * Loads initial job data for the CRON monitoring page
 */

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { CronJobRun, CronJobsStats } from '$lib/server/validation/cron';

// Type for background_job_runs table (not in generated types)
interface BackgroundJobRunRow {
	id: string;
	job_name: string;
	status: string;
	started_at: string;
	completed_at: string | null;
	execution_time_ms: number | null;
	error_message: string | null;
	metadata: Record<string, unknown> | null;
}

export const load: PageServerLoad = async ({ locals }) => {
	// Check authentication
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(302, '/auth');
	}

	// Check if user is admin
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'admin') {
		throw error(403, 'Forbidden - Admin access required');
	}

	// Calculate 7-day period start
	const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

	// Fetch recent jobs (last 7 days, most recent first)
	const { data: jobsData, error: jobsError } = await locals.supabase
		.from('background_job_runs')
		.select(
			'id, job_name, status, started_at, completed_at, execution_time_ms, error_message, metadata'
		)
		.gte('started_at', periodStart)
		.order('started_at', { ascending: false })
		.limit(50);

	if (jobsError) {
		console.error('[CRON Page] Failed to fetch jobs:', jobsError);
		throw error(500, 'Failed to load job data');
	}

	const jobs: CronJobRun[] = ((jobsData as BackgroundJobRunRow[]) ?? []).map((job) => ({
		id: job.id,
		job_name: job.job_name,
		status: job.status as 'running' | 'success' | 'failed' | 'timeout',
		started_at: job.started_at,
		completed_at: job.completed_at,
		execution_time_ms: job.execution_time_ms,
		error_message: job.error_message,
		metadata: job.metadata
	}));

	// Calculate stats
	const totalRuns = jobs.length;
	const successCount = jobs.filter((j) => j.status === 'success').length;
	const failedCount = jobs.filter((j) => j.status === 'failed' || j.status === 'timeout').length;

	const executionTimes = jobs
		.filter((j) => j.execution_time_ms !== null)
		.map((j) => j.execution_time_ms as number);

	const avgExecutionTime =
		executionTimes.length > 0
			? Math.round(executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length)
			: 0;

	const stats: CronJobsStats = {
		total_runs_period: totalRuns,
		success_count: successCount,
		failed_count: failedCount,
		avg_execution_time_ms: avgExecutionTime
	};

	// Get unique job names for filter dropdown
	const jobNames = [...new Set(jobs.map((j) => j.job_name))].sort();

	return {
		jobs,
		stats,
		jobNames,
		filters: {
			job_name: null as string | null,
			status: 'all' as string,
			period: '7d' as string
		}
	};
};
