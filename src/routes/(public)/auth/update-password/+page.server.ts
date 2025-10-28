/**
 * Password Update - Server Actions
 *
 * This page is reached after a user clicks a password reset link in their email.
 * The /auth/confirm handler has already verified the token and created a temporary session.
 *
 * FLOW:
 * 1. User receives password reset email
 * 2. Clicks link → /auth/confirm?token_hash=...&type=recovery
 * 3. /auth/confirm verifies token and redirects to this page
 * 4. User enters new password
 * 5. Server updates password via Supabase
 * 6. Redirect to home (user is logged in)
 *
 * SECURITY:
 * - Requires valid session (created by /auth/confirm)
 * - Server-side password update ensures security
 * - Password validation before update
 */
import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('auth/update-password/+page.server.ts');

export const load: PageServerLoad = async ({ locals: { safeGetSession } }) => {
	// Check if user has a valid session (should have been created by /auth/confirm)
	const { user } = await safeGetSession();

	if (!user) {
		logger.error('No session found - user needs to use password reset link');
		// Redirect to password reset request page
		throw redirect(303, '/auth/reset-password');
	}

	// User has valid session, allow them to update password
	return {};
};

export const actions = {
	/**
	 * Update password action
	 *
	 * Updates the user's password using their authenticated session
	 */
	updatePassword: async ({ request, locals: { supabase, safeGetSession } }) => {
		// Verify user is authenticated
		const { user } = await safeGetSession();

		if (!user) {
			logger.error('No authenticated user');
			return fail(401, {
				error: 'You must be logged in to update your password'
			});
		}

		// Extract form data
		const formData = await request.formData();
		const password = formData.get('password') as string;
		const confirmPassword = formData.get('confirmPassword') as string;

		// Validate inputs
		if (!password || !confirmPassword) {
			return fail(400, {
				error: 'All fields are required'
			});
		}

		if (password !== confirmPassword) {
			return fail(400, {
				error: 'Passwords do not match'
			});
		}

		if (password.length < 6) {
			return fail(400, {
				error: 'Password must be at least 6 characters'
			});
		}

		// Update password
		logger.info('Updating password for user:', user.email);

		const { error } = await supabase.auth.updateUser({
			password
		});

		if (error) {
			logger.error('Password update error:', error.message);
			return fail(400, {
				error: error.message
			});
		}

		logger.info('Password updated successfully');

		// Success! User's password is updated and they're logged in
		// Redirect to home page
		throw redirect(303, '/');
	}
} satisfies Actions;
