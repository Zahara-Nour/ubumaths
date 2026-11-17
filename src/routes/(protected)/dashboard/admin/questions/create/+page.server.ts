/**
 * Création d'un modèle de question — chargement serveur
 * =====================================================
 *
 * Admin seulement. Fournit l'arbre des notions (nœuds non archivés) au champ
 * « Rangé dans » de l'éditeur.
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/middleware/auth';
import { loadActiveNodes } from '$lib/server/classification-nodes';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('(protected)/dashboard/admin/questions/create/+page.server');

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = await requireAdmin(locals);

	try {
		return { nodes: await loadActiveNodes(supabase) };
	} catch (err) {
		logger.error("Lecture de l'arbre impossible :", err);
		throw error(500, "Impossible de charger l'arbre des notions");
	}
};
