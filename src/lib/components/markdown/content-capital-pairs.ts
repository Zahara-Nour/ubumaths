/**
 * Sens de deux majuscules collées (`AB`) — contexte des composants markdown
 *
 * Une question résout une fois le sens de `AB` (longueur ou produit, lot 3 des longueurs
 * de segments) et le garde sur son instance (`QuestionInstance.capitalPairs`). Les
 * formules en syntaxe maison (`~AB^2~`) sont écrites en LaTeX au rendu, par les nœuds
 * `MathInline`, `MathBlock`, `MathPrompt`, `ParagraphNode` : ils lisent ce sens ici, sans
 * qu'il descende de composant en composant (même rail que la langue du contenu,
 * `content-locale.ts`).
 *
 * Posé par la carte qui affiche une instance (`QuestionCard`, `FlashCard`,
 * `CorrectionCard`…) ou par `FillBlanksInput` (prop `capitalPairs`).
 * Posé aussi par l'affichage d'un exercice (`ExerciseDisplay` prof et élève,
 * `ExerciseModal`…), depuis son thème (lot 6, décision Q-J).
 * Sans fournisseur : `undefined`, donc le défaut du parseur, le produit (décision Q-M) —
 * l'atelier, le chat (`clearCapitalPairs`) et les anciennes instances gardent l'écriture
 * d'avant.
 *
 * @module components/markdown/content-capital-pairs
 */

import { getContext, hasContext, setContext } from 'svelte';
import type { CapitalPairs } from '$lib/mathAST/parser/types';

const CAPITAL_PAIRS_KEY = Symbol('markdown-capital-pairs');

type CapitalPairsGetter = () => CapitalPairs | undefined;

/**
 * Poser le sens pour les composants descendants. Getter : l'instance affichée peut
 * changer. Sans sens (`undefined`), un rendu imbriqué garde celui de son parent. À
 * appeler pendant l'initialisation du composant.
 */
export function provideCapitalPairs(get: () => CapitalPairs | undefined): void {
	const parent = readCapitalPairs();
	setContext<CapitalPairsGetter>(CAPITAL_PAIRS_KEY, () => get() ?? parent());
}

/**
 * Couper le sens hérité pour les composants descendants : ils reviennent au défaut du
 * parseur (produit, décision Q-M). Pour un rendu posé DANS une carte d'exercice mais qui
 * n'en fait pas partie (le chat du tuteur, ouvert à côté de l'énoncé). À appeler pendant
 * l'initialisation du composant.
 */
export function clearCapitalPairs(): void {
	setContext<CapitalPairsGetter>(CAPITAL_PAIRS_KEY, () => undefined);
}

/** Le sens que doit suivre un composant ; `undefined` sans fournisseur (produit). */
export function readCapitalPairs(): CapitalPairsGetter {
	return hasContext(CAPITAL_PAIRS_KEY)
		? getContext<CapitalPairsGetter>(CAPITAL_PAIRS_KEY)
		: () => undefined;
}
