/**
 * Google OAuth Initiation Endpoint
 * =================================
 *
 * Endpoint: POST /api/google/auth/connect
 * Purpose: Generate Google OAuth URL and initiate authorization flow
 *
 * Flow:
 * 1. Verify user is a teacher
 * 2. Generate CSRF state token
 * 3. Generate PKCE code verifier and challenge
 * 4. Create Google OAuth authorization URL
 * 5. Store state and verifier in secure httpOnly cookies
 * 6. Return authorization URL to frontend
 *
 * Security:
 * - Teacher role required
 * - CSRF protection via random state token
 * - PKCE for enhanced OAuth security
 * - httpOnly, secure, sameSite cookies
 * - 10 minute cookie expiration
 *
 * Response:
 * {
 *   url: string  // Google OAuth authorization URL
 * }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuthUrl } from '$lib/server/google/oauth';
import { requireRole } from '$lib/server/middleware/auth';

/**
 * Initiate Google OAuth flow
 *
 * Security: Teacher role required
 *
 * Returns authorization URL for frontend to redirect user
 */
export const POST: RequestHandler = async ({ locals, cookies }) => {
	// Only teachers can connect Google Classroom
	await requireRole(locals, 'teacher');

	// Generate CSRF state token (random UUID for security)
	const state = crypto.randomUUID();

	// Generate OAuth URL with PKCE
	const { url, codeVerifier } = await getAuthUrl(state);

	// Store state and verifier in httpOnly cookies
	// These will be validated in the callback endpoint
	const cookieOptions = {
		httpOnly: true,
		secure: true,
		sameSite: 'lax' as const,
		path: '/',
		maxAge: 600 // 10 minutes (enough time for OAuth flow)
	};

	cookies.set('google_oauth_state', state, cookieOptions);
	cookies.set('google_code_verifier', codeVerifier, cookieOptions);

	console.log('[Google OAuth] Generated authorization URL');

	return json({ url });
};
