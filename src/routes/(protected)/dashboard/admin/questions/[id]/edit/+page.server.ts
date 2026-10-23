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
import { loadNodesWithAncestors } from '$lib/server/programme-tree';
import { buildTemplateFactSheet, type FactSheetTemplateRow } from '$lib/server/template-fact-sheet';
import type { TemplateFactSheet } from '$lib/questions/template-fact-sheet';

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
	// Fiche du modèle (version courte, en tête) : même lecture des tags, plus le chemin dans l'arbre.
	const row = template as unknown as FactSheetTemplateRow;
	let programmeTags: TemplateProgrammeTags;
	let factSheet: TemplateFactSheet;
	try {
		const nodeId = row.classification_node_id ?? null;
		const [tags, nodes] = await Promise.all([
			loadTemplateProgrammeTags(supabase, {
				id,
				grades: row.grades ?? [],
				classification_node_id: nodeId
			}),
			nodeId === null ? Promise.resolve([]) : loadNodesWithAncestors(supabase, [nodeId])
		]);
		programmeTags = tags;
		factSheet = buildTemplateFactSheet(row, nodes, tags);
	} catch (err) {
		throw error(500, err instanceof Error ? err.message : 'Tags du modèle illisibles');
	}

	return {
		template: mapDbTemplateToForm(template as unknown as Record<string, unknown>),
		templateId: id,
		programmeTags,
		factSheet
	};
};
