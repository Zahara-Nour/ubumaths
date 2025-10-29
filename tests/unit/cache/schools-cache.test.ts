/**
 * Unit tests for Schools Redis Cache Module
 *
 * Tests Redis caching for school data (profile, timetable, metadata).
 *
 * Coverage:
 * 1. Cache miss (fetch from database)
 * 2. Cache hit (return cached school)
 * 3. Database error handling (graceful null return)
 * 4. TTL verification (3600-second / 1-hour cache lifetime)
 * 5. Cache invalidation by school ID
 * 6. Shared cache across multiple calls
 * 7. PGRST116 error handling (school not found)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

// Mock the base cache module
const mockGetCached = vi.fn();
const mockInvalidateCache = vi.fn();

vi.mock('$lib/server/cache', () => ({
	getCached: mockGetCached,
	invalidateCache: mockInvalidateCache,
	CACHE_KEYS: {
		SCHOOL_DATA: (schoolId: string) => `cache:school:${schoolId}:data`
	},
	TTL: {
		SCHOOL_DATA: 3600 // 1 hour
	}
}));

// Import after mocking
const { getCachedSchool, invalidateSchoolCache } = await import('$lib/server/cache/schools');

describe('Schools Cache', () => {
	type School = Database['public']['Tables']['schools']['Row'];

	// Mock Supabase client
	const createMockSupabase = () => {
		const mockSelect = vi.fn();
		const mockEq = vi.fn();
		const mockSingle = vi.fn();

		return {
			from: vi.fn(() => ({
				select: mockSelect.mockReturnValue({
					eq: mockEq.mockReturnValue({
						single: mockSingle
					})
				})
			})),
			_mockMethods: { mockSelect, mockEq, mockSingle }
		} as unknown as SupabaseClient<Database> & {
			_mockMethods: {
				mockSelect: ReturnType<typeof vi.fn>;
				mockEq: ReturnType<typeof vi.fn>;
				mockSingle: ReturnType<typeof vi.fn>;
			};
		};
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Cache Miss - Database Fetch', () => {
		it('should fetch school from database on cache miss', async () => {
			// Arrange
			const schoolId = '550e8400-e29b-41d4-a716-446655440000';
			const mockSupabase = createMockSupabase();
			const expectedSchool: Partial<School> = {
				id: schoolId,
				name: 'Test School',
				city: 'Paris',
				timetable: { periods: 8 }
			};

			// Setup: Cache miss triggers fallback
			mockGetCached.mockImplementation(async (_key, _ttl, fallback) => {
				return await fallback();
			});

			mockSupabase._mockMethods.mockSingle.mockResolvedValue({
				data: expectedSchool,
				error: null
			});

			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			// Act
			const school = await getCachedSchool(schoolId, mockSupabase);

			// Assert: Database queried correctly
			expect(mockSupabase.from).toHaveBeenCalledWith('schools');
			expect(mockSupabase._mockMethods.mockSelect).toHaveBeenCalledWith('*');
			expect(mockSupabase._mockMethods.mockEq).toHaveBeenCalledWith('id', schoolId);
			expect(mockSupabase._mockMethods.mockSingle).toHaveBeenCalled();

			// Assert: School data returned
			expect(school).toEqual(expectedSchool);

			// Assert: Debug log fired
			expect(consoleSpy).toHaveBeenCalledWith('[getCachedSchool] Fetching from DB:', { schoolId });

			consoleSpy.mockRestore();
		});

		it('should use correct cache key pattern', async () => {
			// Arrange
			const schoolId = 'abc-123-def-456';
			const mockSupabase = createMockSupabase();

			mockGetCached.mockImplementation(async (_key, _ttl, fallback) => {
				return await fallback();
			});

			mockSupabase._mockMethods.mockSingle.mockResolvedValue({
				data: { id: schoolId, name: 'Test' },
				error: null
			});

			// Act
			await getCachedSchool(schoolId, mockSupabase);

			// Assert: Cache key follows pattern cache:school:${schoolId}:data
			expect(mockGetCached).toHaveBeenCalledWith(
				'cache:school:abc-123-def-456:data',
				3600, // TTL
				expect.any(Function)
			);
		});

		it('should select all school fields (*)', async () => {
			// Arrange
			const schoolId = 'test-school-id';
			const mockSupabase = createMockSupabase();
			const fullSchool: Partial<School> = {
				id: schoolId,
				name: 'Full School',
				city: 'Lyon',
				country: 'France',
				timetable: { periods: 7 },
				logo_url: 'https://example.com/logo.png',
				created_at: '2024-01-01T00:00:00Z'
			};

			mockGetCached.mockImplementation(async (_key, _ttl, fallback) => {
				return await fallback();
			});

			mockSupabase._mockMethods.mockSingle.mockResolvedValue({
				data: fullSchool,
				error: null
			});

			// Act
			const school = await getCachedSchool(schoolId, mockSupabase);

			// Assert: All fields returned
			expect(school).toEqual(fullSchool);
			expect(mockSupabase._mockMethods.mockSelect).toHaveBeenCalledWith('*');
		});
	});

	describe('Cache Hit - Return Cached Data', () => {
		it('should return cached school on cache hit', async () => {
			// Arrange
			const schoolId = '123-456-789';
			const mockSupabase = createMockSupabase();
			const cachedSchool: Partial<School> = {
				id: schoolId,
				name: 'Cached School',
				city: 'Marseille'
			};

			// Setup: Cache hit returns data directly
			mockGetCached.mockResolvedValue(cachedSchool);

			// Act
			const school = await getCachedSchool(schoolId, mockSupabase);

			// Assert: Cached data returned
			expect(school).toEqual(cachedSchool);

			// Assert: Database NOT queried (cache hit)
			expect(mockSupabase.from).not.toHaveBeenCalled();
		});

		it('should use 3600-second TTL (1 hour)', async () => {
			// Arrange
			const schoolId = 'test-school';
			const mockSupabase = createMockSupabase();

			mockGetCached.mockResolvedValue({ id: schoolId, name: 'Test' });

			// Act
			await getCachedSchool(schoolId, mockSupabase);

			// Assert: TTL is 3600 seconds (1 hour)
			expect(mockGetCached).toHaveBeenCalledWith(
				expect.any(String),
				3600, // TTL.SCHOOL_DATA
				expect.any(Function)
			);
		});

		it('should share cache across multiple teachers at same school', async () => {
			// Arrange
			const schoolId = 'shared-school';
			const mockSupabase = createMockSupabase();
			const cachedSchool: Partial<School> = {
				id: schoolId,
				name: 'Shared School'
			};

			mockGetCached.mockResolvedValue(cachedSchool);

			// Act: Simulate 3 teachers loading dashboard
			const teacher1 = await getCachedSchool(schoolId, mockSupabase);
			const teacher2 = await getCachedSchool(schoolId, mockSupabase);
			const teacher3 = await getCachedSchool(schoolId, mockSupabase);

			// Assert: All get same cached data
			expect(teacher1).toEqual(cachedSchool);
			expect(teacher2).toEqual(cachedSchool);
			expect(teacher3).toEqual(cachedSchool);

			// Assert: getCached called 3 times (Redis checks)
			expect(mockGetCached).toHaveBeenCalledTimes(3);

			// Assert: Database NOT queried (all cache hits)
			expect(mockSupabase.from).not.toHaveBeenCalled();
		});
	});

	describe('Database Error Handling', () => {
		it('should throw error on database failure', async () => {
			// Arrange
			const schoolId = 'error-school';
			const mockSupabase = createMockSupabase();

			mockGetCached.mockImplementation(async (_key, _ttl, fallback) => {
				return await fallback();
			});

			mockSupabase._mockMethods.mockSingle.mockResolvedValue({
				data: null,
				error: { message: 'Connection timeout', code: 'ECONNREFUSED' }
			});

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Act & Assert: Should throw error (not return null)
			await expect(getCachedSchool(schoolId, mockSupabase)).rejects.toThrow(
				'Failed to fetch school: Connection timeout'
			);

			// Assert: Error logged
			expect(consoleSpy).toHaveBeenCalledWith(
				'[getCachedSchool] Error fetching school:',
				expect.objectContaining({ message: 'Connection timeout' })
			);

			consoleSpy.mockRestore();
		});

		it('should return null when school not found (PGRST116)', async () => {
			// Arrange
			const schoolId = 'nonexistent-school';
			const mockSupabase = createMockSupabase();

			mockGetCached.mockImplementation(async (_key, _ttl, fallback) => {
				return await fallback();
			});

			// PGRST116 = PostgreSQL REST error for "single row not found"
			mockSupabase._mockMethods.mockSingle.mockResolvedValue({
				data: null,
				error: { message: 'No rows found', code: 'PGRST116' }
			});

			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			// Act
			const school = await getCachedSchool(schoolId, mockSupabase);

			// Assert: Returns null (not found is not an error)
			expect(school).toBeNull();

			// Assert: Logged as info (not error)
			expect(consoleSpy).toHaveBeenCalledWith('[getCachedSchool] School not found:', schoolId);

			consoleSpy.mockRestore();
		});

		it('should handle null data without error code', async () => {
			// Arrange
			const schoolId = 'null-data-school';
			const mockSupabase = createMockSupabase();

			mockGetCached.mockImplementation(async (_key, _ttl, fallback) => {
				return await fallback();
			});

			mockSupabase._mockMethods.mockSingle.mockResolvedValue({
				data: null,
				error: { message: 'Unknown error', code: 'UNKNOWN' }
			});

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Act & Assert: Non-PGRST116 errors should throw
			await expect(getCachedSchool(schoolId, mockSupabase)).rejects.toThrow(
				'Failed to fetch school: Unknown error'
			);

			consoleSpy.mockRestore();
		});
	});

	describe('Cache Invalidation', () => {
		it('should invalidate school cache by school ID', async () => {
			// Arrange
			const schoolId = '789-abc-def';
			mockInvalidateCache.mockResolvedValue(undefined);

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Act
			await invalidateSchoolCache(schoolId);

			// Assert: Correct cache key invalidated
			expect(mockInvalidateCache).toHaveBeenCalledWith('cache:school:789-abc-def:data');

			consoleSpy.mockRestore();
		});

		it('should use same key pattern as getCachedSchool', async () => {
			// Arrange
			const schoolId = 'consistency-test';
			mockInvalidateCache.mockResolvedValue(undefined);

			// Act
			await invalidateSchoolCache(schoolId);

			// Assert: Key pattern matches getCachedSchool
			const expectedKey = `cache:school:${schoolId}:data`;
			expect(mockInvalidateCache).toHaveBeenCalledWith(expectedKey);
		});

		it('should not throw on invalidation error (fail-safe)', async () => {
			// Arrange
			const schoolId = 'error-invalidate';
			mockInvalidateCache.mockRejectedValue(new Error('Redis connection failed'));

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Act & Assert: Should not throw (fail-safe)
			await expect(invalidateSchoolCache(schoolId)).resolves.toBeUndefined();

			// Assert: Error logged but not thrown
			expect(consoleSpy).toHaveBeenCalledWith('[invalidateSchoolCache] Error:', expect.any(Error));

			consoleSpy.mockRestore();
		});
	});

	describe('Integration Scenarios', () => {
		it('should cache school after first fetch', async () => {
			// Arrange
			const schoolId = 'integration-school';
			const mockSupabase = createMockSupabase();
			const schoolData: Partial<School> = {
				id: schoolId,
				name: 'Integration School',
				city: 'Nice'
			};

			let fetchCount = 0;
			mockGetCached.mockImplementation(async (_key, _ttl, fallback) => {
				if (fetchCount === 0) {
					// First call: cache miss
					fetchCount++;
					return await fallback();
				} else {
					// Subsequent calls: cache hit
					return schoolData;
				}
			});

			mockSupabase._mockMethods.mockSingle.mockResolvedValue({
				data: schoolData,
				error: null
			});

			// Act: First call (cache miss)
			const school1 = await getCachedSchool(schoolId, mockSupabase);

			// Act: Second call (cache hit)
			vi.clearAllMocks(); // Clear DB mocks
			const school2 = await getCachedSchool(schoolId, mockSupabase);

			// Assert
			expect(school1).toEqual(schoolData);
			expect(school2).toEqual(schoolData);
			// Database called only once (first time)
			expect(mockSupabase.from).not.toHaveBeenCalled();
		});

		it('should refetch after invalidation', async () => {
			// Arrange
			const schoolId = 'refetch-school';
			const mockSupabase = createMockSupabase();
			let invalidated = false;

			const oldData: Partial<School> = {
				id: schoolId,
				name: 'Old Name',
				city: 'Old City'
			};

			const newData: Partial<School> = {
				id: schoolId,
				name: 'New Name',
				city: 'New City',
				timetable: { periods: 8 } // Updated timetable
			};

			mockGetCached.mockImplementation(async (_key, _ttl, fallback) => {
				if (!invalidated) {
					// Before invalidation: return cached
					return oldData;
				} else {
					// After invalidation: refetch from DB
					return await fallback();
				}
			});

			mockSupabase._mockMethods.mockSingle.mockResolvedValue({
				data: newData,
				error: null
			});

			// Act: First call (cached)
			const school1 = await getCachedSchool(schoolId, mockSupabase);
			expect(school1).toEqual(oldData);

			// Act: Invalidate (e.g., after timetable update)
			invalidated = true;
			mockInvalidateCache.mockResolvedValue(undefined);
			await invalidateSchoolCache(schoolId);

			// Act: Second call (refetch)
			const school2 = await getCachedSchool(schoolId, mockSupabase);

			// Assert: Updated data returned
			expect(school2).toEqual(newData);
		});

		it('should handle rapid concurrent calls from multiple teachers', async () => {
			// Arrange: Simulate 50 teachers at same school loading dashboard
			const schoolId = 'popular-school';
			const mockSupabase = createMockSupabase();
			const schoolData: Partial<School> = {
				id: schoolId,
				name: 'Popular School',
				city: 'Paris'
			};

			mockGetCached.mockResolvedValue(schoolData); // Always cached

			// Act: Fire 50 concurrent requests
			const promises = Array.from({ length: 50 }, () => getCachedSchool(schoolId, mockSupabase));

			const results = await Promise.all(promises);

			// Assert: All return same cached data
			results.forEach((result) => {
				expect(result).toEqual(schoolData);
			});

			// Assert: 50 cache lookups (no DB queries)
			expect(mockGetCached).toHaveBeenCalledTimes(50);
			expect(mockSupabase.from).not.toHaveBeenCalled();
		});

		it('should handle timetable update workflow', async () => {
			// This test simulates the real-world workflow:
			// 1. Admin updates school timetable
			// 2. Cache is invalidated
			// 3. Next teacher load fetches fresh data

			// Arrange
			const schoolId = 'timetable-update-school';
			const mockSupabase = createMockSupabase();

			const oldTimetable = { periods: 7, start: '08:00', end: '15:00' };
			const newTimetable = { periods: 8, start: '08:00', end: '16:00' };

			let cacheState: 'old' | 'invalidated' | 'new' = 'old';

			mockGetCached.mockImplementation(async (_key, _ttl, fallback) => {
				if (cacheState === 'old') {
					return { id: schoolId, name: 'School', timetable: oldTimetable };
				} else if (cacheState === 'invalidated' || cacheState === 'new') {
					// After invalidation: refetch
					return await fallback();
				}
			});

			mockSupabase._mockMethods.mockSingle.mockResolvedValue({
				data: { id: schoolId, name: 'School', timetable: newTimetable },
				error: null
			});

			// Step 1: Teacher loads dashboard (old timetable cached)
			const school1 = await getCachedSchool(schoolId, mockSupabase);
			expect(school1).toMatchObject({ timetable: oldTimetable });

			// Step 2: Admin updates timetable (invalidate cache)
			cacheState = 'invalidated';
			mockInvalidateCache.mockResolvedValue(undefined);
			await invalidateSchoolCache(schoolId);

			// Step 3: Next teacher load fetches fresh data
			cacheState = 'new';
			const school2 = await getCachedSchool(schoolId, mockSupabase);
			expect(school2).toMatchObject({ timetable: newTimetable });
		});
	});
});
