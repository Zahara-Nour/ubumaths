/**
 * Email Confirmation & Password Reset Handler
 *
 * WHAT IS THIS FOR?
 * -----------------
 * This handler processes two types of email verification links from Supabase:
 *
 * 1. EMAIL CONFIRMATION (signup):
 *    - When users sign up with email confirmation enabled
 *    - Exchanges the token for a session and logs them in
 *
 * 2. PASSWORD RESET (recovery):
 *    - When users request a password reset
 *    - Verifies the token and redirects to password update page
 *
 * WHY IS THIS NEEDED?
 * -------------------
 * Without this handler:
 * - Users click links in emails but nothing happens
 * - Tokens aren't exchanged for sessions
 * - The authentication flow is broken
 *
 * With this handler:
 * - Server-side token verification (secure)
 * - Sets auth cookies properly
 * - Redirects to appropriate pages
 *
 * FLOWS:
 * ------
 * Email Confirmation:
 * 1. User signs up → Supabase sends confirmation email
 * 2. User clicks link → lands at /auth/confirm?token_hash=...&type=signup
 * 3. This handler verifies token → creates session
 * 4. Server sets cookies → user is logged in
 * 5. Redirect to home
 *
 * Password Reset:
 * 1. User requests reset → Supabase sends recovery email
 * 2. User clicks link → lands at /auth/confirm?token_hash=...&type=recovery
 * 3. This handler verifies token → creates temporary session
 * 4. Redirect to /auth/update-password where user sets new password
 *
 * URL PARAMETERS (automatically added by Supabase):
 * -------------------------------------------------
 * - token_hash: The verification token
 * - type: The type of verification ('signup', 'email', 'recovery', etc.)
 * - next: Optional redirect URL after confirmation
 *
 * SECURITY:
 * ---------
 * - This runs server-side only (no client access to sensitive data)
 * - The token is single-use and expires
 * - Cookies are HttpOnly and secure (set via the server Supabase client)
 */
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('auth/confirm/+server.ts');

/**
 * Validates redirect URLs to prevent open redirect attacks.
 * Only allows:
 * - Relative paths starting with / (but not //)
 * - Same-origin absolute URLs
 *
 * @param url - The URL to validate
 * @param origin - The origin of the current request
 * @returns Safe URL or '/' if invalid
 */
function validateRedirectUrl(url: string, origin: string): string {
	// Allow relative URLs (but not protocol-relative like //)
	if (url.startsWith('/') && !url.startsWith('//')) {
		return url;
	}

	// Check if it's a same-origin absolute URL
	try {
		const parsed = new URL(url);
		const originUrl = new URL(origin);
		if (parsed.origin === originUrl.origin) {
			return url;
		}
	} catch {
		// Invalid URL, fall through to default
	}

	// Default to home for any invalid/external URLs
	return '/';
}

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	// Extract token parameters from the URL
	const token_hash = url.searchParams.get('token_hash');
	const type = url.searchParams.get('type');
	const rawNext = url.searchParams.get('next') ?? '/';
	// Validate redirect URL to prevent open redirect attacks
	const next = validateRedirectUrl(rawNext, url.origin);

	logger.info('Auth confirmation request:', { type, has_token: !!token_hash });

	// Validate that we have the required parameters
	if (!token_hash || !type) {
		logger.error('Missing token_hash or type in confirmation URL');
		// Redirect to login with error message
		throw redirect(303, '/login?error=Invalid confirmation link');
	}

	// Verify the OTP token and exchange it for a session
	// This is the key step - it validates the token and creates a session
	const { error } = await supabase.auth.verifyOtp({
		type: type as 'signup' | 'email' | 'recovery' | 'invite' | 'magiclink' | 'email_change',
		token_hash
	});

	if (error) {
		logger.error('Auth confirmation failed:', error.message);
		// Redirect to login with error
		throw redirect(303, '/login?error=Confirmation failed. Please try again.');
	}

	logger.info('Auth confirmation successful, type:', type);

	// Success! The server Supabase client has set the auth cookies

	// Handle different confirmation types
	if (type === 'recovery') {
		// Password reset - redirect to password update page
		logger.info('Password reset confirmed, redirecting to update-password');
		throw redirect(303, '/auth/update-password');
	} else {
		// Email confirmation (signup) - redirect to home or next URL
		logger.info('Email confirmed, redirecting to:', next);
		throw redirect(303, next);
	}
};
