import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { QuestionTemplate } from '$lib/questions/types';
import { createServerLogger } from '$lib/utils/logger';
import { readAllRows } from '$lib/server/read-all-rows';

const logger = createServerLogger('(public)/automaths/panier/+page.server');

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = locals;

	// Tous les modèles publiés, page par page (PostgREST tronque à 1000 lignes).
	// Tri délégué à la base : `created_at` est nullable, et le tri JS
	// construisait une `Date` à partir de `null` ; `id` départage les modèles
	// importés en lot (même `created_at`) pour que la pagination soit stable.
	let templates;
	try {
		templates = await readAllRows(
			(from, to) =>
				supabase
					.from('question_templates')
					.select('*')
					.eq('status', 'published')
					.order('created_at', { ascending: false })
					.order('id')
					.range(from, to),
			'des modèles publiés'
		);
	} catch (templatesError) {
		logger.error('Failed to load question templates:', templatesError);
		throw error(500, 'Failed to load questions');
	}

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
		templates: (templates as QuestionTemplate[]) || [],
		userRole
	};
};
