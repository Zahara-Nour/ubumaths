/**
 * Server-side Login Actions
 *
 * WHY SERVER-SIDE LOGIN?
 * ----------------------
 * The Supabase client in the browser uses localStorage for session storage,
 * while the server uses cookies. If we login on the client:
 * - Browser: Session saved to localStorage ✅
 * - Server: Cookies NOT updated ❌
 * - Result: Server still sees user as logged out
 * - UI doesn't update until page refresh
 *
 * By handling login on the SERVER:
 * - Server: Sets auth cookies ✅
 * - Browser: Detects auth change via onAuthStateChange ✅
 * - Browser: Calls invalidate() to refresh data ✅
 * - Result: UI updates instantly
 *
 * AUTHENTICATION METHODS:
 * 1. Google OAuth - Initiates OAuth flow with Google provider
 * 2. Email/Password - Traditional authentication method
 *
 * FLOW (Email/Password):
 * 1. User submits form (POST to /login?/login)
 * 2. Server action receives email/password
 * 3. Server calls signInWithPassword() → sets cookies
 * 4. Server redirects to dashboard
 * 5. Browser's onAuthStateChange fires (SIGNED_IN event)
 * 6. Browser calls invalidate('supabase:auth')
 * 7. Layout re-runs → server verifies session → UI updates
 *
 * FLOW (Google OAuth):
 * 1. User submits form (POST to /login?/googleSignIn)
 * 2. Server action initiates OAuth flow with redirectTo URL
 * 3. User is redirected to Google consent screen
 * 4. Google redirects back to /auth/callback
 * 5. Callback handler validates and creates session
 * 6. User is redirected to dashboard (or original page if specified)
 */
import { redirect, fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { createLogger } from '$lib/utils/logger';
import {
	checkLoginRateLimitByIP,
	checkLoginRateLimitByEmail,
	checkOAuthRateLimitByIP
} from '$lib/server/rateLimiter';

const logger = createLogger('login/+page.server.ts');

export const actions = {
	/**
	 * Google OAuth Sign In action
	 *
	 * Initiates the OAuth flow with Google provider.
	 * Redirects user to Google for authentication, then back to our callback handler.
	 *
	 * SECURITY: Rate limited to prevent OAuth abuse
	 */
	googleSignIn: async ({ locals: { supabase }, url, getClientAddress }) => {
		// SECURITY: Rate limit by IP to prevent OAuth flow abuse
		const clientIP = getClientAddress();
		const rateLimitResult = checkOAuthRateLimitByIP(clientIP);

		if (!rateLimitResult.allowed) {
			logger.warn('OAuth rate limit exceeded', { ip: clientIP });
			return fail(429, {
				error: rateLimitResult.message || 'Trop de tentatives. Veuillez réessayer plus tard.'
			});
		}

		// Get the redirect destination - default to dashboard
		const redirectTo = url.searchParams.get('redirectTo') || '/dashboard';

		// Use the current origin to build the callback URL
		// This automatically works in dev (localhost:5173) and production (vercel domain)
		const callbackUrl = `${url.origin}/auth/callback`;

		logger.info('Initiating Google OAuth flow', { callbackUrl, redirectTo });

		// Initiate OAuth flow with Google
		const { data, error } = await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: `${callbackUrl}?next=${encodeURIComponent(redirectTo)}`
			}
		});

		if (error) {
			logger.error('Google OAuth initiation failed:', error);
			return fail(400, {
				error: 'Failed to initiate Google sign-in. Please try again.'
			});
		}

		// Redirect to Google's OAuth consent screen
		if (data.url) {
			throw redirect(303, data.url);
		}

		// Shouldn't reach here, but handle gracefully
		return fail(400, {
			error: 'Failed to initiate Google sign-in. Please try again.'
		});
	},

	/**
	 * Email/Password Login action
	 *
	 * Authenticates user with email and password, sets server-side cookies
	 *
	 * SECURITY: Rate limited by both IP and email to prevent brute force attacks
	 */
	login: async ({ request, locals: { supabase }, getClientAddress }) => {
		// Extract form data
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		// Validate inputs
		if (!email || !password) {
			return fail(400, {
				error: 'Email and password are required',
				email
			});
		}

		// SECURITY: Check rate limits BEFORE attempting authentication
		// This prevents database queries on rate-limited requests

		// 1. Check IP-based rate limit
		const clientIP = getClientAddress();
		const ipRateLimitResult = checkLoginRateLimitByIP(clientIP);

		if (!ipRateLimitResult.allowed) {
			logger.warn('Login rate limit exceeded by IP', { ip: clientIP });
			return fail(429, {
				error: ipRateLimitResult.message || 'Trop de tentatives. Veuillez réessayer plus tard.',
				email
			});
		}

		// 2. Check email-based rate limit (stricter)
		const emailRateLimitResult = checkLoginRateLimitByEmail(email);

		if (!emailRateLimitResult.allowed) {
			logger.warn('Login rate limit exceeded by email', { email });
			return fail(429, {
				error: emailRateLimitResult.message || 'Trop de tentatives. Veuillez réessayer plus tard.',
				email
			});
		}

		// Sign in on the server - this is the key!
		// The server Supabase client will set cookies via the cookie handlers
		// defined in src/lib/server/supabase.ts
		const { error } = await supabase.auth.signInWithPassword({
			email,
			password
		});

		if (error) {
			logger.error('Email/password login failed:', error.message);
			// Return error to display in form
			return fail(400, {
				error: error.message,
				email // Preserve email for convenience
			});
		}

		logger.info('Email/password login successful for:', email);

		// Success! Cookies are now set.
		// Redirect to dashboard - the layout will detect the auth change
		throw redirect(303, '/dashboard');
	}
} satisfies Actions;
