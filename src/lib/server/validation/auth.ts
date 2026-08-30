/**
 * Authentication form validation schemas
 */

import { z } from 'zod';
import { formDataTransforms } from './common';
import { validatePasswordPolicy } from '$lib/server/passwordPolicy';

/**
 * SECURITY (finding H6): the server-side password policy was dead code — real
 * enforcement was only `min(8)`. This superRefine wires it into every schema that
 * sets a new password (register, update after reset), so complexity + common-
 * password checks are actually applied server-side.
 */
function enforcePasswordPolicy(password: string, ctx: z.RefinementCtx): void {
	const result = validatePasswordPolicy(password);
	if (!result.valid) {
		for (const message of result.errors) {
			ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ['password'] });
		}
	}
}

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
		// SECURITY (finding L6/#23): cap at 50 to match the DB CHECK (length <= 50) —
		// a 51-100 char name passed Zod then failed the handle_new_user INSERT, leaving
		// an orphaned auth.users row with no profile (email permanently burned).
		firstname: z.string().trim().min(1, 'Prénom requis').max(50),
		lastname: z.string().trim().min(1, 'Nom requis').max(50),
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
	})
	.superRefine((d, ctx) => enforcePasswordPolicy(d.password, ctx));

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
export const updatePasswordSchema = z
	.object({
		password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
		confirmPassword: z.string().min(1, 'Confirmation du mot de passe requise')
	})
	.superRefine((d, ctx) => enforcePasswordPolicy(d.password, ctx));

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
