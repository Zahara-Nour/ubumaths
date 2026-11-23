/**
 * Forme canonique d'une expression, réécrite en arbre (`denormalize ∘ normalize`),
 * et ce qu'on en lit : un rationnel exact, les coefficients d'un polynôme.
 *
 * Usage INTERNE des moteurs (solveurs, intégration, limites) : comparer, lire
 * une valeur exacte, lire des coefficients. Une valeur sans variable réduite
 * ainsi peut être montrée (`\\dfrac{2}{6}` → `\\dfrac{1}{3}`) ; une expression
 * avec variable, jamais (ADR 0032, chantier normalize-usages).
 *
 * @module mathAST/normal/canonical-form
 */

import type { MathNode } from '../types';
import type { Rational } from './types';
import { normalize, type NormalizeContext } from './normalize';
import { denormalize } from './denormalize';
import { extractExactRational, numericNode } from '../common/numeric';
import { getVariables } from '../eval/substitute';
import { getPolynomialDegree } from '../analysis/expression-classify';
import { flattenSumShallow, unflattenSum } from '../flatten';
import { number, fraction, opposite, power, variable as varNode } from '../factory';

/**
 * La forme canonique de `normalize`, réécrite en arbre. Lève si `normalize` lève.
 * `ctx` va tel quel à `normalize` (hypothèses de signe, interruption).
 */
export function canonicalForm(node: MathNode, ctx?: NormalizeContext): MathNode {
	// eslint-disable-next-line no-restricted-syntax -- la définition même de canonicalForm
	return denormalize(normalize(node, ctx));
}

/** Le rationnel exact que vaut `node`, `null` s'il n'en est pas un (ou si `normalize` lève). */
export function exactRational(node: MathNode): Rational | null {
	try {
		return extractExactRational(canonicalForm(node));
	} catch {
		return null;
	}
}

/**
 * Coefficients du polynôme `expr` en `variable`, lus sur sa forme canonique
 * (développée, termes semblables réunis) : `coefficients[k]` est celui de xᵏ.
 * `null` si un terme dépasse `degree` ou si un coefficient dépend encore de x.
 * `(x − 1)²`, degré 2 → `[1, −2, 1]`.
 */
export function polynomialCoefficients(
	expr: MathNode,
	variable: string,
	degree: number
): MathNode[] | null {
	return coefficientsByDegree(canonicalForm(expr), variable, degree);
}

/**
 * Coefficients lus sur l'écriture reçue, terme à terme, sans la développer :
 * un terme non développé (`2(x − 1)`, `(x − 1)²`) laisse x dans un coefficient,
 * et la lecture est refusée (`null`). Chaque coefficient est mis en forme
 * canonique. Les coefficients qui contiennent d'autres lettres (paramètres)
 * restent valables. `null` aussi quand `normalize` lève (`x² + 1/0`) : la
 * lecture ne lève jamais.
 */
export function coefficientsByDegree(
	expr: MathNode,
	variable: string,
	degree: number
): MathNode[] | null {
	const termsByDegree: MathNode[][] = Array.from({ length: degree + 1 }, () => []);
	for (const { sign, term } of flattenSumShallow(expr)) {
		const signedTerm = sign === '-' ? opposite(term) : term;
		const k = termDegree(signedTerm, variable);
		if (k > degree) return null;
		termsByDegree[k].push(signedTerm);
	}
	let coefficients: MathNode[];
	try {
		coefficients = termsByDegree.map((terms, k) => coefficientOfDegree(terms, variable, k));
	} catch {
		return null;
	}
	if (coefficients.some((c) => getVariables(c).has(variable))) return null;
	return coefficients;
}

/** Degré d'un terme en `variable` : `c·xⁿ` lu directement, sinon `getPolynomialDegree`. */
export function termDegree(term: MathNode, variable: string): number {
	if (!getVariables(term).has(variable)) return 0;
	if (term.type === 'opposite') return termDegree(term.operand, variable);
	if (term.type === 'multiplication') {
		const degree = Math.max(
			powerOfVariable(term.left, variable),
			powerOfVariable(term.right, variable)
		);
		if (degree > 0) return degree;
	}
	const direct = powerOfVariable(term, variable);
	if (direct > 0) return direct;
	return getPolynomialDegree(term, variable) ?? 0;
}

/** n pour `x` ou `xⁿ` (n entier écrit), 0 sinon. */
function powerOfVariable(node: MathNode, variable: string): number {
	if (node.type === 'variable' && node.name === variable) return 1;
	if (
		node.type === 'superscript' &&
		node.base.type === 'variable' &&
		node.base.name === variable &&
		node.superscript.type === 'number'
	) {
		const n = parseInt(node.superscript.value, 10);
		if (!isNaN(n)) return n;
	}
	return 0;
}

/** Coefficient de xᵏ : somme des termes de degré k, divisée par xᵏ, en forme canonique. */
export function coefficientOfDegree(
	terms: readonly MathNode[],
	variable: string,
	k: number
): MathNode {
	if (terms.length === 0) return number('0');
	const termSum =
		terms.length === 1
			? terms[0]
			: unflattenSum(terms.map((t) => ({ sign: '+' as const, term: t })))!;
	if (k === 0) return canonicalForm(termSum);
	const divisor = k === 1 ? varNode(variable) : power(varNode(variable), numericNode(k));
	return canonicalForm(fraction(termSum, divisor));
}
