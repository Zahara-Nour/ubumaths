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
import { loadTemplateProgrammeTags, type TemplateProgrammeTags } from '$lib/server/programme-tags';

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

	// Tags vers les points du programme : un choix par programme (cf. `programme-tags`).
	// `question_template_points` est le pivot de l'acquisition : une tentative n'a
	// pas de clé étrangère vers un point, elle s'y relie par le modèle tagué.
	// Sans un tag ici, aucun point ne se validera jamais.
	const row = template as { grades?: string[] | null; classification_node_id?: string | null };
	let programmeTags: TemplateProgrammeTags;
	try {
		programmeTags = await loadTemplateProgrammeTags(supabase, {
			id,
			grades: row.grades ?? [],
			classification_node_id: row.classification_node_id ?? null
		});
	} catch (err) {
		throw error(500, err instanceof Error ? err.message : 'Tags du modèle illisibles');
	}

	return {
		template: mapDbTemplateToForm(template as unknown as Record<string, unknown>),
		templateId: id,
		programmeTags
	};
};
