import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

/**
 * Load page data for creating new worksheet
 */
export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/auth/login');
	}

	// Fetch available templates (user's own only)
	const { data: templates } = await locals.supabase
		.from('worksheet_templates')
		.select('id, name, description, created_by')
		.eq('created_by', user.id)
		.order('name');

	return {
		user,
		templates: templates ?? []
	};
};
