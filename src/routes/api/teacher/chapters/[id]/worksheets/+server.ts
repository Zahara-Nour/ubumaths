/**
 * API Route: /api/teacher/chapters/[id]/worksheets
 * GET - Liste les fiches rattachées à un chapitre
 * POST - Rattache une fiche à un chapitre
 *
 * Rattacher ne DISTRIBUE pas. La policy de l'élève sur `chapter_worksheets`
 * exige `student_has_worksheet_access` : une fiche rangée ici mais pas encore
 * affectée reste invisible pour lui, lien compris. C'est ce qui permet de
 * préparer un chapitre avant le cours et de distribuer au fur et à mesure.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { linkWorksheet } from '$lib/server/chapters';
import { linkWorksheetSchema } from '$lib/server/validation/chapters';
import { uuidSchema } from '$lib/server/validation/common';

type ZodIssue = { path: (string | number)[]; message: string };

async function verifyChapterExists(chapterId: string, supabase: App.Locals['supabase']) {
	const { data: chapter, error: chapterError } = await supabase
		.from('class_chapters')
		.select('id')
		.eq('id', chapterId)
		.single();

	if (chapterError || !chapter) {
		throw error(404, 'Chapter not found');
	}

	return chapter;
}

export const GET: RequestHandler = async ({ locals, params }) => {
	await requireRole(locals, 'teacher');

	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Invalid chapter ID');
	}

	const chapterId = idValidation.data;

	await verifyChapterExists(chapterId, locals.supabase);

	const { data: worksheetLinks, error: linksError } = await locals.supabase
		.from('chapter_worksheets')
		.select(
			`
			*,
			worksheet:worksheets(id, title, type, status)
		`
		)
		.eq('chapter_id', chapterId)
		.order('display_order', { ascending: true });

	if (linksError) {
		console.error('[GET /api/teacher/chapters/[id]/worksheets] Error:', linksError);
		throw error(500, 'Failed to fetch worksheets');
	}

	return json({
		worksheets: worksheetLinks || [],
		count: worksheetLinks?.length || 0
	});
};

export const POST: RequestHandler = async ({ locals, params, request }) => {
	await requireRole(locals, 'teacher');

	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Invalid chapter ID');
	}

	const chapterId = idValidation.data;

	await verifyChapterExists(chapterId, locals.supabase);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const validation = linkWorksheetSchema.safeParse({ ...(body as object), chapterId });

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation failed: ${errorMsg}`);
	}

	const { data: worksheet, error: worksheetError } = await locals.supabase
		.from('worksheets')
		.select('id')
		.eq('id', validation.data.worksheetId)
		.single();

	if (worksheetError || !worksheet) {
		throw error(404, 'Worksheet not found');
	}

	const { data: existingLink, error: existingLinkError } = await locals.supabase
		.from('chapter_worksheets')
		.select('id')
		.eq('chapter_id', chapterId)
		.eq('worksheet_id', validation.data.worksheetId)
		.maybeSingle();

	// PGRST116 = la ligne n'existe pas, ce que la suite traite déjà. Une AUTRE
	// panne prenait le même visage et faisait conclure « rien ici », donc créer
	// par-dessus ce qu'on n'avait simplement pas su lire.
	if (existingLinkError && existingLinkError.code !== 'PGRST116') {
		console.error('Lecture impossible :', existingLinkError);
		throw error(500, 'Impossible de vérifier l’état actuel');
	}

	if (existingLink) {
		throw error(400, 'Worksheet already linked to this chapter');
	}

	const result = await linkWorksheet(
		chapterId,
		validation.data.worksheetId,
		locals.supabase,
		validation.data.displayOrder
	);

	if (result.error) {
		console.error('[POST /api/teacher/chapters/[id]/worksheets] Error:', result.error);
		throw error(500, 'Failed to link worksheet');
	}

	return json({ worksheet: result.data }, { status: 201 });
};
