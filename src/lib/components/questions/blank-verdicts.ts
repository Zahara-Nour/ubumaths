/**
 * Couleur de chaque case après soumission (FlashCard).
 *
 * Une case en `rulesSuffice` est jugée par le validateur : toute bonne réponse
 * est verte, pas seulement celle tirée. Les autres cases gardent la
 * comparaison textuelle historique.
 */

import type { QuestionInstance } from '$lib/questions/types';
import { isBlankValueCorrect } from '$lib/utils/answer-validator';
import { rulesDecide } from '$lib/questions/rules-suffice';

export function computeBlankVerdicts(values: string[], instance: QuestionInstance): boolean[] {
	const blanks = instance.blanks ?? [];
	return values.slice(0, blanks.length).map((value, i) => {
		const blank = blanks[i];
		if (rulesDecide(blank)) return isBlankValueCorrect(value, blank, instance);
		return value.trim().toLowerCase() === blank.expectedAnswer.trim().toLowerCase();
	});
}
