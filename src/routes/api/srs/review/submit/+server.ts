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
 * Spec : docs/archive/wip/srs-fsrs-spec-tdd.md §2
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
import { rewardFinishedReviewSession } from '$lib/server/srs/review-session-reward';
import { recordReviewSessionCard } from '$lib/server/srs/review-session-stats';
import type { BuddyXpFromExerciseResult } from '$lib/server/buddy-xp-service';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/srs/review/submit/+server');

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
			return json({ error: 'Carte de révision introuvable' }, { status: 404 });
		}

		if (card.deck_id !== body.deckId) {
			return json({ error: 'Cette carte n’appartient pas au deck indiqué' }, { status: 400 });
		}

		const { data: deck, error: deckError } = await supabase
			.from('srs_decks')
			.select('*')
			.eq('id', body.deckId)
			.eq('owner_id', user.id)
			.single();

		if (deckError || !deck) {
			return json({ error: 'Deck introuvable ou accès refusé' }, { status: 404 });
		}

		// Référence carte : template ou custom
		const cardReferenceType = card.card_type as 'template' | 'custom';
		const cardReferenceId = card.card_type === 'template' ? card.template_id : card.id;

		if (!cardReferenceId) {
			return json({ error: 'Référence de carte invalide' }, { status: 400 });
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
			logger.error('[srs/review/submit] UPSERT stats failed:', upsertError);
			return json({ error: 'Impossible d’enregistrer la révision' }, { status: 500 });
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
						logger.error('[srs/review/submit] Programme add failed:', progErr);
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
			.gte('started_at', todayStr)
			.order('started_at', { ascending: false })
			.limit(1)
			.maybeSingle();

		// PGRST116 = la ligne n'existe pas, ce que la suite traite déjà. Une AUTRE
		// panne prenait le même visage et faisait conclure « rien ici », donc créer
		// par-dessus ce qu'on n'avait simplement pas su lire.
		if (existingSessionError && existingSessionError.code !== 'PGRST116') {
			logger.error('Lecture impossible :', existingSessionError);
			throw error(500, 'Impossible de vérifier l’état actuel');
		}

		const isCorrect = body.grade >= 3;
		const timeSpent = body.timeSpent || 0;

		// Statistiques de séance : secondaires, une panne ne doit pas faire échouer une
		// révision déjà enregistrée (journalisée). Écriture au client service.
		await recordReviewSessionCard(user.id, body.deckId, existingSession, {
			isCorrect,
			timeSpent
		});

		// ----- Forfait du Palotin et gidouilles de la séance du jour -----
		// Séance terminée (décisions de David, 2026-10-18 et 2026-10-24), au plus une
		// fois par jour. `buddy_xp` a la même forme que dans `/api/tests/save`.
		// Élèves seulement : le crédit de gidouilles au client service ne vérifie pas
		// le rôle. Non bloquant : la révision est déjà enregistrée.
		let buddyXp: BuddyXpFromExerciseResult | null = null;
		let reviewGidouilles = 0;
		if (profile.role === 'student') {
			try {
				const reward = await rewardFinishedReviewSession(supabase, user.id, body.deckId, todayStr);
				buddyXp = reward?.buddyXp ?? null;
				reviewGidouilles = reward?.gidouilles ?? 0;
			} catch (rewardError) {
				logger.error('Séance de révision non récompensée :', rewardError);
			}
		}

		return json({
			success: true,
			buddy_xp: buddyXp,
			review_gidouilles: reviewGidouilles,
			stats: {
				difficulty: updatedStats.difficulty,
				stability: updatedStats.stability,
				state: updatedStats.state,
				nextReview: updatedStats.nextReview,
				totalReviews: updatedStats.totalReviews
			}
		});
	} catch (error) {
		logger.error('Unexpected error in POST /api/srs/review/submit:', error);
		return json({ error: 'Une erreur inattendue s’est produite' }, { status: 500 });
	}
};
