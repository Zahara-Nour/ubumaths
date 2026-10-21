/**
 * Mot de passe provisoire à changer (PR 3, R3)
 * ===========================================
 *
 * Le prof qui réinitialise le mot de passe d'un élève connaît le mot de passe provisoire :
 * tant que l'élève n'a pas choisi le sien (`app_metadata.must_change_password`), chaque page
 * le renvoie vers /auth/update-password, et toute API ou écriture répond 403.
 *
 * `locals.user` vient de `getUser()` (vérifié par GoTrue) : la marque est à jour dès qu'elle
 * est levée, sans attendre le rafraîchissement du jeton.
 */

import { json, redirect, type Handle } from '@sveltejs/kit';
import { mustChangePassword } from '$lib/server/child-password';

// Constantes

/** Par IDENTIFIANT de route, jamais par chemin brut (cf. accountStatusHandle). */
const ROUTES_OUVERTES = new Set([
	'/(public)/auth/update-password',
	'/(public)/auth/logout',
	'/api/errors/log'
]);

const METHODES_LECTURE = new Set(['GET', 'HEAD', 'OPTIONS']);

// Handle

export const passwordChangeHandle: Handle = async ({ event, resolve }) => {
	const { user } = event.locals;
	if (!user || !mustChangePassword(user)) return resolve(event);

	const routeId = event.route.id;
	if (!routeId || ROUTES_OUVERTES.has(routeId)) return resolve(event);

	if (routeId.startsWith('/api/') || !METHODES_LECTURE.has(event.request.method)) {
		return json({ message: 'Mot de passe provisoire : en choisir un nouveau' }, { status: 403 });
	}
	throw redirect(303, '/auth/update-password');
};
