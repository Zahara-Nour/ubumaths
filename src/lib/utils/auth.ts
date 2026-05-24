/**
 * Auth utility helpers
 * --------------------
 * Shared client-side helpers for authentication actions that would otherwise
 * be duplicated across components.
 */

/**
 * Submits a hidden POST form to /auth/logout. The server-side handler clears
 * the session cookie and redirects. Using a real form submit (rather than
 * `fetch` + manual navigation) guarantees the browser drops in-flight requests
 * and reloads with the new auth state.
 */
export function submitLogoutForm(): void {
	const form = document.createElement('form');
	form.method = 'POST';
	form.action = '/auth/logout';
	document.body.appendChild(form);
	form.submit();
}
