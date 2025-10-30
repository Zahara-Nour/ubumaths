/**
 * API Route: GET /api/errors
 * Get list of error logs with optional filters (admin only)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getErrorLogs, type ErrorFilters } from '$lib/server/errorMonitoring';
import { listErrorsQuerySchema } from '$lib/server/validation/errors';

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
		// ✅ SECURITY: Validate query parameters with Zod
		const validation = listErrorsQuerySchema.safeParse({
			error_type: url.searchParams.get('error_type'),
			severity: url.searchParams.get('severity'),
			resolved: url.searchParams.get('resolved'),
			user_id: url.searchParams.get('user_id'),
			date_from: url.searchParams.get('date_from'),
			date_to: url.searchParams.get('date_to'),
			search: url.searchParams.get('search'),
			limit: url.searchParams.get('limit'),
			offset: url.searchParams.get('offset')
		});

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		// Build filters from validated data
		const filters: ErrorFilters = {
			...(validation.data.error_type && { error_type: validation.data.error_type }),
			...(validation.data.severity && { severity: validation.data.severity }),
			...(validation.data.resolved !== undefined && { resolved: validation.data.resolved }),
			...(validation.data.user_id && { user_id: validation.data.user_id }),
			...(validation.data.date_from && { date_from: validation.data.date_from }),
			...(validation.data.date_to && { date_to: validation.data.date_to }),
			...(validation.data.search && { search: validation.data.search }),
			limit: validation.data.limit,
			offset: validation.data.offset
		};

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
