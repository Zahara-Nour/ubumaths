/**
 * Paquet de révision d'un chapitre — réponse à une question
 * =========================================================
 *
 * POST /api/srs/chapters/[chapterId]/submit  { templateId, grade, timeSpent? }
 *
 * - Le paquet est RECALCULÉ au moment de l'envoi : un modèle hors du paquet
 *   (autre catégorie, brouillon, série retirée) est refusé (403) et aucune
 *   mémoire ne bouge. Chapitre masqué / d'une autre classe → 404.
 * - La mémoire est UNIQUE (Q165) : `srs_card_stats` (élève, `template`, modèle),
 *   par le même pipeline FSRS que le Programme (`applyFsrsReview`). Une question
 *   aussi présente dans le Programme y voit donc son échéance avancer.
 * - Auto-évaluation (boutons FSRS) : un seul résultat par jour et par question,
 *   le meilleur (ADR 0016, `bestOfDay`).
 * - Ce circuit n'ajoute RIEN au paquet Programme (Q113 : une question de cours
 *   n'y entre jamais ; les autres y entrent par leurs propres chemins).
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FSRS } from '$lib/srs/fsrs';
import { requireRole } from '$lib/server/middleware/auth';
import { requireConsent } from '$lib/server/middleware/consent';
import { chapterDeckParamsSchema, chapterReviewSubmitSchema } from '$lib/server/validation/srs';
import { loadChapterDeck, type ChapterDeck } from '$lib/server/srs/chapter-deck';
import { applyFsrsReview } from '$lib/server/srs/fsrs-actions';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { user, profile } = await requireRole(locals, 'student');
	requireConsent(profile, 'submit_exercise');

	const paramsValidation = chapterDeckParamsSchema.safeParse(params);
	if (!paramsValidation.success) {
		return json({ error: paramsValidation.error.issues[0].message }, { status: 400 });
	}

	let bodyRaw: unknown;
	try {
		bodyRaw = await request.json();
	} catch {
		return json({ error: 'Corps de requête illisible' }, { status: 400 });
	}
	const bodyValidation = chapterReviewSubmitSchema.safeParse(bodyRaw);
	if (!bodyValidation.success) {
		return json({ error: bodyValidation.error.issues[0].message }, { status: 400 });
	}

	const { chapterId } = paramsValidation.data;
	const { templateId, grade, timeSpent } = bodyValidation.data;
	const supabase = locals.supabase;
	const now = new Date();

	// Recontrôle : le modèle appartient-il au paquet calculé MAINTENANT ?
	let deck: ChapterDeck | null;
	try {
		deck = await loadChapterDeck(supabase, chapterId, now);
	} catch (err) {
		console.error('[srs/chapters/submit] Paquet illisible :', err);
		throw error(500, 'Impossible de calculer le paquet du chapitre');
	}
	if (!deck) throw error(404, 'Chapitre introuvable');
	if (!deck.templateIds.includes(templateId)) {
		throw error(403, 'Cette question ne fait pas partie du paquet de ce chapitre');
	}

	let updated;
	try {
		updated = await applyFsrsReview(
			supabase,
			new FSRS(),
			user.id,
			'template',
			templateId,
			grade,
			timeSpent,
			{ bestOfDay: { now }, verifyWrite: true }
		);
	} catch (err) {
		console.error('[srs/chapters/submit] Mémoire non mise à jour :', err);
		throw error(500, 'Impossible d’enregistrer la révision');
	}

	return json({
		success: true,
		// `false` : la journée avait déjà un résultat au moins aussi bon (ADR 0016)
		recorded: updated !== null,
		stats: updated
			? {
					state: updated.state,
					nextReview: updated.nextReview,
					totalReviews: updated.totalReviews
				}
			: null
	});
};
