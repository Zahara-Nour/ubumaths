/**
 * OAuth Callback Handler
 *
 * This handles the OAuth redirect from Google after the user authenticates.
 * It exchanges the authorization code for a session and enforces email domain restrictions.
 *
 * FLOW:
 * 1. Google redirects here with a code parameter
 * 2. Exchange code for session using Supabase
 * 3. Validate user email domain (@voltairedoha.com only)
 * 4. Check if profile exists, create if not
 * 5. Redirect to original page (or home)
 *
 * SECURITY:
 * - Email domain validation prevents unauthorized access
 * - Server-side session handling via cookies
 * - Automatic profile creation for new valid users
 */

import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('auth/callback');

// Allowed email domain for Google OAuth
const ALLOWED_DOMAIN = '@voltairedoha.com';

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	// Extract OAuth code and next URL from query parameters
	const code = url.searchParams.get('code');
	const next = url.searchParams.get('next') ?? '/';

	logger.info('OAuth callback received', { hasCode: !!code, next });

	if (!code) {
		logger.error('No code provided in OAuth callback');
		throw error(400, 'Missing authorization code');
	}

	try {
		// Exchange the authorization code for a session
		const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

		if (exchangeError) {
			logger.error('Code exchange failed:', exchangeError);
			// Redirect to login with error message
			throw redirect(303, `/login?error=${encodeURIComponent('Authentication failed. Please try again.')}`);
		}

		const { session, user } = data;

		if (!session || !user) {
			logger.error('No session or user after code exchange');
			throw redirect(303, `/login?error=${encodeURIComponent('Authentication failed. Please try again.')}`);
		}

		logger.info('Session created for user:', user.email);

		// Validate email domain
		const email = user.email;
		if (!email || !email.endsWith(ALLOWED_DOMAIN)) {
			logger.warn('Unauthorized email domain:', email);

			// Sign out the user immediately
			await supabase.auth.signOut();

			// Redirect to login with domain error
			throw redirect(
				303,
				`/login?error=${encodeURIComponent('Only @voltairedoha.com email accounts are allowed to sign in.')}`
			);
		}

		logger.info('Email domain validated successfully');

		// Check if profile exists
		const { data: existingProfile, error: profileError } = await supabase
			.from('profiles')
			.select('*')
			.eq('id', user.id)
			.single();

		if (profileError && profileError.code !== 'PGRST116') {
			// PGRST116 is "not found" error, which is expected for new users
			logger.error('Error checking for existing profile:', profileError);
		}

		// Create profile if it doesn't exist
		if (!existingProfile) {
			logger.info('Creating new profile for user:', user.email);

			const { error: insertError } = await supabase.from('profiles').insert({
				id: user.id,
				email: user.email!,
				full_name: user.user_metadata?.full_name || null,
				role: 'student', // Default role for new users
				school_id: null
			});

			if (insertError) {
				logger.error('Failed to create profile:', insertError);
				// Don't fail the auth flow, just log the error
				// The profile creation trigger might handle this
			} else {
				logger.info('Profile created successfully');
			}
		} else {
			logger.info('Profile already exists, linking Google account');
		}

		// Success! Session cookies are set by the server client.
		// Redirect to the original page or home
		logger.info('Authentication successful, redirecting to:', next);
		throw redirect(303, next);
	} catch (err) {
		// If it's already a redirect, re-throw it
		if (err && typeof err === 'object' && 'status' in err && err.status === 303) {
			throw err;
		}

		// Otherwise, log and redirect to login with error
		logger.error('Unexpected error in OAuth callback:', err);
		throw redirect(
			303,
			`/login?error=${encodeURIComponent('An unexpected error occurred. Please try again.')}`
		);
	}
};
