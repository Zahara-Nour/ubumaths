import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { QuestionTemplate } from '$lib/questions/types';

/**
 * Load all published question templates for test generation
 */
export const load: PageServerLoad = async ({ locals }) => {
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
			(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
		) || [];

	return {
		templates: templates as QuestionTemplate[]
	};
};
