import { handle as supabaseHandle } from '$lib/server/supabase';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { logError, getUserContext } from '$lib/server/errorMonitoring';
import { dev } from '$app/environment';

/**
 * Error monitoring handle
 * Captures unhandled server errors and slow requests
 */
const errorMonitoringHandle: Handle = async ({ event, resolve }) => {
	const startTime = Date.now();

	try {
		// Resolve the request
		const response = await resolve(event);

		// Track response time for performance monitoring
		const responseTime = Date.now() - startTime;

		// Log slow requests (> 3 seconds)
		if (responseTime > 3000) {
			const session = await event.locals.safeGetSession();
			const userContext = session?.user?.id
				? await getUserContext(event.locals.supabase, session.user.id)
				: {};

			await logError(event.locals.supabase, {
				error_type: 'performance',
				severity: responseTime > 10000 ? 'error' : 'warning',
				message: `Slow request: ${responseTime}ms`,
				url: event.url.pathname,
				request_method: event.request.method,
				response_time: responseTime,
				status_code: response.status,
				...userContext,
				tags: ['slow_request']
			});
		}

		return response;
	} catch (error) {
		// Capture the error
		const errorMessage = error instanceof Error ? error.message : String(error);
		const stackTrace = error instanceof Error ? error.stack : undefined;

		// Get user context if available
		const session = await event.locals.safeGetSession();
		const userContext = session?.user?.id
			? await getUserContext(event.locals.supabase, session.user.id)
			: {};

		// Determine error type based on route
		const errorType = event.url.pathname.startsWith('/api/')
			? 'server_api'
			: event.url.pathname.includes('+page.server.ts')
				? 'server_load'
				: event.url.pathname.includes('+server.ts')
					? 'server_action'
					: 'server_api';

		// Log the error
		await logError(event.locals.supabase, {
			error_type: errorType,
			severity: 'error',
			message: errorMessage,
			url: event.url.pathname,
			stack_trace: stackTrace,
			request_method: event.request.method,
			response_time: Date.now() - startTime,
			...userContext,
			context: {
				search_params: Object.fromEntries(event.url.searchParams)
			}
		});

		// Log to console in development
		if (dev) {
			console.error('[Server Error]', {
				url: event.url.pathname,
				method: event.request.method,
				error: errorMessage
			});
		}

		// Re-throw to allow SvelteKit's error handling
		throw error;
	}
};

// Combine hooks in sequence: Supabase first, then error monitoring
export const handle: Handle = sequence(supabaseHandle, errorMonitoringHandle);
