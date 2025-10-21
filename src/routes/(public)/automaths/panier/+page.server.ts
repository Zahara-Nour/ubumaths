import type { PageServerLoad } from './$types';
import type { QuestionTemplate } from '$lib/questions/types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	// Fetch all published templates (we'll filter client-side based on cart)
	const { data: templates, error } = await supabase
		.from('question_templates')
		.select('*')
		.eq('status', 'published')
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Error loading templates for cart:', error);
		return {
			templates: []
		};
	}

	return {
		templates: (templates as QuestionTemplate[]) || []
	};
};
