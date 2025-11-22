/**
 * Tests for common validation schemas
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
	uuidSchema,
	uuidArraySchema,
	paginationSchema,
	difficultySchema,
	gradeSchema,
	roleSchema,
	roleWithAllSchema,
	formatGradeForDisplay,
	validateRequest,
	validateFormData,
	formDataTransforms,
	testModeSchema
} from './common';

describe('common validation schemas', () => {
	// ============================================================================
	// UUID SCHEMAS
	// ============================================================================

	describe('uuidSchema', () => {
		it('should accept valid UUID', () => {
			const validUuid = '550e8400-e29b-41d4-a716-446655440000';
			const result = uuidSchema.safeParse(validUuid);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBe(validUuid);
			}
		});

		it('should reject invalid UUID format', () => {
			const invalidUuids = [
				'not-a-uuid',
				'123',
				'550e8400-e29b-41d4-a716', // Too short
				'550e8400-e29b-41d4-a716-44665544000g', // Invalid character
				''
			];

			invalidUuids.forEach((uuid) => {
				const result = uuidSchema.safeParse(uuid);
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('Invalid UUID');
				}
			});
		});
	});

	describe('uuidArraySchema', () => {
		it('should accept array of valid UUIDs', () => {
			const validUuids = [
				'550e8400-e29b-41d4-a716-446655440000',
				'6ba7b810-9dad-11d1-80b4-00c04fd430c8',
				'6ba7b811-9dad-11d1-80b4-00c04fd430c8'
			];
			const result = uuidArraySchema.safeParse(validUuids);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual(validUuids);
			}
		});

		it('should accept empty array', () => {
			const result = uuidArraySchema.safeParse([]);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual([]);
			}
		});

		it('should reject array with invalid UUID', () => {
			const mixedArray = ['550e8400-e29b-41d4-a716-446655440000', 'not-a-uuid'];
			const result = uuidArraySchema.safeParse(mixedArray);
			expect(result.success).toBe(false);
		});

		it('should reject non-array input', () => {
			const result = uuidArraySchema.safeParse('550e8400-e29b-41d4-a716-446655440000');
			expect(result.success).toBe(false);
		});
	});

	// ============================================================================
	// PAGINATION SCHEMAS
	// ============================================================================

	describe('paginationSchema', () => {
		it('should accept valid pagination parameters', () => {
			const result = paginationSchema.safeParse({ page: 2, limit: 25 });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.page).toBe(2);
				expect(result.data.limit).toBe(25);
			}
		});

		it('should use default values when not provided', () => {
			const result = paginationSchema.safeParse({});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.page).toBe(1);
				expect(result.data.limit).toBe(50);
			}
		});

		it('should coerce string numbers to integers', () => {
			const result = paginationSchema.safeParse({ page: '3', limit: '10' });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.page).toBe(3);
				expect(result.data.limit).toBe(10);
				expect(typeof result.data.page).toBe('number');
				expect(typeof result.data.limit).toBe('number');
			}
		});

		it('should reject negative page numbers', () => {
			const result = paginationSchema.safeParse({ page: -1, limit: 50 });
			expect(result.success).toBe(false);
		});

		it('should reject zero page number', () => {
			const result = paginationSchema.safeParse({ page: 0, limit: 50 });
			expect(result.success).toBe(false);
		});

		it('should reject page number exceeding max', () => {
			const result = paginationSchema.safeParse({ page: 1001, limit: 50 });
			expect(result.success).toBe(false);
		});

		it('should reject limit exceeding max', () => {
			const result = paginationSchema.safeParse({ page: 1, limit: 101 });
			expect(result.success).toBe(false);
		});

		it('should reject negative limit', () => {
			const result = paginationSchema.safeParse({ page: 1, limit: -5 });
			expect(result.success).toBe(false);
		});

		it('should reject decimal values', () => {
			const result = paginationSchema.safeParse({ page: 1.5, limit: 50.7 });
			expect(result.success).toBe(false);
		});
	});

	// ============================================================================
	// DIFFICULTY & GRADE SCHEMAS
	// ============================================================================

	describe('difficultySchema', () => {
		it('should accept valid difficulty levels', () => {
			const validLevels = [1, 2, 3];
			validLevels.forEach((level) => {
				const result = difficultySchema.safeParse(level);
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data).toBe(level);
				}
			});
		});

		it('should reject invalid difficulty levels', () => {
			const invalidLevels = [0, 4, -1, 1.5, '1', null, undefined];
			invalidLevels.forEach((level) => {
				const result = difficultySchema.safeParse(level);
				expect(result.success).toBe(false);
			});
		});
	});

	describe('gradeSchema', () => {
		it('should accept valid French grade levels (GradeCodes)', () => {
			// gradeSchema is now gradeCodeSchema from unified grades system
			const validGrades = [
				'CP',
				'CE1',
				'CE2',
				'CM1',
				'CM2',
				'6',
				'5',
				'4',
				'3',
				'2',
				'1_GEN',
				'T_GEN',
				'1_SPE',
				'T_SPE',
				'T_EXP',
				'T_COMP',
				'1_STMG',
				'T_STMG'
			];
			validGrades.forEach((grade) => {
				const result = gradeSchema.safeParse(grade);
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data).toBe(grade);
				}
			});
		});

		it('should reject invalid grade levels', () => {
			const invalidGrades = ['6th', 'Terminal', '6ème', '6eme', '', null, 'invalid'];
			invalidGrades.forEach((grade) => {
				const result = gradeSchema.safeParse(grade);
				expect(result.success).toBe(false);
			});
		});

		it('should reject old legacy grade names', () => {
			// Old names were replaced in unified system
			const legacyGrades = ['SPE_1', 'SPE_T', 'STMG'];
			legacyGrades.forEach((grade) => {
				const result = gradeSchema.safeParse(grade);
				expect(result.success).toBe(false);
			});
		});
	});

	describe('roleSchema', () => {
		it('should accept valid user roles', () => {
			const validRoles = ['student', 'teacher', 'admin'];
			validRoles.forEach((role) => {
				const result = roleSchema.safeParse(role);
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data).toBe(role);
				}
			});
		});

		it('should reject invalid roles', () => {
			const invalidRoles = ['user', 'admin_user', 'superuser', 'guest', '', null, 'all'];
			invalidRoles.forEach((role) => {
				const result = roleSchema.safeParse(role);
				expect(result.success).toBe(false);
			});
		});

		it('should reject "all" role (use roleWithAllSchema for that)', () => {
			const result = roleSchema.safeParse('all');
			expect(result.success).toBe(false);
		});
	});

	describe('roleWithAllSchema', () => {
		it('should accept valid user roles plus "all"', () => {
			const validRoles = ['all', 'student', 'teacher', 'admin'];
			validRoles.forEach((role) => {
				const result = roleWithAllSchema.safeParse(role);
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data).toBe(role);
				}
			});
		});

		it('should reject invalid roles', () => {
			const invalidRoles = ['user', 'admin_user', 'superuser', 'guest', '', null];
			invalidRoles.forEach((role) => {
				const result = roleWithAllSchema.safeParse(role);
				expect(result.success).toBe(false);
			});
		});
	});

	describe('formatGradeForDisplay', () => {
		it('should convert GradeCodes to display format with accents', () => {
			// formatGradeForDisplay is now from unified grades utils
			// It takes GradeCode and returns displayName from GRADES
			const gradeMap: Record<string, string> = {
				'6': '6ème',
				'5': '5ème',
				'4': '4ème',
				'3': '3ème',
				'2': '2nde',
				'1_GEN': '1ère générale',
				T_GEN: 'Terminale générale',
				'1_SPE': '1ère spécialité maths',
				T_SPE: 'Terminale spécialité maths'
			};

			Object.entries(gradeMap).forEach(([input, expected]) => {
				// Need to cast as GradeCode for the unified function
				const result = formatGradeForDisplay(input as import('$lib/types/grades').GradeCode);
				expect(result).toBe(expected);
			});
		});

		it('should return input unchanged for unknown grades', () => {
			// @ts-expect-error - testing invalid input
			const result = formatGradeForDisplay('unknown_grade');
			expect(result).toBe('unknown_grade');
		});

		it('should handle primary school grades', () => {
			const result = formatGradeForDisplay('CP');
			expect(result).toBe('CP');
			const result2 = formatGradeForDisplay('CM2');
			expect(result2).toBe('CM2');
		});
	});

	// ============================================================================
	// VALIDATION HELPER FUNCTION
	// ============================================================================

	describe('validateRequest', () => {
		it('should return success for valid data', () => {
			const schema = uuidSchema;
			const data = '550e8400-e29b-41d4-a716-446655440000';
			const result = validateRequest(schema, data);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBe(data);
			}
		});

		it('should return error for invalid data', () => {
			const schema = uuidSchema;
			const data = 'not-a-uuid';
			const result = validateRequest(schema, data);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toContain('Invalid UUID');
			}
		});

		it('should format multiple errors with paths', () => {
			const schema = paginationSchema;
			const data = { page: -1, limit: 200 };
			const result = validateRequest(schema, data);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBeTruthy();
				// Should contain error information
				expect(result.error.length).toBeGreaterThan(0);
			}
		});
	});

	// ============================================================================
	// FORM DATA VALIDATION
	// ============================================================================

	describe('validateFormData', () => {
		it('should validate FormData successfully', () => {
			// validateFormData expects schema to match FormData structure after Object.fromEntries
			const schema = z.object({
				data: uuidSchema
			});
			const formData = new FormData();
			formData.append('data', '550e8400-e29b-41d4-a716-446655440000');

			const result = validateFormData(schema, formData);

			expect(result.success).toBe(true);
		});

		it('should return formatted errors for invalid FormData', () => {
			const schema = z.object({
				data: uuidSchema
			});
			const formData = new FormData();
			formData.append('data', 'not-a-uuid');

			const result = validateFormData(schema, formData);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.errors).toBeDefined();
				expect(typeof result.errors).toBe('object');
			}
		});

		it('should group errors by field path', () => {
			const schema = paginationSchema;
			const formData = new FormData();
			formData.append('page', '-1');
			formData.append('limit', '200');

			const result = validateFormData(schema, formData);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.errors).toBeDefined();
			}
		});
	});

	// ============================================================================
	// FORM DATA TRANSFORMS
	// ============================================================================

	describe('formDataTransforms', () => {
		describe('string', () => {
			it('should trim whitespace and require min length', () => {
				const result = formDataTransforms.string.safeParse('  hello  ');
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data).toBe('hello');
				}
			});

			it('should reject empty string', () => {
				const result = formDataTransforms.string.safeParse('   ');
				expect(result.success).toBe(false);
			});
		});

		describe('email', () => {
			it('should accept valid email', () => {
				const result = formDataTransforms.email.safeParse('test@example.com');
				expect(result.success).toBe(true);
			});

			it('should reject invalid email', () => {
				const result = formDataTransforms.email.safeParse('not-an-email');
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('invalide');
				}
			});
		});

		describe('number', () => {
			it('should convert string to number', () => {
				const result = formDataTransforms.number.safeParse('42');
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data).toBe(42);
					expect(typeof result.data).toBe('number');
				}
			});

			it('should handle decimal numbers', () => {
				const result = formDataTransforms.number.safeParse('3.14');
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data).toBe(3.14);
				}
			});
		});

		describe('int', () => {
			it('should convert string to integer', () => {
				const result = formDataTransforms.int.safeParse('42');
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data).toBe(42);
					expect(Number.isInteger(result.data)).toBe(true);
				}
			});

			it('should truncate decimal to integer', () => {
				const result = formDataTransforms.int.safeParse('42.7');
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data).toBe(42);
				}
			});
		});

		describe('boolean', () => {
			it('should convert "true" to boolean true', () => {
				const result = formDataTransforms.boolean.safeParse('true');
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data).toBe(true);
				}
			});

			it('should convert "on" (checkbox) to true', () => {
				const result = formDataTransforms.boolean.safeParse('on');
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data).toBe(true);
				}
			});

			it('should convert "1" to true', () => {
				const result = formDataTransforms.boolean.safeParse('1');
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data).toBe(true);
				}
			});

			it('should convert other strings to false', () => {
				const falseValues = ['false', '0', 'off', '', 'anything'];
				falseValues.forEach((value) => {
					const result = formDataTransforms.boolean.safeParse(value);
					expect(result.success).toBe(true);
					if (result.success) {
						expect(result.data).toBe(false);
					}
				});
			});
		});

		describe('optionalString', () => {
			it('should trim non-empty strings', () => {
				const result = formDataTransforms.optionalString.safeParse('  hello  ');
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data).toBe('hello');
				}
			});

			it('should convert empty string to null', () => {
				const result = formDataTransforms.optionalString.safeParse('   ');
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data).toBe(null);
				}
			});
		});

		describe('stringArray', () => {
			it('should convert comma-separated string to array', () => {
				const result = formDataTransforms.stringArray.safeParse('a,b,c');
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data).toEqual(['a', 'b', 'c']);
				}
			});

			it('should trim items in array', () => {
				const result = formDataTransforms.stringArray.safeParse('  a , b  , c  ');
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data).toEqual(['a', 'b', 'c']);
				}
			});

			it('should handle empty string', () => {
				const result = formDataTransforms.stringArray.safeParse('');
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data).toEqual(['']);
				}
			});
		});

		describe('uuid', () => {
			it('should accept valid UUID', () => {
				const validUuid = '550e8400-e29b-41d4-a716-446655440000';
				const result = formDataTransforms.uuid.safeParse(validUuid);
				expect(result.success).toBe(true);
			});

			it('should reject invalid UUID', () => {
				const result = formDataTransforms.uuid.safeParse('not-a-uuid');
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('invalide');
				}
			});
		});

		describe('optionalUuid', () => {
			it('should accept valid UUID', () => {
				const validUuid = '550e8400-e29b-41d4-a716-446655440000';
				const result = formDataTransforms.optionalUuid.safeParse(validUuid);
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data).toBe(validUuid);
				}
			});

			it('should convert empty string to null', () => {
				const result = formDataTransforms.optionalUuid.safeParse('   ');
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data).toBe(null);
				}
			});

			it('should reject invalid non-empty UUID', () => {
				const result = formDataTransforms.optionalUuid.safeParse('not-a-uuid');
				expect(result.success).toBe(false);
			});
		});
	});

	// ============================================================================
	// TEST MODE SCHEMA
	// ============================================================================

	describe('testModeSchema', () => {
		it('should accept enabled: true', () => {
			const data = {
				enabled: true
			};

			const result = testModeSchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.enabled).toBe(true);
			}
		});

		it('should accept enabled: false', () => {
			const data = {
				enabled: false
			};

			const result = testModeSchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.enabled).toBe(false);
			}
		});

		it('should reject string "true"', () => {
			const data = {
				enabled: 'true'
			};

			const result = testModeSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject string "false"', () => {
			const data = {
				enabled: 'false'
			};

			const result = testModeSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject number 1', () => {
			const data = {
				enabled: 1
			};

			const result = testModeSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject number 0', () => {
			const data = {
				enabled: 0
			};

			const result = testModeSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject null', () => {
			const data = {
				enabled: null
			};

			const result = testModeSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject undefined', () => {
			const data = {
				enabled: undefined
			};

			const result = testModeSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject missing enabled field', () => {
			const data = {};

			const result = testModeSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject object value', () => {
			const data = {
				enabled: { value: true }
			};

			const result = testModeSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject array value', () => {
			const data = {
				enabled: [true]
			};

			const result = testModeSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject empty string', () => {
			const data = {
				enabled: ''
			};

			const result = testModeSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});
});
