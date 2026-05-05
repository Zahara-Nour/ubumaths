/**
 * Pedagogical Rules — Fractions (Phase 4)
 *
 * Rules covering the canonical fraction operations of French collège &
 * lycée curricula :
 *
 * - **`addSameDenominator`** — `a/d + c/d → (a+c)/d` (no reduction).
 * - **`toCommonDenominator`** — `a/b + c/d → (a·d′)/L + (c·b′)/L` where
 *   `L = lcm(b, d)` (no further evaluation).
 * - **`multiplyFractions`** — `(a/b) × (c/d) → (a·c)/(b·d)` (no reduction).
 * - **`divideFractions`** — `(a/b) ÷ (c/d) → (a/b) × (d/c)`.
 * - **`reduceFraction`** — `a/b → (a/g)/(b/g)` where `g = gcd(|a|, |b|) > 1`.
 *
 * Rationale (per Phase 0 §Q5) : a single canonical path per `SchoolLevel` —
 * we use **PGCD/LCM** for the common denominator (lycée-friendly). A
 * "multiply directly" variant for early collège can be added later.
 *
 * Each rule fizzles silently (returns the original node) when its
 * preconditions aren't satisfied — the rewrite engine then sees no change.
 *
 * @module mathAST/pedagogical-arithmetic/pedagogical-rules/fractions
 */

import type { MathNode } from '../../types';
import type { MatchBindings, Rule } from '../../pattern/types';
import { P } from '../../pattern/builder';
import { createRule } from '../../pattern/rule';
import { add, divide, multiply, number, opposite } from '../../factory';
import { isDivision, isNumber, isOpposite } from '../../guards';
import { gcd, lcm } from '../../normal/rational';
import { toLatex } from '../../latex-generator';
import type { PedagogicalArithmeticRule } from '../types';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Parse a node as a signed integer (`5`, `-5`, `opposite(5)`). Returns
 * `null` when the node is not an integer atom.
 */
function asInteger(node: MathNode): bigint | null {
	if (isNumber(node)) {
		const v = node.value;
		if (!/^-?\d+$/.test(v)) return null;
		return BigInt(v);
	}
	if (isOpposite(node) && isNumber(node.operand)) {
		const v = node.operand.value;
		if (!/^-?\d+$/.test(v)) return null;
		return -BigInt(v);
	}
	return null;
}

/** Render a `bigint` as a number node, wrapping negatives in an `opposite`. */
function intToNode(n: bigint): MathNode {
	if (n < 0n) return opposite(number((-n).toString()));
	return number(n.toString());
}

/** Build `n/d` as a fraction node, simplifying when `d === 1`. */
function fractionNode(n: bigint, d: bigint): MathNode {
	if (d === 1n) return intToNode(n);
	if (d < 0n) return fractionNode(-n, -d);
	if (n < 0n) return opposite(divide(number((-n).toString()), number(d.toString()), 'fraction'));
	return divide(number(n.toString()), number(d.toString()), 'fraction');
}

/**
 * Pull `(num, den)` out of a structurally-fraction node :
 *   - `a/b` (division node)
 *   - `-(a/b)` (opposite-of-division)
 *
 * Bare integers do NOT count — they would cause add-same-denominator and
 * other fraction rules to fire on `2 + 3`, masking the dedicated atomic
 * binary rules. Returns `null` when the shape isn't an explicit fraction
 * or the denominator is zero.
 */
function asIntegerFraction(node: MathNode): { n: bigint; d: bigint } | null {
	if (isOpposite(node)) {
		const inner = asIntegerFraction(node.operand);
		return inner ? { n: -inner.n, d: inner.d } : null;
	}
	if (isDivision(node)) {
		const n = asInteger(node.numerator);
		const d = asInteger(node.denominator);
		if (n === null || d === null || d === 0n) return null;
		return { n, d };
	}
	return null;
}

/** Lookup a binding as a `MathNode`. Sequence bindings are excluded. */
function bindingNode(bindings: MatchBindings, name: string): MathNode | undefined {
	const found = bindings.get(name);
	if (!found || 'terms' in found || 'factors' in found) return undefined;
	return found as MathNode;
}

/** Render a binding to LaTeX, falling back to `'?'` when missing. */
function bindingLatex(bindings: Record<string, MathNode>, name: string): string {
	const node = bindings[name];
	return node ? toLatex(node) : '?';
}

/**
 * Construct a fraction *without* reduction. Used so a step like
 * `a/b + c/d → (a·d)/(b·d) + (c·b)/(b·d)` displays the unreduced common
 * denominator — the next step (`add-same-denominator`) does the actual
 * addition.
 */
function unreducedFractionNode(n: bigint, d: bigint): MathNode {
	if (d === 1n) return intToNode(n);
	if (d < 0n) return unreducedFractionNode(-n, -d);
	if (n < 0n) {
		return opposite(divide(number((-n).toString()), number(d.toString()), 'fraction'));
	}
	return divide(number(n.toString()), number(d.toString()), 'fraction');
}

// =============================================================================
// addSameDenominator (priority 110)
// =============================================================================

/**
 * `a/d + c/d → (a+c)/d` (denominators must be the same integer literal).
 *
 * The replacement keeps the denominator unreduced — the dedicated
 * `reduceFraction` rule simplifies the result on a separate step.
 */
function applyAddSameDenominator(bindings: MatchBindings): MathNode | null {
	const left = bindingNode(bindings, 'l');
	const right = bindingNode(bindings, 'r');
	if (!left || !right) return null;
	const lf = asIntegerFraction(left);
	const rf = asIntegerFraction(right);
	if (!lf || !rf) return null;
	if (lf.d !== rf.d) return null;
	return unreducedFractionNode(lf.n + rf.n, lf.d);
}

export const addSameDenominator: PedagogicalArithmeticRule = {
	name: 'add-same-denominator',
	rule: createRule(
		P.parse('l + r'),
		(bindings) => applyAddSameDenominator(bindings) ?? (bindingNode(bindings, 'l') as MathNode),
		{
			name: 'add-same-denominator',
			condition: (bindings) => applyAddSameDenominator(bindings) !== null
		}
	),
	applicableLevels: ['primaire', 'college', 'lycee', 'superieur'],
	priority: 110,
	descriptions: {
		primaire: () => 'On additionne les numérateurs',
		college: () => 'On additionne les numérateurs (même dénominateur)',
		lycee: () => 'Addition des numérateurs',
		superieur: () => '+ num.'
	}
};

// =============================================================================
// toCommonDenominator (priority 130)
// =============================================================================

/**
 * `a/b + c/d → (a·d′)/L + (c·b′)/L` with `L = lcm(b, d)`, fired only when
 * `b ≠ d` (else `addSameDenominator` handles it directly).
 */
function applyToCommonDenominator(bindings: MatchBindings): MathNode | null {
	const left = bindingNode(bindings, 'l');
	const right = bindingNode(bindings, 'r');
	if (!left || !right) return null;
	const lf = asIntegerFraction(left);
	const rf = asIntegerFraction(right);
	if (!lf || !rf) return null;
	if (lf.d === rf.d) return null; // same denom → other rule handles
	const L = lcm(lf.d, rf.d);
	const lFactor = L / lf.d;
	const rFactor = L / rf.d;
	const newLeft = unreducedFractionNode(lf.n * lFactor, L);
	const newRight = unreducedFractionNode(rf.n * rFactor, L);
	return add(newLeft, newRight);
}

export const toCommonDenominator: PedagogicalArithmeticRule = {
	name: 'to-common-denominator',
	rule: createRule(
		P.parse('l + r'),
		(bindings) => applyToCommonDenominator(bindings) ?? (bindingNode(bindings, 'l') as MathNode),
		{
			name: 'to-common-denominator',
			condition: (bindings) => applyToCommonDenominator(bindings) !== null
		}
	),
	// Not pertinent for primaire (fractions à dénominateurs distincts pas au programme)
	applicableLevels: ['college', 'lycee', 'superieur'],
	priority: 130,
	descriptions: {
		college: () => 'On met les fractions au même dénominateur',
		lycee: () => 'Mise au même dénominateur',
		superieur: () => 'CD'
	},
	explanations: {
		college: () =>
			'Pour additionner deux fractions, on les écrit avec le même dénominateur (le PPCM des dénominateurs).'
	}
};

// =============================================================================
// multiplyFractions (priority 110)
// =============================================================================

/**
 * `(a/b) × (c/d) → (a·c)/(b·d)` (no reduction). The dedicated
 * `reduceFraction` rule simplifies the result on a separate step.
 */
function applyMultiplyFractions(bindings: MatchBindings): MathNode | null {
	const left = bindingNode(bindings, 'l');
	const right = bindingNode(bindings, 'r');
	if (!left || !right) return null;
	const lf = asIntegerFraction(left);
	const rf = asIntegerFraction(right);
	if (!lf || !rf) return null;
	return unreducedFractionNode(lf.n * rf.n, lf.d * rf.d);
}

export const multiplyFractions: PedagogicalArithmeticRule = {
	name: 'multiply-fractions',
	rule: createRule(
		P.parse('l * r'),
		(bindings) => applyMultiplyFractions(bindings) ?? (bindingNode(bindings, 'l') as MathNode),
		{
			name: 'multiply-fractions',
			condition: (bindings) => applyMultiplyFractions(bindings) !== null
		}
	),
	applicableLevels: ['college', 'lycee', 'superieur'],
	priority: 110,
	descriptions: {
		college: () => 'On multiplie les numérateurs entre eux et les dénominateurs entre eux',
		lycee: () => 'Produit des numérateurs / produit des dénominateurs',
		superieur: () => '×'
	}
};

// =============================================================================
// divideFractions (priority 120)
// =============================================================================

/**
 * `(a/b) ÷ (c/d) → (a/b) × (d/c)` — division becomes multiplication by the
 * reciprocal. The actual multiplication is then handled by
 * `multiplyFractions` on the next pass.
 */
function applyDivideFractions(bindings: MatchBindings): MathNode | null {
	const left = bindingNode(bindings, 'l');
	const right = bindingNode(bindings, 'r');
	if (!left || !right) return null;
	const lf = asIntegerFraction(left);
	const rf = asIntegerFraction(right);
	if (!lf || !rf) return null;
	if (rf.n === 0n) return null;
	const reciprocal = unreducedFractionNode(rf.d, rf.n);
	return multiply(unreducedFractionNode(lf.n, lf.d), reciprocal, 'cross');
}

export const divideFractions: PedagogicalArithmeticRule = {
	name: 'divide-fractions',
	rule: createRule(
		P.parse('l / r'),
		(bindings) => applyDivideFractions(bindings) ?? (bindingNode(bindings, 'l') as MathNode),
		{
			name: 'divide-fractions',
			condition: (bindings) => applyDivideFractions(bindings) !== null
		}
	),
	applicableLevels: ['college', 'lycee', 'superieur'],
	priority: 120,
	descriptions: {
		college: () => "Diviser par une fraction, c'est multiplier par son inverse",
		lycee: () => 'Inversion du diviseur',
		superieur: () => '÷ → ×'
	}
};

// =============================================================================
// reduceFraction (priority 30 — runs after additions/multiplications)
// =============================================================================

/**
 * `a/b → (a/g)/(b/g)` with `g = gcd(|a|, |b|) > 1`. Returns null when the
 * fraction is already in reduced form.
 */
function applyReduceFraction(node: MathNode): MathNode | null {
	const f = asIntegerFraction(node);
	if (!f) return null;
	const absN = f.n < 0n ? -f.n : f.n;
	const g = gcd(absN, f.d);
	if (g <= 1n) return null;
	return fractionNode(f.n / g, f.d / g);
}

export const reduceFraction: PedagogicalArithmeticRule = {
	name: 'reduce-fraction',
	rule: createRule(
		P._('f'),
		(bindings) => {
			const f = bindingNode(bindings, 'f');
			if (!f) return number('0');
			return applyReduceFraction(f) ?? f;
		},
		{
			name: 'reduce-fraction',
			condition: (bindings) => {
				const f = bindingNode(bindings, 'f');
				if (!f) return false;
				return applyReduceFraction(f) !== null;
			}
		}
	),
	applicableLevels: ['college', 'lycee', 'superieur'],
	priority: 30,
	descriptions: {
		primaire: (b) => `On simplifie ${bindingLatex(b, 'f')}`,
		college: () => 'On simplifie la fraction',
		lycee: () => 'Réduction',
		superieur: () => 'red.'
	},
	explanations: {
		college: () => 'On divise numérateur et dénominateur par leur PGCD.'
	}
};

// =============================================================================
// Aggregated export
// =============================================================================

export const FRACTION_RULES: readonly PedagogicalArithmeticRule[] = [
	toCommonDenominator,
	divideFractions,
	addSameDenominator,
	multiplyFractions,
	reduceFraction
];

// Re-exported for convenience.
export type { Rule };
