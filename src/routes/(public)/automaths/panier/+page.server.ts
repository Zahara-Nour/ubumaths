import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { QuestionTemplate } from '$lib/questions/types';
import { loadMonitor } from '$lib/utils/loadTracer';

export const load: PageServerLoad = loadMonitor.traceServerLoad(async (event) => {
	const { locals } = event;

	const { supabase } = locals;

	// Fetch all published question templates directly from database
	const { data: allTemplates, error: templatesError } = await supabase
		.from('question_templates')
		.select('*')
		.eq('is_published', true);

	if (templatesError) {
		console.error('Failed to load question templates:', templatesError);
		throw error(500, 'Failed to load questions');
	}

	// Sort by created_at (descending)
	const templates =
		allTemplates?.sort(
			(a: { created_at: string }, b: { created_at: string }) =>
				new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
		) || [];

	// Get user role if authenticated
	const { user } = await locals.safeGetSession();
	let userRole: string | null = null;

	if (user) {
		const { data: profile } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		userRole = profile?.role || null;
	}

	return {
		templates: (templates as QuestionTemplate[]) || [],
		userRole
	};
});
