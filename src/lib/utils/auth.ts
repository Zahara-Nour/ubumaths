/**
 * Auth utility helpers
 * --------------------
 * Shared client-side helpers for authentication actions that would otherwise
 * be duplicated across components.
 */

import { clearWorkData } from '$lib/utils/work-data';

/**
 * Submits a hidden POST form to /auth/logout. The server-side handler clears
 * the session cookie and redirects. Using a real form submit (rather than
 * `fetch` + manual navigation) guarantees the browser drops in-flight requests
 * and reloads with the new auth state.
 */
export function submitLogoutForm(): void {
	// Tablette partagée : l'élève suivant ne doit retrouver ni la conversation avec le
	// Père Ubu, ni le code, les calculs ou les parties du précédent (T17,
	// `src/lib/utils/work-data.ts`). Une erreur de stockage n'empêche pas la déconnexion.
	try {
		clearWorkData(localStorage);
	} catch (e) {
		console.error('Données de travail non effacées :', e);
	}
	const form = document.createElement('form');
	form.method = 'POST';
	form.action = '/auth/logout';
	document.body.appendChild(form);
	form.submit();
}
