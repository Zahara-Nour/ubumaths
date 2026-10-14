/**
 * API Route: /api/teacher/chapter-templates/[id]/sections/[sectionId]
 * PATCH  - Renomme une section du modèle (chaque chapitre lié suit)
 * DELETE - Supprime une section du modèle
 *
 * ⚠️ Supprimer une section du modèle ne supprime AUCUNE ressource : ses éléments
 * retombent en « Non classé », et chaque chapitre lié GARDE sa section, devenue
 * la sienne (`source_id` mis à vide par la base).
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { requireOwnedTemplate } from '$lib/server/template-guard';
import { renameSection, deleteSection } from '$lib/server/chapter-sections';
import { updateSectionSchema } from '$lib/server/validation/chapter-sections';
import { uuidSchema } from '$lib/server/validation/common';

function parseSectionId(raw: string | undefined): string {
	const validation = uuidSchema.safeParse(raw);
	if (!validation.success) {
		throw error(400, 'Identifiant de section invalide');
	}
	return validation.data;
}

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	const { user } = await requireRole(locals, 'teacher');
	const templateId = await requireOwnedTemplate(params.id, user.id, locals.supabase);
	const sectionId = parseSectionId(params.sectionId);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête invalide');
	}

	const validation = updateSectionSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, `Validation échouée : ${validation.error.issues[0].message}`);
	}

	const { data, error: renameError } = await renameSection(
		{ kind: 'template', id: templateId },
		sectionId,
		validation.data.title,
		locals.supabase
	);

	if (renameError) {
		throw error(500, 'Impossible de renommer la section');
	}
	// Zéro ligne : la section n'est pas dans CE modèle, ou la RLS a refusé.
	if (!data) {
		throw error(404, 'Section introuvable');
	}

	return json({ section: data });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const { user } = await requireRole(locals, 'teacher');
	const templateId = await requireOwnedTemplate(params.id, user.id, locals.supabase);
	const sectionId = parseSectionId(params.sectionId);

	const { data, error: deleteError } = await deleteSection(
		{ kind: 'template', id: templateId },
		sectionId,
		locals.supabase
	);

	if (deleteError) {
		throw error(500, 'Impossible de supprimer la section');
	}
	if (!data) {
		throw error(404, 'Section introuvable');
	}

	return json({ success: true });
};
