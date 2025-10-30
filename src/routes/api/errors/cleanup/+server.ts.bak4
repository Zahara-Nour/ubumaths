/**
 * API Route: POST /api/errors/cleanup
 * Cleanup old resolved errors (admin only or cron)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cleanupOldErrors } from '$lib/server/errorMonitoring';
import { cleanupErrorsSchema } from '$lib/server/validation/errors';

export const POST: RequestHandler = async ({ request, locals }) => {
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
		// SECURITY: Validate request body with Zod schema
		const body = await request.json().catch(() => ({}));
		const validation = cleanupErrorsSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { days_old = 90 } = validation.data;

		const result = await cleanupOldErrors(locals.supabase, days_old);

		if (!result.success) {
			throw error(500, result.error || 'Failed to cleanup errors');
		}

		return json({
			success: true,
			deleted_count: result.deletedCount
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('Error in /api/errors/cleanup:', err);
		throw error(500, 'Internal server error');
	}
};
