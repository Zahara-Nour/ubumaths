/**
 * API Route: /api/teacher/chapter-templates/[id]/sections/reorder
 * POST - Réordonne les sections d'un modèle
 *
 * L'ordre est propre à chaque propriétaire : réordonner le modèle ne touche pas
 * l'ordre des sections dans les chapitres liés (ADR 0029, Q3).
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { requireOwnedTemplate } from '$lib/server/template-guard';
import { reorderSections } from '$lib/server/chapter-sections';
import { reorderSectionsSchema } from '$lib/server/validation/chapter-sections';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { user } = await requireRole(locals, 'teacher');
	const templateId = await requireOwnedTemplate(params.id, user.id, locals.supabase);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête invalide');
	}

	const validation = reorderSectionsSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, `Validation échouée : ${validation.error.issues[0].message}`);
	}

	// `template_id` est filtré dans chaque update : une section d'ailleurs glissée
	// dans la liste est ignorée, pas déplacée.
	const { error: reorderError } = await reorderSections(
		{ kind: 'template', id: templateId },
		validation.data.sections,
		locals.supabase
	);

	if (reorderError) {
		throw error(500, 'Impossible de réordonner les sections');
	}

	return json({ success: true });
};
