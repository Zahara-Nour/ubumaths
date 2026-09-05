import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/auth/signin');
	}

	// Verify user is a teacher
	const { data: profileData, error: profileError } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (profileError || !profileData) {
		throw error(403, 'Profil non trouvé');
	}

	if (profileData.role !== 'teacher') {
		throw redirect(303, '/dashboard');
	}

	// Fetch all published question templates
	const { data: templates, error: templatesError } = await locals.supabase
		.from('question_templates')
		.select('*')
		// Deux colonnes inexistantes rendaient cette requête invalide, donc la page
		// de création d'évaluation n'affichait AUCUNE question : la publication se
		// lit sur `status`, et il n'y a pas de `category` — la classification passe
		// par `theme` puis `domain`.
		.eq('status', 'published')
		.order('theme', { ascending: true })
		.order('level', { ascending: true });

	if (templatesError) {
		throw error(500, 'Erreur lors du chargement des templates');
	}

	return {
		templates: templates || []
	};
};
