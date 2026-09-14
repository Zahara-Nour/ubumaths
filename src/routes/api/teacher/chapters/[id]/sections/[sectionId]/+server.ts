/**
 * API Route: /api/teacher/chapters/[id]/sections/[sectionId]
 * PATCH  - Renomme une section
 * DELETE - Supprime une section
 *
 * ⚠️ Supprimer une section ne supprime AUCUNE ressource : la clé étrangère est
 * `on delete set null (section_id)`, elles retombent en « Non classé ».
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { renameSection, deleteSection } from '$lib/server/chapter-sections';
import { updateSectionSchema } from '$lib/server/validation/chapter-sections';
import { uuidSchema } from '$lib/server/validation/common';

type ZodIssue = { path: (string | number)[]; message: string };

function parseIds(params: Partial<Record<string, string>>) {
	const chapterValidation = uuidSchema.safeParse(params.id);
	if (!chapterValidation.success) {
		throw error(400, 'Identifiant de chapitre invalide');
	}

	const sectionValidation = uuidSchema.safeParse(params.sectionId);
	if (!sectionValidation.success) {
		throw error(400, 'Identifiant de section invalide');
	}

	return { chapterId: chapterValidation.data, sectionId: sectionValidation.data };
}

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	await requireRole(locals, 'teacher');
	const { chapterId, sectionId } = parseIds(params);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête invalide');
	}

	const validation = updateSectionSchema.safeParse(body);
	if (!validation.success) {
		const message = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation échouée : ${message}`);
	}

	const { data, error: renameError } = await renameSection(
		chapterId,
		sectionId,
		validation.data.title,
		locals.supabase
	);

	if (renameError) {
		throw error(500, 'Impossible de renommer la section');
	}
	// Zéro ligne = la section n'existe pas dans CE chapitre, ou la RLS a refusé.
	// Les deux se répondent en 404 : distinguer renseignerait un curieux.
	if (!data) {
		throw error(404, 'Section introuvable');
	}

	return json({ section: data });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	await requireRole(locals, 'teacher');
	const { chapterId, sectionId } = parseIds(params);

	const { data, error: deleteError } = await deleteSection(chapterId, sectionId, locals.supabase);

	if (deleteError) {
		throw error(500, 'Impossible de supprimer la section');
	}
	if (!data) {
		throw error(404, 'Section introuvable');
	}

	return json({ success: true });
};
