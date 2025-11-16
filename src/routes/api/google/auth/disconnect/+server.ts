/**
 * Google OAuth Disconnect Endpoint
 * =================================
 *
 * Endpoint: POST /api/google/auth/disconnect
 * Purpose: Disconnect Google Classroom integration and revoke access
 *
 * Flow:
 * 1. Verify user is a teacher
 * 2. Fetch integration from database
 * 3. Revoke access on Google (best effort)
 * 4. Delete integration from database
 * 5. Return success response
 *
 * Security:
 * - Teacher role required
 * - Only deletes current user's integration
 * - Revocation failure is non-blocking (tokens expire in 1 hour)
 *
 * Response:
 * {
 *   success: true
 * }
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { decryptToken } from '$lib/server/google/encryption';
import { revokeAccess } from '$lib/server/google/oauth';

/**
 * Disconnect Google Classroom integration
 *
 * Security: Teacher role required, only affects current user
 *
 * Returns success status
 */
export const POST: RequestHandler = async ({ locals }) => {
	// Only teachers can disconnect (they're the only ones who can connect)
	const { user } = await requireRole(locals, 'teacher');

	try {
		// Get integration from database
		const { data: integration, error: fetchError } = await locals.supabase
			.from('google_integrations')
			.select('access_token')
			.eq('teacher_id', user.id)
			.single();

		// If no integration exists, consider it already disconnected
		if (fetchError || !integration) {
			console.log(`[Google OAuth] No integration found for teacher ${user.id}`);
			return json({ success: true });
		}

		// Revoke access on Google (best effort - don't fail if this fails)
		if (integration.access_token) {
			try {
				const accessToken = decryptToken(integration.access_token);
				const revoked = await revokeAccess(accessToken);

				if (revoked) {
					console.log(`[Google OAuth] Successfully revoked access for teacher ${user.id}`);
				} else {
					console.warn(`[Google OAuth] Failed to revoke access for teacher ${user.id}`);
				}
			} catch (revokeError) {
				// Log but don't fail - we'll delete from DB anyway
				console.warn(
					`[Google OAuth] Error revoking access for teacher ${user.id}:`,
					revokeError instanceof Error ? revokeError.message : 'Unknown error'
				);
			}
		}

		// Delete integration from database
		const { error: deleteError } = await locals.supabase
			.from('google_integrations')
			.delete()
			.eq('teacher_id', user.id);

		if (deleteError) {
			console.error('[Google OAuth] Database deletion error:', deleteError);
			throw error(500, 'Failed to disconnect Google Classroom. Please try again.');
		}

		console.log(`[Google OAuth] Successfully disconnected Google account for teacher ${user.id}`);

		return json({ success: true });
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Handle other errors
		console.error('[Google OAuth] Disconnect error:', err);
		throw error(500, 'An error occurred while disconnecting Google Classroom');
	}
};
