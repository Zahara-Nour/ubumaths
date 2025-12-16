/**
 * Health Statistics Utilities
 * Fetches and caches expensive admin dashboard statistics
 *
 * NOTE: This file uses type assertions for new tables/views (server_cache, admin_* views, background_job_runs)
 * that are not yet in the generated database.ts types. Run `pnpm db:types` after migrations are pushed.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { HealthStatsResponse } from './validation/health';

// Type definitions for new tables/views not yet in database.ts
interface ServerCacheRow {
	key: string;
	value: unknown;
	expires_at: string;
	created_at?: string;
}

// Admin view types (not in generated types yet)
interface AdminErrorStats24h {
	critical_errors_24h?: number;
	unresolved_errors?: number;
	total_errors_1h?: number;
}

interface AdminUserActivity {
	new_users_7d?: number;
	total_students?: number;
	total_teachers?: number;
	total_admins?: number;
}

interface AdminOnlineUsers {
	online_users?: number;
}

interface AdminContentStats {
	total_exercises?: number;
	total_assessments?: number;
	total_riddles?: number;
	total_srs_decks?: number;
	assignments_24h?: number;
	completions_24h?: number;
}

interface BackgroundJobRun {
	job_name: string;
	status: string;
	started_at?: string;
	completed_at?: string | null;
	error_message?: string | null;
	execution_time_ms?: number | null;
}

interface AdminJobStatus {
	job_name: string;
	status: string;
	started_at?: string;
	completed_at?: string;
	error_message?: string | null;
	execution_time_ms?: number | null;
}

// Helper type for untyped Supabase client (tables not in database.ts)
type UntypedSupabaseClient = SupabaseClient<Database> & {
	from: (table: string) => ReturnType<SupabaseClient<Database>['from']>;
};

// ============================================================================
// CACHE HELPERS
// ============================================================================

/**
 * Get cached stats from server_cache table
 * Returns null if cache miss or expired
 */
export async function getCachedHealthStats(
	supabase: SupabaseClient<Database>,
	cacheKey: string
): Promise<HealthStatsResponse | null> {
	const client = supabase as UntypedSupabaseClient;
	const { data, error } = await client
		.from('server_cache')
		.select('value, expires_at')
		.eq('key', cacheKey)
		.gt('expires_at', new Date().toISOString())
		.single();

	if (error || !data) {
		return null;
	}

	return (data as ServerCacheRow).value as HealthStatsResponse;
}

/**
 * Set cached stats in server_cache table
 * @param ttlSeconds Cache time-to-live in seconds (default: 300 = 5 minutes)
 */
export async function setCachedHealthStats(
	supabase: SupabaseClient<Database>,
	cacheKey: string,
	stats: HealthStatsResponse,
	ttlSeconds: number = 300
): Promise<void> {
	const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
	const client = supabase as UntypedSupabaseClient;

	await client.from('server_cache').upsert({
		key: cacheKey,
		value: stats,
		expires_at: expiresAt.toISOString()
	});
}

// ============================================================================
// ERROR STATISTICS
// ============================================================================

/**
 * Fetch 7-day error trend
 * Returns array of 7 numbers (day 0 = today, day 6 = 6 days ago)
 */
async function fetch7DayErrorTrend(supabase: SupabaseClient<Database>): Promise<number[]> {
	// Calculate manually by querying error_logs for each day
	const trend: number[] = [];

	for (let i = 0; i < 7; i++) {
		const startOfDay = new Date();
		startOfDay.setDate(startOfDay.getDate() - i);
		startOfDay.setHours(0, 0, 0, 0);

		const endOfDay = new Date(startOfDay);
		endOfDay.setHours(23, 59, 59, 999);

		const { count } = await supabase
			.from('error_logs')
			.select('*', { count: 'exact', head: true })
			.gte('created_at', startOfDay.toISOString())
			.lte('created_at', endOfDay.toISOString());

		trend.push(count ?? 0);
	}

	return trend.reverse(); // Oldest first
}

/**
 * Fetch error statistics
 */
async function fetchErrorStats(supabase: SupabaseClient<Database>) {
	const client = supabase as UntypedSupabaseClient;
	const { data: errorStats } = await client.from('admin_error_stats_24h').select('*').single();

	const trend7d = await fetch7DayErrorTrend(supabase);

	const stats = errorStats as AdminErrorStats24h | null;

	return {
		critical: stats?.critical_errors_24h ?? 0,
		unresolved: stats?.unresolved_errors ?? 0,
		lastHour: stats?.total_errors_1h ?? 0,
		trend7d
	};
}

// ============================================================================
// USER STATISTICS
// ============================================================================

/**
 * Fetch active users by time period
 * Queries user_presence table for different time windows
 */
async function fetchActiveUsersByPeriod(supabase: SupabaseClient<Database>) {
	const now = new Date();

	// Active in last 24 hours
	const { count: active24h } = await supabase
		.from('user_presence')
		.select('*', { count: 'exact', head: true })
		.gt('last_heartbeat', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

	// Active in last 7 days
	const { count: active7d } = await supabase
		.from('user_presence')
		.select('*', { count: 'exact', head: true })
		.gt('last_heartbeat', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString());

	// Active in last 30 days
	const { count: active30d } = await supabase
		.from('user_presence')
		.select('*', { count: 'exact', head: true })
		.gt('last_heartbeat', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString());

	return {
		active24h: active24h ?? 0,
		active7d: active7d ?? 0,
		active30d: active30d ?? 0
	};
}

/**
 * Fetch user statistics
 */
async function fetchUserStats(supabase: SupabaseClient<Database>) {
	const client = supabase as UntypedSupabaseClient;
	const userActivityPromise = client.from('admin_user_activity').select('*').single();
	const onlineUsersPromise = client.from('admin_online_users').select('*').single();
	const activeUsersPromise = fetchActiveUsersByPeriod(supabase);

	const [userActivity, onlineUsers, activeUsers] = await Promise.all([
		userActivityPromise,
		onlineUsersPromise,
		activeUsersPromise
	]);

	const userActivityData = userActivity.data as AdminUserActivity | null;
	const onlineUsersData = onlineUsers.data as AdminOnlineUsers | null;

	return {
		online: onlineUsersData?.online_users ?? 0,
		active24h: activeUsers.active24h,
		active7d: activeUsers.active7d,
		active30d: activeUsers.active30d,
		new7d: userActivityData?.new_users_7d ?? 0,
		byRole: {
			students: userActivityData?.total_students ?? 0,
			teachers: userActivityData?.total_teachers ?? 0,
			admins: userActivityData?.total_admins ?? 0
		}
	};
}

// ============================================================================
// PERFORMANCE STATISTICS
// ============================================================================

/**
 * Fetch performance statistics
 * Analyzes error_logs response_time and status_code columns
 */
async function fetchPerformanceStats(supabase: SupabaseClient<Database>) {
	// Query error_logs for performance metrics (last 24h)
	const { data: errors } = await supabase
		.from('error_logs')
		.select('response_time, status_code')
		.gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
		.limit(1000);

	// Extract response times and calculate metrics
	const responseTimes: number[] = [];
	let errorCount = 0;
	let totalRequests = 1; // Avoid division by zero

	if (errors) {
		errors.forEach((errorRow) => {
			if (errorRow.response_time !== null) {
				responseTimes.push(errorRow.response_time);
			}
			if (errorRow.status_code !== null && errorRow.status_code >= 500) {
				errorCount++;
			}
		});
		totalRequests = errors.length || 1;
	}

	// Calculate statistics
	const avgResponseTime =
		responseTimes.length > 0
			? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
			: 0;

	// Calculate p95
	const sortedTimes = [...responseTimes].sort((a, b) => a - b);
	const p95Index = Math.floor(sortedTimes.length * 0.95);
	const p95ResponseTime = sortedTimes.length > 0 ? (sortedTimes[p95Index] ?? 0) : 0;

	// Error rate percentage
	const errorRate = (errorCount / totalRequests) * 100;

	// Count slow queries (>1000ms)
	const slowQueries = responseTimes.filter((time) => time > 1000).length;

	return {
		avgResponseTime,
		p95ResponseTime,
		errorRate: parseFloat(errorRate.toFixed(2)),
		slowQueries
	};
}

// ============================================================================
// CONTENT STATISTICS
// ============================================================================

/**
 * Fetch content statistics
 */
async function fetchContentStats(supabase: SupabaseClient<Database>) {
	const client = supabase as UntypedSupabaseClient;
	const { data: contentStats } = await client.from('admin_content_stats').select('*').single();

	const stats = contentStats as AdminContentStats | null;

	return {
		exercises: stats?.total_exercises ?? 0,
		assessments: stats?.total_assessments ?? 0,
		riddles: stats?.total_riddles ?? 0,
		srsDecks: stats?.total_srs_decks ?? 0,
		assignments24h: stats?.assignments_24h ?? 0,
		completions24h: stats?.completions_24h ?? 0
	};
}

// ============================================================================
// JOB STATISTICS
// ============================================================================

/**
 * Fetch job statistics
 */
async function fetchJobStats(supabase: SupabaseClient<Database>) {
	const client = supabase as UntypedSupabaseClient;

	// Get recent job runs (last 20)
	const { data: recentJobs } = await client
		.from('background_job_runs')
		.select('job_name, status, started_at, completed_at, error_message, execution_time_ms')
		.order('started_at', { ascending: false })
		.limit(20);

	// Get job status summary
	const { data: jobSummary } = await client.from('admin_job_status').select('*');

	const jobs = (jobSummary ?? []) as AdminJobStatus[];

	const total = jobs.length;
	const running = jobs.filter((j) => j.status === 'running').length;
	const failed = jobs.filter((j) => j.status === 'failed' || j.status === 'timeout').length;

	const jobRuns = (recentJobs ?? []) as BackgroundJobRun[];

	const recentJobsFormatted = jobRuns.map((job) => ({
		name: job.job_name,
		status: job.status as 'running' | 'success' | 'failed' | 'timeout',
		lastRun: job.completed_at ?? job.started_at ?? null,
		executionTime: job.execution_time_ms ?? null,
		error: job.error_message ?? null
	}));

	return {
		total,
		running,
		failed,
		recentJobs: recentJobsFormatted
	};
}

// ============================================================================
// MAIN FETCH FUNCTION
// ============================================================================

/**
 * Fetch all admin dashboard statistics
 * This is an expensive query that should be cached in server_cache table
 *
 * @param supabase - Supabase client with admin privileges
 * @returns Complete health statistics for admin dashboard
 */
export async function fetchHealthStats(
	supabase: SupabaseClient<Database>
): Promise<HealthStatsResponse> {
	// Query all statistics in parallel for performance
	const [errors, users, performance, content, jobs] = await Promise.all([
		fetchErrorStats(supabase),
		fetchUserStats(supabase),
		fetchPerformanceStats(supabase),
		fetchContentStats(supabase),
		fetchJobStats(supabase)
	]);

	return {
		errors,
		users,
		performance,
		content,
		jobs,
		meta: {
			cached: false,
			generatedAt: new Date().toISOString()
		}
	};
}
