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
import { summaryOf } from './steps-summary';
import {
	engineAlternative,
	keepingDomain,
	writtenKeepingDomain,
	type DomainAlternative
} from './domain-guard';
import type { PedagogicalSimplifyResult } from '$lib/mathAST/pedagogical-simplify/types';

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
	/** Les mêmes étapes en version résumée, absente si elle ne dit rien de moins. */
	readonly summary?: readonly RenderedStep[];
	/** La réponse en LaTeX, jamais vide — la ligne d'historique l'affiche. */
	readonly answer: string;
	/**
	 * La simplification qui change le domaine, derrière le bouton de la ligne
	 * (« Simplifier pour x ≠ −1 »), avec ses étapes (chantier tidy-conditions).
	 */
	readonly alternative?: DomainAlternative;
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

/** Les étapes rendues d'un calcul et leur résumé ; `null` s'il n'y en a aucune. */
function rendered(
	result: PedagogicalSimplifyResult
): { steps: readonly RenderedStep[]; summary?: readonly RenderedStep[] } | null {
	if (result.steps.length === 0) return null;
	const renderer = new PedagogicalSimplifyRenderer();
	const steps = collapseRepeats(
		renderer.renderAll(result.steps, { schoolLevel: 'lycee', verbosity: 'detailed' })
	);
	if (steps.length === 0) return null;
	// Le même calcul, rédigé sans les « pourquoi » (interrupteur du dépliage)
	const summary = summaryOf(
		steps,
		collapseRepeats(
			// `auto` qui développe a sa rédaction résumée, celle de `.développer`
			renderer.renderAll(result.summary ?? result.steps, {
				schoolLevel: 'lycee',
				verbosity: 'summarized'
			})
		)
	);
	return { steps, ...(summary !== undefined && { summary }) };
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

		const full = generatePedagogicalSimplifySteps(node, {
			intent: 'auto',
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});
		// Le domaine est gardé (David, 2026-10-26) : la ligne s'arrête avant la
		// première étape qui le change, le bouton montre le calcul entier
		const { kept } = keepingDomain(node, full);
		const alternative = engineAlternative(node, full, () => rendered(full) ?? undefined);
		// Zéro étape = rien à simplifier. C'est un repli, pas un échec : la ligne
		// garde la réponse du moteur, qui dit déjà la même chose. Des étapes, mais
		// aucune qui garde le domaine : la ligne garde l'expression, sans étapes
		const shown = rendered(kept);
		if (shown === null) {
			if (full.steps.length === 0) return null;
			return {
				steps: [],
				answer: toLatex(writtenKeepingDomain(node)),
				...(alternative !== undefined && { alternative })
			};
		}
		const answer = toLatex(kept.result);
		if (answer.trim() === '') return null;
		return {
			steps: shown.steps,
			answer,
			...(shown.summary !== undefined && { summary: shown.summary }),
			...(alternative !== undefined && { alternative })
		};
	} catch {
		// `PedagogicalSimplifyNotImplemented` (inéquation, matrice…), expression
		// illisible, ou un renderer qui refuse ce qu'on lui donne.
		return null;
	}
}
