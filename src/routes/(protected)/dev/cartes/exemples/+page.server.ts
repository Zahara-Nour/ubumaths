import type { PageServerLoad } from './$types';
import { getAllTemplates } from '$lib/server/vip-card-queries';

export const prerender = false; // Disable prerendering (requires DB connection)

export const load: PageServerLoad = async ({ locals }) => {
	// La garde de `/dev` arrête le visiteur en amont ; sans session, la page
	// s'afficherait sans cartes plutôt que d'échouer.
	if (!locals.user) return { templates: [] };

	const templates = await getAllTemplates(locals.supabase);

	return {
		templates
	};
};
