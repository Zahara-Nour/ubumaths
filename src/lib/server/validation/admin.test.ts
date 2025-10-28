/**
 * Tests for admin validation schemas
 */

import { describe, it, expect } from 'vitest';
import {
	addToClassSchema,
	removeFromClassSchema,
	searchUsersSchema,
	updateProfileFormSchema,
	importStudentsFormSchema,
	schoolFormSchema,
	createNotificationFormSchema
} from './admin';

describe('admin validation schemas', () => {
	// ============================================================================
	// CLASS MANAGEMENT SCHEMAS
	// ============================================================================

	describe('addToClassSchema', () => {
		it('should accept valid user and class IDs', () => {
			const data = {
				userId: '550e8400-e29b-41d4-a716-446655440000',
				classId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
			};

			const result = addToClassSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject invalid user ID', () => {
			const data = {
				userId: 'not-a-uuid',
				classId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
			};

			const result = addToClassSchema.safeParse(data);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('Invalid user ID');
			}
		});

		it('should reject invalid class ID', () => {
			const data = {
				userId: '550e8400-e29b-41d4-a716-446655440000',
				classId: 'invalid'
			};

			const result = addToClassSchema.safeParse(data);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('Invalid class ID');
			}
		});

		it('should reject missing fields', () => {
			const data = {
				userId: '550e8400-e29b-41d4-a716-446655440000'
				// Missing classId
			};

			const result = addToClassSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	describe('removeFromClassSchema', () => {
		it('should be identical to addToClassSchema', () => {
			const data = {
				userId: '550e8400-e29b-41d4-a716-446655440000',
				classId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
			};

			const result = removeFromClassSchema.safeParse(data);
			expect(result.success).toBe(true);
		});
	});

	// ============================================================================
	// USER SEARCH SCHEMA
	// ============================================================================

	describe('searchUsersSchema', () => {
		it('should accept valid search query', () => {
			const data = {
				query: 'john',
				limit: 10
			};

			const result = searchUsersSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept search with role filter', () => {
			const roles = ['student', 'teacher', 'admin'] as const;
			roles.forEach((role) => {
				const data = {
					query: 'test',
					role,
					limit: 20
				};

				const result = searchUsersSchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});

		it('should use default limit', () => {
			const data = {
				query: 'test'
			};

			const result = searchUsersSchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.limit).toBe(20);
			}
		});

		it('should reject empty query', () => {
			const data = {
				query: '   ',
				limit: 10
			};

			const result = searchUsersSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject query exceeding max length', () => {
			const data = {
				query: 'a'.repeat(101),
				limit: 10
			};

			const result = searchUsersSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid role', () => {
			const data = {
				query: 'test',
				role: 'invalid-role',
				limit: 10
			};

			const result = searchUsersSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject limit exceeding max', () => {
			const data = {
				query: 'test',
				limit: 51
			};

			const result = searchUsersSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should coerce string limit to number', () => {
			const data = {
				query: 'test',
				limit: '15'
			};

			const result = searchUsersSchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.limit).toBe(15);
				expect(typeof result.data.limit).toBe('number');
			}
		});
	});

	// ============================================================================
	// UPDATE PROFILE FORM SCHEMA
	// ============================================================================

	describe('updateProfileFormSchema', () => {
		it('should accept valid profile update', () => {
			// Note: formDataTransforms expect string values (from FormData)
			const data = {
				user_id: '550e8400-e29b-41d4-a716-446655440000',
				firstname: 'John',
				lastname: 'Doe',
				email: 'john.doe@example.com',
				role: 'student',
				school_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
				avatar_url: 'https://example.com/avatar.jpg',
				gender: 'boy',
				is_test: 'true' // FormData sends boolean as string
			};

			const result = updateProfileFormSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept null optional fields', () => {
			const data = {
				user_id: '550e8400-e29b-41d4-a716-446655440000',
				firstname: null,
				lastname: null,
				email: 'test@example.com',
				role: 'teacher',
				school_id: null,
				avatar_url: null,
				gender: ''
			};

			const result = updateProfileFormSchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.firstname).toBe(null);
				expect(result.data.gender).toBe(null);
			}
		});

		it('should reject invalid email', () => {
			const data = {
				user_id: '550e8400-e29b-41d4-a716-446655440000',
				firstname: 'John',
				lastname: 'Doe',
				email: 'not-an-email',
				role: 'student',
				school_id: null,
				avatar_url: null,
				gender: 'boy'
			};

			const result = updateProfileFormSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid role', () => {
			const data = {
				user_id: '550e8400-e29b-41d4-a716-446655440000',
				firstname: 'John',
				lastname: 'Doe',
				email: 'test@example.com',
				role: 'superadmin',
				school_id: null,
				avatar_url: null,
				gender: 'boy'
			};

			const result = updateProfileFormSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should accept valid genders', () => {
			const genders = ['boy', 'girl', ''];
			genders.forEach((gender) => {
				const data = {
					user_id: '550e8400-e29b-41d4-a716-446655440000',
					firstname: 'Test',
					lastname: 'User',
					email: 'test@example.com',
					role: 'student',
					school_id: null,
					avatar_url: null,
					gender
				};

				const result = updateProfileFormSchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});

		it('should reject invalid gender', () => {
			const data = {
				user_id: '550e8400-e29b-41d4-a716-446655440000',
				firstname: 'Test',
				lastname: 'User',
				email: 'test@example.com',
				role: 'student',
				school_id: null,
				avatar_url: null,
				gender: 'other'
			};

			const result = updateProfileFormSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should convert is_test string to boolean', () => {
			const data = {
				user_id: '550e8400-e29b-41d4-a716-446655440000',
				firstname: 'Test',
				lastname: 'User',
				email: 'test@example.com',
				role: 'student',
				school_id: null,
				avatar_url: null,
				gender: '',
				is_test: 'true'
			};

			const result = updateProfileFormSchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.is_test).toBe(true);
				expect(typeof result.data.is_test).toBe('boolean');
			}
		});
	});

	// ============================================================================
	// STUDENT IMPORT SCHEMA
	// ============================================================================

	describe('importStudentsFormSchema', () => {
		it('should accept valid import data', () => {
			const data = {
				students: JSON.stringify([{ name: 'John', email: 'john@test.com' }]),
				school_id: '550e8400-e29b-41d4-a716-446655440000'
			};

			const result = importStudentsFormSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject empty students data', () => {
			const data = {
				students: '',
				school_id: '550e8400-e29b-41d4-a716-446655440000'
			};

			const result = importStudentsFormSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid school_id', () => {
			const data = {
				students: JSON.stringify([{ name: 'John' }]),
				school_id: 'not-a-uuid'
			};

			const result = importStudentsFormSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject missing school_id', () => {
			const data = {
				students: JSON.stringify([{ name: 'John' }])
			};

			const result = importStudentsFormSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	// ============================================================================
	// SCHOOL MANAGEMENT SCHEMA
	// ============================================================================

	describe('schoolFormSchema', () => {
		it('should accept valid school data', () => {
			const data = {
				name: 'Test School',
				address: '123 Main St',
				city: 'Paris',
				country: 'France',
				timezone: 'Europe/Paris'
			};

			const result = schoolFormSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept minimal school data', () => {
			const data = {
				name: 'Minimal School',
				address: null,
				city: null,
				country: null,
				timezone: null
			};

			const result = schoolFormSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should trim and validate name', () => {
			const data = {
				name: '  Test School  ',
				address: null,
				city: null,
				country: null,
				timezone: null
			};

			const result = schoolFormSchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.name).toBe('Test School');
			}
		});

		it('should reject empty name', () => {
			const data = {
				name: '   ',
				address: null,
				city: null,
				country: null,
				timezone: null
			};

			const result = schoolFormSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject name exceeding max length', () => {
			const data = {
				name: 'a'.repeat(201),
				address: null,
				city: null,
				country: null,
				timezone: null
			};

			const result = schoolFormSchema.safeParse(data);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('max 200');
			}
		});

		it('should convert empty string optional fields to null', () => {
			const data = {
				name: 'Test School',
				address: '   ',
				city: '',
				country: '  ',
				timezone: ''
			};

			const result = schoolFormSchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.address).toBe(null);
				expect(result.data.city).toBe(null);
				expect(result.data.country).toBe(null);
				expect(result.data.timezone).toBe(null);
			}
		});
	});

	// ============================================================================
	// NOTIFICATION MANAGEMENT SCHEMA
	// ============================================================================

	describe('createNotificationFormSchema', () => {
		it('should accept valid notification data', () => {
			const data = {
				title: 'Important Notice',
				message: 'This is an important notification for all students.',
				type: 'info',
				target_role: 'student',
				target_class_id: '550e8400-e29b-41d4-a716-446655440000',
				expires_at: '2025-12-31T23:59:59Z'
			};

			const result = createNotificationFormSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept notification without optional fields', () => {
			const data = {
				title: 'Notice',
				message: 'Message content',
				type: 'warning',
				target_role: 'all',
				target_class_id: null,
				expires_at: null
			};

			const result = createNotificationFormSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept all notification types', () => {
			const types = ['info', 'success', 'warning', 'error'] as const;
			types.forEach((type) => {
				const data = {
					title: 'Test',
					message: 'Message',
					type,
					target_role: 'all',
					target_class_id: null,
					expires_at: null
				};

				const result = createNotificationFormSchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});

		it('should accept all target roles', () => {
			const roles = ['all', 'student', 'teacher', 'admin'] as const;
			roles.forEach((role) => {
				const data = {
					title: 'Test',
					message: 'Message',
					type: 'info',
					target_role: role,
					target_class_id: null,
					expires_at: null
				};

				const result = createNotificationFormSchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});

		it('should reject invalid type', () => {
			const data = {
				title: 'Test',
				message: 'Message',
				type: 'invalid',
				target_role: 'all',
				target_class_id: null,
				expires_at: null
			};

			const result = createNotificationFormSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid target_role', () => {
			const data = {
				title: 'Test',
				message: 'Message',
				type: 'info',
				target_role: 'invalid',
				target_class_id: null,
				expires_at: null
			};

			const result = createNotificationFormSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject empty title', () => {
			const data = {
				title: '   ',
				message: 'Message',
				type: 'info',
				target_role: 'all',
				target_class_id: null,
				expires_at: null
			};

			const result = createNotificationFormSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject title exceeding max length', () => {
			const data = {
				title: 'a'.repeat(201),
				message: 'Message',
				type: 'info',
				target_role: 'all',
				target_class_id: null,
				expires_at: null
			};

			const result = createNotificationFormSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject message exceeding max length', () => {
			const data = {
				title: 'Test',
				message: 'a'.repeat(2001),
				type: 'info',
				target_role: 'all',
				target_class_id: null,
				expires_at: null
			};

			const result = createNotificationFormSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject invalid target_class_id UUID', () => {
			const data = {
				title: 'Test',
				message: 'Message',
				type: 'info',
				target_role: 'student',
				target_class_id: 'not-a-uuid',
				expires_at: null
			};

			const result = createNotificationFormSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});
});
