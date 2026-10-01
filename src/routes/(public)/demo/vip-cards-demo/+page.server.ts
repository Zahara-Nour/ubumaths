import type { PageServerLoad } from './$types';
import { getAllTemplates } from '$lib/server/vip-card-queries';

export const prerender = false; // Disable prerendering (requires DB connection)

export const load: PageServerLoad = async ({ locals }) => {
	// Démo publique : le visiteur n'a aucun droit sur le catalogue, la page
	// s'affiche donc sans cartes plutôt que d'échouer.
	if (!locals.user) return { templates: [] };

	const templates = await getAllTemplates(locals.supabase);

	return {
		templates
	};
};
