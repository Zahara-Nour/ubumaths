/**
 * Présence du Palotin — ce que le composant de présence lit après l'affichage
 * ==========================================================================
 *
 * Le Palotin est lu par le client APRÈS l'affichage (chantier `palotins`,
 * décision de David du 2026-11-11) : `GET /api/student/buddy/presence`.
 * Cette lecture fait ce que faisait le layout de l'espace élève :
 *   - Constance Royale perdue : remise à zéro (client service, règle réévaluée
 *     sur la ligne relue) ; seule une semaine manquée donne la réplique ;
 *   - retour après une longue absence : LU seulement (la présence est notée par
 *     le hook, sur toute page) ; le client l'acquitte une fois la bulle montrée.
 * Seul « oui/non » sort, jamais le jour. Une lecture secondaire en échec rend
 * `false`, jamais une erreur : le Palotin reste montrable.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { toBuddyState, type BuddyState } from '$lib/types/buddy';
import { isWelcomeBackPending, resetLostConstance } from '$lib/server/buddy-queries';
import { constanceReset, utcDay } from '$lib/utils/buddy-constance';
import { createServerLogger } from '$lib/utils/logger';

// Types
export interface BuddyPresence {
	buddy: BuddyState | null;
	/** Constance perdue, remise à zéro par CETTE lecture */
	streakLost: boolean;
	/** Retour après une longue absence pas encore fêté */
	longAbsence: boolean;
}

// Constantes
const logger = createServerLogger('buddy-presence');

// Functions
/**
 * Lit le Palotin de l'élève et ce qu'il a à dire en arrivant. Lève si la ligne
 * du Palotin elle-même est illisible (la route rend alors 500).
 */
export async function loadBuddyPresence(
	supabase: SupabaseClient<Database>,
	studentId: string
): Promise<BuddyPresence> {
	const { data: buddyData, error } = await supabase
		.from('student_buddies')
		.select('*')
		.eq('student_id', studentId)
		.maybeSingle();
	if (error) throw error;

	// Sans Palotin, rien à dire : celui choisi ensuite est tout neuf
	if (!buddyData) return { buddy: null, streakLost: false, longAbsence: false };

	// Constance perdue (dernière semaine finie sous 3 jours travaillés, ou semaine
	// sautée). Une ancienne série en jours est remise à zéro sans réplique.
	let streakLost = false;
	let buddyRow = buddyData;
	if (constanceReset(buddyData, utcDay())) {
		try {
			const reset = await resetLostConstance(studentId);
			if (reset) {
				buddyRow = reset.buddy;
				streakLost = reset.kind === 'lost';
			}
		} catch (resetError) {
			// Non bloquant : la Constance sera remise à zéro à la prochaine lecture
			logger.error('[buddy-presence] Constance perdue non remise à zéro :', resetError);
		}
	}

	let longAbsence = false;
	try {
		longAbsence = await isWelcomeBackPending(studentId);
	} catch (welcomeError) {
		// Non bloquant : pas de « tu m'as manqué » plutôt qu'une lecture en échec
		logger.error('[buddy-presence] Retour à fêter illisible :', welcomeError);
	}

	return { buddy: toBuddyState(buddyRow), streakLost, longAbsence };
}
