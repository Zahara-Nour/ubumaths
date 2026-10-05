/**
 * Couleur de chaque case après soumission (FlashCard).
 *
 * Une case en `rulesSuffice` est jugée par le validateur : toute bonne réponse
 * est verte, pas seulement celle tirée ; de même un décimal exact dans une case
 * `acceptDecimal`, une notation combinatoire (`\binom{32}{5}`) dans une case
 * `acceptCombinatorialNotation`, et toute case « intervalles », « équation », « vecteur », « primitive » ou « solution-ed ». Les autres cases gardent la
 * comparaison textuelle historique.
 */

import type { QuestionInstance } from '$lib/questions/types';
import { isBlankValueCorrect } from '$lib/utils/answer-validator';
import { rulesDecide } from '$lib/questions/rules-suffice';
import { isSimpleNumberLatex } from '$lib/mathAST/cosmetic-transforms';
import { isCombinatorialNotationLatex } from '$lib/questions/combinatorial-notation';

export function computeBlankVerdicts(values: string[], instance: QuestionInstance): boolean[] {
	const blanks = instance.blanks ?? [];
	return values.slice(0, blanks.length).map((value, i) => {
		const blank = blanks[i];
		if (rulesDecide(blank)) return isBlankValueCorrect(value, blank, instance);
		// Ensemble en notation intervalle : jugé sur l'ensemble (ordre, écriture de MathLive)
		if (blank.answerKind === 'intervalles') return isBlankValueCorrect(value, blank, instance);
		// Équation : jugée sur l'ensemble de points (`y=2x+1` pour `2x-y+1=0`)
		if (blank.answerKind === 'equation') return isBlankValueCorrect(value, blank, instance);
		// Vecteur : jugé sur ses coordonnées (un colinéaire est vert en mode `colineaire`)
		if (blank.answerKind === 'vecteur') return isBlankValueCorrect(value, blank, instance);
		// Primitive (à une constante près), solution d'équation différentielle : jugées par le calcul
		if (blank.answerKind === 'primitive' || blank.answerKind === 'solution-ed') {
			return isBlankValueCorrect(value, blank, instance);
		}
		// Décimal exact accepté (`acceptDecimal`) : « 0,5 » pour ½ est vert, jugé par sa valeur
		if (blank.acceptDecimal === true && isSimpleNumberLatex(value)) {
			return isBlankValueCorrect(value, blank, instance);
		}
		// Notation combinatoire acceptée (`acceptCombinatorialNotation`) : `\binom{32}{5}` est vert
		if (blank.acceptCombinatorialNotation === true && isCombinatorialNotationLatex(value)) {
			return isBlankValueCorrect(value, blank, instance);
		}
		// Argument « à 2π près » (`angleModulo`) : `-\frac{7\pi}{4}` pour `\frac{\pi}{4}` est vert
		if (blank.angleModulo === '2pi') return isBlankValueCorrect(value, blank, instance);
		return value.trim().toLowerCase() === blank.expectedAnswer.trim().toLowerCase();
	});
}
