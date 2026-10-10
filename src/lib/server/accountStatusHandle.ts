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
 * Restent ouverts : déconnexion, connexion, inscription, réinitialisation du mot de
 * passe, consentement parental, journal d'erreurs, export et suppression du compte
 * (droits RGPD art. 15, 17 et 20).
 */

import { json, type Handle } from '@sveltejs/kit';

// ============================================================================
// CONSTANTES
// ============================================================================

/**
 * Routes toujours ouvertes à un compte connecté, quel que soit son statut — par
 * IDENTIFIANT de route, jamais par chemin brut : SvelteKit route sur le chemin décodé
 * (`/%61pi/x` atteint `/api/x`), un test sur `url.pathname` se contourne.
 */
const ROUTES_OUVERTES = new Set([
	'/(public)/auth/logout',
	'/(public)/auth/login',
	'/(public)/auth/register',
	// Réinitialisation du mot de passe d'un compte en attente
	'/(public)/auth/update-password',
	// Consentement parental : un parent peut signer sur l'ordinateur où le compte de
	// l'enfant est ouvert
	'/(public)/consent/[token]',
	// Journal des erreurs client
	'/api/errors/log',
	// Droits RGPD (art. 15, 17, 20)
	'/api/account/export',
	'/api/account/delete'
]);

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

	const routeId = event.route.id;
	if (routeId && ROUTES_OUVERTES.has(routeId)) {
		return resolve(event);
	}

	const estApi = routeId?.startsWith('/api/') ?? false;
	const estEcriture = !METHODES_LECTURE.has(event.request.method);
	if (estApi || estEcriture) {
		return json({ message: 'Compte non approuvé' }, { status: 403 });
	}

	// Page en lecture : le layout `(protected)` redirige (attente) ou déconnecte (refus).
	return resolve(event);
};
