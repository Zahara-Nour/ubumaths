import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Redis } from '@upstash/redis';

/**
 * CRITICAL: Mock environment variables BEFORE importing cache module
 *
 * WHY ORDER MATTERS:
 * - cache.ts uses lazy initialization (getRedisClient() function)
 * - However, if env vars are missing when first called, client creation fails
 * - Tests must set env vars BEFORE importing, so they're available when test calls Redis functions
 *
 * TIMING:
 * 1. Set process.env vars (this code)
 * 2. Import cache module (module-level code runs, but Redis not yet initialized)
 * 3. Test calls getCached/checkRateLimit (getRedisClient() now finds env vars)
 *
 * If you move these lines after imports, tests will fail with "Redis configuration missing" error.
 */
process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test_token_12345';

// Mock the Redis client before importing cache module
vi.mock('@upstash/redis', () => ({
	Redis: vi.fn(() => mockRedis)
}));

// Mock $app/environment
vi.mock('$app/environment', () => ({
	dev: false // Set to false to avoid console logs in tests
}));

// Create mock Redis instance
const mockRedis: Partial<Redis> = {
	get: vi.fn(),
	setex: vi.fn(),
	keys: vi.fn(),
	del: vi.fn(),
	incr: vi.fn(),
	expire: vi.fn(),
	ttl: vi.fn()
};

// Import after mocking
const { getCached, invalidateCache, checkRateLimit, CACHE_KEYS, TTL } = await import(
	'$lib/server/cache'
);

describe('getCached', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns cached data on cache hit', async () => {
		const cachedData = { id: '123', name: 'Test' };
		vi.mocked(mockRedis.get).mockResolvedValueOnce(cachedData);

		const fallback = vi.fn();
		const result = await getCached('test:key', 60, fallback);

		expect(result).toEqual(cachedData);
		expect(mockRedis.get).toHaveBeenCalledWith('test:key');
		expect(fallback).not.toHaveBeenCalled();
	});

	it('calls fallback on cache miss and stores result', async () => {
		const freshData = { id: '456', name: 'Fresh' };
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);
		vi.mocked(mockRedis.setex).mockResolvedValueOnce('OK');

		const fallback = vi.fn().mockResolvedValueOnce(freshData);
		const result = await getCached('test:key', 60, fallback);

		expect(result).toEqual(freshData);
		expect(mockRedis.get).toHaveBeenCalledWith('test:key');
		expect(fallback).toHaveBeenCalledOnce();

		// Wait for fire-and-forget setex
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(mockRedis.setex).toHaveBeenCalledWith('test:key', 60, freshData);
	});

	it('uses fallback when Redis get throws error', async () => {
		const freshData = { id: '789', name: 'Fallback' };
		vi.mocked(mockRedis.get).mockRejectedValueOnce(new Error('Redis connection failed'));

		const fallback = vi.fn().mockResolvedValueOnce(freshData);
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await getCached('test:key', 60, fallback);

		expect(result).toEqual(freshData);
		expect(fallback).toHaveBeenCalledOnce();
		expect(consoleSpy).toHaveBeenCalledWith(
			'[Cache] Redis error, using fallback:',
			expect.any(Error)
		);

		consoleSpy.mockRestore();
	});

	it('does not throw when setex fails (fire-and-forget)', async () => {
		const freshData = { id: '999', name: 'Test' };
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);
		vi.mocked(mockRedis.setex).mockRejectedValueOnce(new Error('Set failed'));

		const fallback = vi.fn().mockResolvedValueOnce(freshData);
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await getCached('test:key', 60, fallback);

		expect(result).toEqual(freshData);
		expect(fallback).toHaveBeenCalledOnce();

		// Wait for fire-and-forget to execute
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(consoleSpy).toHaveBeenCalledWith('[Cache] Failed to set:', expect.any(Error));

		consoleSpy.mockRestore();
	});
});

describe('invalidateCache', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('deletes keys matching pattern', async () => {
		const matchingKeys = ['cache:assessment:123:results:false', 'cache:assessment:123:stats:false'];
		vi.mocked(mockRedis.keys).mockResolvedValueOnce(matchingKeys);
		vi.mocked(mockRedis.del).mockResolvedValueOnce(2);

		await invalidateCache('cache:assessment:123:*');

		expect(mockRedis.keys).toHaveBeenCalledWith('cache:assessment:123:*');
		expect(mockRedis.del).toHaveBeenCalledWith(...matchingKeys);
	});

	it('does nothing when no keys match pattern', async () => {
		vi.mocked(mockRedis.keys).mockResolvedValueOnce([]);

		await invalidateCache('cache:nonexistent:*');

		expect(mockRedis.keys).toHaveBeenCalledWith('cache:nonexistent:*');
		expect(mockRedis.del).not.toHaveBeenCalled();
	});

	it('handles Redis errors gracefully', async () => {
		vi.mocked(mockRedis.keys).mockRejectedValueOnce(new Error('Redis error'));

		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await invalidateCache('cache:test:*');

		expect(consoleSpy).toHaveBeenCalledWith('[Cache] Failed to invalidate:', expect.any(Error));
		consoleSpy.mockRestore();
	});
});

describe('checkRateLimit', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('allows first request and sets expiry', async () => {
		vi.mocked(mockRedis.incr).mockResolvedValueOnce(1);
		vi.mocked(mockRedis.expire).mockResolvedValueOnce(true);

		const result = await checkRateLimit('ratelimit:test:user1', 5, 900);

		expect(result).toEqual({
			allowed: true,
			remaining: 4
		});
		expect(mockRedis.incr).toHaveBeenCalledWith('ratelimit:test:user1');
		expect(mockRedis.expire).toHaveBeenCalledWith('ratelimit:test:user1', 900);
	});

	it('allows requests up to max attempts', async () => {
		vi.mocked(mockRedis.incr).mockResolvedValueOnce(3);

		const result = await checkRateLimit('ratelimit:test:user1', 5, 900);

		expect(result).toEqual({
			allowed: true,
			remaining: 2
		});
		expect(mockRedis.expire).not.toHaveBeenCalled(); // Only set on first request
	});

	it('blocks request after max attempts exceeded', async () => {
		vi.mocked(mockRedis.incr).mockResolvedValueOnce(6);
		vi.mocked(mockRedis.ttl).mockResolvedValueOnce(600);

		const result = await checkRateLimit('ratelimit:test:user1', 5, 900);

		expect(result).toEqual({
			allowed: false,
			remaining: 0,
			retryAfter: 600
		});
		expect(mockRedis.ttl).toHaveBeenCalledWith('ratelimit:test:user1');
	});

	it('blocks request exactly at max attempts', async () => {
		vi.mocked(mockRedis.incr).mockResolvedValueOnce(5);

		const result = await checkRateLimit('ratelimit:test:user1', 5, 900);

		expect(result).toEqual({
			allowed: true,
			remaining: 0
		});
	});

	it('handles negative remaining correctly', async () => {
		vi.mocked(mockRedis.incr).mockResolvedValueOnce(10);
		vi.mocked(mockRedis.ttl).mockResolvedValueOnce(300);

		const result = await checkRateLimit('ratelimit:test:user1', 5, 900);

		expect(result).toEqual({
			allowed: false,
			remaining: 0, // Should be 0, not -5
			retryAfter: 300
		});
	});

	it('fails open on Redis error (prevents DoS)', async () => {
		vi.mocked(mockRedis.incr).mockRejectedValueOnce(new Error('Redis connection failed'));

		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await checkRateLimit('ratelimit:test:user1', 5, 900);

		expect(result).toEqual({
			allowed: true,
			remaining: 5
		});
		expect(consoleSpy).toHaveBeenCalledWith(
			'[RateLimit] Redis error, failing open:',
			expect.any(Error)
		);

		consoleSpy.mockRestore();
	});

	it('resets counter after TTL expires (simulated)', async () => {
		// First request - counter is 1
		vi.mocked(mockRedis.incr).mockResolvedValueOnce(1);
		vi.mocked(mockRedis.expire).mockResolvedValueOnce(true);

		const result1 = await checkRateLimit('ratelimit:test:user2', 5, 900);

		expect(result1.allowed).toBe(true);
		expect(result1.remaining).toBe(4);

		// Simulate TTL expiry by resetting counter to 1
		vi.mocked(mockRedis.incr).mockResolvedValueOnce(1);

		const result2 = await checkRateLimit('ratelimit:test:user2', 5, 900);

		expect(result2.allowed).toBe(true);
		expect(result2.remaining).toBe(4);
		expect(mockRedis.expire).toHaveBeenCalledTimes(2); // Called twice (once per reset)
	});
});

describe('CACHE_KEYS', () => {
	it('generates correct assessment results key', () => {
		const key = CACHE_KEYS.ASSESSMENT_RESULTS('assessment-123', false);
		expect(key).toBe('cache:assessment:assessment-123:results:false');
	});

	it('generates correct assessment stats key', () => {
		const key = CACHE_KEYS.ASSESSMENT_STATS('assessment-456', true);
		expect(key).toBe('cache:assessment:assessment-456:stats:true');
	});

	it('generates correct teacher classes key', () => {
		const key = CACHE_KEYS.TEACHER_CLASSES('teacher-789', false);
		expect(key).toBe('cache:teacher:teacher-789:classes:false');
	});

	it('generates correct activity counts key', () => {
		const key = CACHE_KEYS.ACTIVITY_COUNTS('user-999');
		expect(key).toBe('cache:activity:user-999:counts');
	});

	it('generates correct rate limit keys', () => {
		expect(CACHE_KEYS.RATE_LIMIT_LOGIN_IP('192.168.1.1')).toBe('ratelimit:login:ip:192.168.1.1');
		expect(CACHE_KEYS.RATE_LIMIT_LOGIN_EMAIL('test@example.com')).toBe(
			'ratelimit:login:email:test@example.com'
		);
		expect(CACHE_KEYS.RATE_LIMIT_SIGNUP('192.168.1.1')).toBe('ratelimit:signup:192.168.1.1');
		expect(CACHE_KEYS.RATE_LIMIT_OAUTH('192.168.1.1')).toBe('ratelimit:oauth:192.168.1.1');
		expect(CACHE_KEYS.RATE_LIMIT_CHAT('user-123')).toBe('ratelimit:chat:user-123');
	});

	it('isolates test mode from production mode', () => {
		const prodKey = CACHE_KEYS.ASSESSMENT_RESULTS('123', false);
		const testKey = CACHE_KEYS.ASSESSMENT_RESULTS('123', true);

		expect(prodKey).not.toBe(testKey);
		expect(prodKey).toBe('cache:assessment:123:results:false');
		expect(testKey).toBe('cache:assessment:123:results:true');
	});
});

describe('TTL constants', () => {
	it('has correct TTL values', () => {
		expect(TTL.ASSESSMENT_RESULTS).toBe(300); // 5 minutes
		expect(TTL.DASHBOARD_DATA).toBe(60); // 1 minute
		expect(TTL.ACTIVITY_COUNTS).toBe(30); // 30 seconds
		expect(TTL.RATE_LIMIT_LOGIN).toBe(900); // 15 minutes
		expect(TTL.RATE_LIMIT_SIGNUP).toBe(3600); // 1 hour
	});

	it('TTL values are in logical order', () => {
		// Longer-lived caches should have higher TTL
		expect(TTL.RATE_LIMIT_SIGNUP).toBeGreaterThan(TTL.RATE_LIMIT_LOGIN);
		expect(TTL.ASSESSMENT_RESULTS).toBeGreaterThan(TTL.DASHBOARD_DATA);
		expect(TTL.DASHBOARD_DATA).toBeGreaterThan(TTL.ACTIVITY_COUNTS);
	});
});

describe('Integration scenarios', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('cache invalidation followed by getCached fetches fresh data', async () => {
		const key = CACHE_KEYS.ASSESSMENT_RESULTS('123', false);

		// Step 1: Invalidate cache
		vi.mocked(mockRedis.keys).mockResolvedValueOnce([key]);
		vi.mocked(mockRedis.del).mockResolvedValueOnce(1);
		await invalidateCache('cache:assessment:123:*');

		// Step 2: getCached should fetch fresh data (cache miss)
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);
		vi.mocked(mockRedis.setex).mockResolvedValueOnce('OK');

		const freshData = { id: '123', results: [] };
		const fallback = vi.fn().mockResolvedValueOnce(freshData);

		const result = await getCached(key, TTL.ASSESSMENT_RESULTS, fallback);

		expect(result).toEqual(freshData);
		expect(fallback).toHaveBeenCalledOnce();
	});

	it('rate limiting workflow', async () => {
		const key = CACHE_KEYS.RATE_LIMIT_LOGIN_IP('192.168.1.1');

		// Attempt 1-5: Should succeed
		for (let i = 1; i <= 5; i++) {
			vi.mocked(mockRedis.incr).mockResolvedValueOnce(i);
			if (i === 1) {
				vi.mocked(mockRedis.expire).mockResolvedValueOnce(true);
			}

			const result = await checkRateLimit(key, 5, 900);
			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(5 - i);
		}

		// Attempt 6: Should fail
		vi.mocked(mockRedis.incr).mockResolvedValueOnce(6);
		vi.mocked(mockRedis.ttl).mockResolvedValueOnce(850);

		const result = await checkRateLimit(key, 5, 900);
		expect(result.allowed).toBe(false);
		expect(result.retryAfter).toBe(850);
	});
});
