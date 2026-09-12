/**
 * API Route: /api/teacher/chapters/[id]/worksheets/[linkId]
 * DELETE - Détache une fiche d'un chapitre
 *
 * Détacher ne retire ni la fiche ni son affectation : l'élève à qui elle a été
 * distribuée la garde dans « Mon travail ». Seul le rangement disparaît.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { unlinkWorksheet } from '$lib/server/chapters';
import { uuidSchema } from '$lib/server/validation/common';

async function verifyWorksheetLinkOwnership(
	chapterId: string,
	linkId: string,
	supabase: App.Locals['supabase']
) {
	const { data: chapter, error: chapterError } = await supabase
		.from('class_chapters')
		.select('id')
		.eq('id', chapterId)
		.single();

	if (chapterError || !chapter) {
		throw error(404, 'Chapter not found');
	}

	const { data: link, error: linkError } = await supabase
		.from('chapter_worksheets')
		.select('id, chapter_id')
		.eq('id', linkId)
		.single();

	if (linkError || !link) {
		throw error(404, 'Worksheet link not found');
	}

	// Sans ce contrôle, un identifiant de lien valide permettrait de détacher une
	// fiche d'un AUTRE chapitre en passant par celui-ci.
	if (link.chapter_id !== chapterId) {
		throw error(400, 'Worksheet link does not belong to this chapter');
	}

	return { chapter, link };
}

export const DELETE: RequestHandler = async ({ locals, params }) => {
	await requireRole(locals, 'teacher');

	const chapterIdValidation = uuidSchema.safeParse(params.id);
	const linkIdValidation = uuidSchema.safeParse(params.linkId);

	if (!chapterIdValidation.success) {
		throw error(400, 'Invalid chapter ID');
	}
	if (!linkIdValidation.success) {
		throw error(400, 'Invalid worksheet link ID');
	}

	const chapterId = chapterIdValidation.data;
	const linkId = linkIdValidation.data;

	await verifyWorksheetLinkOwnership(chapterId, linkId, locals.supabase);

	const result = await unlinkWorksheet(linkId, locals.supabase);

	if (result.error) {
		console.error('[DELETE /api/teacher/chapters/[id]/worksheets/[linkId]] Error:', result.error);
		throw error(500, 'Failed to unlink worksheet');
	}

	return json({ success: true });
};
