/**
 * Guides calculatrices : les niveaux d'un modèle. Modèle inconnu → 404 (phase 0, point 12).
 */

import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { modelPage } from '$lib/calculatrices/page-data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const page = modelPage(params.modele, { includeUnverified: dev });
	if (!page) throw error(404, 'Calculatrice inconnue');
	return page;
};
