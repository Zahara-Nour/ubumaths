import { describe, it, expect } from 'vitest';
import {
	createSchoolYearSchema,
	updateSchoolYearSchema,
	deleteSchoolYearSchema,
	setActiveYearSchema,
	createAcademicPeriodSchema,
	updateAcademicPeriodSchema,
	deleteAcademicPeriodSchema,
	createSchoolHolidaySchema,
	updateSchoolHolidaySchema,
	deleteSchoolHolidaySchema,
	duplicateSchoolYearSchema,
	getPeriodsSchema,
	getActiveYearSchema,
	linkAssessmentsSchema
} from '$lib/server/validation/academic';

describe('Academic Validation Schemas', () => {
	const validUuid = '550e8400-e29b-41d4-a716-446655440000';
	const anotherUuid = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

	// ========================================
	// School Year Operations
	// ========================================

	describe('createSchoolYearSchema', () => {
		it('accepts valid school year data', () => {
			const result = createSchoolYearSchema.safeParse({
				school_id: validUuid,
				name: '2024-2025',
				start_date: '2024-09-01',
				end_date: '2025-08-31',
				is_active: true
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.school_id).toBe(validUuid);
				expect(result.data.name).toBe('2024-2025');
				expect(result.data.is_active).toBe(true);
			}
		});

		it('applies default values', () => {
			const result = createSchoolYearSchema.safeParse({
				school_id: validUuid,
				name: '2024-2025',
				start_date: '2024-09-01',
				end_date: '2025-08-31'
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.is_active).toBe(false);
				expect(result.data.metadata).toEqual({});
			}
		});

		it('rejects missing required fields', () => {
			const result = createSchoolYearSchema.safeParse({
				name: '2024-2025'
			});
			expect(result.success).toBe(false);
		});

		it('rejects missing school_id', () => {
			const result = createSchoolYearSchema.safeParse({
				name: '2024-2025',
				start_date: '2024-09-01',
				end_date: '2025-08-31'
			});
			expect(result.success).toBe(false);
		});

		it('rejects missing name', () => {
			const result = createSchoolYearSchema.safeParse({
				school_id: validUuid,
				start_date: '2024-09-01',
				end_date: '2025-08-31'
			});
			expect(result.success).toBe(false);
		});

		it('rejects missing start_date', () => {
			const result = createSchoolYearSchema.safeParse({
				school_id: validUuid,
				name: '2024-2025',
				end_date: '2025-08-31'
			});
			expect(result.success).toBe(false);
		});

		it('rejects missing end_date', () => {
			const result = createSchoolYearSchema.safeParse({
				school_id: validUuid,
				name: '2024-2025',
				start_date: '2024-09-01'
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid year format: two-digit years', () => {
			const result = createSchoolYearSchema.safeParse({
				school_id: validUuid,
				name: '24-25',
				start_date: '2024-09-01',
				end_date: '2025-08-31'
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid year format: three years', () => {
			const result = createSchoolYearSchema.safeParse({
				school_id: validUuid,
				name: '2024-2025-2026',
				start_date: '2024-09-01',
				end_date: '2025-08-31'
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid year format: single year', () => {
			const result = createSchoolYearSchema.safeParse({
				school_id: validUuid,
				name: '2024',
				start_date: '2024-09-01',
				end_date: '2025-08-31'
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid year format: wrong separator', () => {
			const result = createSchoolYearSchema.safeParse({
				school_id: validUuid,
				name: '2024/2025',
				start_date: '2024-09-01',
				end_date: '2025-08-31'
			});
			expect(result.success).toBe(false);
		});

		it('rejects non-consecutive years', () => {
			const result = createSchoolYearSchema.safeParse({
				school_id: validUuid,
				name: '2024-2026',
				start_date: '2024-09-01',
				end_date: '2026-08-31'
			});
			expect(result.success).toBe(false);
		});

		it('rejects non-consecutive years: reverse order', () => {
			const result = createSchoolYearSchema.safeParse({
				school_id: validUuid,
				name: '2025-2024',
				start_date: '2024-09-01',
				end_date: '2025-08-31'
			});
			expect(result.success).toBe(false);
		});

		it('rejects non-consecutive years: same year', () => {
			const result = createSchoolYearSchema.safeParse({
				school_id: validUuid,
				name: '2024-2024',
				start_date: '2024-09-01',
				end_date: '2025-08-31'
			});
			expect(result.success).toBe(false);
		});

		it('rejects end_date before start_date', () => {
			const result = createSchoolYearSchema.safeParse({
				school_id: validUuid,
				name: '2024-2025',
				start_date: '2025-08-31',
				end_date: '2024-09-01'
			});
			expect(result.success).toBe(false);
		});

		it('rejects end_date equal to start_date', () => {
			const result = createSchoolYearSchema.safeParse({
				school_id: validUuid,
				name: '2024-2025',
				start_date: '2024-09-01',
				end_date: '2024-09-01'
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid UUID', () => {
			const result = createSchoolYearSchema.safeParse({
				school_id: 'not-a-uuid',
				name: '2024-2025',
				start_date: '2024-09-01',
				end_date: '2025-08-31'
			});
			expect(result.success).toBe(false);
		});

		it('rejects malformed UUID', () => {
			const result = createSchoolYearSchema.safeParse({
				school_id: '550e8400-e29b-41d4-a716',
				name: '2024-2025',
				start_date: '2024-09-01',
				end_date: '2025-08-31'
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid date format', () => {
			const result = createSchoolYearSchema.safeParse({
				school_id: validUuid,
				name: '2024-2025',
				start_date: '2024/09/01',
				end_date: '2025-08-31'
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid date: month 13', () => {
			const result = createSchoolYearSchema.safeParse({
				school_id: validUuid,
				name: '2024-2025',
				start_date: '2024-13-01',
				end_date: '2025-08-31'
			});
			expect(result.success).toBe(false);
		});

		it('rejects name too long', () => {
			const result = createSchoolYearSchema.safeParse({
				school_id: validUuid,
				name: '2024-2025'.repeat(10), // 90 chars
				start_date: '2024-09-01',
				end_date: '2025-08-31'
			});
			expect(result.success).toBe(false);
		});

		it('trims whitespace from name', () => {
			const result = createSchoolYearSchema.safeParse({
				school_id: validUuid,
				name: '  2024-2025  ',
				start_date: '2024-09-01',
				end_date: '2025-08-31'
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.name).toBe('2024-2025');
			}
		});

		it('accepts custom metadata', () => {
			const result = createSchoolYearSchema.safeParse({
				school_id: validUuid,
				name: '2024-2025',
				start_date: '2024-09-01',
				end_date: '2025-08-31',
				metadata: { custom_field: 'value', another: 'data' }
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.metadata).toEqual({ custom_field: 'value', another: 'data' });
			}
		});
	});

	describe('updateSchoolYearSchema', () => {
		it('accepts partial update: name only', () => {
			const result = updateSchoolYearSchema.safeParse({
				id: validUuid,
				name: '2025-2026'
			});
			expect(result.success).toBe(true);
		});

		it('accepts partial update: dates only', () => {
			const result = updateSchoolYearSchema.safeParse({
				id: validUuid,
				start_date: '2024-09-02',
				end_date: '2025-08-30'
			});
			expect(result.success).toBe(true);
		});

		it('accepts partial update: is_active only', () => {
			const result = updateSchoolYearSchema.safeParse({
				id: validUuid,
				is_active: true
			});
			expect(result.success).toBe(true);
		});

		it('accepts full update', () => {
			const result = updateSchoolYearSchema.safeParse({
				id: validUuid,
				school_id: anotherUuid,
				name: '2025-2026',
				start_date: '2025-09-01',
				end_date: '2026-08-31',
				is_active: false
			});
			expect(result.success).toBe(true);
		});

		it('requires ID', () => {
			const result = updateSchoolYearSchema.safeParse({
				name: '2025-2026'
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid UUID in ID', () => {
			const result = updateSchoolYearSchema.safeParse({
				id: 'not-a-uuid',
				name: '2025-2026'
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid year format in update', () => {
			const result = updateSchoolYearSchema.safeParse({
				id: validUuid,
				name: '24-25'
			});
			expect(result.success).toBe(false);
		});

		it('validates year format but not consecutiveness in partial update', () => {
			// Year format is validated (regex), but consecutiveness check
			// requires full data, so '2024-2026' passes format but would need
			// full validation context to check consecutiveness
			const result = updateSchoolYearSchema.safeParse({
				id: validUuid,
				name: '2024-2026'
			});
			// Format passes (YYYY-YYYY), but consecutiveness isn't checked without dates
			expect(result.success).toBe(true);
		});
	});

	describe('deleteSchoolYearSchema', () => {
		it('accepts valid UUID', () => {
			const result = deleteSchoolYearSchema.safeParse({
				id: validUuid
			});
			expect(result.success).toBe(true);
		});

		it('rejects missing ID', () => {
			const result = deleteSchoolYearSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		it('rejects invalid UUID', () => {
			const result = deleteSchoolYearSchema.safeParse({
				id: 'not-a-uuid'
			});
			expect(result.success).toBe(false);
		});
	});

	describe('setActiveYearSchema', () => {
		it('accepts valid year_id and school_id', () => {
			const result = setActiveYearSchema.safeParse({
				id: validUuid,
				school_id: anotherUuid
			});
			expect(result.success).toBe(true);
		});

		it('rejects missing id', () => {
			const result = setActiveYearSchema.safeParse({
				school_id: validUuid
			});
			expect(result.success).toBe(false);
		});

		it('rejects missing school_id', () => {
			const result = setActiveYearSchema.safeParse({
				id: validUuid
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid UUID in id', () => {
			const result = setActiveYearSchema.safeParse({
				id: 'invalid',
				school_id: validUuid
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid UUID in school_id', () => {
			const result = setActiveYearSchema.safeParse({
				id: validUuid,
				school_id: 'invalid'
			});
			expect(result.success).toBe(false);
		});
	});

	// ========================================
	// Academic Period Operations
	// ========================================

	describe('createAcademicPeriodSchema', () => {
		it('accepts valid trimester data', () => {
			const result = createAcademicPeriodSchema.safeParse({
				school_year_id: validUuid,
				type: 'trimester',
				name: 'Trimestre 1',
				start_date: '2024-09-01',
				end_date: '2024-12-20',
				period_order: 1,
				color: '#3b82f6'
			});
			expect(result.success).toBe(true);
		});

		it('accepts valid semester data', () => {
			const result = createAcademicPeriodSchema.safeParse({
				school_year_id: validUuid,
				type: 'semester',
				name: 'Semestre 1',
				start_date: '2024-09-01',
				end_date: '2025-01-31',
				period_order: 1
			});
			expect(result.success).toBe(true);
		});

		it('accepts valid quarter data', () => {
			const result = createAcademicPeriodSchema.safeParse({
				school_year_id: validUuid,
				type: 'quarter',
				name: 'Q1',
				start_date: '2024-09-01',
				end_date: '2024-11-30',
				period_order: 1
			});
			expect(result.success).toBe(true);
		});

		it('accepts valid custom period data', () => {
			const result = createAcademicPeriodSchema.safeParse({
				school_year_id: validUuid,
				type: 'custom',
				name: 'Période spéciale',
				start_date: '2024-09-01',
				end_date: '2024-10-15',
				period_order: 1
			});
			expect(result.success).toBe(true);
		});

		it('applies default color', () => {
			const result = createAcademicPeriodSchema.safeParse({
				school_year_id: validUuid,
				type: 'trimester',
				name: 'Trimestre 1',
				start_date: '2024-09-01',
				end_date: '2024-12-20',
				period_order: 1
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.color).toBe('#3b82f6');
			}
		});

		it('applies default metadata', () => {
			const result = createAcademicPeriodSchema.safeParse({
				school_year_id: validUuid,
				type: 'trimester',
				name: 'Trimestre 1',
				start_date: '2024-09-01',
				end_date: '2024-12-20',
				period_order: 1
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.metadata).toEqual({});
			}
		});

		it('rejects missing required fields', () => {
			const result = createAcademicPeriodSchema.safeParse({
				name: 'Trimestre 1'
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid period type', () => {
			const result = createAcademicPeriodSchema.safeParse({
				school_year_id: validUuid,
				type: 'invalid',
				name: 'Période',
				start_date: '2024-09-01',
				end_date: '2024-12-20',
				period_order: 1
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid period type: tri-mestre', () => {
			const result = createAcademicPeriodSchema.safeParse({
				school_year_id: validUuid,
				type: 'tri-mestre',
				name: 'Période',
				start_date: '2024-09-01',
				end_date: '2024-12-20',
				period_order: 1
			});
			expect(result.success).toBe(false);
		});

		it('rejects period_order less than 1', () => {
			const result = createAcademicPeriodSchema.safeParse({
				school_year_id: validUuid,
				type: 'trimester',
				name: 'Trimestre',
				start_date: '2024-09-01',
				end_date: '2024-12-20',
				period_order: 0
			});
			expect(result.success).toBe(false);
		});

		it('rejects period_order greater than 10', () => {
			const result = createAcademicPeriodSchema.safeParse({
				school_year_id: validUuid,
				type: 'trimester',
				name: 'Trimestre',
				start_date: '2024-09-01',
				end_date: '2024-12-20',
				period_order: 11
			});
			expect(result.success).toBe(false);
		});

		it('rejects negative period_order', () => {
			const result = createAcademicPeriodSchema.safeParse({
				school_year_id: validUuid,
				type: 'trimester',
				name: 'Trimestre',
				start_date: '2024-09-01',
				end_date: '2024-12-20',
				period_order: -1
			});
			expect(result.success).toBe(false);
		});

		it('rejects fractional period_order', () => {
			const result = createAcademicPeriodSchema.safeParse({
				school_year_id: validUuid,
				type: 'trimester',
				name: 'Trimestre',
				start_date: '2024-09-01',
				end_date: '2024-12-20',
				period_order: 1.5
			});
			expect(result.success).toBe(false);
		});

		it('accepts period_order 1 to 10', () => {
			for (let order = 1; order <= 10; order++) {
				const result = createAcademicPeriodSchema.safeParse({
					school_year_id: validUuid,
					type: 'trimester',
					name: `Période ${order}`,
					start_date: '2024-09-01',
					end_date: '2024-12-20',
					period_order: order
				});
				expect(result.success).toBe(true);
			}
		});

		it('rejects end_date before start_date', () => {
			const result = createAcademicPeriodSchema.safeParse({
				school_year_id: validUuid,
				type: 'trimester',
				name: 'Trimestre',
				start_date: '2024-12-20',
				end_date: '2024-09-01',
				period_order: 1
			});
			expect(result.success).toBe(false);
		});

		it('rejects end_date equal to start_date', () => {
			const result = createAcademicPeriodSchema.safeParse({
				school_year_id: validUuid,
				type: 'trimester',
				name: 'Trimestre',
				start_date: '2024-09-01',
				end_date: '2024-09-01',
				period_order: 1
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid color format: short hex', () => {
			const result = createAcademicPeriodSchema.safeParse({
				school_year_id: validUuid,
				type: 'trimester',
				name: 'Trimestre',
				start_date: '2024-09-01',
				end_date: '2024-12-20',
				period_order: 1,
				color: '#3b8'
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid color format: color name', () => {
			const result = createAcademicPeriodSchema.safeParse({
				school_year_id: validUuid,
				type: 'trimester',
				name: 'Trimestre',
				start_date: '2024-09-01',
				end_date: '2024-12-20',
				period_order: 1,
				color: 'blue'
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid color format: invalid hex characters', () => {
			const result = createAcademicPeriodSchema.safeParse({
				school_year_id: validUuid,
				type: 'trimester',
				name: 'Trimestre',
				start_date: '2024-09-01',
				end_date: '2024-12-20',
				period_order: 1,
				color: '#GGGGGG'
			});
			expect(result.success).toBe(false);
		});

		it('rejects color without hash', () => {
			const result = createAcademicPeriodSchema.safeParse({
				school_year_id: validUuid,
				type: 'trimester',
				name: 'Trimestre',
				start_date: '2024-09-01',
				end_date: '2024-12-20',
				period_order: 1,
				color: '3b82f6'
			});
			expect(result.success).toBe(false);
		});

		it('accepts valid hex colors', () => {
			const validColors = ['#000000', '#ffffff', '#3b82f6', '#ef4444', '#10b981', '#f59e0b'];
			validColors.forEach((color) => {
				const result = createAcademicPeriodSchema.safeParse({
					school_year_id: validUuid,
					type: 'trimester',
					name: 'Trimestre',
					start_date: '2024-09-01',
					end_date: '2024-12-20',
					period_order: 1,
					color
				});
				expect(result.success).toBe(true);
			});
		});

		it('rejects name too long', () => {
			const result = createAcademicPeriodSchema.safeParse({
				school_year_id: validUuid,
				type: 'trimester',
				name: 'T'.repeat(101),
				start_date: '2024-09-01',
				end_date: '2024-12-20',
				period_order: 1
			});
			expect(result.success).toBe(false);
		});

		it('trims whitespace from name', () => {
			const result = createAcademicPeriodSchema.safeParse({
				school_year_id: validUuid,
				type: 'trimester',
				name: '  Trimestre 1  ',
				start_date: '2024-09-01',
				end_date: '2024-12-20',
				period_order: 1
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.name).toBe('Trimestre 1');
			}
		});
	});

	describe('updateAcademicPeriodSchema', () => {
		it('accepts partial update: name only', () => {
			const result = updateAcademicPeriodSchema.safeParse({
				id: validUuid,
				name: 'Trimestre 1 (modifié)'
			});
			expect(result.success).toBe(true);
		});

		it('accepts partial update: color only', () => {
			const result = updateAcademicPeriodSchema.safeParse({
				id: validUuid,
				color: '#ef4444'
			});
			expect(result.success).toBe(true);
		});

		it('accepts partial update: dates only', () => {
			const result = updateAcademicPeriodSchema.safeParse({
				id: validUuid,
				start_date: '2024-09-02',
				end_date: '2024-12-21'
			});
			expect(result.success).toBe(true);
		});

		it('accepts partial update: type only', () => {
			const result = updateAcademicPeriodSchema.safeParse({
				id: validUuid,
				type: 'semester'
			});
			expect(result.success).toBe(true);
		});

		it('requires ID', () => {
			const result = updateAcademicPeriodSchema.safeParse({
				name: 'Trimestre'
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid data in updated fields', () => {
			const result = updateAcademicPeriodSchema.safeParse({
				id: validUuid,
				color: 'blue' // Invalid color format
			});
			expect(result.success).toBe(false);
		});
	});

	describe('deleteAcademicPeriodSchema', () => {
		it('accepts valid UUID', () => {
			const result = deleteAcademicPeriodSchema.safeParse({
				id: validUuid
			});
			expect(result.success).toBe(true);
		});

		it('rejects missing ID', () => {
			const result = deleteAcademicPeriodSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		it('rejects invalid UUID', () => {
			const result = deleteAcademicPeriodSchema.safeParse({
				id: 'not-a-uuid'
			});
			expect(result.success).toBe(false);
		});
	});

	// ========================================
	// School Holiday Operations
	// ========================================

	describe('createSchoolHolidaySchema', () => {
		it('accepts valid holiday data', () => {
			const result = createSchoolHolidaySchema.safeParse({
				school_year_id: validUuid,
				name: 'Vacances de Noël',
				start_date: '2024-12-21',
				end_date: '2025-01-05'
			});
			expect(result.success).toBe(true);
		});

		it('rejects missing required fields', () => {
			const result = createSchoolHolidaySchema.safeParse({
				name: 'Vacances'
			});
			expect(result.success).toBe(false);
		});

		it('rejects missing school_year_id', () => {
			const result = createSchoolHolidaySchema.safeParse({
				name: 'Vacances',
				start_date: '2024-12-21',
				end_date: '2025-01-05'
			});
			expect(result.success).toBe(false);
		});

		it('rejects missing name', () => {
			const result = createSchoolHolidaySchema.safeParse({
				school_year_id: validUuid,
				start_date: '2024-12-21',
				end_date: '2025-01-05'
			});
			expect(result.success).toBe(false);
		});

		it('rejects end_date before start_date', () => {
			const result = createSchoolHolidaySchema.safeParse({
				school_year_id: validUuid,
				name: 'Vacances',
				start_date: '2025-01-05',
				end_date: '2024-12-21'
			});
			expect(result.success).toBe(false);
		});

		it('rejects end_date equal to start_date', () => {
			const result = createSchoolHolidaySchema.safeParse({
				school_year_id: validUuid,
				name: 'Vacances',
				start_date: '2024-12-21',
				end_date: '2024-12-21'
			});
			expect(result.success).toBe(false);
		});

		it('rejects name too long', () => {
			const result = createSchoolHolidaySchema.safeParse({
				school_year_id: validUuid,
				name: 'V'.repeat(101),
				start_date: '2024-12-21',
				end_date: '2025-01-05'
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid date format', () => {
			const result = createSchoolHolidaySchema.safeParse({
				school_year_id: validUuid,
				name: 'Vacances',
				start_date: '2024/12/21',
				end_date: '2025-01-05'
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid date: month 13', () => {
			const result = createSchoolHolidaySchema.safeParse({
				school_year_id: validUuid,
				name: 'Vacances',
				start_date: '2024-13-01',
				end_date: '2025-01-05'
			});
			expect(result.success).toBe(false);
		});

		it('rejects malformed date', () => {
			const result = createSchoolHolidaySchema.safeParse({
				school_year_id: validUuid,
				name: 'Vacances',
				start_date: '2024-12',
				end_date: '2025-01-05'
			});
			expect(result.success).toBe(false);
		});

		it('trims whitespace from name', () => {
			const result = createSchoolHolidaySchema.safeParse({
				school_year_id: validUuid,
				name: '  Vacances de Noël  ',
				start_date: '2024-12-21',
				end_date: '2025-01-05'
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.name).toBe('Vacances de Noël');
			}
		});
	});

	describe('updateSchoolHolidaySchema', () => {
		it('accepts partial update: name only', () => {
			const result = updateSchoolHolidaySchema.safeParse({
				id: validUuid,
				name: 'Vacances de Noël (mise à jour)'
			});
			expect(result.success).toBe(true);
		});

		it('accepts partial update: end_date only', () => {
			const result = updateSchoolHolidaySchema.safeParse({
				id: validUuid,
				end_date: '2025-01-06'
			});
			expect(result.success).toBe(true);
		});

		it('accepts partial update: both dates', () => {
			const result = updateSchoolHolidaySchema.safeParse({
				id: validUuid,
				start_date: '2024-12-22',
				end_date: '2025-01-06'
			});
			expect(result.success).toBe(true);
		});

		it('requires ID', () => {
			const result = updateSchoolHolidaySchema.safeParse({
				name: 'Vacances'
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid UUID', () => {
			const result = updateSchoolHolidaySchema.safeParse({
				id: 'not-a-uuid',
				name: 'Vacances'
			});
			expect(result.success).toBe(false);
		});
	});

	describe('deleteSchoolHolidaySchema', () => {
		it('accepts valid UUID', () => {
			const result = deleteSchoolHolidaySchema.safeParse({
				id: validUuid
			});
			expect(result.success).toBe(true);
		});

		it('rejects missing ID', () => {
			const result = deleteSchoolHolidaySchema.safeParse({});
			expect(result.success).toBe(false);
		});

		it('rejects invalid UUID', () => {
			const result = deleteSchoolHolidaySchema.safeParse({
				id: 'invalid-uuid'
			});
			expect(result.success).toBe(false);
		});
	});

	// ========================================
	// Utility Operations
	// ========================================

	describe('duplicateSchoolYearSchema', () => {
		it('accepts valid duplication data', () => {
			const result = duplicateSchoolYearSchema.safeParse({
				source_year_id: validUuid,
				target_year_name: '2025-2026',
				include_periods: true,
				include_holidays: true,
				date_offset_days: 365
			});
			expect(result.success).toBe(true);
		});

		it('applies default values', () => {
			const result = duplicateSchoolYearSchema.safeParse({
				source_year_id: validUuid,
				target_year_name: '2025-2026'
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.include_periods).toBe(true);
				expect(result.data.include_holidays).toBe(true);
				expect(result.data.date_offset_days).toBe(365);
			}
		});

		it('accepts custom date offset', () => {
			const result = duplicateSchoolYearSchema.safeParse({
				source_year_id: validUuid,
				target_year_name: '2025-2026',
				date_offset_days: 370
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.date_offset_days).toBe(370);
			}
		});

		it('accepts negative date offset', () => {
			const result = duplicateSchoolYearSchema.safeParse({
				source_year_id: validUuid,
				target_year_name: '2023-2024',
				date_offset_days: -365
			});
			expect(result.success).toBe(true);
		});

		it('rejects invalid target year format', () => {
			const result = duplicateSchoolYearSchema.safeParse({
				source_year_id: validUuid,
				target_year_name: '25-26'
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid target year format: three years', () => {
			const result = duplicateSchoolYearSchema.safeParse({
				source_year_id: validUuid,
				target_year_name: '2025-2026-2027'
			});
			expect(result.success).toBe(false);
		});

		it('rejects non-integer date_offset_days', () => {
			const result = duplicateSchoolYearSchema.safeParse({
				source_year_id: validUuid,
				target_year_name: '2025-2026',
				date_offset_days: 365.5
			});
			expect(result.success).toBe(false);
		});

		it('rejects missing source_year_id', () => {
			const result = duplicateSchoolYearSchema.safeParse({
				target_year_name: '2025-2026'
			});
			expect(result.success).toBe(false);
		});

		it('rejects missing target_year_name', () => {
			const result = duplicateSchoolYearSchema.safeParse({
				source_year_id: validUuid
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid UUID in source_year_id', () => {
			const result = duplicateSchoolYearSchema.safeParse({
				source_year_id: 'not-a-uuid',
				target_year_name: '2025-2026'
			});
			expect(result.success).toBe(false);
		});
	});

	describe('getPeriodsSchema', () => {
		it('accepts valid school_year_id', () => {
			const result = getPeriodsSchema.safeParse({
				school_year_id: validUuid
			});
			expect(result.success).toBe(true);
		});

		it('accepts valid school_year_id with include_stats', () => {
			const result = getPeriodsSchema.safeParse({
				school_year_id: validUuid,
				include_stats: true
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.include_stats).toBe(true);
			}
		});

		it('accepts school_year_id without include_stats', () => {
			const result = getPeriodsSchema.safeParse({
				school_year_id: validUuid
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.include_stats).toBeUndefined();
			}
		});

		it('rejects missing school_year_id', () => {
			const result = getPeriodsSchema.safeParse({
				include_stats: true
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid UUID', () => {
			const result = getPeriodsSchema.safeParse({
				school_year_id: 'not-a-uuid'
			});
			expect(result.success).toBe(false);
		});
	});

	describe('getActiveYearSchema', () => {
		it('accepts valid school_id', () => {
			const result = getActiveYearSchema.safeParse({
				school_id: validUuid
			});
			expect(result.success).toBe(true);
		});

		it('rejects missing school_id', () => {
			const result = getActiveYearSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		it('rejects invalid UUID', () => {
			const result = getActiveYearSchema.safeParse({
				school_id: 'not-a-uuid'
			});
			expect(result.success).toBe(false);
		});
	});

	describe('linkAssessmentsSchema', () => {
		it('accepts valid school_year_id', () => {
			const result = linkAssessmentsSchema.safeParse({
				school_year_id: validUuid
			});
			expect(result.success).toBe(true);
		});

		it('rejects missing school_year_id', () => {
			const result = linkAssessmentsSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		it('rejects invalid UUID', () => {
			const result = linkAssessmentsSchema.safeParse({
				school_year_id: 'invalid-uuid'
			});
			expect(result.success).toBe(false);
		});
	});

	// ========================================
	// Cross-schema Integration Tests
	// ========================================

	describe('Integration: Complete school year setup', () => {
		it('validates complete workflow: create year → create periods → create holidays', () => {
			// Step 1: Create school year
			const yearResult = createSchoolYearSchema.safeParse({
				school_id: validUuid,
				name: '2024-2025',
				start_date: '2024-09-01',
				end_date: '2025-08-31',
				is_active: true
			});
			expect(yearResult.success).toBe(true);

			// Step 2: Create academic periods (3 trimesters)
			const periods = [
				{
					school_year_id: validUuid,
					type: 'trimester' as const,
					name: 'Trimestre 1',
					start_date: '2024-09-01',
					end_date: '2024-12-20',
					period_order: 1,
					color: '#3b82f6'
				},
				{
					school_year_id: validUuid,
					type: 'trimester' as const,
					name: 'Trimestre 2',
					start_date: '2025-01-06',
					end_date: '2025-03-31',
					period_order: 2,
					color: '#10b981'
				},
				{
					school_year_id: validUuid,
					type: 'trimester' as const,
					name: 'Trimestre 3',
					start_date: '2025-04-01',
					end_date: '2025-06-30',
					period_order: 3,
					color: '#f59e0b'
				}
			];

			periods.forEach((period) => {
				const periodResult = createAcademicPeriodSchema.safeParse(period);
				expect(periodResult.success).toBe(true);
			});

			// Step 3: Create school holidays
			const holidays = [
				{
					school_year_id: validUuid,
					name: 'Vacances de Noël',
					start_date: '2024-12-21',
					end_date: '2025-01-05'
				},
				{
					school_year_id: validUuid,
					name: 'Vacances de Printemps',
					start_date: '2025-04-15',
					end_date: '2025-04-30'
				}
			];

			holidays.forEach((holiday) => {
				const holidayResult = createSchoolHolidaySchema.safeParse(holiday);
				expect(holidayResult.success).toBe(true);
			});
		});

		it('validates duplication workflow with all options', () => {
			const duplicateResult = duplicateSchoolYearSchema.safeParse({
				source_year_id: validUuid,
				target_year_name: '2025-2026',
				include_periods: true,
				include_holidays: true,
				date_offset_days: 365
			});
			expect(duplicateResult.success).toBe(true);
		});
	});
});
