/**
 * Seuil des espaces de groupement — contexte des composants markdown
 *
 * Par défaut, les nombres affichés suivent le BIPM : espace dès 5 chiffres (`7900`,
 * `30 000`). Un modèle de question réglé « Espaces dès 4 chiffres »
 * (`options.constraints.spacesFromFourDigits`, numération) garde la règle de l'école :
 * le juge exige alors `7 900`, et l'énoncé comme la correction l'écrivent (E2,
 * simplify-carte § 43). Les nœuds `MathInline`, `MathBlock`, `MathPrompt`,
 * `ParagraphNode` lisent ce seuil ici (même rail que `content-capital-pairs.ts`).
 *
 * Posé par la carte qui affiche une instance (`QuestionCard`, `FlashCard`,
 * `CorrectionCard`, `CourseCardView`) et par `FillBlanksInput`. Sans fournisseur :
 * `undefined`, donc le BIPM.
 *
 * @module components/markdown/content-digit-grouping
 */

import { getContext, hasContext, setContext } from 'svelte';
import {
	MIN_DIGITS_FOR_GROUPING,
	SCHOOL_MIN_DIGITS_FOR_GROUPING
} from '$lib/mathAST/digit-grouping';
import type { QuestionInstance } from '$lib/questions/types';

const DIGIT_GROUPING_KEY = Symbol('markdown-digit-grouping');

type DigitGroupingGetter = () => number | undefined;

/**
 * Le seuil d'une instance : 4 si son modèle est réglé « Espaces dès 4 chiffres », sinon 5
 * (BIPM) — explicite, pour qu'une carte non réglée posée dans une carte réglée n'hérite
 * pas du seuil de l'école.
 */
export function digitGroupingOf(instance: Pick<QuestionInstance, 'options'>): number {
	return instance.options?.constraints?.spacesFromFourDigits === true
		? SCHOOL_MIN_DIGITS_FOR_GROUPING
		: MIN_DIGITS_FOR_GROUPING;
}

/**
 * Poser le seuil pour les composants descendants. Getter : l'instance affichée peut
 * changer. Sans seuil (`undefined`), un rendu imbriqué garde celui de son parent. À
 * appeler pendant l'initialisation du composant.
 */
export function provideDigitGrouping(get: () => number | undefined): void {
	const parent = readDigitGrouping();
	setContext<DigitGroupingGetter>(DIGIT_GROUPING_KEY, () => get() ?? parent());
}

/** Le seuil que doit suivre un composant ; `undefined` sans fournisseur (BIPM). */
export function readDigitGrouping(): DigitGroupingGetter {
	return hasContext(DIGIT_GROUPING_KEY)
		? getContext<DigitGroupingGetter>(DIGIT_GROUPING_KEY)
		: () => undefined;
}
