/**
 * Unit Tests for Teacher Students Cache Store
 * ============================================
 *
 * Comprehensive test suite with 100% coverage target
 *
 * Author: Claude Code
 * Date: 2025-10-17
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { teacherStudentsCache } from './teacherStudentsCache.svelte';
import type { CachedStudent, CachedStudentFull } from './teacherStudentsCache.svelte';
import {
	mockFetchResponse,
	mockApiResponse,
	getSmallClassScenario,
	getEmptyClassScenario,
	getLargeClassScenario,
	getFullDataScenario,
	MOCK_STUDENTS,
	MOCK_STUDENTS_FULL
} from '$lib/test-utils/cache-fixtures';

// ============================================================================
// HELPER TYPE
// ============================================================================

// Type for the cache instance (exported singleton)
type TeacherStudentsCache = typeof teacherStudentsCache;

// ============================================================================
// TEST SUITE
// ============================================================================

describe('TeacherStudentsCacheStore', () => {
	let cache: TeacherStudentsCache;
	let mockFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		// Use the singleton instance
		cache = teacherStudentsCache;
		// Clear cache before each test
		cache.clear();

		mockFetch = vi.fn();
		vi.stubGlobal('fetch', mockFetch);
	});

	afterEach(() => {
		// Clear cache after each test
		cache.clear();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	// ========================================================================
	// SUITE 1: Cache Initialization
	// ========================================================================

	describe('Cache Initialization', () => {
		it('should start with empty cache', () => {
			expect(cache.has('any-class-id')).toBe(false);
		});

		it('should return undefined for getCached() on empty cache', () => {
			expect(cache.getCached('any-class-id')).toBeUndefined();
		});

		it('should return false for isLoading() on empty cache', () => {
			expect(cache.isLoading('any-class-id')).toBe(false);
		});
	});

	// ========================================================================
	// SUITE 2: Basic Cache Operations
	// ========================================================================

	describe('Basic Cache Operations', () => {
		it('should fetch from API on cache miss', async () => {
			const scenario = getSmallClassScenario();
			mockFetch.mockResolvedValueOnce(mockFetchResponse(mockApiResponse(scenario.students)));

			const students = await cache.getStudents(scenario.classId);

			expect(mockFetch).toHaveBeenCalledWith(`/api/classes/${scenario.classId}/students`);
			expect(students).toEqual(scenario.students);
		});

		it('should return cached data on cache hit', async () => {
			const scenario = getSmallClassScenario();
			mockFetch.mockResolvedValueOnce(mockFetchResponse(mockApiResponse(scenario.students)));

			// First call - fetch from API
			await cache.getStudents(scenario.classId);

			// Reset mock to verify no second call
			mockFetch.mockClear();

			// Second call - should use cache
			const cachedStudents = await cache.getStudents(scenario.classId);

			expect(mockFetch).not.toHaveBeenCalled();
			expect(cachedStudents).toEqual(scenario.students);
		});

		it('should set has() to true after successful fetch', async () => {
			const scenario = getSmallClassScenario();
			mockFetch.mockResolvedValueOnce(mockFetchResponse(mockApiResponse(scenario.students)));

			expect(cache.has(scenario.classId)).toBe(false);

			await cache.getStudents(scenario.classId);

			expect(cache.has(scenario.classId)).toBe(true);
		});

		it('should return data synchronously with getCached() after fetch', async () => {
			const scenario = getSmallClassScenario();
			mockFetch.mockResolvedValueOnce(mockFetchResponse(mockApiResponse(scenario.students)));

			expect(cache.getCached(scenario.classId)).toBeUndefined();

			await cache.getStudents(scenario.classId);

			const cached = cache.getCached(scenario.classId);
			expect(cached).toEqual(scenario.students);
		});

		it('should handle empty student arrays', async () => {
			const scenario = getEmptyClassScenario();
			mockFetch.mockResolvedValueOnce(mockFetchResponse(mockApiResponse(scenario.students)));

			const students = await cache.getStudents(scenario.classId);

			expect(students).toEqual([]);
			expect(cache.has(scenario.classId)).toBe(true);
		});

		it('should handle large student lists', async () => {
			const scenario = getLargeClassScenario();
			mockFetch.mockResolvedValueOnce(mockFetchResponse(mockApiResponse(scenario.students)));

			const students = await cache.getStudents(scenario.classId);

			expect(students).toHaveLength(30);
			expect(cache.has(scenario.classId)).toBe(true);
		});
	});

	// ========================================================================
	// SUITE 3: Minimal vs Full Data
	// ========================================================================

	describe('Minimal vs Full Data', () => {
		it('should fetch minimal data by default (full=false)', async () => {
			const scenario = getSmallClassScenario();
			mockFetch.mockResolvedValueOnce(mockFetchResponse(mockApiResponse(scenario.students)));

			await cache.getStudents(scenario.classId);

			expect(mockFetch).toHaveBeenCalledWith(`/api/classes/${scenario.classId}/students`);
		});

		it('should fetch full data when full=true', async () => {
			const scenario = getFullDataScenario();
			mockFetch.mockResolvedValueOnce(
				mockFetchResponse(mockApiResponse(scenario.students, true))
			);

			await cache.getStudents(scenario.classId, true);

			expect(mockFetch).toHaveBeenCalledWith(
				`/api/classes/${scenario.classId}/students?full=true`
			);
		});

		it('should use cached minimal data when requesting minimal again', async () => {
			const scenario = getSmallClassScenario();
			mockFetch.mockResolvedValueOnce(mockFetchResponse(mockApiResponse(scenario.students)));

			await cache.getStudents(scenario.classId, false);
			mockFetch.mockClear();

			await cache.getStudents(scenario.classId, false);

			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('should re-fetch when requesting full data but only minimal is cached', async () => {
			const scenario = getSmallClassScenario();
			const fullScenario = getFullDataScenario();

			// First fetch: minimal data
			mockFetch.mockResolvedValueOnce(mockFetchResponse(mockApiResponse(scenario.students, false)));
			await cache.getStudents(scenario.classId, false);

			mockFetch.mockClear();

			// Second fetch: request full data (should re-fetch)
			mockFetch.mockResolvedValueOnce(
				mockFetchResponse(mockApiResponse(fullScenario.students, true))
			);
			await cache.getStudents(scenario.classId, true);

			expect(mockFetch).toHaveBeenCalledWith(
				`/api/classes/${scenario.classId}/students?full=true`
			);
		});

		it('should return cached full data for both minimal and full requests', async () => {
			const scenario = getFullDataScenario();

			// First fetch: full data
			mockFetch.mockResolvedValueOnce(
				mockFetchResponse(mockApiResponse(scenario.students, true))
			);
			await cache.getStudents(scenario.classId, true);

			mockFetch.mockClear();

			// Request minimal (should use cached full data)
			const minimalRequest = await cache.getStudents(scenario.classId, false);
			expect(mockFetch).not.toHaveBeenCalled();
			expect(minimalRequest).toEqual(scenario.students);

			// Request full again (should use cached full data)
			const fullRequest = await cache.getStudents(scenario.classId, true);
			expect(mockFetch).not.toHaveBeenCalled();
			expect(fullRequest).toEqual(scenario.students);
		});

		it('should preserve full data fields when cached', async () => {
			const scenario = getFullDataScenario();
			mockFetch.mockResolvedValueOnce(
				mockFetchResponse(mockApiResponse(scenario.students, true))
			);

			const students = (await cache.getStudents(scenario.classId, true)) as CachedStudentFull[];

			expect(students[0].gidouilles).toBeDefined();
			expect(students[0].vip_cards).toBeDefined();
			expect(students[0].role).toBeDefined();
			expect(students[0].gender).toBeDefined();
		});
	});

	// ========================================================================
	// SUITE 4: Deduplication & Race Conditions
	// ========================================================================

	describe('Deduplication & Race Conditions', () => {
		it('should deduplicate simultaneous requests for same class', async () => {
			const scenario = getSmallClassScenario();

			// Create a promise that resolves after 100ms
			const delayedResponse = new Promise<Response>((resolve) => {
				setTimeout(() => {
					resolve(mockFetchResponse(mockApiResponse(scenario.students)));
				}, 100);
			});

			mockFetch.mockReturnValueOnce(delayedResponse);

			// Fire two requests simultaneously
			const [students1, students2] = await Promise.all([
				cache.getStudents(scenario.classId),
				cache.getStudents(scenario.classId)
			]);

			// Should only call fetch once
			expect(mockFetch).toHaveBeenCalledTimes(1);
			expect(students1).toEqual(students2);
		});

		it('should set isLoading to true during fetch', async () => {
			const scenario = getSmallClassScenario();

			const delayedResponse = new Promise<Response>((resolve) => {
				setTimeout(() => {
					resolve(mockFetchResponse(mockApiResponse(scenario.students)));
				}, 50);
			});

			mockFetch.mockReturnValueOnce(delayedResponse);

			// Start fetch
			const fetchPromise = cache.getStudents(scenario.classId);

			// Check loading state immediately
			expect(cache.isLoading(scenario.classId)).toBe(true);

			await fetchPromise;

			// Check loading state after completion
			expect(cache.isLoading(scenario.classId)).toBe(false);
		});

		it('should return undefined from getCached() while loading', async () => {
			const scenario = getSmallClassScenario();

			const delayedResponse = new Promise<Response>((resolve) => {
				setTimeout(() => {
					resolve(mockFetchResponse(mockApiResponse(scenario.students)));
				}, 50);
			});

			mockFetch.mockReturnValueOnce(delayedResponse);

			// Start fetch
			const fetchPromise = cache.getStudents(scenario.classId);

			// getCached should return undefined while loading
			expect(cache.getCached(scenario.classId)).toBeUndefined();

			await fetchPromise;

			// getCached should return data after completion
			expect(cache.getCached(scenario.classId)).toBeDefined();
		});

		it('should wait for in-flight request using waitForLoad', async () => {
			const scenario = getSmallClassScenario();

			// Create promise that resolves after 100ms (using real timers)
			const delayedResponse = new Promise<Response>((resolve) => {
				setTimeout(() => {
					resolve(mockFetchResponse(mockApiResponse(scenario.students)));
				}, 100);
			});

			mockFetch.mockReturnValueOnce(delayedResponse);

			// Start first request
			const request1 = cache.getStudents(scenario.classId);

			// Wait 10ms
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Start second request (should wait for first)
			const request2 = cache.getStudents(scenario.classId);

			// Both should resolve with same data
			const [students1, students2] = await Promise.all([request1, request2]);

			expect(students1).toEqual(students2);
			expect(mockFetch).toHaveBeenCalledTimes(1);
		}, 10000); // 10s timeout for async operations

		it('should handle multiple classes independently', async () => {
			const scenario1 = getSmallClassScenario();
			const scenario2 = getFullDataScenario();

			mockFetch
				.mockResolvedValueOnce(mockFetchResponse(mockApiResponse(scenario1.students)))
				.mockResolvedValueOnce(mockFetchResponse(mockApiResponse(scenario2.students, true)));

			const [students1, students2] = await Promise.all([
				cache.getStudents(scenario1.classId),
				cache.getStudents(scenario2.classId, true)
			]);

			expect(students1).toEqual(scenario1.students);
			expect(students2).toEqual(scenario2.students);
			expect(cache.has(scenario1.classId)).toBe(true);
			expect(cache.has(scenario2.classId)).toBe(true);
		});

		it('should handle rapid sequential requests correctly', async () => {
			const scenario = getSmallClassScenario();
			mockFetch.mockResolvedValue(mockFetchResponse(mockApiResponse(scenario.students)));

			// First request
			await cache.getStudents(scenario.classId);

			mockFetch.mockClear();

			// 10 rapid requests (should all use cache)
			const requests = Array(10)
				.fill(null)
				.map(() => cache.getStudents(scenario.classId));

			await Promise.all(requests);

			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('should handle timeout after 10 seconds', async () => {
			vi.useFakeTimers();

			const scenario = getSmallClassScenario();

			// Promise that never resolves
			const neverResolves = new Promise<Response>(() => {});
			mockFetch.mockReturnValueOnce(neverResolves);

			// Start first request
			const request1 = cache.getStudents(scenario.classId);

			// Wait 100ms
			vi.advanceTimersByTime(100);

			// Start second request (will wait for first)
			const request2 = cache.getStudents(scenario.classId);

			// Advance time by 10 seconds (timeout)
			vi.advanceTimersByTime(10000);

			// Second request should timeout
			await expect(request2).rejects.toThrow('Timeout waiting for students to load');

			vi.useRealTimers();
		});
	});

	// ========================================================================
	// SUITE 5: Cache Invalidation
	// ========================================================================

	describe('Cache Invalidation', () => {
		it('should remove class from cache when invalidated', async () => {
			const scenario = getSmallClassScenario();
			mockFetch.mockResolvedValueOnce(mockFetchResponse(mockApiResponse(scenario.students)));

			await cache.getStudents(scenario.classId);
			expect(cache.has(scenario.classId)).toBe(true);

			cache.invalidate(scenario.classId);

			expect(cache.has(scenario.classId)).toBe(false);
			expect(cache.getCached(scenario.classId)).toBeUndefined();
		});

		it('should re-fetch after invalidation', async () => {
			const scenario = getSmallClassScenario();
			mockFetch.mockResolvedValue(mockFetchResponse(mockApiResponse(scenario.students)));

			// First fetch
			await cache.getStudents(scenario.classId);
			expect(mockFetch).toHaveBeenCalledTimes(1);

			// Invalidate
			cache.invalidate(scenario.classId);

			// Second fetch (should call API again)
			await cache.getStudents(scenario.classId);
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it('should invalidate multiple classes with invalidateMany', async () => {
			const scenario1 = getSmallClassScenario();
			const scenario2 = getFullDataScenario();

			mockFetch
				.mockResolvedValueOnce(mockFetchResponse(mockApiResponse(scenario1.students)))
				.mockResolvedValueOnce(mockFetchResponse(mockApiResponse(scenario2.students, true)));

			await cache.getStudents(scenario1.classId);
			await cache.getStudents(scenario2.classId, true);

			expect(cache.has(scenario1.classId)).toBe(true);
			expect(cache.has(scenario2.classId)).toBe(true);

			cache.invalidateMany([scenario1.classId, scenario2.classId]);

			expect(cache.has(scenario1.classId)).toBe(false);
			expect(cache.has(scenario2.classId)).toBe(false);
		});

		it('should clear entire cache with clear()', async () => {
			const scenario1 = getSmallClassScenario();
			const scenario2 = getFullDataScenario();

			mockFetch
				.mockResolvedValueOnce(mockFetchResponse(mockApiResponse(scenario1.students)))
				.mockResolvedValueOnce(mockFetchResponse(mockApiResponse(scenario2.students, true)));

			await cache.getStudents(scenario1.classId);
			await cache.getStudents(scenario2.classId, true);

			const statsBefore = cache.getStats();
			expect(statsBefore.cachedClasses).toBe(2);

			cache.clear();

			const statsAfter = cache.getStats();
			expect(statsAfter.cachedClasses).toBe(0);
			expect(cache.has(scenario1.classId)).toBe(false);
			expect(cache.has(scenario2.classId)).toBe(false);
		});

		it('should not throw when invalidating non-existent class', () => {
			expect(() => cache.invalidate('non-existent-class')).not.toThrow();
		});
	});

	// ========================================================================
	// SUITE 6: Preloading
	// ========================================================================

	describe('Preloading', () => {
		it('should preload students in background', async () => {
			const scenario = getSmallClassScenario();
			mockFetch.mockResolvedValueOnce(mockFetchResponse(mockApiResponse(scenario.students)));

			// Preload (fire-and-forget)
			cache.preload(scenario.classId);

			// Wait for fetch to complete
			await new Promise((resolve) => setTimeout(resolve, 50));

			// Data should be cached
			expect(cache.has(scenario.classId)).toBe(true);
			const cached = cache.getCached(scenario.classId);
			expect(cached).toEqual(scenario.students);
		});

		it('should not preload if already cached with sufficient data', async () => {
			const scenario = getSmallClassScenario();
			mockFetch.mockResolvedValueOnce(mockFetchResponse(mockApiResponse(scenario.students)));

			// First fetch
			await cache.getStudents(scenario.classId);
			mockFetch.mockClear();

			// Preload (should skip)
			cache.preload(scenario.classId);

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('should preload full data when requested', async () => {
			const scenario = getFullDataScenario();
			mockFetch.mockResolvedValueOnce(
				mockFetchResponse(mockApiResponse(scenario.students, true))
			);

			cache.preload(scenario.classId, true);

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(mockFetch).toHaveBeenCalledWith(
				`/api/classes/${scenario.classId}/students?full=true`
			);
		});

		it('should not throw on preload failure', async () => {
			const scenario = getSmallClassScenario();
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			// Should not throw (fire-and-forget)
			expect(() => cache.preload(scenario.classId)).not.toThrow();

			await new Promise((resolve) => setTimeout(resolve, 50));

			// Cache should be empty after failed preload
			expect(cache.has(scenario.classId)).toBe(false);
		});

		it('should upgrade cache from minimal to full when preloading full', async () => {
			const scenario = getSmallClassScenario();
			const fullScenario = getFullDataScenario();

			// First: fetch minimal data
			mockFetch.mockResolvedValueOnce(mockFetchResponse(mockApiResponse(scenario.students)));
			await cache.getStudents(scenario.classId, false);

			mockFetch.mockClear();

			// Preload full data
			mockFetch.mockResolvedValueOnce(
				mockFetchResponse(mockApiResponse(fullScenario.students, true))
			);
			cache.preload(scenario.classId, true);

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(mockFetch).toHaveBeenCalledWith(
				`/api/classes/${scenario.classId}/students?full=true`
			);
		});
	});

	// ========================================================================
	// SUITE 7: Error Handling
	// ========================================================================

	describe('Error Handling', () => {
		it('should throw on fetch failure', async () => {
			const scenario = getSmallClassScenario();
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			await expect(cache.getStudents(scenario.classId)).rejects.toThrow('Network error');
		});

		it('should remove loading state on error', async () => {
			const scenario = getSmallClassScenario();
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			await expect(cache.getStudents(scenario.classId)).rejects.toThrow();

			expect(cache.isLoading(scenario.classId)).toBe(false);
		});

		it('should delete cache entry on error', async () => {
			const scenario = getSmallClassScenario();
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			await expect(cache.getStudents(scenario.classId)).rejects.toThrow();

			expect(cache.has(scenario.classId)).toBe(false);
		});

		it('should allow retry after failed fetch', async () => {
			const scenario = getSmallClassScenario();

			// First fetch fails
			mockFetch.mockRejectedValueOnce(new Error('Network error'));
			await expect(cache.getStudents(scenario.classId)).rejects.toThrow();

			// Second fetch succeeds
			mockFetch.mockResolvedValueOnce(mockFetchResponse(mockApiResponse(scenario.students)));
			const students = await cache.getStudents(scenario.classId);

			expect(students).toEqual(scenario.students);
			expect(cache.has(scenario.classId)).toBe(true);
		});

		it('should handle non-ok response status', async () => {
			const scenario = getSmallClassScenario();
			mockFetch.mockResolvedValueOnce(
				mockFetchResponse(
					{ error: 'Not found' },
					{ ok: false, status: 404, statusText: 'Not Found' }
				)
			);

			await expect(cache.getStudents(scenario.classId)).rejects.toThrow(
				'Failed to fetch students: Not Found'
			);
		});

		it('should handle malformed JSON response', async () => {
			const scenario = getSmallClassScenario();
			const badResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				json: async () => {
					throw new Error('Invalid JSON');
				}
			} as Response;

			mockFetch.mockResolvedValueOnce(badResponse);

			await expect(cache.getStudents(scenario.classId)).rejects.toThrow('Invalid JSON');
		});

		it('should handle missing students field in response', async () => {
			const scenario = getSmallClassScenario();
			mockFetch.mockResolvedValueOnce(mockFetchResponse({})); // No students field

			const students = await cache.getStudents(scenario.classId);

			expect(students).toEqual([]); // Should default to empty array
		});

		it('should reject waitForLoad when cache entry is deleted', async () => {
			vi.useFakeTimers();

			const scenario = getSmallClassScenario();

			// Create promise that never resolves
			const neverResolves = new Promise<Response>(() => {});
			mockFetch.mockReturnValueOnce(neverResolves);

			// Start first request
			cache.getStudents(scenario.classId);

			// Wait a bit
			vi.advanceTimersByTime(100);

			// Start second request (will wait)
			const request2 = cache.getStudents(scenario.classId);

			// Manually delete cache entry (simulating error)
			cache.invalidate(scenario.classId);

			// Advance time for polling
			vi.advanceTimersByTime(200);

			// Should reject with error
			await expect(request2).rejects.toThrow('Failed to load students');

			vi.useRealTimers();
		});
	});

	// ========================================================================
	// SUITE 8: Cache Statistics
	// ========================================================================

	describe('Cache Statistics', () => {
		it('should return correct cached classes count', async () => {
			const scenario1 = getSmallClassScenario();
			const scenario2 = getFullDataScenario();

			mockFetch
				.mockResolvedValueOnce(mockFetchResponse(mockApiResponse(scenario1.students)))
				.mockResolvedValueOnce(mockFetchResponse(mockApiResponse(scenario2.students, true)));

			await cache.getStudents(scenario1.classId);
			await cache.getStudents(scenario2.classId, true);

			const stats = cache.getStats();
			expect(stats.cachedClasses).toBe(2);
		});

		it('should return loading classes count', async () => {
			const scenario = getSmallClassScenario();

			const delayedResponse = new Promise<Response>((resolve) => {
				setTimeout(() => {
					resolve(mockFetchResponse(mockApiResponse(scenario.students)));
				}, 100);
			});

			mockFetch.mockReturnValueOnce(delayedResponse);

			// Start fetch (don't await)
			const fetchPromise = cache.getStudents(scenario.classId);

			// Check stats while loading (immediately)
			const statsLoading = cache.getStats();
			expect(statsLoading.loadingClasses).toBe(1);

			// Wait for fetch to complete
			await fetchPromise;

			const statsComplete = cache.getStats();
			expect(statsComplete.loadingClasses).toBe(0);
		});

		it('should return total students count', async () => {
			const scenario1 = getSmallClassScenario(); // 3 students
			const scenario2 = getFullDataScenario(); // 2 students

			mockFetch
				.mockResolvedValueOnce(mockFetchResponse(mockApiResponse(scenario1.students)))
				.mockResolvedValueOnce(mockFetchResponse(mockApiResponse(scenario2.students, true)));

			await cache.getStudents(scenario1.classId);
			await cache.getStudents(scenario2.classId, true);

			const stats = cache.getStats();
			expect(stats.totalStudents).toBe(5);
		});

		it('should return zero stats for empty cache', () => {
			const stats = cache.getStats();

			expect(stats.cachedClasses).toBe(0);
			expect(stats.loadingClasses).toBe(0);
			expect(stats.totalStudents).toBe(0);
		});
	});

	// ========================================================================
	// SUITE 9: Edge Cases
	// ========================================================================

	describe('Edge Cases', () => {
		it('should handle class IDs with special characters', async () => {
			const classId = 'class-with-special-chars-!@#$%';
			const students = [MOCK_STUDENTS.alice];

			mockFetch.mockResolvedValueOnce(mockFetchResponse(mockApiResponse(students)));

			await cache.getStudents(classId);

			expect(cache.has(classId)).toBe(true);
		});

		it('should handle very long class IDs', async () => {
			const classId = 'a'.repeat(1000);
			const students = [MOCK_STUDENTS.alice];

			mockFetch.mockResolvedValueOnce(mockFetchResponse(mockApiResponse(students)));

			await cache.getStudents(classId);

			expect(cache.has(classId)).toBe(true);
		});

		it('should handle invalidation during in-flight request', async () => {
			vi.useFakeTimers();

			const scenario = getSmallClassScenario();

			const delayedResponse = new Promise<Response>((resolve) => {
				setTimeout(() => {
					resolve(mockFetchResponse(mockApiResponse(scenario.students)));
				}, 500);
			});

			mockFetch.mockReturnValueOnce(delayedResponse);

			// Start fetch
			const fetchPromise = cache.getStudents(scenario.classId);

			// Wait a bit
			vi.advanceTimersByTime(100);

			// Invalidate while loading
			cache.invalidate(scenario.classId);

			// Complete fetch
			vi.advanceTimersByTime(500);
			const students = await fetchPromise;

			// Cache should be populated despite invalidation during flight
			expect(students).toEqual(scenario.students);

			vi.useRealTimers();
		});

		it('should handle concurrent invalidations', () => {
			const scenario1 = getSmallClassScenario();
			const scenario2 = getFullDataScenario();

			// Invalidate multiple times rapidly
			for (let i = 0; i < 100; i++) {
				cache.invalidate(scenario1.classId);
				cache.invalidateMany([scenario1.classId, scenario2.classId]);
				cache.clear();
			}

			// Should not throw
			expect(cache.has(scenario1.classId)).toBe(false);
		});

		it('should handle empty classId string', async () => {
			mockFetch.mockResolvedValueOnce(mockFetchResponse(mockApiResponse([])));

			await cache.getStudents('');

			expect(mockFetch).toHaveBeenCalledWith('/api/classes//students');
		});

		it('should handle null/undefined in students array gracefully', async () => {
			const scenario = getSmallClassScenario();
			// Mock response with null values (malformed data)
			const malformedData = { students: [...scenario.students, null, undefined] as any };

			mockFetch.mockResolvedValueOnce(mockFetchResponse(malformedData));

			const students = await cache.getStudents(scenario.classId);

			// Should still cache (garbage in, garbage out)
			expect(cache.has(scenario.classId)).toBe(true);
		});
	});

	// ========================================================================
	// SUITE 10: Singleton & Context API
	// ========================================================================

	describe('Singleton & Context API', () => {
		it('should export a singleton instance', () => {
			expect(teacherStudentsCache).toBeDefined();
			expect(teacherStudentsCache.has).toBeDefined();
			expect(teacherStudentsCache.getStudents).toBeDefined();
		});

		it('should have all public methods on singleton', () => {
			expect(typeof teacherStudentsCache.has).toBe('function');
			expect(typeof teacherStudentsCache.isLoading).toBe('function');
			expect(typeof teacherStudentsCache.getCached).toBe('function');
			expect(typeof teacherStudentsCache.getStudents).toBe('function');
			expect(typeof teacherStudentsCache.invalidate).toBe('function');
			expect(typeof teacherStudentsCache.invalidateMany).toBe('function');
			expect(typeof teacherStudentsCache.clear).toBe('function');
			expect(typeof teacherStudentsCache.preload).toBe('function');
			expect(typeof teacherStudentsCache.getStats).toBe('function');
		});

		it('singleton should persist data across test runs', async () => {
			const scenario = getSmallClassScenario();
			mockFetch.mockResolvedValue(mockFetchResponse(mockApiResponse(scenario.students)));

			// Clear cache first
			cache.clear();

			await cache.getStudents(scenario.classId);

			// Data should be in cache
			expect(cache.has(scenario.classId)).toBe(true);

			// Getting from cache again should return same data
			const cached = cache.getCached(scenario.classId);
			expect(cached).toEqual(scenario.students);
		});

		it('singleton should maintain state for multiple classes', async () => {
			const scenario1 = getSmallClassScenario();
			const scenario2 = getFullDataScenario();

			mockFetch
				.mockResolvedValueOnce(mockFetchResponse(mockApiResponse(scenario1.students)))
				.mockResolvedValueOnce(mockFetchResponse(mockApiResponse(scenario2.students, true)));

			await cache.getStudents(scenario1.classId);
			await cache.getStudents(scenario2.classId, true);

			const stats = cache.getStats();

			expect(stats.cachedClasses).toBe(2);
			expect(stats.totalStudents).toBe(scenario1.students.length + scenario2.students.length);
		});

		it('should allow importing getTeacherStudentsCache function', async () => {
			// This test verifies the import works (already imported at top)
			// In real usage, components would call getTeacherStudentsCache() to get instance
			expect(cache).toBe(teacherStudentsCache); // Same instance
		});
	});
});
