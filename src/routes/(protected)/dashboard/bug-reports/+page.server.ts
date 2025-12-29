/**
 * User Bug Reports Page - Server Load
 *
 * Load user's own bug reports with filtering support.
 */

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { BugReportWithAuthor } from '$lib/types/bug-reports';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Check authentication
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(302, '/auth');
	}

	// Parse filters from query params
	const status = url.searchParams.get('status') || undefined;
	const category = url.searchParams.get('category') || undefined;

	// Fetch user's bug reports
	let query = locals.supabase
		.from('bug_reports')
		.select('*')
		.eq('user_id', user.id)
		.order('created_at', { ascending: false });

	if (status) {
		query = query.eq('status', status);
	}
	if (category) {
		query = query.eq('category', category);
	}

	const { data: reports, error } = await query;

	if (error) {
		console.error('Error fetching bug reports:', error);
		return {
			reports: [] as BugReportWithAuthor[],
			filters: { status, category }
		};
	}

	// Get stats
	const { data: stats } = await locals.supabase
		.from('bug_reports')
		.select('status')
		.eq('user_id', user.id);

	const statusCounts = {
		total: stats?.length ?? 0,
		pending: stats?.filter((r) => r.status === 'pending').length ?? 0,
		in_progress:
			stats?.filter((r) => ['acknowledged', 'in_progress'].includes(r.status)).length ?? 0,
		resolved: stats?.filter((r) => r.status === 'resolved').length ?? 0
	};

	return {
		reports: (reports ?? []) as BugReportWithAuthor[],
		filters: { status, category },
		statusCounts
	};
};
