import type { PageServerLoad } from './$types';
import type { QuestionTemplate } from '$lib/questions/types';

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = locals;

	// Fetch all published templates (we'll filter client-side based on cart)
	const { data: templates, error } = await supabase
		.from('question_templates')
		.select('*')
		.eq('status', 'published')
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Error loading templates for cart:', error);
	}

	// Get user role if authenticated
	const { user } = await locals.safeGetSession();
	let userRole: string | null = null;

	if (session) {
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
};
