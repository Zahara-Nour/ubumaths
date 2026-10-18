/**
 * Forfait du Palotin pour une séance de révision espacée terminée
 * ================================================================
 *
 * Décision de David (2026-10-18) : récompenser l'EFFORT, pas la réussite (les
 * cartes sont auto-évaluées) — un forfait quand l'élève termine sa séance, au
 * plus une fois par jour.
 *
 * - « Terminée » se lit en BASE, jamais sur la parole du client : après la
 *   réponse, le paquet n'a plus aucune carte due (`get_due_cards_for_deck`,
 *   échéance respectée). Une carte révisée repart au moins à un jour
 *   (`FSRS.calculateInterval`), elle ne redevient donc pas due dans la séance.
 * - « Une fois par jour », sans migration : la séance du jour de ce paquet est
 *   marquée terminée (`srs_review_sessions.completed_at`, colonne jusqu'ici
 *   jamais écrite) par une écriture CONDITIONNELLE (`completed_at is null`),
 *   vérifiée par `.select()` : de deux envois simultanés, un seul la marque.
 *   Le forfait n'est dû que si aucune AUTRE séance n'a été terminée ce jour-là
 *   (marquer d'abord, vérifier ensuite : deux paquets finis au même instant ne
 *   rapportent pas deux forfaits).
 *
 * Limite connue : la policy « Users can update their own review sessions »
 * laisse l'élève réécrire `completed_at` par un appel direct. Le gain qu'il en
 * tirerait reste borné par le plafond du jour ; la fermeture des écritures
 * directes est prévue avec la migration de la Constance (PR 2).
 *
 * Toute panne rend null (pas de forfait) : on ne conclut jamais « terminée » ni
 * « pas encore donné » sur une lecture manquée.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import {
	addBuddyXpFromReviewSession,
	type BuddyXpFromExerciseResult
} from '$lib/server/buddy-xp-service';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('server/srs/review-session-reward');

/**
 * Crédite le forfait si cette réponse termine la séance du jour et qu'aucune
 * séance n'a déjà été terminée aujourd'hui. `userId` vient de la SESSION ;
 * `dayStartIso` est le début du jour qui borne la séance (celui de la route).
 */
export async function rewardFinishedReviewSession(
	supabase: SupabaseClient<Database>,
	userId: string,
	deckId: string,
	dayStartIso: string
): Promise<BuddyXpFromExerciseResult | null> {
	try {
		// 1. Reste-t-il une carte due dans ce paquet ?
		const { data: dueCards, error: dueError } = await supabase.rpc('get_due_cards_for_deck', {
			p_user_id: userId,
			p_deck_id: deckId,
			p_all: false
		});
		if (dueError || !dueCards) {
			if (dueError) logger.error('Échéancier illisible :', dueError);
			return null;
		}
		if (dueCards.length > 0) return null;

		// 2. Marquer la séance du jour terminée — une seule fois
		const { data: claimed, error: claimError } = await supabase
			.from('srs_review_sessions')
			.update({ completed_at: new Date().toISOString() })
			.eq('user_id', userId)
			.eq('deck_id', deckId)
			.gte('started_at', dayStartIso)
			.is('completed_at', null)
			.select('id');
		if (claimError) {
			logger.error('Séance non marquée terminée :', claimError);
			return null;
		}
		// 0 ligne : déjà terminée plus tôt aujourd'hui (ou séance absente)
		if (!claimed || claimed.length === 0) return null;

		// 3. Une AUTRE séance déjà terminée aujourd'hui (même paquet compris, si deux
		//    lignes du jour existent) ? Le forfait est déjà donné.
		const { data: completedToday, error: completedError } = await supabase
			.from('srs_review_sessions')
			.select('id')
			.eq('user_id', userId)
			.gte('completed_at', dayStartIso);
		if (completedError || !completedToday) {
			if (completedError) logger.error('Séances du jour illisibles :', completedError);
			return null;
		}
		const claimedIds = new Set(claimed.map((row) => row.id));
		if (completedToday.some((row) => !claimedIds.has(row.id))) return null;

		// 4. Le forfait (null sans Palotin)
		return await addBuddyXpFromReviewSession(supabase, userId);
	} catch (rewardError) {
		logger.error('Forfait de révision non crédité :', rewardError);
		return null;
	}
}
