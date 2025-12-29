/**
 * Admin operations validation schemas
 */

import { z } from 'zod';
import { formDataTransforms, roleSchema, roleWithAllSchema } from './common';

/**
 * Schema for adding a user to a class
 */
export const addToClassSchema = z.object({
	userId: z.string().uuid('Invalid user ID format'),
	classId: z.string().uuid('Invalid class ID format')
});

/**
 * Schema for removing a user from a class
 */
export const removeFromClassSchema = addToClassSchema;

/**
 * Schema for searching users
 */
export const searchUsersSchema = z.object({
	query: z.string().trim().min(1).max(100),
	role: roleSchema.optional(),
	limit: z.coerce.number().int().positive().max(50).default(20)
});

// ============================================================================
// USER MANAGEMENT FORM SCHEMAS
// ============================================================================

/**
 * Gender enum (empty string allowed)
 */
const genderSchema = z.enum(['boy', 'girl', '']);

/**
 * Update profile form schema (admin)
 */
export const updateProfileFormSchema = z.object({
	user_id: formDataTransforms.uuid,
	firstname: formDataTransforms.optionalString.nullable(),
	lastname: formDataTransforms.optionalString.nullable(),
	email: formDataTransforms.email,
	role: roleSchema,
	school_id: formDataTransforms.optionalUuid.nullable(),
	avatar_url: formDataTransforms.optionalString.nullable(),
	gender: genderSchema.transform((val) => (val === '' ? null : val)),
	is_test: formDataTransforms.boolean.optional()
});

// ============================================================================
// STUDENT IMPORT SCHEMAS
// ============================================================================

/**
 * Import students form schema
 */
export const importStudentsFormSchema = z.object({
	students: z.string().min(1, 'Données des élèves requises'), // JSON string
	school_id: formDataTransforms.uuid
});

// ============================================================================
// SCHOOL MANAGEMENT SCHEMAS
// ============================================================================

/**
 * Create/Update school form schema
 */
export const schoolFormSchema = z.object({
	name: z.string().trim().min(1, 'Nom requis').max(200, 'Nom trop long (max 200)'),
	address: formDataTransforms.optionalString.nullable(),
	city: formDataTransforms.optionalString.nullable(),
	country: formDataTransforms.optionalString.nullable(),
	timezone: formDataTransforms.optionalString.nullable()
});

// ============================================================================
// NOTIFICATION MANAGEMENT SCHEMAS
// ============================================================================

/**
 * Create notification form schema
 */
export const createNotificationFormSchema = z.object({
	title: z.string().trim().min(1, 'Titre requis').max(200, 'Titre trop long (max 200)'),
	message: z.string().min(1, 'Message requis').max(2000, 'Message trop long (max 2000)'),
	type: z.enum(['info', 'success', 'warning', 'error']),
	target_role: roleWithAllSchema,
	target_class_id: formDataTransforms.optionalUuid.nullable(),
	expires_at: formDataTransforms.optionalString.nullable()
});

// ============================================================================
// TEST MODE SCHEMA
// ============================================================================

/**
 * Schema for toggling test mode (POST /api/test-mode)
 * Teacher-only: Enable/disable test mode for question generation
 * NOTE: Exported from common.ts to avoid duplication
 */
// export const testModeSchema = z.object({
// 	enabled: z.boolean()
// });

// ============================================================================
// USER PROFILE UPDATE SCHEMA (API)
// ============================================================================

/**
 * Schema for partial update of user profile fields (PATCH /api/admin/users/[id])
 * Admin-only: Update user profile fields from inline editing
 *
 * All fields are optional (partial update), nullable fields accept null
 * NOTE: Email is read-only and cannot be updated via this endpoint
 */
export const updateUserFieldsSchema = z
	.object({
		firstname: z
			.string()
			.min(1, 'Prénom invalide')
			.max(100, 'Prénom trop long')
			.nullable()
			.optional(),
		lastname: z.string().min(1, 'Nom invalide').max(100, 'Nom trop long').nullable().optional(),
		gender: z
			.enum(['boy', 'girl'], { message: 'Le genre doit être "boy" ou "girl"' })
			.nullable()
			.optional(),
		role: z.enum(['admin', 'teacher', 'student'], { message: 'Rôle invalide' }).optional(),
		school_id: z.string().uuid('ID école invalide').nullable().optional(),
		is_test: z.boolean({ message: 'is_test doit être un booléen' }).optional()
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: 'Au moins un champ doit être fourni'
	});

// ============================================================================
// CLASS STUDENTS QUERY SCHEMA
// ============================================================================

/**
 * Schema for querying students in a class (GET /api/admin/class-students)
 * Query Parameters:
 * - class_id: Optional UUID of the class to filter students
 */
export const classStudentsQuerySchema = z.object({
	class_id: z.string().uuid('ID de classe invalide').optional()
});

// ============================================================================
// USER STATUS MANAGEMENT SCHEMAS
// ============================================================================

/**
 * Schema for updating user approval status (PATCH /api/admin/users/[id]/status)
 * Admin-only: Approve or reject pending users
 *
 * When approving, profile fields can be updated at the same time
 */
export const updateUserStatusSchema = z.object({
	status: z.enum(['approved', 'rejected'], {
		message: 'Le statut doit être "approved" ou "rejected"'
	}),
	rejection_reason: z
		.string()
		.max(500, 'Raison trop longue (max 500 caractères)')
		.nullable()
		.optional(),
	// Optional profile fields (for approval with updates)
	firstname: z
		.string()
		.min(1, 'Prénom invalide')
		.max(100, 'Prénom trop long')
		.nullable()
		.optional(),
	lastname: z.string().min(1, 'Nom invalide').max(100, 'Nom trop long').nullable().optional(),
	gender: z
		.enum(['boy', 'girl'], { message: 'Le genre doit être "boy" ou "girl"' })
		.nullable()
		.optional(),
	school_id: z.string().uuid('ID école invalide').nullable().optional(),
	is_test: z.boolean({ message: 'is_test doit être un booléen' }).optional()
});
