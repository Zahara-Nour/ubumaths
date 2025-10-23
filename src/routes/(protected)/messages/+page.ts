import { redirect } from '@sveltejs/kit';

export function load() {
	// Redirect to inbox by default
	throw redirect(302, '/messages/inbox');
}
