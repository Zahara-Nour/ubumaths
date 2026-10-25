/**
 * Power/Exponent Simplification Rules using Pattern Matching
 *
 * Provides a set of rules for simplifying power (exponent) expressions.
 * These rules cover basic exponent properties.
 *
 * @example
 * ```typescript
 * import { powerRules } from './powers';
 * import { applyRules } from '../rule';
 *
 * const node = superscript(variable('x'), number('1'));
 * const simplified = applyRules(powerRules, node);
 * // simplified is now variable('x')
 * ```
 */

import { add, fraction, func, multiply, number, subtract, superscript } from '../../factory';
import { isEulerConstant, isFunction } from '../../guards';
import { extractRational } from '../../common/numeric';
import { nodesEqual } from '../../normal/hash';
import {
	flattenProductShallow,
	flattenSumShallow,
	unflattenProduct,
	unflattenSum
} from '../../flatten';
import type { FlatProduct } from '../../flatten';
import { tidy } from '../../tidy';
import type { MathNode } from '../../types';
import { P } from '../builder';
import { tryMatch } from '../match';
import { createRule, instantiate } from '../rule';
import { isPlainSqrt } from './sqrt';
import { getBindingNode } from '../types';
import type { Rule, MatchBindings, SumPatternElement } from '../types';
import { isMathNodeBinding } from '../types';

// =============================================================================
// Helper Conditions
// =============================================================================

/**
 * Condition: The bound value 'x' is not the number 0.
 */
function isNotZero(bindings: MatchBindings): boolean {
	const x = bindings.get('x');
	if (!x || !isMathNodeBinding(x)) return true;
	return !(x.type === 'number' && x.value === '0');
}

/** Le motif du radicande de `√(a²)`. */
const SQUARE: SumPatternElement = P.pow(P._('a'), P.num(2));

/** `a` quand le nœud est la racine carrée `√(a²)`, sinon `null`. */
function squaredRadicandBase(root: MathNode | null): MathNode | null {
	if (root === null || !isPlainSqrt(root) || !isFunction(root) || root.power !== undefined)
		return null;
	const bindings = tryMatch(SQUARE, root.args[0]);
	return bindings === undefined ? null : getBindingNode(bindings, 'a');
}

/**
 * Une base qui ne s'annule jamais : `e`, un rationnel positif. Diviser par
 * `xⁿ` supposerait x ≠ 0 — `x³/x² → x` passe par la réduction de fraction, qui
 * le dit (Q4) ; même restriction que le regroupement de `tidy` (Q29).
 */
function isNonVanishingBase(node: MathNode): boolean {
	const bare = unwrapDelimiters(node) ?? node;
	if (isEulerConstant(bare)) return true;
	if (bare.type === 'division')
		return isNonVanishingBase(bare.numerator) && isNonVanishingBase(bare.denominator);
	const value = extractRational(bare);
	return value !== null && value.n > 0n;
}

/** La base et l'exposant d'un facteur : `aⁿ` → (a, n), `a` → (a, 1). */
function asPower(node: MathNode): { readonly base: MathNode; readonly exponent: MathNode } {
	const bare = unwrapDelimiters(node) ?? node;
	return bare.type === 'superscript'
		? { base: bare.base, exponent: bare.superscript }
		: { base: bare, exponent: number(1) };
}

/** `aᵐ` et `aⁿ` (ou `a`) de même base qui ne s'annule pas. */
function sameNonVanishingBase(left: MathNode | null, right: MathNode | null): boolean {
	if (left === null || right === null) return false;
	const l = asPower(left);
	const r = asPower(right);
	// `(1/2)^x` et `(1/2)` : même base, parenthèses mises à part
	const lBase = unwrapDelimiters(l.base) ?? l.base;
	const rBase = unwrapDelimiters(r.base) ?? r.base;
	return isNonVanishingBase(lBase) && nodesEqual(lBase, rBase);
}

/** La base écrite de la puissance (`(1/2)` de `(1/2)^x`, parenthèses gardées). */
function writtenBase(left: MathNode, right: MathNode): MathNode {
	const power = [left, right].find((n) => unwrapDelimiters(n)?.type === 'superscript');
	return asPower(power ?? left).base;
}

/**
 * L'exposant `m ± n`, réduit : `tidy` seul garderait `x − (x + 1)` tel qu'écrit
 * (Q40) ; la somme est d'abord ouverte, `x − x − 1 → −1` (revue de #1743).
 */
function reducedExponent(sum: MathNode): MathNode {
	return tidy(unflattenSum(flattenSumShallow(sum)) ?? sum);
}

/** Le nœud lié à `name` ; inatteignable sans lui, `condition` l'a déjà lu. */
function boundNode(bindings: MatchBindings, name: string): MathNode {
	const node = getBindingNode(bindings, name);
	if (node === null) throw new Error(`powers: liaison « ${name} » absente`);
	return node;
}

/**
 * Un quotient de puissances, pas une fraction de nombres : au moins une
 * puissance, et une base `e` ou un exposant non numérique. `2/2` et `2/2²`
 * restent à la réduction de fraction, comme `6/2` (revue de #1743).
 */
function isPowerQuotient(num: MathNode | null, den: MathNode | null): boolean {
	if (num === null || den === null) return false;
	if (![num, den].some((n) => unwrapDelimiters(n)?.type === 'superscript')) return false;
	const base = unwrapDelimiters(asPower(num).base);
	if (base !== null && isEulerConstant(base)) return true;
	return [num, den].some((n) => extractRational(asPower(n).exponent) === null);
}

/** Exactement un des deux facteurs est une puissance (les deux : `same-base-mul`). */
function exactlyOnePower(left: MathNode | null, right: MathNode | null): boolean {
	if (left === null || right === null) return false;
	const powers = [left, right].filter((n) => unwrapDelimiters(n)?.type === 'superscript');
	return powers.length === 1;
}

/**
 * Deux facteurs de même base, non voisins, à regrouper (M2, journal § 93) :
 * au moins une puissance ; un nombre seul ne rejoint pas une puissance de sa
 * base (`2ˣ·3·2` reste `6 × 2ˣ`, les nombres se calculent d'abord).
 */
function isSpreadPair(left: MathNode, right: MathNode): boolean {
	const powers = [left, right].filter((n) => unwrapDelimiters(n)?.type === 'superscript');
	if (powers.length === 0 || !sameNonVanishingBase(left, right)) return false;
	const base = unwrapDelimiters(asPower(left).base);
	return powers.length === 2 || (base !== null && isEulerConstant(base));
}

/** Le facteur `i` remplacé par `node`, le facteur `j` retiré (j ≠ i). */
function replaceAndDrop(factors: FlatProduct, i: number, node: MathNode, j = -1): FlatProduct {
	return factors.map((f, k) => (k === i ? { ...f, factor: node } : f)).filter((_, k) => k !== j);
}

/** `aᵐ · … · aⁿ` → `aᵐ⁺ⁿ · …`, ou null sans paire non voisine. */
function regroupProduct(left: MathNode, right: MathNode): MathNode | null {
	const factors = [...flattenProductShallow(left), ...flattenProductShallow(right)];
	// deux facteurs : `same-base-mul` et `same-base-mul-bare`
	if (factors.length < 3) return null;
	for (let i = 0; i < factors.length; i++) {
		for (let j = i + 1; j < factors.length; j++) {
			const a = factors[i].factor;
			const b = factors[j].factor;
			if (!isSpreadPair(a, b)) continue;
			const exponent = reducedExponent(add(asPower(a).exponent, asPower(b).exponent));
			// le regroupement prend la place de la puissance : `e·x·eˣ → x·e^{x+1}`
			const [keep, drop] = unwrapDelimiters(a)?.type === 'superscript' ? [i, j] : [j, i];
			const merged = unflattenProduct(
				replaceAndDrop(factors, keep, superscript(writtenBase(a, b), exponent), drop)
			);
			// les `×` tapés restaient : `2·x·e^{x+1}` s'écrivait `2 × x × e^{x+1}`
			return merged === null ? null : tidy(merged);
		}
	}
	return null;
}

/** `k·aᵐ / (k'·aⁿ)` → `k·aᵐ⁻ⁿ / k'`, ou null sans paire. */
function regroupQuotient(num: MathNode, den: MathNode): MathNode | null {
	const numFactors = flattenProductShallow(num);
	const denFactors = flattenProductShallow(den);
	// un facteur de chaque côté : `same-base-div`
	if (numFactors.length === 1 && denFactors.length === 1) return null;
	for (let i = 0; i < numFactors.length; i++) {
		for (let j = 0; j < denFactors.length; j++) {
			const a = numFactors[i].factor;
			const b = denFactors[j].factor;
			if (!isPowerQuotient(a, b) || !sameNonVanishingBase(a, b)) continue;
			const exponent = reducedExponent(subtract(asPower(a).exponent, asPower(b).exponent));
			const newNum = unflattenProduct(
				replaceAndDrop(numFactors, i, superscript(writtenBase(a, b), exponent))
			);
			const newDen = unflattenProduct(replaceAndDrop(denFactors, -1, b, j));
			if (newNum === null) return null;
			return tidy(newDen === null ? newNum : fraction(newNum, newDen));
		}
	}
	return null;
}

// =============================================================================
// Power Rules
// =============================================================================

/**
 * Power/exponent simplification rules.
 *
 * Rules included:
 * - x^1 = x (power of one)
 * - x^0 = 1 (power of zero, x != 0)
 * - 1^x = 1 (one to any power)
 * - 0^x = 0 (zero to positive power)
 * - (-1)^n = 1 (n even), (-1)^n = -1 (n odd)
 * - (-a)^n = a^n (n even)
 * - (-a)^n = -(a^n) (n odd)
 * - sqrt(x^2) = |x|
 * - (sqrt(x))^2 = x
 * - (a^m)^n = a^(m*n) (power of power)
 * - a^m * a^n = a^(m+n) (same base product)
 * - a^m * a = a^(m+1), a^m / a^n = a^(m-n) (base e or positive rational)
 * - the same, between non-adjacent factors (`x·eˣ·e`, `3e^{2x}/eˣ`)
 * - (a/b)^n = a^n / b^n (power of quotient)
 * - x^(-1) = 1/x (negative one exponent)
 */

/**
 * Retire les délimiteurs d'un nœud.
 *
 * ⚠️ `parseLatex('(e^x)^3')` rend `pow(paren(pow(e, x)), 3)` : le délimiteur
 * empêchait le motif de voir la puissance intérieure, et la règle ne se
 * déclenchait jamais sur l'écriture que l'élève produit. `(x²)³` passait quand
 * même, mais par la forme normale, qui sait réduire un exposant RATIONNEL — pas
 * un exposant symbolique.
 */
function unwrapDelimiters(node: MathNode | null): MathNode | null {
	let current = node;
	while (current !== null && current.type === 'delimiter') current = current.content;
	return current;
}

/**
 * Construit le motif de remplacement, puis met son EXPOSANT au propre.
 *
 * Les règles de puissances assemblent une somme ou un produit d'exposants et
 * s'arrêtent là. Personne ne les réduit ensuite : l'exposant vit à l'intérieur
 * d'une base que la forme normale traite comme opaque, et n'est donc jamais
 * visité. `tidy` le met au propre sans rien développer.
 */
function tidyExponent(pattern: SumPatternElement, bindings: MatchBindings): MathNode {
	const built = instantiate(pattern, bindings);
	if (built.type !== 'superscript') return built;
	return { ...built, superscript: tidy(built.superscript) };
}

export const powerRules: readonly Rule[] = [
	// x^1 = x (power of one)
	createRule(P.pow(P._('x'), P.num(1)), P._('x'), {
		name: 'pow-one'
	}),

	// x^0 = 1 (power of zero, where x is nonzero)
	// Uses condition to prevent 0^0 which is undefined
	createRule(P.pow(P._('x'), P.num(0)), P.num(1), {
		name: 'pow-zero',
		condition: isNotZero
	}),

	// 1^x = 1 (one to any power)
	createRule(P.pow(P.num(1), P._('x')), P.num(1), {
		name: 'one-pow'
	}),

	// 0^x = 0 (zero to positive power)
	// Uses isPositive constraint to ensure exponent is positive
	createRule(P.pow(P.num(0), P._('x', P.isPositive())), P.num(0), {
		name: 'zero-pow'
	}),

	// (-1)^n = 1 (when n is even)
	createRule(P.pow(P.neg(P.num(1)), P._('n', P.isEven())), P.num(1), {
		name: 'neg-one-pow-even'
	}),

	// (-1)^n = -1 (when n is odd)
	createRule(P.pow(P.neg(P.num(1)), P._('n', P.isOdd())), P.neg(P.num(1)), {
		name: 'neg-one-pow-odd'
	}),

	// (-a)^n = a^n (when n is even, sign cancels)
	createRule(P.pow(P.neg(P._('a')), P._('n', P.isEven())), P.pow(P._('a'), P._('n')), {
		name: 'neg-base-pow-even'
	}),

	// (-a)^n = -(a^n) (when n is odd, sign passes through)
	createRule(P.pow(P.neg(P._('a')), P._('n', P.isOdd())), P.neg(P.pow(P._('a'), P._('n'))), {
		name: 'neg-base-pow-odd'
	}),

	// sqrt(x^2) = |x| — racine CARRÉE seulement : `P.func('sqrt', …)` ignore
	// l'indice (`base`), et `∛(x²)` devenait `|x|` (lot 5a de simplify-carte,
	// dérivée de x·∛x). Même angle mort que `sqrt-product` (voir `isPlainSqrt`).
	createRule(
		P._('root', P.custom(isPlainSqrt, 'racine carrée')),
		(bindings) => {
			const base = squaredRadicandBase(getBindingNode(bindings, 'root'));
			// Inatteignable : `condition` a déjà exigé √(a²).
			if (base === null) throw new Error('sqrt-square: radicande carré absent');
			return func('abs', [base]);
		},
		{
			name: 'sqrt-square',
			condition: (bindings) => squaredRadicandBase(getBindingNode(bindings, 'root')) !== null
		}
	),

	// (sqrt(x))^2 = x (squaring undoes square root; x >= 0 implied by sqrt)
	// Racine carrée seulement : `(∛x)²` ne vaut pas x.
	createRule(
		P.pow(P._('root', P.custom(isPlainSqrt, 'racine carrée')), P.num(2)),
		(bindings) => {
			const root = getBindingNode(bindings, 'root');
			// Inatteignable : la contrainte a déjà exigé une racine carrée.
			if (root === null || !isFunction(root)) throw new Error('square-sqrt: racine absente');
			return root.args[0];
		},
		{ name: 'square-sqrt' }
	),

	// (a^m)^n = a^(m*n) (power of a power)
	//
	// ⚠️ L'exposant est mis au propre. Sans ça, `(e^x)^3` rendait `e^x^3` — une
	// écriture qui ne se relit même pas — au lieu de `e^{3x}` : la règle
	// construisait le produit des exposants et personne ne le réduisait ensuite,
	// l'exposant vivant à l'intérieur d'une base opaque.
	createRule(
		P.pow(P._('inner'), P._('n')),
		(bindings) => {
			const inner = unwrapDelimiters(getBindingNode(bindings, 'inner'));
			const outer = getBindingNode(bindings, 'n');
			// Inatteignable : `condition` a déjà exigé une puissance à l'intérieur.
			if (inner === null || inner.type !== 'superscript' || outer === null) {
				throw new Error('pow-of-pow: puissance intérieure absente');
			}
			return {
				type: 'superscript',
				base: inner.base,
				superscript: tidy(multiply(inner.superscript, outer, 'implicit'))
			};
		},
		{
			name: 'pow-of-pow',
			condition: (bindings) => {
				const inner = unwrapDelimiters(getBindingNode(bindings, 'inner'));
				return inner !== null && inner.type === 'superscript';
			}
		}
	),

	// a^m * a^n = a^(m+n) (same base, sum of exponents)
	//
	// ⚠️ Même raison : `e^x · e^{2x}` rendait `e^{x + 2x}` au lieu de `e^{3x}`.
	createRule(
		P.mul(P.pow(P._('a'), P._('m')), P.pow(P._('a'), P._('n'))),
		(bindings) => tidyExponent(P.pow(P._('a'), P.add(P._('m'), P._('n'))), bindings),
		{ name: 'same-base-mul' }
	),

	// aᵐ · a = aᵐ⁺¹ (Q48, lot 5f-5 de simplify-carte : `eˣ·e → e^{x+1}`) — base
	// qui ne s'annule pas, comme le quotient
	createRule(
		P.mul(P._('l'), P._('r')),
		(bindings) => {
			const left = boundNode(bindings, 'l');
			const right = boundNode(bindings, 'r');
			const exponent = reducedExponent(add(asPower(left).exponent, asPower(right).exponent));
			return superscript(writtenBase(left, right), exponent);
		},
		{
			name: 'same-base-mul-bare',
			condition: (bindings) => {
				const l = getBindingNode(bindings, 'l');
				const r = getBindingNode(bindings, 'r');
				return exactlyOnePower(l, r) && sameNonVanishingBase(l, r);
			}
		}
	),

	// aᵐ / aⁿ = aᵐ⁻ⁿ (Q48 : `e^{2x}/eˣ → eˣ`, `e/eˣ → e^{1−x}`) — base qui ne
	// s'annule pas
	createRule(
		P.div(P._('num'), P._('den')),
		(bindings) => {
			const num = boundNode(bindings, 'num');
			const den = boundNode(bindings, 'den');
			const exponent = reducedExponent(subtract(asPower(num).exponent, asPower(den).exponent));
			return superscript(writtenBase(num, den), exponent);
		},
		{
			name: 'same-base-div',
			condition: (bindings) => {
				const num = getBindingNode(bindings, 'num');
				const den = getBindingNode(bindings, 'den');
				return isPowerQuotient(num, den) && sameNonVanishingBase(num, den);
			}
		}
	),

	// M2 (journal § 93) : `x·eˣ·e → x·e^{x+1}` — deux facteurs de même base
	// séparés par d'autres, formes fréquentes des dérivées
	createRule(
		P.mul(P._('l'), P._('r')),
		(bindings) => {
			const merged = regroupProduct(boundNode(bindings, 'l'), boundNode(bindings, 'r'));
			if (merged === null) throw new Error('powers: condition de same-base-mul-spread non tenue');
			return merged;
		},
		{
			name: 'same-base-mul-spread',
			condition: (bindings) => {
				const l = getBindingNode(bindings, 'l');
				const r = getBindingNode(bindings, 'r');
				return l !== null && r !== null && regroupProduct(l, r) !== null;
			}
		}
	),

	// M2 : `3e^{2x}/eˣ → 3eˣ`, `e^{2x}/(3eˣ) → eˣ/3` — mêmes conditions que
	// `same-base-div`, sur un facteur de chaque côté
	createRule(
		P.div(P._('num'), P._('den')),
		(bindings) => {
			const merged = regroupQuotient(boundNode(bindings, 'num'), boundNode(bindings, 'den'));
			if (merged === null) throw new Error('powers: condition de same-base-div-spread non tenue');
			return merged;
		},
		{
			name: 'same-base-div-spread',
			condition: (bindings) => {
				const num = getBindingNode(bindings, 'num');
				const den = getBindingNode(bindings, 'den');
				return num !== null && den !== null && regroupQuotient(num, den) !== null;
			}
		}
	),

	// (a/b)^n = a^n / b^n (power distributes over quotient)
	createRule(
		P.pow(P.div(P._('a'), P._('b')), P._('n')),
		P.div(P.pow(P._('a'), P._('n')), P.pow(P._('b'), P._('n'))),
		{ name: 'pow-of-quotient' }
	),

	// x^(-1) = 1/x (reciprocal)
	createRule(P.pow(P._('x'), P.neg(P.num(1))), P.div(P.num(1), P._('x')), {
		name: 'pow-neg-one'
	})
] as const;
