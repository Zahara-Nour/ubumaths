/**
 * API Route: /api/errors/[id]
 * GET - Get single error log detail
 * PUT - Resolve error
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getErrorLog, resolveError } from '$lib/server/errorMonitoring';
import { resolveErrorSchema } from '$lib/server/validation/errors';

/**
 * GET /api/errors/[id]
 * Get error log details (admin only)
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const { id } = params;

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
		const result = await getErrorLog(locals.supabase, id);

		if (!result.success) {
			throw error(404, result.error || 'Error not found');
		}

		return json({ error: result.data });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('Error in GET /api/errors/[id]:', err);
		throw error(500, 'Internal server error');
	}
};

/**
 * PUT /api/errors/[id]
 * Resolve error (admin only)
 */
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const { id } = params;

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
		const body = await request.json();
		const validation = resolveErrorSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { notes } = validation.data;

		const result = await resolveError(locals.supabase, id, user.id, notes);

		if (!result.success) {
			throw error(500, result.error || 'Failed to resolve error');
		}

		return json({ success: true });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('Error in PUT /api/errors/[id]:', err);
		throw error(500, 'Internal server error');
	}
};
