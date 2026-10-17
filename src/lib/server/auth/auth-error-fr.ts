/**
 * Erreurs d'authentification Supabase → messages en français (formulation neutre, sans personne).
 *
 * Supabase renvoie des messages en anglais (« New password should be different
 * from the old password »). On ne les affiche jamais tels quels : on traduit les
 * codes connus, et tout le reste reçoit un message de repli.
 *
 * @module lib/server/auth/auth-error-fr
 */

// Constantes

export const AUTH_ERROR_FALLBACK = 'Une erreur est survenue. Réessayer dans quelques instants.';

const LINK_EXPIRED = 'Lien expiré. Demander un nouveau lien depuis « Mot de passe oublié ».';
const RATE_LIMITED = 'Trop de tentatives. Réessayer dans quelques minutes.';
const REAUTH = 'Par sécurité, reconnexion nécessaire avant de changer le mot de passe.';

/** Codes de `AuthError.code` (@supabase/auth-js) */
const MESSAGES: Record<string, string> = {
	same_password: 'Le nouveau mot de passe doit être différent de l’ancien.',
	weak_password: 'Ce mot de passe est trop faible : en choisir un plus long et plus varié.',
	session_not_found: LINK_EXPIRED,
	session_expired: LINK_EXPIRED,
	refresh_token_not_found: LINK_EXPIRED,
	otp_expired: LINK_EXPIRED,
	flow_state_expired: LINK_EXPIRED,
	reauthentication_needed: REAUTH,
	reauthentication_not_valid: REAUTH,
	over_request_rate_limit: RATE_LIMITED,
	over_email_send_rate_limit: RATE_LIMITED
};

// Functions

export function authErrorToFrench(
	error: { code?: string | null } | null | undefined,
	fallback: string = AUTH_ERROR_FALLBACK
): string {
	return (error?.code && MESSAGES[error.code]) || fallback;
}
