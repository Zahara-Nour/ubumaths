/**
 * Auth utility helpers
 * --------------------
 * Shared client-side helpers for authentication actions that would otherwise
 * be duplicated across components.
 */

import { clearAllChatHistories } from '$lib/utils/chat-history';

/**
 * Submits a hidden POST form to /auth/logout. The server-side handler clears
 * the session cookie and redirects. Using a real form submit (rather than
 * `fetch` + manual navigation) guarantees the browser drops in-flight requests
 * and reloads with the new auth state.
 */
export function submitLogoutForm(): void {
	// Tablette partagée : l'élève suivant ne doit pas lire la conversation avec le
	// Père Ubu (T17). Une erreur de stockage n'empêche pas la déconnexion.
	try {
		clearAllChatHistories(localStorage);
	} catch (e) {
		console.error('Historique du chat non effacé :', e);
	}
	const form = document.createElement('form');
	form.method = 'POST';
	form.action = '/auth/logout';
	document.body.appendChild(form);
	form.submit();
}
