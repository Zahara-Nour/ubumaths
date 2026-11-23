/**
 * Note d'une réponse corrigée par l'application, pour la révision espacée
 * =======================================================================
 *
 * Réussi → « Bien », raté → « À revoir » (spec FSRS §1.1). Idée 4 du chantier
 * `idees-format` (Q4 → B, David, 2026-11-21) : une réussite en QCM (case
 * répondue depuis ses erreurs prévues) est une demi-réussite, « Difficile » :
 * la question revient plus tôt, pour vérifier que l'élève sait la taper seul.
 * Un échec en QCM reste un échec.
 *
 * Idée 5 (coup de pouce) : une réussite après un indice ouvert est aussi une
 * demi-réussite. En série (Saisie, Flash-cards), `answerGrade` reçoit « QCM ou
 * indice » ; en révision, l'élève choisit sa note et `helpedGrade` la ramène à
 * « Difficile ».
 */

import { Grade } from '#lib/srs/types.ts';

/** `halfSuccess` : posée en QCM depuis ses erreurs prévues, ou indice ouvert */
export function answerGrade(success: boolean, halfSuccess: boolean): Grade {
	if (!success) return Grade.AGAIN;
	return halfSuccess ? Grade.HARD : Grade.GOOD;
}

/** Note choisie en révision, indice ouvert : une réussite devient « Difficile » */
export function helpedGrade(grade: Grade, withHelp: boolean): Grade {
	return withHelp && grade > Grade.HARD ? Grade.HARD : grade;
}
