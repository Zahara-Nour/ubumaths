import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { GOOGLE_CLASSROOM_ENABLED } from '$lib/config/google-classroom';

export const load: PageServerLoad = async () => {
	// Google Classroom access is disabled: hide the teacher integration page
	// (connect / import / share) while keeping all the plumbing in place.
	if (!GOOGLE_CLASSROOM_ENABLED) throw redirect(302, '/dashboard');
};
