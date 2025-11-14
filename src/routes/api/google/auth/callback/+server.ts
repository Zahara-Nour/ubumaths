/**
 * Google OAuth Callback Endpoint
 * ==============================
 *
 * Endpoint: GET /api/google/auth/callback
 * Purpose: Handle OAuth callback from Google, exchange code for tokens
 *
 * Flow:
 * 1. User authorizes app on Google
 * 2. Google redirects to this endpoint with code and state
 * 3. Validate CSRF state parameter
 * 4. Exchange authorization code for access/refresh tokens
 * 5. Get user's Google email from tokeninfo API
 * 6. Store encrypted tokens in database
 * 7. Redirect to settings page with success message
 *
 * Security:
 * - CSRF protection via state parameter
 * - PKCE code verifier validation
 * - httpOnly secure cookies
 * - Tokens encrypted before storage
 * - No token leakage in error messages
 */

import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { exchangeCodeForTokens, validateToken } from '$lib/server/google/oauth';
import { encryptToken } from '$lib/server/google/encryption';
import { requireRole } from '$lib/server/middleware/auth';

/**
 * Handle OAuth callback from Google
 *
 * Security: Teacher role required, CSRF validation, PKCE verification
 *
 * Query Parameters:
 * - code: Authorization code from Google
 * - state: CSRF token (must match cookie)
 * - error: Optional error from Google
 *
 * Redirects to: /dashboard/teacher/settings/google?connected=true
 */
export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	// 1. Verify user is authenticated and has teacher role
	const { user } = await requireRole(locals, 'teacher');

	// 2. Get parameters from URL
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const errorParam = url.searchParams.get('error');

	// 3. Handle errors from Google OAuth
	if (errorParam) {
		console.error('[Google OAuth] Error from Google:', errorParam);
		throw redirect(
			303,
			`/dashboard/teacher/settings/google?error=${encodeURIComponent(errorParam)}`
		);
	}

	if (!code) {
		throw error(400, 'Missing authorization code from Google');
	}

	// 4. Validate CSRF state parameter
	const storedState = cookies.get('google_oauth_state');
	const storedVerifier = cookies.get('google_code_verifier');

	if (!storedState || state !== storedState) {
		console.error('[Google OAuth] CSRF validation failed');
		throw error(400, 'Invalid state parameter (CSRF protection failed)');
	}

	if (!storedVerifier) {
		console.error('[Google OAuth] Missing code verifier');
		throw error(400, 'Missing PKCE code verifier');
	}

	try {
		// 5. Exchange authorization code for tokens
		const tokens = await exchangeCodeForTokens(code, storedVerifier);

		if (!tokens.refresh_token) {
			console.error('[Google OAuth] No refresh token received');
			throw error(
				500,
				'No refresh token received from Google. Please disconnect and reconnect your account.'
			);
		}

		// 6. Get user's Google email from token info
		const tokenInfo = await validateToken(tokens.access_token);
		const googleEmail = tokenInfo.email || null;

		if (!googleEmail) {
			console.warn('[Google OAuth] No email in token info');
		}

		// 7. Store encrypted tokens in database
		const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);

		const { error: dbError } = await locals.supabase.from('google_integrations').upsert(
			{
				teacher_id: user.id,
				access_token: encryptToken(tokens.access_token),
				refresh_token: encryptToken(tokens.refresh_token),
				token_expiry: tokenExpiry.toISOString(),
				scopes: tokens.scope.split(' '),
				google_email: googleEmail,
				updated_at: new Date().toISOString()
			},
			{
				onConflict: 'teacher_id',
				ignoreDuplicates: false
			}
		);

		if (dbError) {
			console.error('[Google OAuth] Database error:', dbError);
			throw error(500, 'Failed to save Google integration. Please try again.');
		}

		// 8. Clear OAuth cookies
		cookies.delete('google_oauth_state', { path: '/' });
		cookies.delete('google_code_verifier', { path: '/' });

		console.log(`[Google OAuth] Successfully connected Google account for teacher ${user.id}`);

		// 9. Redirect to settings page with success message
		throw redirect(303, '/dashboard/teacher/settings/google?connected=true');
	} catch (err) {
		// Clear cookies on error
		cookies.delete('google_oauth_state', { path: '/' });
		cookies.delete('google_code_verifier', { path: '/' });

		// Re-throw SvelteKit errors (like redirects)
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Log and handle other errors
		console.error('[Google OAuth] Token exchange error:', err);
		const message = err instanceof Error ? err.message : 'Unknown error during OAuth callback';
		throw redirect(303, `/dashboard/teacher/settings/google?error=${encodeURIComponent(message)}`);
	}
};
