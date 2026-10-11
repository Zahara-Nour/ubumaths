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
 * - Student accounts only (403 for teacher/admin): in the single-teacher model a
 *   teacher's cascade would wipe every student's work (David, 2026-10-10)
 * - Requires explicit French confirmation phrase
 * - Rate limited: 1 attempt per 24 hours per user
 * - Uses service role for auth.admin.deleteUser (bypasses RLS)
 * - Full audit logging for security monitoring
 *
 * Flow:
 * 1. Authenticate user
 * 2. Validate confirmation phrase
 * 3. Check rate limit (after validation: a typo must not lock the student out 24 h)
 * 4. Create audit entry
 * 5. Call RPC: deletes messages, clears FKs without ON DELETE, fails atomically if
 *    one remains, and returns the exact storage paths to remove
 * 6. Delete auth user (triggers CASCADE on profiles)
 * 7. Remove those files from storage (best-effort, only once the account is gone)
 * 8. Update audit entry with result
 */

import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
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
	const { user, profile } = await requireAuth(locals);
	const userId = user.id;
	const userEmail = user.email || 'unknown';

	// Seul un compte élève se supprime ici ; prof et admin se ferment à la main.
	// Refusé avant la limite de débit et l'audit : rien n'est consommé ni écrit.
	if (profile.role !== 'student') {
		throw error(403, 'La suppression en libre-service est réservée aux comptes élèves');
	}

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

	// Step 3: Rate limiting (1 per 24 hours)
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
		// Step 5: Call database cleanup function (see the migration
		// 20261014100000_suppression_compte_art17 for what it deletes)
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

		// Step 6: Delete the auth user (triggers CASCADE on profiles)
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

		// Step 7: fichiers retirés seulement une fois le compte supprimé : si deleteUser
		// échoue, l'élève n'a pas perdu ses pièces jointes (best-effort, jamais bloquant).
		await removeUserFiles(serviceClient, userId, cleanupResult);

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

/** Chemins de fichiers rendus par `delete_user_account`, par bucket. */
const storagePathsSchema = z.object({
	storage_paths: z.record(z.string(), z.array(z.string()))
});

/**
 * Retire du storage les fichiers de l'élève, par leurs chemins EXACTS — collectés par
 * `delete_user_account` avant que la cascade n'efface les lignes qui les portent.
 * (Un `list(userId)` ne trouvait rien : les pièces jointes sont rangées par
 * conversation ou par message, les captures dans des sous-dossiers.)
 *
 * Au mieux : un échec est journalisé en erreur, il n'interrompt pas la suppression.
 */
async function removeUserFiles(
	serviceClient: ReturnType<typeof createServiceRoleClient>,
	userId: string,
	cleanupResult: unknown
): Promise<void> {
	const parsed = storagePathsSchema.safeParse(cleanupResult);
	if (!parsed.success) {
		logger.error('Chemins de fichiers illisibles, fichiers du compte non supprimés', { userId });
		return;
	}

	for (const [bucket, paths] of Object.entries(parsed.data.storage_paths)) {
		if (paths.length === 0) continue;
		try {
			const { error: removeError } = await serviceClient.storage.from(bucket).remove(paths);
			if (removeError) {
				logger.error('Fichiers du compte non supprimés', { bucket, userId, error: removeError });
			} else {
				logger.info('Fichiers du compte supprimés', { bucket, userId, count: paths.length });
			}
		} catch (err) {
			logger.error('Fichiers du compte non supprimés', { bucket, userId, error: err });
		}
	}
}
