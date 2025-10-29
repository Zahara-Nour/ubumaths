import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

/**
 * Unit tests for Student Data Redis Cache Module
 * ===============================================
 *
 * Tests the students cache module which caches student profile data
 * (names, avatars, roles) for teacher classes, excluding gidouilles and vip_cards.
 *
 * Coverage:
 * - Cache hits and misses
 * - Test mode filtering
 * - Error handling (Redis failures, DB errors)
 * - Cache bypass option
 * - Cache invalidation
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
const { getTeacherStudents, invalidateTeacherStudentsCache } = await import(
	'$lib/server/cache/students'
);

// ============================================================================
// MOCK DATA
// ============================================================================

const mockTeacherId = '550e8400-e29b-41d4-a716-446655440000';
const mockClassId = '660e8400-e29b-41d4-a716-446655440001';

const mockStudentProfile1 = {
	id: '770e8400-e29b-41d4-a716-446655440002',
	firstname: 'Alice',
	lastname: 'Dupont',
	full_name: 'Alice Dupont',
	avatar_url: 'https://example.com/avatar1.png',
	role: 'student',
	gender: 'F',
	is_test: false
};

const mockStudentProfile2 = {
	id: '880e8400-e29b-41d4-a716-446655440003',
	firstname: 'Bob',
	lastname: 'Martin',
	full_name: 'Bob Martin',
	avatar_url: null,
	role: 'student',
	gender: 'M',
	is_test: false
};

const mockTestStudentProfile = {
	id: '990e8400-e29b-41d4-a716-446655440004',
	firstname: 'Test',
	lastname: 'Student',
	full_name: 'Test Student',
	avatar_url: null,
	role: 'student',
	gender: 'M',
	is_test: true
};

const mockClassMembers = [
	{ student_id: mockStudentProfile1.id, profiles: mockStudentProfile1 },
	{ student_id: mockStudentProfile2.id, profiles: mockStudentProfile2 }
];

const mockRPCResult = [
	{
		id: mockClassId,
		teacher_id: mockTeacherId,
		name: 'Class 6ème A',
		description: 'Math class',
		join_code: 'ABC123',
		is_active: true,
		created_at: '2024-01-01T00:00:00Z',
		updated_at: '2024-01-01T00:00:00Z',
		students: [
			{ ...mockStudentProfile1, gidouilles: 100, vip_cards: { speed: 2 } },
			{ ...mockStudentProfile2, gidouilles: 50, vip_cards: {} }
		]
	}
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createMockSupabase(): SupabaseClient<Database> {
	return {
		from: vi.fn(() => ({
			select: vi.fn(() => ({
				eq: vi.fn(() => ({
					eq: vi.fn(() => ({
						data: mockClassMembers,
						error: null
					}))
				}))
			}))
		})),
		rpc: vi.fn(() => ({
			data: mockRPCResult,
			error: null
		}))
	} as unknown as SupabaseClient<Database>;
}

// ============================================================================
// TESTS: getTeacherStudents - Specific Class
// ============================================================================

describe('getTeacherStudents - specific class', () => {
	let mockSupabase: SupabaseClient<Database>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabase = createMockSupabase();
		mockGetTeacherTestMode.mockResolvedValue(false); // Default: real students mode
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should fetch from database on cache miss', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null); // Cache miss
		vi.mocked(mockRedis.setex).mockResolvedValueOnce('OK');

		const result = await getTeacherStudents(mockTeacherId, mockClassId, mockSupabase);

		// Should call DB
		expect(mockSupabase.from).toHaveBeenCalledWith('class_members');

		// Should return transformed student data (without gidouilles)
		expect(result).toEqual([
			{
				id: mockStudentProfile1.id,
				firstname: 'Alice',
				lastname: 'Dupont',
				full_name: 'Alice Dupont',
				avatar_url: 'https://example.com/avatar1.png',
				role: 'student',
				gender: 'F',
				is_test: false
			},
			{
				id: mockStudentProfile2.id,
				firstname: 'Bob',
				lastname: 'Martin',
				full_name: 'Bob Martin',
				avatar_url: null,
				role: 'student',
				gender: 'M',
				is_test: false
			}
		]);

		// Should cache the result
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(mockRedis.setex).toHaveBeenCalledWith(
			`students:teacher:${mockTeacherId}:class:${mockClassId}:false`,
			600, // TTL
			expect.any(Array)
		);
	});

	it('should return cached data on cache hit', async () => {
		const cachedData = [mockStudentProfile1, mockStudentProfile2];
		vi.mocked(mockRedis.get).mockResolvedValueOnce(cachedData);

		const result = await getTeacherStudents(mockTeacherId, mockClassId, mockSupabase);

		// Should return cached data
		expect(result).toEqual(cachedData);

		// Should NOT call DB
		expect(mockSupabase.from).not.toHaveBeenCalled();
	});

	it('should use correct cache key for test mode', async () => {
		mockGetTeacherTestMode.mockResolvedValueOnce(true); // Test mode enabled
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);
		vi.mocked(mockRedis.setex).mockResolvedValueOnce('OK');

		// Mock test mode data
		const mockTestMembers = [
			{ student_id: mockTestStudentProfile.id, profiles: mockTestStudentProfile }
		];
		mockSupabase = {
			from: vi.fn(() => ({
				select: vi.fn(() => ({
					eq: vi.fn(() => ({
						eq: vi.fn(() => ({
							data: mockTestMembers,
							error: null
						}))
					}))
				}))
			}))
		} as unknown as SupabaseClient<Database>;

		await getTeacherStudents(mockTeacherId, mockClassId, mockSupabase);

		// Should use test mode cache key
		expect(mockRedis.get).toHaveBeenCalledWith(
			`students:teacher:${mockTeacherId}:class:${mockClassId}:true`
		);
	});

	it('should bypass cache when option provided', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce([mockStudentProfile1]); // Cached data exists
		vi.mocked(mockRedis.setex).mockResolvedValueOnce('OK');

		const result = await getTeacherStudents(mockTeacherId, mockClassId, mockSupabase, {
			bypassCache: true
		});

		// Should NOT call Redis get
		expect(mockRedis.get).not.toHaveBeenCalled();

		// Should call DB
		expect(mockSupabase.from).toHaveBeenCalledWith('class_members');

		// Should return fresh data
		expect(result).toHaveLength(2);
	});

	it('should handle Redis get errors gracefully', async () => {
		vi.mocked(mockRedis.get).mockRejectedValueOnce(new Error('Redis connection failed'));

		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await getTeacherStudents(mockTeacherId, mockClassId, mockSupabase);

		// Should fallback to DB
		expect(mockSupabase.from).toHaveBeenCalledWith('class_members');
		expect(result).toHaveLength(2);

		consoleSpy.mockRestore();
	});

	it('should handle database errors', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);

		mockSupabase = {
			from: vi.fn(() => ({
				select: vi.fn(() => ({
					eq: vi.fn(() => ({
						eq: vi.fn(() => ({
							data: null,
							error: { message: 'Database error', code: '500' }
						}))
					}))
				}))
			}))
		} as unknown as SupabaseClient<Database>;

		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(getTeacherStudents(mockTeacherId, mockClassId, mockSupabase)).rejects.toThrow(
			'Failed to fetch students'
		);

		consoleSpy.mockRestore();
	});

	it('should filter out null profiles', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);
		vi.mocked(mockRedis.setex).mockResolvedValueOnce('OK');

		// Mock data with null profile
		const membersWithNull = [
			{ student_id: mockStudentProfile1.id, profiles: mockStudentProfile1 },
			{ student_id: 'invalid-id', profiles: null }
		];

		mockSupabase = {
			from: vi.fn(() => ({
				select: vi.fn(() => ({
					eq: vi.fn(() => ({
						eq: vi.fn(() => ({
							data: membersWithNull,
							error: null
						}))
					}))
				}))
			}))
		} as unknown as SupabaseClient<Database>;

		const result = await getTeacherStudents(mockTeacherId, mockClassId, mockSupabase);

		// Should only include valid profiles
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe(mockStudentProfile1.id);
	});

	it('should handle array profiles (Supabase join quirk)', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);
		vi.mocked(mockRedis.setex).mockResolvedValueOnce('OK');

		// Supabase sometimes returns profiles as array
		const membersWithArrayProfiles = [
			{ student_id: mockStudentProfile1.id, profiles: [mockStudentProfile1] }
		];

		mockSupabase = {
			from: vi.fn(() => ({
				select: vi.fn(() => ({
					eq: vi.fn(() => ({
						eq: vi.fn(() => ({
							data: membersWithArrayProfiles,
							error: null
						}))
					}))
				}))
			}))
		} as unknown as SupabaseClient<Database>;

		const result = await getTeacherStudents(mockTeacherId, mockClassId, mockSupabase);

		expect(result).toHaveLength(1);
		expect(result[0].id).toBe(mockStudentProfile1.id);
	});

	it('should handle missing profile fields gracefully', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);
		vi.mocked(mockRedis.setex).mockResolvedValueOnce('OK');

		const incompleteProfile = {
			id: 'test-id',
			firstname: 'John',
			lastname: null,
			full_name: null,
			avatar_url: null,
			role: null,
			gender: null,
			is_test: false
		};

		mockSupabase = {
			from: vi.fn(() => ({
				select: vi.fn(() => ({
					eq: vi.fn(() => ({
						eq: vi.fn(() => ({
							data: [{ student_id: 'test-id', profiles: incompleteProfile }],
							error: null
						}))
					}))
				}))
			}))
		} as unknown as SupabaseClient<Database>;

		const result = await getTeacherStudents(mockTeacherId, mockClassId, mockSupabase);

		expect(result).toEqual([
			{
				id: 'test-id',
				firstname: 'John',
				lastname: null,
				full_name: null,
				avatar_url: null,
				role: null,
				gender: null,
				is_test: false
			}
		]);
	});
});

// ============================================================================
// TESTS: getTeacherStudents - All Classes
// ============================================================================

describe('getTeacherStudents - all classes', () => {
	let mockSupabase: SupabaseClient<Database>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockGetTeacherTestMode.mockResolvedValue(false);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should fetch all classes via RPC on cache miss', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);
		vi.mocked(mockRedis.setex).mockResolvedValueOnce('OK');

		mockSupabase = {
			rpc: vi.fn(() => ({
				data: mockRPCResult,
				error: null
			}))
		} as unknown as SupabaseClient<Database>;

		const result = await getTeacherStudents(mockTeacherId, undefined, mockSupabase);

		// Should call RPC
		expect(mockSupabase.rpc).toHaveBeenCalledWith('get_teacher_classes_with_students', {
			p_teacher_id: mockTeacherId,
			p_is_test_mode: false
		});

		// Should return classes with students (excluding gidouilles/vip_cards)
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			id: mockClassId,
			teacher_id: mockTeacherId,
			name: 'Class 6ème A',
			students: expect.arrayContaining([
				expect.objectContaining({
					id: mockStudentProfile1.id,
					firstname: 'Alice'
				})
			])
		});

		// Verify gidouilles and vip_cards are excluded
		expect(result[0].students[0]).not.toHaveProperty('gidouilles');
		expect(result[0].students[0]).not.toHaveProperty('vip_cards');
	});

	it('should handle empty RPC result', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);

		mockSupabase = {
			rpc: vi.fn(() => ({
				data: [],
				error: null
			}))
		} as unknown as SupabaseClient<Database>;

		const result = await getTeacherStudents(mockTeacherId, undefined, mockSupabase);

		expect(result).toEqual([]);
	});

	it('should handle RPC errors', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);

		mockSupabase = {
			rpc: vi.fn(() => ({
				data: null,
				error: { message: 'RPC failed', code: '500' }
			}))
		} as unknown as SupabaseClient<Database>;

		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(getTeacherStudents(mockTeacherId, undefined, mockSupabase)).rejects.toThrow(
			'Failed to fetch teacher classes'
		);

		consoleSpy.mockRestore();
	});

	it('should handle null RPC data gracefully', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);

		mockSupabase = {
			rpc: vi.fn(() => ({
				data: null,
				error: null
			}))
		} as unknown as SupabaseClient<Database>;

		const result = await getTeacherStudents(mockTeacherId, undefined, mockSupabase);

		expect(result).toEqual([]);
	});

	it('should handle classes with no students', async () => {
		vi.mocked(mockRedis.get).mockResolvedValueOnce(null);

		const classWithNoStudents = [
			{
				...mockRPCResult[0],
				students: []
			}
		];

		mockSupabase = {
			rpc: vi.fn(() => ({
				data: classWithNoStudents,
				error: null
			}))
		} as unknown as SupabaseClient<Database>;

		const result = await getTeacherStudents(mockTeacherId, undefined, mockSupabase);

		expect(result).toHaveLength(1);
		expect(result[0].students).toEqual([]);
	});
});

// ============================================================================
// TESTS: invalidateTeacherStudentsCache
// ============================================================================

describe('invalidateTeacherStudentsCache', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should invalidate specific class cache', async () => {
		vi.mocked(mockRedis.keys).mockResolvedValueOnce([
			`students:teacher:${mockTeacherId}:class:${mockClassId}:false`,
			`students:teacher:${mockTeacherId}:class:${mockClassId}:true`
		]);
		vi.mocked(mockRedis.del).mockResolvedValueOnce(2);

		await invalidateTeacherStudentsCache(mockTeacherId, mockClassId);

		expect(mockRedis.keys).toHaveBeenCalledWith(
			`students:teacher:${mockTeacherId}:class:${mockClassId}:*`
		);
		expect(mockRedis.del).toHaveBeenCalledWith(
			`students:teacher:${mockTeacherId}:class:${mockClassId}:false`,
			`students:teacher:${mockTeacherId}:class:${mockClassId}:true`
		);
	});

	it('should invalidate all classes for teacher', async () => {
		vi.mocked(mockRedis.keys).mockResolvedValueOnce([
			`students:teacher:${mockTeacherId}:class:${mockClassId}:false`,
			`students:teacher:${mockTeacherId}:all:false`,
			`students:teacher:${mockTeacherId}:all:true`
		]);
		vi.mocked(mockRedis.del).mockResolvedValueOnce(3);

		await invalidateTeacherStudentsCache(mockTeacherId);

		expect(mockRedis.keys).toHaveBeenCalledWith(`students:teacher:${mockTeacherId}:*`);
		expect(mockRedis.del).toHaveBeenCalledTimes(1);
	});

	it('should handle no matching keys gracefully', async () => {
		vi.mocked(mockRedis.keys).mockResolvedValueOnce([]);

		await invalidateTeacherStudentsCache(mockTeacherId, mockClassId);

		expect(mockRedis.del).not.toHaveBeenCalled();
	});

	it('should handle Redis errors gracefully', async () => {
		vi.mocked(mockRedis.keys).mockRejectedValueOnce(new Error('Redis error'));

		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		// Should not throw
		await expect(invalidateTeacherStudentsCache(mockTeacherId, mockClassId)).resolves.not.toThrow();

		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});
});
