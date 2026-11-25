/**
 * Invitations de cours particulier : entrées de la page admin
 * ==========================================================
 *
 * Chantier `invitation-cours-particulier` (docs/wip/invitation-cours-particulier-progress.md),
 * PR 2. Mêmes règles de prénom et d'adresse du parent que l'inscription par le parent
 * (`parentRegisterFormSchema`) : le prénom devient l'identifiant de l'enfant (PR 3).
 */
import { z } from 'zod';
import { uuidSchema } from './common';
import { childFirstnameSchema, parentContactEmailSchema } from './auth';
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

export type PrivateLessonInvitationCreateInput = z.infer<
	typeof privateLessonInvitationCreateSchema
>;
