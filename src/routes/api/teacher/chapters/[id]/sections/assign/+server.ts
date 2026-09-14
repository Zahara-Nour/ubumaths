/**
 * API Route: /api/teacher/chapters/[id]/sections/assign
 * POST - Range des ressources dans une section et fixe leur ordre
 *
 * `sectionId: null` les renvoie en « Non classé » — c'est aussi ce que fait la
 * base quand une section est supprimée.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { assignToSection } from '$lib/server/chapter-sections';
import { assignToSectionSchema } from '$lib/server/validation/chapter-sections';
import { uuidSchema } from '$lib/server/validation/common';

type ZodIssue = { path: (string | number)[]; message: string };

export const POST: RequestHandler = async ({ locals, params, request }) => {
	await requireRole(locals, 'teacher');

	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Identifiant de chapitre invalide');
	}
	const chapterId = idValidation.data;

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête invalide');
	}

	const validation = assignToSectionSchema.safeParse(body);
	if (!validation.success) {
		const message = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation échouée : ${message}`);
	}

	const { error: assignError } = await assignToSection(
		chapterId,
		validation.data.sectionId,
		validation.data.items,
		locals.supabase
	);

	// La clé composite refuse une section d'un AUTRE chapitre (23503). C'est une
	// demande incohérente du client, pas une panne du serveur.
	if (assignError) {
		if (assignError.message.includes('23503') || /foreign key/i.test(assignError.message)) {
			throw error(400, 'Cette section n’appartient pas à ce chapitre');
		}
		throw error(500, 'Impossible de ranger les ressources');
	}

	return json({ success: true });
};
