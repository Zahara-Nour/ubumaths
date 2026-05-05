/**
 * Pedagogical Rules — Radicals (Phase 5)
 *
 * Square-root pedagogical transformations following the French curriculum :
 *
 * - **`extractPerfectSquare`** — `√n` where `n` has a square factor `> 1`
 *   → `c√r` with `c² · r = n` (e.g. `√8 → 2√2`, `√18 → 3√2`).
 * - **`multiplyRadicals`** — `√a × √b → √(a·b)`, then post-simplified to
 *   `c√r` if the product has a square factor.
 *
 * Out of scope for Phase 5 (left for follow-ups) :
 * - `rationalize-denominator` (`1/√2 → √2/2`) — requires fraction-aware
 *   pattern.
 * - `simplify-square-root-of-square` (`√(a²) → |a|`) — domain-aware,
 *   requires absolute-value handling.
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
import { multiply, number, sqrt } from '../../factory';
import { isFunction, isNumber } from '../../guards';
import { simplifyRadical } from '../../normal/radical';
import type { PedagogicalArithmeticRule } from '../types';

// =============================================================================
// Helpers
// =============================================================================

/**
 * If `node` is `sqrt(n)` with `n` a positive integer literal, return the
 * radicand as a `bigint`. Otherwise return `null`.
 */
function asSqrtRadicand(node: MathNode): bigint | null {
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
// Aggregated export
// =============================================================================

export const RADICAL_RULES: readonly PedagogicalArithmeticRule[] = [
	multiplyRadicals,
	extractPerfectSquare
];

export type { Rule };
