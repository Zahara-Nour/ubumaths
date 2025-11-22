import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

/**
 * Load page data for creating new worksheet
 */
export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/login');
	}

	return {
		user
	};
};
