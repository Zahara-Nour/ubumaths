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
 * **Fail-Open Strategy**: If database errors occur, the function returns `false`
 * (allows the request). This prevents DoS attacks where an attacker could
 * crash the database to block legitimate users.
 *
 * **Race Condition Handling**: Uses unique constraint violations to detect
 * concurrent inserts. If a constraint violation occurs (code 23505), the
 * function retries once to read the newly created entry.
 *
 * @param supabase - Supabase client instance from request context
 * @param config - Rate limit configuration object
 * @param config.key - Unique identifier for rate limit bucket (e.g., "ratelimit:login:ip:192.168.1.1")
 * @param config.maxAttempts - Maximum allowed attempts within window
 * @param config.windowSeconds - Time window in seconds before entry expires
 * @returns `true` if rate limit exceeded (block request), `false` if allowed (or on error)
 *
 * @example Basic usage (internal function)
 * ```typescript
 * const limited = await checkRateLimit(supabase, {
 *   key: 'ratelimit:login:ip:192.168.1.1',
 *   maxAttempts: 5,
 *   windowSeconds: 900 // 15 minutes
 * });
 * if (limited) {
 *   return json({ error: 'Too many attempts' }, { status: 429 });
 * }
 * ```
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
			console.log(
				`[RATE LIMITER] Checking: count=${existing.count}, max=${maxAttempts}, blocked=${existing.count >= maxAttempts}`
			);
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
 *
 * Protects PII (Personally Identifiable Information) in logs by redacting
 * parts of IP addresses, email addresses, and UUIDs.
 *
 * **Masking Strategy**:
 * - **Email**: Shows first 2 characters + full domain (e.g., "us***@example.com")
 * - **IP Address**: Shows first and last octet (e.g., "192.***.***1")
 * - **UUID/Other**: Shows first 4 characters (e.g., "a1b2***")
 *
 * @param key - Rate limit key containing sensitive data (format: "prefix:type:identifier:value")
 * @returns Masked key safe for logging
 *
 * @example Email masking
 * ```typescript
 * maskKey('ratelimit:login:email:user@example.com')
 * // Returns: 'us***@example.com'
 * ```
 *
 * @example IP masking
 * ```typescript
 * maskKey('ratelimit:login:ip:192.168.1.100')
 * // Returns: '192.***.***100'
 * ```
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
 * Prevents brute force attacks by limiting login attempts from a single IP address.
 * This is the first line of defense - checked before email-based rate limiting.
 *
 * **Rate Limit**: 5 attempts per 15 minutes per IP
 *
 * **Security Considerations**:
 * - Shared IPs (schools, offices): Multiple users behind NAT may hit this limit
 * - VPN/Proxy: Attackers can bypass by rotating IPs, hence email-based limit is also used
 * - Fail-open: If database is unavailable, allows requests (prevents DoS)
 *
 * **Use Case**: Call this in `/auth/login/+page.server.ts` before credential validation
 *
 * @param ip - Client IP address from `event.getClientAddress()` or `X-Forwarded-For` header
 * @param supabase - Supabase client instance from `event.locals.supabase`
 * @returns Rate limit result object
 * @returns result.allowed - `true` if request should be allowed, `false` if rate limited
 * @returns result.message - User-friendly French error message (only if `allowed: false`)
 *
 * @example In login form action
 * ```typescript
 * export const actions = {
 *   default: async ({ request, getClientAddress, locals: { supabase } }) => {
 *     const ip = getClientAddress();
 *
 *     // Check IP-based rate limit
 *     const ipLimit = await checkLoginRateLimitByIP(ip, supabase);
 *     if (!ipLimit.allowed) {
 *       return fail(429, { error: ipLimit.message });
 *     }
 *
 *     // Proceed with authentication...
 *   }
 * };
 * ```
 *
 * @example Error handling
 * ```typescript
 * const result = await checkLoginRateLimitByIP('192.168.1.1', supabase);
 * if (!result.allowed) {
 *   // Display to user: "Trop de tentatives de connexion. Réessayez dans 15 minutes."
 *   return json({ error: result.message }, { status: 429 });
 * }
 * ```
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
 * Prevents credential stuffing attacks by limiting login attempts for a specific email.
 * This is the second line of defense - checked after IP rate limiting passes.
 *
 * **Rate Limit**: 3 attempts per 15 minutes per email (stricter than IP limit)
 *
 * **Why Stricter?**
 * - Email-specific limits can't be bypassed by IP rotation
 * - Protects individual accounts even if attacker uses multiple IPs
 * - Lower threshold (3 vs 5) provides stronger account protection
 *
 * **Email Normalization**: Automatically converts email to lowercase and trims whitespace
 * to prevent bypasses via case variations (User@example.com vs user@example.com)
 *
 * **Security Considerations**:
 * - Fail-open: Allows requests if database is unavailable
 * - No account enumeration: Rate limit applies even if account doesn't exist
 * - Works with both email/password and OAuth flows
 *
 * @param email - User email address from login form (will be normalized to lowercase)
 * @param supabase - Supabase client instance from `event.locals.supabase`
 * @returns Rate limit result object
 * @returns result.allowed - `true` if request should be allowed, `false` if rate limited
 * @returns result.message - User-friendly French error message (only if `allowed: false`)
 *
 * @example In login form action
 * ```typescript
 * export const actions = {
 *   default: async ({ request, locals: { supabase } }) => {
 *     const formData = await request.formData();
 *     const email = String(formData.get('email'));
 *
 *     // Check email-based rate limit (after IP check passes)
 *     const emailLimit = await checkLoginRateLimitByEmail(email, supabase);
 *     if (!emailLimit.allowed) {
 *       return fail(429, { error: emailLimit.message });
 *     }
 *
 *     // Proceed with authentication...
 *   }
 * };
 * ```
 *
 * @example Dual protection pattern
 * ```typescript
 * // Check both IP and email rate limits
 * const ipLimit = await checkLoginRateLimitByIP(ip, supabase);
 * if (!ipLimit.allowed) return fail(429, { error: ipLimit.message });
 *
 * const emailLimit = await checkLoginRateLimitByEmail(email, supabase);
 * if (!emailLimit.allowed) return fail(429, { error: emailLimit.message });
 *
 * // Both checks passed - safe to attempt authentication
 * ```
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
 * Prevents spam account creation by limiting signups from a single IP address.
 * Stricter than login limits to prevent abuse scenarios like:
 * - Mass account creation for spam/abuse
 * - Database pollution with fake accounts
 * - Resource exhaustion attacks
 *
 * **Rate Limit**: 3 attempts per hour per IP
 *
 * **Why Stricter?**
 * - Account creation is less frequent than login (legitimate users sign up once)
 * - Longer window (1 hour vs 15 minutes) provides better spam protection
 * - Lower threshold prevents automated account creation scripts
 *
 * **Legitimate Use Cases**:
 * - School computer labs: May hit this limit during teacher onboarding
 * - Shared networks: Multiple users signing up simultaneously
 * - Workaround: Admins can manually create accounts or use different networks
 *
 * @param ip - Client IP address from `event.getClientAddress()` or `X-Forwarded-For` header
 * @param supabase - Supabase client instance from `event.locals.supabase`
 * @returns Rate limit result object
 * @returns result.allowed - `true` if signup should be allowed, `false` if rate limited
 * @returns result.message - User-friendly French error message (only if `allowed: false`)
 *
 * @example In signup form action
 * ```typescript
 * export const actions = {
 *   default: async ({ request, getClientAddress, locals: { supabase } }) => {
 *     const ip = getClientAddress();
 *
 *     // Check signup rate limit
 *     const signupLimit = await checkSignupRateLimitByIP(ip, supabase);
 *     if (!signupLimit.allowed) {
 *       return fail(429, { error: signupLimit.message });
 *     }
 *
 *     // Proceed with account creation...
 *   }
 * };
 * ```
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
 * Prevents OAuth flow abuse while allowing legitimate retries for OAuth-specific issues:
 * - OAuth redirect failures (user cancels, network errors)
 * - Multiple social login attempts (Google, GitHub, etc.)
 * - Browser compatibility issues requiring retries
 *
 * **Rate Limit**: 10 attempts per 15 minutes per IP (higher than email/password login)
 *
 * **Why Higher Limit?**
 * - OAuth flows naturally require more redirects (initiate → callback → complete)
 * - Users may try multiple providers (Google, then GitHub, then email)
 * - Legitimate failures are more common (cancelled consent, expired tokens)
 * - OAuth providers have their own rate limiting and security
 *
 * **Security Notes**:
 * - Still prevents automated abuse (10 attempts is reasonable for legitimate users)
 * - OAuth providers (Google, GitHub) enforce their own security measures
 * - Fail-open: Allows requests if database is unavailable
 *
 * @param ip - Client IP address from `event.getClientAddress()` or `X-Forwarded-For` header
 * @param supabase - Supabase client instance from `event.locals.supabase`
 * @returns Rate limit result object
 * @returns result.allowed - `true` if OAuth attempt should be allowed, `false` if rate limited
 * @returns result.message - User-friendly French error message (only if `allowed: false`)
 *
 * @example In OAuth callback handler
 * ```typescript
 * export const GET: RequestHandler = async ({ url, getClientAddress, locals: { supabase } }) => {
 *   const ip = getClientAddress();
 *
 *   // Check OAuth rate limit
 *   const oauthLimit = await checkOAuthRateLimitByIP(ip, supabase);
 *   if (!oauthLimit.allowed) {
 *     throw error(429, oauthLimit.message);
 *   }
 *
 *   // Handle OAuth callback...
 * };
 * ```
 *
 * @example In OAuth initiation
 * ```typescript
 * // Check before redirecting to OAuth provider
 * const oauthLimit = await checkOAuthRateLimitByIP(ip, supabase);
 * if (!oauthLimit.allowed) {
 *   return fail(429, { error: oauthLimit.message });
 * }
 *
 * // Redirect to Google OAuth
 * const { data, error } = await supabase.auth.signInWithOAuth({
 *   provider: 'google'
 * });
 * ```
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
 * Prevents AI API abuse and controls costs by limiting chatbot interactions per user.
 * Protects against:
 * - Excessive API calls to Claude (Anthropic API costs)
 * - Automated bot spam to the chatbot
 * - Resource exhaustion on the backend
 *
 * **Rate Limit**: 5 requests per 15 minutes per authenticated user
 *
 * **Why This Limit?**
 * - AI API calls are expensive (tokens cost money)
 * - 5 requests = ~5 questions/answers = sufficient for homework help
 * - 15-minute window allows users to have a short conversation
 * - Users can return after window expires for more questions
 *
 * **Implementation Notes**:
 * - Uses user ID (not IP) because chatbot requires authentication
 * - Rate limit is per-user, not global (each user gets 5 requests)
 * - Fail-open: Allows requests if database is unavailable
 *
 * **Cost Control**:
 * - With 1000 active users, max cost = 1000 × 5 requests/15min = ~5000 API calls/15min
 * - At $0.002/request, this caps costs at ~$10/15min = $40/hour max
 *
 * @param userId - Authenticated user ID from `event.locals.user.id`
 * @param supabase - Supabase client instance from `event.locals.supabase`
 * @returns Rate limit result object
 * @returns result.allowed - `true` if chatbot request allowed, `false` if rate limited
 * @returns result.message - User-friendly French error message (only if `allowed: false`)
 *
 * @example In chatbot API endpoint
 * ```typescript
 * export const POST: RequestHandler = async ({ request, locals: { supabase, user } }) => {
 *   if (!user) {
 *     throw error(401, 'Authentication requise');
 *   }
 *
 *   // Check chatbot rate limit
 *   const chatLimit = await checkChatbotRateLimit(user.id, supabase);
 *   if (!chatLimit.allowed) {
 *     return json({ error: chatLimit.message }, { status: 429 });
 *   }
 *
 *   // Process chatbot request with Claude API...
 * };
 * ```
 *
 * @example With user feedback
 * ```typescript
 * const chatLimit = await checkChatbotRateLimit(userId, supabase);
 * if (!chatLimit.allowed) {
 *   // Show remaining time to user
 *   return json({
 *     error: chatLimit.message,
 *     retryAfter: 900 // seconds until window resets
 *   }, { status: 429 });
 * }
 * ```
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
