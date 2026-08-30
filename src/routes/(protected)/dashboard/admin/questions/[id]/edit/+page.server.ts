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
import { getCurriculumTree, type CurriculumTreeTheme } from '$lib/server/curriculum';

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

	// Arbres du référentiel pour les niveaux de la question, et ses tags actuels.
	// `question_template_points` est le pivot de l'acquisition : une tentative n'a
	// pas de clé étrangère vers un point, elle s'y relie par le template tagué.
	// Sans un tag ici, aucun point ne se validera jamais.
	const grades = ((template as { grades?: string[] }).grades ?? []) as string[];
	const curriculumByGrade: { grade: string; tree: CurriculumTreeTheme[] }[] = [];
	for (const g of grades) {
		const tree = await getCurriculumTree(supabase, g);
		if (tree.length > 0) curriculumByGrade.push({ grade: g, tree });
	}

	const { data: tagRows } = await supabase
		.from('question_template_points')
		.select('point_id')
		.eq('template_id', id);

	return {
		template: mapDbTemplateToForm(template as unknown as Record<string, unknown>),
		templateId: id,
		curriculumByGrade,
		taggedPointIds: (tagRows ?? []).map((r) => r.point_id)
	};
};
