import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadMonitor } from '$lib/utils/loadTracer';

export const load: PageServerLoad = loadMonitor.traceServerLoad(async (event) => {
	const { locals } = event;

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
		.eq('is_published', true)
		.order('category', { ascending: true })
		.order('level', { ascending: true });

	if (templatesError) {
		throw error(500, 'Erreur lors du chargement des templates');
	}

	return {
		templates: templates || []
	};
});
