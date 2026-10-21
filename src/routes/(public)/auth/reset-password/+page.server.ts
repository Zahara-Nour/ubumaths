/**
 * Password Reset Request - Server Actions
 *
 * FLOW:
 * 1. User enters their email address — or a child's login id (`noelie42`)
 * 2. Server sends password reset email via Supabase
 * 3. User receives email with reset link pointing to /auth/update-password
 * 4. User clicks link and is taken to password update page
 *
 * CHILD ACCOUNT (PR 3): the account address is fictitious. The link goes to the parent's
 * CONFIRMED address, sent by Brevo; it opens /auth/reset-password/parent, which changes the
 * password without logging the parent in (`$lib/server/child-password`).
 *
 * SECURITY:
 * - Server-side processing ensures email sending is secure
 * - Rate limiting is handled by Supabase
 * - We don't reveal if an email exists or not (prevents user enumeration)
 */
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { createServerLogger } from '$lib/utils/logger';
import { requestPasswordResetSchema } from '$lib/server/validation/auth';
import { isChildAccountEmail } from '$lib/utils/child-account';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { createChildResetToken, findChildResetTarget } from '$lib/server/child-password';
import { sendChildPasswordResetEmail } from '$lib/server/email/brevo';
import { waitForResponseFloor } from '$lib/server/response-floor';
import {
	checkPasswordResetRateLimitByEmail,
	checkPasswordResetRateLimitByIP
} from '$lib/server/rateLimiter';

const logger = createServerLogger('auth/reset-password/+page.server.ts');

/**
 * Durée plancher de la réponse neutre : le chemin de l'enfant à parent confirmé (jeton +
 * Brevo) est plus lent que les autres ; sans plancher, le temps trahirait l'existence d'un
 * tel enfant (audit de la PR 3, F-a).
 */
const RESPONSE_FLOOR_MS = 2000;

/** Generic success — never reveals whether the account exists (anti-enumeration). */
const GENERIC_SUCCESS = {
	success: true as const,
	message:
		'Si un compte existe avec cette adresse ou cet identifiant, un lien pour choisir un nouveau mot de passe va être envoyé.'
};

/** Lien au parent de l'enfant ; rien si l'adresse du parent n'est pas confirmée. */
async function sendResetLinkToParent(childEmail: string): Promise<void> {
	const service = createServiceRoleClient();
	const target = await findChildResetTarget(service, childEmail);
	if (!target.ok) {
		logger.info('Child password reset skipped:', target.reason);
		return;
	}
	const token = await createChildResetToken(service, target.userId);
	if (!token) return;
	const sent = await sendChildPasswordResetEmail(target.parentEmail, {
		childFirstname: target.firstname,
		loginId: target.loginId,
		userId: target.userId,
		token
	});
	if (!sent.success) logger.error('Child password reset email not sent:', sent.error);
}

export const actions = {
	/**
	 * Request password reset action
	 *
	 * Sends a password reset email to the user
	 */
	resetPassword: async ({ request, locals: { supabase }, url, getClientAddress }) => {
		// SECURITY (finding H7): validate with Zod and rate-limit BEFORE calling the
		// mailer — otherwise this is an unauthenticated email-bomb / Brevo-quota drain.
		const formData = await request.formData();
		const rawEmail = String(formData.get('email') ?? '');
		const validation = requestPasswordResetSchema.safeParse({ email: rawEmail });
		if (!validation.success) {
			return fail(400, { error: validation.error.issues[0].message, email: rawEmail });
		}
		const { email } = validation.data;
		const startedAt = Date.now();

		// If rate-limited, return the SAME generic success (don't leak the limit state
		// or the account's existence) but skip sending.
		const [ipLimit, emailLimit] = await Promise.all([
			checkPasswordResetRateLimitByIP(getClientAddress()),
			checkPasswordResetRateLimitByEmail(email)
		]);
		if (!ipLimit.allowed || !emailLimit.allowed) {
			logger.warn('Password reset rate limited');
			await waitForResponseFloor(startedAt, RESPONSE_FLOOR_MS);
			return GENERIC_SUCCESS;
		}

		// L'adresse d'un enfant inscrit par son parent est fictive : GoTrue y enverrait le
		// lien pour rien. Le lien part au parent, si son adresse est confirmée (R1). Même
		// réponse neutre dans tous les cas (pas d'énumération).
		if (isChildAccountEmail(email)) {
			await sendResetLinkToParent(email);
			await waitForResponseFloor(startedAt, RESPONSE_FLOOR_MS);
			return GENERIC_SUCCESS;
		}

		// Send password reset email
		// The redirectTo URL is where the user will land after clicking the link
		const redirectTo = `${url.origin}/auth/update-password`;

		logger.info('Sending password reset email');

		const { error } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo
		});

		if (error) {
			logger.error('Password reset error:', error.message);
			// Don't reveal if the email exists or not for security
			// Return generic success message
		}

		// Always return success to prevent user enumeration
		// (Don't tell attackers if an email exists in the system)
		logger.info('Password reset email sent (or email not found)');
		await waitForResponseFloor(startedAt, RESPONSE_FLOOR_MS);
		return GENERIC_SUCCESS;
	}
} satisfies Actions;
