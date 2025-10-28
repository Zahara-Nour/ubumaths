/**
 * API Route: GET /api/errors/stats
 * Get error statistics for dashboard (admin only)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getErrorStats } from '$lib/server/errorMonitoring';

export const GET: RequestHandler = async ({ url, locals }) => {
	// Check authentication
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw error(401, 'Unauthorized');
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

	try {
		// Parse hours parameter (default: 24)
		const hoursParam = url.searchParams.get('hours');
		const hours = hoursParam ? parseInt(hoursParam, 10) : 24;

		const result = await getErrorStats(locals.supabase, hours);

		if (!result.success) {
			throw error(500, result.error || 'Failed to retrieve statistics');
		}

		return json({ stats: result.data });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('Error in /api/errors/stats:', err);
		throw error(500, 'Internal server error');
	}
};
