/**
 * Promote `var('e')` to `euler()` when it appears as the base of a
 * superscript (`e^u`).
 *
 * Why: `parseLatex` deliberately keeps the bare letter `e` as a regular
 * variable so that physics/chemistry users can use `e` for the elementary
 * charge or any other quantity. The euler constant is reachable via the
 * explicit LaTeX command `\exponentialE^u`. But for math-equation parsing
 * (`solve`, `solveInequality`), the convention is overwhelming: `e^u` is
 * always Euler. Without this normalization, `detectVariable(e^x - 1 = 0)`
 * would return `null` (two distinct variables `{e, x}` detected), bypassing
 * the transcendental solver entirely.
 *
 * The transformation is intentionally narrow: it only rewrites `e` when it
 * is the BASE of a superscript. A standalone `e + 1` is left alone (so
 * the `e` variable use case is preserved everywhere except in the
 * `e^u` exponential pattern).
 *
 * @module mathAST/solve/promote-euler
 */

import type { MathNode, RelationNode } from '../types';
import { euler } from '../factory';
import { mapNode } from '../transforms';
import { isVariable } from '../guards';
import { getVariables } from '../eval/substitute';

/**
 * Walk `node` and replace `superscript { base: var('e'), … }` with
 * `superscript { base: euler(), … }`. Other nodes pass through unchanged.
 *
 * Bottom-up traversal via `mapNode` — leaves are processed first, so the
 * transformation is idempotent.
 *
 * Accepted ambiguity : if a user writes `e^α` (with `e` standing for the
 * physical elementary charge and `α` some other parameter), the exponent
 * is unconditionally promoted to Euler. The narrow scope of this helper
 * (only invoked by `solve()` / `solveInequality()`) keeps the blast
 * radius contained ; users who need `e` as a real variable should solve
 * with explicit `options.variable` and an alternate name.
 */
export function promoteEulerSuperscriptBase(node: MathNode): MathNode {
	return mapNode(node, (n) => {
		if (n.type === 'superscript' && n.base.type === 'variable' && n.base.name === 'e') {
			return { ...n, base: euler() };
		}
		return n;
	});
}

/**
 * Apply `promoteEulerSuperscriptBase` to both sides of a `RelationNode`.
 * Returns a new relation node with the same operator and metadata.
 */
export function promoteEulerInRelation(relation: RelationNode): RelationNode {
	return {
		...relation,
		left: promoteEulerSuperscriptBase(relation.left),
		right: promoteEulerSuperscriptBase(relation.right)
	};
}

/**
 * Promeut en `euler()` TOUTE variable `e` de la relation — y compris hors
 * d'un exposant — dès que `e` ne peut pas être l'inconnue.
 *
 * Pourquoi : `promoteEulerInRelation` ne touche que la base de `e^u`. Le `e`
 * seul de `e^x = e` restait une variable : `detectVariable` voyait `{e, x}`,
 * l'équation partait dans le chemin des équations constantes et le moteur
 * affirmait « contradictoire » (avec l'inconnue imposée, la réponse restait
 * `ln(e)`, jamais réduite à 1). C'est la convention de `evaluate`, `compile`
 * et `isEulerBase` (dérivation) : la lettre `e` est lue comme Euler.
 *
 * `e` reste une variable quand elle peut être l'inconnue :
 * - l'inconnue imposée est `e` ;
 * - aucune inconnue imposée et `e` est la SEULE lettre (`e + 1 = 3`).
 * Si une autre inconnue est imposée, ou si une autre lettre est présente,
 * `e` est la constante.
 */
export function promoteStandaloneEulerInRelation(
	relation: RelationNode,
	unknown?: string
): RelationNode {
	if (unknown === 'e') return relation;
	if (unknown === undefined) {
		const names = new Set([...getVariables(relation.left), ...getVariables(relation.right)]);
		if (!names.has('e') || names.size < 2) return relation;
	}
	return {
		...relation,
		left: promoteEulerVariable(relation.left),
		right: promoteEulerVariable(relation.right)
	};
}

/** Remplace chaque variable `e` par la constante `euler()`. */
function promoteEulerVariable(node: MathNode): MathNode {
	return mapNode(node, (n) => (isVariable(n) && n.name === 'e' ? euler() : n));
}
