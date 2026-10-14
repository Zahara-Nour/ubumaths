/**
 * API Route: /api/teacher/chapter-templates/[id]/sections/assign
 * POST - Range des éléments du modèle dans une section et fixe leur ordre
 *
 * `sectionId: null` les renvoie en « Non classé ». La clé composite
 * `(section_id, template_id)` refuse une section d'un autre modèle.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { requireOwnedTemplate } from '$lib/server/template-guard';
import { assignToSection } from '$lib/server/chapter-sections';
import { assignToSectionSchema } from '$lib/server/validation/chapter-sections';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { user } = await requireRole(locals, 'teacher');
	const templateId = await requireOwnedTemplate(params.id, user.id, locals.supabase);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête invalide');
	}

	const validation = assignToSectionSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, `Validation échouée : ${validation.error.issues[0].message}`);
	}

	const { error: assignError, notFound } = await assignToSection(
		{ kind: 'template', id: templateId },
		validation.data.sectionId,
		validation.data.items,
		locals.supabase
	);

	if (assignError) {
		if (notFound) {
			throw error(404, 'Élément introuvable dans ce modèle');
		}
		if (assignError.message.includes('23503') || /foreign key/i.test(assignError.message)) {
			throw error(400, 'Cette section n’appartient pas à ce modèle');
		}
		throw error(500, 'Impossible de ranger les éléments');
	}

	return json({ success: true });
};
