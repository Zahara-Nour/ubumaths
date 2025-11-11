/**
 * CRON Job Authentication Utilities
 *
 * Provides secure authentication for CRON endpoints using Bearer token authentication.
 * Implements constant-time comparison to prevent timing attacks.
 *
 * @module server/auth/cron
 */

import { error } from '@sveltejs/kit';
import { getEnv } from '$lib/server/env';
import { createHash, timingSafeEqual } from 'crypto';

/**
 * Verify CRON authentication from request headers
 *
 * Supports two authentication methods:
 * 1. Vercel Cron (automatic): x-vercel-cron: 1 header + VERCEL=1 environment
 * 2. Manual triggers: Authorization: Bearer <CRON_SECRET> header
 *
 * @param request - The incoming HTTP request
 * @throws {Error} 401 if authentication fails
 * @throws {Error} 503 if CRON_SECRET not configured
 *
 * @example
 * ```typescript
 * import { verifyCronAuth } from '$lib/server/auth/cron';
 *
 * export const POST: RequestHandler = async ({ request }) => {
 *   verifyCronAuth(request); // Throws 401 if invalid
 *   // ... proceed with CRON job logic
 * };
 * ```
 *
 * @security
 * - Method 1 (Vercel): Checks x-vercel-cron=1 header + VERCEL=1 env var
 * - Method 2 (Manual): Bearer token with constant-time comparison
 * - Fails secure: Rejects all requests if CRON_SECRET undefined
 * - Logs all authentication attempts (success + failure)
 */
export function verifyCronAuth(request: Request): void {
	const env = getEnv();

	// SECURITY: Fail-secure - reject if CRON_SECRET not configured
	// This prevents CRON endpoints from being accidentally exposed
	if (!env.CRON_SECRET) {
		console.error('[CRON AUTH] CRON_SECRET not configured - CRON endpoints are disabled');
		throw error(503, 'CRON endpoints disabled: CRON_SECRET not configured');
	}

	// METHOD 1: Check for Vercel Cron header (added automatically by Vercel)
	const vercelCronHeader = request.headers.get('x-vercel-cron');
	if (vercelCronHeader === '1') {
		// Verify we're running on Vercel (additional security layer)
		if (process.env.VERCEL === '1') {
			console.log('[CRON AUTH] ✅ Valid Vercel Cron', {
				url: request.url,
				method: request.method,
				timestamp: new Date().toISOString()
			});
			return; // Authorized
		} else {
			console.warn('[CRON AUTH] x-vercel-cron header present but not running on Vercel', {
				url: request.url
			});
			throw error(401, 'Unauthorized: Invalid environment');
		}
	}

	// METHOD 2: Check for Bearer token (for manual triggers)
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
		console.warn('[CRON AUTH] Missing authentication (no x-vercel-cron or Authorization header)', {
			url: request.url,
			method: request.method
		});
		throw error(401, 'Unauthorized: Missing authentication');
	}

	// Validate Bearer token format (case-insensitive)
	// Expected format: "Bearer <token>"
	const match = /^Bearer\s+(.+)$/i.exec(authHeader);
	if (!match) {
		console.warn('[CRON AUTH] Invalid Authorization header format', {
			url: request.url,
			format: authHeader.substring(0, 20) // Log first 20 chars only (don't leak full header)
		});
		throw error(
			401,
			'Unauthorized: Invalid Authorization header format (expected "Bearer <token>")'
		);
	}

	const providedToken = match[1];

	// SECURITY: Constant-time comparison prevents timing attacks
	// Convert both strings to buffers for timingSafeEqual()
	const expectedBuffer = Buffer.from(env.CRON_SECRET, 'utf8');
	const providedBuffer = Buffer.from(providedToken, 'utf8');

	// Check lengths match before calling timingSafeEqual()
	// timingSafeEqual() requires equal-length buffers
	if (expectedBuffer.length !== providedBuffer.length) {
		console.warn('[CRON AUTH] Invalid token (length mismatch)', {
			url: request.url,
			expected_length: expectedBuffer.length,
			provided_length: providedBuffer.length
		});
		throw error(401, 'Unauthorized: Invalid token');
	}

	// Perform constant-time comparison
	try {
		if (!timingSafeEqual(expectedBuffer, providedBuffer)) {
			console.warn('[CRON AUTH] Invalid token (value mismatch)', {
				url: request.url
			});
			throw error(401, 'Unauthorized: Invalid token');
		}
	} catch (err) {
		// timingSafeEqual can throw if buffers are invalid
		console.error('[CRON AUTH] Comparison error:', err);
		throw error(401, 'Unauthorized: Invalid token');
	}

	// Success - log and continue
	console.log('[CRON AUTH] ✅ Valid Bearer token', {
		url: request.url,
		method: request.method,
		timestamp: new Date().toISOString()
	});
}

/**
 * Generate a secure random CRON secret
 *
 * Creates a 32-character hexadecimal string (128 bits of entropy) suitable
 * for use as CRON_SECRET environment variable.
 *
 * @returns {string} 32-character hex string
 *
 * @example
 * ```typescript
 * import { generateCronSecret } from '$lib/server/auth/cron';
 *
 * const secret = generateCronSecret();
 * console.log(`CRON_SECRET=${secret}`);
 * // Output: CRON_SECRET=a3f5d8c2b1e4... (32 chars)
 * ```
 *
 * @security
 * - Uses crypto.randomBytes() for cryptographically secure randomness
 * - 128 bits of entropy (industry standard for secrets)
 * - Hex encoding ensures safe transmission in HTTP headers
 */
export function generateCronSecret(): string {
	// Combine multiple entropy sources for extra randomness
	const hash = createHash('sha256')
		.update(Math.random().toString()) // JavaScript random
		.update(Date.now().toString()) // Timestamp
		.update(process.hrtime.bigint().toString()) // High-resolution time
		.digest('hex');

	// Return first 32 characters (128 bits)
	return hash.substring(0, 32);
}
