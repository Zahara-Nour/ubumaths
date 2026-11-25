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

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '#lib/server/middleware/auth.ts';
import { deleteAccountSchema } from '#lib/server/validation/account.ts';
import { createServiceRoleClient } from '#lib/server/serviceRoleClient.ts';
import { deleteStudentAccount, hashEmail } from '#lib/server/account-deletion.ts';
import { createServerLogger } from '#lib/utils/logger.ts';
import { rateLimit } from '#lib/server/middleware/rateLimit.ts';

const logger = createServerLogger('api/account/delete');

// Rate limit: 1 attempt per 24 hours per user
const RATE_LIMIT_MAX = 1;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

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
		await rateLimit(`account_delete:${userId}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
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

	// Step 4-8: déroulé commun (#lib/server/account-deletion.ts)
	await deleteStudentAccount(createServiceRoleClient(), {
		userId,
		email: userEmail,
		ipAddress: getClientAddress(),
		userAgent: request.headers.get('user-agent'),
		requestedBy: null
	});

	return Response.json({
		success: true,
		message: 'Votre compte a ete supprime avec succes.'
	});
};
