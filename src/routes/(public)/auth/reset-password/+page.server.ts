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

const logger = createLogger('auth/reset-password/+page.server.ts');

export const actions = {
	/**
	 * Request password reset action
	 *
	 * Sends a password reset email to the user
	 */
	resetPassword: async ({ request, locals: { supabase }, url }) => {
		// Extract form data
		const formData = await request.formData();
		const email = formData.get('email') as string;

		// Validate input
		if (!email) {
			return fail(400, {
				error: 'Email is required',
				email
			});
		}

		// Send password reset email
		// The redirectTo URL is where the user will land after clicking the link
		const redirectTo = `${url.origin}/auth/update-password`;

		logger.info('Sending password reset email to:', email);

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
		return {
			success: true,
			message:
				'If an account exists with that email, you will receive a password reset link shortly.'
		};
	}
} satisfies Actions;
