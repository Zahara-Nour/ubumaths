import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getCachedProfile } from '$lib/server/cache/profile';
import { getCachedTemplates } from '$lib/server/cache/templates';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/auth/signin');
	}

	// Verify user is a teacher
	const profile = await getCachedProfile(user.id, locals.supabase);

	if (!profile || profile.role !== 'teacher') {
		throw redirect(303, '/dashboard');
	}

	// Fetch templates for cart preview (cached in Redis - 10 min TTL)
	const templates = await getCachedTemplates(locals.supabase);

	return {
		templates
	};
};
