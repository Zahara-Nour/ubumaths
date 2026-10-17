/**
 * Message montré au prof quand la connexion à Google revient en erreur.
 *
 * Le callback OAuth (`/api/google/auth/callback`) renvoie vers
 * `/dashboard/teacher/settings/google?error=<code ou message>`.
 *
 * @module utils/google-oauth-error
 */

const MAX_DETAIL_LENGTH = 200;

/** Message pour le paramètre `error` de l'adresse ; `null` s'il n'y en a pas. */
export function googleOAuthErrorMessage(error: string | null): string | null {
	if (!error) return null;
	// Refus du prof sur l'écran de consentement de Google.
	if (error === 'access_denied') return 'Connexion à Google annulée';
	const detail = error.length > MAX_DETAIL_LENGTH ? `${error.slice(0, MAX_DETAIL_LENGTH)}…` : error;
	return `La connexion à Google a échoué : ${detail}`;
}
