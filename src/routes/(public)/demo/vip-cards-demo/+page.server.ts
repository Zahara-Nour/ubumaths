import type { PageServerLoad } from './$types';
import { getAllTemplates } from '$lib/server/vip-card-queries';

export const prerender = false; // Disable prerendering (requires DB connection)

export const load: PageServerLoad = async ({ locals }) => {
	const templates = await getAllTemplates(locals.supabase);

	return {
		templates
	};
};
