/**
 * Rate Limiter for Authentication Endpoints (Database-backed)
 *
 * SECURITY: Prevents brute force attacks on authentication endpoints
 *
 * FEATURES:
 * - Database-backed rate limiting (replaces Redis)
 * - Dual tracking: by IP address AND email (double protection)
 * - Transactional guarantees from Supabase Postgres
 * - Automatic cleanup via database function
 * - Fail-open on database errors (prevents DoS from DB issues)
 *
 * CONFIGURATION:
 * - Login attempts: 5 per 15 minutes per IP
 * - Login attempts: 3 per 15 minutes per email (stricter)
 * - Signup attempts: 3 per hour per IP
 * - OAuth attempts: 10 per 15 minutes per IP
 * - Chatbot requests: 5 per 15 minutes per user
 *
 * MIGRATION FROM REDIS:
 * - Previous implementation used Redis atomic counters
 * - New implementation uses Supabase rate_limits table
 * - More reliable for single-instance deployments
 * - No external dependencies (Redis) required
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('rateLimiter');

// ============================================================================
// TYPES
// ============================================================================

interface RateLimitConfig {
	key: string;
	maxAttempts: number;
	windowSeconds: number;
}

interface RateLimitResult {
	allowed: boolean;
	message?: string;
}

// ============================================================================
// CORE RATE LIMITING LOGIC
// ============================================================================

/**
 * Check rate limit using database
 *
 * This function implements the core rate limiting logic:
 * 1. Check if a rate limit entry exists for the key
 * 2. If it exists and hasn't expired:
 *    - Check if count >= maxAttempts (rate limited)
 *    - Otherwise increment count
 * 3. If it doesn't exist or expired, create new entry
 *
 * @param supabase - Supabase client instance
 * @param config - Rate limit configuration
 * @returns true if rate limit exceeded, false if allowed
 */
async function checkRateLimit(
	supabase: SupabaseClient<Database>,
	config: RateLimitConfig
): Promise<boolean> {
	const { key, maxAttempts, windowSeconds } = config;
	const expiresAt = new Date(Date.now() + windowSeconds * 1000);

	try {
		// Try to find existing rate limit entry that hasn't expired
		const { data: existing, error: fetchError } = await supabase
			.from('rate_limits')
			.select('count, expires_at')
			.eq('key', key)
			.gte('expires_at', new Date().toISOString())
			.maybeSingle();

		if (fetchError) {
			logger.error('Rate limit check error:', fetchError);
			return false; // Fail open on errors
		}

		if (existing) {
			// Entry exists and hasn't expired
			console.log(`[RATE LIMITER] Checking: count=${existing.count}, max=${maxAttempts}, blocked=${existing.count >= maxAttempts}`);
			if (existing.count >= maxAttempts) {
				logger.trace('Rate limit exceeded', { key: maskKey(key), count: existing.count });
				console.log(`[RATE LIMITER] BLOCKING - returning true`);
				return true; // Rate limit exceeded
			}

			// Increment counter
			const { error: updateError } = await supabase
				.from('rate_limits')
				.update({ count: existing.count + 1 })
				.eq('key', key);

			if (updateError) {
				logger.error('Rate limit update error:', updateError);
				return false; // Fail open
			}

			logger.trace('Rate limit incremented', { key: maskKey(key), count: existing.count + 1 });
			console.log(`[RATE LIMITER] ALLOWING - returning false`);
			return false; // Allowed
		} else {
			// No existing entry or expired - create new entry
			const { error: insertError } = await supabase.from('rate_limits').insert({
				key,
				count: 1,
				expires_at: expiresAt.toISOString()
			});

			if (insertError) {
				// Handle unique constraint violation (race condition)
				if (insertError.code === '23505') {
					// Entry was created by another request, retry once
					logger.trace('Unique constraint violation, retrying', { key: maskKey(key) });
					return checkRateLimit(supabase, config);
				}

				logger.error('Rate limit insert error:', insertError);
				return false; // Fail open
			}

			logger.trace('Rate limit entry created', { key: maskKey(key) });
			return false; // First attempt, allowed
		}
	} catch (error) {
		logger.error('Rate limit error:', error);
		return false; // Fail open on exceptions
	}
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Mask sensitive keys for logging
 */
function maskKey(key: string): string {
	// Extract the actual value from the key (e.g., "ratelimit:login:ip:192.168.1.1" -> "192.168.1.1")
	const parts = key.split(':');
	const value = parts[parts.length - 1];

	if (value.includes('@')) {
		// Email - show first 2 chars and domain
		const [local, domain] = value.split('@');
		return `${local.substring(0, 2)}***@${domain}`;
	}

	// IP - show first and last octet
	const ipParts = value.split('.');
	if (ipParts.length === 4) {
		return `${ipParts[0]}.***.***${ipParts[3]}`;
	}

	// UUID or other - show first 4 chars
	return `${value.substring(0, 4)}***`;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Check login rate limit by IP address
 *
 * @param ip - Client IP address
 * @param supabase - Supabase client instance
 * @returns Rate limit result with allowed status and optional message
 *
 * SECURITY: 5 attempts per 15 minutes
 */
export async function checkLoginRateLimitByIP(
	ip: string,
	supabase: SupabaseClient<Database>
): Promise<RateLimitResult> {
	if (!ip) {
		logger.warn('Missing IP address for rate limit check');
		return { allowed: true }; // Fail open rather than blocking legitimate users
	}

	const key = `ratelimit:login:ip:${ip}`;
	const limited = await checkRateLimit(supabase, {
		key,
		maxAttempts: 5,
		windowSeconds: 900 // 15 minutes
	});

	console.log(`[checkLoginRateLimitByIP] limited=${limited}, will return allowed=${!limited}`);

	if (limited) {
		logger.warn('Login rate limit exceeded by IP', { ip: maskKey(key) });
		return {
			allowed: false,
			message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.'
		};
	}

	return { allowed: true };
}

/**
 * Check login rate limit by email address
 *
 * @param email - User email address
 * @param supabase - Supabase client instance
 * @returns Rate limit result with allowed status and optional message
 *
 * SECURITY: 3 attempts per 15 minutes (stricter than IP limit)
 */
export async function checkLoginRateLimitByEmail(
	email: string,
	supabase: SupabaseClient<Database>
): Promise<RateLimitResult> {
	if (!email) {
		logger.warn('Missing email for rate limit check');
		return { allowed: true }; // Fail open
	}

	// Normalize email to lowercase for consistent tracking
	const normalizedEmail = email.toLowerCase().trim();
	const key = `ratelimit:login:email:${normalizedEmail}`;

	const limited = await checkRateLimit(supabase, {
		key,
		maxAttempts: 3,
		windowSeconds: 900 // 15 minutes
	});

	if (limited) {
		logger.warn('Login rate limit exceeded by email', { email: maskKey(key) });
		return {
			allowed: false,
			message: 'Trop de tentatives de connexion pour cet email. Réessayez dans 15 minutes.'
		};
	}

	return { allowed: true };
}

/**
 * Check signup rate limit by IP address
 *
 * @param ip - Client IP address
 * @param supabase - Supabase client instance
 * @returns Rate limit result with allowed status and optional message
 *
 * SECURITY: 3 attempts per hour (stricter to prevent spam accounts)
 */
export async function checkSignupRateLimitByIP(
	ip: string,
	supabase: SupabaseClient<Database>
): Promise<RateLimitResult> {
	if (!ip) {
		logger.warn('Missing IP address for signup rate limit check');
		return { allowed: true }; // Fail open
	}

	const key = `ratelimit:signup:${ip}`;
	const limited = await checkRateLimit(supabase, {
		key,
		maxAttempts: 3,
		windowSeconds: 3600 // 1 hour
	});

	if (limited) {
		logger.warn('Signup rate limit exceeded by IP', { ip: maskKey(key) });
		return {
			allowed: false,
			message: "Trop de tentatives d'inscription. Réessayez dans 1 heure."
		};
	}

	return { allowed: true };
}

/**
 * Check OAuth rate limit by IP address
 *
 * @param ip - Client IP address
 * @param supabase - Supabase client instance
 * @returns Rate limit result with allowed status and optional message
 *
 * SECURITY: 10 attempts per 15 minutes (higher limit for OAuth flow)
 */
export async function checkOAuthRateLimitByIP(
	ip: string,
	supabase: SupabaseClient<Database>
): Promise<RateLimitResult> {
	if (!ip) {
		logger.warn('Missing IP address for OAuth rate limit check');
		return { allowed: true }; // Fail open
	}

	const key = `ratelimit:oauth:${ip}`;
	const limited = await checkRateLimit(supabase, {
		key,
		maxAttempts: 10,
		windowSeconds: 900 // 15 minutes
	});

	if (limited) {
		logger.warn('OAuth rate limit exceeded by IP', { ip: maskKey(key) });
		return {
			allowed: false,
			message: 'Trop de tentatives OAuth. Réessayez dans 15 minutes.'
		};
	}

	return { allowed: true };
}

/**
 * Check chatbot rate limit by user ID
 *
 * @param userId - User ID
 * @param supabase - Supabase client instance
 * @returns Rate limit result with allowed status and optional message
 *
 * SECURITY: 5 requests per 15 minutes
 */
export async function checkChatbotRateLimit(
	userId: string,
	supabase: SupabaseClient<Database>
): Promise<RateLimitResult> {
	if (!userId) {
		logger.warn('Missing user ID for chatbot rate limit check');
		return { allowed: true }; // Fail open
	}

	const key = `ratelimit:chat:${userId}`;
	const limited = await checkRateLimit(supabase, {
		key,
		maxAttempts: 5,
		windowSeconds: 900 // 15 minutes
	});

	if (limited) {
		logger.warn('Chatbot rate limit exceeded', { userId: maskKey(key) });
		return {
			allowed: false,
			message: 'Trop de requêtes au chatbot. Réessayez dans 15 minutes.'
		};
	}

	return { allowed: true };
}
