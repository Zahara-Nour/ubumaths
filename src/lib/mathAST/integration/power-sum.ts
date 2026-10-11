/**
 * Intégrande ramenée à une SOMME de c·xᵖ (c constant, p rationnel exact),
 * pour que la règle de la puissance voie les écritures de classe :
 * c/xⁿ, √x, x·√x, 1/(x√x), (x² + 1)/x, (x³ − 2x + 1)/x², a/x, k/x²…
 *
 * Réécritures admises (justes sur le domaine de l'intégrande) :
 * - √u = u^{1/2}, ᵏ√u = u^{1/k} ;
 * - (c·x^p)^e = c^e·x^{pe} : e entier ; e non entier seulement si c est un
 *   nombre > 0 (√(a·x) ≠ √a·√x quand a < 0) et si e n'a pas un dénominateur
 *   pair avec p un numérateur pair (√(x²) = |x| ≠ x) ;
 * - un dénominateur n'est divisé que s'il est UN monôme (pas de somme).
 *
 * Les puissances d'une somme ne sont pas développées : (x + 1)² reste aux
 * intégrateurs qui la voient comme u′·uⁿ.
 *
 * @module mathAST/integration/power-sum
 */

import type { MathNode } from '../types';
import type { Rational } from '../normal/types';
import {
	isAddition,
	isDelimiter,
	isDivision,
	isFunction,
	isMultiplication,
	isOpposite,
	isSubtraction,
	isSuperscript,
	isVariable,
	isZero
} from '../guards';
import { fraction, power, variable as variableNode } from '../factory';
import { extractExactRational, rationalToNode } from '../common/numeric';
import { addRational, mulRational } from '../normal/rational';
import {
	simplifiedAdd,
	simplifiedDivide,
	simplifiedMultiply,
	simplifiedOpposite,
	simplifiedPower
} from '../common/simplify';
import { containsVariable } from '../common/contains-variable';
import { powerRule } from './rules';

// =============================================================================
// Types
// =============================================================================

/** Un terme c·xᵖ */
export interface PowerTerm {
	readonly coefficient: MathNode;
	readonly exponent: Rational;
}

// =============================================================================
// Constantes
// =============================================================================

/** Au-delà, un produit de sommes n'est pas développé (taille de la primitive) */
const MAX_TERMS = 24;

const ONE_NODE: MathNode = { type: 'number', value: '1' };

// =============================================================================
// Outils
// =============================================================================

function key(r: Rational): string {
	return `${r.n}/${r.d}`;
}

function isOneNode(node: MathNode): boolean {
	const r = extractExactRational(node);
	return r !== null && r.n === r.d;
}

function negate(terms: readonly PowerTerm[]): PowerTerm[] {
	return terms.map((t) => ({ ...t, coefficient: simplifiedOpposite(t.coefficient) }));
}

function multiply(a: readonly PowerTerm[], b: readonly PowerTerm[]): PowerTerm[] | null {
	if (a.length * b.length > MAX_TERMS) return null;
	const product: PowerTerm[] = [];
	for (const s of a) {
		for (const t of b) {
			product.push({
				coefficient: simplifiedMultiply(s.coefficient, t.coefficient),
				exponent: addRational(s.exponent, t.exponent)
			});
		}
	}
	return product;
}

/** (c·x^p)^e, ou null si la réécriture n'est pas juste sur tout le domaine */
function raise(term: PowerTerm, e: Rational): PowerTerm | null {
	const integerExponent = e.d === 1n;
	if (!integerExponent) {
		// c^e·x^{pe} : c > 0 connu (√(a·x) ≠ √a·√x quand a < 0)
		const c = extractExactRational(term.coefficient);
		if (c === null || c.n <= 0n) return null;
		// (x²)^{1/2} = |x|, pas x
		if (e.d % 2n === 0n && term.exponent.n % 2n === 0n) return null;
	}
	if (e.n < 0n && isZero(term.coefficient)) return null;
	return {
		coefficient: isOneNode(term.coefficient)
			? term.coefficient
			: simplifiedPower(term.coefficient, rationalToNode(e)),
		exponent: mulRational(term.exponent, e)
	};
}

/** Indice d'une racine `\sqrt{…}` (2) ou `\sqrt[k]{…}` (k entier ≥ 2), sinon null */
function rootIndex(node: MathNode): bigint | null {
	if (!isFunction(node) || node.name !== 'sqrt' || node.args.length !== 1) return null;
	if (!node.base) return 2n;
	const index = extractExactRational(node.base);
	return index !== null && index.d === 1n && index.n >= 2n ? index.n : null;
}

function decompose(node: MathNode, variable: string): PowerTerm[] | null {
	if (!containsVariable(node, variable)) {
		return [{ coefficient: node, exponent: { n: 0n, d: 1n } }];
	}
	if (isVariable(node)) {
		return node.name === variable ? [{ coefficient: ONE_NODE, exponent: { n: 1n, d: 1n } }] : null;
	}
	if (isDelimiter(node)) return decompose(node.content, variable);
	if (isOpposite(node)) {
		const inner = decompose(node.operand, variable);
		return inner && negate(inner);
	}
	if (isAddition(node) || isSubtraction(node)) {
		const left = decompose(node.left, variable);
		const right = decompose(node.right, variable);
		if (left === null || right === null) return null;
		const terms = [...left, ...(isSubtraction(node) ? negate(right) : right)];
		return terms.length > MAX_TERMS ? null : terms;
	}
	if (isMultiplication(node)) {
		const left = decompose(node.left, variable);
		const right = decompose(node.right, variable);
		return left === null || right === null ? null : multiply(left, right);
	}
	if (isDivision(node)) {
		const numerator = decompose(node.numerator, variable);
		const denominator = decompose(node.denominator, variable);
		if (numerator === null || denominator === null) return null;
		const merged = combine(denominator);
		if (merged.length !== 1 || isZero(merged[0].coefficient)) return null;
		const inverse = raise(merged[0], { n: -1n, d: 1n });
		return inverse === null ? null : multiply(numerator, [inverse]);
	}
	if (isSuperscript(node)) {
		const e = extractExactRational(node.superscript);
		return e === null ? null : raiseSingle(node.base, e, variable);
	}
	const index = rootIndex(node);
	if (index !== null && isFunction(node)) {
		return raiseSingle(node.args[0], { n: 1n, d: index }, variable);
	}
	return null;
}

/** b^e où b se réduit à UN monôme (une somme élevée à une puissance n'est pas développée) */
function raiseSingle(base: MathNode, e: Rational, variable: string): PowerTerm[] | null {
	const terms = decompose(base, variable);
	if (terms === null) return null;
	const merged = combine(terms);
	if (merged.length !== 1) return null;
	const raised = raise(merged[0], e);
	return raised === null ? null : [raised];
}

/** Regroupe les termes de même exposant ; écarte les coefficients nuls */
function combine(terms: readonly PowerTerm[]): PowerTerm[] {
	const byExponent = new Map<string, PowerTerm>();
	for (const term of terms) {
		const previous = byExponent.get(key(term.exponent));
		byExponent.set(
			key(term.exponent),
			previous
				? { ...previous, coefficient: simplifiedAdd(previous.coefficient, term.coefficient) }
				: term
		);
	}
	return [...byExponent.values()].filter((t) => !isZero(t.coefficient));
}

/** L'écriture contient-elle ce que la règle de la puissance ne voit pas seule ? */
function needsRewriting(node: MathNode, variable: string): boolean {
	if (!containsVariable(node, variable)) return false;
	if (isDivision(node) && containsVariable(node.denominator, variable)) return true;
	if (rootIndex(node) !== null) return true;
	if (isMultiplication(node)) return true;
	if (isSuperscript(node) && !(isVariable(node.base) && node.base.name === variable)) return true;
	const children: MathNode[] = isDelimiter(node)
		? [node.content]
		: isOpposite(node)
			? [node.operand]
			: isAddition(node) || isSubtraction(node)
				? [node.left, node.right]
				: [];
	return children.some((child) => needsRewriting(child, variable));
}

// =============================================================================
// API
// =============================================================================

/**
 * Termes c·xᵖ de l'intégrande (regroupés par exposant), ou null si elle
 * n'est pas une somme de puissances de x — ou si son écriture est déjà celle
 * que la règle de la puissance lit (x, xⁿ : rien à réécrire).
 */
export function asPowerSum(expr: MathNode, variable: string): PowerTerm[] | null {
	if (!needsRewriting(expr, variable)) return null;
	const terms = decompose(expr, variable);
	if (terms === null) return null;
	const merged = combine(terms);
	return merged.length === 0 ? null : merged;
}

/**
 * x^{q}/q avec q = p + 1 < 0 non entier, écrit 1/(q·x^{|q|}) : normalize ne
 * lit pas x^{−1/2} comme une puissance de x (il la garde telle quelle)
 */
function negativeFractionalPrimitive(x: MathNode, p: Rational): MathNode | null {
	const q = addRational(p, { n: 1n, d: 1n });
	if (q.n >= 0n || q.d === 1n) return null;
	const magnitude = rationalToNode({ n: -q.n, d: q.d });
	return simplifiedDivide(fraction(ONE_NODE, power(x, magnitude)), rationalToNode(q));
}

/** Une primitive de Σ c·xᵖ : Σ c·x^{p+1}/(p+1), et c·ln|x| pour p = −1 */
export function integratePowerSum(terms: readonly PowerTerm[], variable: string): MathNode {
	const x = variableNode(variable);
	return terms
		.map((term) => {
			const primitive =
				negativeFractionalPrimitive(x, term.exponent) ??
				powerRule(x, rationalToNode(term.exponent), variable);
			return isOneNode(term.coefficient)
				? primitive
				: simplifiedMultiply(term.coefficient, primitive);
		})
		.reduce((sum, term) => simplifiedAdd(sum, term));
}

/** x^{p} écrit comme le lit la règle de la puissance (pour les étapes) */
export function powerSumAsNode(terms: readonly PowerTerm[], variable: string): MathNode {
	const x = variableNode(variable);
	return terms
		.map((term) => {
			const power =
				term.exponent.n === 0n
					? ONE_NODE
					: term.exponent.n === term.exponent.d
						? x
						: simplifiedPower(x, rationalToNode(term.exponent));
			return isOneNode(term.coefficient) ? power : simplifiedMultiply(term.coefficient, power);
		})
		.reduce((sum, term) => simplifiedAdd(sum, term));
}
