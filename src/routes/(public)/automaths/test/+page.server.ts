import type { PageServerLoad } from './$types';
import type { QuestionTemplate } from '$lib/questions/types';

/**
 * Load all published question templates for test generation
 * Similar to cart page, loads templates from database
 */
export const load: PageServerLoad = async ({ locals }) => {
	const supabase = locals.supabase;

	// Fetch all published templates
	const { data: templates, error } = await supabase
		.from('question_templates')
		.select('*')
		.eq('status', 'published')
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Error loading templates for test:', error);
		return {
			templates: [] as QuestionTemplate[]
		};
	}

	return {
		templates: (templates as QuestionTemplate[]) || []
	};
};
