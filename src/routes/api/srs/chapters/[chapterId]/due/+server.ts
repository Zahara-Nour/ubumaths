/**
 * Paquet de révision d'un chapitre — séance du jour
 * =================================================
 *
 * GET /api/srs/chapters/[chapterId]/due
 *
 * Le paquet est CALCULÉ (Q112) : questions publiées des catégories des séries
 * publiées du chapitre visible de l'élève. La séance = dues + au plus 10
 * nouvelles (Q166) ; chaque question est instanciée avec une nouvelle graine.
 *
 * Accès : l'élève de la session, avec SON client (RLS). Chapitre masqué, d'une
 * autre classe ou inexistant → 404, sans rien révéler.
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ChapterDueCard, ChapterDueResponse } from '$lib/srs/types';
import { requireRole } from '$lib/server/middleware/auth';
import { chapterDeckParamsSchema } from '$lib/server/validation/srs';
import {
	loadChapterDeck,
	loadDeckStats,
	selectChapterSession,
	type ChapterDeck,
	type DeckCardStatsRow
} from '$lib/server/srs/chapter-deck';
import { generateSRSInstance } from '$lib/srs/generator';
import { toQuestionTemplate } from '$lib/types/question-template';

export const GET: RequestHandler = async ({ locals, params }) => {
	const { user } = await requireRole(locals, 'student');

	const validation = chapterDeckParamsSchema.safeParse(params);
	if (!validation.success) {
		return json({ error: validation.error.issues[0].message }, { status: 400 });
	}
	const { chapterId } = validation.data;
	const supabase = locals.supabase;
	const now = new Date();

	let deck: ChapterDeck | null;
	let stats: DeckCardStatsRow[] = [];
	try {
		deck = await loadChapterDeck(supabase, chapterId, now);
		if (deck) stats = await loadDeckStats(supabase, user.id, deck.templateIds);
	} catch (err) {
		console.error('[srs/chapters/due] Paquet illisible :', err);
		throw error(500, 'Impossible de calculer le paquet du chapitre');
	}
	if (!deck) throw error(404, 'Chapitre introuvable');

	const session = selectChapterSession(deck.templateIds, stats, now);
	const ids = [...session.due, ...session.fresh];
	const fresh = new Set(session.fresh);

	if (ids.length === 0) {
		return json({
			chapter: { id: deck.chapterId, title: deck.title },
			cards: [],
			skipped: 0
		} satisfies ChapterDueResponse);
	}

	const { data: rows, error: templatesError } = await supabase
		.from('question_templates')
		.select('*')
		.in('id', ids)
		.eq('status', 'published');
	if (templatesError) {
		console.error('[srs/chapters/due] Modèles illisibles :', templatesError);
		throw error(500, 'Impossible de charger les questions');
	}

	const byId = new Map((rows ?? []).map((row) => [row.id, row]));
	const cards: ChapterDueCard[] = [];
	const skipped: { templateId: string; reason: string }[] = [];

	for (const templateId of ids) {
		const row = byId.get(templateId);
		if (!row) {
			skipped.push({ templateId, reason: 'modèle illisible' });
			continue;
		}
		try {
			// Nouvelle graine à chaque séance (`generateSRSInstance`)
			const result = generateSRSInstance(toQuestionTemplate(row));
			if (result.success) {
				cards.push({ templateId, instance: result.instance, isNew: fresh.has(templateId) });
			} else {
				skipped.push({ templateId, reason: result.errors.join('; ') });
			}
		} catch (generationError) {
			skipped.push({
				templateId,
				reason: generationError instanceof Error ? generationError.message : String(generationError)
			});
		}
	}

	// Questions écartées : tracées, et leur NOMBRE rendu à l'élève (pas de silence)
	if (skipped.length > 0) {
		console.error(`[srs/chapters/due] ${skipped.length} question(s) écartée(s) :`, skipped);
	}

	return json({
		chapter: { id: deck.chapterId, title: deck.title },
		cards,
		skipped: skipped.length
	} satisfies ChapterDueResponse);
};
