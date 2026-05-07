/**
 * Pedagogical Rules — Radicals
 *
 * Square-root pedagogical transformations following the French curriculum :
 *
 * - **`extractPerfectSquare`** — `√n` where `n` has a square factor `> 1`
 *   → `c√r` with `c² · r = n` (e.g. `√8 → 2√2`, `√18 → 3√2`).
 * - **`multiplyRadicals`** — `√a × √b → √(a·b)`, then post-simplified to
 *   `c√r` if the product has a square factor.
 * - **`rationalizeDenominator`** (Track C) — `c/√n → c·√n / n` when `n` is
 *   NOT a perfect square (precondition C-2). Note the rule engine is
 *   bottom-up (`mapNode` from leaves up), so for `1/√8` the inner
 *   `extractPerfectSquare` fires first (`√8 → 2√2`), giving `1/(2√2)` —
 *   not the canonical `√2/4`. Decision 2A: V1 stops here; matching
 *   `c/(k·√n)` post-extract is out of scope.
 * - **`simplifyRootOfSquare`** (Track C, **opt-in**) — `√(x²) → |x|` for
 *   non-numeric `x`. Off by default (decision C-1); activated via
 *   `enableSquareRootOfSquare: true` in `PedagogicalArithmeticOptions`.
 *   Numeric squares (`√(4²) = √16`) are intentionally left to
 *   `extractPerfectSquare` to avoid a cosmetically wrong `|4|`.
 *
 * Each rule fizzles silently when its preconditions aren't met (return the
 * original node ; engine sees `nodesEqual` and skips).
 *
 * @module mathAST/pedagogical-arithmetic/pedagogical-rules/radicals
 */

import type { MathNode } from '../../types';
import type { MatchBindings, Rule } from '../../pattern/types';
import { P } from '../../pattern/builder';
import { createRule } from '../../pattern/rule';
import { abs, divide, multiply, number, sqrt } from '../../factory';
import { isDivision, isFunction, isNumber, isSuperscript } from '../../guards';
import { simplifyRadical } from '../../normal/radical';
import type { PedagogicalArithmeticRule } from '../types';

// =============================================================================
// Helpers
// =============================================================================

/**
 * If `node` is `sqrt(n)` with `n` a positive integer literal, return the
 * radicand as a `bigint`. Otherwise return `null`.
 */
function asSqrtRadicand(node: MathNode | undefined): bigint | null {
	if (!node) return null;
	if (!isFunction(node) || node.name !== 'sqrt') return null;
	if (node.args.length !== 1) return null;
	const arg = node.args[0];
	if (!isNumber(arg)) return null;
	if (!/^\d+$/.test(arg.value)) return null; // positive integer only
	const n = BigInt(arg.value);
	if (n <= 0n) return null;
	return n;
}

/** Lookup a binding as a `MathNode`. */
function bindingNode(bindings: MatchBindings, name: string): MathNode | undefined {
	const found = bindings.get(name);
	if (!found || 'terms' in found || 'factors' in found) return undefined;
	return found as MathNode;
}

/** Build `c · √r` (cross-style multiplication). When `c === 1n`, returns `√r`. */
function coefficientTimesSqrt(c: bigint, r: bigint): MathNode {
	if (c === 1n) return sqrt(number(r.toString()));
	if (r === 1n) return number(c.toString());
	return multiply(number(c.toString()), sqrt(number(r.toString())), 'implicit');
}

// =============================================================================
// extractPerfectSquare (priority 100)
// =============================================================================

/**
 * `√n → c√r` where `n = c² · r` and `c > 1`. Fizzles when `n` has no
 * non-trivial perfect-square factor (e.g. `√2`, `√5`, `√1`).
 */
function applyExtractPerfectSquare(node: MathNode): MathNode | null {
	const n = asSqrtRadicand(node);
	if (n === null || n <= 1n) return null;
	const result = simplifyRadical(n, 2n);
	if (result.coefficient === 1n) return null; // already simplified
	return coefficientTimesSqrt(result.coefficient, result.radicand);
}

export const extractPerfectSquare: PedagogicalArithmeticRule = {
	name: 'extract-perfect-square',
	rule: createRule(
		P._('s'),
		(bindings) => {
			const s = bindingNode(bindings, 's');
			if (!s) return number('0');
			return applyExtractPerfectSquare(s) ?? s;
		},
		{
			name: 'extract-perfect-square',
			condition: (bindings) => {
				const s = bindingNode(bindings, 's');
				if (!s) return false;
				return applyExtractPerfectSquare(s) !== null;
			}
		}
	),
	applicableLevels: ['college', 'lycee', 'superieur'],
	priority: 100,
	descriptions: {
		college: () => 'On extrait le facteur carré parfait sous la racine',
		lycee: () => 'Extraction du carré parfait',
		superieur: () => 'simpl. √'
	},
	explanations: {
		college: () =>
			'On décompose le nombre sous la racine en produit incluant un carré parfait, puis on extrait celui-ci.'
	}
};

// =============================================================================
// multiplyRadicals (priority 110)
// =============================================================================

/**
 * `√a × √b → c√r` with `c² · r = a · b` and `r ≥ 1`. Coefficient extraction
 * happens here so that `√2 × √8 → √16 → 4` directly without a separate
 * extract step.
 */
function applyMultiplyRadicals(bindings: MatchBindings): MathNode | null {
	const left = bindingNode(bindings, 'l');
	const right = bindingNode(bindings, 'r');
	if (!left || !right) return null;
	const a = asSqrtRadicand(left);
	const b = asSqrtRadicand(right);
	if (a === null || b === null) return null;
	const product = a * b;
	if (product < 1n) return null;
	if (product === 1n) return number('1');
	const result = simplifyRadical(product, 2n);
	return coefficientTimesSqrt(result.coefficient, result.radicand);
}

export const multiplyRadicals: PedagogicalArithmeticRule = {
	name: 'multiply-radicals',
	rule: createRule(
		P.parse('l * r'),
		(bindings) => applyMultiplyRadicals(bindings) ?? (bindingNode(bindings, 'l') as MathNode),
		{
			name: 'multiply-radicals',
			condition: (bindings) => applyMultiplyRadicals(bindings) !== null
		}
	),
	applicableLevels: ['college', 'lycee', 'superieur'],
	priority: 110,
	descriptions: {
		college: () => 'On multiplie les racines (la racine du produit)',
		lycee: () => 'Produit de racines',
		superieur: () => '√·√'
	},
	explanations: {
		college: () =>
			"Pour deux nombres positifs a et b, √a × √b = √(a × b). On extrait ensuite l'éventuel carré parfait."
	}
};

// =============================================================================
// rationalizeDenominator (priority 105) — Track C
// =============================================================================

/**
 * `c/√n → c·√n / n` when `n` is a positive integer that is NOT a perfect
 * square. The precondition (decision C-2) avoids overlap with
 * `extractPerfectSquare`: for `1/√4`, this rule fizzles and `extract` produces
 * `√4 → 2`, leading to `1/2` after pipeline cosmetics.
 *
 * Priority 105 (above extractPerfectSquare's 100) — but the rule engine
 * traverses bottom-up, so this only matters when both rules can match the
 * SAME node. For composite shapes like `1/√8`, extract fires on the inner
 * `√8` sub-node first, yielding `1/(2√2)` (decision 2A — V1 stops here).
 */
function applyRationalizeDenominator(node: MathNode): MathNode | null {
	if (!isDivision(node)) return null;
	const n = asSqrtRadicand(node.denominator);
	if (n === null) return null;
	// Precondition C-2 : n must NOT be a perfect square. We use simplifyRadical:
	// when radicand === 1, n IS a perfect square (e.g. simplifyRadical(4n,2n)
	// = {coefficient:2n, radicand:1n}) — let extractPerfectSquare handle it.
	const simplified = simplifyRadical(n, 2n);
	if (simplified.radicand === 1n) return null;
	const numerator = node.numerator;
	// c·√n / n — multiply numerator by √n, replace denominator by n.
	const newNumerator = multiply(numerator, sqrt(number(n.toString())), 'cross');
	return divide(newNumerator, number(n.toString()), 'fraction');
}

export const rationalizeDenominator: PedagogicalArithmeticRule = {
	name: 'rationalize-denominator',
	rule: createRule(
		P._('s'),
		(bindings) => {
			const s = bindingNode(bindings, 's');
			if (!s) return number('0');
			return applyRationalizeDenominator(s) ?? s;
		},
		{
			name: 'rationalize-denominator',
			condition: (bindings) => {
				const s = bindingNode(bindings, 's');
				if (!s) return false;
				return applyRationalizeDenominator(s) !== null;
			}
		}
	),
	applicableLevels: ['college', 'lycee', 'superieur'],
	priority: 105,
	descriptions: {
		college: () => 'On rend le dénominateur rationnel en multipliant par la racine',
		lycee: () => 'Rationalisation du dénominateur',
		superieur: () => 'rationalise.'
	},
	explanations: {
		college: () =>
			'On multiplie le numérateur et le dénominateur par √n pour faire disparaître la racine du dénominateur (n × √n × √n = n × n).'
	}
};

// =============================================================================
// simplifyRootOfSquare (priority 90, opt-in) — Track C
// =============================================================================

/**
 * `√(x²) → |x|` when `x` is NOT a numeric literal. Numeric squares (e.g.
 * `√(4²) = √16`) are left to `extractPerfectSquare` (priority 100 wins over
 * 90) to avoid producing the cosmetically wrong `|4|`. Decision C-1: this
 * rule is opt-in via `PedagogicalArithmeticOptions.enableSquareRootOfSquare`.
 */
function applyRootOfSquare(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'sqrt') return null;
	if (node.args.length !== 1) return null;
	const arg = node.args[0];
	if (!isSuperscript(arg)) return null;
	// Exponent must be the literal 2.
	if (!isNumber(arg.superscript) || arg.superscript.value !== '2') return null;
	// Skip purely numeric bases — extractPerfectSquare handles those.
	if (isNumber(arg.base)) return null;
	return abs(arg.base);
}

export const simplifyRootOfSquare: PedagogicalArithmeticRule = {
	name: 'simplify-root-of-square',
	rule: createRule(
		P._('s'),
		(bindings) => {
			const s = bindingNode(bindings, 's');
			if (!s) return number('0');
			return applyRootOfSquare(s) ?? s;
		},
		{
			name: 'simplify-root-of-square',
			condition: (bindings) => {
				const s = bindingNode(bindings, 's');
				if (!s) return false;
				return applyRootOfSquare(s) !== null;
			}
		}
	),
	applicableLevels: ['lycee', 'superieur'],
	priority: 90,
	descriptions: {
		lycee: () => 'On simplifie √(x²) en |x| (valeur absolue)',
		superieur: () => '√(·²) = |·|'
	},
	explanations: {
		lycee: () =>
			"Par définition, √(a²) = |a| (la racine carrée d'un carré est la valeur absolue de ce qui est élevé au carré)."
	}
};

// =============================================================================
// Aggregated export
// =============================================================================

/**
 * Rules included in the default pedagogical pipeline. `simplifyRootOfSquare`
 * is intentionally **excluded** here (opt-in via the loader) — see Track C
 * decision C-1.
 */
export const RADICAL_RULES: readonly PedagogicalArithmeticRule[] = [
	multiplyRadicals,
	extractPerfectSquare,
	rationalizeDenominator
];

export type { Rule };
