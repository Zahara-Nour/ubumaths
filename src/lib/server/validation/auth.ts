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

/**
 * Student self-registration form schema (page /auth/register).
 *
 * The student registers with a class join code distributed by the teacher; the code is
 * validated server-side against an active + open class (RPC resolve_open_class_by_code).
 * `acceptTerms` (CGU + privacy) is mandatory — RGPD. `password` is capped at 72 to respect
 * the bcrypt input limit.
 */
export const registerFormSchema = z
	.object({
		firstname: z.string().trim().min(1, 'Prénom requis').max(100),
		lastname: z.string().trim().min(1, 'Nom requis').max(100),
		email: formDataTransforms.email,
		password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').max(72),
		confirmPassword: z.string().min(1, 'Confirmation du mot de passe requise'),
		classCode: z.string().trim().min(1, 'Code de classe requis').max(64),
		acceptTerms: z
			.string()
			.optional()
			.transform((v) => v === 'true' || v === 'on' || v === '1')
			.refine((v) => v === true, {
				message: 'Vous devez accepter les CGU et la politique de confidentialité'
			})
	})
	.refine((d) => d.password === d.confirmPassword, {
		message: 'Les mots de passe ne correspondent pas',
		path: ['confirmPassword']
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
