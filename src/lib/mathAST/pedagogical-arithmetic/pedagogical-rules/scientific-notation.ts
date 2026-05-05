/**
 * Pedagogical Rules — Scientific Notation (Phase 6)
 *
 * Conversions between decimal/integer literals and scientific notation
 * (`a × 10ⁿ` with `1 ≤ |a| < 10`), plus arithmetic on scientific forms.
 *
 * - **`toScientificNotation`** — `5_000_000 → 5 × 10⁶`,
 *   `0.000037 → 3.7 × 10⁻⁵`. Fizzles on numbers already in `[1, 10)` form
 *   (so 3.7 stays 3.7, not 3.7 × 10⁰).
 * - **`multiplyScientific`** — `(a × 10ᵐ) × (b × 10ⁿ) → (a·b) × 10^(m+n)`.
 * - **`addScientificSamePower`** — `a × 10ⁿ + b × 10ⁿ → (a+b) × 10ⁿ`.
 *
 * @module mathAST/pedagogical-arithmetic/pedagogical-rules/scientific-notation
 */

import type { MathNode } from '../../types';
import type { MatchBindings, Rule } from '../../pattern/types';
import { P } from '../../pattern/builder';
import { createRule } from '../../pattern/rule';
import { multiply, number, opposite, superscript } from '../../factory';
import { isMultiplication, isNumber, isOpposite, isSuperscript } from '../../guards';
import type { PedagogicalArithmeticRule } from '../types';

// =============================================================================
// Helpers
// =============================================================================

/** True if `node` is the literal number `10`. */
function isLiteralTen(node: MathNode): boolean {
	return isNumber(node) && node.value === '10';
}

/** Read a node as a plain integer exponent. Returns null otherwise. */
function asIntegerExponent(node: MathNode): bigint | null {
	if (isNumber(node) && /^-?\d+$/.test(node.value)) return BigInt(node.value);
	if (isOpposite(node) && isNumber(node.operand) && /^\d+$/.test(node.operand.value)) {
		return -BigInt(node.operand.value);
	}
	return null;
}

/**
 * Try to read `node` as scientific notation `a × 10ⁿ`. Returns
 * `{ a: string, n: bigint }` (where `a` is the original literal text so we
 * preserve `3.7` as-is) or `null`.
 */
function asScientific(node: MathNode): { aLiteral: string; aSign: 1 | -1; n: bigint } | null {
	if (!isMultiplication(node)) return null;
	const { left, right } = node;
	// Right side must be `10ⁿ`
	if (!isSuperscript(right)) return null;
	if (!isLiteralTen(right.base)) return null;
	const n = asIntegerExponent(right.superscript);
	if (n === null) return null;
	// Left side: a number literal (positive or via opposite)
	if (isNumber(left)) {
		return { aLiteral: left.value, aSign: 1, n };
	}
	if (isOpposite(left) && isNumber(left.operand)) {
		return { aLiteral: left.operand.value, aSign: -1, n };
	}
	return null;
}

/** Make the scientific node `a × 10ⁿ`. */
function scientificNode(aLiteral: string, aSign: 1 | -1, n: bigint): MathNode {
	const aNode = aSign === -1 ? opposite(number(aLiteral)) : number(aLiteral);
	const exponent = n < 0n ? opposite(number((-n).toString())) : number(n.toString());
	return multiply(aNode, superscript(number('10'), exponent), 'cross');
}

/** Lookup binding as a `MathNode`. */
function bindingNode(bindings: MatchBindings, name: string): MathNode | undefined {
	const found = bindings.get(name);
	if (!found || 'terms' in found || 'factors' in found) return undefined;
	return found as MathNode;
}

// =============================================================================
// toScientificNotation (priority 100)
// =============================================================================

/**
 * Convert a numeric literal (integer or decimal) to scientific notation.
 *
 * Algorithm (string-level to preserve "3.7" exactly):
 * - Strip leading zeros / leading minus.
 * - Locate the first significant digit ; the resulting `a` is that digit
 *   followed by `.` and the rest of the significant digits.
 * - The exponent is `(position-of-first-significant-digit relative to decimal)`.
 *
 * Examples :
 *   "5000000" → a="5", n=6
 *   "37"      → a="3.7", n=1
 *   "0.000037"→ a="3.7", n=-5
 *   "3.7"     → null (already canonical)
 */
function applyToScientific(node: MathNode): MathNode | null {
	let raw: string;
	let sign: 1 | -1 = 1;
	if (isNumber(node)) {
		raw = node.value;
	} else if (isOpposite(node) && isNumber(node.operand)) {
		raw = node.operand.value;
		sign = -1;
	} else {
		return null;
	}

	// Validate format : optional digits + optional `.digits`
	if (!/^\d+(\.\d+)?$/.test(raw)) return null;
	if (raw === '0' || raw === '0.0') return null;

	// Split into integer + fractional parts
	const [intPart, fracPart = ''] = raw.split('.');
	// Build the digit string + record where the implicit decimal point lies
	// (after `intPart.length` digits when seen as a single string).
	const digits = (intPart + fracPart).replace(/^0+/, '') || '0';
	const dropped = intPart.length + fracPart.length - digits.length;

	// Find the first non-zero digit (position from the left in original raw)
	const firstSigPos = raw.search(/[1-9]/);
	if (firstSigPos < 0) return null;

	// Compute exponent
	let exponent: bigint;
	const decimalPos = raw.indexOf('.');
	if (decimalPos === -1) {
		// integer like "5000000" — exponent is (intPart.length - 1) - leading-zeros
		exponent = BigInt(intPart.replace(/^0+/, '').length - 1);
	} else {
		// decimal — exponent depends on whether first sig digit is before or after `.`
		if (firstSigPos < decimalPos) {
			exponent = BigInt(decimalPos - firstSigPos - 1);
		} else {
			// firstSigPos > decimalPos (e.g. "0.000037" → first sig at pos 6)
			exponent = -BigInt(firstSigPos - decimalPos);
		}
	}

	// Mantissa : single digit + dot + rest of significant digits (trim trailing 0s)
	let mantissa = digits[0];
	const rest = digits.slice(1).replace(/0+$/, '');
	if (rest) mantissa += '.' + rest;

	// If the input was ALREADY in canonical scientific form (single digit
	// optionally followed by .non-zero, exponent 0), don't fizzle-loop.
	if (exponent === 0n && mantissa === raw) return null;

	// Avoid leak of unused variable
	void dropped;

	return scientificNode(mantissa, sign, exponent);
}

export const toScientificNotation: PedagogicalArithmeticRule = {
	name: 'to-scientific-notation',
	rule: createRule(
		P._('n'),
		(bindings) => {
			const n = bindingNode(bindings, 'n');
			if (!n) return number('0');
			return applyToScientific(n) ?? n;
		},
		{
			name: 'to-scientific-notation',
			condition: (bindings) => {
				const n = bindingNode(bindings, 'n');
				if (!n) return false;
				return applyToScientific(n) !== null;
			}
		}
	),
	applicableLevels: ['college', 'lycee', 'superieur'],
	priority: 100,
	descriptions: {
		college: () => 'On écrit en notation scientifique',
		lycee: () => 'Conversion en notation scientifique',
		superieur: () => '→ sci.'
	},
	explanations: {
		college: () =>
			'On déplace la virgule pour obtenir un nombre entre 1 et 10, en compensant par une puissance de 10.'
	}
};

// =============================================================================
// multiplyScientific (priority 110)
// =============================================================================

/**
 * `(a × 10ᵐ) × (b × 10ⁿ) → (a·b) × 10^(m+n)`.
 *
 * Mantissa product is computed as a decimal-string multiplication when both
 * mantissas are integer-only ; for decimal mantissas we currently ignore
 * the rule and let the broader pipeline handle it (out of scope for the
 * MVP). This keeps the rule deterministic and free of float pitfalls.
 */
function applyMultiplyScientific(bindings: MatchBindings): MathNode | null {
	const left = bindingNode(bindings, 'l');
	const right = bindingNode(bindings, 'r');
	if (!left || !right) return null;
	const ls = asScientific(left);
	const rs = asScientific(right);
	if (!ls || !rs) return null;

	// For now : only integer mantissas (no decimal point). Avoid float drift.
	if (ls.aLiteral.includes('.') || rs.aLiteral.includes('.')) return null;

	const a = BigInt(ls.aLiteral) * BigInt(rs.aLiteral);
	const finalSign = ls.aSign * rs.aSign;
	if (a === 0n) return null;

	// `a` may exceed 10 (e.g. 5*4=20). Re-normalize once : split off a power
	// of 10. We avoid recursion : only one pass.
	const aStr = (a < 0n ? -a : a).toString();
	const overflow = aStr.length - 1;
	const newExponent = ls.n + rs.n + BigInt(overflow);
	const mantissaStr =
		overflow === 0
			? aStr
			: aStr[0] + (aStr.length > 1 ? '.' + aStr.slice(1).replace(/0+$/, '') : '');
	// Drop trailing dot if the rest was all zeros
	const cleanMantissa = mantissaStr.endsWith('.') ? mantissaStr.slice(0, -1) : mantissaStr;
	return scientificNode(cleanMantissa, (finalSign === -1 ? -1 : 1) as 1 | -1, newExponent);
}

export const multiplyScientific: PedagogicalArithmeticRule = {
	name: 'multiply-scientific',
	rule: createRule(
		P.parse('l * r'),
		(bindings) => applyMultiplyScientific(bindings) ?? (bindingNode(bindings, 'l') as MathNode),
		{
			name: 'multiply-scientific',
			condition: (bindings) => applyMultiplyScientific(bindings) !== null
		}
	),
	applicableLevels: ['college', 'lycee', 'superieur'],
	priority: 110,
	descriptions: {
		college: () => 'On multiplie les coefficients et on additionne les exposants',
		lycee: () => 'Produit en notation scientifique',
		superieur: () => '×.10ⁿ'
	}
};

// =============================================================================
// addScientificSamePower (priority 110)
// =============================================================================

/**
 * `a × 10ⁿ + b × 10ⁿ → (a+b) × 10ⁿ`. Only fires when exponents match
 * AND both mantissas are integer literals (decimal mantissas would require
 * decimal-string addition, out of scope for the MVP).
 */
function applyAddScientificSamePower(bindings: MatchBindings): MathNode | null {
	const left = bindingNode(bindings, 'l');
	const right = bindingNode(bindings, 'r');
	if (!left || !right) return null;
	const ls = asScientific(left);
	const rs = asScientific(right);
	if (!ls || !rs) return null;
	if (ls.n !== rs.n) return null;
	if (ls.aLiteral.includes('.') || rs.aLiteral.includes('.')) return null;
	const sumLeft = BigInt(ls.aLiteral) * BigInt(ls.aSign);
	const sumRight = BigInt(rs.aLiteral) * BigInt(rs.aSign);
	const sum = sumLeft + sumRight;
	if (sum === 0n) return number('0');
	const sign: 1 | -1 = sum < 0n ? -1 : 1;
	return scientificNode((sign === -1n ? -sum : sum).toString(), sign, ls.n);
}

export const addScientificSamePower: PedagogicalArithmeticRule = {
	name: 'add-scientific-same-power',
	rule: createRule(
		P.parse('l + r'),
		(bindings) => applyAddScientificSamePower(bindings) ?? (bindingNode(bindings, 'l') as MathNode),
		{
			name: 'add-scientific-same-power',
			condition: (bindings) => applyAddScientificSamePower(bindings) !== null
		}
	),
	applicableLevels: ['college', 'lycee', 'superieur'],
	priority: 110,
	descriptions: {
		college: () => 'On additionne les coefficients (même puissance de 10)',
		lycee: () => 'Somme à puissances égales',
		superieur: () => '+ same exp.'
	}
};

// =============================================================================
// Aggregated export
// =============================================================================

export const SCIENTIFIC_NOTATION_RULES: readonly PedagogicalArithmeticRule[] = [
	multiplyScientific,
	addScientificSamePower,
	toScientificNotation
];

export type { Rule };
