/**
 * Rate Limiter for Authentication Endpoints (Redis-backed)
 *
 * SECURITY: Prevents brute force attacks on authentication endpoints
 *
 * FEATURES:
 * - Redis-backed rate limiting for multi-instance support (Vercel)
 * - Dual tracking: by IP address AND email (double protection)
 * - Atomic counters prevent race conditions
 * - Automatic TTL-based expiration (no cleanup needed)
 * - Fail-open on Redis errors (prevents DoS from Redis downtime)
 *
 * CONFIGURATION:
 * - Login attempts: 5 per 15 minutes per IP
 * - Login attempts: 3 per 15 minutes per email (stricter)
 * - Signup attempts: 3 per hour per IP
 * - OAuth attempts: 10 per 15 minutes per IP
 * - Chatbot requests: 5 per 15 minutes per user
 *
 * PRODUCTION READY:
 * - Multi-instance safe (shared state via Redis)
 * - Atomic counters prevent race conditions
 * - Upstash Redis with REST API (serverless-friendly)
 * - All counters persist across deployments
 */

import { createLogger } from '$lib/utils/logger';
import { checkRateLimit, CACHE_KEYS, TTL } from '$lib/server/cache';

const logger = createLogger('rateLimiter');

// ============================================================================
// TYPES
// ============================================================================

interface RateLimitConfig {
	maxAttempts: number; // max attempts before blocking
}

interface RateLimitResult {
	allowed: boolean;
	message?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const RATE_LIMIT_CONFIGS = {
	LOGIN_IP: {
		maxAttempts: 5 // 5 attempts per 15 minutes
	} as RateLimitConfig,

	LOGIN_EMAIL: {
		maxAttempts: 3 // 3 attempts per 15 minutes (stricter)
	} as RateLimitConfig,

	SIGNUP_IP: {
		maxAttempts: 3 // 3 attempts per hour
	} as RateLimitConfig,

	OAUTH_IP: {
		maxAttempts: 10 // 10 attempts per 15 minutes
	} as RateLimitConfig,

	CHATBOT: {
		maxAttempts: 5 // 5 requests per 15 minutes
	} as RateLimitConfig
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Mask sensitive keys for logging
 */
function maskKey(key: string): string {
	if (key.includes('@')) {
		// Email - show first 2 chars and domain
		const [local, domain] = key.split('@');
		return `${local.substring(0, 2)}***@${domain}`;
	}

	// IP - show first and last octet
	const parts = key.split('.');
	if (parts.length === 4) {
		return `${parts[0]}.***.***${parts[3]}`;
	}

	// IPv6 or other - show first 4 chars
	return `${key.substring(0, 4)}***`;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Check login rate limit by IP address
 *
 * @param ip - Client IP address
 * @returns Rate limit result with allowed status and optional message
 *
 * SECURITY: 5 attempts per 15 minutes
 */
export async function checkLoginRateLimitByIP(ip: string): Promise<RateLimitResult> {
	if (!ip) {
		logger.warn('Missing IP address for rate limit check');
		return { allowed: true }; // Fail open rather than blocking legitimate users
	}

	const config = RATE_LIMIT_CONFIGS.LOGIN_IP;
	const key = CACHE_KEYS.RATE_LIMIT_LOGIN_IP(ip);

	const result = await checkRateLimit(key, config.maxAttempts, TTL.RATE_LIMIT_LOGIN);

	if (!result.allowed) {
		const minutes = Math.ceil((result.retryAfter || 0) / 60);
		logger.warn('Login rate limit exceeded by IP', { ip: maskKey(ip), retryAfter: minutes });
		return {
			allowed: false,
			message: `Trop de tentatives de connexion. Réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`
		};
	}

	return { allowed: true };
}

/**
 * Check login rate limit by email address
 *
 * @param email - User email address
 * @returns Rate limit result with allowed status and optional message
 *
 * SECURITY: 3 attempts per 15 minutes (stricter than IP limit)
 */
export async function checkLoginRateLimitByEmail(email: string): Promise<RateLimitResult> {
	if (!email) {
		logger.warn('Missing email for rate limit check');
		return { allowed: true }; // Fail open
	}

	// Normalize email to lowercase for consistent tracking
	const normalizedEmail = email.toLowerCase().trim();
	const config = RATE_LIMIT_CONFIGS.LOGIN_EMAIL;
	const key = CACHE_KEYS.RATE_LIMIT_LOGIN_EMAIL(normalizedEmail);

	const result = await checkRateLimit(key, config.maxAttempts, TTL.RATE_LIMIT_LOGIN);

	if (!result.allowed) {
		const minutes = Math.ceil((result.retryAfter || 0) / 60);
		logger.warn('Login rate limit exceeded by email', {
			email: maskKey(email),
			retryAfter: minutes
		});
		return {
			allowed: false,
			message: `Trop de tentatives de connexion pour cet email. Réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`
		};
	}

	return { allowed: true };
}

/**
 * Check signup rate limit by IP address
 *
 * @param ip - Client IP address
 * @returns Rate limit result with allowed status and optional message
 *
 * SECURITY: 3 attempts per hour (stricter to prevent spam accounts)
 */
export async function checkSignupRateLimitByIP(ip: string): Promise<RateLimitResult> {
	if (!ip) {
		logger.warn('Missing IP address for signup rate limit check');
		return { allowed: true }; // Fail open
	}

	const config = RATE_LIMIT_CONFIGS.SIGNUP_IP;
	const key = CACHE_KEYS.RATE_LIMIT_SIGNUP(ip);

	const result = await checkRateLimit(key, config.maxAttempts, TTL.RATE_LIMIT_SIGNUP);

	if (!result.allowed) {
		const hours = Math.ceil((result.retryAfter || 0) / 3600);
		logger.warn('Signup rate limit exceeded by IP', { ip: maskKey(ip), retryAfter: hours });
		return {
			allowed: false,
			message: `Trop de tentatives d'inscription. Réessayez dans ${hours} heure${hours > 1 ? 's' : ''}.`
		};
	}

	return { allowed: true };
}

/**
 * Check OAuth rate limit by IP address
 *
 * @param ip - Client IP address
 * @returns Rate limit result with allowed status and optional message
 *
 * SECURITY: 10 attempts per 15 minutes (higher limit for OAuth flow)
 */
export async function checkOAuthRateLimitByIP(ip: string): Promise<RateLimitResult> {
	if (!ip) {
		logger.warn('Missing IP address for OAuth rate limit check');
		return { allowed: true }; // Fail open
	}

	const config = RATE_LIMIT_CONFIGS.OAUTH_IP;
	const key = CACHE_KEYS.RATE_LIMIT_OAUTH(ip);

	const result = await checkRateLimit(key, config.maxAttempts, TTL.RATE_LIMIT_LOGIN);

	if (!result.allowed) {
		const minutes = Math.ceil((result.retryAfter || 0) / 60);
		logger.warn('OAuth rate limit exceeded by IP', { ip: maskKey(ip), retryAfter: minutes });
		return {
			allowed: false,
			message: `Trop de tentatives OAuth. Réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`
		};
	}

	return { allowed: true };
}

/**
 * Check chatbot rate limit by user ID
 *
 * @param userId - User ID
 * @returns Rate limit result with allowed status and optional message
 *
 * SECURITY: 5 requests per 15 minutes
 */
export async function checkChatbotRateLimit(userId: string): Promise<RateLimitResult> {
	if (!userId) {
		logger.warn('Missing user ID for chatbot rate limit check');
		return { allowed: true }; // Fail open
	}

	const config = RATE_LIMIT_CONFIGS.CHATBOT;
	const key = CACHE_KEYS.RATE_LIMIT_CHAT(userId);

	const result = await checkRateLimit(key, config.maxAttempts, TTL.RATE_LIMIT_LOGIN);

	if (!result.allowed) {
		const minutes = Math.ceil((result.retryAfter || 0) / 60);
		logger.warn('Chatbot rate limit exceeded', { userId: maskKey(userId), retryAfter: minutes });
		return {
			allowed: false,
			message: `Trop de requêtes au chatbot. Réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`
		};
	}

	return { allowed: true };
}
