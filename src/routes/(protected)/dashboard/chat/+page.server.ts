import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Verify user is authenticated
	if (!locals.session) {
		redirect(303, '/auth/login');
	}

	// Verify profile exists
	if (!locals.profile) {
		redirect(303, '/auth/login');
	}

	return {
		session: locals.session,
		profile: locals.profile
	};
};
