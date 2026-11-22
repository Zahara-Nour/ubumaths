/**
 * Note d'une réponse corrigée par l'application, pour la révision espacée
 * =======================================================================
 *
 * Réussi → « Bien », raté → « À revoir » (spec FSRS §1.1). Idée 4 du chantier
 * `idees-format` (Q4 → B, David, 2026-11-21) : une réussite en QCM (case
 * répondue depuis ses erreurs prévues) est une demi-réussite, « Difficile » :
 * la question revient plus tôt, pour vérifier que l'élève sait la taper seul.
 * Un échec en QCM reste un échec.
 */

import { Grade } from '#lib/srs/types.ts';

export function answerGrade(success: boolean, answeredAsChoice: boolean): Grade {
	if (!success) return Grade.AGAIN;
	return answeredAsChoice ? Grade.HARD : Grade.GOOD;
}
