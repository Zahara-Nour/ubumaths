/**
 * Question Template Edit Page - Server Load
 * ==========================================
 *
 * Loads existing question template for editing.
 *
 * SECURITY:
 * - Admins only
 * - Validates template exists
 *
 * RETURNS:
 * - template: QuestionTemplate
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, parent }) => {
	const { supabase, profile } = await parent();

	// Check admin role
	if (profile.role !== 'admin') {
		throw error(403, 'Accès refusé');
	}

	// Fetch template
	const { data: template, error: fetchError } = await supabase
		.from('question_templates')
		.select('*')
		.eq('id', params.id)
		.single();

	if (fetchError || !template) {
		throw error(404, 'Question non trouvée');
	}

	return {
		template
	};
};
