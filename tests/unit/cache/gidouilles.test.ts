import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

/**
 * Unit tests for Gidouilles Redis Cache Module
 * =============================================
 *
 * Tests the gidouilles cache module which caches ONLY gidouilles and vip_cards
 * data by class. Separated from student profile cache due to higher update frequency.
 *
 * Coverage:
 * - Cache hits and misses
 * - Test mode filtering
 * - Error handling (Redis failures, DB errors)
 * - Cache bypass option
 * - Cache invalidation (single and bulk)
 * - Security checks (teacher owns class)
 */

// Mock environment variables BEFORE importing modules
process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test_token_12345';

// Mock Redis
const mockRedis = {
	get: vi.fn(),
	setex: vi.fn(),
	keys: vi.fn(),
	del: vi.fn()
};

vi.mock('@upstash/redis', () => ({
	Redis: vi.fn(() => mockRedis)
}));

// Mock $app/environment
vi.mock('$app/environment', () => ({
	dev: false
}));

// Mock test-mode helper
const mockGetTeacherTestMode = vi.fn();
vi.mock('$lib/server/test-mode', () => ({
	getTeacherTestMode: mockGetTeacherTestMode
}));

// Import after mocking
const { getClassGidouilles, invalidateGidouillesCache, invalidateMultipleGidouillesCaches } =
	await import('$lib/server/cache/gidouilles');

// ============================================================================
// MOCK DATA
// ============================================================================

const mockTeacherId = '550e8400-e29b-41d4-a716-446655440000';
const mockClassId = '660e8400-e29b-41d4-a716-446655440001';
const mockClassId2 = '660e8400-e29b-41d4-a716-446655440002';

const mockStudent1 = {
	id: '770e8400-e29b-41d4-a716-446655440002',
	gidouilles: 100,
	vip_cards: { speed: 2, hint: 1 },
	is_test: false
};

const mockStudent2 = {
	id: '880e8400-e29b-41d4-a716-446655440003',
	gidouilles: 50,
	vip_cards: {},
	is_test: false
};

const mockTestStudent = {
	id: '990e8400-e29b-41d4-a716-446655440004',
	gidouilles: 200,
	vip_cards: { speed: 5 },
	is_test: true
};

const mockClassMembers = [
	{ student_id: mockStudent1.id, profiles: mockStudent1 },
	{ student_id: mockStudent2.id, profiles: mockStudent2 }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createMockSupabase(options?: {
	classExists?: boolean;
	members?: typeof mockClassMembers;
	error?: { message: string };
}): SupabaseClient<Database> {
	const classExists = options?.classExists ?? true;
	const members = options?.members ?? mockClassMembers;
	const error = options?.error ?? null;

	return {
		from: vi.fn((table: string) => {
			if (table === 'classes') {
				return {
					select: vi.fn(() => ({
						eq: vi.fn(() => ({
							eq: vi.fn(() => ({
								maybeSingle: vi.fn(() => ({
									data: classExists ? { id: mockClassId } : null,
									error: null
								}))
							}))
						}))
					}))
				};
			}

			if (table === 'class_members') {
				return {
					select: vi.fn(() => ({
						eq: vi.fn(() => ({
							eq: vi.fn(() => ({
								data: error ? null : members,
								error
							}))
						}))
					}))
				};
			}

			return { select: vi.fn() };
		})
	} as unknown as SupabaseClient<Database>;
}

// ============================================================================
// TESTS: getClassGidouilles - Happy Path
// ============================================================================

describe('getClassGidouilles - happy path', () => {
	let mockSupabase: SupabaseClient<Database>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockGetTeacherTestMode.mockResolvedValue(false); // Default: real students mode
		mockSupabase = createMockSupabase();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should fetch from database on cache miss', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null); // Cache miss
		vi.mocked(mockRedis.setex).mockResolvedValueOnce('OK');

		const result = await getClassGidouilles(mockClassId, mockTeacherId, mockSupabase);

		// Should verify class ownership
		expect(mockSupabase.from).toHaveBeenCalledWith('classes');

		// Should fetch gidouilles
		expect(mockSupabase.from).toHaveBeenCalledWith('class_members');

		// Should return gidouilles data
		expect(result).toEqual([
			{
				student_id: mockStudent1.id,
				gidouilles: 100,
				vip_cards: { speed: 2, hint: 1 }
			},
			{
				student_id: mockStudent2.id,
				gidouilles: 50,
				vip_cards: {}
			}
		]);

		// Should cache the result
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(mockRedis.setex).toHaveBeenCalledWith(
			`gidouilles:class:${mockClassId}:false`,
			300, // TTL (5 minutes)
			expect.any(Array)
		);
	});

	it('should return cached data on cache hit', async () => {
		const cachedData = [{ student_id: mockStudent1.id, gidouilles: 100, vip_cards: { speed: 2 } }];
		vi.mocked(mockRedis.get).mockResolvedValueOnce(cachedData);

		const result = await getClassGidouilles(mockClassId, mockTeacherId, mockSupabase);

		// Should return cached data
		expect(result).toEqual(cachedData);

		// Should NOT call DB
		expect(mockSupabase.from).not.toHaveBeenCalledWith('class_members');
	});

	it('should use correct cache key for test mode', async () => {
		mockGetTeacherTestMode.mockResolvedValueOnce(true); // Test mode enabled
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);
		vi.mocked(mockRedis.setex).mockResolvedValueOnce('OK');

		const mockTestMembers = [{ student_id: mockTestStudent.id, profiles: mockTestStudent }];
		mockSupabase = createMockSupabase({ members: mockTestMembers });

		await getClassGidouilles(mockClassId, mockTeacherId, mockSupabase);

		// Should use test mode cache key
		expect(mockRedis.get).toHaveBeenCalledWith(`gidouilles:class:${mockClassId}:true`);
	});

	it('should bypass cache when option provided', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce([
			{ student_id: mockStudent1.id, gidouilles: 999, vip_cards: {} }
		]); // Cached data exists

		const result = await getClassGidouilles(mockClassId, mockTeacherId, mockSupabase, {
			bypassCache: true
		});

		// Should NOT call Redis get
		expect(mockRedis.get).not.toHaveBeenCalled();

		// Should call DB
		expect(mockSupabase.from).toHaveBeenCalledWith('class_members');

		// Should return fresh data
		expect(result).toHaveLength(2);
		expect(result[0].gidouilles).toBe(100); // Fresh value, not 999
	});

	it('should handle zero gidouilles correctly', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);

		const membersWithZero = [
			{
				student_id: 'test-id',
				profiles: { id: 'test-id', gidouilles: 0, vip_cards: {}, is_test: false }
			}
		];

		mockSupabase = createMockSupabase({ members: membersWithZero });

		const result = await getClassGidouilles(mockClassId, mockTeacherId, mockSupabase);

		expect(result[0].gidouilles).toBe(0); // Should preserve 0, not default to 0
	});

	it('should handle null gidouilles as zero', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);

		const membersWithNullGidouilles = [
			{
				student_id: 'test-id',
				profiles: { id: 'test-id', gidouilles: null, vip_cards: null, is_test: false }
			}
		];

		mockSupabase = createMockSupabase({ members: membersWithNullGidouilles });

		const result = await getClassGidouilles(mockClassId, mockTeacherId, mockSupabase);

		expect(result[0].gidouilles).toBe(0);
		expect(result[0].vip_cards).toEqual({});
	});

	it('should handle empty class (no students)', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);

		mockSupabase = createMockSupabase({ members: [] });

		const result = await getClassGidouilles(mockClassId, mockTeacherId, mockSupabase);

		expect(result).toEqual([]);
	});
});

// ============================================================================
// TESTS: getClassGidouilles - Security
// ============================================================================

describe('getClassGidouilles - security', () => {
	let mockSupabase: SupabaseClient<Database>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockGetTeacherTestMode.mockResolvedValue(false);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should reject access if teacher does not own class', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);

		mockSupabase = createMockSupabase({ classExists: false });

		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(getClassGidouilles(mockClassId, mockTeacherId, mockSupabase)).rejects.toThrow(
			'You do not have permission to view this class'
		);

		expect(consoleSpy).toHaveBeenCalledWith(
			'[getClassGidouilles] Teacher does not own class:',
			mockClassId
		);

		consoleSpy.mockRestore();
	});

	it('should handle class ownership check errors', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);

		mockSupabase = {
			from: vi.fn((table: string) => {
				if (table === 'classes') {
					return {
						select: vi.fn(() => ({
							eq: vi.fn(() => ({
								eq: vi.fn(() => ({
									maybeSingle: vi.fn(() => ({
										data: null,
										error: { message: 'Database error', code: '500' }
									}))
								}))
							}))
						}))
					};
				}
				return { select: vi.fn() };
			})
		} as unknown as SupabaseClient<Database>;

		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(getClassGidouilles(mockClassId, mockTeacherId, mockSupabase)).rejects.toThrow(
			'Failed to verify class ownership'
		);

		consoleSpy.mockRestore();
	});
});

// ============================================================================
// TESTS: getClassGidouilles - Error Handling
// ============================================================================

describe('getClassGidouilles - error handling', () => {
	let mockSupabase: SupabaseClient<Database>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockGetTeacherTestMode.mockResolvedValue(false);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should handle Redis get errors gracefully', async () => {
		vi.mocked(mockRedis.get).mockRejectedValueOnce(new Error('Redis connection failed'));

		mockSupabase = createMockSupabase();

		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await getClassGidouilles(mockClassId, mockTeacherId, mockSupabase);

		// Should fallback to DB
		expect(mockSupabase.from).toHaveBeenCalledWith('class_members');
		expect(result).toHaveLength(2);

		consoleSpy.mockRestore();
	});

	it('should handle database fetch errors', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);

		mockSupabase = createMockSupabase({ error: { message: 'Database error' } });

		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(getClassGidouilles(mockClassId, mockTeacherId, mockSupabase)).rejects.toThrow(
			'Failed to fetch gidouilles'
		);

		consoleSpy.mockRestore();
	});

	it('should filter out null profiles', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);

		const membersWithNull = [
			{ student_id: mockStudent1.id, profiles: mockStudent1 },
			{ student_id: 'invalid-id', profiles: null }
		];

		mockSupabase = createMockSupabase({ members: membersWithNull });

		const result = await getClassGidouilles(mockClassId, mockTeacherId, mockSupabase);

		// Should only include valid profiles
		expect(result).toHaveLength(1);
		expect(result[0].student_id).toBe(mockStudent1.id);
	});

	it('should handle array profiles (Supabase join quirk)', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);

		// Supabase sometimes returns profiles as array
		const membersWithArrayProfiles = [{ student_id: mockStudent1.id, profiles: [mockStudent1] }];

		mockSupabase = createMockSupabase({ members: membersWithArrayProfiles });

		const result = await getClassGidouilles(mockClassId, mockTeacherId, mockSupabase);

		expect(result).toHaveLength(1);
		expect(result[0].student_id).toBe(mockStudent1.id);
	});

	it('should handle Redis setex errors (fire-and-forget)', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);
		vi.mocked(mockRedis.setex).mockRejectedValueOnce(new Error('Set failed'));

		mockSupabase = createMockSupabase();

		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await getClassGidouilles(mockClassId, mockTeacherId, mockSupabase);

		// Should still return data even if cache set fails
		expect(result).toHaveLength(2);

		// Wait for fire-and-forget to execute
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(consoleSpy).toHaveBeenCalledWith('[Cache] Failed to set:', expect.any(Error));

		consoleSpy.mockRestore();
	});
});

// ============================================================================
// TESTS: invalidateGidouillesCache
// ============================================================================

describe('invalidateGidouillesCache', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should invalidate both test modes for a class', async () => {
		vi.mocked(mockRedis.keys).mockResolvedValueOnce([
			`gidouilles:class:${mockClassId}:false`,
			`gidouilles:class:${mockClassId}:true`
		]);
		vi.mocked(mockRedis.del).mockResolvedValueOnce(2);

		await invalidateGidouillesCache(mockClassId);

		expect(mockRedis.keys).toHaveBeenCalledWith(`gidouilles:class:${mockClassId}:*`);
		expect(mockRedis.del).toHaveBeenCalledWith(
			`gidouilles:class:${mockClassId}:false`,
			`gidouilles:class:${mockClassId}:true`
		);
	});

	it('should handle no matching keys gracefully', async () => {
		vi.mocked(mockRedis.keys).mockResolvedValueOnce([]);

		await invalidateGidouillesCache(mockClassId);

		expect(mockRedis.del).not.toHaveBeenCalled();
	});

	it('should handle Redis errors gracefully', async () => {
		vi.mocked(mockRedis.keys).mockRejectedValueOnce(new Error('Redis error'));

		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		// Should not throw
		await expect(invalidateGidouillesCache(mockClassId)).resolves.not.toThrow();

		// invalidateCache logs with '[Cache] Failed to invalidate:'
		expect(consoleSpy).toHaveBeenCalledWith('[Cache] Failed to invalidate:', expect.any(Error));
		consoleSpy.mockRestore();
	});
});

// ============================================================================
// TESTS: invalidateMultipleGidouillesCaches
// ============================================================================

describe('invalidateMultipleGidouillesCaches', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should invalidate multiple class caches', async () => {
		// Mock keys for first class
		vi.mocked(mockRedis.keys).mockResolvedValueOnce([`gidouilles:class:${mockClassId}:false`]);
		vi.mocked(mockRedis.del).mockResolvedValueOnce(1);

		// Mock keys for second class
		vi.mocked(mockRedis.keys).mockResolvedValueOnce([`gidouilles:class:${mockClassId2}:true`]);
		vi.mocked(mockRedis.del).mockResolvedValueOnce(1);

		await invalidateMultipleGidouillesCaches([mockClassId, mockClassId2]);

		expect(mockRedis.keys).toHaveBeenCalledTimes(2);
		expect(mockRedis.keys).toHaveBeenCalledWith(`gidouilles:class:${mockClassId}:*`);
		expect(mockRedis.keys).toHaveBeenCalledWith(`gidouilles:class:${mockClassId2}:*`);
	});

	it('should handle empty class list', async () => {
		await invalidateMultipleGidouillesCaches([]);

		expect(mockRedis.keys).not.toHaveBeenCalled();
	});

	it('should handle partial failures gracefully', async () => {
		// First class succeeds
		vi.mocked(mockRedis.keys).mockResolvedValueOnce([`gidouilles:class:${mockClassId}:false`]);
		vi.mocked(mockRedis.del).mockResolvedValueOnce(1);

		// Second class fails
		vi.mocked(mockRedis.keys).mockRejectedValueOnce(new Error('Redis error'));

		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		// Should not throw, but log error
		await expect(
			invalidateMultipleGidouillesCaches([mockClassId, mockClassId2])
		).resolves.not.toThrow();

		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it('should handle Redis errors gracefully', async () => {
		vi.mocked(mockRedis.keys).mockRejectedValueOnce(new Error('Redis connection failed'));

		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		// Should not throw
		await expect(
			invalidateMultipleGidouillesCaches([mockClassId, mockClassId2])
		).resolves.not.toThrow();

		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});
});
