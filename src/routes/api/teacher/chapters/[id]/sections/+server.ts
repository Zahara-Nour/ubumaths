/**
 * API Route: /api/teacher/chapters/[id]/sections
 * GET  - Liste les sections d'un chapitre, dans l'ordre
 * POST - Crée une section (placée en dernier par défaut)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { listSections, createSection } from '$lib/server/chapter-sections';
import { createSectionSchema } from '$lib/server/validation/chapter-sections';
import { uuidSchema } from '$lib/server/validation/common';

type ZodIssue = { path: (string | number)[]; message: string };

async function verifyChapterExists(chapterId: string, supabase: App.Locals['supabase']) {
	const { data: chapter, error: chapterError } = await supabase
		.from('class_chapters')
		.select('id')
		.eq('id', chapterId)
		.single();

	if (chapterError || !chapter) {
		throw error(404, 'Chapitre introuvable');
	}

	return chapter;
}

export const GET: RequestHandler = async ({ locals, params }) => {
	await requireRole(locals, 'teacher');

	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Identifiant de chapitre invalide');
	}
	const chapterId = idValidation.data;

	await verifyChapterExists(chapterId, locals.supabase);

	const { data, error: listError } = await listSections(chapterId, locals.supabase);
	if (listError) {
		throw error(500, 'Impossible de lire les sections');
	}

	return json({ sections: data });
};

export const POST: RequestHandler = async ({ locals, params, request }) => {
	await requireRole(locals, 'teacher');

	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Identifiant de chapitre invalide');
	}
	const chapterId = idValidation.data;

	await verifyChapterExists(chapterId, locals.supabase);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête invalide');
	}

	// Le chapitre de l'URL fait foi : celui du corps est ignoré s'il diffère,
	// sinon une section pourrait être créée ailleurs que là où on l'a demandée.
	const validation = createSectionSchema.safeParse({ ...(body as object), chapterId });
	if (!validation.success) {
		const message = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation échouée : ${message}`);
	}

	const { data, error: createError } = await createSection(
		chapterId,
		validation.data.title,
		validation.data.displayOrder,
		locals.supabase
	);

	if (createError || !data) {
		throw error(500, 'Impossible de créer la section');
	}

	return json({ section: data }, { status: 201 });
};
