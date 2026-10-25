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

import { add, func, multiply, number, subtract, superscript } from '../../factory';
import { isEulerConstant, isFunction } from '../../guards';
import { extractRational } from '../../common/numeric';
import { nodesEqual } from '../../normal/hash';
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
	if (isEulerConstant(node)) return true;
	const value = extractRational(node);
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
	return isNonVanishingBase(l.base) && nodesEqual(l.base, r.base);
}

/** Le nœud lié à `name` ; inatteignable sans lui, `condition` l'a déjà lu. */
function boundNode(bindings: MatchBindings, name: string): MathNode {
	const node = getBindingNode(bindings, name);
	if (node === null) throw new Error(`powers: liaison « ${name} » absente`);
	return node;
}

/** Exactement un des deux facteurs est une puissance (les deux : `same-base-mul`). */
function exactlyOnePower(left: MathNode | null, right: MathNode | null): boolean {
	if (left === null || right === null) return false;
	const powers = [left, right].filter((n) => unwrapDelimiters(n)?.type === 'superscript');
	return powers.length === 1;
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
			const l = asPower(boundNode(bindings, 'l'));
			const r = asPower(boundNode(bindings, 'r'));
			return superscript(l.base, tidy(add(l.exponent, r.exponent)));
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
			const num = asPower(boundNode(bindings, 'num'));
			const den = asPower(boundNode(bindings, 'den'));
			return superscript(num.base, tidy(subtract(num.exponent, den.exponent)));
		},
		{
			name: 'same-base-div',
			condition: (bindings) =>
				sameNonVanishingBase(getBindingNode(bindings, 'num'), getBindingNode(bindings, 'den'))
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
