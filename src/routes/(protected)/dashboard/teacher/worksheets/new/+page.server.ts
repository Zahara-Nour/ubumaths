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

	// Fetch available templates (public + user's own)
	const { data: templates } = await locals.supabase
		.from('worksheet_templates')
		.select('id, name, description, is_public, created_by')
		.or(`is_public.eq.true,created_by.eq.${user.id}`)
		.order('name');

	return {
		user,
		templates: templates ?? []
	};
};
