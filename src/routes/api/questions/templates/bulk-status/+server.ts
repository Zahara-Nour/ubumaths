/**
 * POST /api/questions/templates/bulk-status — publication par lot
 * ================================================================
 *
 * Body : `{ ids: uuid[] (1..700), status: 'published' | 'draft' }`
 *
 * - `published` : chaque modèle repasse le contrôle complet (`checkTemplate`) ;
 *   un échec ou une collision de catégorie le laisse en brouillon, avec la raison.
 * - `draft` : retour en brouillon, sans contrôle.
 *
 * Réponse 200 : `{ published | unpublished: {id,title}[], refused: {id,title,reasons}[] }`.
 * Un refus partiel n'est pas une erreur HTTP : c'est un compte rendu, modèle par modèle.
 * 400 = corps invalide ; 401/403 = pas admin ; 500 = base illisible.
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { bulkTemplateStatusSchema } from '$lib/server/validation/questions';
import { publishTemplates, unpublishTemplates } from '$lib/server/questions-bulk-status';

export const POST: RequestHandler = async ({ request, locals }) => {
	await requireRole(locals, 'admin');

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps JSON invalide');
	}

	const validation = bulkTemplateStatusSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { ids, status } = validation.data;
	const result =
		status === 'published'
			? await publishTemplates(locals.supabase, ids)
			: await unpublishTemplates(locals.supabase, ids);

	return json(result);
};
