/**
 * Pedagogical Rules — Powers (Phase 6)
 *
 * Pedagogical handling of integer-exponent powers (`baseⁿ`):
 *
 * - **`expandSmallPower`** — `2³ → 2 × 2 × 2` (primaire / début collège, n ≤ 5).
 *   Pedagogically expands to a product so the student can compute it
 *   step-by-step. The atomic-binary multiplication rule does the rest.
 * - **`combinePowersSameBase`** — `2³ × 2⁵ → 2⁸` (collège 4e+).
 * - **`powerOfPower`** — `(2³)² → 2⁶` (collège 4e+).
 *
 * Each rule fizzles silently when the pattern doesn't match.
 *
 * @module mathAST/pedagogical-arithmetic/pedagogical-rules/powers
 */

import type { MathNode } from '../../types';
import type { MatchBindings, Rule } from '../../pattern/types';
import { P } from '../../pattern/builder';
import { createRule } from '../../pattern/rule';
import { multiply, number, superscript } from '../../factory';
import { isNumber, isSuperscript } from '../../guards';
import type { PedagogicalArithmeticRule } from '../types';

// =============================================================================
// Helpers
// =============================================================================

/**
 * If the node is `b^e` with both `b` and `e` positive integer literals,
 * return `{ b, e }`. Otherwise `null`.
 */
function asIntegerPower(node: MathNode): { b: bigint; e: bigint } | null {
	if (!isSuperscript(node)) return null;
	if (!isNumber(node.base) || !isNumber(node.superscript)) return null;
	if (!/^\d+$/.test(node.base.value) || !/^\d+$/.test(node.superscript.value)) return null;
	return { b: BigInt(node.base.value), e: BigInt(node.superscript.value) };
}

function bindingNode(bindings: MatchBindings, name: string): MathNode | undefined {
	const found = bindings.get(name);
	if (!found || 'terms' in found || 'factors' in found) return undefined;
	return found as MathNode;
}

// =============================================================================
// expandSmallPower (priority 80)
// =============================================================================

/**
 * `bⁿ → b × b × ... × b` when `n` is a "small" positive integer (≤ 5).
 * Larger exponents would produce visually noisy products — they're left
 * to `combinePowersSameBase` (or to the underlying `evaluate(exact)`
 * fallback when used at lycée+).
 */
const SMALL_POWER_THRESHOLD = 5n;

function applyExpandSmallPower(node: MathNode): MathNode | null {
	const power = asIntegerPower(node);
	if (!power) return null;
	if (power.e <= 1n || power.e > SMALL_POWER_THRESHOLD) return null;
	const baseNode = number(power.b.toString());
	let product: MathNode = baseNode;
	for (let i = 1n; i < power.e; i++) {
		product = multiply(product, baseNode, 'cross');
	}
	return product;
}

export const expandSmallPower: PedagogicalArithmeticRule = {
	name: 'expand-small-power',
	rule: createRule(
		P._('p'),
		(bindings) => {
			const p = bindingNode(bindings, 'p');
			if (!p) return number('0');
			return applyExpandSmallPower(p) ?? p;
		},
		{
			name: 'expand-small-power',
			condition: (bindings) => {
				const p = bindingNode(bindings, 'p');
				if (!p) return false;
				return applyExpandSmallPower(p) !== null;
			}
		}
	),
	applicableLevels: ['primaire', 'college'],
	priority: 80,
	descriptions: {
		primaire: () => 'On développe la puissance en produit',
		college: () => 'On écrit la puissance comme un produit'
	}
};

// =============================================================================
// combinePowersSameBase (priority 110)
// =============================================================================

/**
 * `b^a × b^c → b^(a+c)` when both bases match. Uses pattern symmetry to
 * accept either order via the implicit commutative match.
 */
function applyCombinePowersSameBase(bindings: MatchBindings): MathNode | null {
	const left = bindingNode(bindings, 'l');
	const right = bindingNode(bindings, 'r');
	if (!left || !right) return null;
	const lp = asIntegerPower(left);
	const rp = asIntegerPower(right);
	if (!lp || !rp) return null;
	if (lp.b !== rp.b) return null;
	const newExp = lp.e + rp.e;
	return superscript(number(lp.b.toString()), number(newExp.toString()));
}

export const combinePowersSameBase: PedagogicalArithmeticRule = {
	name: 'combine-powers-same-base',
	rule: createRule(
		P.parse('l * r'),
		(bindings) => applyCombinePowersSameBase(bindings) ?? (bindingNode(bindings, 'l') as MathNode),
		{
			name: 'combine-powers-same-base',
			condition: (bindings) => applyCombinePowersSameBase(bindings) !== null
		}
	),
	applicableLevels: ['college', 'lycee', 'superieur'],
	priority: 110,
	descriptions: {
		college: () => 'On additionne les exposants (même base)',
		lycee: () => 'aᵐ × aⁿ = aᵐ⁺ⁿ',
		superieur: () => 'comb. pow.'
	}
};

// =============================================================================
// powerOfPower (priority 120)
// =============================================================================

/**
 * `(b^a)^c → b^(a·c)`.
 */
function applyPowerOfPower(node: MathNode): MathNode | null {
	if (!isSuperscript(node)) return null;
	const inner = asIntegerPower(node.base);
	if (!inner) return null;
	if (!isNumber(node.superscript)) return null;
	if (!/^\d+$/.test(node.superscript.value)) return null;
	const outer = BigInt(node.superscript.value);
	const newExp = inner.e * outer;
	return superscript(number(inner.b.toString()), number(newExp.toString()));
}

export const powerOfPower: PedagogicalArithmeticRule = {
	name: 'power-of-power',
	rule: createRule(
		P._('p'),
		(bindings) => {
			const p = bindingNode(bindings, 'p');
			if (!p) return number('0');
			return applyPowerOfPower(p) ?? p;
		},
		{
			name: 'power-of-power',
			condition: (bindings) => {
				const p = bindingNode(bindings, 'p');
				if (!p) return false;
				return applyPowerOfPower(p) !== null;
			}
		}
	),
	applicableLevels: ['college', 'lycee', 'superieur'],
	priority: 120,
	descriptions: {
		college: () => 'On multiplie les exposants',
		lycee: () => '(aᵐ)ⁿ = aᵐⁿ',
		superieur: () => 'pow. of pow.'
	}
};

// =============================================================================
// Aggregated export
// =============================================================================

export const POWER_RULES: readonly PedagogicalArithmeticRule[] = [
	powerOfPower,
	combinePowersSameBase,
	expandSmallPower
];

export type { Rule };
