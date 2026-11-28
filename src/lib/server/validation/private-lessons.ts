/**
 * Invitations de cours particulier : entrées de la page admin
 * ==========================================================
 *
 * Chantier `invitation-cours-particulier` (docs/wip/invitation-cours-particulier-progress.md),
 * PR 2. Mêmes règles de prénom et d'adresse du parent que l'inscription par le parent
 * (`parentRegisterFormSchema`) : le prénom devient l'identifiant de l'enfant (PR 3).
 *
 * PR 3 : le formulaire de la page du parent (`/auth/register/invitation/[token]`).
 */
import { z } from 'zod';
import { uuidSchema } from './common';
import { childFirstnameSchema, enforcePasswordPolicy, parentContactEmailSchema } from './auth';
import { gradeCodeSchema } from './grades';

/**
 * Même forme que la contrainte `private_lesson_invitations_parent_email` : une adresse que
 * Zod accepte et que la base refuserait ferait échouer l'envoi en 500.
 */
const DB_EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/** « Inviter un élève » : prénom, adresse du parent, niveau (décision 4). */
export const privateLessonInvitationCreateSchema = z.object({
	firstname: childFirstnameSchema,
	parentEmail: parentContactEmailSchema.pipe(
		z.string().regex(DB_EMAIL_PATTERN, 'Adresse email invalide')
	),
	grade: gradeCodeSchema
});

/** « Renvoyer » et « Annuler » : l'invitation visée. */
export const privateLessonInvitationIdSchema = z.object({
	id: uuidSchema
});

/** Case cochée : MyCheckbox envoie `true` dans un champ caché. */
function requiredCheckbox(message: string) {
	return z
		.string()
		.max(8)
		.optional()
		.transform((v) => v === 'true' || v === 'on' || v === '1')
		.refine((v) => v === true, { message });
}

/** Jeton du lien, tel que l'écrit `newToken` (32 octets en base64url : 43 caractères). */
export const privateLessonTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

/**
 * Page du parent : mot de passe de l'enfant (deux fois), CGU et consentement (décisions 1
 * et 6 : toujours exigé). Le prénom n'est pas un champ : il vient de l'invitation.
 */
export const privateLessonRedeemFormSchema = z
	.object({
		password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').max(72),
		confirmPassword: z.string().min(1, 'Confirmation du mot de passe requise').max(72),
		acceptTerms: requiredCheckbox(
			'Acceptation des CGU et de la politique de confidentialité requise'
		),
		consent: requiredCheckbox('Votre consentement est nécessaire pour créer le compte')
	})
	.refine((d) => d.password === d.confirmPassword, {
		message: 'Les mots de passe ne correspondent pas',
		path: ['confirmPassword']
	})
	.superRefine((d, ctx) => enforcePasswordPolicy(d.password, ctx));

export type PrivateLessonInvitationCreateInput = z.infer<
	typeof privateLessonInvitationCreateSchema
>;
