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
 * - Rate limited: 1 attempt per 24 hours per user
 * - Uses service role for auth.admin.deleteUser (bypasses RLS)
 * - Anonymizes audit trails, does not delete them
 * - Full audit logging for security monitoring
 *
 * Flow:
 * 1. Authenticate user
 * 2. Check rate limit
 * 3. Validate confirmation phrase
 * 4. Create audit entry
 * 5. Call RPC to anonymize audit logs and cleanup data
 * 6. Clean up storage files (best-effort)
 * 7. Delete auth user (triggers CASCADE on profiles)
 * 8. Update audit entry with result
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { deleteAccountSchema } from '$lib/server/validation/account';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { createServerLogger } from '$lib/utils/logger';
import { rateLimit } from '$lib/server/middleware/rateLimit';

const logger = createServerLogger('api/account/delete');

// Rate limit: 1 attempt per 24 hours per user
const RATE_LIMIT_MAX = 1;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Hash email for audit logging (preserves correlation without storing PII)
 */
async function hashEmail(email: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(email.toLowerCase().trim());
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const DELETE: RequestHandler = async ({ request, locals, getClientAddress }) => {
	// Step 1: Authenticate user
	const { user } = await requireAuth(locals);
	const userId = user.id;
	const userEmail = user.email || 'unknown';

	logger.info('Account deletion requested', { userId });

	// Step 2: Rate limiting (1 per 24 hours)
	try {
		rateLimit(`account_delete:${userId}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
	} catch (rateLimitError) {
		// Log rate-limited attempt to audit
		const serviceClient = createServiceRoleClient();
		const emailHash = await hashEmail(userEmail);

		await serviceClient.from('account_deletion_audit').insert({
			user_id: userId,
			email_hash: emailHash,
			ip_address: getClientAddress(),
			user_agent: request.headers.get('user-agent'),
			status: 'rate_limited',
			error_message: 'Rate limit exceeded (1 per 24 hours)'
		});

		logger.warn('Account deletion rate limited', { userId });
		throw rateLimitError;
	}

	// Step 3: Parse and validate request body
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

	// Step 4: Get service role client and create audit entry
	const serviceClient = createServiceRoleClient();
	const emailHash = await hashEmail(userEmail);
	const ipAddress = getClientAddress();
	const userAgent = request.headers.get('user-agent');

	// Create initial audit entry
	const { data: auditEntry, error: auditError } = await serviceClient
		.from('account_deletion_audit')
		.insert({
			user_id: userId,
			email_hash: emailHash,
			ip_address: ipAddress,
			user_agent: userAgent,
			status: 'requested'
		})
		.select('id')
		.single();

	if (auditError) {
		logger.error('Failed to create audit entry', { userId, error: auditError });
		// Continue anyway - audit failure shouldn't block deletion
	}

	const auditId = auditEntry?.id;

	try {
		// Step 5: Call database cleanup function
		// This anonymizes audit logs and prepares data for cascade deletion
		const { data: cleanupResult, error: cleanupError } = await serviceClient.rpc(
			'delete_user_account',
			{ p_user_id: userId }
		);

		if (cleanupError) {
			logger.error('Database cleanup failed', { userId, error: cleanupError });

			// Update audit entry with failure
			if (auditId) {
				await serviceClient
					.from('account_deletion_audit')
					.update({
						status: 'failed',
						error_message: cleanupError.message,
						completed_at: new Date().toISOString()
					})
					.eq('id', auditId);
			}

			throw error(500, 'Erreur lors du nettoyage des donnees');
		}

		logger.info('Database cleanup completed', { userId, result: cleanupResult });

		// Step 6: Clean up storage files (best-effort, don't fail if this errors)
		await cleanupUserStorage(serviceClient, userId);

		// Step 7: Delete the auth user (triggers CASCADE on profiles)
		const { error: authError } = await serviceClient.auth.admin.deleteUser(userId);

		if (authError) {
			logger.error('Auth user deletion failed', { userId, error: authError });

			// Update audit entry with failure
			if (auditId) {
				await serviceClient
					.from('account_deletion_audit')
					.update({
						status: 'failed',
						error_message: `Auth deletion failed: ${authError.message}`,
						cleanup_result: cleanupResult,
						completed_at: new Date().toISOString()
					})
					.eq('id', auditId);
			}

			throw error(500, 'Erreur lors de la suppression du compte');
		}

		// Step 8: Update audit entry with success
		if (auditId) {
			await serviceClient
				.from('account_deletion_audit')
				.update({
					user_id: null, // Anonymize - user no longer exists
					status: 'completed',
					cleanup_result: cleanupResult,
					completed_at: new Date().toISOString()
				})
				.eq('id', auditId);
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

		// Update audit entry with unexpected failure
		if (auditId) {
			await serviceClient
				.from('account_deletion_audit')
				.update({
					status: 'failed',
					error_message: err instanceof Error ? err.message : 'Unknown error',
					completed_at: new Date().toISOString()
				})
				.eq('id', auditId);
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
