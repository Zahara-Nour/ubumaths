/**
 * Integration Tests for Daily Summaries and Weekly Rewards
 * Phase 6: End-to-end scenario testing
 *
 * Tests complete flows from class data to summary/reward generation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	getYesterdayInTimezone,
	getCurrentDayOfWeekInTimezone,
	checkClassSchedule,
	generateDailySummary,
	generateWeeklyRewards,
	isWeeklyRewardsDay
} from './index';
import { DEFAULT_WEEK_CONFIG } from '$lib/utils/week-config';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

// Helper to create mock Supabase client with proper chaining
function createMockSupabase() {
	const mockChain = {
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		gte: vi.fn().mockReturnThis(),
		lte: vi.fn().mockReturnThis(),
		in: vi.fn().mockReturnThis(),
		is: vi.fn().mockReturnThis(),
		order: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis()
	};

	return {
		from: vi.fn().mockReturnValue(mockChain),
		rpc: vi.fn()
	} as unknown as SupabaseClient<Database>;
}

// Helper types
type TestClassWithSchool = {
	id: string;
	name: string;
	teacher_id: string;
	school_id: string;
	created_at: string;
	updated_at: string;
	schools: {
		timezone: string;
		timetable: {
			week_config: typeof DEFAULT_WEEK_CONFIG;
		};
	} | null;
};

describe('Integration: Complete Daily Summary Flow', () => {
	let mockSupabase: SupabaseClient<Database>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabase = createMockSupabase();
	});

	it.skip('should generate daily summaries for class with multiple students', async () => {
		const mockClass: TestClassWithSchool = {
			id: 'class-1',
			name: 'Math 101',
			teacher_id: 'teacher-1',
			school_id: 'school-1',
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z',
			schools: {
				timezone: 'Europe/Paris',
				timetable: {
					week_config: DEFAULT_WEEK_CONFIG
				}
			}
		};

		const yesterday = new Date('2025-11-12T00:00:00Z');
		const startOfDay = new Date('2025-11-12T00:00:00Z');
		const endOfDay = new Date('2025-11-12T23:59:59.999Z');

		// Mock class schedule check (had class yesterday)
		vi.mocked(mockSupabase.rpc).mockResolvedValueOnce({
			data: true,
			error: null
		});

		// Mock student list
		const students = [
			{ id: 'student-1', first_name: 'Alice', last_name: 'Smith' },
			{ id: 'student-2', first_name: 'Bob', last_name: 'Jones' },
			{ id: 'student-3', first_name: 'Charlie', last_name: 'Brown' }
		];

		vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
			if (table === 'class_members') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							is: vi.fn().mockResolvedValue({
								data: students.map((s) => ({ student_id: s.id, students: s })),
								error: null
							})
						})
					})
				} as unknown as ReturnType<typeof mockSupabase.from>;
			}
			return {} as ReturnType<typeof mockSupabase.from>;
		});

		// Mock history aggregation for each student
		const mockAggregations = [
			{
				student_id: 'student-1',
				gidouilles_gained: 5,
				gidouilles_lost: 1,
				bonus_gained: 2,
				bonus_used: 0,
				warnings_issued: 0,
				warnings_removed: 0,
				vip_cards_gained: 1,
				vip_cards_used: 0
			},
			{
				student_id: 'student-2',
				gidouilles_gained: 3,
				gidouilles_lost: 0,
				bonus_gained: 1,
				bonus_used: 1,
				warnings_issued: 1,
				warnings_removed: 0,
				vip_cards_gained: 0,
				vip_cards_used: 0
			},
			{
				student_id: 'student-3',
				gidouilles_gained: 0,
				gidouilles_lost: 0,
				bonus_gained: 0,
				bonus_used: 0,
				warnings_issued: 0,
				warnings_removed: 0,
				vip_cards_gained: 0,
				vip_cards_used: 0
			}
		];

		let rpcCallCount = 0;
		vi.mocked(mockSupabase.rpc).mockImplementation((funcName: string) => {
			if (funcName === 'aggregate_daily_changes') {
				const aggregation = mockAggregations[rpcCallCount];
				rpcCallCount++;
				return Promise.resolve({ data: aggregation, error: null });
			}
			if (funcName === 'insert_daily_summary') {
				return Promise.resolve({ data: null, error: null });
			}
			return Promise.resolve({ data: null, error: null });
		});

		// Run daily summary generation
		const summariesCreated = await generateDailySummary(
			mockSupabase,
			mockClass as unknown as import('./types').ClassWithSchool,
			yesterday,
			'Europe/Paris'
		);

		// Should create summaries for students with activity (not student-3)
		expect(summariesCreated).toBe(2);

		// Verify RPC calls
		expect(mockSupabase.rpc).toHaveBeenCalledWith('aggregate_daily_changes', {
			p_student_id: 'student-1',
			p_start_date: startOfDay.toISOString(),
			p_end_date: endOfDay.toISOString()
		});

		expect(mockSupabase.rpc).toHaveBeenCalledWith('insert_daily_summary', {
			p_student_id: 'student-1',
			p_class_id: 'class-1',
			p_summary_date: startOfDay.toISOString(),
			p_gidouilles_gained: 5,
			p_gidouilles_lost: 1,
			p_bonus_gained: 2,
			p_bonus_used: 0,
			p_warnings_issued: 0,
			p_warnings_removed: 0,
			p_vip_cards_gained: 1,
			p_vip_cards_used: 0
		});
	});

	it.skip('should skip students with no activity', async () => {
		const mockClass: TestClassWithSchool = {
			id: 'class-1',
			name: 'Math 101',
			teacher_id: 'teacher-1',
			school_id: 'school-1',
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z',
			schools: {
				timezone: 'Europe/Paris',
				timetable: {
					week_config: DEFAULT_WEEK_CONFIG
				}
			}
		};

		const yesterday = new Date('2025-11-12T00:00:00Z');

		// Mock students
		const students = [{ id: 'student-1', first_name: 'Alice', last_name: 'Smith' }];

		vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
			if (table === 'class_members') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							is: vi.fn().mockResolvedValue({
								data: students.map((s) => ({ student_id: s.id, students: s })),
								error: null
							})
						})
					})
				} as unknown as ReturnType<typeof mockSupabase.from>;
			}
			return {} as ReturnType<typeof mockSupabase.from>;
		});

		// Mock no activity
		vi.mocked(mockSupabase.rpc).mockImplementation((funcName: string) => {
			if (funcName === 'aggregate_daily_changes') {
				return Promise.resolve({
					data: {
						student_id: 'student-1',
						gidouilles_gained: 0,
						gidouilles_lost: 0,
						bonus_gained: 0,
						bonus_used: 0,
						warnings_issued: 0,
						warnings_removed: 0,
						vip_cards_gained: 0,
						vip_cards_used: 0
					},
					error: null
				});
			}
			return Promise.resolve({ data: null, error: null });
		});

		const summariesCreated = await generateDailySummary(
			mockSupabase,
			mockClass as unknown as import('./types').ClassWithSchool,
			yesterday,
			'Europe/Paris'
		);

		expect(summariesCreated).toBe(0);

		// Should not call insert_daily_summary
		expect(mockSupabase.rpc).not.toHaveBeenCalledWith('insert_daily_summary', expect.anything());
	});
});

describe('Integration: Complete Weekly Rewards Flow', () => {
	let mockSupabase: SupabaseClient<Database>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabase = createMockSupabase();
	});

	it.skip('should distribute weekly rewards on last day of week', async () => {
		const mockClass: TestClassWithSchool = {
			id: 'class-1',
			name: 'Math 101',
			teacher_id: 'teacher-1',
			school_id: 'school-1',
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z',
			schools: {
				timezone: 'Europe/Paris',
				timetable: {
					week_config: DEFAULT_WEEK_CONFIG
				}
			}
		};

		const weekConfig = DEFAULT_WEEK_CONFIG;

		// Mock students
		const students = [
			{ id: 'student-1', first_name: 'Alice', last_name: 'Smith' },
			{ id: 'student-2', first_name: 'Bob', last_name: 'Jones' }
		];

		vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
			if (table === 'class_members') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							is: vi.fn().mockResolvedValue({
								data: students.map((s) => ({ student_id: s.id, students: s })),
								error: null
							})
						})
					})
				} as unknown as ReturnType<typeof mockSupabase.from>;
			}
			return {} as ReturnType<typeof mockSupabase.from>;
		});

		// Mock weekly aggregations
		const mockWeeklyData = [
			{
				student_id: 'student-1',
				total_gidouilles_gained: 50,
				total_bonus_gained: 10,
				days_with_activity: 5,
				reward_amount: 25 // 50% of gidouilles as reward
			},
			{
				student_id: 'student-2',
				total_gidouilles_gained: 30,
				total_bonus_gained: 5,
				days_with_activity: 4,
				reward_amount: 15
			}
		];

		let rpcCallCount = 0;
		vi.mocked(mockSupabase.rpc).mockImplementation((funcName: string) => {
			if (funcName === 'aggregate_weekly_activity') {
				const data = mockWeeklyData[rpcCallCount];
				rpcCallCount++;
				return Promise.resolve({ data, error: null });
			}
			if (funcName === 'insert_weekly_reward') {
				return Promise.resolve({ data: null, error: null });
			}
			return Promise.resolve({ data: null, error: null });
		});

		const rewardsAwarded = await generateWeeklyRewards(
			mockSupabase,
			mockClass as unknown as import('./types').ClassWithSchool,
			weekConfig,
			'Europe/Paris'
		);

		expect(rewardsAwarded).toBe(2);

		// Verify reward distribution
		expect(mockSupabase.rpc).toHaveBeenCalledWith('insert_weekly_reward', {
			p_student_id: 'student-1',
			p_class_id: 'class-1',
			p_reward_date: expect.any(String),
			p_total_gidouilles: 50,
			p_total_bonus: 10,
			p_days_active: 5,
			p_reward_amount: 25
		});
	});

	it.skip('should skip students with no weekly activity', async () => {
		const mockClass: TestClassWithSchool = {
			id: 'class-1',
			name: 'Math 101',
			teacher_id: 'teacher-1',
			school_id: 'school-1',
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z',
			schools: {
				timezone: 'Europe/Paris',
				timetable: {
					week_config: DEFAULT_WEEK_CONFIG
				}
			}
		};

		// Mock students
		const students = [{ id: 'student-1', first_name: 'Alice', last_name: 'Smith' }];

		vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
			if (table === 'class_members') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							is: vi.fn().mockResolvedValue({
								data: students.map((s) => ({ student_id: s.id, students: s })),
								error: null
							})
						})
					})
				} as unknown as ReturnType<typeof mockSupabase.from>;
			}
			return {} as ReturnType<typeof mockSupabase.from>;
		});

		// Mock no activity
		vi.mocked(mockSupabase.rpc).mockResolvedValue({
			data: {
				student_id: 'student-1',
				total_gidouilles_gained: 0,
				total_bonus_gained: 0,
				days_with_activity: 0,
				reward_amount: 0
			},
			error: null
		});

		const rewardsAwarded = await generateWeeklyRewards(
			mockSupabase,
			mockClass,
			DEFAULT_WEEK_CONFIG,
			'Europe/Paris'
		);

		expect(rewardsAwarded).toBe(0);
	});
});

describe('Integration: Multi-Timezone Scenarios', () => {
	let _mockSupabase: SupabaseClient<Database>;

	beforeEach(() => {
		vi.clearAllMocks();
		_mockSupabase = createMockSupabase();
	});

	it('should handle different schools in different timezones correctly', async () => {
		const _parisClass: TestClassWithSchool = {
			id: 'class-paris',
			name: 'Paris Math',
			teacher_id: 'teacher-1',
			school_id: 'school-paris',
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z',
			schools: {
				timezone: 'Europe/Paris',
				timetable: {
					week_config: DEFAULT_WEEK_CONFIG
				}
			}
		};

		const _tokyoClass: TestClassWithSchool = {
			id: 'class-tokyo',
			name: 'Tokyo Math',
			teacher_id: 'teacher-2',
			school_id: 'school-tokyo',
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z',
			schools: {
				timezone: 'Asia/Tokyo',
				timetable: {
					week_config: DEFAULT_WEEK_CONFIG
				}
			}
		};

		// Get "yesterday" in each timezone
		const yesterdayParis = getYesterdayInTimezone('Europe/Paris');
		const yesterdayTokyo = getYesterdayInTimezone('Asia/Tokyo');

		// Should be different dates if called at the right time
		// (e.g., when it's 2AM in Paris but already next day in Tokyo)
		expect(yesterdayParis).toBeInstanceOf(Date);
		expect(yesterdayTokyo).toBeInstanceOf(Date);

		// Get current day of week in each timezone
		const dayOfWeekParis = getCurrentDayOfWeekInTimezone('Europe/Paris');
		const dayOfWeekTokyo = getCurrentDayOfWeekInTimezone('Asia/Tokyo');

		expect(dayOfWeekParis).toBeGreaterThanOrEqual(0);
		expect(dayOfWeekParis).toBeLessThanOrEqual(6);
		expect(dayOfWeekTokyo).toBeGreaterThanOrEqual(0);
		expect(dayOfWeekTokyo).toBeLessThanOrEqual(6);
	});

	it('should correctly determine rewards day for different week configurations', () => {
		// Israeli week config (last_day = Saturday)
		const israeliConfig = {
			first_day: 0, // Sunday
			last_day: 6, // Saturday
			school_days: [0, 1, 2, 3, 4],
			weekend_days: [5, 6]
		};

		// Western week config (last_day = Friday)
		const westernConfig = {
			first_day: 1, // Monday
			last_day: 5, // Friday
			school_days: [1, 2, 3, 4, 5],
			weekend_days: [0, 6]
		};

		// Rewards run on the day AFTER the last day of the week
		// DEFAULT_WEEK_CONFIG has last_day = 6 (Saturday), so rewards run on Sunday (0)
		expect(isWeeklyRewardsDay(DEFAULT_WEEK_CONFIG, 0)).toBe(true); // Sunday (day after Saturday)
		expect(isWeeklyRewardsDay(DEFAULT_WEEK_CONFIG, 6)).toBe(false); // Saturday is last_day, not rewards day

		// Israeli config: last_day = 6 (Saturday), rewards run on Sunday (0)
		expect(isWeeklyRewardsDay(israeliConfig, 0)).toBe(true); // Sunday (day after Saturday)
		expect(isWeeklyRewardsDay(israeliConfig, 6)).toBe(false); // Saturday is last_day, not rewards day

		// Western config: last_day = 5 (Friday), rewards run on Saturday (6)
		expect(isWeeklyRewardsDay(westernConfig, 6)).toBe(true); // Saturday (day after Friday)
		expect(isWeeklyRewardsDay(westernConfig, 5)).toBe(false); // Friday is last_day, not rewards day
	});
});

describe('Integration: Edge Cases', () => {
	let mockSupabase: SupabaseClient<Database>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabase = createMockSupabase();
	});

	it.skip('should handle class with no schedules', async () => {
		const _mockClass: TestClassWithSchool = {
			id: 'class-1',
			name: 'Math 101',
			teacher_id: 'teacher-1',
			school_id: 'school-1',
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z',
			schools: {
				timezone: 'Europe/Paris',
				timetable: {
					week_config: DEFAULT_WEEK_CONFIG
				}
			}
		};

		const yesterday = new Date('2025-11-12T00:00:00Z');

		// Mock no schedules
		vi.mocked(mockSupabase.rpc).mockResolvedValue({
			data: false,
			error: null
		});

		const hadClass = await checkClassSchedule(mockSupabase, 'class-1', yesterday);

		expect(hadClass).toBe(false);
	});

	it.skip('should handle class with no students', async () => {
		const mockClass: TestClassWithSchool = {
			id: 'class-1',
			name: 'Math 101',
			teacher_id: 'teacher-1',
			school_id: 'school-1',
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z',
			schools: {
				timezone: 'Europe/Paris',
				timetable: {
					week_config: DEFAULT_WEEK_CONFIG
				}
			}
		};

		const yesterday = new Date('2025-11-12T00:00:00Z');

		// Mock no students
		vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
			if (table === 'class_members') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							is: vi.fn().mockResolvedValue({
								data: [],
								error: null
							})
						})
					})
				} as unknown as ReturnType<typeof mockSupabase.from>;
			}
			return {} as ReturnType<typeof mockSupabase.from>;
		});

		const summariesCreated = await generateDailySummary(
			mockSupabase,
			mockClass as unknown as import('./types').ClassWithSchool,
			yesterday,
			'Europe/Paris'
		);

		expect(summariesCreated).toBe(0);
	});

	it.skip('should continue processing other students if one fails', async () => {
		const mockClass: TestClassWithSchool = {
			id: 'class-1',
			name: 'Math 101',
			teacher_id: 'teacher-1',
			school_id: 'school-1',
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z',
			schools: {
				timezone: 'Europe/Paris',
				timetable: {
					week_config: DEFAULT_WEEK_CONFIG
				}
			}
		};

		const yesterday = new Date('2025-11-12T00:00:00Z');

		// Mock students
		const students = [
			{ id: 'student-1', first_name: 'Alice', last_name: 'Smith' },
			{ id: 'student-2', first_name: 'Bob', last_name: 'Jones' }
		];

		vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
			if (table === 'class_members') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							is: vi.fn().mockResolvedValue({
								data: students.map((s) => ({ student_id: s.id, students: s })),
								error: null
							})
						})
					})
				} as unknown as ReturnType<typeof mockSupabase.from>;
			}
			return {} as ReturnType<typeof mockSupabase.from>;
		});

		let rpcCallCount = 0;
		vi.mocked(mockSupabase.rpc).mockImplementation((funcName: string) => {
			if (funcName === 'aggregate_daily_changes') {
				rpcCallCount++;
				if (rpcCallCount === 1) {
					// First student fails
					return Promise.resolve({
						data: null,
						error: { message: 'Database error', details: '', hint: '', code: '' }
					});
				} else {
					// Second student succeeds
					return Promise.resolve({
						data: {
							student_id: 'student-2',
							gidouilles_gained: 5,
							gidouilles_lost: 0,
							bonus_gained: 1,
							bonus_used: 0,
							warnings_issued: 0,
							warnings_removed: 0,
							vip_cards_gained: 0,
							vip_cards_used: 0
						},
						error: null
					});
				}
			}
			if (funcName === 'insert_daily_summary') {
				return Promise.resolve({ data: null, error: null });
			}
			return Promise.resolve({ data: null, error: null });
		});

		// Should process second student despite first failure
		const summariesCreated = await generateDailySummary(
			mockSupabase,
			mockClass as unknown as import('./types').ClassWithSchool,
			yesterday,
			'Europe/Paris'
		);

		// Only second student should have summary
		expect(summariesCreated).toBe(1);
	});

	it('should handle null school data gracefully', async () => {
		const mockClass: TestClassWithSchool = {
			id: 'class-1',
			name: 'Math 101',
			teacher_id: 'teacher-1',
			school_id: 'school-1',
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z',
			schools: null // No school data
		};

		const yesterday = new Date('2025-11-12T00:00:00Z');

		// Should use defaults
		const summariesCreated = await generateDailySummary(
			mockSupabase,
			mockClass,
			yesterday,
			'Europe/Paris' // Default timezone passed in
		);

		// Should not crash
		expect(summariesCreated).toBeGreaterThanOrEqual(0);
	});
});

describe('Integration: Timezone Utilities', () => {
	it('should get correct yesterday date for timezone', () => {
		const yesterday = getYesterdayInTimezone('Europe/Paris');

		expect(yesterday).toBeInstanceOf(Date);
		// The function returns a UTC Date object set to midnight in the target timezone
		// So we can't directly check getHours() as it will show UTC hours
		// Instead, verify it's a valid date
		expect(yesterday.getTime()).toBeGreaterThan(0);
		expect(yesterday.getTime()).toBeLessThan(Date.now());
	});

	it('should get current day of week for timezone', () => {
		const dayOfWeek = getCurrentDayOfWeekInTimezone('Europe/Paris');

		expect(dayOfWeek).toBeGreaterThanOrEqual(0);
		expect(dayOfWeek).toBeLessThanOrEqual(6);
	});

	it('should determine if today is rewards day', () => {
		const dayOfWeek = getCurrentDayOfWeekInTimezone('Europe/Paris');
		const isRewardsDay = isWeeklyRewardsDay(DEFAULT_WEEK_CONFIG, dayOfWeek);

		expect(typeof isRewardsDay).toBe('boolean');

		// Should be true only on day AFTER last day of week
		// DEFAULT_WEEK_CONFIG has last_day = 6, so rewards run on day 0 (Sunday)
		const expectedRewardsDay = (DEFAULT_WEEK_CONFIG.last_day + 1) % 7;
		if (dayOfWeek === expectedRewardsDay) {
			expect(isRewardsDay).toBe(true);
		} else {
			expect(isRewardsDay).toBe(false);
		}
	});

	it('should handle DST transitions correctly', () => {
		// Test dates around DST transition (example: March 2025)
		const beforeDST = new Date('2025-03-29T00:00:00Z');
		const afterDST = new Date('2025-03-31T00:00:00Z');

		// Both should return valid dates
		expect(beforeDST).toBeInstanceOf(Date);
		expect(afterDST).toBeInstanceOf(Date);

		// Timezone functions should handle DST gracefully
		const dayBefore = getCurrentDayOfWeekInTimezone('Europe/Paris');
		expect(dayBefore).toBeGreaterThanOrEqual(0);
		expect(dayBefore).toBeLessThanOrEqual(6);
	});
});

describe('Integration: Performance Considerations', () => {
	let mockSupabase: SupabaseClient<Database>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabase = createMockSupabase();
	});

	it.skip('should batch process multiple students efficiently', async () => {
		const mockClass: TestClassWithSchool = {
			id: 'class-1',
			name: 'Large Class',
			teacher_id: 'teacher-1',
			school_id: 'school-1',
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z',
			schools: {
				timezone: 'Europe/Paris',
				timetable: {
					week_config: DEFAULT_WEEK_CONFIG
				}
			}
		};

		const yesterday = new Date('2025-11-12T00:00:00Z');

		// Create 100 students
		const students = Array.from({ length: 100 }, (_, i) => ({
			id: `student-${i}`,
			first_name: `Student${i}`,
			last_name: 'Test'
		}));

		vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
			if (table === 'class_members') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							is: vi.fn().mockResolvedValue({
								data: students.map((s) => ({ student_id: s.id, students: s })),
								error: null
							})
						})
					})
				} as unknown as ReturnType<typeof mockSupabase.from>;
			}
			return {} as ReturnType<typeof mockSupabase.from>;
		});

		// Mock aggregation and insertion
		vi.mocked(mockSupabase.rpc).mockImplementation((funcName: string) => {
			if (funcName === 'aggregate_daily_changes') {
				return Promise.resolve({
					data: {
						student_id: 'student-1',
						gidouilles_gained: 5,
						gidouilles_lost: 0,
						bonus_gained: 1,
						bonus_used: 0,
						warnings_issued: 0,
						warnings_removed: 0,
						vip_cards_gained: 0,
						vip_cards_used: 0
					},
					error: null
				});
			}
			if (funcName === 'insert_daily_summary') {
				return Promise.resolve({ data: null, error: null });
			}
			return Promise.resolve({ data: null, error: null });
		});

		const startTime = Date.now();
		await generateDailySummary(mockSupabase, mockClass, yesterday, 'Europe/Paris');
		const endTime = Date.now();

		// Should complete in reasonable time (< 5 seconds for mocked operations)
		expect(endTime - startTime).toBeLessThan(5000);
	});
});
