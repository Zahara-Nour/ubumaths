/**
 * Tests for admin validation schemas
 */

import { describe, it, expect } from 'vitest';
import {
	addToClassSchema,
	removeFromClassSchema,
	searchUsersSchema,
	importStudentsFormSchema
} from '../admin';

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
				expect(result.error.issues[0].message).toContain('Identifiant d’utilisateur invalide');
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
				expect(result.error.issues[0].message).toContain('Identifiant de classe invalide');
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

	// ============================================================================
	// NOTIFICATION MANAGEMENT SCHEMA
	// ============================================================================
});
