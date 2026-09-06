import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { QuestionTemplate } from '$lib/questions/types';

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = locals;

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
};
