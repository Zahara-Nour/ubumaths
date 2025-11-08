/**
 * API Route: POST /api/errors/delete-resolved
 * Delete all resolved errors (admin only)
 *
 * SECURITY:
 * - Admin-only access (enforced via requireRole middleware)
 * - No request body validation needed (no parameters)
 *
 * WARNING:
 * - This is a DESTRUCTIVE operation that permanently deletes ALL resolved errors
 * - No age filters - deletes everything marked as resolved
 * - No undo capability
 *
 * RETURNS:
 * - { success: true, deleted_count: number }
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteAllResolvedErrors } from '$lib/server/errorMonitoring';
import { requireRole } from '$lib/server/middleware/auth';

export const POST: RequestHandler = async ({ locals }) => {
	// SECURITY: Require admin role
	await requireRole(locals, 'admin');

	try {
		// Execute deletion
		const result = await deleteAllResolvedErrors(locals.supabase);

		if (!result.success) {
			throw error(500, result.error || 'Failed to delete resolved errors');
		}

		return json({
			success: true,
			deleted_count: result.deletedCount || 0
		});
	} catch (err) {
		// Re-throw SvelteKit errors (401, 403, 500)
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Log unexpected errors
		console.error('Error in /api/errors/delete-resolved:', err);
		throw error(500, 'Internal server error');
	}
};
