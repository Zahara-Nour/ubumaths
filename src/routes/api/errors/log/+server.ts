/**
 * API Route: POST /api/errors/log
 * Log a new error (from client or server)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logError, getUserContext, type LogErrorData } from '$lib/server/errorMonitoring';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Parse error data from request
		const errorData: LogErrorData = await request.json();

		// Validate required fields
		if (!errorData.error_type || !errorData.message || !errorData.url) {
			throw error(400, 'Missing required fields: error_type, message, url');
		}

		// Get user context if session exists
		const session = await locals.safeGetSession();
		let userContext = {};
		if (session?.user?.id) {
			userContext = await getUserContext(locals.supabase, session.user.id);
		}

		// Merge error data with user context
		const completeErrorData: LogErrorData = {
			...errorData,
			...userContext
		};

		// Log the error
		const result = await logError(locals.supabase, completeErrorData);

		if (!result.success) {
			console.error('Failed to log error:', result.error);
			throw error(500, result.error || 'Failed to log error');
		}

		return json({ success: true, id: result.id });
	} catch (err) {
		// If this is already a SvelteKit error, rethrow it
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('Error in /api/errors/log:', err);
		throw error(500, 'Internal server error');
	}
};
