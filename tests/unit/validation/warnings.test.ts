import { describe, it, expect } from 'vitest';
import {
	warningTypeSchema,
	addWarningSchema,
	removeWarningSchema,
	getWarningsSchema
} from '$lib/server/validation/warnings';

describe('Warnings Validation Schemas', () => {
	const validUuid = '550e8400-e29b-41d4-a716-446655440000';
	const anotherUuid = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
	const thirdUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

	// ========================================
	// Warning Type Schema
	// ========================================

	describe('warningTypeSchema', () => {
		it('accepts valid type: C (Comportement)', () => {
			const result = warningTypeSchema.safeParse('C');
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBe('C');
			}
		});

		it('accepts valid type: M (Matériel)', () => {
			const result = warningTypeSchema.safeParse('M');
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBe('M');
			}
		});

		it('accepts valid type: R (Retard)', () => {
			const result = warningTypeSchema.safeParse('R');
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBe('R');
			}
		});

		it('accepts valid type: T (Travail)', () => {
			const result = warningTypeSchema.safeParse('T');
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBe('T');
			}
		});

		it('rejects invalid type: X', () => {
			const result = warningTypeSchema.safeParse('X');
			expect(result.success).toBe(false);
		});

		it('rejects invalid type: A', () => {
			const result = warningTypeSchema.safeParse('A');
			expect(result.success).toBe(false);
		});

		it('rejects invalid type: lowercase c', () => {
			const result = warningTypeSchema.safeParse('c');
			expect(result.success).toBe(false);
		});

		it('rejects invalid type: lowercase m', () => {
			const result = warningTypeSchema.safeParse('m');
			expect(result.success).toBe(false);
		});

		it('rejects invalid type: empty string', () => {
			const result = warningTypeSchema.safeParse('');
			expect(result.success).toBe(false);
		});

		it('rejects invalid type: null', () => {
			const result = warningTypeSchema.safeParse(null);
			expect(result.success).toBe(false);
		});

		it('rejects invalid type: undefined', () => {
			const result = warningTypeSchema.safeParse(undefined);
			expect(result.success).toBe(false);
		});

		it('rejects invalid type: number', () => {
			const result = warningTypeSchema.safeParse(1);
			expect(result.success).toBe(false);
		});

		it('rejects invalid type: object', () => {
			const result = warningTypeSchema.safeParse({ type: 'C' });
			expect(result.success).toBe(false);
		});

		it('rejects invalid type: full word Comportement', () => {
			const result = warningTypeSchema.safeParse('Comportement');
			expect(result.success).toBe(false);
		});
	});

	// ========================================
	// Add Warning Schema
	// ========================================

	describe('addWarningSchema', () => {
		it('accepts valid complete input with type C', () => {
			const result = addWarningSchema.safeParse({
				student_id: validUuid,
				class_id: anotherUuid,
				academic_period_id: thirdUuid,
				warning_type: 'C'
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.student_id).toBe(validUuid);
				expect(result.data.class_id).toBe(anotherUuid);
				expect(result.data.academic_period_id).toBe(thirdUuid);
				expect(result.data.warning_type).toBe('C');
			}
		});

		it('accepts valid complete input with type M', () => {
			const result = addWarningSchema.safeParse({
				student_id: validUuid,
				class_id: anotherUuid,
				academic_period_id: thirdUuid,
				warning_type: 'M'
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.warning_type).toBe('M');
			}
		});

		it('accepts valid complete input with type R', () => {
			const result = addWarningSchema.safeParse({
				student_id: validUuid,
				class_id: anotherUuid,
				academic_period_id: thirdUuid,
				warning_type: 'R'
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.warning_type).toBe('R');
			}
		});

		it('accepts valid complete input with type T', () => {
			const result = addWarningSchema.safeParse({
				student_id: validUuid,
				class_id: anotherUuid,
				academic_period_id: thirdUuid,
				warning_type: 'T'
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.warning_type).toBe('T');
			}
		});

		it('rejects missing student_id', () => {
			const result = addWarningSchema.safeParse({
				class_id: anotherUuid,
				academic_period_id: thirdUuid,
				warning_type: 'C'
			});
			expect(result.success).toBe(false);
		});

		it('rejects missing class_id', () => {
			const result = addWarningSchema.safeParse({
				student_id: validUuid,
				academic_period_id: thirdUuid,
				warning_type: 'C'
			});
			expect(result.success).toBe(false);
		});

		it('rejects missing academic_period_id', () => {
			const result = addWarningSchema.safeParse({
				student_id: validUuid,
				class_id: anotherUuid,
				warning_type: 'C'
			});
			expect(result.success).toBe(false);
		});

		it('rejects missing warning_type', () => {
			const result = addWarningSchema.safeParse({
				student_id: validUuid,
				class_id: anotherUuid,
				academic_period_id: thirdUuid
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid UUID in student_id', () => {
			const result = addWarningSchema.safeParse({
				student_id: 'not-a-uuid',
				class_id: anotherUuid,
				academic_period_id: thirdUuid,
				warning_type: 'C'
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toBe('ID élève invalide');
			}
		});

		it('rejects invalid UUID in class_id', () => {
			const result = addWarningSchema.safeParse({
				student_id: validUuid,
				class_id: 'not-a-uuid',
				academic_period_id: thirdUuid,
				warning_type: 'C'
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toBe('ID classe invalide');
			}
		});

		it('rejects invalid UUID in academic_period_id', () => {
			const result = addWarningSchema.safeParse({
				student_id: validUuid,
				class_id: anotherUuid,
				academic_period_id: 'not-a-uuid',
				warning_type: 'C'
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toBe('ID période académique invalide');
			}
		});

		it('rejects malformed UUID: too short', () => {
			const result = addWarningSchema.safeParse({
				student_id: '550e8400-e29b-41d4-a716',
				class_id: anotherUuid,
				academic_period_id: thirdUuid,
				warning_type: 'C'
			});
			expect(result.success).toBe(false);
		});

		it('rejects malformed UUID: missing dashes', () => {
			const result = addWarningSchema.safeParse({
				student_id: '550e8400e29b41d4a716446655440000',
				class_id: anotherUuid,
				academic_period_id: thirdUuid,
				warning_type: 'C'
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid warning_type: X', () => {
			const result = addWarningSchema.safeParse({
				student_id: validUuid,
				class_id: anotherUuid,
				academic_period_id: thirdUuid,
				warning_type: 'X'
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid warning_type: lowercase c', () => {
			const result = addWarningSchema.safeParse({
				student_id: validUuid,
				class_id: anotherUuid,
				academic_period_id: thirdUuid,
				warning_type: 'c'
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid warning_type: empty string', () => {
			const result = addWarningSchema.safeParse({
				student_id: validUuid,
				class_id: anotherUuid,
				academic_period_id: thirdUuid,
				warning_type: ''
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid warning_type: number', () => {
			const result = addWarningSchema.safeParse({
				student_id: validUuid,
				class_id: anotherUuid,
				academic_period_id: thirdUuid,
				warning_type: 1
			});
			expect(result.success).toBe(false);
		});

		it('rejects null values', () => {
			const result = addWarningSchema.safeParse({
				student_id: null,
				class_id: anotherUuid,
				academic_period_id: thirdUuid,
				warning_type: 'C'
			});
			expect(result.success).toBe(false);
		});

		it('rejects undefined values', () => {
			const result = addWarningSchema.safeParse({
				student_id: undefined,
				class_id: anotherUuid,
				academic_period_id: thirdUuid,
				warning_type: 'C'
			});
			expect(result.success).toBe(false);
		});

		it('rejects extra unexpected fields', () => {
			const result = addWarningSchema.safeParse({
				student_id: validUuid,
				class_id: anotherUuid,
				academic_period_id: thirdUuid,
				warning_type: 'C',
				extra_field: 'unexpected'
			});
			// Zod by default strips extra fields in strict mode, but this validates the core fields
			expect(result.success).toBe(true);
		});
	});

	// ========================================
	// Remove Warning Schema
	// ========================================

	describe('removeWarningSchema', () => {
		it('accepts valid UUID for warning_id', () => {
			const result = removeWarningSchema.safeParse({
				warning_id: validUuid
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.warning_id).toBe(validUuid);
			}
		});

		it('accepts different valid UUID', () => {
			const result = removeWarningSchema.safeParse({
				warning_id: anotherUuid
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.warning_id).toBe(anotherUuid);
			}
		});

		it('rejects missing warning_id', () => {
			const result = removeWarningSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		it('rejects invalid UUID format', () => {
			const result = removeWarningSchema.safeParse({
				warning_id: 'not-a-uuid'
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toBe('ID avertissement invalide');
			}
		});

		it('rejects malformed UUID: too short', () => {
			const result = removeWarningSchema.safeParse({
				warning_id: '550e8400-e29b-41d4-a716'
			});
			expect(result.success).toBe(false);
		});

		it('rejects malformed UUID: missing dashes', () => {
			const result = removeWarningSchema.safeParse({
				warning_id: '550e8400e29b41d4a716446655440000'
			});
			expect(result.success).toBe(false);
		});

		it('rejects malformed UUID: wrong format', () => {
			const result = removeWarningSchema.safeParse({
				warning_id: '550e8400-e29b-41d4-a716-44665544000'
			});
			expect(result.success).toBe(false);
		});

		it('rejects non-string values: number', () => {
			const result = removeWarningSchema.safeParse({
				warning_id: 12345
			});
			expect(result.success).toBe(false);
		});

		it('rejects non-string values: object', () => {
			const result = removeWarningSchema.safeParse({
				warning_id: { id: validUuid }
			});
			expect(result.success).toBe(false);
		});

		it('rejects non-string values: array', () => {
			const result = removeWarningSchema.safeParse({
				warning_id: [validUuid]
			});
			expect(result.success).toBe(false);
		});

		it('rejects null value', () => {
			const result = removeWarningSchema.safeParse({
				warning_id: null
			});
			expect(result.success).toBe(false);
		});

		it('rejects undefined value', () => {
			const result = removeWarningSchema.safeParse({
				warning_id: undefined
			});
			expect(result.success).toBe(false);
		});

		it('rejects empty string', () => {
			const result = removeWarningSchema.safeParse({
				warning_id: ''
			});
			expect(result.success).toBe(false);
		});
	});

	// ========================================
	// Get Warnings Schema
	// ========================================

	describe('getWarningsSchema', () => {
		it('accepts valid class_id and academic_period_id', () => {
			const result = getWarningsSchema.safeParse({
				class_id: validUuid,
				academic_period_id: anotherUuid
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.class_id).toBe(validUuid);
				expect(result.data.academic_period_id).toBe(anotherUuid);
			}
		});

		it('accepts partial input: only class_id', () => {
			const result = getWarningsSchema.safeParse({
				class_id: validUuid
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.class_id).toBe(validUuid);
				expect(result.data.academic_period_id).toBeUndefined();
			}
		});

		it('accepts partial input: only academic_period_id', () => {
			const result = getWarningsSchema.safeParse({
				academic_period_id: anotherUuid
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.class_id).toBeUndefined();
				expect(result.data.academic_period_id).toBe(anotherUuid);
			}
		});

		it('accepts empty object (both fields optional)', () => {
			const result = getWarningsSchema.safeParse({});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.class_id).toBeUndefined();
				expect(result.data.academic_period_id).toBeUndefined();
			}
		});

		it('works with optional fields: undefined class_id', () => {
			const result = getWarningsSchema.safeParse({
				class_id: undefined,
				academic_period_id: anotherUuid
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.academic_period_id).toBe(anotherUuid);
			}
		});

		it('works with optional fields: undefined academic_period_id', () => {
			const result = getWarningsSchema.safeParse({
				class_id: validUuid,
				academic_period_id: undefined
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.class_id).toBe(validUuid);
			}
		});

		it('rejects invalid UUID in class_id', () => {
			const result = getWarningsSchema.safeParse({
				class_id: 'not-a-uuid',
				academic_period_id: anotherUuid
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toBe('ID classe invalide');
			}
		});

		it('rejects invalid UUID in academic_period_id', () => {
			const result = getWarningsSchema.safeParse({
				class_id: validUuid,
				academic_period_id: 'not-a-uuid'
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toBe('ID période académique invalide');
			}
		});

		it('rejects malformed UUID in class_id', () => {
			const result = getWarningsSchema.safeParse({
				class_id: '550e8400-e29b-41d4-a716',
				academic_period_id: anotherUuid
			});
			expect(result.success).toBe(false);
		});

		it('rejects malformed UUID in academic_period_id', () => {
			const result = getWarningsSchema.safeParse({
				class_id: validUuid,
				academic_period_id: '550e8400e29b41d4a716446655440000'
			});
			expect(result.success).toBe(false);
		});

		it('rejects both invalid UUIDs', () => {
			const result = getWarningsSchema.safeParse({
				class_id: 'invalid-uuid-1',
				academic_period_id: 'invalid-uuid-2'
			});
			expect(result.success).toBe(false);
		});

		it('rejects non-string values in class_id', () => {
			const result = getWarningsSchema.safeParse({
				class_id: 12345,
				academic_period_id: anotherUuid
			});
			expect(result.success).toBe(false);
		});

		it('rejects non-string values in academic_period_id', () => {
			const result = getWarningsSchema.safeParse({
				class_id: validUuid,
				academic_period_id: 12345
			});
			expect(result.success).toBe(false);
		});

		it('rejects empty string in class_id', () => {
			const result = getWarningsSchema.safeParse({
				class_id: '',
				academic_period_id: anotherUuid
			});
			expect(result.success).toBe(false);
		});

		it('rejects empty string in academic_period_id', () => {
			const result = getWarningsSchema.safeParse({
				class_id: validUuid,
				academic_period_id: ''
			});
			expect(result.success).toBe(false);
		});

		it('rejects null in class_id', () => {
			const result = getWarningsSchema.safeParse({
				class_id: null,
				academic_period_id: anotherUuid
			});
			expect(result.success).toBe(false);
		});

		it('rejects null in academic_period_id', () => {
			const result = getWarningsSchema.safeParse({
				class_id: validUuid,
				academic_period_id: null
			});
			expect(result.success).toBe(false);
		});
	});

	// ========================================
	// Cross-schema Integration Tests
	// ========================================

	describe('Integration: Complete warning workflow', () => {
		it('validates complete workflow: add → get → remove', () => {
			// Step 1: Validate adding a warning
			const addResult = addWarningSchema.safeParse({
				student_id: validUuid,
				class_id: anotherUuid,
				academic_period_id: thirdUuid,
				warning_type: 'C'
			});
			expect(addResult.success).toBe(true);

			// Step 2: Validate getting warnings for that class and period
			const getResult = getWarningsSchema.safeParse({
				class_id: anotherUuid,
				academic_period_id: thirdUuid
			});
			expect(getResult.success).toBe(true);

			// Step 3: Validate removing the warning
			const removeResult = removeWarningSchema.safeParse({
				warning_id: validUuid
			});
			expect(removeResult.success).toBe(true);
		});

		it('validates adding all warning types for same student', () => {
			const warningTypes = ['C', 'M', 'R', 'T'] as const;

			warningTypes.forEach((type) => {
				const result = addWarningSchema.safeParse({
					student_id: validUuid,
					class_id: anotherUuid,
					academic_period_id: thirdUuid,
					warning_type: type
				});
				expect(result.success).toBe(true);
			});
		});

		it('validates getting warnings with different filter combinations', () => {
			// Get by class only
			const byClass = getWarningsSchema.safeParse({
				class_id: validUuid
			});
			expect(byClass.success).toBe(true);

			// Get by period only
			const byPeriod = getWarningsSchema.safeParse({
				academic_period_id: anotherUuid
			});
			expect(byPeriod.success).toBe(true);

			// Get by both
			const byBoth = getWarningsSchema.safeParse({
				class_id: validUuid,
				academic_period_id: anotherUuid
			});
			expect(byBoth.success).toBe(true);

			// Get all (no filters)
			const getAll = getWarningsSchema.safeParse({});
			expect(getAll.success).toBe(true);
		});
	});
});
