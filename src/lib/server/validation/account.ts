import { z } from 'zod';

/**
 * Confirmation phrase for account deletion (French)
 * User must type this exact phrase to confirm deletion
 */
const DELETION_CONFIRMATION_PHRASE = 'SUPPRIMER MON COMPTE';

/**
 * Validation schema for account deletion (GDPR Art. 17)
 *
 * Requires explicit confirmation phrase to prevent accidental deletion.
 * The phrase is in French to match the application language.
 */
export const deleteAccountSchema = z.object({
	confirmation: z.string().refine((val) => val === DELETION_CONFIRMATION_PHRASE, {
		message: `Veuillez saisir exactement '${DELETION_CONFIRMATION_PHRASE}' pour confirmer la suppression`
	})
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

/**
 * Export the confirmation phrase for use in UI
 */
export const ACCOUNT_DELETION_CONFIRMATION_PHRASE = DELETION_CONFIRMATION_PHRASE;
