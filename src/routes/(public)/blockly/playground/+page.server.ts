/**
 * Blockly Playground Server Load
 *
 * Simple load function for the playground page.
 * Can optionally load user profile if logged in for future features
 * (e.g., saving/loading workspace state).
 */

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return {
		user: locals.user
	};
};
