/**
 * Password Reset Request - Server Actions
 *
 * FLOW:
 * 1. User enters their email address
 * 2. Server sends password reset email via Supabase
 * 3. User receives email with reset link pointing to /auth/update-password
 * 4. User clicks link and is taken to password update page
 *
 * SECURITY:
 * - Server-side processing ensures email sending is secure
 * - Rate limiting is handled by Supabase
 * - We don't reveal if an email exists or not (prevents user enumeration)
 */
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { createLogger } from '$lib/utils/logger';
import { requestPasswordResetSchema } from '$lib/server/validation/auth';
import {
	checkPasswordResetRateLimitByEmail,
	checkPasswordResetRateLimitByIP
} from '$lib/server/rateLimiter';

const logger = createLogger('auth/reset-password/+page.server.ts');

/** Generic success — never reveals whether the account exists (anti-enumeration). */
const GENERIC_SUCCESS = {
	success: true as const,
	message: 'If an account exists with that email, you will receive a password reset link shortly.'
};

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

		// If rate-limited, return the SAME generic success (don't leak the limit state
		// or the account's existence) but skip sending.
		const [ipLimit, emailLimit] = await Promise.all([
			checkPasswordResetRateLimitByIP(getClientAddress()),
			checkPasswordResetRateLimitByEmail(email)
		]);
		if (!ipLimit.allowed || !emailLimit.allowed) {
			logger.warn('Password reset rate limited');
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
		return GENERIC_SUCCESS;
	}
} satisfies Actions;
