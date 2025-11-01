import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { QuestionTemplate } from '$lib/questions/types';
import { loadMonitor } from '$lib/utils/loadTracer';

/**
 * Load all published question templates for test generation
 */
export const load: PageServerLoad = loadMonitor.traceServerLoad(async (event) => {
	const { locals } = event;

	const supabase = locals.supabase;

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

	return {
		templates: templates as QuestionTemplate[]
	};
});
