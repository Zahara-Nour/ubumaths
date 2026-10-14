/**
 * Atelier — le garde-fou des étapes de `.limite`
 *
 * Avant de montrer les étapes de `pedagogical-limits` sous une ligne
 * `.limite` (décisions de David, 2026-10-14, PR 3 de `.limite`) :
 *
 * 1. **Concordance** (`concludesLimitAnswer`) : les étapes concluent la
 *    réponse de `.limite` — la même valeur, comparée par valeur exacte ; le
 *    même infini ; « pas de limite » avec les mêmes limites à gauche et à
 *    droite ; le même côté implicite (`\ln x` en 0 : à droite). Jamais
 *    d'étapes qui contredisent la ligne.
 * 2. **Rien à montrer** (`showsNothing`, comme E4 de `.évaluer`) : une
 *    substitution directe seule (`x^2 + 1` en 2) n'explique rien de plus
 *    que la réponse.
 *
 * @module atelier/limit-steps-check
 */

import type { MathNode } from '$lib/mathAST/types';
import type {
	PedagogicalLimitResult,
	PedagogicalLimitRule,
	PedagogicalLimitStep
} from '$lib/mathAST/pedagogical-limits/types';
import { isInfinity } from '$lib/mathAST/guards';
import { concludesEngineValue } from './evaluate-steps-check';

// =============================================================================
// Types
// =============================================================================

/** La réponse de `.limite`, telle que la ligne l'écrit. */
export type LimitAnswer =
	| {
			readonly kind: 'value';
			/** Un nombre exact ou un infini. */
			readonly value: MathNode;
			/** Le côté que la ligne écrit sans qu'il ait été tapé (`ln x` en 0 : x → 0⁺). */
			readonly impliedSide: 'left' | 'right' | null;
	  }
	| {
			/** « Pas de limite en 0 : à gauche −∞, à droite +∞ » */
			readonly kind: 'sides';
			readonly left: MathNode;
			readonly right: MathNode;
	  };

// =============================================================================
// Constantes
// =============================================================================

/** Les étapes qui n'expliquent rien à elles seules : l'annonce et la conclusion. */
const FRAME_RULES: ReadonlySet<PedagogicalLimitRule> = new Set([
	'identify-limit',
	'conclude',
	'conclude-infinite',
	'conclude-does-not-exist'
]);

// =============================================================================
// Fonctions
// =============================================================================

/** Les étapes concluent-elles la réponse de la ligne ? */
export function concludesLimitAnswer(result: PedagogicalLimitResult, answer: LimitAnswer): boolean {
	if (answer.kind === 'sides') {
		if (result.status !== 'does-not-exist') return false;
		const conclusion = result.steps.find((s) => s.rule === 'conclude-does-not-exist');
		const left = conclusion?.bindings?.left;
		const right = conclusion?.bindings?.right;
		return (
			left !== undefined &&
			right !== undefined &&
			sameLimitValue(left, answer.left) &&
			sameLimitValue(right, answer.right)
		);
	}
	if (result.status === 'does-not-exist' || result.value === null) return false;
	return (
		sameLimitValue(result.value, answer.value) && impliedSideOf(result.steps) === answer.impliedSide
	);
}

/** Les étapes ne montrent-elles qu'une substitution directe (ou rien) ? */
export function showsNothing(steps: readonly PedagogicalLimitStep[]): boolean {
	const content = steps.filter((s) => !FRAME_RULES.has(s.rule));
	return content.every((s) => s.rule === 'apply-direct-substitution');
}

/** Deux limites égales : le même infini, ou la même valeur exacte. */
function sameLimitValue(a: MathNode, b: MathNode): boolean {
	if (isInfinity(a) || isInfinity(b)) {
		return isInfinity(a) && isInfinity(b) && a.sign === b.sign;
	}
	try {
		return concludesEngineValue(a, b);
	} catch {
		return false;
	}
}

/**
 * Le côté étudié faute d'être défini de l'autre (`\ln x` en 0) : l'étape
 * qui le dit porte la borne du domaine (`domainBoundary`).
 */
function impliedSideOf(steps: readonly PedagogicalLimitStep[]): 'left' | 'right' | null {
	const step = steps.find((s) => s.bindings?.domainBoundary !== undefined);
	if (step === undefined) return null;
	return step.rule === 'analyze-left-limit' ? 'left' : 'right';
}
