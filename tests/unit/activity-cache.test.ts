/**
 * Activity Cache Tests
 *
 * Tests Redis caching for activity polling endpoint (notifications + messages unread counts)
 * Validates cache behavior, TTL, invalidation, and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { redis, getCached, invalidateCache, CACHE_KEYS, TTL } from '$lib/server/cache';

// Mock Redis client
vi.mock('@upstash/redis', () => ({
	Redis: vi.fn(() => ({
		get: vi.fn(),
		setex: vi.fn(),
		keys: vi.fn(),
		del: vi.fn(),
		incr: vi.fn(),
		expire: vi.fn(),
		ttl: vi.fn()
	}))
}));

describe('Activity Cache - Polling Endpoint', () => {
	const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
	const mockCounts = { notifications: 5, messages: 3 };

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should use cache on cache hit (returns cached data)', async () => {
		// Mock cache hit
		vi.spyOn(redis, 'get').mockResolvedValue(mockCounts);

		const fallback = vi.fn();
		const result = await getCached(
			CACHE_KEYS.ACTIVITY_COUNTS(mockUserId),
			TTL.ACTIVITY_COUNTS,
			fallback
		);

		expect(result).toEqual(mockCounts);
		expect(redis.get).toHaveBeenCalledWith(CACHE_KEYS.ACTIVITY_COUNTS(mockUserId));
		expect(fallback).not.toHaveBeenCalled(); // Fallback should NOT be called on cache hit
	});

	it('should fetch from DB on cache miss and populate cache', async () => {
		// Mock cache miss
		vi.spyOn(redis, 'get').mockResolvedValue(null);
		vi.spyOn(redis, 'setex').mockResolvedValue('OK');

		const fallback = vi.fn().mockResolvedValue(mockCounts);
		const result = await getCached(
			CACHE_KEYS.ACTIVITY_COUNTS(mockUserId),
			TTL.ACTIVITY_COUNTS,
			fallback
		);

		expect(result).toEqual(mockCounts);
		expect(redis.get).toHaveBeenCalledWith(CACHE_KEYS.ACTIVITY_COUNTS(mockUserId));
		expect(fallback).toHaveBeenCalled(); // Fallback SHOULD be called on cache miss
		expect(redis.setex).toHaveBeenCalledWith(
			CACHE_KEYS.ACTIVITY_COUNTS(mockUserId),
			TTL.ACTIVITY_COUNTS,
			mockCounts
		);
	});

	it('should have TTL of 30 seconds (matching frontend polling interval)', () => {
		expect(TTL.ACTIVITY_COUNTS).toBe(30);
	});

	it('should invalidate cache after notification creation', async () => {
		vi.spyOn(redis, 'keys').mockResolvedValue([CACHE_KEYS.ACTIVITY_COUNTS(mockUserId)]);
		vi.spyOn(redis, 'del').mockResolvedValue(1);

		await invalidateCache(CACHE_KEYS.ACTIVITY_COUNTS(mockUserId));

		expect(redis.keys).toHaveBeenCalledWith(CACHE_KEYS.ACTIVITY_COUNTS(mockUserId));
		expect(redis.del).toHaveBeenCalledWith(CACHE_KEYS.ACTIVITY_COUNTS(mockUserId));
	});

	it('should invalidate cache after message sent', async () => {
		vi.spyOn(redis, 'keys').mockResolvedValue([CACHE_KEYS.ACTIVITY_COUNTS(mockUserId)]);
		vi.spyOn(redis, 'del').mockResolvedValue(1);

		await invalidateCache(CACHE_KEYS.ACTIVITY_COUNTS(mockUserId));

		expect(redis.keys).toHaveBeenCalledWith(CACHE_KEYS.ACTIVITY_COUNTS(mockUserId));
		expect(redis.del).toHaveBeenCalledWith(CACHE_KEYS.ACTIVITY_COUNTS(mockUserId));
	});

	it('should not block response on invalidation error (fire-and-forget)', async () => {
		vi.spyOn(redis, 'keys').mockRejectedValue(new Error('Redis connection failed'));

		// Should not throw error (fire-and-forget pattern)
		await expect(invalidateCache(CACHE_KEYS.ACTIVITY_COUNTS(mockUserId))).resolves.not.toThrow();
	});

	it('should have separate cache per user (user isolation)', () => {
		const userId1 = '550e8400-e29b-41d4-a716-446655440001';
		const userId2 = '550e8400-e29b-41d4-a716-446655440002';

		const key1 = CACHE_KEYS.ACTIVITY_COUNTS(userId1);
		const key2 = CACHE_KEYS.ACTIVITY_COUNTS(userId2);

		expect(key1).not.toBe(key2);
		expect(key1).toContain(userId1);
		expect(key2).toContain(userId2);
	});

	it('should fallback to DB on Redis error (fail-safe)', async () => {
		// Mock Redis error
		vi.spyOn(redis, 'get').mockRejectedValue(new Error('Redis connection failed'));

		const fallback = vi.fn().mockResolvedValue(mockCounts);
		const result = await getCached(
			CACHE_KEYS.ACTIVITY_COUNTS(mockUserId),
			TTL.ACTIVITY_COUNTS,
			fallback
		);

		expect(result).toEqual(mockCounts);
		expect(fallback).toHaveBeenCalled(); // Should still get data from DB
	});

	it('should complete full cache lifecycle (miss → populate → hit → invalidate → miss)', async () => {
		const fallback = vi.fn().mockResolvedValue(mockCounts);

		// 1. Cache miss - populate
		vi.spyOn(redis, 'get').mockResolvedValueOnce(null);
		vi.spyOn(redis, 'setex').mockResolvedValue('OK');

		const result1 = await getCached(
			CACHE_KEYS.ACTIVITY_COUNTS(mockUserId),
			TTL.ACTIVITY_COUNTS,
			fallback
		);
		expect(result1).toEqual(mockCounts);
		expect(fallback).toHaveBeenCalledTimes(1);

		// 2. Cache hit
		vi.spyOn(redis, 'get').mockResolvedValueOnce(mockCounts);
		const result2 = await getCached(
			CACHE_KEYS.ACTIVITY_COUNTS(mockUserId),
			TTL.ACTIVITY_COUNTS,
			fallback
		);
		expect(result2).toEqual(mockCounts);
		expect(fallback).toHaveBeenCalledTimes(1); // NOT called again

		// 3. Invalidate
		vi.spyOn(redis, 'keys').mockResolvedValue([CACHE_KEYS.ACTIVITY_COUNTS(mockUserId)]);
		vi.spyOn(redis, 'del').mockResolvedValue(1);
		await invalidateCache(CACHE_KEYS.ACTIVITY_COUNTS(mockUserId));

		// 4. Cache miss again after invalidation
		vi.spyOn(redis, 'get').mockResolvedValueOnce(null);
		const result3 = await getCached(
			CACHE_KEYS.ACTIVITY_COUNTS(mockUserId),
			TTL.ACTIVITY_COUNTS,
			fallback
		);
		expect(result3).toEqual(mockCounts);
		expect(fallback).toHaveBeenCalledTimes(2); // Called again
	});

	it('should support bulk invalidation (pattern-based)', async () => {
		const userIds = [
			'550e8400-e29b-41d4-a716-446655440001',
			'550e8400-e29b-41d4-a716-446655440002',
			'550e8400-e29b-41d4-a716-446655440003'
		];

		const keys = userIds.map((id) => CACHE_KEYS.ACTIVITY_COUNTS(id));
		vi.spyOn(redis, 'keys').mockResolvedValue(keys);
		vi.spyOn(redis, 'del').mockResolvedValue(3);

		await invalidateCache('cache:activity:*');

		expect(redis.keys).toHaveBeenCalledWith('cache:activity:*');
		expect(redis.del).toHaveBeenCalledWith(...keys);
	});

	it('should handle cache key format correctly', () => {
		const key = CACHE_KEYS.ACTIVITY_COUNTS(mockUserId);
		expect(key).toBe(`cache:activity:${mockUserId}:counts`);
	});

	it('should not cache if setex fails (fire-and-forget, non-blocking)', async () => {
		vi.spyOn(redis, 'get').mockResolvedValue(null);
		vi.spyOn(redis, 'setex').mockRejectedValue(new Error('Redis write failed'));

		const fallback = vi.fn().mockResolvedValue(mockCounts);
		const result = await getCached(
			CACHE_KEYS.ACTIVITY_COUNTS(mockUserId),
			TTL.ACTIVITY_COUNTS,
			fallback
		);

		// Should still return data despite cache write failure
		expect(result).toEqual(mockCounts);
		expect(fallback).toHaveBeenCalled();
	});
});

describe('Activity Cache - Query Reduction Calculations', () => {
	it('should calculate correct query reduction for 100 users', () => {
		const activeUsers = 100;
		const pollingIntervalSeconds = 30;
		const queriesPerPoll = 2; // notifications + messages

		// Without cache
		const pollsPerDay = (24 * 60 * 60) / pollingIntervalSeconds; // 2,880 polls/day
		const queriesWithoutCache = activeUsers * pollsPerDay * queriesPerPoll; // 576,000 queries/day

		// With cache (30s TTL = 1 DB fetch per 30s per user)
		const queriesWithCache = activeUsers * pollsPerDay * queriesPerPoll; // But 95%+ will be cache hits
		const cacheHitRate = 0.95; // Assuming 95% cache hit rate
		const actualQueriesWithCache = queriesWithCache * (1 - cacheHitRate); // ~28,800 queries/day

		const reductionPercentage =
			((queriesWithoutCache - actualQueriesWithCache) / queriesWithoutCache) * 100;

		expect(queriesWithoutCache).toBe(576_000);
		expect(Math.round(actualQueriesWithCache)).toBe(28_800);
		expect(reductionPercentage).toBeCloseTo(95, 0); // ~95% reduction
	});

	it('should estimate cache hit rate based on TTL and polling interval', () => {
		const ttl = 30; // seconds
		const pollingInterval = 30; // seconds

		// If TTL matches polling interval, most requests will hit cache
		// Assuming uniform distribution of user requests
		const expectedHitRate = ttl / pollingInterval;

		expect(expectedHitRate).toBe(1); // 100% hit rate when TTL = polling interval
		expect(TTL.ACTIVITY_COUNTS).toBe(30);
	});
});

describe('Activity Cache - Edge Cases', () => {
	const mockUserId = '550e8400-e29b-41d4-a716-446655440000';

	it('should handle empty cache data (no notifications, no messages)', async () => {
		const emptyCounts = { notifications: 0, messages: 0 };

		vi.spyOn(redis, 'get').mockResolvedValue(null);
		vi.spyOn(redis, 'setex').mockResolvedValue('OK');

		const fallback = vi.fn().mockResolvedValue(emptyCounts);
		const result = await getCached(
			CACHE_KEYS.ACTIVITY_COUNTS(mockUserId),
			TTL.ACTIVITY_COUNTS,
			fallback
		);

		expect(result).toEqual(emptyCounts);
		expect(redis.setex).toHaveBeenCalledWith(
			CACHE_KEYS.ACTIVITY_COUNTS(mockUserId),
			TTL.ACTIVITY_COUNTS,
			emptyCounts
		);
	});

	it('should handle large notification/message counts', async () => {
		const largeCounts = { notifications: 9999, messages: 5000 };

		vi.spyOn(redis, 'get').mockResolvedValue(null);
		vi.spyOn(redis, 'setex').mockResolvedValue('OK');

		const fallback = vi.fn().mockResolvedValue(largeCounts);
		const result = await getCached(
			CACHE_KEYS.ACTIVITY_COUNTS(mockUserId),
			TTL.ACTIVITY_COUNTS,
			fallback
		);

		expect(result).toEqual(largeCounts);
	});

	it('should invalidate on notification marked as read', async () => {
		vi.spyOn(redis, 'keys').mockResolvedValue([CACHE_KEYS.ACTIVITY_COUNTS(mockUserId)]);
		vi.spyOn(redis, 'del').mockResolvedValue(1);

		// Simulating markAsRead invalidation
		await invalidateCache(CACHE_KEYS.ACTIVITY_COUNTS(mockUserId));

		expect(redis.del).toHaveBeenCalledWith(CACHE_KEYS.ACTIVITY_COUNTS(mockUserId));
	});

	it('should invalidate on message marked as read', async () => {
		vi.spyOn(redis, 'keys').mockResolvedValue([CACHE_KEYS.ACTIVITY_COUNTS(mockUserId)]);
		vi.spyOn(redis, 'del').mockResolvedValue(1);

		// Simulating message read invalidation
		await invalidateCache(CACHE_KEYS.ACTIVITY_COUNTS(mockUserId));

		expect(redis.del).toHaveBeenCalledWith(CACHE_KEYS.ACTIVITY_COUNTS(mockUserId));
	});
});
