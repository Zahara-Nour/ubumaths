/**
 * Authentication form validation schemas
 */

import { z } from 'zod';
import { formDataTransforms } from './common';

// ============================================================================
// LOGIN SCHEMAS
// ============================================================================

/**
 * Login form schema
 */
export const loginFormSchema = z.object({
	email: formDataTransforms.email,
	password: z.string().min(1, 'Mot de passe requis')
});

// ============================================================================
// SIGNUP SCHEMAS
// ============================================================================

/**
 * Signup form schema
 */
export const signupFormSchema = z.object({
	email: formDataTransforms.email,
	password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
	confirmPassword: z.string().min(1, 'Confirmation du mot de passe requise')
});

// ============================================================================
// PASSWORD RESET SCHEMAS
// ============================================================================

/**
 * Request password reset schema
 */
export const requestPasswordResetSchema = z.object({
	email: formDataTransforms.email
});

/**
 * Update password schema (after reset link)
 */
export const updatePasswordSchema = z.object({
	password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
	confirmPassword: z.string().min(1, 'Confirmation du mot de passe requise')
});

// ============================================================================
// PROFILE UPDATE SCHEMAS
// ============================================================================

/**
 * Profile update schema
 */
export const updateProfileSchema = z.object({
	firstname: formDataTransforms.optionalString.nullable(),
	lastname: formDataTransforms.optionalString.nullable(),
	avatar_url: formDataTransforms.optionalString.nullable(),
	grade: formDataTransforms.optionalString.nullable()
});
