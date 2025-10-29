/**
 * Unit tests for Question Templates Redis Cache Module
 *
 * Tests Redis caching for published question templates used in
 * assessments and games.
 *
 * Coverage:
 * 1. Cache miss (fetch from database)
 * 2. Cache hit (return cached templates)
 * 3. Database error handling (fail-safe empty array)
 * 4. Status filter (only published templates)
 * 5. Cache invalidation (global, no ID required)
 * 6. TTL verification (600-second / 10-minute cache lifetime)
 * 7. Fail-safe error handling (return empty array on cache error)
 * 8. Global cache key (no user/school scope)
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
		TEMPLATES_PUBLISHED: () => 'cache:templates:published'
	},
	TTL: {
		TEMPLATES: 600 // 10 minutes
	}
}));

// Import after mocking
const { getCachedTemplates, invalidateTemplatesCache } = await import(
	'$lib/server/cache/templates'
);

describe('Templates Cache', () => {
	type QuestionTemplate = Database['public']['Tables']['question_templates']['Row'];

	// Mock Supabase client
	const createMockSupabase = () => {
		const mockSelect = vi.fn();
		const mockEq = vi.fn();

		return {
			from: vi.fn(() => ({
				select: mockSelect.mockReturnValue({
					eq: mockEq
				})
			})),
			_mockMethods: { mockSelect, mockEq }
		} as unknown as SupabaseClient<Database> & {
			_mockMethods: {
				mockSelect: ReturnType<typeof vi.fn>;
				mockEq: ReturnType<typeof vi.fn>;
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
		it('should fetch templates from database on cache miss', async () => {
			// Arrange
			const mockSupabase = createMockSupabase();
			const expectedTemplates: Partial<QuestionTemplate>[] = [
				{
					id: 'template-1',
					title: 'Algebra Problem',
					level: 4,
					status: 'published'
				},
				{
					id: 'template-2',
					title: 'Geometry Problem',
					level: 3,
					status: 'published'
				}
			];

			// Setup: Cache miss triggers fallback
			mockGetCached.mockImplementation(async (_key, _ttl, fallback) => {
				return await fallback();
			});

			mockSupabase._mockMethods.mockEq.mockResolvedValue({
				data: expectedTemplates,
				error: null
			});

			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			// Act
			const templates = await getCachedTemplates(mockSupabase);

			// Assert: Database queried correctly
			expect(mockSupabase.from).toHaveBeenCalledWith('question_templates');
			expect(mockSupabase._mockMethods.mockSelect).toHaveBeenCalledWith('*');
			expect(mockSupabase._mockMethods.mockEq).toHaveBeenCalledWith('status', 'published');

			// Assert: Templates returned
			expect(templates).toEqual(expectedTemplates);

			// Assert: Debug log fired
			expect(consoleSpy).toHaveBeenCalledWith('[getCachedTemplates] Fetching from DB');

			consoleSpy.mockRestore();
		});

		it('should filter by status=published only', async () => {
			// Arrange
			const mockSupabase = createMockSupabase();

			mockGetCached.mockImplementation(async (_key, _ttl, fallback) => {
				return await fallback();
			});

			mockSupabase._mockMethods.mockEq.mockResolvedValue({
				data: [],
				error: null
			});

			// Act
			await getCachedTemplates(mockSupabase);

			// Assert: Query filters by status='published' (draft templates excluded)
			expect(mockSupabase._mockMethods.mockEq).toHaveBeenCalledWith('status', 'published');
		});

		it('should return all template fields (*)', async () => {
			// Arrange
			const mockSupabase = createMockSupabase();
			const fullTemplate: Partial<QuestionTemplate> = {
				id: 'full-template',
				title: 'Full Template',
				level: 5,
				status: 'published',
				domain: 'algebra',
				grades: ['6eme', '5eme'],
				created_at: '2024-01-01T00:00:00Z'
			};

			mockGetCached.mockImplementation(async (_key, _ttl, fallback) => {
				return await fallback();
			});

			mockSupabase._mockMethods.mockEq.mockResolvedValue({
				data: [fullTemplate],
				error: null
			});

			// Act
			const templates = await getCachedTemplates(mockSupabase);

			// Assert: All fields returned
			expect(templates).toEqual([fullTemplate]);
			expect(mockSupabase._mockMethods.mockSelect).toHaveBeenCalledWith('*');
		});

		it('should handle empty result set', async () => {
			// Arrange
			const mockSupabase = createMockSupabase();

			mockGetCached.mockImplementation(async (_key, _ttl, fallback) => {
				return await fallback();
			});

			mockSupabase._mockMethods.mockEq.mockResolvedValue({
				data: [],
				error: null
			});

			// Act
			const templates = await getCachedTemplates(mockSupabase);

			// Assert: Empty array returned (no templates published)
			expect(templates).toEqual([]);
		});

		it('should handle null data gracefully', async () => {
			// Arrange
			const mockSupabase = createMockSupabase();

			mockGetCached.mockImplementation(async (_key, _ttl, fallback) => {
				return await fallback();
			});

			mockSupabase._mockMethods.mockEq.mockResolvedValue({
				data: null,
				error: null
			});

			// Act
			const templates = await getCachedTemplates(mockSupabase);

			// Assert: Null data treated as empty array
			expect(templates).toEqual([]);
		});
	});

	describe('Cache Hit - Return Cached Data', () => {
		it('should return cached templates on cache hit', async () => {
			// Arrange
			const mockSupabase = createMockSupabase();
			const cachedTemplates: Partial<QuestionTemplate>[] = [
				{ id: 'cached-1', title: 'Cached Template 1', level: 3, status: 'published' },
				{ id: 'cached-2', title: 'Cached Template 2', level: 4, status: 'published' }
			];

			// Setup: Cache hit returns data directly
			mockGetCached.mockResolvedValue(cachedTemplates);

			// Act
			const templates = await getCachedTemplates(mockSupabase);

			// Assert: Cached data returned
			expect(templates).toEqual(cachedTemplates);

			// Assert: Database NOT queried (cache hit)
			expect(mockSupabase.from).not.toHaveBeenCalled();
		});

		it('should use 600-second TTL (10 minutes)', async () => {
			// Arrange
			const mockSupabase = createMockSupabase();

			mockGetCached.mockResolvedValue([]);

			// Act
			await getCachedTemplates(mockSupabase);

			// Assert: TTL is 600 seconds (10 minutes)
			expect(mockGetCached).toHaveBeenCalledWith(
				expect.any(String),
				600, // TTL.TEMPLATES
				expect.any(Function)
			);
		});

		it('should use global cache key (no user/school scope)', async () => {
			// Arrange
			const mockSupabase = createMockSupabase();

			mockGetCached.mockResolvedValue([]);

			// Act
			await getCachedTemplates(mockSupabase);

			// Assert: Cache key is global (same for all users)
			expect(mockGetCached).toHaveBeenCalledWith(
				'cache:templates:published',
				600,
				expect.any(Function)
			);
		});

		it('should share cache across all users and endpoints', async () => {
			// Arrange: Simulate 3 different users/endpoints loading templates
			const mockSupabase1 = createMockSupabase();
			const mockSupabase2 = createMockSupabase();
			const mockSupabase3 = createMockSupabase();

			const cachedTemplates: Partial<QuestionTemplate>[] = [
				{ id: 'shared-1', title: 'Shared Template', level: 4, status: 'published' }
			];

			mockGetCached.mockResolvedValue(cachedTemplates);

			// Act: 3 concurrent requests from different contexts
			const [templates1, templates2, templates3] = await Promise.all([
				getCachedTemplates(mockSupabase1),
				getCachedTemplates(mockSupabase2),
				getCachedTemplates(mockSupabase3)
			]);

			// Assert: All get same cached data
			expect(templates1).toEqual(cachedTemplates);
			expect(templates2).toEqual(cachedTemplates);
			expect(templates3).toEqual(cachedTemplates);

			// Assert: getCached called 3 times (Redis checks)
			expect(mockGetCached).toHaveBeenCalledTimes(3);

			// Assert: Database NOT queried (all cache hits)
			expect(mockSupabase1.from).not.toHaveBeenCalled();
			expect(mockSupabase2.from).not.toHaveBeenCalled();
			expect(mockSupabase3.from).not.toHaveBeenCalled();
		});
	});

	describe('Database Error Handling', () => {
		it('should return empty array on database error (fail-safe)', async () => {
			// Arrange
			const mockSupabase = createMockSupabase();

			mockGetCached.mockImplementation(async (_key, _ttl, fallback) => {
				return await fallback();
			});

			mockSupabase._mockMethods.mockEq.mockResolvedValue({
				data: null,
				error: { message: 'Connection timeout', code: 'ECONNREFUSED' }
			});

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Act
			const templates = await getCachedTemplates(mockSupabase);

			// Assert: Returns empty array (fail-safe)
			expect(templates).toEqual([]);

			// Assert: Error logged
			expect(consoleSpy).toHaveBeenCalledWith(
				'[getCachedTemplates] Error fetching templates:',
				expect.objectContaining({ message: 'Connection timeout' })
			);

			consoleSpy.mockRestore();
		});

		it('should not throw on database error (fail-safe pattern)', async () => {
			// Arrange
			const mockSupabase = createMockSupabase();

			mockGetCached.mockImplementation(async (_key, _ttl, fallback) => {
				return await fallback();
			});

			mockSupabase._mockMethods.mockEq.mockResolvedValue({
				data: null,
				error: { message: 'Database unavailable' }
			});

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Act & Assert: Should NOT throw (fail-safe)
			await expect(getCachedTemplates(mockSupabase)).resolves.toEqual([]);

			consoleSpy.mockRestore();
		});
	});

	describe('Cache Error Handling', () => {
		it('should return empty array on cache error (fail-safe)', async () => {
			// Arrange
			const mockSupabase = createMockSupabase();

			// Simulate cache error (e.g., Redis connection failed)
			mockGetCached.mockRejectedValue(new Error('Redis connection failed'));

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Act
			const templates = await getCachedTemplates(mockSupabase);

			// Assert: Returns empty array instead of crashing
			expect(templates).toEqual([]);

			// Assert: Error logged
			expect(consoleSpy).toHaveBeenCalledWith(
				'[getCachedTemplates] Cache error, returning empty array:',
				expect.any(Error)
			);

			consoleSpy.mockRestore();
		});

		it('should not propagate cache errors to caller', async () => {
			// Arrange
			const mockSupabase = createMockSupabase();

			mockGetCached.mockRejectedValue(new Error('Cache explosion!'));

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Act & Assert: Should NOT throw (fail-safe)
			await expect(getCachedTemplates(mockSupabase)).resolves.toEqual([]);

			consoleSpy.mockRestore();
		});
	});

	describe('Cache Invalidation', () => {
		it('should invalidate templates cache globally', async () => {
			// Arrange
			mockInvalidateCache.mockResolvedValue(undefined);

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Act
			await invalidateTemplatesCache();

			// Assert: Global cache key invalidated
			expect(mockInvalidateCache).toHaveBeenCalledWith('cache:templates:published');

			consoleSpy.mockRestore();
		});

		it('should not require any ID parameter (global cache)', async () => {
			// Arrange
			mockInvalidateCache.mockResolvedValue(undefined);

			// Act: No parameters needed (global invalidation)
			await invalidateTemplatesCache();

			// Assert: Called with global key only
			expect(mockInvalidateCache).toHaveBeenCalledTimes(1);
			expect(mockInvalidateCache).toHaveBeenCalledWith('cache:templates:published');
		});

		it('should not throw on invalidation error (fail-safe)', async () => {
			// Arrange
			mockInvalidateCache.mockRejectedValue(new Error('Redis connection failed'));

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Act & Assert: Should not throw (fail-safe)
			await expect(invalidateTemplatesCache()).resolves.toBeUndefined();

			// Assert: Error logged but not thrown
			expect(consoleSpy).toHaveBeenCalledWith(
				'[invalidateTemplatesCache] Error:',
				expect.any(Error)
			);

			consoleSpy.mockRestore();
		});

		it('should affect all users globally after invalidation', async () => {
			// This test verifies that invalidation is truly global
			// (not scoped to a specific user or school)

			// Arrange
			const mockSupabase = createMockSupabase();
			let cacheState: 'before' | 'after' = 'before';

			const oldTemplates: Partial<QuestionTemplate>[] = [
				{ id: 'old-1', title: 'Old Template', status: 'published' }
			];

			const newTemplates: Partial<QuestionTemplate>[] = [
				{ id: 'old-1', title: 'Old Template', status: 'published' },
				{ id: 'new-1', title: 'Newly Published', status: 'published' }
			];

			mockGetCached.mockImplementation(async (_key, _ttl, fallback) => {
				if (cacheState === 'before') {
					return oldTemplates;
				} else {
					// After invalidation: refetch
					return await fallback();
				}
			});

			mockSupabase._mockMethods.mockEq.mockResolvedValue({
				data: newTemplates,
				error: null
			});

			// Step 1: User loads templates (old cache)
			const templates1 = await getCachedTemplates(mockSupabase);
			expect(templates1).toEqual(oldTemplates);

			// Step 2: Admin publishes new template (invalidate cache globally)
			cacheState = 'after';
			mockInvalidateCache.mockResolvedValue(undefined);
			await invalidateTemplatesCache();

			// Step 3: ALL users now see new templates (global cache)
			const templates2 = await getCachedTemplates(mockSupabase);
			expect(templates2).toEqual(newTemplates);
		});
	});

	describe('Integration Scenarios', () => {
		it('should cache templates after first fetch', async () => {
			// Arrange
			const mockSupabase = createMockSupabase();
			const templates: Partial<QuestionTemplate>[] = [
				{ id: 'integration-1', title: 'Integration Test', level: 4, status: 'published' }
			];

			let fetchCount = 0;
			mockGetCached.mockImplementation(async (_key, _ttl, fallback) => {
				if (fetchCount === 0) {
					// First call: cache miss
					fetchCount++;
					return await fallback();
				} else {
					// Subsequent calls: cache hit
					return templates;
				}
			});

			mockSupabase._mockMethods.mockEq.mockResolvedValue({
				data: templates,
				error: null
			});

			// Act: First call (cache miss)
			const result1 = await getCachedTemplates(mockSupabase);

			// Act: Second call (cache hit)
			vi.clearAllMocks(); // Clear DB mocks
			const result2 = await getCachedTemplates(mockSupabase);

			// Assert
			expect(result1).toEqual(templates);
			expect(result2).toEqual(templates);
			// Database called only once (first time)
			expect(mockSupabase.from).not.toHaveBeenCalled();
		});

		it('should handle publishing workflow', async () => {
			// This test simulates the real-world workflow:
			// 1. User loads templates (cached list)
			// 2. Admin publishes new templates
			// 3. Cache invalidated
			// 4. Next user sees updated list

			// Arrange
			const mockSupabase = createMockSupabase();

			const beforePublish: Partial<QuestionTemplate>[] = [
				{ id: 'existing-1', title: 'Existing Template', status: 'published' }
			];

			const afterPublish: Partial<QuestionTemplate>[] = [
				{ id: 'existing-1', title: 'Existing Template', status: 'published' },
				{ id: 'new-1', title: 'Newly Published Template', status: 'published' }
			];

			let cacheState: 'before' | 'invalidated' | 'after' = 'before';

			mockGetCached.mockImplementation(async (_key, _ttl, fallback) => {
				if (cacheState === 'before') {
					return beforePublish;
				} else if (cacheState === 'invalidated' || cacheState === 'after') {
					// After invalidation: refetch
					return await fallback();
				}
			});

			mockSupabase._mockMethods.mockEq.mockResolvedValue({
				data: afterPublish,
				error: null
			});

			// Step 1: User loads assessment creation page (old templates)
			const templates1 = await getCachedTemplates(mockSupabase);
			expect(templates1).toEqual(beforePublish);

			// Step 2: Admin publishes new templates (invalidate cache)
			cacheState = 'invalidated';
			mockInvalidateCache.mockResolvedValue(undefined);
			await invalidateTemplatesCache();

			// Step 3: Next user sees updated templates
			cacheState = 'after';
			const templates2 = await getCachedTemplates(mockSupabase);
			expect(templates2).toEqual(afterPublish);
			expect(templates2.length).toBe(2); // New template added
		});

		it('should handle large template datasets efficiently', async () => {
			// Arrange: Simulate 500 templates (1MB dataset)
			const mockSupabase = createMockSupabase();
			const largeDataset: Partial<QuestionTemplate>[] = Array.from({ length: 500 }, (_, i) => ({
				id: `template-${i}`,
				title: `Template ${i}`,
				level: (i % 5) + 1,
				status: 'published'
			}));

			mockGetCached.mockResolvedValue(largeDataset);

			// Act: Multiple users load templates
			const [result1, result2, result3] = await Promise.all([
				getCachedTemplates(mockSupabase),
				getCachedTemplates(mockSupabase),
				getCachedTemplates(mockSupabase)
			]);

			// Assert: All get same large dataset from cache
			expect(result1.length).toBe(500);
			expect(result2.length).toBe(500);
			expect(result3.length).toBe(500);

			// Assert: Database NOT queried (all cache hits)
			expect(mockSupabase.from).not.toHaveBeenCalled();
		});

		it('should degrade gracefully when cache and DB both fail', async () => {
			// Arrange: Both cache and database fail
			const mockSupabase = createMockSupabase();

			mockGetCached.mockRejectedValue(new Error('Redis down'));

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Act
			const templates = await getCachedTemplates(mockSupabase);

			// Assert: Returns empty array (fail-safe)
			// Better to show no templates than crash the page
			expect(templates).toEqual([]);

			consoleSpy.mockRestore();
		});
	});
});
