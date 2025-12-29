/**
 * Bug Reports API
 * ================
 *
 * GET  /api/bug-reports - List bug reports (user: own reports, admin: all)
 * POST /api/bug-reports - Create a new bug report
 *
 * AUTH: Authenticated users only
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import {
	createBugReportSchema,
	listBugReportsQuerySchema
} from '$lib/server/validation/bug-reports';
import type { BugReportWithAuthor, ListBugReportsResponse } from '$lib/types/bug-reports';
import { notifyAdminsOfNewBugReport } from '$lib/server/notifications';

// =============================================================================
// GET /api/bug-reports - List bug reports
// =============================================================================

export const GET: RequestHandler = async ({ locals, url }) => {
	const { user, profile } = await requireAuth(locals);
	const isAdmin = profile.role === 'admin';

	// Validate query parameters
	const queryResult = listBugReportsQuerySchema.safeParse(
		Object.fromEntries(url.searchParams.entries())
	);
	if (!queryResult.success) {
		throw error(400, queryResult.error.issues[0].message);
	}

	const { status, category, severity, limit, offset } = queryResult.data;

	try {
		// Build query
		let query = locals.supabase
			.from('bug_reports')
			.select(
				`
				*,
				author:profiles!bug_reports_user_id_fkey (
					id,
					full_name,
					email,
					role
				),
				resolver:profiles!bug_reports_resolved_by_fkey (
					id,
					full_name
				)
			`,
				{ count: 'exact' }
			)
			.order('created_at', { ascending: false });

		// Users can only see their own reports (RLS enforces this too)
		if (!isAdmin) {
			query = query.eq('user_id', user.id);
		}

		// Apply filters
		if (status) {
			query = query.eq('status', status);
		}
		if (category) {
			query = query.eq('category', category);
		}
		if (severity) {
			query = query.eq('severity', severity);
		}

		// Apply pagination
		query = query.range(offset, offset + limit - 1);

		const { data: reports, error: queryError, count } = await query;

		if (queryError) {
			console.error('[API] Error fetching bug reports:', queryError);
			throw error(500, 'Erreur lors de la récupération des rapports');
		}

		const response: ListBugReportsResponse = {
			reports: (reports as BugReportWithAuthor[]) || [],
			total: count || 0,
			limit,
			offset
		};

		return json(response);
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('[API] Unexpected error in GET /api/bug-reports:', err);
		throw error(500, 'Une erreur inattendue est survenue');
	}
};

// =============================================================================
// POST /api/bug-reports - Create a new bug report
// =============================================================================

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user, profile } = await requireAuth(locals);

	// Validate request body
	const body = await request.json();
	const validation = createBugReportSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const data = validation.data;

	try {
		// Enrich session context with recent errors from error_logs
		const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

		// Fetch recent errors for this user
		const { data: recentErrors } = await locals.supabase
			.from('error_logs')
			.select(
				'id, error_type, message, severity, created_at, url, file_path, line_number, stack_trace'
			)
			.eq('user_id', user.id)
			.gte('created_at', fiveMinutesAgo)
			.order('created_at', { ascending: false })
			.limit(10);

		// Fetch recent slow requests
		const { data: slowRequests } = await locals.supabase
			.from('error_logs')
			.select('url, response_time, status_code, created_at')
			.eq('user_id', user.id)
			.eq('error_type', 'performance')
			.gte('created_at', fiveMinutesAgo)
			.order('created_at', { ascending: false })
			.limit(5);

		// Build enriched context
		const enrichedContext = {
			...data.sessionContext,
			capturedAt: new Date().toISOString(),
			recentErrors:
				recentErrors?.map((e) => ({
					id: e.id,
					type: e.error_type,
					message: e.message?.substring(0, 500) || '',
					severity: e.severity || 'error',
					timestamp: e.created_at,
					url: e.url,
					file_path: e.file_path,
					line_number: e.line_number,
					stack_trace: e.stack_trace?.substring(0, 2000)
				})) || [],
			slowRequests:
				slowRequests?.map((r) => ({
					url: r.url || '',
					duration: r.response_time || 0,
					status: r.status_code || 0
				})) || []
		};

		// Insert the bug report
		const { data: report, error: insertError } = await locals.supabase
			.from('bug_reports')
			.insert({
				user_id: user.id,
				category: data.category,
				severity: data.severity,
				title: data.title,
				description: data.description,
				page_url: data.pageUrl,
				user_agent: data.userAgent,
				viewport_size: data.viewportSize,
				session_context: enrichedContext,
				screenshot_url: data.screenshotUrl,
				screenshot_path: data.screenshotPath,
				auto_generated: data.autoGenerated
			})
			.select()
			.single();

		if (insertError) {
			console.error('[API] Error creating bug report:', insertError);
			throw error(500, 'Erreur lors de la création du rapport');
		}

		// Notify admins of new report
		try {
			await notifyAdminsOfNewBugReport(locals.supabase, {
				reportId: report.id,
				userName: profile.full_name || profile.email || 'Utilisateur',
				category: data.category,
				severity: data.severity,
				title: data.title
			});
		} catch (notifyError) {
			// Don't fail the request if notification fails
			console.error('[API] Failed to notify admins:', notifyError);
		}

		return json({ success: true, report }, { status: 201 });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('[API] Unexpected error in POST /api/bug-reports:', err);
		throw error(500, 'Une erreur inattendue est survenue');
	}
};
