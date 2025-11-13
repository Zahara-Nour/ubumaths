import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './+server';
import * as cronAuth from '$lib/server/auth/cron';
import * as serviceRoleClient from '$lib/server/serviceRoleClient';
import * as summaries from '$lib/server/summaries';
import { DEFAULT_WEEK_CONFIG } from '$lib/utils/week-config';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock all dependencies
vi.mock('$lib/server/auth/cron');
vi.mock('$lib/server/serviceRoleClient');
vi.mock('$lib/server/summaries');

// Type for request context used in tests
interface RequestContext {
	request: Request;
	locals: Record<string, unknown>;
}

describe('GET/POST /api/cron/daily-summaries-and-rewards', () => {
	let mockSupabase: SupabaseClient;
	let mockRequest: Request;

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock service role client
		mockSupabase = {
			from: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			rpc: vi.fn()
		} as unknown as SupabaseClient;

		vi.mocked(serviceRoleClient.createServiceRoleClient).mockReturnValue(mockSupabase);

		// Mock request
		mockRequest = new Request('http://localhost/api/cron/daily-summaries-and-rewards', {
			method: 'GET',
			headers: {
				authorization: 'Bearer valid-token'
			}
		});

		// Mock cron auth (default: authorized)
		vi.mocked(cronAuth.verifyCronAuth).mockReturnValue(undefined);

		// Mock job tracking RPCs (default: success)
		mockSupabase.rpc.mockImplementation((funcName: string) => {
			if (funcName === 'start_job_run') {
				return Promise.resolve({ data: 'job-run-id', error: null });
			}
			if (funcName === 'complete_job_run') {
				return Promise.resolve({ data: null, error: null });
			}
			return Promise.resolve({ data: null, error: null });
		});
	});

	// ============================================================
	// Security Tests
	// ============================================================
	describe('Security', () => {
		it('should reject requests without CRON_SECRET', async () => {
			vi.mocked(cronAuth.verifyCronAuth).mockImplementation(() => {
				throw new Error('Unauthorized');
			});

			await expect(GET({ request: mockRequest, locals: {} } as RequestContext)).rejects.toThrow();

			expect(cronAuth.verifyCronAuth).toHaveBeenCalledWith(mockRequest);
		});

		it('should reject requests with wrong CRON_SECRET', async () => {
			vi.mocked(cronAuth.verifyCronAuth).mockImplementation(() => {
				throw new Error('Invalid token');
			});

			await expect(POST({ request: mockRequest, locals: {} } as RequestContext)).rejects.toThrow();

			expect(cronAuth.verifyCronAuth).toHaveBeenCalledWith(mockRequest);
		});

		it('should accept valid CRON_SECRET via GET', async () => {
			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						data: [],
						error: null
					})
				})
			});

			const response = await GET({ request: mockRequest, locals: {} } as RequestContext);

			expect(response.status).toBe(200);
			expect(cronAuth.verifyCronAuth).toHaveBeenCalledWith(mockRequest);
		});

		it('should accept valid CRON_SECRET via POST', async () => {
			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						data: [],
						error: null
					})
				})
			});

			const response = await POST({ request: mockRequest, locals: {} } as RequestContext);

			expect(response.status).toBe(200);
			expect(cronAuth.verifyCronAuth).toHaveBeenCalledWith(mockRequest);
		});
	});

	// ============================================================
	// Happy Path Tests
	// ============================================================
	describe('Happy Path', () => {
		it('should handle no active classes', async () => {
			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						data: [],
						error: null
					})
				})
			});

			const response = await GET({ request: mockRequest, locals: {} } as RequestContext);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body).toMatchObject({
				success: true,
				message: 'No active classes to process',
				classesProcessed: 0
			});
		});

		it('should generate daily summaries when class had lessons', async () => {
			const mockClass = {
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

			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						data: [mockClass],
						error: null
					})
				})
			});

			const yesterday = new Date('2025-11-12T00:00:00Z');

			vi.mocked(summaries.getYesterdayInTimezone).mockReturnValue(yesterday);
			vi.mocked(summaries.checkClassSchedule).mockResolvedValue(true); // Had class
			vi.mocked(summaries.generateDailySummary).mockResolvedValue(5); // 5 summaries
			vi.mocked(summaries.getCurrentDayOfWeekInTimezone).mockReturnValue(1); // Monday
			vi.mocked(summaries.isWeeklyRewardsDay).mockReturnValue(false);

			const response = await GET({ request: mockRequest, locals: {} } as RequestContext);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body).toMatchObject({
				success: true,
				classesProcessed: 1,
				dailySummaries: {
					generated: 5,
					classesProcessed: 1
				},
				weeklyRewards: {
					awarded: 0,
					classesProcessed: 0
				}
			});

			expect(summaries.checkClassSchedule).toHaveBeenCalledWith(mockSupabase, 'class-1', yesterday);
			expect(summaries.generateDailySummary).toHaveBeenCalledWith(
				mockSupabase,
				mockClass,
				yesterday,
				'Europe/Paris'
			);
		});

		it('should skip daily summaries when class had no lessons', async () => {
			const mockClass = {
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

			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						data: [mockClass],
						error: null
					})
				})
			});

			const yesterday = new Date('2025-11-12T00:00:00Z');

			vi.mocked(summaries.getYesterdayInTimezone).mockReturnValue(yesterday);
			vi.mocked(summaries.checkClassSchedule).mockResolvedValue(false); // No class
			vi.mocked(summaries.getCurrentDayOfWeekInTimezone).mockReturnValue(1); // Monday
			vi.mocked(summaries.isWeeklyRewardsDay).mockReturnValue(false);

			const response = await GET({ request: mockRequest, locals: {} } as RequestContext);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body).toMatchObject({
				success: true,
				classesProcessed: 1,
				dailySummaries: {
					generated: 0,
					classesProcessed: 0
				}
			});

			expect(summaries.generateDailySummary).not.toHaveBeenCalled();
		});

		it('should generate weekly rewards on last day of week', async () => {
			const mockClass = {
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

			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						data: [mockClass],
						error: null
					})
				})
			});

			const yesterday = new Date('2025-11-12T00:00:00Z');

			vi.mocked(summaries.getYesterdayInTimezone).mockReturnValue(yesterday);
			vi.mocked(summaries.checkClassSchedule).mockResolvedValue(false); // No class
			vi.mocked(summaries.getCurrentDayOfWeekInTimezone).mockReturnValue(0); // Sunday (rewards day)
			vi.mocked(summaries.isWeeklyRewardsDay).mockReturnValue(true);
			vi.mocked(summaries.generateWeeklyRewards).mockResolvedValue(8); // 8 rewards

			const response = await GET({ request: mockRequest, locals: {} } as RequestContext);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body).toMatchObject({
				success: true,
				classesProcessed: 1,
				weeklyRewards: {
					awarded: 8,
					classesProcessed: 1
				}
			});

			expect(summaries.generateWeeklyRewards).toHaveBeenCalledWith(
				mockSupabase,
				mockClass,
				DEFAULT_WEEK_CONFIG,
				'Europe/Paris'
			);
		});

		it('should process both summaries and rewards when applicable', async () => {
			const mockClass = {
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

			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						data: [mockClass],
						error: null
					})
				})
			});

			const yesterday = new Date('2025-11-12T00:00:00Z');

			vi.mocked(summaries.getYesterdayInTimezone).mockReturnValue(yesterday);
			vi.mocked(summaries.checkClassSchedule).mockResolvedValue(true); // Had class
			vi.mocked(summaries.generateDailySummary).mockResolvedValue(5);
			vi.mocked(summaries.getCurrentDayOfWeekInTimezone).mockReturnValue(0); // Sunday (rewards day)
			vi.mocked(summaries.isWeeklyRewardsDay).mockReturnValue(true);
			vi.mocked(summaries.generateWeeklyRewards).mockResolvedValue(8);

			const response = await GET({ request: mockRequest, locals: {} } as RequestContext);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body).toMatchObject({
				success: true,
				classesProcessed: 1,
				dailySummaries: {
					generated: 5,
					classesProcessed: 1
				},
				weeklyRewards: {
					awarded: 8,
					classesProcessed: 1
				}
			});
		});

		it('should handle multiple classes', async () => {
			const mockClasses = [
				{
					id: 'class-1',
					name: 'Math 101',
					teacher_id: 'teacher-1',
					school_id: 'school-1',
					created_at: '2025-01-01T00:00:00Z',
					updated_at: '2025-01-01T00:00:00Z',
					schools: {
						timezone: 'Europe/Paris',
						timetable: { week_config: DEFAULT_WEEK_CONFIG }
					}
				},
				{
					id: 'class-2',
					name: 'Physics 201',
					teacher_id: 'teacher-2',
					school_id: 'school-2',
					created_at: '2025-01-01T00:00:00Z',
					updated_at: '2025-01-01T00:00:00Z',
					schools: {
						timezone: 'America/New_York',
						timetable: { week_config: DEFAULT_WEEK_CONFIG }
					}
				}
			];

			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						data: mockClasses,
						error: null
					})
				})
			});

			const yesterday = new Date('2025-11-12T00:00:00Z');

			vi.mocked(summaries.getYesterdayInTimezone).mockReturnValue(yesterday);
			vi.mocked(summaries.checkClassSchedule).mockResolvedValue(true);
			vi.mocked(summaries.generateDailySummary).mockResolvedValue(5);
			vi.mocked(summaries.getCurrentDayOfWeekInTimezone).mockReturnValue(0);
			vi.mocked(summaries.isWeeklyRewardsDay).mockReturnValue(false);

			const response = await GET({ request: mockRequest, locals: {} } as RequestContext);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body).toMatchObject({
				success: true,
				classesProcessed: 2,
				dailySummaries: {
					generated: 10, // 5 per class
					classesProcessed: 2
				}
			});
		});
	});

	// ============================================================
	// Timezone Tests
	// ============================================================
	describe('Timezone Handling', () => {
		it('should use school timezone for calculations', async () => {
			const mockClass = {
				id: 'class-1',
				name: 'Math 101',
				teacher_id: 'teacher-1',
				school_id: 'school-1',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z',
				schools: {
					timezone: 'America/Los_Angeles',
					timetable: {
						week_config: DEFAULT_WEEK_CONFIG
					}
				}
			};

			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						data: [mockClass],
						error: null
					})
				})
			});

			const yesterday = new Date('2025-11-12T00:00:00Z');

			vi.mocked(summaries.getYesterdayInTimezone).mockReturnValue(yesterday);
			vi.mocked(summaries.checkClassSchedule).mockResolvedValue(true);
			vi.mocked(summaries.generateDailySummary).mockResolvedValue(5);
			vi.mocked(summaries.getCurrentDayOfWeekInTimezone).mockReturnValue(1);
			vi.mocked(summaries.isWeeklyRewardsDay).mockReturnValue(false);

			await GET({ request: mockRequest, locals: {} } as RequestContext);

			expect(summaries.getYesterdayInTimezone).toHaveBeenCalledWith('America/Los_Angeles');
			expect(summaries.getCurrentDayOfWeekInTimezone).toHaveBeenCalledWith('America/Los_Angeles');
		});

		it('should default to Europe/Paris if timezone missing', async () => {
			const mockClass = {
				id: 'class-1',
				name: 'Math 101',
				teacher_id: 'teacher-1',
				school_id: 'school-1',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z',
				schools: null // No school data
			};

			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						data: [mockClass],
						error: null
					})
				})
			});

			const yesterday = new Date('2025-11-12T00:00:00Z');

			vi.mocked(summaries.getYesterdayInTimezone).mockReturnValue(yesterday);
			vi.mocked(summaries.checkClassSchedule).mockResolvedValue(true);
			vi.mocked(summaries.generateDailySummary).mockResolvedValue(5);
			vi.mocked(summaries.getCurrentDayOfWeekInTimezone).mockReturnValue(1);
			vi.mocked(summaries.isWeeklyRewardsDay).mockReturnValue(false);

			await GET({ request: mockRequest, locals: {} } as RequestContext);

			expect(summaries.getYesterdayInTimezone).toHaveBeenCalledWith('Europe/Paris');
			expect(summaries.generateDailySummary).toHaveBeenCalledWith(
				mockSupabase,
				mockClass,
				yesterday,
				'Europe/Paris'
			);
		});

		it('should use DEFAULT_WEEK_CONFIG if week_config missing', async () => {
			const mockClass = {
				id: 'class-1',
				name: 'Math 101',
				teacher_id: 'teacher-1',
				school_id: 'school-1',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z',
				schools: {
					timezone: 'Europe/Paris',
					timetable: null // No timetable
				}
			};

			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						data: [mockClass],
						error: null
					})
				})
			});

			const yesterday = new Date('2025-11-12T00:00:00Z');

			vi.mocked(summaries.getYesterdayInTimezone).mockReturnValue(yesterday);
			vi.mocked(summaries.checkClassSchedule).mockResolvedValue(false);
			vi.mocked(summaries.getCurrentDayOfWeekInTimezone).mockReturnValue(0);
			vi.mocked(summaries.isWeeklyRewardsDay).mockReturnValue(true);
			vi.mocked(summaries.generateWeeklyRewards).mockResolvedValue(8);

			await GET({ request: mockRequest, locals: {} } as RequestContext);

			expect(summaries.generateWeeklyRewards).toHaveBeenCalledWith(
				mockSupabase,
				mockClass,
				DEFAULT_WEEK_CONFIG,
				'Europe/Paris'
			);
		});
	});

	// ============================================================
	// Error Handling Tests
	// ============================================================
	describe('Error Handling', () => {
		it('should return 500 if fetching classes fails', async () => {
			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						data: null,
						error: { message: 'Database connection failed' }
					})
				})
			});

			const response = await GET({ request: mockRequest, locals: {} } as RequestContext);
			const body = await response.json();

			expect(response.status).toBe(500);
			expect(body).toMatchObject({
				success: false,
				error: 'Failed to fetch classes: Database connection failed'
			});
		});

		it('should continue processing other classes if one fails', async () => {
			const mockClasses = [
				{
					id: 'class-1',
					name: 'Math 101',
					teacher_id: 'teacher-1',
					school_id: 'school-1',
					created_at: '2025-01-01T00:00:00Z',
					updated_at: '2025-01-01T00:00:00Z',
					schools: {
						timezone: 'Europe/Paris',
						timetable: { week_config: DEFAULT_WEEK_CONFIG }
					}
				},
				{
					id: 'class-2',
					name: 'Physics 201',
					teacher_id: 'teacher-2',
					school_id: 'school-2',
					created_at: '2025-01-01T00:00:00Z',
					updated_at: '2025-01-01T00:00:00Z',
					schools: {
						timezone: 'America/New_York',
						timetable: { week_config: DEFAULT_WEEK_CONFIG }
					}
				}
			];

			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						data: mockClasses,
						error: null
					})
				})
			});

			const yesterday = new Date('2025-11-12T00:00:00Z');

			vi.mocked(summaries.getYesterdayInTimezone).mockReturnValue(yesterday);
			vi.mocked(summaries.getCurrentDayOfWeekInTimezone).mockReturnValue(1);
			vi.mocked(summaries.isWeeklyRewardsDay).mockReturnValue(false);

			// First class fails, second succeeds
			vi.mocked(summaries.checkClassSchedule)
				.mockRejectedValueOnce(new Error('Database timeout'))
				.mockResolvedValueOnce(true);

			vi.mocked(summaries.generateDailySummary).mockResolvedValue(5);

			const response = await GET({ request: mockRequest, locals: {} } as RequestContext);
			const body = await response.json();

			expect(response.status).toBe(207); // Partial success
			expect(body).toMatchObject({
				success: false,
				classesProcessed: 2,
				dailySummaries: {
					generated: 5, // Only from second class
					classesProcessed: 1
				}
			});

			expect(body.dailySummaries.errors).toHaveLength(1);
			expect(body.dailySummaries.errors[0]).toContain('class-1');
			expect(body.dailySummaries.errors[0]).toContain('Database timeout');
		});

		it('should track partial success in job run metadata', async () => {
			const mockClass = {
				id: 'class-1',
				name: 'Math 101',
				teacher_id: 'teacher-1',
				school_id: 'school-1',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z',
				schools: {
					timezone: 'Europe/Paris',
					timetable: { week_config: DEFAULT_WEEK_CONFIG }
				}
			};

			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						data: [mockClass],
						error: null
					})
				})
			});

			const yesterday = new Date('2025-11-12T00:00:00Z');

			vi.mocked(summaries.getYesterdayInTimezone).mockReturnValue(yesterday);
			vi.mocked(summaries.checkClassSchedule).mockRejectedValue(new Error('Daily summary error'));
			vi.mocked(summaries.getCurrentDayOfWeekInTimezone).mockReturnValue(1);
			vi.mocked(summaries.isWeeklyRewardsDay).mockReturnValue(false);

			await GET({ request: mockRequest, locals: {} } as RequestContext);

			expect(mockSupabase.rpc).toHaveBeenCalledWith(
				'complete_job_run',
				expect.objectContaining({
					p_status: 'partial_failure',
					p_metadata: expect.objectContaining({
						daily_summaries_errors: 1
					})
				})
			);
		});

		it('should handle job tracking failures gracefully', async () => {
			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						data: [],
						error: null
					})
				})
			});

			// Simulate job tracking failure
			mockSupabase.rpc.mockImplementation((funcName: string) => {
				if (funcName === 'start_job_run') {
					return Promise.resolve({
						data: null,
						error: { message: 'RPC failed' }
					});
				}
				return Promise.resolve({ data: null, error: null });
			});

			const response = await GET({ request: mockRequest, locals: {} } as RequestContext);

			// Should still succeed (job tracking failure shouldn't block processing)
			expect(response.status).toBe(200);
		});
	});

	// ============================================================
	// Response Format Tests
	// ============================================================
	describe('Response Format', () => {
		it('should include timestamp in response', async () => {
			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						data: [],
						error: null
					})
				})
			});

			const response = await GET({ request: mockRequest, locals: {} } as RequestContext);
			const body = await response.json();

			expect(body.timestamp).toBeDefined();
			expect(new Date(body.timestamp).getTime()).toBeGreaterThan(0);
		});

		it('should not include errors field when no errors', async () => {
			const mockClass = {
				id: 'class-1',
				name: 'Math 101',
				teacher_id: 'teacher-1',
				school_id: 'school-1',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z',
				schools: {
					timezone: 'Europe/Paris',
					timetable: { week_config: DEFAULT_WEEK_CONFIG }
				}
			};

			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						data: [mockClass],
						error: null
					})
				})
			});

			const yesterday = new Date('2025-11-12T00:00:00Z');

			vi.mocked(summaries.getYesterdayInTimezone).mockReturnValue(yesterday);
			vi.mocked(summaries.checkClassSchedule).mockResolvedValue(true);
			vi.mocked(summaries.generateDailySummary).mockResolvedValue(5);
			vi.mocked(summaries.getCurrentDayOfWeekInTimezone).mockReturnValue(1);
			vi.mocked(summaries.isWeeklyRewardsDay).mockReturnValue(false);

			const response = await GET({ request: mockRequest, locals: {} } as RequestContext);
			const body = await response.json();

			expect(body.dailySummaries.errors).toBeUndefined();
			expect(body.weeklyRewards.errors).toBeUndefined();
		});
	});
});
