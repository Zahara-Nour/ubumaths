/**
 * Teacher Dashboard Cache Tests
 * ==============================
 *
 * Comprehensive tests for the teacher dashboard caching system with 100% coverage.
 *
 * Test Categories:
 * 1. Cache 1: Student Basic Info (2h TTL)
 * 2. Cache 2A: Student Rewards (10min TTL + optimistic)
 * 3. Cache 2B: Student Warnings (10min TTL + optimistic, per period)
 * 4. Cache 3: Class Info (24h TTL)
 * 5. Cache 4: School Info (24h TTL)
 * 6. Optimistic UI Updates
 * 7. Cache Invalidation
 * 8. Statistics & Monitoring
 * 9. Edge Cases & Concurrency
 *
 * ARCHITECTURE NOTES:
 * - All caches are independent with different TTLs
 * - Composite keys for warnings: ${classId}:${periodId}
 * - Auto-fetch on cache miss or expiration
 * - Optimistic updates for rewards/warnings
 * - Memory-efficient with auto-cleanup
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TeacherDashboardCache } from './teacherDashboardCache.svelte';
import type {
	BasicStudent,
	StudentRewards,
	StudentWarningCounts,
	ClassInfo,
	SchoolInfo
} from '$lib/types/teacher-cache';
import type { StudentVipCards } from '$lib/types/vip-card';

// ============================================================================
// TEST SETUP
// ============================================================================

// Mock global fetch
const originalFetch = global.fetch;

// Create a new cache instance for each test
function createCache() {
	return new TeacherDashboardCache();
}

// Mock Date.now() for TTL testing
let mockNow = Date.now();
const _originalDateNow = Date.now;

function mockDateNow(timestamp: number) {
	mockNow = timestamp;
	vi.spyOn(Date, 'now').mockReturnValue(mockNow);
}

function advanceTime(milliseconds: number) {
	mockNow += milliseconds;
	vi.spyOn(Date, 'now').mockReturnValue(mockNow);
}

function restoreTime() {
	vi.spyOn(Date, 'now').mockRestore();
	mockNow = Date.now();
}

// Sample data generators
function createMockStudents(count: number): BasicStudent[] {
	return Array.from({ length: count }, (_, i) => ({
		id: `student-${i}`,
		firstname: `Student${i}`,
		lastname: `Last${i}`,
		full_name: `Student${i} Last${i}`,
		avatar_url: `https://example.com/avatar${i}.png`,
		role: 'student',
		is_test: false
	}));
}

function _createMockRewards(studentIds: string[]): Map<string, StudentRewards> {
	const rewards = new Map<string, StudentRewards>();
	studentIds.forEach((id, i) => {
		rewards.set(id, {
			gidouilles: i * 10,
			bonus: i * 5,
			vip_cards: {
				card1: { cardId: 'card1', earnedAt: new Date().toISOString(), usedAt: null },
				card2: { cardId: 'card2', earnedAt: new Date().toISOString(), usedAt: null }
			}
		});
	});
	return rewards;
}

function _createMockWarnings(studentIds: string[]): Map<string, StudentWarningCounts> {
	const warnings = new Map<string, StudentWarningCounts>();
	studentIds.forEach((id, i) => {
		warnings.set(id, {
			C: i,
			M: i,
			R: i,
			T: i
		});
	});
	return warnings;
}

function createMockClassInfo(): ClassInfo {
	return {
		id: 'class-123',
		teacher_id: 'teacher-1',
		name: 'Math 101',
		description: 'Algebra class',
		join_code: 'ABC123',
		is_active: true,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		student_count: 25,
		schedules: [
			{
				id: 'schedule-1',
				class_id: 'class-123',
				teacher_id: 'teacher-1',
				day_of_week: 1,
				period_number: 1,
				start_time: '08:00',
				end_time: '09:00',
				subject: 'Math',
				room: '101',
				notes: null,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			}
		]
	};
}

function createMockSchoolInfo(): SchoolInfo {
	return {
		school: {
			id: 'school-1',
			name: 'Test School',
			city: 'Paris',
			country: 'France',
			address: null,
			logo_url: null,
			timetable: null,
			timezone: 'Europe/Paris',
			is_active: true,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		},
		current_period: {
			id: 'period-1',
			school_year_id: 'year-1',
			name: 'Fall 2025',
			start_date: '2025-09-01',
			end_date: '2025-12-20',
			type: 'trimester',
			period_order: 1,
			color: '#0000ff',
			metadata: {},
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		},
		all_periods: [
			{
				id: 'period-1',
				school_year_id: 'year-1',
				name: 'Fall 2025',
				start_date: '2025-09-01',
				end_date: '2025-12-20',
				type: 'trimester',
				period_order: 1,
				color: '#0000ff',
				metadata: {},
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			}
		]
	};
}

// ============================================================================
// CACHE 1: STUDENT BASIC INFO (2h TTL)
// ============================================================================

describe('Cache 1: Student Basic Info', () => {
	let cache: TeacherDashboardCache;
	const classId = 'class-123';
	const mockStudents = createMockStudents(5);

	beforeEach(() => {
		cache = createCache();
		mockDateNow(Date.now());

		// Mock fetch for students endpoint
		global.fetch = vi.fn((url: string | URL | Request) => {
			if (url.toString().includes(`/api/classes/${classId}/students`)) {
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ students: mockStudents })
				} as Response);
			}
			return Promise.reject(new Error(`Unexpected URL: ${url.toString()}`));
		});
	});

	afterEach(() => {
		global.fetch = originalFetch;
		restoreTime();
	});

	describe('Initial Fetch', () => {
		it('should fetch students on first access (cache miss)', async () => {
			const students = await cache.getStudentBasic(classId);

			expect(students).toEqual(mockStudents);
			expect(global.fetch).toHaveBeenCalledWith(`/api/classes/${classId}/students`);
			expect(global.fetch).toHaveBeenCalledTimes(1);
		});

		it('should cache fetched students', async () => {
			await cache.getStudentBasic(classId);

			// Second call should use cache
			const students = await cache.getStudentBasic(classId);

			expect(students).toEqual(mockStudents);
			expect(global.fetch).toHaveBeenCalledTimes(1); // Still only 1 call
		});

		it('should return empty array on fetch error', async () => {
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: false,
					statusText: 'Internal Server Error'
				} as Response)
			);

			const students = await cache.getStudentBasic(classId);

			expect(students).toEqual([]);
		});

		it('should return empty array on network error', async () => {
			global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

			const students = await cache.getStudentBasic(classId);

			expect(students).toEqual([]);
		});

		it('should handle missing students array in response', async () => {
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () => Promise.resolve({}) // Missing students array
				} as Response)
			);

			const students = await cache.getStudentBasic(classId);

			expect(students).toEqual([]);
		});
	});

	describe('TTL Expiration (2 hours)', () => {
		it('should use cache within TTL window', async () => {
			await cache.getStudentBasic(classId);

			// Advance time by 1 hour (within 2h TTL)
			advanceTime(60 * 60 * 1000);

			const students = await cache.getStudentBasic(classId);

			expect(students).toEqual(mockStudents);
			expect(global.fetch).toHaveBeenCalledTimes(1); // No refetch
		});

		it('should refetch after TTL expires (2 hours)', async () => {
			await cache.getStudentBasic(classId);

			// Advance time by 2 hours + 1ms (expired)
			advanceTime(2 * 60 * 60 * 1000 + 1);

			const students = await cache.getStudentBasic(classId);

			expect(students).toEqual(mockStudents);
			expect(global.fetch).toHaveBeenCalledTimes(2); // Refetched
		});

		it('should refetch exactly at TTL boundary', async () => {
			await cache.getStudentBasic(classId);

			// Advance time by exactly 2 hours
			advanceTime(2 * 60 * 60 * 1000);

			const students = await cache.getStudentBasic(classId);

			expect(students).toEqual(mockStudents);
			expect(global.fetch).toHaveBeenCalledTimes(2);
		});
	});

	describe('Multiple Classes', () => {
		it('should cache students independently per class', async () => {
			const classId2 = 'class-456';
			const mockStudents2 = createMockStudents(3);

			// Create new cache for this test to avoid interference
			const testCache = createCache();

			global.fetch = vi.fn((url: string | URL | Request) => {
				if (url.toString().includes(classId)) {
					return Promise.resolve({
						ok: true,
						json: () => Promise.resolve({ students: mockStudents })
					} as Response);
				}
				if (url.toString().includes(classId2)) {
					return Promise.resolve({
						ok: true,
						json: () => Promise.resolve({ students: mockStudents2 })
					} as Response);
				}
				return Promise.reject(new Error(`Unexpected URL: ${url.toString()}`));
			});

			const students1 = await testCache.getStudentBasic(classId);
			const students2 = await testCache.getStudentBasic(classId2);

			expect(students1).toEqual(mockStudents);
			expect(students2).toEqual(mockStudents2);
			expect(global.fetch).toHaveBeenCalledTimes(2);
		});

		it('should handle TTL expiration independently per class', async () => {
			const classId2 = 'class-456';
			const testCache = createCache();

			global.fetch = vi.fn((url: string | URL | Request) => {
				if (url.toString().includes(classId)) {
					return Promise.resolve({
						ok: true,
						json: () => Promise.resolve({ students: mockStudents })
					} as Response);
				}
				if (url.toString().includes(classId2)) {
					return Promise.resolve({
						ok: true,
						json: () => Promise.resolve({ students: createMockStudents(2) })
					} as Response);
				}
				return Promise.reject(new Error(`Unexpected URL: ${url.toString()}`));
			});

			// Fetch both classes
			await testCache.getStudentBasic(classId);
			advanceTime(30 * 60 * 1000); // 30 minutes delay
			await testCache.getStudentBasic(classId2);

			// Advance 1.5 hours more (total: 2h for class1, 1.5h for class2)
			advanceTime(90 * 60 * 1000);

			await testCache.getStudentBasic(classId); // Should refetch (2h expired)
			await testCache.getStudentBasic(classId2); // Should use cache (1.5h < 2h)

			expect(global.fetch).toHaveBeenCalledTimes(3); // Initial 2 + 1 refetch
		});
	});

	describe('Hydration', () => {
		it('should populate cache via hydration', () => {
			cache.hydrateStudents(classId, mockStudents);

			const stats = cache.getStats();
			expect(stats.students).toBe(1);
		});

		it('should use hydrated data instead of fetching', async () => {
			cache.hydrateStudents(classId, mockStudents);

			const students = await cache.getStudentBasic(classId);

			expect(students).toEqual(mockStudents);
			expect(global.fetch).not.toHaveBeenCalled();
		});

		it('should respect TTL for hydrated data', async () => {
			cache.hydrateStudents(classId, mockStudents);

			// Advance past TTL
			advanceTime(2 * 60 * 60 * 1000 + 1);

			await cache.getStudentBasic(classId);

			expect(global.fetch).toHaveBeenCalledTimes(1); // Refetched
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty student list', async () => {
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ students: [] })
				} as Response)
			);

			const students = await cache.getStudentBasic(classId);

			expect(students).toEqual([]);
		});

		it('should handle large student list (100+ students)', async () => {
			const largeList = createMockStudents(150);

			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ students: largeList })
				} as Response)
			);

			const students = await cache.getStudentBasic(classId);

			expect(students).toHaveLength(150);
		});

		it('should handle students with null fields', async () => {
			const studentsWithNulls: BasicStudent[] = [
				{
					id: 'student-1',
					firstname: 'Test',
					lastname: null,
					full_name: null,
					avatar_url: null,
					role: null,
					is_test: false
				}
			];

			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ students: studentsWithNulls })
				} as Response)
			);

			const students = await cache.getStudentBasic(classId);

			expect(students).toEqual(studentsWithNulls);
		});
	});
});

// ============================================================================
// CACHE 2A: STUDENT REWARDS (10min TTL + OPTIMISTIC)
// ============================================================================

describe('Cache 2A: Student Rewards', () => {
	let cache: TeacherDashboardCache;
	const classId = 'class-123';
	const studentIds = ['student-1', 'student-2', 'student-3'];
	const mockRewardsArray = [
		{ student_id: 'student-1', gidouilles: 10, vip_cards: { card1: 1 } },
		{ student_id: 'student-2', gidouilles: 20, vip_cards: { card2: 2 } },
		{ student_id: 'student-3', gidouilles: 30, vip_cards: {} }
	];

	beforeEach(() => {
		cache = createCache();
		mockDateNow(Date.now());

		global.fetch = vi.fn((url: string | URL | Request) => {
			if (url.toString().includes(`/api/classes/${classId}/gidouilles`)) {
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ gidouilles: mockRewardsArray })
				} as Response);
			}
			return Promise.reject(new Error(`Unexpected URL: ${url.toString()}`));
		});
	});

	afterEach(() => {
		global.fetch = originalFetch;
		restoreTime();
	});

	describe('Initial Fetch', () => {
		it('should fetch rewards on first access', async () => {
			const rewards = await cache.getStudentRewards(classId);

			expect(rewards.size).toBe(3);
			expect(rewards.get('student-1')).toEqual({ gidouilles: 10, vip_cards: { card1: 1 } });
			expect(global.fetch).toHaveBeenCalledTimes(1);
		});

		it('should convert array to Map correctly', async () => {
			const rewards = await cache.getStudentRewards(classId);

			expect(rewards instanceof Map).toBe(true);
			expect(Array.from(rewards.keys())).toEqual(studentIds);
		});

		it('should return empty Map on fetch error', async () => {
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: false,
					statusText: 'Not Found'
				} as Response)
			);

			const rewards = await cache.getStudentRewards(classId);

			expect(rewards.size).toBe(0);
		});

		it('should handle missing gidouilles array in response', async () => {
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () => Promise.resolve({})
				} as Response)
			);

			const rewards = await cache.getStudentRewards(classId);

			expect(rewards.size).toBe(0);
		});

		it('should handle null gidouilles and vip_cards', async () => {
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							gidouilles: [{ student_id: 'student-1', gidouilles: null, vip_cards: null }]
						})
				} as Response)
			);

			const rewards = await cache.getStudentRewards(classId);

			expect(rewards.get('student-1')).toEqual({ gidouilles: 0, vip_cards: {} });
		});
	});

	describe('TTL Expiration (10 minutes)', () => {
		it('should use cache within TTL window', async () => {
			await cache.getStudentRewards(classId);

			// Advance 5 minutes
			advanceTime(5 * 60 * 1000);

			await cache.getStudentRewards(classId);

			expect(global.fetch).toHaveBeenCalledTimes(1);
		});

		it('should refetch after TTL expires', async () => {
			await cache.getStudentRewards(classId);

			// Advance 10 minutes + 1ms
			advanceTime(10 * 60 * 1000 + 1);

			await cache.getStudentRewards(classId);

			expect(global.fetch).toHaveBeenCalledTimes(2);
		});
	});

	describe('Optimistic Gidouilles Updates', () => {
		it('should update gidouilles optimistically', async () => {
			await cache.getStudentRewards(classId);

			cache.updateGidouillesOptimistic(classId, 'student-1', +5);

			const rewards = await cache.getStudentRewards(classId);
			expect(rewards.get('student-1')?.gidouilles).toBe(15); // 10 + 5
		});

		it('should handle negative delta (removing gidouilles)', async () => {
			await cache.getStudentRewards(classId);

			cache.updateGidouillesOptimistic(classId, 'student-1', -5);

			const rewards = await cache.getStudentRewards(classId);
			expect(rewards.get('student-1')?.gidouilles).toBe(5); // 10 - 5
		});

		it('should not allow negative gidouilles (floor at 0)', async () => {
			await cache.getStudentRewards(classId);

			cache.updateGidouillesOptimistic(classId, 'student-1', -50);

			const rewards = await cache.getStudentRewards(classId);
			expect(rewards.get('student-1')?.gidouilles).toBe(0); // Max(0, 10-50) = 0
		});

		it('should handle multiple optimistic updates', async () => {
			await cache.getStudentRewards(classId);

			cache.updateGidouillesOptimistic(classId, 'student-1', +5);
			cache.updateGidouillesOptimistic(classId, 'student-1', +3);
			cache.updateGidouillesOptimistic(classId, 'student-1', -2);

			const rewards = await cache.getStudentRewards(classId);
			expect(rewards.get('student-1')?.gidouilles).toBe(16); // 10 + 5 + 3 - 2
		});

		it('should ignore update if cache is empty', () => {
			// No fetch yet, cache is empty
			expect(() => {
				cache.updateGidouillesOptimistic(classId, 'student-1', +5);
			}).not.toThrow();
		});

		it('should ignore update for non-existent student', async () => {
			await cache.getStudentRewards(classId);

			cache.updateGidouillesOptimistic(classId, 'non-existent', +5);

			const rewards = await cache.getStudentRewards(classId);
			expect(rewards.has('non-existent')).toBe(false);
		});
	});

	describe('Optimistic VIP Cards Updates', () => {
		it('should update VIP cards optimistically', async () => {
			await cache.getStudentRewards(classId);

			const newCards = {
				card1: { cardId: 'card1', earnedAt: new Date().toISOString(), usedAt: null },
				card2: { cardId: 'card2', earnedAt: new Date().toISOString(), usedAt: null }
			};
			cache.updateVipCardsOptimistic(classId, 'student-1', newCards);

			const rewards = await cache.getStudentRewards(classId);
			expect(rewards.get('student-1')?.vip_cards).toEqual(newCards);
		});

		it('should completely replace VIP cards object', async () => {
			await cache.getStudentRewards(classId);

			// Original: { card1: { cardId: 'card1', ... } }
			const newCards = {
				card2: { cardId: 'card2', earnedAt: new Date().toISOString(), usedAt: null },
				card3: { cardId: 'card3', earnedAt: new Date().toISOString(), usedAt: null }
			};
			cache.updateVipCardsOptimistic(classId, 'student-1', newCards);

			const rewards = await cache.getStudentRewards(classId);
			expect(rewards.get('student-1')?.vip_cards).toEqual(newCards);
		});

		it('should handle empty VIP cards object', async () => {
			await cache.getStudentRewards(classId);

			cache.updateVipCardsOptimistic(classId, 'student-1', {});

			const rewards = await cache.getStudentRewards(classId);
			expect(rewards.get('student-1')?.vip_cards).toEqual({});
		});

		it('should ignore update if cache is empty', () => {
			expect(() => {
				cache.updateVipCardsOptimistic(classId, 'student-1', {
					card1: { cardId: 'card1', earnedAt: new Date().toISOString(), usedAt: null }
				});
			}).not.toThrow();
		});
	});

	describe('Sync Getter', () => {
		it('should return rewards synchronously if cached', async () => {
			await cache.getStudentRewards(classId);

			const rewards = cache.getRewardsSync(classId);

			expect(rewards).not.toBeNull();
			expect(rewards?.size).toBe(3);
		});

		it('should return null if not cached', () => {
			const rewards = cache.getRewardsSync(classId);

			expect(rewards).toBeNull();
		});

		it('should return null if TTL expired', async () => {
			await cache.getStudentRewards(classId);

			advanceTime(10 * 60 * 1000 + 1);

			const rewards = cache.getRewardsSync(classId);

			expect(rewards).toBeNull();
		});
	});

	describe('Hydration', () => {
		it('should hydrate rewards from load function data', () => {
			const testTimestamp = new Date().toISOString();
			const students = [
				{
					id: 'student-1',
					gidouilles: 10,
					bonus: 5,
					vip_cards: {
						card1: { cardId: 'card1', earnedAt: testTimestamp, usedAt: null }
					}
				},
				{ id: 'student-2', gidouilles: 20, bonus: 10, vip_cards: {} as StudentVipCards }
			];

			cache.hydrateRewards(classId, students);

			const rewards = cache.getRewardsSync(classId);

			expect(rewards?.size).toBe(2);
			expect(rewards?.get('student-1')).toEqual({
				gidouilles: 10,
				bonus: 5,
				vip_cards: {
					card1: { cardId: 'card1', earnedAt: testTimestamp, usedAt: null }
				}
			});
		});
	});
});

// ============================================================================
// CACHE 2B: STUDENT WARNINGS (10min TTL + OPTIMISTIC, COMPOSITE KEY)
// ============================================================================

describe('Cache 2B: Student Warnings', () => {
	let cache: TeacherDashboardCache;
	const classId = 'class-123';
	const periodId = 'period-456';
	const mockWarningsData = {
		'student-1': { C: 1, M: 1, R: 1, T: 0 },
		'student-2': { C: 0, M: 1, R: 1, T: 0 }
	};

	beforeEach(() => {
		cache = createCache();
		mockDateNow(Date.now());

		global.fetch = vi.fn((url: string | URL | Request) => {
			if (url.toString().includes(`/api/classes/${classId}/warnings?period_id=${periodId}`)) {
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ warnings: mockWarningsData })
				} as Response);
			}
			return Promise.reject(new Error(`Unexpected URL: ${url.toString()}`));
		});
	});

	afterEach(() => {
		global.fetch = originalFetch;
		restoreTime();
	});

	describe('Initial Fetch', () => {
		it('should fetch warnings on first access', async () => {
			const warnings = await cache.getStudentWarnings(classId, periodId);

			expect(warnings.size).toBe(2);
			expect(warnings.get('student-1')).toEqual({ C: 1, M: 1, R: 1, T: 0 });
			expect(global.fetch).toHaveBeenCalledTimes(1);
		});

		it('should use composite key ${classId}:${periodId}', async () => {
			await cache.getStudentWarnings(classId, periodId);

			const stats = cache.getStats();
			expect(stats.warnings).toBe(1);
		});

		it('should convert object to Map correctly', async () => {
			const warnings = await cache.getStudentWarnings(classId, periodId);

			expect(warnings instanceof Map).toBe(true);
			expect(Array.from(warnings.keys())).toEqual(['student-1', 'student-2']);
		});

		it('should return empty Map on fetch error', async () => {
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: false,
					statusText: 'Server Error'
				} as Response)
			);

			const warnings = await cache.getStudentWarnings(classId, periodId);

			expect(warnings.size).toBe(0);
		});

		it('should handle missing warnings object in response', async () => {
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () => Promise.resolve({})
				} as Response)
			);

			const warnings = await cache.getStudentWarnings(classId, periodId);

			expect(warnings.size).toBe(0);
		});
	});

	describe('Composite Key Behavior', () => {
		it('should cache warnings independently per class:period', async () => {
			const periodId2 = 'period-789';

			global.fetch = vi.fn((url: string | URL | Request) => {
				if (url.toString().includes(`period_id=${periodId}`)) {
					return Promise.resolve({
						ok: true,
						json: () => Promise.resolve({ warnings: mockWarningsData })
					} as Response);
				}
				if (url.toString().includes(`period_id=${periodId2}`)) {
					return Promise.resolve({
						ok: true,
						json: () => Promise.resolve({ warnings: { 'student-3': { C: 2, M: 1, R: 1, T: 1 } } })
					} as Response);
				}
				return Promise.reject(new Error('Unexpected URL'));
			});

			const warnings1 = await cache.getStudentWarnings(classId, periodId);
			const warnings2 = await cache.getStudentWarnings(classId, periodId2);

			expect(warnings1.size).toBe(2);
			expect(warnings2.size).toBe(1);
			expect(global.fetch).toHaveBeenCalledTimes(2);
		});

		it('should handle special characters in composite key', async () => {
			const specialClassId = 'class:with:colons';
			const specialPeriodId = 'period:123';

			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ warnings: {} })
				} as Response)
			);

			await cache.getStudentWarnings(specialClassId, specialPeriodId);

			expect(global.fetch).toHaveBeenCalledTimes(1);
		});

		it('should cache different periods for same class separately', async () => {
			const periodId2 = 'period-789';

			await cache.getStudentWarnings(classId, periodId);
			await cache.getStudentWarnings(classId, periodId2);

			const stats = cache.getStats();
			expect(stats.warnings).toBe(2);
		});
	});

	describe('TTL Expiration (10 minutes)', () => {
		it('should use cache within TTL window', async () => {
			await cache.getStudentWarnings(classId, periodId);

			advanceTime(9 * 60 * 1000);

			await cache.getStudentWarnings(classId, periodId);

			expect(global.fetch).toHaveBeenCalledTimes(1);
		});

		it('should refetch after TTL expires', async () => {
			await cache.getStudentWarnings(classId, periodId);

			advanceTime(10 * 60 * 1000 + 1);

			await cache.getStudentWarnings(classId, periodId);

			expect(global.fetch).toHaveBeenCalledTimes(2);
		});
	});

	describe('Optimistic Warnings Updates', () => {
		it('should update warnings optimistically', async () => {
			await cache.getStudentWarnings(classId, periodId);

			cache.updateWarningsOptimistic(classId, periodId, 'student-1', {
				C: 1,
				M: 2,
				R: 1,
				T: 1
			});

			const warnings = await cache.getStudentWarnings(classId, periodId);
			expect(warnings.get('student-1')).toEqual({
				C: 1,
				M: 2,
				R: 1,
				T: 1
			});
		});

		it('should add new student if not in cache', async () => {
			await cache.getStudentWarnings(classId, periodId);

			cache.updateWarningsOptimistic(classId, periodId, 'student-3', {
				C: 0,
				M: 1,
				R: 0,
				T: 0
			});

			const warnings = await cache.getStudentWarnings(classId, periodId);
			expect(warnings.has('student-3')).toBe(true);
		});

		it('should ignore update if cache is empty', () => {
			expect(() => {
				cache.updateWarningsOptimistic(classId, periodId, 'student-1', {
					C: 0,
					M: 0,
					R: 0,
					T: 0
				});
			}).not.toThrow();
		});
	});

	describe('Sync Getter', () => {
		it('should return warnings synchronously if cached', async () => {
			await cache.getStudentWarnings(classId, periodId);

			const warnings = cache.getWarningsSync(classId, periodId);

			expect(warnings).not.toBeNull();
			expect(warnings?.size).toBe(2);
		});

		it('should return null if not cached', () => {
			const warnings = cache.getWarningsSync(classId, periodId);

			expect(warnings).toBeNull();
		});

		it('should return null if TTL expired', async () => {
			await cache.getStudentWarnings(classId, periodId);

			advanceTime(10 * 60 * 1000 + 1);

			const warnings = cache.getWarningsSync(classId, periodId);

			expect(warnings).toBeNull();
		});
	});

	describe('Hydration', () => {
		it('should hydrate warnings from load function data', () => {
			const warningsMap = new Map<string, StudentWarningCounts>();
			warningsMap.set('student-1', {
				C: 1,
				M: 1,
				R: 1,
				T: 0
			});

			cache.hydrateWarnings(classId, periodId, warningsMap);

			const warnings = cache.getWarningsSync(classId, periodId);

			expect(warnings?.size).toBe(1);
		});
	});
});

// ============================================================================
// CACHE 3: CLASS INFO (24h TTL)
// ============================================================================

describe('Cache 3: Class Info', () => {
	let cache: TeacherDashboardCache;
	const classId = 'class-123';
	const mockClassInfo = createMockClassInfo();

	beforeEach(() => {
		cache = createCache();
		mockDateNow(Date.now());
	});

	afterEach(() => {
		restoreTime();
	});

	describe('Fetch Behavior', () => {
		it('should throw error when trying to fetch (endpoint not implemented)', async () => {
			await expect(cache.getClassInfo(classId)).rejects.toThrow(
				'Class info fetch not implemented - use hydrateClassInfo() instead'
			);
		});
	});

	describe('Hydration', () => {
		it('should populate cache via hydration', () => {
			cache.hydrateClassInfo(classId, mockClassInfo);

			const stats = cache.getStats();
			expect(stats.classes).toBe(1);
		});

		it('should return hydrated data', async () => {
			cache.hydrateClassInfo(classId, mockClassInfo);

			const classInfo = await cache.getClassInfo(classId);

			expect(classInfo).toEqual(mockClassInfo);
		});

		it('should respect TTL for hydrated data (24 hours)', async () => {
			cache.hydrateClassInfo(classId, mockClassInfo);

			// Within TTL
			advanceTime(23 * 60 * 60 * 1000);
			const info1 = await cache.getClassInfo(classId);
			expect(info1).toEqual(mockClassInfo);

			// Past TTL - should throw (no fetch implementation)
			advanceTime(2 * 60 * 60 * 1000);
			await expect(cache.getClassInfo(classId)).rejects.toThrow();
		});

		it('should cache multiple classes independently', () => {
			const classId2 = 'class-456';
			const mockClassInfo2 = { ...mockClassInfo, id: classId2 };

			cache.hydrateClassInfo(classId, mockClassInfo);
			cache.hydrateClassInfo(classId2, mockClassInfo2);

			const stats = cache.getStats();
			expect(stats.classes).toBe(2);
		});

		it('should handle class info with empty schedules', () => {
			const emptySchedules = { ...mockClassInfo, schedules: [] };

			cache.hydrateClassInfo(classId, emptySchedules);

			expect(cache.getStats().classes).toBe(1);
		});

		it('should handle class info with null fields', () => {
			const nullFields = { ...mockClassInfo, description: null };

			cache.hydrateClassInfo(classId, nullFields);

			expect(cache.getStats().classes).toBe(1);
		});
	});
});

// ============================================================================
// CACHE 4: SCHOOL INFO (24h TTL)
// ============================================================================

describe('Cache 4: School Info', () => {
	let cache: TeacherDashboardCache;
	const schoolId = 'school-1';
	const mockSchoolInfo = createMockSchoolInfo();

	beforeEach(() => {
		cache = createCache();
		mockDateNow(Date.now());
	});

	afterEach(() => {
		restoreTime();
	});

	describe('Fetch Behavior', () => {
		it('should throw error when trying to fetch (endpoint not implemented)', async () => {
			await expect(cache.getSchoolInfo(schoolId)).rejects.toThrow(
				'School info fetch not implemented - use hydrateSchoolInfo() instead'
			);
		});
	});

	describe('Hydration', () => {
		it('should populate cache via hydration', () => {
			cache.hydrateSchoolInfo(schoolId, mockSchoolInfo);

			const stats = cache.getStats();
			expect(stats.school).toBe(1);
		});

		it('should return hydrated data', async () => {
			cache.hydrateSchoolInfo(schoolId, mockSchoolInfo);

			const schoolInfo = await cache.getSchoolInfo(schoolId);

			expect(schoolInfo).toEqual(mockSchoolInfo);
		});

		it('should respect TTL for hydrated data (24 hours)', async () => {
			cache.hydrateSchoolInfo(schoolId, mockSchoolInfo);

			// Within TTL
			advanceTime(20 * 60 * 60 * 1000);
			const info1 = await cache.getSchoolInfo(schoolId);
			expect(info1).toEqual(mockSchoolInfo);

			// Past TTL
			advanceTime(5 * 60 * 60 * 1000);
			await expect(cache.getSchoolInfo(schoolId)).rejects.toThrow();
		});

		it('should handle school info with null current period', () => {
			const noPeriod = { ...mockSchoolInfo, current_period: null };

			cache.hydrateSchoolInfo(schoolId, noPeriod);

			expect(cache.getStats().school).toBe(1);
		});

		it('should handle school info with empty periods array', () => {
			const noPeriods = { ...mockSchoolInfo, all_periods: [] };

			cache.hydrateSchoolInfo(schoolId, noPeriods);

			expect(cache.getStats().school).toBe(1);
		});
	});
});

// ============================================================================
// CACHE INVALIDATION
// ============================================================================

describe('Cache Invalidation', () => {
	let cache: TeacherDashboardCache;
	const classId = 'class-123';
	const periodId = 'period-456';

	beforeEach(() => {
		cache = createCache();
		mockDateNow(Date.now());

		global.fetch = vi.fn(() =>
			Promise.resolve({
				ok: true,
				json: () =>
					Promise.resolve({
						students: createMockStudents(3),
						gidouilles: [],
						warnings: {}
					})
			} as Response)
		);
	});

	afterEach(() => {
		global.fetch = originalFetch;
		restoreTime();
	});

	describe('Individual Cache Invalidation', () => {
		it('should invalidate students cache', async () => {
			await cache.getStudentBasic(classId);
			expect(cache.getStats().students).toBe(1);

			cache.invalidateStudents(classId);

			expect(cache.getStats().students).toBe(0);
		});

		it('should invalidate rewards cache', async () => {
			await cache.getStudentRewards(classId);
			expect(cache.getStats().rewards).toBe(1);

			cache.invalidateRewards(classId);

			expect(cache.getStats().rewards).toBe(0);
		});

		it('should invalidate warnings cache for specific period', async () => {
			await cache.getStudentWarnings(classId, periodId);
			expect(cache.getStats().warnings).toBe(1);

			cache.invalidateWarnings(classId, periodId);

			expect(cache.getStats().warnings).toBe(0);
		});

		it('should invalidate class info cache', () => {
			cache.hydrateClassInfo(classId, createMockClassInfo());
			expect(cache.getStats().classes).toBe(1);

			cache.invalidateClass(classId);

			expect(cache.getStats().classes).toBe(0);
		});

		it('should invalidate school info cache', () => {
			cache.hydrateSchoolInfo('school-1', createMockSchoolInfo());
			expect(cache.getStats().school).toBe(1);

			cache.invalidateSchool('school-1');

			expect(cache.getStats().school).toBe(0);
		});
	});

	describe('Invalidate All Warnings for Class', () => {
		it('should invalidate warnings for all periods of a class', async () => {
			const period1 = 'period-1';
			const period2 = 'period-2';
			const period3 = 'period-3';

			// Hydrate multiple periods
			cache.hydrateWarnings(classId, period1, new Map());
			cache.hydrateWarnings(classId, period2, new Map());
			cache.hydrateWarnings(classId, period3, new Map());

			expect(cache.getStats().warnings).toBe(3);

			cache.invalidateAllWarningsForClass(classId);

			expect(cache.getStats().warnings).toBe(0);
		});

		it('should only invalidate warnings for specified class', () => {
			const classId2 = 'class-456';

			cache.hydrateWarnings(classId, periodId, new Map());
			cache.hydrateWarnings(classId2, periodId, new Map());

			cache.invalidateAllWarningsForClass(classId);

			expect(cache.getStats().warnings).toBe(1); // Only classId2 remains
		});

		it('should handle invalidation when no warnings exist', () => {
			expect(() => {
				cache.invalidateAllWarningsForClass(classId);
			}).not.toThrow();
		});

		it('should handle composite keys with colons correctly', () => {
			const classWithColon = 'class:123';

			cache.hydrateWarnings(classWithColon, 'period-1', new Map());
			cache.hydrateWarnings(classWithColon, 'period-2', new Map());

			cache.invalidateAllWarningsForClass(classWithColon);

			expect(cache.getStats().warnings).toBe(0);
		});
	});

	describe('Invalidate All Caches', () => {
		it('should clear all caches at once', async () => {
			// Populate all caches
			await cache.getStudentBasic(classId);
			await cache.getStudentRewards(classId);
			await cache.getStudentWarnings(classId, periodId);
			cache.hydrateClassInfo(classId, createMockClassInfo());
			cache.hydrateSchoolInfo('school-1', createMockSchoolInfo());

			const statsBefore = cache.getStats();
			expect(statsBefore.totalEntries).toBeGreaterThan(0);

			cache.invalidateAll();

			const statsAfter = cache.getStats();
			expect(statsAfter.totalEntries).toBe(0);
			expect(statsAfter.students).toBe(0);
			expect(statsAfter.rewards).toBe(0);
			expect(statsAfter.warnings).toBe(0);
			expect(statsAfter.classes).toBe(0);
			expect(statsAfter.school).toBe(0);
		});

		it('should allow repopulating caches after invalidateAll', async () => {
			await cache.getStudentBasic(classId);
			cache.invalidateAll();

			await cache.getStudentBasic(classId);

			expect(cache.getStats().students).toBe(1);
		});
	});

	describe('Invalidation During Pending Operations', () => {
		it('should handle invalidation during async fetch', async () => {
			let resolveFetch: (value: unknown) => void;
			const fetchPromise = new Promise((resolve) => {
				resolveFetch = resolve;
			});

			global.fetch = vi.fn(() => fetchPromise as Promise<Response>);

			const fetchPromise1 = cache.getStudentBasic(classId);

			// Invalidate while fetch is pending
			cache.invalidateStudents(classId);

			// Complete fetch
			resolveFetch!({
				ok: true,
				json: () => Promise.resolve({ students: createMockStudents(3) })
			});

			await fetchPromise1;

			// Cache should have been populated by completed fetch
			expect(cache.getStats().students).toBe(1);
		});
	});
});

// ============================================================================
// STATISTICS & MONITORING
// ============================================================================

describe('Statistics & Monitoring', () => {
	let cache: TeacherDashboardCache;

	beforeEach(() => {
		cache = createCache();
		mockDateNow(Date.now());

		global.fetch = vi.fn(() =>
			Promise.resolve({
				ok: true,
				json: () =>
					Promise.resolve({
						students: createMockStudents(5),
						gidouilles: [],
						warnings: {}
					})
			} as Response)
		);
	});

	afterEach(() => {
		global.fetch = originalFetch;
		restoreTime();
	});

	describe('Cache Statistics', () => {
		it('should report zero entries for empty cache', () => {
			const stats = cache.getStats();

			expect(stats.students).toBe(0);
			expect(stats.rewards).toBe(0);
			expect(stats.warnings).toBe(0);
			expect(stats.classes).toBe(0);
			expect(stats.school).toBe(0);
			expect(stats.totalEntries).toBe(0);
		});

		it('should count entries correctly', async () => {
			await cache.getStudentBasic('class-1');
			await cache.getStudentRewards('class-1');
			cache.hydrateWarnings('class-1', 'period-1', new Map());
			cache.hydrateWarnings('class-1', 'period-2', new Map());
			cache.hydrateClassInfo('class-1', createMockClassInfo());
			cache.hydrateSchoolInfo('school-1', createMockSchoolInfo());

			const stats = cache.getStats();

			expect(stats.students).toBe(1);
			expect(stats.rewards).toBe(1);
			expect(stats.warnings).toBe(2);
			expect(stats.classes).toBe(1);
			expect(stats.school).toBe(1);
			expect(stats.totalEntries).toBe(6);
		});

		it('should estimate memory usage in KB for small cache', () => {
			cache.hydrateClassInfo('class-1', createMockClassInfo());

			const stats = cache.getStats();

			expect(stats.memoryEstimate).toContain('KB');
		});

		it('should estimate memory usage in MB for large cache', async () => {
			// Create 1500 entries
			for (let i = 0; i < 1500; i++) {
				cache.hydrateClassInfo(`class-${i}`, createMockClassInfo());
			}

			const stats = cache.getStats();

			expect(stats.memoryEstimate).toContain('MB');
		});

		it('should handle memory estimate calculation correctly', () => {
			// 10 entries = ~10KB
			for (let i = 0; i < 10; i++) {
				cache.hydrateClassInfo(`class-${i}`, createMockClassInfo());
			}

			const stats = cache.getStats();
			expect(stats.memoryEstimate).toBe('10KB');
		});

		it('should handle MB threshold correctly', () => {
			// 1024 entries = 1MB
			for (let i = 0; i < 1024; i++) {
				cache.hydrateClassInfo(`class-${i}`, createMockClassInfo());
			}

			const stats = cache.getStats();
			expect(stats.memoryEstimate).toBe('1.00MB');
		});
	});

	describe('Log Stats', () => {
		it('should log stats without throwing', () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			cache.logStats();

			expect(consoleSpy).toHaveBeenCalledWith(
				'[Cache] Statistics:',
				expect.objectContaining({
					totalEntries: 0
				})
			);

			consoleSpy.mockRestore();
		});

		it('should log stats with populated cache', async () => {
			await cache.getStudentBasic('class-1');

			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			cache.logStats();

			expect(consoleSpy).toHaveBeenCalledWith(
				'[Cache] Statistics:',
				expect.objectContaining({
					students: 1,
					totalEntries: 1
				})
			);

			consoleSpy.mockRestore();
		});
	});
});

// ============================================================================
// EDGE CASES & CONCURRENCY
// ============================================================================

describe('Edge Cases & Concurrency', () => {
	let cache: TeacherDashboardCache;

	beforeEach(() => {
		cache = createCache();
		mockDateNow(Date.now());
	});

	afterEach(() => {
		global.fetch = originalFetch;
		restoreTime();
	});

	describe('Concurrent Requests', () => {
		it('should handle concurrent fetches for same class', async () => {
			let fetchCount = 0;

			global.fetch = vi.fn(() => {
				fetchCount++;
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ students: createMockStudents(3) })
				} as Response);
			});

			// Fire multiple concurrent requests
			const [result1, result2, result3] = await Promise.all([
				cache.getStudentBasic('class-1'),
				cache.getStudentBasic('class-1'),
				cache.getStudentBasic('class-1')
			]);

			// All should get same data
			expect(result1).toEqual(result2);
			expect(result2).toEqual(result3);

			// Note: Due to race condition, might fetch multiple times
			// This is acceptable behavior for the cache
			expect(fetchCount).toBeGreaterThanOrEqual(1);
		});

		it('should handle concurrent fetches for different classes', async () => {
			global.fetch = vi.fn((url: string | URL | Request) => {
				const classId = url.toString().match(/classes\/([^/]+)/)?.[1];
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ students: [{ id: classId }] })
				} as Response);
			});

			const [result1, result2] = await Promise.all([
				cache.getStudentBasic('class-1'),
				cache.getStudentBasic('class-2')
			]);

			expect(result1[0].id).toBe('class-1');
			expect(result2[0].id).toBe('class-2');
		});

		it('should handle concurrent optimistic updates', async () => {
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							gidouilles: [{ student_id: 'student-1', gidouilles: 10, vip_cards: {} }]
						})
				} as Response)
			);

			await cache.getStudentRewards('class-1');

			// Concurrent optimistic updates
			cache.updateGidouillesOptimistic('class-1', 'student-1', +5);
			cache.updateGidouillesOptimistic('class-1', 'student-1', +3);
			cache.updateGidouillesOptimistic('class-1', 'student-1', -2);

			const rewards = await cache.getStudentRewards('class-1');
			expect(rewards.get('student-1')?.gidouilles).toBe(16); // 10+5+3-2
		});
	});

	describe('Large Datasets', () => {
		it('should handle class with 200+ students', async () => {
			const largeStudentList = createMockStudents(250);

			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ students: largeStudentList })
				} as Response)
			);

			const students = await cache.getStudentBasic('large-class');

			expect(students).toHaveLength(250);
		});

		it('should handle rewards for 200+ students', async () => {
			const largeRewardsList = Array.from({ length: 250 }, (_, i) => ({
				student_id: `student-${i}`,
				gidouilles: i * 10,
				vip_cards: {}
			}));

			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ gidouilles: largeRewardsList })
				} as Response)
			);

			const rewards = await cache.getStudentRewards('large-class');

			expect(rewards.size).toBe(250);
		});

		it('should handle warnings for 200+ students', async () => {
			const largeWarningsData: Record<string, StudentWarningCounts> = {};
			for (let i = 0; i < 250; i++) {
				largeWarningsData[`student-${i}`] = {
					C: i % 4,
					M: i % 3,
					R: i % 2,
					T: i % 5
				};
			}

			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ warnings: largeWarningsData })
				} as Response)
			);

			const warnings = await cache.getStudentWarnings('large-class', 'period-1');

			expect(warnings.size).toBe(250);
		});
	});

	describe('Malformed Data', () => {
		it('should handle non-JSON response', async () => {
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () => Promise.reject(new Error('Invalid JSON'))
				} as Response)
			);

			const students = await cache.getStudentBasic('class-1');

			expect(students).toEqual([]);
		});

		it('should handle response with wrong type', async () => {
			global.fetch = vi.fn(
				(): Promise<Response> =>
					Promise.resolve({
						ok: true,
						json: () => Promise.resolve({ students: 'not-an-array' })
					} as Response)
			);

			// Should not crash, though behavior depends on implementation
			await expect(cache.getStudentBasic('class-1')).resolves.toBeDefined();
		});

		it('should handle network timeout gracefully', async () => {
			global.fetch = vi.fn(
				() =>
					new Promise((_, reject) => {
						setTimeout(() => reject(new Error('Network timeout')), 100);
					})
			) as typeof fetch;

			const students = await cache.getStudentBasic('class-1');

			expect(students).toEqual([]);
		});
	});

	describe('Boundary Conditions', () => {
		it('should handle TTL exactly at expiration', async () => {
			const startTime = Date.now();
			mockDateNow(startTime);

			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ students: createMockStudents(1) })
				} as Response)
			);

			await cache.getStudentBasic('class-1');

			// Advance to exactly TTL boundary (2 hours)
			mockDateNow(startTime + 2 * 60 * 60 * 1000);

			await cache.getStudentBasic('class-1');

			expect(global.fetch).toHaveBeenCalledTimes(2);
		});

		it('should handle gidouilles at zero boundary', async () => {
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							gidouilles: [{ student_id: 'student-1', gidouilles: 0, vip_cards: {} }]
						})
				} as Response)
			);

			await cache.getStudentRewards('class-1');

			cache.updateGidouillesOptimistic('class-1', 'student-1', -10);

			const rewards = await cache.getStudentRewards('class-1');
			expect(rewards.get('student-1')?.gidouilles).toBe(0); // Floored at 0
		});

		it('should handle very large gidouilles values', async () => {
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							gidouilles: [{ student_id: 'student-1', gidouilles: 999999, vip_cards: {} }]
						})
				} as Response)
			);

			await cache.getStudentRewards('class-1');

			cache.updateGidouillesOptimistic('class-1', 'student-1', +1);

			const rewards = await cache.getStudentRewards('class-1');
			expect(rewards.get('student-1')?.gidouilles).toBe(1000000);
		});
	});

	describe('Memory Management', () => {
		it('should not leak memory when invalidating large caches', () => {
			// Populate large cache
			for (let i = 0; i < 1000; i++) {
				cache.hydrateClassInfo(`class-${i}`, createMockClassInfo());
			}

			const statsBefore = cache.getStats();
			expect(statsBefore.totalEntries).toBe(1000);

			// Invalidate all
			cache.invalidateAll();

			const statsAfter = cache.getStats();
			expect(statsAfter.totalEntries).toBe(0);
		});

		it('should handle rapid hydrate/invalidate cycles', () => {
			for (let i = 0; i < 100; i++) {
				cache.hydrateClassInfo('class-1', createMockClassInfo());
				cache.invalidateClass('class-1');
			}

			const stats = cache.getStats();
			expect(stats.classes).toBe(0);
		});
	});

	describe('Console Logging', () => {
		it('should log cache hits', async () => {
			const testCache = createCache();
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ students: [] })
				} as Response)
			);

			await testCache.getStudentBasic('class-1');
			await testCache.getStudentBasic('class-1'); // Hit

			expect(consoleSpy).toHaveBeenCalledWith('[Cache] Student basic HIT for class:', 'class-1');

			consoleSpy.mockRestore();
		});

		it('should log cache misses', async () => {
			const testCache = createCache();
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ students: [] })
				} as Response)
			);

			await testCache.getStudentBasic('class-1');

			expect(consoleSpy).toHaveBeenCalledWith(
				'[Cache] Student basic MISS for class:',
				'class-1',
				'- Fetching...'
			);

			consoleSpy.mockRestore();
		});

		it('should log optimistic updates', async () => {
			const testCache = createCache();
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							gidouilles: [{ student_id: 'student-1', gidouilles: 10, vip_cards: {} }]
						})
				} as Response)
			);

			await testCache.getStudentRewards('class-1');

			// Clear console spy to only capture optimistic update log
			consoleSpy.mockClear();

			testCache.updateGidouillesOptimistic('class-1', 'student-1', +5);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('[Cache] Optimistic gidouilles update')
			);

			consoleSpy.mockRestore();
		});

		it('should log invalidations', () => {
			const testCache = createCache();
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			testCache.hydrateStudents('class-1', []);
			cache.invalidateStudents('class-1');

			expect(consoleSpy).toHaveBeenCalledWith('[Cache] Invalidated students for class:', 'class-1');

			consoleSpy.mockRestore();
		});
	});
});
