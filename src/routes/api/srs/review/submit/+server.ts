/**
 * SRS Review API — Submit Review
 *
 * Refonte 2026-06-10 (Phase 2, lot L5) :
 * - À chaque review d'une carte template-based, insère 1 row dans `skill_attempts`
 *   avec `source='srs'` et le `grade` brut conservé.
 * - Le trigger PG recalcule `student_skill_state_a` pour chaque skill tagué.
 * - Si la carte est dans un deck autre que Programme, on l'ajoute aussi au Programme
 *   pour cohérence (idempotent).
 * - Pour les cartes custom (front/back libre), aucun skill_attempts n'est créé.
 *
 * Spec : docs/wip/srs-fsrs-spec-tdd.md §2
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { CardStats } from '$lib/srs/types';
import { FSRS } from '$lib/srs/fsrs';
import { DEFAULT_FSRS_PARAMS } from '$lib/srs/config';
import { submitReviewSchema } from '$lib/server/validation/srs';
import { requireAuth } from '$lib/server/middleware/auth';
import { requireConsent } from '$lib/server/middleware/consent';
import { ensureProgrammeDeckCard, isTemplateTaggedFamilyA } from '$lib/server/srs/programme-deck';

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
		const { data: card, error: cardError } = await supabase
			.from('srs_cards')
			.select('*')
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

		// Lecture / initialisation stats
		const { data: existingStats } = await supabase
			.from('srs_card_stats')
			.select('*')
			.eq('user_id', user.id)
			.eq('card_reference_type', cardReferenceType)
			.eq('card_reference_id', cardReferenceId)
			.maybeSingle();

		// FSRS construit avant l'init (utilisé pour initCard ET reviewCard).
		const fsrs = new FSRS(
			deck.config?.parameters || DEFAULT_FSRS_PARAMS,
			deck.config?.desiredRetention || 0.9,
			deck.config?.maximumInterval || 36500
		);

		let stats: CardStats;
		if (existingStats) {
			stats = {
				id: existingStats.id,
				userId: existingStats.user_id,
				cardReferenceType: existingStats.card_reference_type,
				cardReferenceId: existingStats.card_reference_id,
				difficulty: existingStats.difficulty,
				stability: existingStats.stability,
				state: existingStats.state,
				lastReview: existingStats.last_review,
				nextReview: existingStats.next_review,
				totalReviews: existingStats.total_reviews,
				reviewHistory: existingStats.review_history || [],
				createdAt: existingStats.created_at,
				updatedAt: existingStats.updated_at
			};
		} else {
			// Init via FSRS.initCard pour garantir stability=0 (mode "first review"
			// dans reviewCard). Diverger ici (stability=0.1) ferait basculer la 1ère
			// review dans la branche calculateNewStability au lieu de calculateInitialStability.
			const init = fsrs.initCard(user.id, cardReferenceType, cardReferenceId);
			const now = new Date().toISOString();
			stats = {
				id: crypto.randomUUID(),
				...init,
				createdAt: now,
				updatedAt: now
			};
		}

		const updatedStats = fsrs.reviewCard(stats, body.grade, body.timeSpent);

		// UPSERT srs_card_stats
		const { error: upsertError } = await supabase.from('srs_card_stats').upsert(
			{
				id: stats.id,
				user_id: updatedStats.userId,
				card_reference_type: updatedStats.cardReferenceType,
				card_reference_id: updatedStats.cardReferenceId,
				difficulty: updatedStats.difficulty,
				stability: updatedStats.stability,
				state: updatedStats.state,
				last_review: updatedStats.lastReview,
				next_review: updatedStats.nextReview,
				total_reviews: updatedStats.totalReviews,
				review_history: updatedStats.reviewHistory
			},
			{ onConflict: 'user_id,card_reference_type,card_reference_id' }
		);

		if (upsertError) {
			console.error('[srs/review/submit] UPSERT stats failed:', upsertError);
			return json({ error: 'Failed to update card statistics' }, { status: 500 });
		}

		// ----- NOUVEAU : INSERT skill_attempts pour cartes template-based -----
		// Source='srs', grade conservé, success dérivé (grade >= 2 = Hard ou mieux).
		if (cardReferenceType === 'template' && card.template_id) {
			const success = body.grade >= 2;
			const { error: skillAttemptErr } = await supabase.from('skill_attempts').insert({
				student_id: user.id,
				template_id: card.template_id,
				success,
				grade: body.grade,
				source: 'srs',
				with_help: false
			});

			if (skillAttemptErr) {
				console.error('[srs/review/submit] skill_attempts INSERT failed:', skillAttemptErr);
				// Non bloquant : la review FSRS reste enregistrée.
			} else {
				// Auto-ajout au deck Programme si template tagué et pas déjà dedans
				// (cas où la carte est dans un deck personnel sans passer par le quiz Monde 1).
				try {
					const tagged = await isTemplateTaggedFamilyA(supabase, card.template_id);
					if (tagged) {
						await ensureProgrammeDeckCard(supabase, user.id, card.template_id);
					}
				} catch (progErr) {
					console.error('[srs/review/submit] Programme add failed:', progErr);
				}
			}
		}

		// ----- Session analytics (inchangé) -----
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const todayStr = today.toISOString();

		const { data: existingSession } = await supabase
			.from('srs_review_sessions')
			.select('*')
			.eq('user_id', user.id)
			.eq('deck_id', body.deckId)
			.gte('created_at', todayStr)
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle();

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
