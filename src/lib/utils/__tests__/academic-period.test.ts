/**
 * Academic Period Utilities Tests
 * =================================
 *
 * Tests for academic period helper functions, including current period detection.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	findCurrentPeriod,
	getPeriodName,
	isDateInPeriod,
	getPeriodsForYear
} from '$lib/utils/academic-period';
import type { Database } from '$lib/types/database';

type AcademicPeriod = Database['public']['Tables']['academic_periods']['Row'];

describe('findCurrentPeriod', () => {
	beforeEach(() => {
		// Mock current date to Oct 15, 2024
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2024-10-15T10:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should return null for empty array', () => {
		const result = findCurrentPeriod([]);
		expect(result).toBeNull();
	});

	it('should find period where today is within date range', () => {
		const periods: AcademicPeriod[] = [
			{
				id: 'period-1',
				name: 'Trimestre 1',
				start_date: '2024-09-01',
				end_date: '2024-12-15',
				school_year_id: 'year-2024',
				period_order: 1,
				type: 'trimester',
				color: '#ff0000',
				created_at: '2024-01-01',
				updated_at: '2024-01-01',
				metadata: {}
			},
			{
				id: 'period-2',
				name: 'Trimestre 2',
				start_date: '2024-12-16',
				end_date: '2025-03-31',
				school_year_id: 'year-2024',
				period_order: 2,
				type: 'trimester',
				color: '#00ff00',
				created_at: '2024-01-01',
				updated_at: '2024-01-01',
				metadata: {}
			}
		];

		// Current date (Oct 15) should match period-1
		const result = findCurrentPeriod(periods);
		expect(result).toBe('period-1');
	});

	it('should return most recent period when no active period', () => {
		// Mock date to summer break (Aug 1, 2024)
		vi.setSystemTime(new Date('2024-08-01T10:00:00Z'));

		const periods: AcademicPeriod[] = [
			{
				id: 'period-1',
				name: 'Trimestre 1',
				start_date: '2024-09-01',
				end_date: '2024-12-15',
				school_year_id: 'year-2024',
				period_order: 1,
				type: 'trimester',
				color: '#ff0000',
				created_at: '2024-01-01',
				updated_at: '2024-01-01',
				metadata: {}
			},
			{
				id: 'period-old',
				name: 'Trimestre 3 (last year)',
				start_date: '2023-04-01',
				end_date: '2023-06-30',
				school_year_id: 'year-2023',
				period_order: 3,
				type: 'trimester',
				color: '#0000ff',
				created_at: '2024-01-01',
				updated_at: '2024-01-01',
				metadata: {}
			}
		];

		// Should return period-1 (most recent by start_date)
		const result = findCurrentPeriod(periods);
		expect(result).toBe('period-1');
	});

	it('should handle edge case at period boundary (start date)', () => {
		// Mock date to exactly start of period
		vi.setSystemTime(new Date('2024-09-01T00:00:00Z'));

		const periods: AcademicPeriod[] = [
			{
				id: 'period-1',
				name: 'Trimestre 1',
				start_date: '2024-09-01',
				end_date: '2024-12-15',
				school_year_id: 'year-2024',
				period_order: 1,
				type: 'trimester',
				color: '#ff0000',
				created_at: '2024-01-01',
				updated_at: '2024-01-01',
				metadata: {}
			}
		];

		const result = findCurrentPeriod(periods);
		expect(result).toBe('period-1');
	});

	it('should handle edge case at period boundary (end date)', () => {
		// Mock date to exactly end of period
		vi.setSystemTime(new Date('2024-12-15T23:59:59Z'));

		const periods: AcademicPeriod[] = [
			{
				id: 'period-1',
				name: 'Trimestre 1',
				start_date: '2024-09-01',
				end_date: '2024-12-15',
				school_year_id: 'year-2024',
				period_order: 1,
				type: 'trimester',
				color: '#ff0000',
				created_at: '2024-01-01',
				updated_at: '2024-01-01',
				metadata: {}
			}
		];

		const result = findCurrentPeriod(periods);
		expect(result).toBe('period-1');
	});
});

describe('getPeriodName', () => {
	it('should return period name when set', () => {
		const period: AcademicPeriod = {
			id: 'period-1',
			name: 'Trimestre 1',
			start_date: '2024-09-01',
			end_date: '2024-12-15',
			school_year_id: 'year-2024',
			period_order: 1,
			type: 'trimester',
			color: '#ff0000',
			created_at: '2024-01-01',
			updated_at: '2024-01-01',
			metadata: {}
		};

		expect(getPeriodName(period)).toBe('Trimestre 1');
	});

	it('should return fallback name when name is empty', () => {
		const period: AcademicPeriod = {
			id: 'period-1',
			name: '',
			start_date: '2024-09-01',
			end_date: '2024-12-15',
			school_year_id: 'year-2024',
			period_order: 1,
			type: 'trimester',
			color: '#ff0000',
			created_at: '2024-01-01',
			updated_at: '2024-01-01',
			metadata: {}
		};

		expect(getPeriodName(period)).toBe('Période 2024');
	});
});

describe('isDateInPeriod', () => {
	const period: AcademicPeriod = {
		id: 'period-1',
		name: 'Trimestre 1',
		start_date: '2024-09-01',
		end_date: '2024-12-15',
		school_year_id: 'year-2024',
		period_order: 1,
		type: 'trimester',
		color: '#ff0000',
		created_at: '2024-01-01',
		updated_at: '2024-01-01',
		metadata: {}
	};

	it('should return true for date within period', () => {
		expect(isDateInPeriod('2024-10-15', period)).toBe(true);
	});

	it('should return false for date before period', () => {
		expect(isDateInPeriod('2024-08-15', period)).toBe(false);
	});

	it('should return false for date after period', () => {
		expect(isDateInPeriod('2024-12-20', period)).toBe(false);
	});

	it('should handle Date objects', () => {
		const date = new Date('2024-10-15');
		expect(isDateInPeriod(date, period)).toBe(true);
	});
});

describe('getPeriodsForYear', () => {
	it('should filter periods by school year', () => {
		const periods: AcademicPeriod[] = [
			{
				id: 'period-1',
				name: 'Trimestre 1',
				start_date: '2024-09-01',
				end_date: '2024-12-15',
				school_year_id: 'year-2024',
				period_order: 1,
				type: 'trimester',
				color: '#ff0000',
				created_at: '2024-01-01',
				updated_at: '2024-01-01',
				metadata: {}
			},
			{
				id: 'period-2',
				name: 'Trimestre 2',
				start_date: '2024-12-16',
				end_date: '2025-03-31',
				school_year_id: 'year-2024',
				period_order: 2,
				type: 'trimester',
				color: '#00ff00',
				created_at: '2024-01-01',
				updated_at: '2024-01-01',
				metadata: {}
			},
			{
				id: 'period-old',
				name: 'Trimestre 3 (last year)',
				start_date: '2023-04-01',
				end_date: '2023-06-30',
				school_year_id: 'year-2023',
				period_order: 3,
				type: 'trimester',
				color: '#0000ff',
				created_at: '2024-01-01',
				updated_at: '2024-01-01',
				metadata: {}
			}
		];

		const result = getPeriodsForYear(periods, 'year-2024');
		expect(result).toHaveLength(2);
		expect(result.map((p) => p.id)).toEqual(['period-1', 'period-2']);
	});

	it('should return empty array when no periods match', () => {
		const periods: AcademicPeriod[] = [
			{
				id: 'period-1',
				name: 'Trimestre 1',
				start_date: '2024-09-01',
				end_date: '2024-12-15',
				school_year_id: 'year-2024',
				period_order: 1,
				type: 'trimester',
				color: '#ff0000',
				created_at: '2024-01-01',
				updated_at: '2024-01-01',
				metadata: {}
			}
		];

		const result = getPeriodsForYear(periods, 'year-2023');
		expect(result).toHaveLength(0);
	});
});
