/**
 * Atelier — le garde-fou des étapes de `.évaluer`
 *
 * Avant de montrer les étapes de `pedagogical-arithmetic` sous une ligne
 * `.évaluer` (décisions de David, 2026-10-14, PR 3 de `.évaluer`) :
 *
 * 1. **Concordance** : la valeur que concluent les étapes est, par valeur
 *    EXACTE, la réponse du moteur (`concludesEngineValue`).
 * 2. **Rien à montrer** (E4) : une fonction transcendante (`e^0`, `\ln 1`,
 *    `\sin 0`) — le collège ne la calcule pas, la seule étape serait
 *    « On calcule » —, une seule étape « On calcule », aucune étape.
 * 3. **Écriture** : aucun `*` dans le LaTeX ; une réponse décimale n'est pas
 *    expliquée par des fractions (E5).
 *
 * @module atelier/evaluate-steps-check
 */

import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import type { MathNode } from '$lib/mathAST/types';
import { evaluate } from '$lib/mathAST/eval';
import { isEvalValue } from '$lib/mathAST/eval/types';
import { subtract } from '$lib/mathAST/factory';
import { findNodes } from '$lib/mathAST/transforms';

// =============================================================================
// Constantes
// =============================================================================

/**
 * Les fonctions que le collège calcule à la main : la racine (carré parfait)
 * et la valeur absolue. Toute autre (exp, ln, sin…) se lit sur la
 * calculatrice ou se sait par cœur : rien à rédiger.
 */
const HAND_COMPUTED_FUNCTIONS: ReadonlySet<string> = new Set(['sqrt', 'abs']);

/** La règle de repli du pipeline : « On calcule », sans détail. */
const EVALUATE_FINAL_RULE = 'evaluate-final';

// =============================================================================
// Fonctions
// =============================================================================

/** Les deux valeurs sont-elles égales, en calcul exact ? */
export function concludesEngineValue(concluded: MathNode, engine: MathNode): boolean {
	const difference = evaluate(subtract(concluded, engine), { mode: 'exact' });
	return (
		isEvalValue(difference) &&
		difference.node.type === 'number' &&
		Number(difference.node.value) === 0
	);
}

/** L'expression contient-elle une fonction que le collège ne calcule pas ? */
export function hasTranscendental(node: MathNode): boolean {
	return (
		findNodes(
			node,
			(n) =>
				(n.type === 'function' && !HAND_COMPUTED_FUNCTIONS.has(n.name)) ||
				(n.type === 'superscript' && n.base.type === 'constant' && n.base.constant === 'euler')
		).length > 0
	);
}

/** Les étapes du pipeline ne montrent-elles rien (aucune, ou « On calcule » seul) ? */
export function showsNothing(steps: readonly RenderedStep[]): boolean {
	return steps.length === 0 || (steps.length === 1 && steps[0].rule === EVALUATE_FINAL_RULE);
}

/** Un `*` quelque part dans le LaTeX des étapes, sous-étapes comprises. */
export function hasStar(steps: readonly RenderedStep[]): boolean {
	return steps.some(
		(step) => (step.expressionLatex ?? '').includes('*') || hasStar(step.subSteps ?? [])
	);
}

/** Une fraction écrite dans les étapes (E5 : refusée sous une réponse décimale). */
export function hasFraction(steps: readonly RenderedStep[]): boolean {
	return steps.some(
		(step) => /\\d?frac/.test(step.expressionLatex ?? '') || hasFraction(step.subSteps ?? [])
	);
}
