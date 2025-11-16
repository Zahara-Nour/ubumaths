import { describe, it, expect } from 'vitest';
import {
	shareMaterialSchema,
	unshareMaterialSchema,
	listStudentSharedMaterialsSchema,
	materialIdParamSchema
} from '$lib/server/validation/google';

describe('Google Classroom Materials Validation Schemas', () => {
	const validUuid = '550e8400-e29b-41d4-a716-446655440000';
	const anotherUuid = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
	const thirdUuid = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

	// ========================================
	// Material ID Parameter Validation
	// ========================================

	describe('materialIdParamSchema', () => {
		it('accepts valid UUID', () => {
			const result = materialIdParamSchema.safeParse({ id: validUuid });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe(validUuid);
			}
		});

		it('rejects missing id', () => {
			const result = materialIdParamSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		it('rejects invalid UUID format', () => {
			const result = materialIdParamSchema.safeParse({ id: 'not-a-uuid' });
			expect(result.success).toBe(false);
		});

		it('rejects malformed UUID: too short', () => {
			const result = materialIdParamSchema.safeParse({ id: '550e8400-e29b-41d4-a716' });
			expect(result.success).toBe(false);
		});

		it('rejects malformed UUID: invalid characters', () => {
			const result = materialIdParamSchema.safeParse({
				id: '550e8400-e29b-41d4-a716-44665544000g'
			});
			expect(result.success).toBe(false);
		});

		it('rejects empty string', () => {
			const result = materialIdParamSchema.safeParse({ id: '' });
			expect(result.success).toBe(false);
		});

		it('rejects null', () => {
			const result = materialIdParamSchema.safeParse({ id: null });
			expect(result.success).toBe(false);
		});

		it('rejects undefined', () => {
			const result = materialIdParamSchema.safeParse({ id: undefined });
			expect(result.success).toBe(false);
		});
	});

	// ========================================
	// Share Material Schema
	// ========================================

	describe('shareMaterialSchema', () => {
		describe('Happy Path', () => {
			it('accepts valid sharing data with one class', () => {
				const result = shareMaterialSchema.safeParse({
					classIds: [validUuid],
					visible: true
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.classIds).toEqual([validUuid]);
					expect(result.data.visible).toBe(true);
				}
			});

			it('accepts valid sharing data with multiple classes', () => {
				const result = shareMaterialSchema.safeParse({
					classIds: [validUuid, anotherUuid, thirdUuid],
					categoryId: validUuid,
					topicId: anotherUuid,
					visible: true
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.classIds).toHaveLength(3);
					expect(result.data.categoryId).toBe(validUuid);
					expect(result.data.topicId).toBe(anotherUuid);
				}
			});

			it('accepts description override', () => {
				const result = shareMaterialSchema.safeParse({
					classIds: [validUuid],
					descriptionOverride: 'Custom description for this class',
					visible: true
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.descriptionOverride).toBe('Custom description for this class');
				}
			});

			it('accepts null categoryId', () => {
				const result = shareMaterialSchema.safeParse({
					classIds: [validUuid],
					categoryId: null,
					visible: true
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.categoryId).toBeNull();
				}
			});

			it('accepts null topicId', () => {
				const result = shareMaterialSchema.safeParse({
					classIds: [validUuid],
					topicId: null,
					visible: true
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.topicId).toBeNull();
				}
			});

			it('accepts null descriptionOverride', () => {
				const result = shareMaterialSchema.safeParse({
					classIds: [validUuid],
					descriptionOverride: null,
					visible: true
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.descriptionOverride).toBeNull();
				}
			});

			it('applies default visible: true', () => {
				const result = shareMaterialSchema.safeParse({
					classIds: [validUuid]
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.visible).toBe(true);
				}
			});

			it('accepts visible: false', () => {
				const result = shareMaterialSchema.safeParse({
					classIds: [validUuid],
					visible: false
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.visible).toBe(false);
				}
			});
		});

		describe('Array Size Validation (Security)', () => {
			it('rejects empty classIds array', () => {
				const result = shareMaterialSchema.safeParse({
					classIds: [],
					visible: true
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('At least one class');
				}
			});

			it('rejects classIds array with 51 items (over limit)', () => {
				const tooManyClasses = Array.from({ length: 51 }, () => validUuid);
				const result = shareMaterialSchema.safeParse({
					classIds: tooManyClasses,
					visible: true
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('Cannot share with more than 50');
				}
			});

			it('accepts exactly 50 classes (boundary)', () => {
				const fiftyClasses = Array.from({ length: 50 }, (_, i) => {
					// Generate different valid UUIDs
					return `550e8400-e29b-41d4-a716-${String(i).padStart(12, '0')}`;
				});
				const result = shareMaterialSchema.safeParse({
					classIds: fiftyClasses,
					visible: true
				});
				expect(result.success).toBe(true);
			});

			it('accepts exactly 1 class (boundary)', () => {
				const result = shareMaterialSchema.safeParse({
					classIds: [validUuid],
					visible: true
				});
				expect(result.success).toBe(true);
			});
		});

		describe('UUID Validation (Security)', () => {
			it('rejects invalid UUID in classIds', () => {
				const result = shareMaterialSchema.safeParse({
					classIds: ['not-a-uuid'],
					visible: true
				});
				expect(result.success).toBe(false);
			});

			it('rejects mixed valid and invalid UUIDs in classIds', () => {
				const result = shareMaterialSchema.safeParse({
					classIds: [validUuid, 'not-a-uuid', anotherUuid],
					visible: true
				});
				expect(result.success).toBe(false);
			});

			it('rejects invalid categoryId UUID', () => {
				const result = shareMaterialSchema.safeParse({
					classIds: [validUuid],
					categoryId: 'not-a-uuid',
					visible: true
				});
				expect(result.success).toBe(false);
			});

			it('rejects invalid topicId UUID', () => {
				const result = shareMaterialSchema.safeParse({
					classIds: [validUuid],
					topicId: 'invalid-uuid',
					visible: true
				});
				expect(result.success).toBe(false);
			});

			it('rejects empty string in classIds', () => {
				const result = shareMaterialSchema.safeParse({
					classIds: [''],
					visible: true
				});
				expect(result.success).toBe(false);
			});
		});

		describe('Description Validation (Security)', () => {
			it('accepts description with 5000 characters (boundary)', () => {
				const maxDescription = 'a'.repeat(5000);
				const result = shareMaterialSchema.safeParse({
					classIds: [validUuid],
					descriptionOverride: maxDescription,
					visible: true
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.descriptionOverride).toHaveLength(5000);
				}
			});

			it('rejects description with 5001 characters (over limit)', () => {
				const tooLongDescription = 'a'.repeat(5001);
				const result = shareMaterialSchema.safeParse({
					classIds: [validUuid],
					descriptionOverride: tooLongDescription,
					visible: true
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('cannot exceed 5000 characters');
				}
			});

			it('accepts empty string description', () => {
				const result = shareMaterialSchema.safeParse({
					classIds: [validUuid],
					descriptionOverride: '',
					visible: true
				});
				expect(result.success).toBe(true);
			});

			it('accepts description with special characters', () => {
				const result = shareMaterialSchema.safeParse({
					classIds: [validUuid],
					descriptionOverride: '<script>alert("test")</script>\n\r\t🎉',
					visible: true
				});
				expect(result.success).toBe(true);
				// Note: XSS protection happens at render time, not validation
			});
		});

		describe('Required Fields', () => {
			it('rejects missing classIds', () => {
				const result = shareMaterialSchema.safeParse({
					visible: true
				});
				expect(result.success).toBe(false);
			});

			it('accepts missing optional fields', () => {
				const result = shareMaterialSchema.safeParse({
					classIds: [validUuid]
				});
				expect(result.success).toBe(true);
			});
		});

		describe('Type Validation', () => {
			it('rejects classIds as string instead of array', () => {
				const result = shareMaterialSchema.safeParse({
					classIds: validUuid,
					visible: true
				});
				expect(result.success).toBe(false);
			});

			it('rejects classIds as null', () => {
				const result = shareMaterialSchema.safeParse({
					classIds: null,
					visible: true
				});
				expect(result.success).toBe(false);
			});

			it('rejects visible as string', () => {
				const result = shareMaterialSchema.safeParse({
					classIds: [validUuid],
					visible: 'true'
				});
				expect(result.success).toBe(false);
			});

			it('rejects visible as number', () => {
				const result = shareMaterialSchema.safeParse({
					classIds: [validUuid],
					visible: 1
				});
				expect(result.success).toBe(false);
			});
		});
	});

	// ========================================
	// Unshare Material Schema
	// ========================================

	describe('unshareMaterialSchema', () => {
		describe('Happy Path', () => {
			it('accepts valid unsharing data with one class', () => {
				const result = unshareMaterialSchema.safeParse({
					classIds: [validUuid]
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.classIds).toEqual([validUuid]);
				}
			});

			it('accepts valid unsharing data with multiple classes', () => {
				const result = unshareMaterialSchema.safeParse({
					classIds: [validUuid, anotherUuid, thirdUuid]
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.classIds).toHaveLength(3);
				}
			});
		});

		describe('Array Size Validation (Security)', () => {
			it('rejects empty classIds array', () => {
				const result = unshareMaterialSchema.safeParse({
					classIds: []
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('At least one class');
				}
			});

			it('rejects classIds array with 51 items (over limit)', () => {
				const tooManyClasses = Array.from({ length: 51 }, () => validUuid);
				const result = unshareMaterialSchema.safeParse({
					classIds: tooManyClasses
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('Cannot share with more than 50');
				}
			});

			it('accepts exactly 50 classes (boundary)', () => {
				const fiftyClasses = Array.from({ length: 50 }, (_, i) => {
					return `550e8400-e29b-41d4-a716-${String(i).padStart(12, '0')}`;
				});
				const result = unshareMaterialSchema.safeParse({
					classIds: fiftyClasses
				});
				expect(result.success).toBe(true);
			});

			it('accepts exactly 1 class (boundary)', () => {
				const result = unshareMaterialSchema.safeParse({
					classIds: [validUuid]
				});
				expect(result.success).toBe(true);
			});
		});

		describe('UUID Validation (Security)', () => {
			it('rejects invalid UUID in classIds', () => {
				const result = unshareMaterialSchema.safeParse({
					classIds: ['not-a-uuid']
				});
				expect(result.success).toBe(false);
			});

			it('rejects mixed valid and invalid UUIDs', () => {
				const result = unshareMaterialSchema.safeParse({
					classIds: [validUuid, 'invalid', anotherUuid]
				});
				expect(result.success).toBe(false);
			});

			it('rejects empty string in classIds', () => {
				const result = unshareMaterialSchema.safeParse({
					classIds: ['']
				});
				expect(result.success).toBe(false);
			});

			it('rejects malformed UUIDs', () => {
				const result = unshareMaterialSchema.safeParse({
					classIds: ['550e8400-e29b-41d4-a716']
				});
				expect(result.success).toBe(false);
			});
		});

		describe('Required Fields', () => {
			it('rejects missing classIds', () => {
				const result = unshareMaterialSchema.safeParse({});
				expect(result.success).toBe(false);
			});
		});

		describe('Type Validation', () => {
			it('rejects classIds as string', () => {
				const result = unshareMaterialSchema.safeParse({
					classIds: validUuid
				});
				expect(result.success).toBe(false);
			});

			it('rejects classIds as null', () => {
				const result = unshareMaterialSchema.safeParse({
					classIds: null
				});
				expect(result.success).toBe(false);
			});

			it('rejects classIds as object', () => {
				const result = unshareMaterialSchema.safeParse({
					classIds: { id: validUuid }
				});
				expect(result.success).toBe(false);
			});
		});
	});

	// ========================================
	// List Student Shared Materials Schema
	// ========================================

	describe('listStudentSharedMaterialsSchema', () => {
		describe('Happy Path', () => {
			it('accepts valid query with all filters', () => {
				const result = listStudentSharedMaterialsSchema.safeParse({
					classId: validUuid,
					categoryId: anotherUuid,
					topicId: thirdUuid,
					page: '1',
					limit: '20'
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.classId).toBe(validUuid);
					expect(result.data.categoryId).toBe(anotherUuid);
					expect(result.data.topicId).toBe(thirdUuid);
					expect(result.data.page).toBe(1);
					expect(result.data.limit).toBe(20);
				}
			});

			it('accepts query without filters (defaults)', () => {
				const result = listStudentSharedMaterialsSchema.safeParse({
					page: '1',
					limit: '20'
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.classId).toBeUndefined();
					expect(result.data.categoryId).toBeUndefined();
					expect(result.data.topicId).toBeUndefined();
				}
			});

			it('accepts null classId', () => {
				const result = listStudentSharedMaterialsSchema.safeParse({
					classId: null,
					page: '1',
					limit: '20'
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.classId).toBeNull();
				}
			});

			it('accepts null categoryId', () => {
				const result = listStudentSharedMaterialsSchema.safeParse({
					categoryId: null,
					page: '1',
					limit: '20'
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.categoryId).toBeNull();
				}
			});

			it('accepts null topicId', () => {
				const result = listStudentSharedMaterialsSchema.safeParse({
					topicId: null,
					page: '1',
					limit: '20'
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.topicId).toBeNull();
				}
			});
		});

		describe('Pagination Validation', () => {
			it('applies default page: 1', () => {
				const result = listStudentSharedMaterialsSchema.safeParse({
					limit: '20'
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.page).toBe(1);
				}
			});

			it('applies default limit: 50', () => {
				const result = listStudentSharedMaterialsSchema.safeParse({
					page: '1'
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.limit).toBe(50);
				}
			});

			it('accepts page as string number', () => {
				const result = listStudentSharedMaterialsSchema.safeParse({
					page: '5',
					limit: '20'
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.page).toBe(5);
				}
			});

			it('accepts limit as string number', () => {
				const result = listStudentSharedMaterialsSchema.safeParse({
					page: '1',
					limit: '50'
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.limit).toBe(50);
				}
			});

			it('rejects page 0 (boundary)', () => {
				const result = listStudentSharedMaterialsSchema.safeParse({
					page: '0',
					limit: '20'
				});
				expect(result.success).toBe(false);
			});

			it('rejects negative page', () => {
				const result = listStudentSharedMaterialsSchema.safeParse({
					page: '-1',
					limit: '20'
				});
				expect(result.success).toBe(false);
			});

			it('rejects limit 0 (boundary)', () => {
				const result = listStudentSharedMaterialsSchema.safeParse({
					page: '1',
					limit: '0'
				});
				expect(result.success).toBe(false);
			});

			it('rejects limit over 100', () => {
				const result = listStudentSharedMaterialsSchema.safeParse({
					page: '1',
					limit: '101'
				});
				expect(result.success).toBe(false);
			});

			it('accepts limit exactly 100 (boundary)', () => {
				const result = listStudentSharedMaterialsSchema.safeParse({
					page: '1',
					limit: '100'
				});
				expect(result.success).toBe(true);
			});

			it('accepts limit exactly 1 (boundary)', () => {
				const result = listStudentSharedMaterialsSchema.safeParse({
					page: '1',
					limit: '1'
				});
				expect(result.success).toBe(true);
			});

			it('rejects fractional page', () => {
				const result = listStudentSharedMaterialsSchema.safeParse({
					page: '1.5',
					limit: '20'
				});
				expect(result.success).toBe(false);
			});

			it('rejects fractional limit', () => {
				const result = listStudentSharedMaterialsSchema.safeParse({
					page: '1',
					limit: '20.5'
				});
				expect(result.success).toBe(false);
			});
		});

		describe('UUID Validation (Security)', () => {
			it('rejects invalid classId UUID', () => {
				const result = listStudentSharedMaterialsSchema.safeParse({
					classId: 'not-a-uuid',
					page: '1',
					limit: '20'
				});
				expect(result.success).toBe(false);
			});

			it('rejects invalid categoryId UUID', () => {
				const result = listStudentSharedMaterialsSchema.safeParse({
					categoryId: 'invalid-uuid',
					page: '1',
					limit: '20'
				});
				expect(result.success).toBe(false);
			});

			it('rejects invalid topicId UUID', () => {
				const result = listStudentSharedMaterialsSchema.safeParse({
					topicId: 'bad-uuid',
					page: '1',
					limit: '20'
				});
				expect(result.success).toBe(false);
			});

			it('rejects malformed UUIDs', () => {
				const result = listStudentSharedMaterialsSchema.safeParse({
					classId: '550e8400-e29b-41d4-a716',
					page: '1',
					limit: '20'
				});
				expect(result.success).toBe(false);
			});
		});

		describe('Type Validation', () => {
			it('rejects page as non-numeric string', () => {
				const result = listStudentSharedMaterialsSchema.safeParse({
					page: 'abc',
					limit: '20'
				});
				expect(result.success).toBe(false);
			});

			it('rejects limit as non-numeric string', () => {
				const result = listStudentSharedMaterialsSchema.safeParse({
					page: '1',
					limit: 'xyz'
				});
				expect(result.success).toBe(false);
			});
		});

		describe('Edge Cases', () => {
			it('accepts undefined optional filters', () => {
				const result = listStudentSharedMaterialsSchema.safeParse({
					classId: undefined,
					categoryId: undefined,
					topicId: undefined,
					page: '1',
					limit: '20'
				});
				expect(result.success).toBe(true);
			});

			it('accepts empty object with defaults', () => {
				const result = listStudentSharedMaterialsSchema.safeParse({});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.page).toBe(1);
					expect(result.data.limit).toBe(50);
				}
			});

			it('accepts large page number up to 1000', () => {
				const result = listStudentSharedMaterialsSchema.safeParse({
					page: '1000',
					limit: '20'
				});
				expect(result.success).toBe(true);
				// Note: Server should handle "no results" gracefully
			});

			it('rejects page number over 1000', () => {
				const result = listStudentSharedMaterialsSchema.safeParse({
					page: '1001',
					limit: '20'
				});
				expect(result.success).toBe(false);
			});
		});
	});
});
