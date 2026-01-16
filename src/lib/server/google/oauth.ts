/**
 * Google OAuth utilities for Classroom integration
 * Implements OAuth 2.0 Authorization Code Flow with PKCE
 *
 * Reference: https://developers.google.com/identity/protocols/oauth2/web-server
 */

import { getEnv } from '$lib/server/env';
import { z } from 'zod';
import type { GoogleOAuthTokenResponse, GoogleTokenInfo } from '$lib/types/google';

/**
 * Google OAuth scopes required for Classroom integration
 */
export const GOOGLE_CLASSROOM_SCOPES = [
	'openid', // Required to get id_token with user info (sub, email)
	'email', // Required to get user email
	'profile', // Required to get user profile info
	'https://www.googleapis.com/auth/classroom.courses.readonly', // Courses
	'https://www.googleapis.com/auth/classroom.topics.readonly', // Topics/Rubriques (added 2025-11-15)
	'https://www.googleapis.com/auth/classroom.coursework.students.readonly', // Graded coursework and submissions
	'https://www.googleapis.com/auth/classroom.courseworkmaterials', // Non-graded materials read/write (updated for export)
	'https://www.googleapis.com/auth/drive.file', // Drive files (app-created only)
	'https://www.googleapis.com/auth/gmail.send' // Send emails to students (school emails block external senders)
] as const;

/**
 * Required Drive scope for whiteboard sync
 */
export const REQUIRED_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

/**
 * Check if user has the required Drive scope for whiteboard sync
 * @param scopes - Array of scopes granted to the user
 * @returns true if user has drive.file scope
 */
export function hasRequiredDriveScope(scopes: string[] | null): boolean {
	if (!scopes) return false;
	return scopes.includes(REQUIRED_DRIVE_SCOPE);
}

/**
 * Google OAuth endpoints
 */
const GOOGLE_OAUTH_ENDPOINTS = {
	authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
	token: 'https://oauth2.googleapis.com/token',
	revoke: 'https://oauth2.googleapis.com/revoke',
	tokeninfo: 'https://oauth2.googleapis.com/tokeninfo'
} as const;

/**
 * Zod schema for Google OAuth token response
 */
const googleOAuthTokenResponseSchema = z.object({
	access_token: z.string().min(1),
	expires_in: z.number().positive(),
	refresh_token: z.string().min(1).optional(),
	scope: z.string().min(1),
	token_type: z.literal('Bearer')
});

/**
 * Zod schema for Google token info response
 */
const googleTokenInfoSchema = z.object({
	azp: z.string(),
	aud: z.string(),
	sub: z.string(),
	scope: z.string(),
	exp: z.string(),
	expires_in: z.string(),
	email: z.string().email().optional(),
	email_verified: z.string().optional()
});

/**
 * Zod schema for Google API error response
 */
const googleAPIErrorSchema = z.object({
	error: z.object({
		code: z.number(),
		message: z.string(),
		status: z.string(),
		details: z
			.array(
				z.object({
					'@type': z.string(),
					reason: z.string().optional(),
					domain: z.string().optional(),
					metadata: z.record(z.string(), z.string()).optional()
				})
			)
			.optional()
	})
});

/**
 * Generate a random PKCE code verifier
 * @returns Base64 URL-encoded random string (43-128 characters)
 */
function generateCodeVerifier(): string {
	const length = 64; // Will result in 86 characters when base64 encoded
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
	let verifier = '';

	// Generate random string
	const randomBytes = crypto.getRandomValues(new Uint8Array(length));
	for (let i = 0; i < length; i++) {
		verifier += possible.charAt(randomBytes[i] % possible.length);
	}

	return verifier;
}

/**
 * Generate PKCE code challenge from code verifier
 * Uses SHA-256 hashing
 *
 * @param verifier - Code verifier string
 * @returns Base64 URL-encoded SHA-256 hash
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
	// Hash the verifier with SHA-256
	const encoder = new TextEncoder();
	const data = encoder.encode(verifier);
	const hash = await crypto.subtle.digest('SHA-256', data);

	// Convert to base64url
	const hashArray = Array.from(new Uint8Array(hash));
	const base64 = btoa(String.fromCharCode(...hashArray));
	return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Get OAuth configuration from environment
 * @throws {Error} If required configuration is missing
 */
function getOAuthConfig() {
	const env = getEnv();

	if (!env.GOOGLE_CLASSROOM_CLIENT_ID || !env.GOOGLE_CLASSROOM_CLIENT_SECRET) {
		throw new Error(
			'Google Classroom OAuth not configured. Set GOOGLE_CLASSROOM_CLIENT_ID and GOOGLE_CLASSROOM_CLIENT_SECRET.'
		);
	}

	const redirectUri =
		env.GOOGLE_CLASSROOM_REDIRECT_URI ||
		`${env.PUBLIC_APP_URL || 'http://localhost:5173'}/api/google/auth/callback`;

	return {
		clientId: env.GOOGLE_CLASSROOM_CLIENT_ID,
		clientSecret: env.GOOGLE_CLASSROOM_CLIENT_SECRET,
		redirectUri
	};
}

/**
 * Generate Google OAuth authorization URL
 * Uses PKCE (Proof Key for Code Exchange) for enhanced security
 *
 * @param state - Optional state parameter for CSRF protection
 * @returns Authorization URL and code verifier (store verifier in session)
 *
 * @example
 * ```typescript
 * const { url, codeVerifier } = await getAuthUrl('csrf-token-123');
 * // Store codeVerifier in session
 * cookies.set('google_code_verifier', codeVerifier, { httpOnly: true, secure: true });
 * // Redirect user to authorization URL
 * return redirect(302, url);
 * ```
 */
export async function getAuthUrl(state?: string): Promise<{ url: string; codeVerifier: string }> {
	const config = getOAuthConfig();

	// Generate PKCE values
	const codeVerifier = generateCodeVerifier();
	const codeChallenge = await generateCodeChallenge(codeVerifier);

	// Build authorization URL
	const params = new URLSearchParams({
		client_id: config.clientId,
		redirect_uri: config.redirectUri,
		response_type: 'code',
		scope: GOOGLE_CLASSROOM_SCOPES.join(' '),
		access_type: 'offline', // Request refresh token
		prompt: 'consent', // Force consent screen to ensure refresh token
		code_challenge: codeChallenge,
		code_challenge_method: 'S256'
	});

	if (state) {
		params.set('state', state);
	}

	const url = `${GOOGLE_OAUTH_ENDPOINTS.authorize}?${params.toString()}`;

	return { url, codeVerifier };
}

/**
 * Exchange authorization code for access and refresh tokens
 *
 * @param code - Authorization code from Google redirect
 * @param codeVerifier - PKCE code verifier from session
 * @returns OAuth token response with access_token and refresh_token
 *
 * @example
 * ```typescript
 * const codeVerifier = cookies.get('google_code_verifier');
 * const tokens = await exchangeCodeForTokens(code, codeVerifier);
 *
 * // Store encrypted tokens in database
 * await supabase.from('google_integrations').insert({
 *   teacher_id: userId,
 *   access_token: encryptToken(tokens.access_token),
 *   refresh_token: encryptToken(tokens.refresh_token),
 *   token_expiry: new Date(Date.now() + tokens.expires_in * 1000),
 *   scopes: tokens.scope.split(' ')
 * });
 * ```
 */
export async function exchangeCodeForTokens(
	code: string,
	codeVerifier: string
): Promise<GoogleOAuthTokenResponse> {
	const config = getOAuthConfig();

	const params = new URLSearchParams({
		code,
		client_id: config.clientId,
		client_secret: config.clientSecret,
		redirect_uri: config.redirectUri,
		grant_type: 'authorization_code',
		code_verifier: codeVerifier
	});

	try {
		const response = await fetch(GOOGLE_OAUTH_ENDPOINTS.token, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: params.toString()
		});

		const data = await response.json();

		if (!response.ok) {
			// Parse Google error response
			const errorValidation = googleAPIErrorSchema.safeParse(data);
			if (errorValidation.success) {
				throw new Error(
					`Google OAuth error: ${errorValidation.data.error.message} (${errorValidation.data.error.status})`
				);
			}
			throw new Error('Failed to exchange code for tokens. Check server configuration.');
		}

		// Validate response
		const validation = googleOAuthTokenResponseSchema.safeParse(data);
		if (!validation.success) {
			throw new Error(`Invalid token response: ${validation.error.message}`);
		}

		return validation.data;
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error('Unknown error during token exchange');
	}
}

/**
 * Refresh access token using refresh token
 *
 * @param refreshToken - Refresh token from database
 * @returns New access token and expiration time
 *
 * @example
 * ```typescript
 * const { data } = await supabase
 *   .from('google_integrations')
 *   .select('refresh_token, token_expiry')
 *   .eq('teacher_id', userId)
 *   .single();
 *
 * // Check if token is expired or expiring soon
 * const expiresIn = new Date(data.token_expiry).getTime() - Date.now();
 * if (expiresIn < 5 * 60 * 1000) { // Less than 5 minutes
 *   const decryptedRefreshToken = decryptToken(data.refresh_token);
 *   const { access_token, expires_in } = await refreshAccessToken(decryptedRefreshToken);
 *
 *   // Update database
 *   await supabase.from('google_integrations').update({
 *     access_token: encryptToken(access_token),
 *     token_expiry: new Date(Date.now() + expires_in * 1000)
 *   }).eq('teacher_id', userId);
 * }
 * ```
 */
export async function refreshAccessToken(
	refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
	const config = getOAuthConfig();

	const params = new URLSearchParams({
		refresh_token: refreshToken,
		client_id: config.clientId,
		client_secret: config.clientSecret,
		grant_type: 'refresh_token'
	});

	try {
		const response = await fetch(GOOGLE_OAUTH_ENDPOINTS.token, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: params.toString()
		});

		const data = await response.json();

		if (!response.ok) {
			// Parse Google error response
			const errorValidation = googleAPIErrorSchema.safeParse(data);
			if (errorValidation.success) {
				const error = errorValidation.data.error;
				// Check for token revocation
				if (error.status === 'INVALID_GRANT' || error.message.includes('invalid_grant')) {
					throw new Error(
						'Refresh token is invalid or revoked. User must re-authorize the application.'
					);
				}
				throw new Error(`Google OAuth error: ${error.message} (${error.status})`);
			}
			throw new Error('Failed to refresh access token. Token may have been revoked.');
		}

		// Validate response (refresh doesn't return refresh_token again)
		const validation = z
			.object({
				access_token: z.string().min(1),
				expires_in: z.number().positive(),
				scope: z.string().min(1),
				token_type: z.literal('Bearer')
			})
			.safeParse(data);

		if (!validation.success) {
			throw new Error(`Invalid token refresh response: ${validation.error.message}`);
		}

		return {
			access_token: validation.data.access_token,
			expires_in: validation.data.expires_in
		};
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error('Unknown error during token refresh');
	}
}

/**
 * Revoke Google OAuth access
 * Invalidates both access and refresh tokens
 *
 * @param token - Access token or refresh token to revoke
 * @returns true if revocation successful
 *
 * @example
 * ```typescript
 * const { data } = await supabase
 *   .from('google_integrations')
 *   .select('access_token')
 *   .eq('teacher_id', userId)
 *   .single();
 *
 * const decryptedToken = decryptToken(data.access_token);
 * const success = await revokeAccess(decryptedToken);
 *
 * if (success) {
 *   // Delete integration from database
 *   await supabase.from('google_integrations').delete().eq('teacher_id', userId);
 * }
 * ```
 */
export async function revokeAccess(token: string): Promise<boolean> {
	const params = new URLSearchParams({ token });

	try {
		const response = await fetch(GOOGLE_OAUTH_ENDPOINTS.revoke, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: params.toString()
		});

		// Google returns 200 OK even if token is already revoked
		return response.ok;
	} catch (_error) {
		// Revocation is best-effort - don't log sensitive data
		// Token will expire naturally after 1 hour
		return false;
	}
}

/**
 * Validate access token and get token information
 * Useful for checking if token is still valid before API calls
 *
 * @param accessToken - Access token to validate
 * @returns Token metadata including expiry and scopes
 *
 * @example
 * ```typescript
 * try {
 *   const tokenInfo = await validateToken(accessToken);
 *   console.log(`Token expires in ${tokenInfo.expires_in} seconds`);
 *   console.log(`Granted scopes: ${tokenInfo.scope}`);
 * } catch (error) {
 *   // Token is invalid or expired, need to refresh
 *   const newToken = await refreshAccessToken(refreshToken);
 * }
 * ```
 */
export async function validateToken(accessToken: string): Promise<GoogleTokenInfo> {
	const params = new URLSearchParams({ access_token: accessToken });

	try {
		const response = await fetch(`${GOOGLE_OAUTH_ENDPOINTS.tokeninfo}?${params.toString()}`);

		const data = await response.json();

		if (!response.ok) {
			throw new Error('Token validation failed. Token may be expired or invalid.');
		}

		// Validate response
		const validation = googleTokenInfoSchema.safeParse(data);
		if (!validation.success) {
			throw new Error(`Invalid token info response: ${validation.error.message}`);
		}

		return validation.data;
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error('Unknown error during token validation');
	}
}

/**
 * Check if token needs refresh based on expiry time
 * Refreshes if token expires in less than 5 minutes
 *
 * @param tokenExpiry - Token expiry timestamp from database
 * @returns true if token needs refresh
 */
export function shouldRefreshToken(tokenExpiry: Date | string): boolean {
	const expiry = typeof tokenExpiry === 'string' ? new Date(tokenExpiry) : tokenExpiry;
	const now = Date.now();
	const expiryTime = expiry.getTime();
	const fiveMinutes = 5 * 60 * 1000;

	return expiryTime - now < fiveMinutes;
}

/**
 * Parse Google API error response
 * Extracts user-friendly error message
 *
 * @param error - Error response from Google API
 * @returns User-friendly error message
 */
export function parseGoogleAPIError(error: unknown): string {
	if (typeof error === 'object' && error !== null) {
		const validation = googleAPIErrorSchema.safeParse(error);
		if (validation.success) {
			const googleError = validation.data.error;
			return `${googleError.message} (${googleError.status})`;
		}
	}

	if (error instanceof Error) {
		return error.message;
	}

	return 'Unknown Google API error';
}
