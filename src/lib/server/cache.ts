import { Redis } from '@upstash/redis';
import { dev } from '$app/environment';

/**
 * Redis client for Upstash (serverless-friendly REST API)
 *
 * IMPORTANT: Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env
 * Get credentials from: https://console.upstash.com/
 *
 * Free tier limits:
 * - 10K requests/day
 * - 256MB storage
 * - Command timeout: 1000ms
 *
 * LAZY INITIALIZATION (Critical for Environment Variables):
 *
 * The Redis client MUST be initialized on first use, not at module load time.
 *
 * WHY THIS MATTERS:
 * - When this module is imported, Vite hasn't loaded .env variables yet
 * - Module-level initialization would cause process.env.UPSTASH_REDIS_REST_URL to be undefined
 * - Lazy initialization defers client creation until after Vite loads env vars in vite.config.ts
 *
 * TIMING:
 * 1. Module imported (env vars not yet loaded)
 * 2. vite.config.ts loads .env via loadEnv() and assigns to process.env
 * 3. First Redis operation calls getRedisClient() (env vars now available)
 *
 * DO NOT change this pattern without updating vite.config.ts env loading strategy.
 * See: docs/troubleshooting/env-loading-fix.md for detailed explanation
 */
let redisClient: Redis | null = null;

/**
 * Get or initialize the Redis client (singleton pattern with lazy loading)
 *
 * This function implements lazy initialization to solve environment variable timing issues.
 *
 * @returns Redis client instance (creates on first call, reuses thereafter)
 * @throws Error if UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN are missing
 *
 * @example
 * // ✅ Correct: Called from within functions (after env vars loaded)
 * export async function getCached<T>(...) {
 *   const redis = getRedisClient(); // Env vars available here
 * }
 *
 * @example
 * // ❌ INCORRECT: Don't initialize at module level!
 * // const redis = new Redis({...}); // Env vars not loaded yet!
 * // let redisClient = getRedisClient(); // Called during import!
 */
function getRedisClient(): Redis {
	if (!redisClient) {
		const url = process.env.UPSTASH_REDIS_REST_URL;
		const token = process.env.UPSTASH_REDIS_REST_TOKEN;

		if (!url || !token) {
			throw new Error(
				'Redis configuration missing. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env'
			);
		}

		redisClient = new Redis({ url, token });
		if (dev) console.log('[Redis][Tier-1] ✅ Initialized (Upstash REST)');
	}
	return redisClient;
}

/**
 * IMPORTANT GOTCHAS:
 *
 * 1. Don't initialize Redis at module level:
 *    ❌ const redis = new Redis({...}); // Env vars not loaded yet!
 *    ✅ Use getRedisClient() inside functions
 *
 * 2. Environment variables must be configured:
 *    - Development: Set in .env file (loaded by vite.config.ts)
 *    - Production: Set in deployment platform (Vercel env vars)
 *    - Tests: Set in process.env before importing (see cache.test.ts)
 *
 * 3. Related files:
 *    - vite.config.ts: Loads .env into process.env for dev/build
 *    - tests/unit/cache.test.ts: Shows proper test setup
 *    - docs/troubleshooting/env-loading-fix.md: Full technical explanation
 */

/**
 * Cache TTL (Time To Live) constants in seconds
 *
 * Design principles:
 * - Longer TTL for rarely-changing data (assessment results, school data)
 * - Shorter TTL for frequently-updated data (activity counts, dashboard data)
 * - Balance between freshness and database load reduction
 */
export const TTL = {
	/** Assessment results - 5 minutes (rarely modified after completion) */
	ASSESSMENT_RESULTS: 300,

	/** Dashboard data - 1 minute (frequently modified during active use) */
	DASHBOARD_DATA: 60,

	/** Activity counts - 30 seconds (short TTL for manual refresh responsiveness) */
	// ACTIVITY_COUNTS: 30,
	ACTIVITY_COUNTS: 30000,

	/** Student profile data - 10 minutes (names, avatars change infrequently) */
	STUDENTS: 600,

	/** Gidouilles data - 5 minutes (updated more frequently than profiles) */
	GIDOUILLES: 300,

	/** Warnings data - 3 minutes (updated frequently during active periods) */
	WARNINGS: 180,

	/** School timetable data - 1 hour (changes rarely) */
	SCHOOL_DATA: 3600,

	/** Question templates - 10 minutes (templates published occasionally) */
	TEMPLATES: 600,

	/** Rate limit: Login attempts - 15 minutes */
	RATE_LIMIT_LOGIN: 900,

	/** Rate limit: Signup attempts - 1 hour */
	RATE_LIMIT_SIGNUP: 3600
} as const;

/**
 * Cache key generators with namespacing
 *
 * Format: {type}:{entity}:{id}:{subtype}:{testMode}
 *
 * Benefits:
 * - Pattern-based invalidation (e.g., 'cache:assessment:123:*')
 * - Clear separation of concerns
 * - Test mode isolation
 */
export const CACHE_KEYS = {
	/** Assessment results by assessment ID and test mode */
	ASSESSMENT_RESULTS: (assessmentId: string, isTestMode: boolean) =>
		`cache:assessment:${assessmentId}:results:${isTestMode}`,

	/** Assessment statistics by assessment ID and test mode */
	ASSESSMENT_STATS: (assessmentId: string, isTestMode: boolean) =>
		`cache:assessment:${assessmentId}:stats:${isTestMode}`,

	/** Teacher classes by teacher ID and test mode */
	TEACHER_CLASSES: (teacherId: string, isTestMode: boolean) =>
		`cache:teacher:${teacherId}:classes:${isTestMode}`,

	/** Activity counts by user ID */
	ACTIVITY_COUNTS: (userId: string) => `cache:activity:${userId}:counts`,

	/** Teacher students for specific class (NEW) */
	TEACHER_STUDENTS: (teacherId: string, classId: string, isTestMode: boolean) =>
		`students:teacher:${teacherId}:class:${classId}:${isTestMode ? 'test' : 'real'}`,

	/** Teacher students for all classes (NEW) */
	TEACHER_ALL_CLASSES: (teacherId: string, isTestMode: boolean) =>
		`students:teacher:${teacherId}:all:${isTestMode ? 'test' : 'real'}`,

	/** Gidouilles for a class (NEW) */
	CLASS_GIDOUILLES: (classId: string, isTestMode: boolean) =>
		`gidouilles:class:${classId}:${isTestMode ? 'test' : 'real'}`,

	/** Warnings for a class and period (NEW) */
	CLASS_WARNINGS: (classId: string, periodId: string, isTestMode: boolean) =>
		`warnings:class:${classId}:period:${periodId}:${isTestMode ? 'test' : 'real'}`,

	/** School data by school ID */
	SCHOOL_DATA: (schoolId: string) => `cache:school:${schoolId}:data`,

	/** Published question templates (global - no user/school scope) */
	TEMPLATES_PUBLISHED: () => 'cache:templates:published',

	/** Rate limit: Login attempts by IP address */
	RATE_LIMIT_LOGIN_IP: (ip: string) => `ratelimit:login:ip:${ip}`,

	/** Rate limit: Login attempts by email address */
	RATE_LIMIT_LOGIN_EMAIL: (email: string) => `ratelimit:login:email:${email}`,

	/** Rate limit: Signup attempts by IP address */
	RATE_LIMIT_SIGNUP: (ip: string) => `ratelimit:signup:${ip}`,

	/** Rate limit: OAuth attempts by IP address */
	RATE_LIMIT_OAUTH: (ip: string) => `ratelimit:oauth:${ip}`,

	/** Rate limit: Chat requests by user ID */
	RATE_LIMIT_CHAT: (userId: string) => `ratelimit:chat:${userId}`
} as const;

/**
 * Generic Redis cache wrapper with automatic logging
 *
 * Measures and logs:
 * - Redis operation timing (cache lookup)
 * - Database fetch timing (on cache miss)
 *
 * Logging format: [functionName][Redis][Tier-1] or [functionName][DB]
 *
 * @param key - Redis key to cache under
 * @param ttl - Time to live in seconds
 * @param fallback - Function to fetch fresh data if cache miss
 * @param functionName - Caller name for log tracking (default: 'getCached')
 * @returns Cached or fresh data
 *
 * @example
 * const results = await getCached(
 *   CACHE_KEYS.ASSESSMENT_RESULTS('123', false),
 *   TTL.ASSESSMENT_RESULTS,
 *   () => fetchAssessmentResults('123'),
 *   'getAssessmentResults'
 * );
 */
export async function getCached<T>(
	key: string,
	ttl: number,
	fallback: () => Promise<T>,
	functionName: string = 'getCached'
): Promise<T> {
	try {
		const redis = getRedisClient();

		// Try to get from cache
		const start = performance.now();
		const cached = await redis.get<T>(key);
		const redisDuration = Math.round(performance.now() - start);

		if (cached !== null) {
			if (dev) logCacheMetrics('hit', key, functionName, redisDuration);
			return cached;
		}

		if (dev) logCacheMetrics('miss', key, functionName, redisDuration);

		// Cache miss - fetch fresh data
		// Note: DB fetch timing is logged by individual cache modules with request-specific details
		const fresh = await fallback();

		// Store in cache (fire-and-forget to not block response)
		redis.setex(key, ttl, fresh).catch((err) => {
			console.error('[Cache] Failed to set:', err);
		});

		return fresh;
	} catch (err) {
		// Redis error - fallback to direct fetch
		console.error('[Cache] Redis error, using fallback:', err);
		return fallback();
	}
}

/**
 * Invalidate cache keys matching a pattern
 *
 * Uses Redis KEYS command (safe in Upstash REST API, low key count)
 * Pattern syntax: '*' matches any characters
 *
 * @param pattern - Key pattern (e.g., 'cache:assessment:123:*')
 *
 * @example
 * // Invalidate all assessment 123 caches
 * await invalidateCache('cache:assessment:123:*');
 *
 * // Invalidate all activity counts
 * await invalidateCache('cache:activity:*');
 */
export async function invalidateCache(pattern: string): Promise<void> {
	try {
		const redis = getRedisClient();
		const keys = await redis.keys(pattern);

		if (keys.length > 0) {
			await redis.del(...keys);
			if (dev && process.env.ENABLE_CACHE_LOGS === 'true') {
				console.log(
					`[invalidateCache][Redis][Tier-1] 🗑️ INVALIDATE (${keys.length} keys matching ${pattern})`
				);
			}
		}
	} catch (err) {
		console.error('[Cache] Failed to invalidate:', err);
	}
}

/**
 * Rate limiting with Redis atomic counters
 *
 * Features:
 * - Atomic increment (thread-safe)
 * - Sliding window (TTL-based)
 * - Fail-open on Redis errors (prevents DoS)
 * - Returns retry-after header value when blocked
 *
 * @param key - Rate limit key (use CACHE_KEYS.RATE_LIMIT_*)
 * @param maxAttempts - Maximum attempts allowed in window
 * @param windowSeconds - Time window in seconds
 * @returns Rate limit status with remaining attempts and retry-after
 *
 * @example
 * const { allowed, remaining, retryAfter } = await checkRateLimit(
 *   CACHE_KEYS.RATE_LIMIT_LOGIN_IP(clientIp),
 *   5,  // max 5 attempts
 *   900 // in 15 minutes
 * );
 *
 * if (!allowed) {
 *   throw error(429, {
 *     message: `Too many attempts. Try again in ${retryAfter} seconds`,
 *     retryAfter
 *   });
 * }
 */
export async function checkRateLimit(
	key: string,
	maxAttempts: number,
	windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
	try {
		const redis = getRedisClient();

		// Increment counter atomically
		const count = await redis.incr(key);

		// Set expiry on first attempt
		if (count === 1) {
			await redis.expire(key, windowSeconds);
		}

		const remaining = Math.max(0, maxAttempts - count);
		const allowed = count <= maxAttempts;

		if (!allowed) {
			// Get TTL for retry-after header
			const ttl = await redis.ttl(key);
			return { allowed: false, remaining: 0, retryAfter: ttl };
		}

		return { allowed: true, remaining };
	} catch (err) {
		console.error('[RateLimit] Redis error, failing open:', err);
		// Fail open (allow request) on Redis errors to prevent DoS
		return { allowed: true, remaining: maxAttempts };
	}
}

/**
 * Log cache metrics in standardized format
 *
 * Format: [functionName][Redis][Tier-1] STATUS (timing) details
 *
 * @param operation - Cache operation type (hit, miss, invalidate)
 * @param key - Cache key being accessed
 * @param functionName - Name of the calling function (e.g., 'getCachedSchool')
 * @param duration - Optional operation duration in milliseconds
 *
 * @example
 * // Cache hit
 * logCacheMetrics('hit', 'cache:school:123', 'getCachedSchool', 45);
 * // Output: [getCachedSchool][Redis][Tier-1] 🎯 HIT (45ms) cache:school:123
 *
 * // Cache miss
 * logCacheMetrics('miss', 'cache:school:123', 'getCachedSchool', 12);
 * // Output: [getCachedSchool][Redis][Tier-1] ❌ MISS (12ms) → fetching from DB
 */
export function logCacheMetrics(
	operation: 'hit' | 'miss' | 'invalidate',
	key: string,
	functionName: string,
	duration?: number
) {
	// Only log if explicitly enabled via environment variable
	// Set ENABLE_CACHE_LOGS=true in .env to see cache metrics
	if (!dev || process.env.ENABLE_CACHE_LOGS !== 'true') return;

	const status =
		operation === 'hit' ? '🎯 HIT' : operation === 'miss' ? '❌ MISS' : '🗑️ INVALIDATE';
	const timing = duration !== undefined ? ` (${duration}ms)` : '';
	const suffix = operation === 'miss' ? ' → fetching from DB' : '';

	console.log(`[${functionName}][Redis][Tier-1] ${status}${timing} ${key}${suffix}`);
}
