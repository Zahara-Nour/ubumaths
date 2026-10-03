/**
 * SRS Review API — Submit Review
 *
 * Refonte 2026-06-10 (Phase 2, lot L5) :
 * - À chaque review d'une carte template-based, insère 1 row dans `skill_attempts`
 *   avec `source='srs'` et le `grade` brut conservé.
 * - Le trigger PG recalcule `student_point_state` pour chaque point tagué.
 * - Si la carte est dans un deck autre que Programme, on l'ajoute aussi au Programme
 *   pour cohérence (idempotent) — sauf question de cours ou brouillon (Q113,
 *   `entersProgrammeDeck`).
 * - Pour les cartes custom (front/back libre), aucun skill_attempts n'est créé.
 *
 * Spec : docs/wip/srs-fsrs-spec-tdd.md §2
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { CardStats } from '$lib/srs/types';
import { FSRS } from '$lib/srs/fsrs';
import { submitReviewSchema } from '$lib/server/validation/srs';
import { requireAuth } from '$lib/server/middleware/auth';
import { requireConsent } from '$lib/server/middleware/consent';
import { ensureProgrammeDeckCard } from '$lib/server/srs/programme-deck';
import { entersProgrammeDeck } from '$lib/server/srs/programme-deck-rule';
import { applyFsrsReview } from '$lib/server/srs/fsrs-actions';
import { recordSrsReviewAttempt } from '$lib/server/srs/srs-attempt';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user, profile } = await requireAuth(locals);
	requireConsent(profile, 'submit_exercise');
	const supabase = locals.supabase;

	try {
		const bodyRaw = await request.json();
		const validation = submitReviewSchema.safeParse(bodyRaw);
		if (!validation.success) {
			return json({ error: validation.error.issues[0].message }, { status: 400 });
		}

		const body = validation.data;

		// Récupération carte + deck (auth ownership)
		// Refactor 2026-06-10 (code-quality #2.3) : nested select sur
		// question_templates(question_template_points(...)) pour récupérer en 1 RTT
		// les skills tagués famille knowledge — économise 1 SELECT vs isTemplateTaggedFamilyA.
		const { data: card, error: cardError } = await supabase
			.from('srs_cards')
			.select('*, question_templates(options, status, question_template_points(point_id))')
			.eq('id', body.cardId)
			.single();

		if (cardError || !card) {
			return json({ error: 'Card not found' }, { status: 404 });
		}

		if (card.deck_id !== body.deckId) {
			return json({ error: 'Card does not belong to specified deck' }, { status: 400 });
		}

		const { data: deck, error: deckError } = await supabase
			.from('srs_decks')
			.select('*')
			.eq('id', body.deckId)
			.eq('owner_id', user.id)
			.single();

		if (deckError || !deck) {
			return json({ error: 'Deck not found or access denied' }, { status: 404 });
		}

		// Référence carte : template ou custom
		const cardReferenceType = card.card_type as 'template' | 'custom';
		const cardReferenceId = card.card_type === 'template' ? card.template_id : card.id;

		if (!cardReferenceId) {
			return json({ error: 'Invalid card reference' }, { status: 400 });
		}

		// FSRS toujours instancié avec la config par défaut (PO 2026-06-10 :
		// la config FSRS n'est plus customisable, même via deck.config).
		const fsrs = new FSRS();

		// Pipeline load → review → upsert via helper partagé (cf. fsrs-actions.ts).
		let updatedStats: CardStats;
		try {
			updatedStats = await applyFsrsReview(
				supabase,
				fsrs,
				user.id,
				cardReferenceType,
				cardReferenceId,
				body.grade,
				body.timeSpent
			);
		} catch (upsertError) {
			console.error('[srs/review/submit] UPSERT stats failed:', upsertError);
			return json({ error: 'Failed to update card statistics' }, { status: 500 });
		}

		// ----- NOUVEAU : INSERT skill_attempts pour cartes template-based -----
		// Source='srs', grade conservé, success dérivé (grade >= 2 = Hard ou mieux).
		// Trace partagée avec le paquet du chapitre (`recordSrsReviewAttempt`).
		if (cardReferenceType === 'template' && card.template_id) {
			const recorded = await recordSrsReviewAttempt(
				supabase,
				user.id,
				card.template_id,
				body.grade
			);

			// Non bloquant : la review FSRS reste enregistrée.
			if (recorded) {
				// Auto-ajout au deck Programme si le template est tagué sur un point.
				// Le tagging, les options et le statut viennent de la nested query du
				// card SELECT (cf. refactor #2.3), aucune query supplémentaire.
				// Règle partagée (Q113) : jamais une question de cours, ni un brouillon.
				type LinkRow = { point_id: string };
				type TemplateNested = {
					options?: unknown;
					status?: string | null;
					question_template_points?: LinkRow[];
				};
				const template = card.question_templates as unknown as TemplateNested | null;
				const taggedPointIds = (template?.question_template_points ?? []).map((l) => l.point_id);

				if (taggedPointIds.length > 0 && entersProgrammeDeck(template)) {
					try {
						await ensureProgrammeDeckCard(supabase, user.id, card.template_id);
					} catch (progErr) {
						console.error('[srs/review/submit] Programme add failed:', progErr);
					}
				}
			}
		}

		// ----- Session analytics (inchangé) -----
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const todayStr = today.toISOString();

		const { data: existingSession, error: existingSessionError } = await supabase
			.from('srs_review_sessions')
			.select('*')
			.eq('user_id', user.id)
			.eq('deck_id', body.deckId)
			.gte('created_at', todayStr)
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle();

		// PGRST116 = la ligne n'existe pas, ce que la suite traite déjà. Une AUTRE
		// panne prenait le même visage et faisait conclure « rien ici », donc créer
		// par-dessus ce qu'on n'avait simplement pas su lire.
		if (existingSessionError && existingSessionError.code !== 'PGRST116') {
			console.error('Lecture impossible :', existingSessionError);
			throw error(500, 'Impossible de vérifier l’état actuel');
		}

		const isCorrect = body.grade >= 3;
		const timeSpent = body.timeSpent || 0;

		if (existingSession) {
			await supabase
				.from('srs_review_sessions')
				.update({
					cards_reviewed: existingSession.cards_reviewed + 1,
					correct_count: existingSession.correct_count + (isCorrect ? 1 : 0),
					total_time: existingSession.total_time + timeSpent
				})
				.eq('id', existingSession.id);
		} else {
			await supabase.from('srs_review_sessions').insert({
				user_id: user.id,
				deck_id: body.deckId,
				cards_reviewed: 1,
				correct_count: isCorrect ? 1 : 0,
				total_time: timeSpent
			});
		}

		return json({
			success: true,
			stats: {
				difficulty: updatedStats.difficulty,
				stability: updatedStats.stability,
				state: updatedStats.state,
				nextReview: updatedStats.nextReview,
				totalReviews: updatedStats.totalReviews
			}
		});
	} catch (error) {
		console.error('Unexpected error in POST /api/srs/review/submit:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
