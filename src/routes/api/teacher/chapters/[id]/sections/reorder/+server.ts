/**
 * API Route: /api/teacher/chapters/[id]/sections/reorder
 * POST - Réordonne les sections d'un chapitre
 */

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '#lib/server/middleware/auth.ts';
import { reorderSections } from '#lib/server/chapter-sections.ts';
import { reorderSectionsSchema } from '#lib/server/validation/chapter-sections.ts';
import { uuidSchema } from '#lib/server/validation/common.ts';

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

	const validation = reorderSectionsSchema.safeParse(body);
	if (!validation.success) {
		const message = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation échouée : ${message}`);
	}

	// `chapter_id` est filtré dans chaque update : une section d'un autre
	// chapitre glissée dans la liste est ignorée, pas déplacée.
	const { error: reorderError } = await reorderSections(
		chapterId,
		validation.data.sections,
		locals.supabase
	);

	if (reorderError) {
		throw error(500, 'Impossible de réordonner les sections');
	}

	return Response.json({ success: true });
};
