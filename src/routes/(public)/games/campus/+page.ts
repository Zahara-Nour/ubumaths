/**
 * Campus Game - Page Configuration
 *
 * Prerendering disabled because:
 * - Game uses client-side state management with Svelte 5 runes
 * - localStorage persistence requires client-side execution
 * - Dice animations and interactions are client-only
 */

import type { PageLoad } from './$types';

export const prerender = false;

export const load: PageLoad = async ({ parent }) => {
	const { user, profile } = await parent();

	return {
		user,
		profile
	};
};
