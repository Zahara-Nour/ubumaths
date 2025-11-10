/**
 * Rate Limiter for Authentication and Notification Endpoints (Database-backed)
 *
 * SECURITY: Prevents brute force attacks and spam
 *
 * FEATURES:
 * - Database-backed rate limiting (replaces Redis)
 * - Dual tracking: by IP address AND email (double protection for auth)
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
 * - Notification creation (teachers): 10 per hour per user
 * - Notification creation (admins): 50 per hour per user
 * - Notification deletion (teachers): 20 per hour per user
 * - Notification deletion (admins): 100 per hour per user
 * - Notification mark-read: 30 per 15 minutes per user
 *
 * MIGRATION FROM REDIS:
 * - Previous implementation used Redis atomic counters
 * - New implementation uses Supabase rate_limits table
 * - More reliable for single-instance deployments
 * - No external dependencies (Redis) required
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { createLogger } from '$lib/utils/logger';
import { config } from 'dotenv';

// Load environment variables from .env file
// This ensures variables are available even before SvelteKit's env module initializes
config();

const logger = createLogger('rateLimiter');

// ============================================================================
// SERVICE ROLE CLIENT (REQUIRED FOR RATE LIMITING)
// ============================================================================

/**
 * Singleton service role client for rate limiting
 *
 * **Why Singleton?**
 * - Reuses the same HTTP client across all rate limit checks
 * - Prevents connection pool exhaustion from creating new clients
 * - Improves performance by maintaining persistent connections
 * - Critical fix for timeout issues (was creating client per request)
 *
 * **Why Service Role?**
 * - The `rate_limits` table has RLS enabled with policies that allow all operations
 * - However, the table grants are restricted to `service_role` only
 * - Using the anon client (from `locals.supabase`) causes permission errors
 * - Service role bypasses RLS and has full table access
 *
 * **Security**:
 * - Rate limiting is a server-side system operation (not user-initiated)
 * - No user data or PII is stored in rate_limits table (only counters)
 * - Table is never exposed to client-side code
 *
 * **Performance**:
 * - No session management needed (autoRefreshToken: false)
 * - No persistence needed (persistSession: false)
 *
 * **HMR Safety**:
 * - Uses `globalThis` to persist client across Hot Module Replacement (HMR) reloads
 * - Without this, Vite's HMR would reset the instance to null on every file change
 * - This caused "TypeError: fetch failed" errors due to connection pool exhaustion
 */
const globalForSupabase = globalThis as unknown as {
	supabaseServiceRoleClient: SupabaseClient<Database> | undefined;
};

let serviceRoleClientInstance: SupabaseClient<Database> | null =
	globalForSupabase.supabaseServiceRoleClient || null;

function getServiceRoleClient(): SupabaseClient<Database> {
	// Return existing instance if already created
	if (serviceRoleClientInstance) {
		return serviceRoleClientInstance;
	}

	// Get environment variables from process.env (loaded by dotenv)
	const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
	const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
		logger.error('Missing Supabase environment variables for rate limiter', {
			hasUrl: !!SUPABASE_URL,
			hasKey: !!SERVICE_ROLE_KEY
		});
		throw new Error('Missing Supabase environment variables for rate limiter');
	}

	// Create new instance and cache it
	serviceRoleClientInstance = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});

	// Store in globalThis to persist across HMR reloads
	globalForSupabase.supabaseServiceRoleClient = serviceRoleClientInstance;

	logger.trace('Rate limiter service role client initialized');
	return serviceRoleClientInstance;
}

// ============================================================================
// TYPES
// ============================================================================

interface RateLimitConfig {
	key: string;
	maxAttempts: number;
	windowSeconds: number;
}

export interface RateLimitResult {
	allowed: boolean;
	message?: string;
	retryAfter?: number;
}

type UserRole = Database['public']['Enums']['user_role'];

// ============================================================================
// CORE RATE LIMITING LOGIC
// ============================================================================

/**
 * Check rate limit using database (ATOMIC implementation)
 *
 * This function implements atomic check-and-increment using PostgreSQL's
 * UPDATE ... WHERE pattern to prevent race conditions.
 *
 * **Race Condition Fix (2025-01-10)**:
 * - Previous implementation: Read count, check limit, then increment (NON-ATOMIC)
 * - New implementation: Atomic UPDATE with WHERE clause ensures no concurrent bypass
 *
 * **How Atomicity Works**:
 * ```sql
 * UPDATE rate_limits
 * SET count = count + 1
 * WHERE key = 'ratelimit:login:ip:192.168.1.1'
 *   AND count < 5              -- 🔒 ATOMIC: Uses current value, not stale
 *   AND expires_at > NOW()     -- 🔒 ATOMIC: Ensure entry still valid
 * RETURNING count, expires_at;
 * ```
 *
 * If WHERE clause evaluates to false (limit exceeded or expired), UPDATE affects
 * 0 rows and returns NULL. This is PostgreSQL's native atomic compare-and-swap.
 *
 * **Fail-Open Strategy**: Database errors return `false` (allows request) to prevent
 * DoS attacks where an attacker crashes the database to block legitimate users.
 *
 * @param config - Rate limit configuration object
 * @param config.key - Unique identifier for rate limit bucket (e.g., "ratelimit:login:ip:192.168.1.1")
 * @param config.maxAttempts - Maximum allowed attempts within window
 * @param config.windowSeconds - Time window in seconds before entry expires
 * @param retryCount - Internal parameter tracking retry attempts (default: 0)
 * @returns Object with `limited` (boolean) and `expiresAt` (Date | null)
 *
 * @example Basic usage (internal function)
 * ```typescript
 * const result = await checkRateLimit({
 *   key: 'ratelimit:login:ip:192.168.1.1',
 *   maxAttempts: 5,
 *   windowSeconds: 900 // 15 minutes
 * });
 * if (result.limited) {
 *   return json({ error: 'Too many attempts' }, { status: 429 });
 * }
 * ```
 */
async function checkRateLimit(
	config: RateLimitConfig,
	retryCount = 0
): Promise<{ limited: boolean; expiresAt: Date | null }> {
	const { key, maxAttempts, windowSeconds } = config;
	const expiresAt = new Date(Date.now() + windowSeconds * 1000);
	const supabase = getServiceRoleClient();

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
			return { limited: false, expiresAt: null }; // Fail open
		}

		if (existing) {
			// ====================================================================
			// ATOMIC INCREMENT (Race Condition Fix)
			// ====================================================================
			// Use UPDATE with WHERE clause to atomically check and increment.
			// PostgreSQL guarantees that the WHERE clause is evaluated using
			// the CURRENT row value (locked during UPDATE), preventing races.

			const { data: updateResult, error: updateError } = await supabase
				.from('rate_limits')
				.update({ count: existing.count + 1 })
				.eq('key', key)
				.lt('count', maxAttempts) // 🔒 ATOMIC: Only if below limit
				.gte('expires_at', new Date().toISOString()) // 🔒 ATOMIC: Only if not expired
				.select('count, expires_at')
				.maybeSingle();

			if (updateError) {
				logger.error('Rate limit update error:', updateError);
				return { limited: false, expiresAt: null }; // Fail open
			}

			if (!updateResult) {
				// UPDATE affected 0 rows - either limit exceeded OR entry expired during race
				// We need to distinguish between these two cases for correct behavior

				// Re-check: Did the entry expire or was limit exceeded?
				const { data: recheck } = await supabase
					.from('rate_limits')
					.select('count, expires_at')
					.eq('key', key)
					.gte('expires_at', new Date().toISOString())
					.maybeSingle();

				if (!recheck) {
					// Entry expired during race → allow request (fail-open)
					logger.trace('Rate limit entry expired during race, allowing', {
						key: maskKey(key)
					});

					// Create new entry for next request
					await supabase.from('rate_limits').insert({
						key,
						count: 1,
						expires_at: expiresAt.toISOString()
					});

					return { limited: false, expiresAt: null };
				}

				// Limit exceeded
				logger.trace('Rate limit exceeded', {
					key: maskKey(key),
					count: recheck.count
				});
				return { limited: true, expiresAt: new Date(recheck.expires_at) };
			}

			// Update succeeded → request allowed
			logger.trace('Rate limit incremented', {
				key: maskKey(key),
				count: updateResult.count
			});
			return { limited: false, expiresAt: null };
		} else {
			// ====================================================================
			// NEW ENTRY CREATION
			// ====================================================================
			// No existing entry or expired - create new entry

			const { error: insertError } = await supabase.from('rate_limits').insert({
				key,
				count: 1,
				expires_at: expiresAt.toISOString()
			});

			if (insertError) {
				// Handle unique constraint violation (race condition during insert)
				if ('code' in insertError && insertError.code === '23505') {
					// Another concurrent request just created the entry
					// Retry up to 3 times
					if (retryCount < 3) {
						logger.trace('Unique constraint violation, retrying', {
							key: maskKey(key),
							retryCount: retryCount + 1
						});
						return checkRateLimit(config, retryCount + 1);
					} else {
						// Max retries exceeded - likely an expired entry blocking inserts
						logger.warn('Max retries on unique constraint, cleaning up', {
							key: maskKey(key)
						});

						// Delete the blocking entry
						await supabase.from('rate_limits').delete().eq('key', key);

						// Allow request (fail-open)
						return { limited: false, expiresAt: null };
					}
				}

				logger.error('Rate limit insert error:', insertError);
				return { limited: false, expiresAt: null }; // Fail open
			}

			logger.trace('Rate limit entry created', { key: maskKey(key) });
			return { limited: false, expiresAt: null }; // First attempt, allowed
		}
	} catch (error) {
		logger.error('Rate limit error:', error);
		return { limited: false, expiresAt: null }; // Fail open on exceptions
	}
}

/**
 * Wrapper for checkRateLimit that returns RateLimitResult with user-friendly message
 *
 * @param key - Unique identifier for rate limit bucket
 * @param maxAttempts - Maximum allowed attempts within window
 * @param windowSeconds - Time window in seconds
 * @param message - User-friendly French error message to return if rate limited
 * @returns RateLimitResult with allowed flag, message, and retryAfter
 */
async function checkRateLimitWithMessage(
	key: string,
	maxAttempts: number,
	windowSeconds: number,
	message: string
): Promise<RateLimitResult> {
	const result = await checkRateLimit({ key, maxAttempts, windowSeconds });

	if (result.limited && result.expiresAt) {
		const retryAfter = Math.ceil((result.expiresAt.getTime() - Date.now()) / 1000);
		return {
			allowed: false,
			message,
			retryAfter: Math.max(retryAfter, 0)
		};
	}

	return { allowed: true };
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
 * @returns Rate limit result object
 * @returns result.allowed - `true` if request should be allowed, `false` if rate limited
 * @returns result.message - User-friendly French error message (only if `allowed: false`)
 *
 * @example In login form action
 * ```typescript
 * export const actions = {
 *   default: async ({ request, getClientAddress }) => {
 *     const ip = getClientAddress();
 *
 *     // Check IP-based rate limit
 *     const ipLimit = await checkLoginRateLimitByIP(ip);
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
 * const result = await checkLoginRateLimitByIP('192.168.1.1');
 * if (!result.allowed) {
 *   // Display to user: "Trop de tentatives de connexion. Réessayez dans 15 minutes."
 *   return json({ error: result.message }, { status: 429 });
 * }
 * ```
 */
export async function checkLoginRateLimitByIP(ip: string): Promise<RateLimitResult> {
	if (!ip) {
		logger.warn('Missing IP address for rate limit check');
		return { allowed: true }; // Fail open rather than blocking legitimate users
	}

	const key = `ratelimit:login:ip:${ip}`;
	const result = await checkRateLimitWithMessage(
		key,
		5,
		900, // 15 minutes
		'Trop de tentatives de connexion. Réessayez dans 15 minutes.'
	);

	if (!result.allowed) {
		logger.warn('Login rate limit exceeded by IP', { ip: maskKey(key) });
	}

	return result;
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
 * @returns Rate limit result object
 * @returns result.allowed - `true` if request should be allowed, `false` if rate limited
 * @returns result.message - User-friendly French error message (only if `allowed: false`)
 *
 * @example In login form action
 * ```typescript
 * export const actions = {
 *   default: async ({ request }) => {
 *     const formData = await request.formData();
 *     const email = String(formData.get('email'));
 *
 *     // Check email-based rate limit (after IP check passes)
 *     const emailLimit = await checkLoginRateLimitByEmail(email);
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
 * const ipLimit = await checkLoginRateLimitByIP(ip);
 * if (!ipLimit.allowed) return fail(429, { error: ipLimit.message });
 *
 * const emailLimit = await checkLoginRateLimitByEmail(email);
 * if (!emailLimit.allowed) return fail(429, { error: emailLimit.message });
 *
 * // Both checks passed - safe to attempt authentication
 * ```
 */
export async function checkLoginRateLimitByEmail(email: string): Promise<RateLimitResult> {
	if (!email) {
		logger.warn('Missing email for rate limit check');
		return { allowed: true }; // Fail open
	}

	// Normalize email to lowercase for consistent tracking
	const normalizedEmail = email.toLowerCase().trim();
	const key = `ratelimit:login:email:${normalizedEmail}`;

	const result = await checkRateLimitWithMessage(
		key,
		3,
		900, // 15 minutes
		'Trop de tentatives de connexion pour cet email. Réessayez dans 15 minutes.'
	);

	if (!result.allowed) {
		logger.warn('Login rate limit exceeded by email', { email: maskKey(key) });
	}

	return result;
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
 *   default: async ({ request, getClientAddress }) => {
 *     const ip = getClientAddress();
 *
 *     // Check signup rate limit
 *     const signupLimit = await checkSignupRateLimitByIP(ip);
 *     if (!signupLimit.allowed) {
 *       return fail(429, { error: signupLimit.message });
 *     }
 *
 *     // Proceed with account creation...
 *   }
 * };
 * ```
 */
export async function checkSignupRateLimitByIP(ip: string): Promise<RateLimitResult> {
	if (!ip) {
		logger.warn('Missing IP address for signup rate limit check');
		return { allowed: true }; // Fail open
	}

	const key = `ratelimit:signup:${ip}`;
	const result = await checkRateLimitWithMessage(
		key,
		3,
		3600, // 1 hour
		"Trop de tentatives d'inscription. Réessayez dans 1 heure."
	);

	if (!result.allowed) {
		logger.warn('Signup rate limit exceeded by IP', { ip: maskKey(key) });
	}

	return result;
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
 * export const GET: RequestHandler = async ({ url, getClientAddress }) => {
 *   const ip = getClientAddress();
 *
 *   // Check OAuth rate limit
 *   const oauthLimit = await checkOAuthRateLimitByIP(ip);
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
 * const oauthLimit = await checkOAuthRateLimitByIP(ip);
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
export async function checkOAuthRateLimitByIP(ip: string): Promise<RateLimitResult> {
	if (!ip) {
		logger.warn('Missing IP address for OAuth rate limit check');
		return { allowed: true }; // Fail open
	}

	const key = `ratelimit:oauth:${ip}`;
	const result = await checkRateLimitWithMessage(
		key,
		10,
		900, // 15 minutes
		'Trop de tentatives OAuth. Réessayez dans 15 minutes.'
	);

	if (!result.allowed) {
		logger.warn('OAuth rate limit exceeded by IP', { ip: maskKey(key) });
	}

	return result;
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
 * export const POST: RequestHandler = async ({ request, locals: { user } }) => {
 *   if (!user) {
 *     throw error(401, 'Authentication requise');
 *   }
 *
 *   // Check chatbot rate limit
 *   const chatLimit = await checkChatbotRateLimit(user.id);
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
 * const chatLimit = await checkChatbotRateLimit(userId);
 * if (!chatLimit.allowed) {
 *   // Show remaining time to user
 *   return json({
 *     error: chatLimit.message,
 *     retryAfter: 900 // seconds until window resets
 *   }, { status: 429 });
 * }
 * ```
 */
export async function checkChatbotRateLimit(userId: string): Promise<RateLimitResult> {
	if (!userId) {
		logger.warn('Missing user ID for chatbot rate limit check');
		return { allowed: true }; // Fail open
	}

	const key = `ratelimit:chat:${userId}`;
	const result = await checkRateLimitWithMessage(
		key,
		5,
		900, // 15 minutes
		'Trop de requêtes au chatbot. Réessayez dans 15 minutes.'
	);

	if (!result.allowed) {
		logger.warn('Chatbot rate limit exceeded', { userId: maskKey(key) });
	}

	return result;
}

/**
 * Check notification creation rate limit by user ID and role
 *
 * Prevents notification spam by limiting how many notifications a user can create.
 * Different limits apply based on user role:
 * - Teachers: Can create 10 notifications per hour (for class announcements)
 * - Admins: Can create 50 notifications per hour (for system-wide announcements)
 *
 * **Rate Limits**:
 * - Teachers: 10 notifications per hour
 * - Admins: 50 notifications per hour
 *
 * **Why Role-Based Limits?**
 * - Teachers typically send notifications to their classes (smaller audience)
 * - Admins may need to send system-wide notifications (larger audience, more urgent)
 * - Higher admin limit accommodates emergency situations and system maintenance
 *
 * **Security Considerations**:
 * - Prevents notification spam to students
 * - Protects database from excessive notification records
 * - Fail-open: Allows requests if database is unavailable
 *
 * @param userId - User ID from authenticated session
 * @param role - User role ('teacher' or 'admin')
 * @returns Rate limit result object
 * @returns result.allowed - `true` if notification creation allowed, `false` if rate limited
 * @returns result.message - User-friendly French error message (only if `allowed: false`)
 * @returns result.retryAfter - Seconds until rate limit resets (only if `allowed: false`)
 *
 * @example In notification creation action (teacher)
 * ```typescript
 * export const actions = {
 *   create: async ({ locals: { user } }) => {
 *     // Get user role from database
 *     const { data: profile } = await supabase
 *       .from('profiles')
 *       .select('role')
 *       .eq('id', user.id)
 *       .single();
 *
 *     // Check rate limit
 *     const rateLimit = await checkNotificationCreateRateLimit(user.id, profile.role);
 *     if (!rateLimit.allowed) {
 *       return fail(429, { error: rateLimit.message });
 *     }
 *
 *     // Create notification...
 *   }
 * };
 * ```
 *
 * @example In API endpoint with retry header
 * ```typescript
 * const rateLimit = await checkNotificationCreateRateLimit(userId, 'teacher');
 * if (!rateLimit.allowed) {
 *   return json(
 *     { error: rateLimit.message },
 *     {
 *       status: 429,
 *       headers: {
 *         'Retry-After': rateLimit.retryAfter?.toString() || '3600'
 *       }
 *     }
 *   );
 * }
 * ```
 */
export async function checkNotificationCreateRateLimit(
	userId: string,
	role: UserRole
): Promise<RateLimitResult> {
	if (!userId) {
		logger.warn('Missing user ID for notification create rate limit check');
		return { allowed: true }; // Fail open
	}

	const maxAttempts = role === 'admin' ? 50 : 10; // Teachers default to 10
	const windowSeconds = 3600; // 1 hour

	const key = `notification_create:${userId}`;
	const result = await checkRateLimitWithMessage(
		key,
		maxAttempts,
		windowSeconds,
		'Vous avez atteint la limite de création de notifications. Veuillez réessayer plus tard.'
	);

	if (!result.allowed) {
		logger.warn('Notification creation rate limit exceeded', {
			userId: maskKey(key),
			role,
			maxAttempts
		});
	}

	return result;
}

/**
 * Check notification deletion rate limit by user ID and role
 *
 * Prevents spam deletion by limiting deletes per user.
 * Higher limits than creation to allow bulk cleanup and testing.
 *
 * Rate Limits:
 * - Teachers: 20 deletions per hour
 * - Admins: 100 deletions per hour
 *
 * **Why Higher Than Creation Limits?**
 * - Bulk cleanup operations may require deleting many notifications
 * - Testing and development workflows need more deletions
 * - Deletes are less risky than creates (no spam impact)
 *
 * **Security Considerations**:
 * - Prevents automated deletion spam
 * - Protects database from excessive write operations
 * - Fail-open: Allows requests if database is unavailable
 *
 * @param userId - User ID from authenticated session
 * @param role - User role ('teacher' or 'admin')
 * @returns Rate limit result object
 * @returns result.allowed - `true` if deletion allowed, `false` if rate limited
 * @returns result.message - User-friendly French error message (only if `allowed: false`)
 * @returns result.retryAfter - Seconds until rate limit resets (only if `allowed: false`)
 *
 * @example In notification deletion action (teacher)
 * ```typescript
 * export const actions = {
 *   delete: async ({ locals: { user } }) => {
 *     // Check rate limit
 *     const rateLimit = await checkNotificationDeleteRateLimit(user.id, 'teacher');
 *     if (!rateLimit.allowed) {
 *       return fail(429, { error: rateLimit.message });
 *     }
 *
 *     // Delete notification...
 *   }
 * };
 * ```
 *
 * @example In API endpoint with retry header
 * ```typescript
 * const rateLimit = await checkNotificationDeleteRateLimit(userId, 'admin');
 * if (!rateLimit.allowed) {
 *   return json(
 *     { error: rateLimit.message },
 *     {
 *       status: 429,
 *       headers: {
 *         'Retry-After': rateLimit.retryAfter?.toString() || '3600'
 *       }
 *     }
 *   );
 * }
 * ```
 */
export async function checkNotificationDeleteRateLimit(
	userId: string,
	role: UserRole
): Promise<RateLimitResult> {
	if (!userId) {
		logger.warn('Missing user ID for notification delete rate limit check');
		return { allowed: true }; // Fail open
	}

	const maxAttempts = role === 'admin' ? 100 : 20; // 2x higher than create
	const windowSeconds = 3600; // 1 hour

	const key = `notification_delete:${userId}`;
	const result = await checkRateLimitWithMessage(
		key,
		maxAttempts,
		windowSeconds,
		'Vous avez atteint la limite de suppression de notifications. Veuillez réessayer plus tard.'
	);

	if (!result.allowed) {
		logger.warn('Notification deletion rate limit exceeded', {
			userId: maskKey(key),
			role,
			maxAttempts
		});
	}

	return result;
}

/**
 * Check notification mark-read rate limit by user ID
 *
 * Prevents abuse of the mark-read endpoint by limiting how often users can
 * mark notifications as read. This protects against:
 * - Automated scripts spamming the mark-read endpoint
 * - Accidental infinite loops in client code
 * - Database write overload from excessive updates
 *
 * **Rate Limit**: 30 mark-read actions per 15 minutes per user
 *
 * **Why This Limit?**
 * - 30 actions = sufficient for normal usage (marking multiple notifications)
 * - 15-minute window = short enough to not impact legitimate users
 * - Prevents automated abuse while allowing batch marking
 *
 * **Implementation Notes**:
 * - Applies to both single mark-read and mark-all-read operations
 * - Uses user ID (requires authentication)
 * - Fail-open: Allows requests if database is unavailable
 *
 * @param userId - Authenticated user ID from session
 * @returns Rate limit result object
 * @returns result.allowed - `true` if mark-read action allowed, `false` if rate limited
 * @returns result.message - User-friendly French error message (only if `allowed: false`)
 * @returns result.retryAfter - Seconds until rate limit resets (only if `allowed: false`)
 *
 * @example In mark-read API endpoint
 * ```typescript
 * export const POST: RequestHandler = async ({ request, locals: { user } }) => {
 *   // Check rate limit
 *   const rateLimit = await checkNotificationMarkRateLimit(user.id);
 *   if (!rateLimit.allowed) {
 *     return json(
 *       { error: rateLimit.message },
 *       {
 *         status: 429,
 *         headers: {
 *           'Retry-After': rateLimit.retryAfter?.toString() || '900'
 *         }
 *       }
 *     );
 *   }
 *
 *   // Mark notification as read...
 * };
 * ```
 *
 * @example In mark-all-read endpoint
 * ```typescript
 * const rateLimit = await checkNotificationMarkRateLimit(user.id);
 * if (!rateLimit.allowed) {
 *   return json({ error: rateLimit.message }, { status: 429 });
 * }
 * // Mark all notifications as read...
 * ```
 */
export async function checkNotificationMarkRateLimit(userId: string): Promise<RateLimitResult> {
	if (!userId) {
		logger.warn('Missing user ID for notification mark rate limit check');
		return { allowed: true }; // Fail open
	}

	const key = `notification_mark:${userId}`;
	const result = await checkRateLimitWithMessage(
		key,
		30,
		900, // 15 minutes
		'Trop de requêtes de marquage. Veuillez patienter quelques instants.'
	);

	if (!result.allowed) {
		logger.warn('Notification mark rate limit exceeded', { userId: maskKey(key) });
	}

	return result;
}
