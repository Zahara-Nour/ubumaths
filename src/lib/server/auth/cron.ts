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
import { randomBytes, timingSafeEqual } from 'crypto';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('server/auth/cron');

/**
 * Verify CRON authentication from request headers
 *
 * Une seule méthode : `Authorization: Bearer <CRON_SECRET>`, que Vercel envoie à ses
 * crons et que le déclencheur admin envoie aussi. (L'ancienne « méthode Vercel »,
 * l'en-tête `x-vercel-cron`, acceptait n'importe quel appelant qui l'envoyait.)
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
 * - Bearer token with constant-time comparison
 * - Fails secure: Rejects all requests if CRON_SECRET undefined
 * - Logs all authentication attempts (success + failure)
 */
export function verifyCronAuth(request: Request): void {
	const env = getEnv();

	// SECURITY: Fail-secure - reject if CRON_SECRET not configured
	// This prevents CRON endpoints from being accidentally exposed
	if (!env.CRON_SECRET) {
		logger.error('[CRON AUTH] CRON_SECRET not configured - CRON endpoints are disabled');
		throw error(503, 'CRON endpoints disabled: CRON_SECRET not configured');
	}

	// Seul le jeton fait foi. L'en-tête `x-vercel-cron` ne prouve rien : n'importe qui
	// peut l'envoyer. Vercel envoie lui-même `Authorization: Bearer <CRON_SECRET>` à ses
	// crons quand la variable est définie.
	// Bearer token : crons Vercel et déclenchement manuel par l'admin
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
		logger.warn('[CRON AUTH] Missing authentication (no Authorization header)', {
			url: request.url,
			method: request.method
		});
		throw error(401, 'Authentification manquante');
	}

	// Validate Bearer token format (case-insensitive)
	// Expected format: "Bearer <token>"
	const match = /^Bearer\s+(.+)$/i.exec(authHeader);
	if (!match) {
		logger.warn('[CRON AUTH] Invalid Authorization header format', {
			url: request.url,
			format: authHeader.substring(0, 20) // Log first 20 chars only (don't leak full header)
		});
		throw error(401, 'En-tête Authorization mal formé (attendu : « Bearer <jeton> »)');
	}

	const providedToken = match[1];

	// SECURITY: Constant-time comparison prevents timing attacks
	// Convert both strings to buffers for timingSafeEqual()
	const expectedBuffer = Buffer.from(env.CRON_SECRET, 'utf8');
	const providedBuffer = Buffer.from(providedToken, 'utf8');

	// Check lengths match before calling timingSafeEqual()
	// timingSafeEqual() requires equal-length buffers
	if (expectedBuffer.length !== providedBuffer.length) {
		logger.warn('[CRON AUTH] Invalid token (length mismatch)', {
			url: request.url,
			expected_length: expectedBuffer.length,
			provided_length: providedBuffer.length
		});
		throw error(401, 'Jeton invalide');
	}

	// Perform constant-time comparison
	try {
		if (!timingSafeEqual(expectedBuffer, providedBuffer)) {
			logger.warn('[CRON AUTH] Invalid token (value mismatch)', {
				url: request.url
			});
			throw error(401, 'Jeton invalide');
		}
	} catch (err) {
		// timingSafeEqual can throw if buffers are invalid
		logger.error('[CRON AUTH] Comparison error:', err);
		throw error(401, 'Jeton invalide');
	}

	// Success - log and continue
	logger.info('[CRON AUTH] ✅ Valid Bearer token', {
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
	// 16 cryptographically secure random bytes = 32 hex chars = 128 bits of entropy.
	// Derived from crypto.randomBytes (CSPRNG) — never a predictable, non-crypto PRNG.
	return randomBytes(16).toString('hex');
}
