/**
 * API Route: GET /api/errors/occurrences
 * Get deduplicated error occurrences (admin only)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getErrorOccurrences, type ErrorFilters } from '$lib/server/errorMonitoring';

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
		const filters: Omit<ErrorFilters, 'user_id'> = {};

		const error_type = url.searchParams.get('error_type');
		if (error_type) {
			filters.error_type = error_type as ErrorFilters['error_type'];
		}

		const severity = url.searchParams.get('severity');
		if (severity) {
			filters.severity = severity as ErrorFilters['severity'];
		}

		const resolved = url.searchParams.get('resolved');
		if (resolved !== null) {
			filters.resolved = resolved === 'true';
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

		// Get error occurrences
		const result = await getErrorOccurrences(locals.supabase, filters);

		if (!result.success) {
			throw error(500, result.error || 'Failed to retrieve error occurrences');
		}

		return json({
			occurrences: result.data,
			count: result.count
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('Error in /api/errors/occurrences:', err);
		throw error(500, 'Internal server error');
	}
};
