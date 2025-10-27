/**
 * Rate Limiter for Authentication Endpoints
 *
 * SECURITY: Prevents brute force attacks on authentication endpoints
 *
 * FEATURES:
 * - In-memory rate limiting with configurable windows and limits
 * - Dual tracking: by IP address AND email (double protection)
 * - Exponential backoff for repeated violations
 * - Auto-cleanup of expired entries
 * - Thread-safe operations
 *
 * CONFIGURATION:
 * - Login attempts: 5 per 15 minutes per IP
 * - Login attempts: 3 per 15 minutes per email (stricter)
 * - Signup attempts: 3 per hour per IP
 * - Block duration: 15 minutes for login, 30 minutes for repeated violations
 *
 * PRODUCTION CONSIDERATIONS:
 * - For multi-instance deployments, migrate to Redis/Upstash
 * - This in-memory implementation is suitable for single-instance deployments
 * - Upstash Redis example:
 *   const redis = new Redis({
 *     url: process.env.UPSTASH_REDIS_URL!,
 *     token: process.env.UPSTASH_REDIS_TOKEN!
 *   });
 *   await redis.incr(`ratelimit:${key}`);
 *   await redis.expire(`ratelimit:${key}`, windowSeconds);
 */

import { createLogger } from '$lib/utils/logger';

const logger = createLogger('rateLimiter');

// ============================================================================
// TYPES
// ============================================================================

interface RateLimitEntry {
	attempts: number;
	firstAttempt: number; // timestamp
	blockUntil: number | null; // timestamp when block expires, null if not blocked
	violationCount: number; // number of times user has been blocked (for exponential backoff)
}

interface RateLimitConfig {
	maxAttempts: number; // max attempts before blocking
	windowMs: number; // time window in milliseconds
	blockDurationMs: number; // how long to block after exceeding limit
}

interface RateLimitResult {
	allowed: boolean;
	remainingAttempts?: number;
	resetTime?: number; // timestamp when attempts reset
	retryAfter?: number; // seconds until unblocked
	message?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const RATE_LIMIT_CONFIGS = {
	LOGIN_IP: {
		maxAttempts: 5,
		windowMs: 15 * 60 * 1000, // 15 minutes
		blockDurationMs: 15 * 60 * 1000 // 15 minutes
	} as RateLimitConfig,

	LOGIN_EMAIL: {
		maxAttempts: 3,
		windowMs: 15 * 60 * 1000, // 15 minutes
		blockDurationMs: 15 * 60 * 1000 // 15 minutes
	} as RateLimitConfig,

	SIGNUP_IP: {
		maxAttempts: 3,
		windowMs: 60 * 60 * 1000, // 1 hour
		blockDurationMs: 30 * 60 * 1000 // 30 minutes
	} as RateLimitConfig,

	OAUTH_IP: {
		maxAttempts: 10,
		windowMs: 15 * 60 * 1000, // 15 minutes
		blockDurationMs: 15 * 60 * 1000 // 15 minutes
	} as RateLimitConfig
};

// ============================================================================
// IN-MEMORY STORAGE
// ============================================================================

// Separate stores for different tracking dimensions and purposes
const loginIPStore = new Map<string, RateLimitEntry>();
const emailStore = new Map<string, RateLimitEntry>();
const signupIPStore = new Map<string, RateLimitEntry>();
const oauthIPStore = new Map<string, RateLimitEntry>();

// Cleanup interval - run every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let cleanupTimer: NodeJS.Timeout | null = null;

/**
 * Initialize cleanup timer
 * Auto-removes expired entries to prevent memory leaks
 */
function initCleanup(): void {
	if (cleanupTimer) return; // Already initialized

	cleanupTimer = setInterval(() => {
		const now = Date.now();
		let cleanedCount = 0;

		// Clean login IP store
		for (const [key, entry] of loginIPStore.entries()) {
			// Remove if window has expired and not currently blocked
			if (
				now - entry.firstAttempt > RATE_LIMIT_CONFIGS.LOGIN_IP.windowMs &&
				(!entry.blockUntil || now > entry.blockUntil)
			) {
				loginIPStore.delete(key);
				cleanedCount++;
			}
		}

		// Clean email store
		for (const [key, entry] of emailStore.entries()) {
			if (
				now - entry.firstAttempt > RATE_LIMIT_CONFIGS.LOGIN_EMAIL.windowMs &&
				(!entry.blockUntil || now > entry.blockUntil)
			) {
				emailStore.delete(key);
				cleanedCount++;
			}
		}

		// Clean signup IP store
		for (const [key, entry] of signupIPStore.entries()) {
			if (
				now - entry.firstAttempt > RATE_LIMIT_CONFIGS.SIGNUP_IP.windowMs &&
				(!entry.blockUntil || now > entry.blockUntil)
			) {
				signupIPStore.delete(key);
				cleanedCount++;
			}
		}

		// Clean OAuth IP store
		for (const [key, entry] of oauthIPStore.entries()) {
			if (
				now - entry.firstAttempt > RATE_LIMIT_CONFIGS.OAUTH_IP.windowMs &&
				(!entry.blockUntil || now > entry.blockUntil)
			) {
				oauthIPStore.delete(key);
				cleanedCount++;
			}
		}

		if (cleanedCount > 0) {
			logger.info(`Cleaned ${cleanedCount} expired rate limit entries`);
		}
	}, CLEANUP_INTERVAL_MS);

	// Ensure timer doesn't prevent process from exiting
	cleanupTimer.unref();

	logger.info('Rate limiter cleanup initialized');
}

// Initialize on module load
initCleanup();

// ============================================================================
// CORE RATE LIMITING LOGIC
// ============================================================================

/**
 * Check if request is allowed based on rate limit
 *
 * @param key - Unique identifier (IP or email)
 * @param config - Rate limit configuration
 * @param store - Storage map to use
 * @returns Rate limit result
 */
function checkRateLimit(
	key: string,
	config: RateLimitConfig,
	store: Map<string, RateLimitEntry>
): RateLimitResult {
	const now = Date.now();
	let entry = store.get(key);

	// No entry - first attempt
	if (!entry) {
		entry = {
			attempts: 1,
			firstAttempt: now,
			blockUntil: null,
			violationCount: 0
		};
		store.set(key, entry);

		return {
			allowed: true,
			remainingAttempts: config.maxAttempts - 1,
			resetTime: now + config.windowMs
		};
	}

	// Check if currently blocked
	if (entry.blockUntil && now < entry.blockUntil) {
		const retryAfter = Math.ceil((entry.blockUntil - now) / 1000);
		return {
			allowed: false,
			retryAfter,
			message: `Trop de tentatives. Veuillez réessayer dans ${formatDuration(retryAfter)}.`
		};
	}

	// Block expired - reset entry
	if (entry.blockUntil && now >= entry.blockUntil) {
		entry.attempts = 1;
		entry.firstAttempt = now;
		entry.blockUntil = null;
		// Keep violationCount for exponential backoff
		store.set(key, entry);

		return {
			allowed: true,
			remainingAttempts: config.maxAttempts - 1,
			resetTime: now + config.windowMs
		};
	}

	// Window expired - reset attempts
	if (now - entry.firstAttempt > config.windowMs) {
		entry.attempts = 1;
		entry.firstAttempt = now;
		entry.blockUntil = null;
		store.set(key, entry);

		return {
			allowed: true,
			remainingAttempts: config.maxAttempts - 1,
			resetTime: now + config.windowMs
		};
	}

	// Within window - increment attempts
	entry.attempts++;

	// Check if exceeded limit
	if (entry.attempts > config.maxAttempts) {
		// Calculate block duration with exponential backoff
		const backoffMultiplier = Math.pow(2, entry.violationCount);
		const blockDuration = Math.min(
			config.blockDurationMs * backoffMultiplier,
			24 * 60 * 60 * 1000 // Max 24 hours
		);

		entry.blockUntil = now + blockDuration;
		entry.violationCount++;
		store.set(key, entry);

		const retryAfter = Math.ceil(blockDuration / 1000);

		logger.warn('Rate limit exceeded', {
			key: maskKey(key),
			attempts: entry.attempts,
			violationCount: entry.violationCount,
			blockDuration: blockDuration / 1000
		});

		return {
			allowed: false,
			retryAfter,
			message: `Trop de tentatives. Compte bloqué pendant ${formatDuration(retryAfter)}.`
		};
	}

	// Still within limit
	store.set(key, entry);
	return {
		allowed: true,
		remainingAttempts: config.maxAttempts - entry.attempts,
		resetTime: entry.firstAttempt + config.windowMs
	};
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Check login rate limit by IP address
 */
export function checkLoginRateLimitByIP(ip: string): RateLimitResult {
	if (!ip) {
		logger.warn('Missing IP address for rate limit check');
		return { allowed: true }; // Fail open rather than blocking legitimate users
	}

	return checkRateLimit(ip, RATE_LIMIT_CONFIGS.LOGIN_IP, loginIPStore);
}

/**
 * Check login rate limit by email address
 */
export function checkLoginRateLimitByEmail(email: string): RateLimitResult {
	if (!email) {
		logger.warn('Missing email for rate limit check');
		return { allowed: true }; // Fail open
	}

	// Normalize email to lowercase for consistent tracking
	const normalizedEmail = email.toLowerCase().trim();
	return checkRateLimit(normalizedEmail, RATE_LIMIT_CONFIGS.LOGIN_EMAIL, emailStore);
}

/**
 * Check signup rate limit by IP address
 */
export function checkSignupRateLimitByIP(ip: string): RateLimitResult {
	if (!ip) {
		logger.warn('Missing IP address for signup rate limit check');
		return { allowed: true }; // Fail open
	}

	return checkRateLimit(ip, RATE_LIMIT_CONFIGS.SIGNUP_IP, signupIPStore);
}

/**
 * Check OAuth rate limit by IP address
 */
export function checkOAuthRateLimitByIP(ip: string): RateLimitResult {
	if (!ip) {
		logger.warn('Missing IP address for OAuth rate limit check');
		return { allowed: true }; // Fail open
	}

	return checkRateLimit(ip, RATE_LIMIT_CONFIGS.OAUTH_IP, oauthIPStore);
}

/**
 * Reset rate limit for a specific key (admin override)
 * Useful for manual unblocking of legitimate users
 */
export function resetRateLimit(
	key: string,
	type: 'login-ip' | 'email' | 'signup-ip' | 'oauth-ip'
): void {
	let store: Map<string, RateLimitEntry>;
	switch (type) {
		case 'login-ip':
			store = loginIPStore;
			break;
		case 'email':
			store = emailStore;
			break;
		case 'signup-ip':
			store = signupIPStore;
			break;
		case 'oauth-ip':
			store = oauthIPStore;
			break;
	}
	store.delete(key);
	logger.info(`Rate limit reset for ${type}:`, maskKey(key));
}

/**
 * Get current rate limit status (for monitoring/debugging)
 */
export function getRateLimitStatus(
	key: string,
	type: 'login-ip' | 'email' | 'signup-ip' | 'oauth-ip'
): RateLimitEntry | null {
	let store: Map<string, RateLimitEntry>;
	switch (type) {
		case 'login-ip':
			store = loginIPStore;
			break;
		case 'email':
			store = emailStore;
			break;
		case 'signup-ip':
			store = signupIPStore;
			break;
		case 'oauth-ip':
			store = oauthIPStore;
			break;
	}
	return store.get(key) || null;
}

/**
 * Get rate limiter statistics (for monitoring)
 */
export function getRateLimiterStats() {
	return {
		loginIPEntries: loginIPStore.size,
		emailEntries: emailStore.size,
		signupIPEntries: signupIPStore.size,
		oauthIPEntries: oauthIPStore.size,
		totalEntries: loginIPStore.size + emailStore.size + signupIPStore.size + oauthIPStore.size
	};
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format duration in seconds to human-readable French
 */
function formatDuration(seconds: number): string {
	if (seconds < 60) {
		return `${seconds} seconde${seconds > 1 ? 's' : ''}`;
	}

	const minutes = Math.ceil(seconds / 60);
	if (minutes < 60) {
		return `${minutes} minute${minutes > 1 ? 's' : ''}`;
	}

	const hours = Math.ceil(minutes / 60);
	return `${hours} heure${hours > 1 ? 's' : ''}`;
}

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
// CLEANUP ON SHUTDOWN
// ============================================================================

/**
 * Clean up resources on process termination
 */
export function shutdown(): void {
	if (cleanupTimer) {
		clearInterval(cleanupTimer);
		cleanupTimer = null;
	}
	loginIPStore.clear();
	emailStore.clear();
	signupIPStore.clear();
	oauthIPStore.clear();
	logger.info('Rate limiter shutdown complete');
}

// Handle graceful shutdown
if (typeof process !== 'undefined') {
	process.on('SIGTERM', shutdown);
	process.on('SIGINT', shutdown);
}
