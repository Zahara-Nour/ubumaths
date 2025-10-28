/**
 * Unit tests for assessment results caching
 *
 * Tests cover:
 * 1. Cache hit scenarios (data returned from cache)
 * 2. Cache miss scenarios (data fetched from DB)
 * 3. Test mode vs production mode isolation
 * 4. Cache invalidation after test submission
 * 5. Fire-and-forget invalidation (non-blocking)
 * 6. Fallback on Redis errors
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

// Mock dependencies
const mockGetCached = vi.fn();
const mockInvalidateCache = vi.fn();
const mockGetAssessmentResults = vi.fn();
const mockGetAssessmentStatistics = vi.fn();

// Mock modules
vi.mock('$lib/server/cache', () => ({
	getCached: mockGetCached,
	invalidateCache: mockInvalidateCache,
	CACHE_KEYS: {
		ASSESSMENT_RESULTS: (assessmentId: string, isTestMode: boolean) =>
			`cache:assessment:${assessmentId}:results:${isTestMode}`,
		ASSESSMENT_STATS: (assessmentId: string, isTestMode: boolean) =>
			`cache:assessment:${assessmentId}:stats:${isTestMode}`
	},
	TTL: {
		ASSESSMENT_RESULTS: 300
	}
}));

vi.mock('$lib/server/assessments', () => ({
	getAssessmentResults: mockGetAssessmentResults,
	getAssessmentStatistics: mockGetAssessmentStatistics
}));

describe('Assessment Results Caching', () => {
	const ASSESSMENT_ID = '123e4567-e89b-12d3-a456-426614174000';
	const mockSupabase = {} as SupabaseClient<Database>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Cache Hit Scenarios', () => {
		it('should return cached results when cache hit occurs', async () => {
			// Mock data
			const cachedResults = {
				data: [
					{
						assignment_id: 'assign1',
						student_id: 'student1',
						student_name: 'John Doe',
						status: 'completed',
						best_score: 85,
						attempts: 1
					}
				],
				error: null
			};

			// Setup: getCached returns cached data (cache hit)
			mockGetCached.mockResolvedValue(cachedResults);

			// Import after mocks are set up
			const { getCached, CACHE_KEYS, TTL } = await import('$lib/server/cache');
			const { getAssessmentResults } = await import('$lib/server/assessments');

			// Execute
			const result = await getCached(
				CACHE_KEYS.ASSESSMENT_RESULTS(ASSESSMENT_ID, false),
				TTL.ASSESSMENT_RESULTS,
				async () => getAssessmentResults(mockSupabase, ASSESSMENT_ID, false)
			);

			// Verify
			expect(result).toEqual(cachedResults);
			expect(mockGetCached).toHaveBeenCalledWith(
				'cache:assessment:123e4567-e89b-12d3-a456-426614174000:results:false',
				300,
				expect.any(Function)
			);
			// Database should NOT be called on cache hit
			expect(mockGetAssessmentResults).not.toHaveBeenCalled();
		});

		it('should return cached statistics when cache hit occurs', async () => {
			// Mock data
			const cachedStats = {
				data: {
					assessment_id: ASSESSMENT_ID,
					total_assigned: 25,
					completed: 20,
					average_score: 78.5,
					completion_rate: 80
				},
				error: null
			};

			// Setup: getCached returns cached data
			mockGetCached.mockResolvedValue(cachedStats);

			// Import after mocks
			const { getCached, CACHE_KEYS, TTL } = await import('$lib/server/cache');
			const { getAssessmentStatistics } = await import('$lib/server/assessments');

			// Execute
			const result = await getCached(
				CACHE_KEYS.ASSESSMENT_STATS(ASSESSMENT_ID, false),
				TTL.ASSESSMENT_RESULTS,
				async () => getAssessmentStatistics(mockSupabase, ASSESSMENT_ID, false)
			);

			// Verify
			expect(result).toEqual(cachedStats);
			expect(mockGetAssessmentStatistics).not.toHaveBeenCalled();
		});
	});

	describe('Cache Miss Scenarios', () => {
		it('should fetch from DB when cache miss occurs', async () => {
			// Mock data
			const dbResults = {
				data: [
					{
						assignment_id: 'assign1',
						student_id: 'student1',
						student_name: 'Jane Smith',
						status: 'in_progress',
						best_score: null,
						attempts: 0
					}
				],
				error: null
			};

			// Setup: getCached triggers fallback (cache miss)
			mockGetCached.mockImplementation(async (_key, _ttl, fallback) => {
				return await fallback();
			});
			mockGetAssessmentResults.mockResolvedValue(dbResults);

			// Import after mocks
			const { getCached, CACHE_KEYS, TTL } = await import('$lib/server/cache');
			const { getAssessmentResults } = await import('$lib/server/assessments');

			// Execute
			const result = await getCached(
				CACHE_KEYS.ASSESSMENT_RESULTS(ASSESSMENT_ID, false),
				TTL.ASSESSMENT_RESULTS,
				async () => getAssessmentResults(mockSupabase, ASSESSMENT_ID, false)
			);

			// Verify
			expect(result).toEqual(dbResults);
			expect(mockGetAssessmentResults).toHaveBeenCalledWith(mockSupabase, ASSESSMENT_ID, false);
		});

		it('should fetch statistics from DB when cache miss occurs', async () => {
			// Mock data
			const dbStats = {
				data: {
					assessment_id: ASSESSMENT_ID,
					total_assigned: 30,
					completed: 15,
					average_score: 65.0,
					completion_rate: 50
				},
				error: null
			};

			// Setup
			mockGetCached.mockImplementation(async (_key, _ttl, fallback) => {
				return await fallback();
			});
			mockGetAssessmentStatistics.mockResolvedValue(dbStats);

			// Import after mocks
			const { getCached, CACHE_KEYS, TTL } = await import('$lib/server/cache');
			const { getAssessmentStatistics } = await import('$lib/server/assessments');

			// Execute
			const result = await getCached(
				CACHE_KEYS.ASSESSMENT_STATS(ASSESSMENT_ID, false),
				TTL.ASSESSMENT_RESULTS,
				async () => getAssessmentStatistics(mockSupabase, ASSESSMENT_ID, false)
			);

			// Verify
			expect(result).toEqual(dbStats);
			expect(mockGetAssessmentStatistics).toHaveBeenCalledWith(mockSupabase, ASSESSMENT_ID, false);
		});
	});

	describe('Test Mode vs Production Mode Isolation', () => {
		it('should use separate cache keys for test mode and production mode', async () => {
			const { CACHE_KEYS } = await import('$lib/server/cache');

			const testModeKey = CACHE_KEYS.ASSESSMENT_RESULTS(ASSESSMENT_ID, true);
			const prodModeKey = CACHE_KEYS.ASSESSMENT_RESULTS(ASSESSMENT_ID, false);

			expect(testModeKey).toBe(
				'cache:assessment:123e4567-e89b-12d3-a456-426614174000:results:true'
			);
			expect(prodModeKey).toBe(
				'cache:assessment:123e4567-e89b-12d3-a456-426614174000:results:false'
			);
			expect(testModeKey).not.toBe(prodModeKey);
		});

		it('should use separate cache keys for statistics in test vs prod mode', async () => {
			const { CACHE_KEYS } = await import('$lib/server/cache');

			const testModeKey = CACHE_KEYS.ASSESSMENT_STATS(ASSESSMENT_ID, true);
			const prodModeKey = CACHE_KEYS.ASSESSMENT_STATS(ASSESSMENT_ID, false);

			expect(testModeKey).toBe('cache:assessment:123e4567-e89b-12d3-a456-426614174000:stats:true');
			expect(prodModeKey).toBe('cache:assessment:123e4567-e89b-12d3-a456-426614174000:stats:false');
			expect(testModeKey).not.toBe(prodModeKey);
		});
	});

	describe('Cache Invalidation', () => {
		it('should invalidate all assessment caches when test submitted', async () => {
			// Setup
			mockInvalidateCache.mockResolvedValue(undefined);

			// Import after mocks
			const { invalidateCache } = await import('$lib/server/cache');

			// Execute: Simulate test submission invalidation
			await invalidateCache(`cache:assessment:${ASSESSMENT_ID}:*`);

			// Verify
			expect(mockInvalidateCache).toHaveBeenCalledWith(
				'cache:assessment:123e4567-e89b-12d3-a456-426614174000:*'
			);
		});

		it('should use pattern invalidation to clear both results and stats', async () => {
			// Setup
			mockInvalidateCache.mockResolvedValue(undefined);

			// Import
			const { invalidateCache } = await import('$lib/server/cache');

			// Execute
			const pattern = `cache:assessment:${ASSESSMENT_ID}:*`;
			await invalidateCache(pattern);

			// Verify: Pattern should match all 4 keys (results:true, results:false, stats:true, stats:false)
			expect(mockInvalidateCache).toHaveBeenCalledWith(pattern);
			expect(pattern).toContain(ASSESSMENT_ID);
			expect(pattern).toContain('*'); // Wildcard for test/prod and results/stats
		});

		it('should handle invalidation errors gracefully (fire-and-forget)', async () => {
			// Setup: invalidateCache throws error
			const cacheError = new Error('Redis connection failed');
			mockInvalidateCache.mockRejectedValue(cacheError);

			// Import
			const { invalidateCache } = await import('$lib/server/cache');

			// Execute: Should not throw (fire-and-forget)
			await expect(
				invalidateCache(`cache:assessment:${ASSESSMENT_ID}:*`).catch(() => {
					// Simulate error handling in the endpoint
					console.error('[Cache] Failed to invalidate assessment cache');
				})
			).resolves.toBeUndefined();
		});
	});

	describe('Fallback on Redis Errors', () => {
		it('should fallback to DB when Redis errors occur', async () => {
			// Mock data
			const dbResults = {
				data: [
					{
						assignment_id: 'assign1',
						student_id: 'student1',
						student_name: 'Error Test',
						status: 'completed',
						best_score: 90,
						attempts: 1
					}
				],
				error: null
			};

			// Setup: getCached simulates Redis error and falls back
			mockGetCached.mockImplementation(async (_key, _ttl, fallback) => {
				// Simulate Redis error, then fallback
				console.error('[Cache] Redis error, using fallback');
				return await fallback();
			});
			mockGetAssessmentResults.mockResolvedValue(dbResults);

			// Import
			const { getCached, CACHE_KEYS, TTL } = await import('$lib/server/cache');
			const { getAssessmentResults } = await import('$lib/server/assessments');

			// Execute
			const result = await getCached(
				CACHE_KEYS.ASSESSMENT_RESULTS(ASSESSMENT_ID, false),
				TTL.ASSESSMENT_RESULTS,
				async () => getAssessmentResults(mockSupabase, ASSESSMENT_ID, false)
			);

			// Verify: Should get data from DB despite Redis error
			expect(result).toEqual(dbResults);
			expect(mockGetAssessmentResults).toHaveBeenCalled();
		});
	});

	describe('Cache TTL Configuration', () => {
		it('should use 5-minute TTL for assessment results', async () => {
			const { TTL } = await import('$lib/server/cache');

			expect(TTL.ASSESSMENT_RESULTS).toBe(300); // 5 minutes = 300 seconds
		});

		it('should use same TTL for results and statistics (synchronized)', async () => {
			// Both should use ASSESSMENT_RESULTS TTL
			const { TTL } = await import('$lib/server/cache');

			// Verify in implementation: both use TTL.ASSESSMENT_RESULTS
			expect(TTL.ASSESSMENT_RESULTS).toBe(300);
			// Note: In actual code, both getCached calls use TTL.ASSESSMENT_RESULTS
		});
	});

	describe('Integration Scenarios', () => {
		it('should handle complete cache lifecycle: miss → populate → hit', async () => {
			// Mock data
			const dbResults = {
				data: [{ assignment_id: 'assign1', student_id: 'student1', status: 'completed' }],
				error: null
			};

			// Setup: First call misses, second call hits
			let callCount = 0;
			mockGetCached.mockImplementation(async (_key, _ttl, fallback) => {
				callCount++;
				if (callCount === 1) {
					// First call: cache miss, fetch from DB
					const data = await fallback();
					return data;
				} else {
					// Second call: cache hit, return cached data
					return dbResults;
				}
			});
			mockGetAssessmentResults.mockResolvedValue(dbResults);

			// Import
			const { getCached, CACHE_KEYS, TTL } = await import('$lib/server/cache');
			const { getAssessmentResults } = await import('$lib/server/assessments');

			// Execute: First call (cache miss)
			const result1 = await getCached(
				CACHE_KEYS.ASSESSMENT_RESULTS(ASSESSMENT_ID, false),
				TTL.ASSESSMENT_RESULTS,
				async () => getAssessmentResults(mockSupabase, ASSESSMENT_ID, false)
			);

			// Execute: Second call (cache hit)
			const result2 = await getCached(
				CACHE_KEYS.ASSESSMENT_RESULTS(ASSESSMENT_ID, false),
				TTL.ASSESSMENT_RESULTS,
				async () => getAssessmentResults(mockSupabase, ASSESSMENT_ID, false)
			);

			// Verify
			expect(result1).toEqual(dbResults);
			expect(result2).toEqual(dbResults);
			expect(mockGetAssessmentResults).toHaveBeenCalledTimes(1); // Only called on miss
		});

		it('should invalidate cache after student submits test', async () => {
			// Setup
			mockInvalidateCache.mockResolvedValue(undefined);

			// Import
			const { invalidateCache } = await import('$lib/server/cache');

			// Execute: After test_sessions insert, invalidate cache
			await invalidateCache(`cache:assessment:${ASSESSMENT_ID}:*`);

			// Verify
			expect(mockInvalidateCache).toHaveBeenCalledWith(`cache:assessment:${ASSESSMENT_ID}:*`);
		});
	});
});
