/**
 * API Route: /api/teacher/chapter-templates/[id]/sections
 * GET  - Liste les sections d'un modèle, dans l'ordre
 * POST - Crée une section du modèle (placée en dernier par défaut)
 *
 * Miroir de `/api/teacher/chapters/[id]/sections` (ADR 0029). Une section créée
 * dans le modèle apparaît dans chaque chapitre lié (la base la diffuse).
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { requireOwnedTemplate } from '$lib/server/template-guard';
import { listSections, createSection } from '$lib/server/chapter-sections';
import { createSectionSchema } from '$lib/server/validation/chapter-sections';

// Constantes
/** Le propriétaire vient de l'URL, jamais du corps. */
const createTemplateSectionSchema = createSectionSchema.omit({ chapterId: true });

export const GET: RequestHandler = async ({ locals, params }) => {
	const { user } = await requireRole(locals, 'teacher');
	const templateId = await requireOwnedTemplate(params.id, user.id, locals.supabase);

	const { data, error: listError } = await listSections(
		{ kind: 'template', id: templateId },
		locals.supabase
	);
	if (listError) {
		throw error(500, 'Impossible de lire les sections');
	}

	return json({ sections: data });
};

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { user } = await requireRole(locals, 'teacher');
	const templateId = await requireOwnedTemplate(params.id, user.id, locals.supabase);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête invalide');
	}

	const validation = createTemplateSectionSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, `Validation échouée : ${validation.error.issues[0].message}`);
	}

	const { data, error: createError } = await createSection(
		{ kind: 'template', id: templateId },
		validation.data.title,
		validation.data.displayOrder,
		locals.supabase
	);

	if (createError || !data) {
		throw error(500, 'Impossible de créer la section');
	}

	return json({ section: data }, { status: 201 });
};
