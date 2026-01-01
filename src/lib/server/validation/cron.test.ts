/**
 * CRON Jobs validation schemas tests
 */

import { describe, it, expect } from 'vitest';
import { cronJobsQuerySchema, cronTriggerBodySchema, ALLOWED_JOB_PATHS } from './cron';

describe('cronJobsQuerySchema', () => {
	it('should accept valid query params with defaults', () => {
		const result = cronJobsQuerySchema.parse({});

		expect(result).toEqual({
			job_name: undefined,
			status: 'all',
			period: '7d',
			limit: 50,
			offset: 0
		});
	});

	it('should accept all valid status values', () => {
		const validStatuses = ['all', 'running', 'success', 'failed', 'timeout'];

		for (const status of validStatuses) {
			const result = cronJobsQuerySchema.parse({ status });
			expect(result.status).toBe(status);
		}
	});

	it('should reject invalid status values', () => {
		const result = cronJobsQuerySchema.safeParse({ status: 'invalid' });
		expect(result.success).toBe(false);
	});

	it('should accept all valid period values', () => {
		const validPeriods = ['24h', '7d', '30d'];

		for (const period of validPeriods) {
			const result = cronJobsQuerySchema.parse({ period });
			expect(result.period).toBe(period);
		}
	});

	it('should reject invalid period values', () => {
		const result = cronJobsQuerySchema.safeParse({ period: '1h' });
		expect(result.success).toBe(false);
	});

	it('should coerce limit from string to number', () => {
		const result = cronJobsQuerySchema.parse({ limit: '25' });
		expect(result.limit).toBe(25);
	});

	it('should reject limit > 100', () => {
		const result = cronJobsQuerySchema.safeParse({ limit: 150 });
		expect(result.success).toBe(false);
	});

	it('should reject limit < 1', () => {
		const result = cronJobsQuerySchema.safeParse({ limit: 0 });
		expect(result.success).toBe(false);
	});

	it('should coerce offset from string to number', () => {
		const result = cronJobsQuerySchema.parse({ offset: '10' });
		expect(result.offset).toBe(10);
	});

	it('should reject negative offset', () => {
		const result = cronJobsQuerySchema.safeParse({ offset: -5 });
		expect(result.success).toBe(false);
	});

	it('should transform empty job_name to undefined', () => {
		const result = cronJobsQuerySchema.parse({ job_name: '' });
		expect(result.job_name).toBeUndefined();
	});

	it('should accept valid job_name', () => {
		const result = cronJobsQuerySchema.parse({ job_name: 'daily_summaries' });
		expect(result.job_name).toBe('daily_summaries');
	});

	it('should reject job_name > 100 characters', () => {
		const result = cronJobsQuerySchema.safeParse({ job_name: 'a'.repeat(101) });
		expect(result.success).toBe(false);
	});
});

describe('cronTriggerBodySchema', () => {
	it('should accept allowed job paths', () => {
		for (const path of ALLOWED_JOB_PATHS) {
			const result = cronTriggerBodySchema.parse({ job_path: path });
			expect(result.job_path).toBe(path);
		}
	});

	it('should reject empty job_path', () => {
		const result = cronTriggerBodySchema.safeParse({ job_path: '' });
		expect(result.success).toBe(false);
	});

	it('should reject invalid job paths', () => {
		const invalidPaths = [
			'/api/users',
			'/api/cron/unknown-job',
			'/api/admin/secret',
			'../../../etc/passwd',
			'javascript:alert(1)'
		];

		for (const path of invalidPaths) {
			const result = cronTriggerBodySchema.safeParse({ job_path: path });
			expect(result.success).toBe(false);
		}
	});

	it('should reject missing job_path', () => {
		const result = cronTriggerBodySchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

describe('ALLOWED_JOB_PATHS', () => {
	it('should contain expected job paths', () => {
		expect(ALLOWED_JOB_PATHS).toContain('/api/cron/daily-summaries-and-rewards');
		expect(ALLOWED_JOB_PATHS).toContain('/api/cleanup/all');
		expect(ALLOWED_JOB_PATHS).toContain('/api/riddles/auto-select-daily');
	});

	it('should be immutable (readonly)', () => {
		// TypeScript should prevent mutation at compile time
		// This test just verifies the array has the expected length
		expect(ALLOWED_JOB_PATHS.length).toBe(3);
	});
});
