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
 * - Plafond du jour déjà atteint ou élève sans Palotin → la séance est réclamée
 *   quand même, pour les gidouilles (décision de David, 2026-10-24) ; pas d'XP.
 * - Réclamation conditionnelle (`completed_at is null`) vérifiée par
 *   `.select()` : de deux envois simultanés sur un paquet, un seul la marque.
 * - Deux paquets réclamés au même instant : chacun voit l'autre, AUCUN forfait
 *   ce jour-là (côté sûr).
 * - Rien de donné (ni XP ni gidouilles) → réclamation relâchée (`completed_at`
 *   remis à null).
 *
 * Écritures (réclamation, relâche) au client service, `userId` de la session ;
 * les lectures restent au client de l'élève. La migration 20261017090100
 * retire à l'élève l'écriture directe de ses séances : il ne peut plus remettre
 * `completed_at` à vide pour toucher deux fois le forfait.
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
import { creditStudentGidouilles } from '$lib/server/achievements/credit-gidouilles';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import {
	DAILY_XP_CAP,
	REVIEW_REWARD_CARDS_ANY_DECK,
	REVIEW_REWARD_CARDS_EMPTIED_DECK
} from '$lib/utils/buddy-xp';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('server/srs/review-session-reward');

/** Gidouilles de la séance de révision du jour (décision de David, 2026-10-24). */
export const REVIEW_DAY_GIDOUILLES = 2;

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

/** Ce que la séance du jour a rapporté : l'XP du Palotin (s'il y a lieu) et les gidouilles. */
export interface ReviewSessionReward {
	/** Forfait du Palotin ; null sans Palotin, plafond du jour atteint ou crédit en échec. */
	buddyXp: BuddyXpFromExerciseResult | null;
	/** Gidouilles versées (`REVIEW_DAY_GIDOUILLES`, 0 si le crédit a échoué). */
	gidouilles: number;
}

/**
 * Récompense la séance du jour si la règle (a) ou (b) est remplie après cette
 * carte et qu'aucune séance n'a été récompensée aujourd'hui. `userId` vient de
 * la SESSION et doit être un ÉLÈVE (l'appelant le vérifie : le crédit de
 * gidouilles au client service ne contrôle pas le rôle). `dayStartIso` est le
 * début du jour qui borne la séance (celui de la route).
 *
 * Gidouilles (décision de David, 2026-10-24) : +2 pour la séance terminée,
 * indépendamment du Palotin (sans Palotin, ou plafond d'XP du jour atteint,
 * l'élève qui a révisé les touche quand même). La réclamation n'est relâchée
 * que si RIEN n'a été donné : relâcher après un versement de gidouilles
 * permettrait de les toucher deux fois (un forfait d'XP en échec est alors perdu
 * pour la journée, journalisé).
 *
 * @returns null si rien n'a été donné.
 */
export async function rewardFinishedReviewSession(
	supabase: SB,
	userId: string,
	deckId: string,
	dayStartIso: string
): Promise<ReviewSessionReward | null> {
	try {
		// 1. Séance déjà récompensée aujourd'hui ? (évite toute autre lecture)
		const completed = await sessionsCompletedToday(supabase, userId, dayStartIso);
		if (!completed || completed.length > 0) return null;

		// 2. L'effort du jour
		if (!(await isEffortEnough(supabase, userId, deckId, dayStartIso))) return null;

		// 3. Réclamer la séance du jour de ce paquet — une seule fois (client
		//    service : l'élève n'écrit pas `completed_at` lui-même)
		const service = createServiceRoleClient();
		const { data: claimed, error: claimError } = await service
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

		// 4. Deux paquets réclamés au même instant : chacun voit l'autre, rien
		//    aujourd'hui (côté sûr). Lecture illisible : rien non plus.
		const after = await sessionsCompletedToday(supabase, userId, dayStartIso);
		if (!after || after.some((id) => !claimedIds.includes(id))) return null;

		// 5. Forfait du Palotin : un Palotin, et de la place sous le plafond du jour
		const buddyXp = await reviewBuddyXp(supabase, userId);

		// 6. Gidouilles de la séance, avec ou sans Palotin
		const creditError = await creditStudentGidouilles(
			service,
			userId,
			REVIEW_DAY_GIDOUILLES,
			'Révision du jour terminée'
		);
		if (creditError) logger.error('Gidouilles de la révision non versées :', creditError);
		const gidouilles = creditError ? 0 : REVIEW_DAY_GIDOUILLES;

		// 7. Rien de donné → relâcher la réclamation (un nouvel essai reste possible)
		if (!buddyXp && gidouilles === 0) {
			await releaseClaim(userId, claimedIds);
			return null;
		}
		return { buddyXp, gidouilles };
	} catch (rewardError) {
		logger.error('Séance de révision non récompensée :', rewardError);
		return null;
	}
}

/** Forfait du Palotin ; null sans Palotin, plafond du jour atteint, crédit nul ou en échec. */
async function reviewBuddyXp(
	supabase: SB,
	userId: string
): Promise<BuddyXpFromExerciseResult | null> {
	try {
		const buddy = await getStudentBuddy(supabase, userId);
		if (!buddy) return null;
		const today = new Date().toISOString().split('T')[0];
		const earnedToday = buddy.last_xp_date === today ? buddy.xp_earned_today : 0;
		if (earnedToday >= DAILY_XP_CAP) return null;
		const result = await addBuddyXpFromReviewSession(supabase, userId);
		return result && result.xpResult.xp_gained > 0 ? result : null;
	} catch (creditError) {
		logger.error('Forfait de révision non crédité :', creditError);
		return null;
	}
}
