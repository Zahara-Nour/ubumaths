import type { PageServerLoad } from './$types';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('(public)/automaths/panier/+page.server');

/**
 * Panier : rôle du visiteur seulement (enregistrer une série = prof ou admin).
 * Les modèles viennent du cache de l'onglet (`questionTemplatesCache`).
 */
export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = locals;

	// Get user role if authenticated
	const { user } = await locals.safeGetSession();
	let userRole: string | null = null;

	if (user) {
		const { data: profile, error: profileError } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		// Élément de contexte : le repli d'affichage existe déjà, mais son absence ne
		// doit pas se confondre avec une donnée réellement vide.
		if (profileError && profileError.code !== 'PGRST116') {
			logger.error('Contexte illisible :', profileError);
		}

		userRole = profile?.role || null;
	}

	return {
		userRole
	};
};
