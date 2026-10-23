/**
 * Aperçu d'un modèle de question (admin) — chargement serveur
 * ============================================================
 *
 * Charge la fiche du modèle (statut, classes, chemin dans l'arbre, points, réglages). Les
 * instances, elles, sont générées côté client (`/api/questions/generate/[id]`).
 *
 * SECURITY : admins seulement (`requireAdmin`), identifiant validé.
 *
 * Une lecture en échec rend `{ ok: false, message }` : la fiche le dit, et l'aperçu reste
 * utilisable. Elle ne doit jamais devenir une fiche « sans point ».
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { validateUuidParam } from '$lib/server/validation/params';
import { requireAdmin } from '$lib/server/middleware/auth';
import {
	FACT_SHEET_TEMPLATE_COLS,
	loadTemplateFactSheet,
	type FactSheetTemplateRow
} from '$lib/server/template-fact-sheet';
import type { TemplateFactSheetResult } from '$lib/questions/template-fact-sheet';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { supabase } = await requireAdmin(locals);
	const id = validateUuidParam(params.id);

	const { data: template, error: fetchError } = await supabase
		.from('question_templates')
		.select(FACT_SHEET_TEMPLATE_COLS)
		.eq('id', id)
		.maybeSingle();

	let factSheet: TemplateFactSheetResult;
	if (fetchError) {
		factSheet = { ok: false, message: `Modèle illisible : ${fetchError.message}` };
	} else if (!template) {
		throw error(404, 'Question non trouvée');
	} else {
		try {
			const sheet = await loadTemplateFactSheet(supabase, template as FactSheetTemplateRow);
			factSheet = { ok: true, sheet };
		} catch (err) {
			factSheet = { ok: false, message: err instanceof Error ? err.message : 'Lecture en échec' };
		}
	}

	return { factSheet, templateId: id };
};
