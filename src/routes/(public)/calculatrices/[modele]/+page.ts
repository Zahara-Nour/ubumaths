/**
 * Guides calculatrices : les niveaux d'un modèle. Modèle inconnu → 404 (phase 0, point 12).
 */

import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { isModelAvailable } from '$lib/calculatrices/guide';
import { GRADE_LABELS, GRADE_SLUGS } from '$lib/calculatrices/levels';
import { findModel } from '$lib/calculatrices/models';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const model = findModel(params.modele);
	if (!model) throw error(404, 'Calculatrice inconnue');
	return {
		model: { slug: model.slug, name: model.name },
		available: isModelAvailable(model, { includeUnverified: dev }),
		grades: model.grades.map((grade) => ({ slug: GRADE_SLUGS[grade], label: GRADE_LABELS[grade] }))
	};
};
