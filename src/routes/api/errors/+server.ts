/**
 * API Route: GET /api/errors
 * Get list of error logs with optional filters (admin only)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getErrorLogs, type ErrorFilters } from '$lib/server/errorMonitoring';

export const GET: RequestHandler = async ({ url, locals }) => {
	// Check authentication
	const session = await locals.safeGetSession();
	if (!session) {
		throw error(401, 'Unauthorized');
	}

	// Check if user is admin
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', session.user.id)
		.single();

	if (!profile || profile.role !== 'admin') {
		throw error(403, 'Forbidden - Admin access required');
	}

	try {
		// Parse query parameters
		const filters: ErrorFilters = {};

		const error_type = url.searchParams.get('error_type');
		if (error_type) {
			filters.error_type = error_type as any;
		}

		const severity = url.searchParams.get('severity');
		if (severity) {
			filters.severity = severity as any;
		}

		const resolved = url.searchParams.get('resolved');
		if (resolved !== null) {
			filters.resolved = resolved === 'true';
		}

		const user_id = url.searchParams.get('user_id');
		if (user_id) {
			filters.user_id = user_id;
		}

		const date_from = url.searchParams.get('date_from');
		if (date_from) {
			filters.date_from = date_from;
		}

		const date_to = url.searchParams.get('date_to');
		if (date_to) {
			filters.date_to = date_to;
		}

		const search = url.searchParams.get('search');
		if (search) {
			filters.search = search;
		}

		const limit = url.searchParams.get('limit');
		if (limit) {
			filters.limit = parseInt(limit, 10);
		}

		const offset = url.searchParams.get('offset');
		if (offset) {
			filters.offset = parseInt(offset, 10);
		}

		// Get error logs
		const result = await getErrorLogs(locals.supabase, filters);

		if (!result.success) {
			throw error(500, result.error || 'Failed to retrieve errors');
		}

		return json({
			errors: result.data,
			count: result.count
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('Error in /api/errors:', err);
		throw error(500, 'Internal server error');
	}
};
