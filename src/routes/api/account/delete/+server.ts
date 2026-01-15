/**
 * Account Deletion API Endpoint
 * =============================
 *
 * GDPR Article 17 compliant account deletion (right to erasure).
 *
 * DELETE /api/account/delete
 *
 * Security:
 * - Requires authentication
 * - Requires explicit French confirmation phrase
 * - Uses service role for auth.admin.deleteUser (bypasses RLS)
 * - Anonymizes audit trails, does not delete them
 *
 * Flow:
 * 1. Authenticate user
 * 2. Validate confirmation phrase
 * 3. Call RPC to anonymize audit logs and cleanup data
 * 4. Clean up storage files (best-effort)
 * 5. Delete auth user (triggers CASCADE on profiles)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { deleteAccountSchema } from '$lib/server/validation/account';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/account/delete');

export const DELETE: RequestHandler = async ({ request, locals }) => {
	// Step 1: Authenticate user
	const { user } = await requireAuth(locals);
	const userId = user.id;

	logger.info('Account deletion requested', { userId });

	// Step 2: Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requete JSON invalide');
	}

	const validation = deleteAccountSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	// Step 3: Get service role client for elevated operations
	const serviceClient = createServiceRoleClient();

	try {
		// Step 4: Call database cleanup function
		// This anonymizes audit logs and prepares data for cascade deletion
		const { data: cleanupResult, error: cleanupError } = await serviceClient.rpc(
			'delete_user_account',
			{ p_user_id: userId }
		);

		if (cleanupError) {
			logger.error('Database cleanup failed', { userId, error: cleanupError });
			throw error(500, 'Erreur lors du nettoyage des donnees');
		}

		logger.info('Database cleanup completed', { userId, result: cleanupResult });

		// Step 5: Clean up storage files (best-effort, don't fail if this errors)
		await cleanupUserStorage(serviceClient, userId);

		// Step 6: Delete the auth user (triggers CASCADE on profiles)
		const { error: authError } = await serviceClient.auth.admin.deleteUser(userId);

		if (authError) {
			logger.error('Auth user deletion failed', { userId, error: authError });
			throw error(500, 'Erreur lors de la suppression du compte');
		}

		logger.info('Account deletion completed successfully', { userId });

		return json({
			success: true,
			message: 'Votre compte a ete supprime avec succes.'
		});
	} catch (err) {
		// Re-throw SvelteKit errors (preserve original status code)
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Unexpected error during account deletion', { userId, error: err });
		throw error(500, 'Une erreur inattendue est survenue');
	}
};

/**
 * Clean up user files from storage buckets
 *
 * This is best-effort - failures are logged but don't stop the deletion process.
 * Storage cleanup is non-critical for GDPR compliance as the user association is deleted.
 */
async function cleanupUserStorage(
	serviceClient: ReturnType<typeof createServiceRoleClient>,
	userId: string
): Promise<void> {
	// Buckets that may contain user-specific files organized by userId
	const buckets = ['chat-attachments', 'message-attachments', 'bug-report-screenshots'];

	for (const bucket of buckets) {
		try {
			// List files in user's folder (if path-based organization)
			const { data: files } = await serviceClient.storage.from(bucket).list(userId);

			if (files && files.length > 0) {
				const filePaths = files.map((f) => `${userId}/${f.name}`);
				const { error: removeError } = await serviceClient.storage.from(bucket).remove(filePaths);

				if (removeError) {
					logger.warn('Failed to remove files from bucket', {
						bucket,
						userId,
						error: removeError
					});
				} else {
					logger.info('Removed user files from bucket', {
						bucket,
						userId,
						count: files.length
					});
				}
			}
		} catch (err) {
			// Log but don't fail - storage cleanup is best-effort
			logger.warn('Storage cleanup failed for bucket', { bucket, userId, error: err });
		}
	}
}
