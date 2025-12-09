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
import { validateUuidParam } from '$lib/server/validation/params';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { profile, supabase } = locals;

	// Check admin role
	if (!profile || profile.role !== 'admin') {
		throw error(403, 'Accès refusé');
	}

	const id = validateUuidParam(params.id);

	// Fetch template
	const { data: template, error: fetchError } = await supabase
		.from('question_templates')
		.select('*')
		.eq('id', id)
		.single();

	if (fetchError || !template) {
		throw error(404, 'Question non trouvée');
	}

	return {
		template
	};
};
