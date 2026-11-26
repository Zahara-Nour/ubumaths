import type { PageServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { z } from 'zod';
import { fetchWorksheetCitations } from '#lib/server/worksheets/citations.ts';
import { listWorksheetStyles } from '#lib/server/worksheets/worksheet-styles.ts';
import { loadActiveNodes } from '#lib/server/classification-nodes.ts';
import { loadWorksheetVersionChoices } from '#lib/server/exercise-versions.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('dashboard/teacher/contenu/worksheets/[id]/+page.server');

// UUID validation schema
const uuidSchema = z.string().uuid();

/**
 * Load worksheet details with sections and exercises
 */
export const load: PageServerLoad = async ({ locals, params, fetch }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/auth/login');
	}

	// Validate worksheet ID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'ID de feuille invalide');
	}

	// Les deux lectures sont indépendantes : les enchaîner faisait payer un
	// aller-retour de plus à chaque ouverture de fiche.
	const [response, citations, versionChoices] = await Promise.all([
		fetch(`/api/worksheets/${params.id}`),
		fetchWorksheetCitations(locals.supabase, idValidation.data),
		// Versions des exercices de la fiche (ADR 0044 point 6) : ici plutôt que dans l'API
		// partagée, pour la même raison que `citations` ci-dessous. Illisibles : la fiche reste
		// éditable, sans le menu des versions.
		loadWorksheetVersionChoices(locals.supabase, idValidation.data).catch((cause: unknown) => {
			logger.error('Versions des exercices illisibles :', cause);
			return { active_assignments: 0, lines: {} };
		})
	]);

	if (!response.ok) {
		if (response.status === 404) {
			throw error(404, 'Fiche introuvable');
		}
		if (response.status === 403) {
			throw error(403, 'Accès refusé');
		}
		throw error(500, 'Erreur lors du chargement de la feuille');
	}

	const data = await response.json();

	// Les styles de l'AUTEUR de la fiche : l'admin qui ouvre la fiche du prof
	// voit le style qu'elle porte, comme le PDF.
	const [styles, nodes] = await Promise.all([
		listWorksheetStyles(locals.supabase, data.worksheet.created_by),
		// L'arbre des notions, pour les notions de la fiche (ADR 0041)
		loadActiveNodes(locals.supabase)
	]);

	return {
		worksheet: data.worksheet,
		// Les séances qui citent cette fiche PAR NUMÉRO d'exercice.
		//
		// Chargé ici plutôt qu'ajouté à `/api/worksheets/[id]` : cet avertissement
		// ne concerne que la page d'édition, et la réponse de l'API est partagée
		// avec d'autres consommateurs — dont un schéma Zod qui laisserait tomber le
		// champ en silence.
		citations,
		versionChoices,
		// Le menu « Style » : ceux de Chiphre, puis ceux du prof (lot 3b)
		styles,
		nodes,
		user
	};
};
