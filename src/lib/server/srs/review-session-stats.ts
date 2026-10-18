/**
 * Statistiques de séance de révision (`srs_review_sessions`)
 * ===========================================================
 *
 * Une ligne par paquet et par jour : cartes révisées, réponses justes, temps.
 * Écrite par le serveur seul, au client service : `completed_at` porte le
 * forfait du Palotin (review-session-reward.ts), l'élève ne doit pas pouvoir
 * réécrire sa ligne. `userId` vient de la SESSION ; l'appelant a vérifié que
 * le paquet appartient à l'élève. La lecture de la séance du jour reste au
 * client de l'élève (sa RLS).
 *
 * Statistiques secondaires : une panne est journalisée, jamais remontée (la
 * révision est déjà enregistrée). 0 ligne écrite = panne journalisée, pas un
 * succès silencieux.
 */

import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import type { Tables } from '$lib/types/database';
import { createServerLogger } from '$lib/utils/logger';

// Types
export interface ReviewedCard {
	isCorrect: boolean;
	timeSpent: number;
}

// Constantes
const logger = createServerLogger('server/srs/review-session-stats');

// Functions

/**
 * Compte une carte révisée dans la séance du jour : met à jour `existing` (lue
 * par l'appelant) ou crée la séance.
 */
export async function recordReviewSessionCard(
	userId: string,
	deckId: string,
	existing: Tables<'srs_review_sessions'> | null,
	card: ReviewedCard
): Promise<void> {
	try {
		await writeReviewSessionCard(userId, deckId, existing, card);
	} catch (writeError) {
		logger.error('Séance non enregistrée :', writeError);
	}
}

async function writeReviewSessionCard(
	userId: string,
	deckId: string,
	existing: Tables<'srs_review_sessions'> | null,
	card: ReviewedCard
): Promise<void> {
	const service = createServiceRoleClient();

	if (existing) {
		const { data, error } = await service
			.from('srs_review_sessions')
			.update({
				cards_reviewed: existing.cards_reviewed + 1,
				correct_count: existing.correct_count + (card.isCorrect ? 1 : 0),
				total_time: existing.total_time + card.timeSpent
			})
			.eq('id', existing.id)
			.eq('user_id', userId)
			.select('id');
		if (error || (data?.length ?? 0) === 0) {
			logger.error('Séance non mise à jour :', error ?? { sessionId: existing.id });
		}
		return;
	}

	const { data, error } = await service
		.from('srs_review_sessions')
		.insert({
			user_id: userId,
			deck_id: deckId,
			cards_reviewed: 1,
			correct_count: card.isCorrect ? 1 : 0,
			total_time: card.timeSpent
		})
		.select('id');
	if (error || (data?.length ?? 0) === 0) {
		logger.error('Séance non créée :', error ?? { deckId });
	}
}
