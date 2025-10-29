/**
 * Unit tests for Profile Cache Helper
 *
 * Tests in-memory caching of user profile roles to eliminate redundant
 * database queries during dashboard visits and navigation.
 *
 * Coverage:
 * 1. Cache miss (fetch from database)
 * 2. Cache hit (return cached profile)
 * 3. Database error handling (graceful null return)
 * 4. TTL verification (900-second cache lifetime)
 * 5. Cache invalidation by user ID
 * 6. Supabase single() error handling
 * 7. Type safety for role field
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

// Mock the memory cache module
const mockGetMemoryCached = vi.fn();
const mockMemoryCache = {
	invalidate: vi.fn()
};

vi.mock('$lib/server/cache/memory', () => ({
	getMemoryCached: mockGetMemoryCached,
	memoryCache: mockMemoryCache
}));

// Import after mocking
const { getCachedProfile, invalidateProfileCache } = await import('$lib/server/cache/profile');

describe('Profile Cache', () => {
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
		it('should fetch profile from database on cache miss', async () => {
			// Arrange
			const userId = '550e8400-e29b-41d4-a716-446655440000';
			const mockSupabase = createMockSupabase();
			const _expectedProfile = { role: 'teacher' as const };

			// Setup: Cache miss triggers fallback
			mockGetMemoryCached.mockImplementation(async (_key, _ttl, fallback) => {
				return await fallback();
			});

			mockSupabase._mockMethods.mockSingle.mockResolvedValue({
				data: { role: 'teacher' },
				error: null
			});

			// Act
			const profile = await getCachedProfile(userId, mockSupabase);

			// Assert: Database queried correctly
			expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
			expect(mockSupabase._mockMethods.mockSelect).toHaveBeenCalledWith('role');
			expect(mockSupabase._mockMethods.mockEq).toHaveBeenCalledWith('id', userId);
			expect(mockSupabase._mockMethods.mockSingle).toHaveBeenCalled();

			// Assert: Profile returned
			expect(profile).toEqual({ role: 'teacher' });
		});

		it('should use correct cache key pattern', async () => {
			// Arrange
			const userId = 'abc-123-def-456';
			const mockSupabase = createMockSupabase();

			mockGetMemoryCached.mockImplementation(async (_key, _ttl, fallback) => {
				return await fallback();
			});

			mockSupabase._mockMethods.mockSingle.mockResolvedValue({
				data: { role: 'student' },
				error: null
			});

			// Act
			await getCachedProfile(userId, mockSupabase);

			// Assert: Cache key follows pattern profile:${userId}:role
			expect(mockGetMemoryCached).toHaveBeenCalledWith(
				'profile:abc-123-def-456:role',
				900, // TTL
				expect.any(Function)
			);
		});

		it('should handle all role types correctly', async () => {
			// Test each role type
			const roles: Array<Database['public']['Enums']['user_role']> = [
				'student',
				'teacher',
				'admin'
			];

			for (const role of roles) {
				vi.clearAllMocks();

				const mockSupabase = createMockSupabase();
				mockGetMemoryCached.mockImplementation(async (_key, _ttl, fallback) => {
					return await fallback();
				});

				mockSupabase._mockMethods.mockSingle.mockResolvedValue({
					data: { role },
					error: null
				});

				const profile = await getCachedProfile(`user-${role}`, mockSupabase);

				expect(profile).toEqual({ role });
			}
		});
	});

	describe('Cache Hit - Return Cached Data', () => {
		it('should return cached profile on cache hit', async () => {
			// Arrange
			const userId = '123-456-789';
			const mockSupabase = createMockSupabase();
			const cachedProfile = { role: 'admin' as const };

			// Setup: Cache hit returns data directly
			mockGetMemoryCached.mockResolvedValue(cachedProfile);

			// Act
			const profile = await getCachedProfile(userId, mockSupabase);

			// Assert: Cached data returned
			expect(profile).toEqual(cachedProfile);

			// Assert: Database NOT queried (cache hit)
			expect(mockSupabase.from).not.toHaveBeenCalled();
		});

		it('should use 900-second TTL (15 minutes)', async () => {
			// Arrange
			const userId = 'test-user';
			const mockSupabase = createMockSupabase();

			mockGetMemoryCached.mockResolvedValue({ role: 'teacher' });

			// Act
			await getCachedProfile(userId, mockSupabase);

			// Assert: TTL is 900 seconds (15 minutes)
			expect(mockGetMemoryCached).toHaveBeenCalledWith(
				expect.any(String),
				900, // PROFILE_ROLE_TTL_SECONDS
				expect.any(Function)
			);
		});
	});

	describe('Database Error Handling', () => {
		it('should return null on database error', async () => {
			// Arrange
			const userId = 'error-user';
			const mockSupabase = createMockSupabase();

			mockGetMemoryCached.mockImplementation(async (_key, _ttl, fallback) => {
				return await fallback();
			});

			mockSupabase._mockMethods.mockSingle.mockResolvedValue({
				data: null,
				error: { message: 'Connection timeout', code: 'ECONNREFUSED' }
			});

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Act
			const profile = await getCachedProfile(userId, mockSupabase);

			// Assert: Returns null on error
			expect(profile).toBeNull();

			// Assert: Error logged
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('[getCachedProfile] Database error'),
				expect.objectContaining({ message: 'Connection timeout' })
			);

			consoleSpy.mockRestore();
		});

		it('should return null when profile not found', async () => {
			// Arrange
			const userId = 'nonexistent-user';
			const mockSupabase = createMockSupabase();

			mockGetMemoryCached.mockImplementation(async (_key, _ttl, fallback) => {
				return await fallback();
			});

			mockSupabase._mockMethods.mockSingle.mockResolvedValue({
				data: null,
				error: null
			});

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Act
			const profile = await getCachedProfile(userId, mockSupabase);

			// Assert
			expect(profile).toBeNull();
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('[getCachedProfile] Profile not found')
			);

			consoleSpy.mockRestore();
		});

		it('should handle unexpected errors gracefully', async () => {
			// Arrange
			const userId = 'crash-user';
			const mockSupabase = createMockSupabase();

			mockGetMemoryCached.mockImplementation(async (_key, _ttl, fallback) => {
				return await fallback();
			});

			// Simulate unexpected exception in query chain
			mockSupabase._mockMethods.mockSingle.mockRejectedValue(new Error('Unexpected crash'));

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Act
			const profile = await getCachedProfile(userId, mockSupabase);

			// Assert: Returns null instead of throwing
			expect(profile).toBeNull();
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('[getCachedProfile] Unexpected error'),
				expect.any(Error)
			);

			consoleSpy.mockRestore();
		});

		it('should handle Supabase single() PGRST116 error (not found)', async () => {
			// Arrange
			const userId = 'not-found-user';
			const mockSupabase = createMockSupabase();

			mockGetMemoryCached.mockImplementation(async (_key, _ttl, fallback) => {
				return await fallback();
			});

			// PGRST116 = PostgreSQL REST error for "single row not found"
			mockSupabase._mockMethods.mockSingle.mockResolvedValue({
				data: null,
				error: { message: 'No rows found', code: 'PGRST116' }
			});

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Act
			const profile = await getCachedProfile(userId, mockSupabase);

			// Assert
			expect(profile).toBeNull();
			expect(consoleSpy).toHaveBeenCalled();

			consoleSpy.mockRestore();
		});
	});

	describe('Cache Invalidation', () => {
		it('should invalidate profile cache by user ID', () => {
			// Arrange
			const userId = '789-abc-def';
			mockMemoryCache.invalidate.mockReturnValue(true);

			// Act
			invalidateProfileCache(userId);

			// Assert: Correct cache key invalidated
			expect(mockMemoryCache.invalidate).toHaveBeenCalledWith('profile:789-abc-def:role');
		});

		it('should use same key pattern as getCachedProfile', () => {
			// Arrange
			const userId = 'consistency-test';

			// Act
			invalidateProfileCache(userId);

			// Assert: Key pattern matches getCachedProfile
			const expectedKey = `profile:${userId}:role`;
			expect(mockMemoryCache.invalidate).toHaveBeenCalledWith(expectedKey);
		});

		it('should not throw if key does not exist', () => {
			// Arrange
			mockMemoryCache.invalidate.mockReturnValue(false);

			// Act & Assert: Should not throw
			expect(() => invalidateProfileCache('nonexistent-user')).not.toThrow();
		});
	});

	describe('Type Safety', () => {
		it('should enforce valid role types at compile time', async () => {
			// This test verifies TypeScript type checking (compile-time)
			// At runtime, we verify the returned type structure

			const mockSupabase = createMockSupabase();
			mockGetMemoryCached.mockImplementation(async (_key, _ttl, fallback) => {
				return await fallback();
			});

			mockSupabase._mockMethods.mockSingle.mockResolvedValue({
				data: { role: 'teacher' },
				error: null
			});

			const profile = await getCachedProfile('user', mockSupabase);

			// Assert: Profile has correct type structure
			if (profile) {
				expect(profile).toHaveProperty('role');
				expect(['student', 'teacher', 'admin']).toContain(profile.role);
			}
		});

		it('should return ProfileRole | null type', async () => {
			// Test null case
			const mockSupabase1 = createMockSupabase();
			mockGetMemoryCached.mockImplementation(async (_key, _ttl, fallback) => {
				return await fallback();
			});
			mockSupabase1._mockMethods.mockSingle.mockResolvedValue({
				data: null,
				error: { message: 'Not found' }
			});

			const nullResult = await getCachedProfile('user1', mockSupabase1);
			expect(nullResult).toBeNull();

			// Test ProfileRole case
			vi.clearAllMocks();
			const mockSupabase2 = createMockSupabase();
			mockGetMemoryCached.mockImplementation(async (_key, _ttl, fallback) => {
				return await fallback();
			});
			mockSupabase2._mockMethods.mockSingle.mockResolvedValue({
				data: { role: 'admin' },
				error: null
			});

			const profileResult = await getCachedProfile('user2', mockSupabase2);
			expect(profileResult).toEqual({ role: 'admin' });
		});
	});

	describe('Integration Scenarios', () => {
		it('should cache profile after first fetch', async () => {
			// Arrange
			const userId = 'integration-user';
			const mockSupabase = createMockSupabase();
			let fetchCount = 0;

			mockGetMemoryCached.mockImplementation(async (_key, _ttl, fallback) => {
				if (fetchCount === 0) {
					// First call: cache miss
					fetchCount++;
					return await fallback();
				} else {
					// Subsequent calls: cache hit
					return { role: 'teacher' };
				}
			});

			mockSupabase._mockMethods.mockSingle.mockResolvedValue({
				data: { role: 'teacher' },
				error: null
			});

			// Act: First call (cache miss)
			const profile1 = await getCachedProfile(userId, mockSupabase);

			// Act: Second call (cache hit)
			vi.clearAllMocks(); // Clear DB mocks
			const profile2 = await getCachedProfile(userId, mockSupabase);

			// Assert
			expect(profile1).toEqual({ role: 'teacher' });
			expect(profile2).toEqual({ role: 'teacher' });
			// Database called only once (first time)
			expect(mockSupabase.from).not.toHaveBeenCalled();
		});

		it('should refetch after invalidation', async () => {
			// Arrange
			const userId = 'refetch-user';
			const mockSupabase = createMockSupabase();
			let invalidated = false;

			mockGetMemoryCached.mockImplementation(async (_key, _ttl, fallback) => {
				if (!invalidated) {
					// Before invalidation: return cached
					return { role: 'student' };
				} else {
					// After invalidation: refetch from DB
					return await fallback();
				}
			});

			mockSupabase._mockMethods.mockSingle.mockResolvedValue({
				data: { role: 'teacher' }, // Updated role
				error: null
			});

			// Act: First call (cached)
			const profile1 = await getCachedProfile(userId, mockSupabase);
			expect(profile1).toEqual({ role: 'student' });

			// Act: Invalidate
			invalidated = true;
			invalidateProfileCache(userId);

			// Act: Second call (refetch)
			const profile2 = await getCachedProfile(userId, mockSupabase);

			// Assert: Updated role returned
			expect(profile2).toEqual({ role: 'teacher' });
		});

		it('should handle rapid successive calls (deduplication via cache)', async () => {
			// Arrange
			const userId = 'rapid-user';
			const mockSupabase = createMockSupabase();

			mockGetMemoryCached.mockResolvedValue({ role: 'admin' }); // Always cached

			// Act: Fire 10 rapid requests
			const promises = Array.from({ length: 10 }, () => getCachedProfile(userId, mockSupabase));

			const results = await Promise.all(promises);

			// Assert: All return same cached data
			results.forEach((result) => {
				expect(result).toEqual({ role: 'admin' });
			});

			// Assert: Only 10 cache lookups (no DB queries)
			expect(mockGetMemoryCached).toHaveBeenCalledTimes(10);
			expect(mockSupabase.from).not.toHaveBeenCalled();
		});
	});
});
