/**
 * Admin Error Dashboard - Server Load
 * Load error logs and statistics for admin dashboard
 */

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getErrorStats, getErrorOccurrences } from '$lib/server/errorMonitoring';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Check authentication
	const session = await locals.safeGetSession();
	if (!session) {
		throw redirect(302, '/auth');
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

	// Parse filters from query params
	const filters: Record<string, string | boolean | number> = {};
	const error_type = url.searchParams.get('type');
	if (error_type) filters.error_type = error_type;

	const severity = url.searchParams.get('severity');
	if (severity) filters.severity = severity;

	const resolved = url.searchParams.get('resolved');
	if (resolved !== null) filters.resolved = resolved === 'true';

	const search = url.searchParams.get('search');
	if (search) filters.search = search;

	filters.limit = 50;
	filters.offset = 0;

	// Load error statistics (last 24 hours)
	const statsResult = await getErrorStats(locals.supabase, 24);

	// Load error occurrences (deduplicated errors)
	const occurrencesResult = await getErrorOccurrences(locals.supabase, filters);

	return {
		stats: statsResult.success ? statsResult.data : null,
		occurrences: occurrencesResult.success ? occurrencesResult.data : [],
		count: occurrencesResult.count || 0,
		filters: {
			type: error_type,
			severity,
			resolved: resolved === 'true' ? true : resolved === 'false' ? false : null,
			search
		}
	};
};
