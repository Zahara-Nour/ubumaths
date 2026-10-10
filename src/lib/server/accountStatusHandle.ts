/**
 * Garde du statut de compte (constat B6, décision de David du 2026-10-10)
 * =======================================================================
 *
 * Le layout `(protected)` arrête un compte « en attente » ou « refusé » sur les PAGES.
 * Mais les API (`requireAuth` ne lit pas le statut) et les actions de formulaire (qui ne
 * passent pas par le load du layout) restaient ouvertes. Ce garde, posé dans le hook
 * APRÈS le chargement du profil, ferme les deux en un seul endroit : un compte non
 * approuvé reçoit 403 sur toute API et toute écriture.
 *
 * Restent ouverts : la déconnexion, et l'export et la suppression du compte (droits
 * RGPD art. 15, 17 et 20 — un compte refusé peut toujours les exercer).
 */

import { json, type Handle } from '@sveltejs/kit';

// ============================================================================
// CONSTANTES
// ============================================================================

/** Chemins toujours ouverts à un compte connecté, quel que soit son statut. */
const CHEMINS_OUVERTS = new Set(['/auth/logout', '/api/account/delete', '/api/account/export']);

/** Méthodes qui ne modifient rien. */
const METHODES_LECTURE = new Set(['GET', 'HEAD', 'OPTIONS']);

// ============================================================================
// HANDLE
// ============================================================================

export const accountStatusHandle: Handle = async ({ event, resolve }) => {
	const { user, profile } = event.locals;

	// Visiteur, profil absent (le layout s'en charge) ou compte approuvé : rien à garder.
	if (!user || !profile || profile.status === 'approved') {
		return resolve(event);
	}

	const { pathname } = event.url;
	if (CHEMINS_OUVERTS.has(pathname)) {
		return resolve(event);
	}

	const estApi = pathname.startsWith('/api/');
	const estEcriture = !METHODES_LECTURE.has(event.request.method);
	if (estApi || estEcriture) {
		return json({ message: 'Compte non approuvé' }, { status: 403 });
	}

	// Page en lecture : le layout `(protected)` redirige (attente) ou déconnecte (refus).
	return resolve(event);
};
