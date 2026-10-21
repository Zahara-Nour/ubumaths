/**
 * Authentication form validation schemas
 */

import { z } from 'zod';
import { formDataTransforms } from './common';
import { validatePasswordPolicy } from '$lib/server/passwordPolicy';
import {
	childLoginBase,
	isChildAccountEmail,
	normalizeLoginIdentifier
} from '$lib/utils/child-account';

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
 * Login form schema. Le champ `email` reçoit une adresse OU l'identifiant d'un enfant
 * (`noelie42`), changé en adresse du domaine fictif (`$lib/utils/child-account`).
 */
export const loginFormSchema = z.object({
	email: z
		.string()
		.max(254, 'Identifiant trop long')
		.transform((value) => normalizeLoginIdentifier(value) ?? '')
		.pipe(
			z.string().min(1, 'Adresse ou identifiant requis').email('Adresse ou identifiant invalide')
		),
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
		// Le domaine fictif est réservé aux comptes créés par le serveur (inscription par le
		// parent) : un signUp y enverrait la confirmation pour rien et squatterait l'identifiant.
		email: formDataTransforms.email.refine((email) => !isChildAccountEmail(email), {
			message: 'Utilise une adresse email réelle'
		}),
		password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').max(72),
		confirmPassword: z.string().min(1, 'Confirmation du mot de passe requise'),
		classCode: z.string().trim().min(1, 'Code de classe requis').max(64),
		acceptTerms: z
			.string()
			.optional()
			.transform((v) => v === 'true' || v === 'on' || v === '1')
			.refine((v) => v === true, {
				message: 'Acceptation des CGU et de la politique de confidentialité requise'
			})
	})
	.refine((d) => d.password === d.confirmPassword, {
		message: 'Les mots de passe ne correspondent pas',
		path: ['confirmPassword']
	})
	.superRefine((d, ctx) => enforcePasswordPolicy(d.password, ctx));

/**
 * Inscription d'un enfant par son parent (page /auth/register/parent).
 *
 * Prénom seul (minimisation, décision 7) ; il doit garder au moins une lettre latine une
 * fois replié, sinon aucun identifiant n'est possible. L'adresse du parent est un CONTACT
 * (lien de consentement, mot de passe oublié), jamais un identifiant de connexion.
 */
export const parentRegisterFormSchema = z
	.object({
		childFirstname: z
			.string()
			.trim()
			.min(1, 'Prénom requis')
			.max(50)
			// Lettres, espaces, tirets, apostrophes : le prénom part dans le sujet d'un
			// courriel, il ne doit pouvoir porter ni lien ni texte arbitraire (audit PR 2, M1).
			.regex(
				/^[\p{L}\p{M}][\p{L}\p{M} '’-]*$/u,
				'Lettres, espaces, tirets et apostrophes seulement'
			)
			.refine((name) => childLoginBase(name) !== null, {
				message: 'Le prénom doit contenir au moins une lettre de l’alphabet latin'
			}),
		parentEmail: z
			.string()
			.trim()
			.toLowerCase()
			.max(254)
			.email('Adresse email invalide')
			.refine((email) => !isChildAccountEmail(email), {
				message: 'Utilisez votre adresse email réelle'
			}),
		password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').max(72),
		confirmPassword: z.string().min(1, 'Confirmation du mot de passe requise'),
		classCode: z.string().trim().min(1, 'Code de classe requis').max(64),
		acceptTerms: z
			.string()
			.optional()
			.transform((v) => v === 'true' || v === 'on' || v === '1')
			.refine((v) => v === true, {
				message: 'Acceptation des CGU et de la politique de confidentialité requise'
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
	// Adresse OU identifiant d'un enfant, comme à la connexion (PR 3).
	email: loginFormSchema.shape.email
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

/**
 * Lien du parent (PR 3) : compte de l'enfant + jeton maison (`createChildResetToken`,
 * 32 octets en base64url, soit 43 caractères).
 */
export const childResetLinkSchema = z.object({
	userId: z.string().uuid('Lien invalide'),
	token: z
		.string()
		.min(20, 'Lien invalide')
		.max(128, 'Lien invalide')
		.regex(/^[A-Za-z0-9_-]+$/, 'Lien invalide')
});

/**
 * Page du lien du parent (PR 3) : lien + nouveau mot de passe de l'enfant.
 */
export const parentSetChildPasswordSchema = childResetLinkSchema
	.extend({
		password: z.string().max(128),
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
