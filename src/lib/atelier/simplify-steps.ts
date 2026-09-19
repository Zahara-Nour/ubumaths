/**
 * Atelier — la simplification expliquée
 *
 * `.simplifier` passait par le `simplify()` algorithmique du moteur, qui
 * cherche un point fixe de coût et ne raconte rien. Mesuré le 2026-09-19 :
 *
 *   .simplifier x+x        → « Simplified: x+x »       (rien n'a bougé)
 *   .simplifier sqrt(8)    → « Simplified: sqrt(8) »   (rien n'a bougé)
 *   .simplifier 2/6+1/4    → « Simplified: 7/12 »      (juste, mais sans raison)
 *
 * `pedagogical-simplify` rend `2x`, `2√2`, et dit « On extrait du radical les
 * facteurs qui sont des carrés parfaits ».
 *
 * @module atelier/simplify-steps
 */

import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import { generatePedagogicalSimplifySteps } from '$lib/mathAST/pedagogical-simplify/pipeline';
import { PedagogicalSimplifyRenderer } from '$lib/mathAST/pedagogical-simplify/renderer';
import { toLatex } from '$lib/mathAST/latex-generator';
import { astOf } from './parse';

// =============================================================================
// Types
// =============================================================================

/**
 * Ce qu'une simplification donne à afficher : la réponse pour la ligne, les
 * étapes pour le dépliage.
 *
 * Les deux sortent du MÊME calcul — une `answer` obtenue ailleurs pourrait
 * décrire autre chose que ce que les étapes démontrent.
 */
export interface SimplifiedSteps {
	/** Les étapes rendues, prêtes pour `GeneratedStepsCorrection`. */
	readonly steps: readonly RenderedStep[];
	/** La réponse en LaTeX, jamais vide — la ligne d'historique l'affiche. */
	readonly answer: string;
}

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Replier les étapes consécutives que le rendu ne distingue pas.
 *
 * ⚠️ Mesuré : `3x + 2x - x` émet **deux** étapes `combine-like-terms` dont le
 * rendu est identique au caractère près — le module colore l'expression
 * entière et montre le résultat final, faute de savoir écrire l'étape
 * intermédiaire. Deux lignes identiques font chercher à l'élève une différence
 * qui n'existe pas.
 *
 * Le repli est volontairement étroit : **même règle ET même image**. Deux
 * règles différentes qui rendent la même image restent deux étapes, parce
 * qu'elles disent deux choses — sur `√12 + √3`, « on simplifie le radical »
 * puis « on regroupe les termes semblables ».
 */
function collapseRepeats(steps: readonly RenderedStep[]): readonly RenderedStep[] {
	return steps.filter((step, index) => {
		if (index === 0) return true;
		const previous = steps[index - 1];
		return step.rule !== previous.rule || step.expressionLatex !== previous.expressionLatex;
	});
}

/**
 * Les étapes de simplification d'une expression — ou `null`.
 *
 * ⚠️ **`null` n'est pas un échec : c'est le repli.** L'appelant garde alors la
 * sortie du moteur. Aucun chemin ne jette — une exception remonterait jusqu'à
 * `desk.submit`, qui n'afficherait alors AUCUNE ligne.
 *
 * L'intention est `auto`, et c'est un choix : `pedagogical-simplify` n'a pas de
 * défaut, par construction, parce que « simplifier » ne veut pas dire la même
 * chose selon la question posée. Un élève qui tape `.simplifier` sans en dire
 * plus demande exactement ce que `auto` décrit — réduire, et n'appliquer que
 * les transformations non ambiguës. `x² - 4` reste donc `x² - 4` : le
 * factoriser serait répondre à une autre question.
 */
export function simplifySteps(expression: string): SimplifiedSteps | null {
	try {
		const node = astOf(expression, 'text');
		if (node === null) return null;

		const result = generatePedagogicalSimplifySteps(node, {
			intent: 'auto',
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});
		// Zéro étape = rien à simplifier. C'est un repli, pas un échec : la ligne
		// garde la réponse du moteur, qui dit déjà la même chose.
		if (result.steps.length === 0) return null;

		const rendered = new PedagogicalSimplifyRenderer().renderAll(result.steps, {
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});
		const steps = collapseRepeats(rendered);
		if (steps.length === 0) return null;

		const answer = toLatex(result.result);
		if (answer.trim() === '') return null;

		return { steps, answer };
	} catch {
		// `PedagogicalSimplifyNotImplemented` (inéquation, matrice…), expression
		// illisible, ou un renderer qui refuse ce qu'on lui donne.
		return null;
	}
}
