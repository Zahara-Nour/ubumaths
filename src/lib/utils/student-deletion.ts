/**
 * Confirmation de la suppression d'un élève par l'admin
 * ======================================================
 *
 * L'admin retape le nom de l'élève ; la page et le serveur comparent avec la même règle.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DeletionNameSource {
	firstname: string | null;
	lastname: string | null;
	full_name: string | null;
	email: string | null;
}

// ============================================================================
// FONCTIONS
// ============================================================================

/** Espaces de bord retirés, espaces multiples réduits à un seul. */
function normalize(text: string): string {
	return text.normalize('NFC').trim().replace(/\s+/g, ' ');
}

/**
 * Le texte à retaper : « Prénom Nom », sinon le nom complet, sinon l'adresse
 * (même ordre que le nom affiché sur la fiche).
 */
export function deletionConfirmationName(profile: DeletionNameSource): string {
	if (profile.firstname && profile.lastname) {
		return normalize(`${profile.firstname} ${profile.lastname}`);
	}
	return normalize(profile.full_name || profile.email || '');
}

/** Vrai si le texte tapé désigne exactement l'élève (casse et accents compris). */
export function matchesDeletionConfirmation(typed: string, profile: DeletionNameSource): boolean {
	const expected = deletionConfirmationName(profile);
	return expected.length > 0 && normalize(typed) === expected;
}
