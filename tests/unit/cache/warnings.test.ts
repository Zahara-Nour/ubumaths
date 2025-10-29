import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { WarningType, Warning } from '$lib/server/cache/warnings';

/**
 * Unit tests for Student Warnings Redis Cache Module
 * ===================================================
 *
 * Tests the warnings cache module which caches warning counts by class
 * and academic period. Separated from student profile cache due to
 * period-based filtering.
 *
 * Coverage:
 * - Cache hits and misses
 * - Test mode filtering
 * - Warning aggregation logic
 * - Score calculation (20 - total warnings)
 * - Error handling (Redis failures, DB errors)
 * - Cache bypass option
 * - Cache invalidation (single class, all periods)
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

// Mock SvelteKit error function
vi.mock('@sveltejs/kit', () => ({
	error: (status: number, message: string) => {
		const err = new Error(message);
		(err as Error & { status: number }).status = status;
		return err;
	}
}));

// Import after mocking
const { getClassWarnings, invalidateWarningsCache, invalidateAllClassWarningsCaches } =
	await import('$lib/server/cache/warnings');

// ============================================================================
// MOCK DATA
// ============================================================================

const mockTeacherId = '550e8400-e29b-41d4-a716-446655440000';
const mockClassId = '660e8400-e29b-41d4-a716-446655440001';
const mockPeriodId = '770e8400-e29b-41d4-a716-446655440002';

const mockStudent1Id = '880e8400-e29b-41d4-a716-446655440003';
const mockStudent2Id = '990e8400-e29b-41d4-a716-446655440004';

const mockWarnings: Warning[] = [
	{
		id: 'warning-1',
		student_id: mockStudent1Id,
		class_id: mockClassId,
		academic_period_id: mockPeriodId,
		warning_type: 'C' as WarningType,
		created_by: mockTeacherId,
		created_at: '2024-01-01T10:00:00Z',
		updated_at: '2024-01-01T10:00:00Z'
	},
	{
		id: 'warning-2',
		student_id: mockStudent1Id,
		class_id: mockClassId,
		academic_period_id: mockPeriodId,
		warning_type: 'M' as WarningType,
		created_by: mockTeacherId,
		created_at: '2024-01-01T11:00:00Z',
		updated_at: '2024-01-01T11:00:00Z'
	},
	{
		id: 'warning-3',
		student_id: mockStudent2Id,
		class_id: mockClassId,
		academic_period_id: mockPeriodId,
		warning_type: 'T' as WarningType,
		created_by: mockTeacherId,
		created_at: '2024-01-01T12:00:00Z',
		updated_at: '2024-01-01T12:00:00Z'
	}
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createMockSupabase(options?: {
	classExists?: boolean;
	warnings?: Warning[] | null;
	warningsError?: { message: string };
	classError?: { message: string };
}): SupabaseClient<Database> {
	const classExists = options?.classExists ?? true;
	const warnings = options?.warnings !== undefined ? options.warnings : mockWarnings;
	const warningsError = options?.warningsError ?? null;
	const classError = options?.classError ?? null;

	return {
		from: vi.fn((table: string) => {
			if (table === 'classes') {
				return {
					select: vi.fn(() => ({
						eq: vi.fn(() => ({
							eq: vi.fn(() => ({
								maybeSingle: vi.fn(() => ({
									data: classExists ? { id: mockClassId } : null,
									error: classError
								}))
							}))
						}))
					}))
				};
			}

			if (table === 'student_warnings') {
				return {
					select: vi.fn(() => ({
						eq: vi.fn(() => ({
							eq: vi.fn(() => ({
								order: vi.fn(() => ({
									data: warningsError ? null : warnings,
									error: warningsError
								}))
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
// TESTS: getClassWarnings - Happy Path
// ============================================================================

describe('getClassWarnings - happy path', () => {
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

		const result = await getClassWarnings(mockClassId, mockPeriodId, mockTeacherId, mockSupabase);

		// Should verify class ownership
		expect(mockSupabase.from).toHaveBeenCalledWith('classes');

		// Should fetch warnings
		expect(mockSupabase.from).toHaveBeenCalledWith('student_warnings');

		// Should return Map with aggregated warnings
		expect(result).toBeInstanceOf(Map);
		expect(result.size).toBe(2); // Two students with warnings

		// Verify student 1 warnings (C + M = 2 total, score = 18)
		const student1Data = result.get(mockStudent1Id);
		expect(student1Data).toMatchObject({
			C: 1,
			M: 1,
			R: 0,
			T: 0,
			total: 2,
			score: 18
		});
		expect(student1Data?.warnings).toHaveLength(2);

		// Verify student 2 warnings (T = 1 total, score = 19)
		const student2Data = result.get(mockStudent2Id);
		expect(student2Data).toMatchObject({
			C: 0,
			M: 0,
			R: 0,
			T: 1,
			total: 1,
			score: 19
		});
		expect(student2Data?.warnings).toHaveLength(1);

		// Should cache the result
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(mockRedis.setex).toHaveBeenCalledWith(
			`warnings:class:${mockClassId}:period:${mockPeriodId}:false`,
			180, // TTL (3 minutes)
			expect.any(Map)
		);
	});

	it('should return cached data on cache hit', async () => {
		const cachedMap = new Map();
		cachedMap.set(mockStudent1Id, {
			C: 1,
			M: 0,
			R: 0,
			T: 0,
			total: 1,
			score: 19,
			warnings: [mockWarnings[0]]
		});

		vi.mocked(mockRedis.get).mockResolvedValueOnce(cachedMap);

		const result = await getClassWarnings(mockClassId, mockPeriodId, mockTeacherId, mockSupabase);

		// Should return cached data
		expect(result).toEqual(cachedMap);

		// Should NOT call DB
		expect(mockSupabase.from).not.toHaveBeenCalledWith('student_warnings');
	});

	it('should use correct cache key for test mode', async () => {
		mockGetTeacherTestMode.mockResolvedValueOnce(true); // Test mode enabled
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);
		vi.mocked(mockRedis.setex).mockResolvedValueOnce('OK');

		await getClassWarnings(mockClassId, mockPeriodId, mockTeacherId, mockSupabase);

		// Should use test mode cache key
		expect(mockRedis.get).toHaveBeenCalledWith(
			`warnings:class:${mockClassId}:period:${mockPeriodId}:true`
		);
	});

	it('should bypass cache when option provided', async () => {
		const cachedMap = new Map();
		cachedMap.set(mockStudent1Id, {
			C: 999,
			M: 0,
			R: 0,
			T: 0,
			total: 999,
			score: -979,
			warnings: []
		});
		vi.mocked(mockRedis.get).mockResolvedValueOnce(cachedMap); // Cached data exists

		const result = await getClassWarnings(mockClassId, mockPeriodId, mockTeacherId, mockSupabase, {
			bypassCache: true
		});

		// Should NOT call Redis get
		expect(mockRedis.get).not.toHaveBeenCalled();

		// Should call DB
		expect(mockSupabase.from).toHaveBeenCalledWith('student_warnings');

		// Should return fresh data
		expect(result.size).toBe(2);
		const student1Data = result.get(mockStudent1Id);
		expect(student1Data?.total).toBe(2); // Fresh value, not 999
	});

	it('should handle empty warnings (no warnings for class/period)', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);

		mockSupabase = createMockSupabase({ warnings: [] });

		const result = await getClassWarnings(mockClassId, mockPeriodId, mockTeacherId, mockSupabase);

		expect(result).toBeInstanceOf(Map);
		expect(result.size).toBe(0);
	});

	it('should handle null warnings from database', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);
		vi.mocked(mockRedis.setex).mockResolvedValueOnce('OK');

		mockSupabase = createMockSupabase({ warnings: null as unknown as Warning[] });

		const result = await getClassWarnings(mockClassId, mockPeriodId, mockTeacherId, mockSupabase);

		expect(result).toBeInstanceOf(Map);
		expect(result.size).toBe(0);
	});
});

// ============================================================================
// TESTS: getClassWarnings - Warning Aggregation Logic
// ============================================================================

describe('getClassWarnings - aggregation logic', () => {
	let mockSupabase: SupabaseClient<Database>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockGetTeacherTestMode.mockResolvedValue(false);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should aggregate multiple warnings of same type', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);

		const multipleWarnings: Warning[] = [
			{ ...mockWarnings[0], id: 'w1', warning_type: 'C' },
			{ ...mockWarnings[0], id: 'w2', warning_type: 'C' },
			{ ...mockWarnings[0], id: 'w3', warning_type: 'C' }
		];

		mockSupabase = createMockSupabase({ warnings: multipleWarnings });

		const result = await getClassWarnings(mockClassId, mockPeriodId, mockTeacherId, mockSupabase);

		const studentData = result.get(mockStudent1Id);
		expect(studentData?.C).toBe(3);
		expect(studentData?.total).toBe(3);
		expect(studentData?.score).toBe(17); // 20 - 3
	});

	it('should calculate score correctly (20 - total)', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);

		const warnings: Warning[] = [
			{ ...mockWarnings[0], id: 'w1', warning_type: 'C' },
			{ ...mockWarnings[0], id: 'w2', warning_type: 'M' },
			{ ...mockWarnings[0], id: 'w3', warning_type: 'R' },
			{ ...mockWarnings[0], id: 'w4', warning_type: 'T' },
			{ ...mockWarnings[0], id: 'w5', warning_type: 'C' }
		];

		mockSupabase = createMockSupabase({ warnings });

		const result = await getClassWarnings(mockClassId, mockPeriodId, mockTeacherId, mockSupabase);

		const studentData = result.get(mockStudent1Id);
		expect(studentData?.total).toBe(5);
		expect(studentData?.score).toBe(15); // 20 - 5
	});

	it('should clamp score to minimum 0', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);

		// Create 25 warnings (total > 20)
		const manyWarnings: Warning[] = Array.from({ length: 25 }, (_, i) => ({
			...mockWarnings[0],
			id: `warning-${i}`,
			warning_type: 'C' as WarningType
		}));

		mockSupabase = createMockSupabase({ warnings: manyWarnings });

		const result = await getClassWarnings(mockClassId, mockPeriodId, mockTeacherId, mockSupabase);

		const studentData = result.get(mockStudent1Id);
		expect(studentData?.total).toBe(25);
		expect(studentData?.score).toBe(0); // Clamped to 0, not -5
	});

	it('should handle all warning types (C, M, R, T)', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);

		const allTypesWarnings: Warning[] = [
			{ ...mockWarnings[0], id: 'w1', warning_type: 'C' },
			{ ...mockWarnings[0], id: 'w2', warning_type: 'M' },
			{ ...mockWarnings[0], id: 'w3', warning_type: 'R' },
			{ ...mockWarnings[0], id: 'w4', warning_type: 'T' },
			{ ...mockWarnings[0], id: 'w5', warning_type: 'C' },
			{ ...mockWarnings[0], id: 'w6', warning_type: 'M' }
		];

		mockSupabase = createMockSupabase({ warnings: allTypesWarnings });

		const result = await getClassWarnings(mockClassId, mockPeriodId, mockTeacherId, mockSupabase);

		const studentData = result.get(mockStudent1Id);
		expect(studentData).toMatchObject({
			C: 2,
			M: 2,
			R: 1,
			T: 1,
			total: 6,
			score: 14
		});
	});

	it('should preserve all warning details in warnings array', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);

		mockSupabase = createMockSupabase({ warnings: mockWarnings.slice(0, 2) });

		const result = await getClassWarnings(mockClassId, mockPeriodId, mockTeacherId, mockSupabase);

		const studentData = result.get(mockStudent1Id);
		expect(studentData?.warnings).toHaveLength(2);
		expect(studentData?.warnings[0]).toMatchObject({
			id: 'warning-1',
			warning_type: 'C',
			created_at: '2024-01-01T10:00:00Z'
		});
	});
});

// ============================================================================
// TESTS: getClassWarnings - Security
// ============================================================================

describe('getClassWarnings - security', () => {
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

		await expect(
			getClassWarnings(mockClassId, mockPeriodId, mockTeacherId, mockSupabase)
		).rejects.toThrow('You do not have permission to view warnings for this class');

		expect(consoleSpy).toHaveBeenCalledWith(
			'[getClassWarnings] Teacher does not own class:',
			mockClassId
		);

		consoleSpy.mockRestore();
	});

	it('should handle class ownership check errors', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);

		mockSupabase = createMockSupabase({
			classError: { message: 'Database error' }
		});

		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(
			getClassWarnings(mockClassId, mockPeriodId, mockTeacherId, mockSupabase)
		).rejects.toThrow('Failed to verify class ownership');

		consoleSpy.mockRestore();
	});
});

// ============================================================================
// TESTS: getClassWarnings - Error Handling
// ============================================================================

describe('getClassWarnings - error handling', () => {
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

		const result = await getClassWarnings(mockClassId, mockPeriodId, mockTeacherId, mockSupabase);

		// Should fallback to DB
		expect(mockSupabase.from).toHaveBeenCalledWith('student_warnings');
		expect(result.size).toBe(2);

		consoleSpy.mockRestore();
	});

	it('should handle database fetch errors', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);

		mockSupabase = createMockSupabase({
			warningsError: { message: 'Database error' }
		});

		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(
			getClassWarnings(mockClassId, mockPeriodId, mockTeacherId, mockSupabase)
		).rejects.toThrow('Failed to fetch warnings');

		consoleSpy.mockRestore();
	});

	it('should handle Redis setex errors (fire-and-forget)', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);
		vi.mocked(mockRedis.setex).mockRejectedValueOnce(new Error('Set failed'));

		mockSupabase = createMockSupabase();

		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await getClassWarnings(mockClassId, mockPeriodId, mockTeacherId, mockSupabase);

		// Should still return data even if cache set fails
		expect(result.size).toBe(2);

		// Wait for fire-and-forget to execute
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(consoleSpy).toHaveBeenCalledWith('[Cache] Failed to set:', expect.any(Error));

		consoleSpy.mockRestore();
	});
});

// ============================================================================
// TESTS: invalidateWarningsCache
// ============================================================================

describe('invalidateWarningsCache', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should invalidate both test modes for a class and period', async () => {
		vi.mocked(mockRedis.keys).mockResolvedValueOnce([
			`warnings:class:${mockClassId}:period:${mockPeriodId}:false`,
			`warnings:class:${mockClassId}:period:${mockPeriodId}:true`
		]);
		vi.mocked(mockRedis.del).mockResolvedValueOnce(2);

		await invalidateWarningsCache(mockClassId, mockPeriodId);

		expect(mockRedis.keys).toHaveBeenCalledWith(
			`warnings:class:${mockClassId}:period:${mockPeriodId}:*`
		);
		expect(mockRedis.del).toHaveBeenCalledWith(
			`warnings:class:${mockClassId}:period:${mockPeriodId}:false`,
			`warnings:class:${mockClassId}:period:${mockPeriodId}:true`
		);
	});

	it('should handle no matching keys gracefully', async () => {
		vi.mocked(mockRedis.keys).mockResolvedValueOnce([]);

		await invalidateWarningsCache(mockClassId, mockPeriodId);

		expect(mockRedis.del).not.toHaveBeenCalled();
	});

	it('should handle Redis errors gracefully', async () => {
		vi.mocked(mockRedis.keys).mockRejectedValueOnce(new Error('Redis error'));

		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		// Should not throw
		await expect(invalidateWarningsCache(mockClassId, mockPeriodId)).resolves.not.toThrow();

		// invalidateCache logs with '[Cache] Failed to invalidate:'
		expect(consoleSpy).toHaveBeenCalledWith('[Cache] Failed to invalidate:', expect.any(Error));
		consoleSpy.mockRestore();
	});
});

// ============================================================================
// TESTS: invalidateAllClassWarningsCaches
// ============================================================================

describe('invalidateAllClassWarningsCaches', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should invalidate all periods and test modes for a class', async () => {
		vi.mocked(mockRedis.keys).mockResolvedValueOnce([
			`warnings:class:${mockClassId}:period:${mockPeriodId}:false`,
			`warnings:class:${mockClassId}:period:${mockPeriodId}:true`,
			`warnings:class:${mockClassId}:period:another-period:false`
		]);
		vi.mocked(mockRedis.del).mockResolvedValueOnce(3);

		await invalidateAllClassWarningsCaches(mockClassId);

		expect(mockRedis.keys).toHaveBeenCalledWith(`warnings:class:${mockClassId}:*`);
		expect(mockRedis.del).toHaveBeenCalledWith(
			`warnings:class:${mockClassId}:period:${mockPeriodId}:false`,
			`warnings:class:${mockClassId}:period:${mockPeriodId}:true`,
			`warnings:class:${mockClassId}:period:another-period:false`
		);
	});

	it('should handle no matching keys gracefully', async () => {
		vi.mocked(mockRedis.keys).mockResolvedValueOnce([]);

		await invalidateAllClassWarningsCaches(mockClassId);

		expect(mockRedis.del).not.toHaveBeenCalled();
	});

	it('should handle Redis errors gracefully', async () => {
		vi.mocked(mockRedis.keys).mockRejectedValueOnce(new Error('Redis connection failed'));

		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		// Should not throw
		await expect(invalidateAllClassWarningsCaches(mockClassId)).resolves.not.toThrow();

		// invalidateCache logs with '[Cache] Failed to invalidate:'
		expect(consoleSpy).toHaveBeenCalledWith('[Cache] Failed to invalidate:', expect.any(Error));
		consoleSpy.mockRestore();
	});
});
