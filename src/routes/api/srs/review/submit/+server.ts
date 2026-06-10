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
import { submitReviewSchema } from '$lib/server/validation/srs';
import { requireAuth } from '$lib/server/middleware/auth';
import { requireConsent } from '$lib/server/middleware/consent';
import { ensureProgrammeDeckCard } from '$lib/server/srs/programme-deck';
import { applyFsrsReview } from '$lib/server/srs/fsrs-actions';

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
		// question_templates(question_template_skills(...)) pour récupérer en 1 RTT
		// les skills tagués famille knowledge — économise 1 SELECT vs isTemplateTaggedFamilyA.
		const { data: card, error: cardError } = await supabase
			.from('srs_cards')
			.select('*, question_templates(question_template_skills(skill_id, skills(family)))')
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
				// Auto-ajout au deck Programme si template tagué famille knowledge.
				// Le tagging est déjà disponible via la nested query du card SELECT
				// (cf. refactor #2.3), aucune query supplémentaire nécessaire.
				type LinkRow = { skill_id: string; skills: { family: string } | null };
				type TemplateNested = { question_template_skills?: LinkRow[] };
				const taggedKnowledgeSkillIds = (
					(card.question_templates as unknown as TemplateNested | null)?.question_template_skills ??
					[]
				)
					.filter((l) => l.skills?.family === 'knowledge')
					.map((l) => l.skill_id);

				if (taggedKnowledgeSkillIds.length > 0) {
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
