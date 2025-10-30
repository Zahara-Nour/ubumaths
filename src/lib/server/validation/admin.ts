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
