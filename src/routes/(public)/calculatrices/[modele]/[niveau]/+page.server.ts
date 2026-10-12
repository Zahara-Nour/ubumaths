/**
 * Guides calculatrices : le guide d'un modèle à un niveau. Calculé sur le serveur : une
 * séquence non relue sur la machine n'est envoyée qu'en local (phase 0, point 8).
 */

import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { guidePage } from '$lib/calculatrices/page-data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const page = guidePage(params.modele, params.niveau, { includeUnverified: dev });
	if (!page) throw error(404, 'Guide introuvable');
	return page;
};
