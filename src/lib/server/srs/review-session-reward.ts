/**
 * Forfait du Palotin pour la révision espacée du jour
 * ====================================================
 *
 * Décision de David (2026-10-18) : récompenser l'EFFORT, pas la réussite (les
 * cartes sont auto-évaluées) — un forfait, au plus une fois par jour.
 *
 * Règle (revue du 2026-10-18), évaluée après chaque carte notée :
 *   (a) l'élève a révisé au moins `REVIEW_REWARD_CARDS_ANY_DECK` (10) cartes
 *       aujourd'hui, tous paquets confondus ;
 *   (b) OU ce paquet n'a plus aucune carte due (`get_due_cards_for_deck`,
 *       échéance respectée) ET il en a révisé au moins
 *       `REVIEW_REWARD_CARDS_EMPTIED_DECK` (3) aujourd'hui.
 * (a) couvre la révision forcée, les sections du Programme et les cartes que
 * `review/due` écarte (elles restent dues à jamais) ; le seuil de (b) empêche
 * qu'un paquet d'une carte rapporte le forfait pour un clic.
 *
 * Compte du jour : cartes DISTINCTES dont `srs_card_stats.last_review` tombe
 * aujourd'hui. Cette table est écrite par le serveur seul (Q171) : l'élève ne
 * peut pas gonfler le compte. Elle est partagée par toutes les révisions FSRS
 * (paquets, chapitres, réponses d'Entraînement et flash).
 *
 * « Une fois par jour », sans migration : `srs_review_sessions.completed_at`
 * (colonne jusqu'ici jamais écrite) marque la séance qui a rapporté le forfait.
 * - Une séance déjà marquée aujourd'hui → rien, sans autre lecture.
 * - Plafond du jour déjà atteint ou élève sans Palotin → la séance n'est pas
 *   réclamée.
 * - Réclamation conditionnelle (`completed_at is null`) vérifiée par
 *   `.select()` : de deux envois simultanés sur un paquet, un seul la marque.
 * - Deux paquets réclamés au même instant : chacun voit l'autre, AUCUN forfait
 *   ce jour-là (côté sûr).
 * - Crédit en erreur ou nul → réclamation relâchée (`completed_at` remis à null).
 *
 * Écritures (réclamation, relâche) au client service, `userId` de la session ;
 * les lectures restent au client de l'élève. Limite connue jusqu'à la PR de
 * migration : la policy « Users can update their own review sessions » laisse
 * encore l'élève réécrire `completed_at` par un appel direct ; le gain reste
 * borné par le plafond du jour.
 *
 * Toute panne rend null : on ne conclut jamais sur une lecture manquée.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import {
	addBuddyXpFromReviewSession,
	type BuddyXpFromExerciseResult
} from '$lib/server/buddy-xp-service';
import { getStudentBuddy } from '$lib/server/buddy-queries';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import {
	DAILY_XP_CAP,
	REVIEW_REWARD_CARDS_ANY_DECK,
	REVIEW_REWARD_CARDS_EMPTIED_DECK
} from '$lib/utils/buddy-xp';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('server/srs/review-session-reward');

type SB = SupabaseClient<Database>;

/** Ids des séances terminées (forfait donné) depuis `dayStartIso` ; null si illisible. */
async function sessionsCompletedToday(
	supabase: SB,
	userId: string,
	dayStartIso: string
): Promise<string[] | null> {
	const { data, error } = await supabase
		.from('srs_review_sessions')
		.select('id')
		.eq('user_id', userId)
		.gte('completed_at', dayStartIso);
	if (error || !data) {
		if (error) logger.error('Séances du jour illisibles :', error);
		return null;
	}
	return data.map((row) => row.id);
}

/** L'effort du jour suffit-il (règle (a) ou (b)) ? */
async function isEffortEnough(
	supabase: SB,
	userId: string,
	deckId: string,
	dayStartIso: string
): Promise<boolean> {
	const { count, error } = await supabase
		.from('srs_card_stats')
		.select('id', { count: 'exact', head: true })
		.eq('user_id', userId)
		.gte('last_review', dayStartIso);
	if (error || count === null || count === undefined) {
		if (error) logger.error('Compte des révisions du jour illisible :', error);
		return false;
	}
	if (count >= REVIEW_REWARD_CARDS_ANY_DECK) return true;
	if (count < REVIEW_REWARD_CARDS_EMPTIED_DECK) return false;

	const { data: dueCards, error: dueError } = await supabase.rpc('get_due_cards_for_deck', {
		p_user_id: userId,
		p_deck_id: deckId,
		p_all: false
	});
	if (dueError || !dueCards) {
		if (dueError) logger.error('Échéancier illisible :', dueError);
		return false;
	}
	return dueCards.length === 0;
}

/** Relâche une réclamation (crédit en échec ou nul), client service, écriture vérifiée. */
async function releaseClaim(userId: string, claimedIds: string[]): Promise<void> {
	const { data, error } = await createServiceRoleClient()
		.from('srs_review_sessions')
		.update({ completed_at: null })
		.eq('user_id', userId)
		.in('id', claimedIds)
		.select('id');
	if (error || (data?.length ?? 0) !== claimedIds.length) {
		logger.error('Réclamation du forfait non relâchée :', error ?? { claimedIds, data });
	}
}

/**
 * Crédite le forfait si la règle (a) ou (b) est remplie après cette carte et
 * qu'aucun forfait n'a été donné aujourd'hui. `userId` vient de la SESSION ;
 * `dayStartIso` est le début du jour qui borne la séance (celui de la route).
 */
export async function rewardFinishedReviewSession(
	supabase: SB,
	userId: string,
	deckId: string,
	dayStartIso: string
): Promise<BuddyXpFromExerciseResult | null> {
	try {
		// 1. Forfait déjà donné aujourd'hui ? (évite toute autre lecture)
		const completed = await sessionsCompletedToday(supabase, userId, dayStartIso);
		if (!completed || completed.length > 0) return null;

		// 2. Un Palotin, et de la place sous le plafond du jour
		const buddy = await getStudentBuddy(supabase, userId);
		if (!buddy) return null;
		const today = new Date().toISOString().split('T')[0];
		const earnedToday = buddy.last_xp_date === today ? buddy.xp_earned_today : 0;
		if (earnedToday >= DAILY_XP_CAP) return null;

		// 3. L'effort du jour
		if (!(await isEffortEnough(supabase, userId, deckId, dayStartIso))) return null;

		// 4. Réclamer la séance du jour de ce paquet — une seule fois (client
		//    service : l'élève n'écrit pas `completed_at` lui-même)
		const { data: claimed, error: claimError } = await createServiceRoleClient()
			.from('srs_review_sessions')
			.update({ completed_at: new Date().toISOString() })
			.eq('user_id', userId)
			.eq('deck_id', deckId)
			.gte('started_at', dayStartIso)
			.is('completed_at', null)
			.select('id');
		if (claimError) {
			logger.error('Séance non réclamée :', claimError);
			return null;
		}
		// 0 ligne : réclamée par un envoi simultané (ou séance absente)
		if (!claimed || claimed.length === 0) return null;
		const claimedIds = claimed.map((row) => row.id);

		// 5. Deux paquets réclamés au même instant : chacun voit l'autre, aucun
		//    forfait aujourd'hui (côté sûr). Lecture illisible : rien non plus.
		const after = await sessionsCompletedToday(supabase, userId, dayStartIso);
		if (!after || after.some((id) => !claimedIds.includes(id))) return null;

		// 6. Créditer ; échec ou crédit nul → relâcher la réclamation
		let result: BuddyXpFromExerciseResult | null = null;
		try {
			result = await addBuddyXpFromReviewSession(supabase, userId);
		} catch (creditError) {
			logger.error('Forfait de révision non crédité :', creditError);
		}
		if (!result || result.xpResult.xp_gained <= 0) {
			await releaseClaim(userId, claimedIds);
			return null;
		}
		return result;
	} catch (rewardError) {
		logger.error('Forfait de révision non crédité :', rewardError);
		return null;
	}
}
