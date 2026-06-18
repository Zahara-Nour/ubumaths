/**
 * Admin Bug Reports Page - Server Load
 *
 * Load all bug reports with filtering support.
 * Only accessible to admins.
 */

import type { PageServerLoad } from './$types';
import type { BugReportWithAuthor } from '$lib/types/bug-reports';
import { signBugReportScreenshots } from '$lib/server/bug-report-screenshots';
import { requireAdmin } from '$lib/server/middleware/auth';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Admin gate (admin login OR step-up elevation)
	const { supabase } = await requireAdmin(locals);

	// Parse filters from query params
	const status = url.searchParams.get('status') || undefined;
	const category = url.searchParams.get('category') || undefined;
	const severity = url.searchParams.get('severity') || undefined;

	// Fetch all bug reports with author info
	let query = supabase
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
	const { data: allReports } = await supabase
		.from('bug_reports')
		.select('status, severity, created_at');

	// Replace stored screenshot_url with fresh signed URLs (private bucket)
	await signBugReportScreenshots(supabase, (reports ?? []) as BugReportWithAuthor[]);

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
