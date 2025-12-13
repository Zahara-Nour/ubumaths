/**
 * Service Role Supabase Client
 *
 * Creates a Supabase client with service role key that bypasses RLS.
 * Use ONLY for server-side operations that require elevated permissions:
 * - Job logging (background_job_runs table)
 * - System operations (cron jobs, background tasks)
 * - Administrative operations
 *
 * SECURITY:
 * - NEVER expose service role client to client-side code
 * - NEVER use for user-initiated operations (use locals.supabase instead)
 * - Service role bypasses ALL RLS policies
 * - Only use when RLS bypass is explicitly required
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { createServerLogger } from '$lib/utils/logger';
import { dev } from '$app/environment';

const logger = createServerLogger('server/serviceRoleClient');

/**
 * Allowed paths for service role client usage.
 * Add new paths here when legitimate use cases are identified.
 */
const ALLOWED_SERVICE_ROLE_PATHS = [
	// Cron jobs
	'/api/cron/',
	'/riddles/auto-select',
	// Server utilities that need RLS bypass
	'rateLimiter.ts',
	'errorMonitoring.ts',
	'serviceRoleClient.ts',
	// SRS operations
	'srs/',
	// Test files
	'.test.ts',
	// Cleanup endpoints
	'/api/cleanup/',
	'/api/errors/cleanup'
] as const;

/**
 * Check if caller path is in the allowed list for service role usage.
 * Warns in development mode when used from unexpected locations.
 *
 * Note: This is dev-only by design. Production monitoring should be handled
 * by observability tools (Sentry, Datadog, etc.) not console warnings.
 */
function auditServiceRoleUsage(): void {
	if (!dev) return; // Only audit in development

	const stack = new Error().stack;
	if (!stack) return;

	// Parse stack trace to find the first caller outside this file
	// This is more robust than using a fixed index which varies by environment
	const stackLines = stack.split('\n');
	let callerLine: string | undefined;

	for (let i = 1; i < stackLines.length; i++) {
		const line = stackLines[i];
		if (line && !line.includes('serviceRoleClient.ts')) {
			callerLine = line.trim();
			break;
		}
	}

	if (!callerLine) {
		console.warn(
			'\x1b[33m%s\x1b[0m',
			'[SECURITY WARNING] Could not determine service role client caller from stack trace'
		);
		return;
	}

	// Check if caller is in allowed paths
	const isAllowed = ALLOWED_SERVICE_ROLE_PATHS.some((path) => callerLine!.includes(path));

	if (!isAllowed) {
		console.warn(
			'\x1b[33m%s\x1b[0m', // Yellow color
			`[SECURITY WARNING] Service role client used from unexpected location:\n  ${callerLine}\n` +
				`  Allowed paths: ${ALLOWED_SERVICE_ROLE_PATHS.join(', ')}\n` +
				`  If this is a legitimate use case, add the path to ALLOWED_SERVICE_ROLE_PATHS in serviceRoleClient.ts`
		);
	}
}

/**
 * Singleton service role client
 *
 * **Why Singleton?**
 * - Reuses the same HTTP client across all requests
 * - Prevents connection pool exhaustion
 * - Improves performance by maintaining persistent connections
 *
 * **HMR Safety**:
 * - Uses `globalThis` to persist client across Hot Module Replacement (HMR) reloads
 * - Without this, Vite's HMR would reset the instance on every file change
 */
const globalForSupabase = globalThis as unknown as {
	supabaseServiceRoleClient: SupabaseClient<Database> | undefined;
};

let serviceRoleClientInstance: SupabaseClient<Database> | null =
	globalForSupabase.supabaseServiceRoleClient || null;

/**
 * Create Supabase client with service role key (bypasses RLS)
 *
 * **Use ONLY for server-side operations like:**
 * - Job logging (background_job_runs)
 * - System maintenance (cleanup tasks)
 * - Administrative operations
 *
 * **DO NOT use for:**
 * - User-initiated operations (use locals.supabase)
 * - Client-side code (service role key is SECRET)
 *
 * @returns {SupabaseClient<Database>} Service role Supabase client
 *
 * @example Job logging in cron endpoint
 * ```typescript
 * import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
 *
 * export const POST: RequestHandler = async () => {
 *   const serviceClient = createServiceRoleClient();
 *
 *   // Start job run
 *   const { data: runId } = await serviceClient.rpc('start_job_run', {
 *     job_name: 'my_cron_job'
 *   });
 *
 *   try {
 *     // Do job work...
 *
 *     // Complete job run
 *     await serviceClient.rpc('complete_job_run', {
 *       run_id: runId,
 *       status: 'success'
 *     });
 *   } catch (err) {
 *     await serviceClient.rpc('complete_job_run', {
 *       run_id: runId,
 *       status: 'failed',
 *       error_message: err.message
 *     });
 *   }
 * };
 * ```
 */
export function createServiceRoleClient(): SupabaseClient<Database> {
	// Audit usage in development mode
	auditServiceRoleUsage();

	// Return existing instance if already created
	if (serviceRoleClientInstance) {
		return serviceRoleClientInstance;
	}

	// Get environment variables from process.env
	const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
	const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
		logger.error('Missing Supabase environment variables for service role client', {
			hasUrl: !!SUPABASE_URL,
			hasKey: !!SERVICE_ROLE_KEY
		});
		throw new Error('Missing Supabase environment variables for service role client');
	}

	// Create new instance and cache it
	serviceRoleClientInstance = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});

	// Store in globalThis to persist across HMR reloads
	globalForSupabase.supabaseServiceRoleClient = serviceRoleClientInstance;

	logger.trace('Service role client initialized');
	return serviceRoleClientInstance;
}
