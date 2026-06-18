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
import { mapDbTemplateToForm } from '$lib/questions/types';
import { requireAdmin } from '$lib/server/middleware/auth';

export const load: PageServerLoad = async ({ params, locals }) => {
	// Check admin (real admin login OR step-up elevation)
	const { supabase } = await requireAdmin(locals);

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
		template: mapDbTemplateToForm(template as unknown as Record<string, unknown>)
	};
};
