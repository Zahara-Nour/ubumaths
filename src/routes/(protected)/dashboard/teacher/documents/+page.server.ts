import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.safeGetSession();

	if (!session.session) {
		throw redirect(303, '/login');
	}

	// Get user profile to check role
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', session.user?.id)
		.single();

	if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
		throw redirect(303, '/dashboard');
	}

	return {};
};
