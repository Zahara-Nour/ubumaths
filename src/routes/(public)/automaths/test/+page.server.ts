import { error, redirect } from '@sveltejs/kit';
import { resolveTestLaunch } from '$lib/utils/test-launch';
import type { PageServerLoad } from './$types';
import type { QuestionTemplate } from '$lib/questions/types';

/**
 * Load all published question templates for test generation.
 *
 * Évaluation assignée (`?assignment=`) : AUCUN modèle (chantier 5, ADR 0015, E19).
 * Le serveur tire et corrige ; la page ne reçoit que les questions publiques de
 * la tentative. L'aperçu du prof charge les modèles lui-même, à la demande.
 *
 * Lien de série SANS forme (`?categories=…` seul) : redirection vers le panier,
 * qui y met la série (Q46). Plus de fenêtre de choix pour un lien.
 */
export const load: PageServerLoad = async ({ locals, url }) => {
	if (url.searchParams.has('assignment')) {
		return { templates: [] as QuestionTemplate[] };
	}

	const launch = resolveTestLaunch(url.searchParams);
	if (launch.kind === 'cart') {
		redirect(307, launch.href);
	}

	const supabase = locals.supabase;

	// Fetch all published question templates directly from database
	const { data: allTemplates, error: templatesError } = await supabase
		.from('question_templates')
		.select('*')
		.eq('status', 'published')
		// Tri délégué à la base : `created_at` est nullable, et le tri JS
		// construisait une `Date` à partir de `null`.
		.order('created_at', { ascending: false });

	if (templatesError) {
		console.error('Failed to load question templates:', templatesError);
		throw error(500, 'Failed to load questions');
	}

	const templates = allTemplates ?? [];

	return {
		templates: templates as QuestionTemplate[]
	};
};
