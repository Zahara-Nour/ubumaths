/**
 * Admin Bug Reports Page - Server Load
 *
 * Load all bug reports with filtering support.
 * Only accessible to admins.
 */

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { BugReportWithAuthor } from '$lib/types/bug-reports';

export const load: PageServerLoad = async ({ locals, url }) => {
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

	// Parse filters from query params
	const status = url.searchParams.get('status') || undefined;
	const category = url.searchParams.get('category') || undefined;
	const severity = url.searchParams.get('severity') || undefined;

	// Fetch all bug reports with author info
	let query = locals.supabase
		.from('bug_reports')
		.select(
			`
			*,
			author:profiles!bug_reports_user_id_fkey(id, full_name, email, role),
			resolver:profiles!bug_reports_resolved_by_fkey(id, full_name)
		`
		)
		.order('created_at', { ascending: false });

	if (status) {
		query = query.eq('status', status);
	}
	if (category) {
		query = query.eq('category', category);
	}
	if (severity) {
		query = query.eq('severity', severity);
	}

	const { data: reports, error: queryError } = await query;

	if (queryError) {
		console.error('Error fetching bug reports:', queryError);
		return {
			reports: [] as BugReportWithAuthor[],
			filters: { status, category, severity },
			stats: { total: 0, pending: 0, critical: 0, today: 0 }
		};
	}

	// Get stats
	const { data: allReports } = await locals.supabase
		.from('bug_reports')
		.select('status, severity, created_at');

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const stats = {
		total: allReports?.length ?? 0,
		pending: allReports?.filter((r) => r.status === 'pending').length ?? 0,
		critical:
			allReports?.filter((r) => r.severity === 'critical' && r.status !== 'resolved').length ?? 0,
		today: allReports?.filter((r) => new Date(r.created_at) >= today).length ?? 0
	};

	return {
		reports: (reports ?? []) as BugReportWithAuthor[],
		filters: { status, category, severity },
		stats
	};
};
