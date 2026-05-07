/**
 * Pedagogical Rules — Scientific Notation (Phase 6 + Track D)
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
 * Track D — decimal mantissas: `multiply` and `addSamePower` now support
 * arbitrary decimal mantissas (`2.5 × 10⁴`, `0.001 × 10⁰`, …) without float
 * drift. The internal `Mantissa = { digits: bigint, decimalPos: number }`
 * representation lets all arithmetic stay exact (bigint multiplication +
 * digit alignment for addition + multi-pass renormalization).
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

// =============================================================================
// Decimal-mantissa helpers (Track D)
// =============================================================================

/**
 * Internal representation of a decimal mantissa: `digits / 10^decimalPos`.
 * Sign is carried separately. All arithmetic uses bigint — zero float drift.
 *
 * Examples:
 *   '2.5'   → { digits: 25n, decimalPos: 1 }
 *   '5'     → { digits: 5n,  decimalPos: 0 }
 *   '0.001' → { digits: 1n,  decimalPos: 3 }
 */
interface Mantissa {
	digits: bigint;
	decimalPos: number;
}

/** Parse a non-negative decimal literal into its `Mantissa` form. */
function parseMantissa(literal: string): Mantissa | null {
	if (!/^\d+(\.\d+)?$/.test(literal)) return null;
	const dot = literal.indexOf('.');
	if (dot < 0) {
		// integer
		return { digits: BigInt(literal), decimalPos: 0 };
	}
	const intPart = literal.slice(0, dot);
	const fracPart = literal.slice(dot + 1);
	const concat = (intPart + fracPart).replace(/^0+/, '') || '0';
	return { digits: BigInt(concat), decimalPos: fracPart.length };
}

/**
 * Format a `Mantissa` back to its canonical decimal string. Strips trailing
 * zeros after the decimal point and the dot itself when nothing remains.
 *
 * Examples:
 *   { 25n,  1 } → '2.5'
 *   { 125n, 2 } → '1.25'
 *   { 5n,   0 } → '5'
 *   { 50n,  1 } → '5'
 *   { 100n, 2 } → '1'
 */
function formatMantissa(m: Mantissa): string {
	const digitStr = m.digits.toString();
	if (m.decimalPos === 0) return digitStr;
	if (digitStr.length <= m.decimalPos) {
		// e.g. digits=5, decimalPos=2 → '0.05'
		const padded = digitStr.padStart(m.decimalPos, '0');
		const trimmed = ('0.' + padded).replace(/0+$/, '').replace(/\.$/, '');
		return trimmed === '' || trimmed === '0.' ? '0' : trimmed;
	}
	const intPart = digitStr.slice(0, digitStr.length - m.decimalPos);
	const fracPart = digitStr.slice(digitStr.length - m.decimalPos).replace(/0+$/, '');
	return fracPart ? intPart + '.' + fracPart : intPart;
}

/** `(a · 10⁻ᵖ) × (b · 10⁻ᵠ) = (a·b) · 10⁻⁽ᵖ⁺ᵠ⁾`. */
function multiplyMantissas(a: Mantissa, b: Mantissa): Mantissa {
	return { digits: a.digits * b.digits, decimalPos: a.decimalPos + b.decimalPos };
}

/**
 * Add two mantissas with their respective signs. Result carries its own sign.
 * Aligns decimalPos by scaling the smaller-precision operand.
 *
 * Returns `{ mantissa: Mantissa, sign: 1 | -1 | 0 }` (sign 0 = exact zero).
 */
function addSignedMantissas(
	a: Mantissa,
	aSign: 1 | -1,
	b: Mantissa,
	bSign: 1 | -1
): { mantissa: Mantissa; sign: 1 | -1 | 0 } {
	const targetPos = Math.max(a.decimalPos, b.decimalPos);
	const aScaled = a.digits * 10n ** BigInt(targetPos - a.decimalPos);
	const bScaled = b.digits * 10n ** BigInt(targetPos - b.decimalPos);
	const sum = aScaled * BigInt(aSign) + bScaled * BigInt(bSign);
	if (sum === 0n) return { mantissa: { digits: 0n, decimalPos: 0 }, sign: 0 };
	const sign: 1 | -1 = sum < 0n ? -1 : 1;
	return { mantissa: { digits: sum < 0n ? -sum : sum, decimalPos: targetPos }, sign };
}

/**
 * Renormalise `mantissa × 10^exponent` so that `1 ≤ |mantissa| < 10`.
 * Loops over multiple passes for deep underflow (e.g. `0.001 × 10⁰` needs
 * 3 passes to reach `1 × 10⁻³`). Mantissa value is `digits / 10^decimalPos`.
 *
 * **Note**: the overflow path increments `decimalPos` without reducing
 * `digits`, so the returned `Mantissa` may be non-minimal (e.g. result
 * `10` may be represented as `{ digits: 10n, decimalPos: 1 }` rather than
 * `{ digits: 1n, decimalPos: 0 }`). `formatMantissa` handles both forms
 * correctly. Callers MUST treat normalize as the terminal step — feeding
 * its output back into `multiplyMantissas` would inflate `digits`
 * unnecessarily, although still correct.
 *
 * Returns `null` when mantissa is zero (caller short-circuits).
 */
function normalizeScientific(
	mantissa: Mantissa,
	exponent: bigint
): { mantissa: Mantissa; exponent: bigint } | null {
	if (mantissa.digits === 0n) return null;
	let m = mantissa;
	let e = exponent;

	// Normalize exponent up while |m| ≥ 10. Numerically: digits ≥ 10^(decimalPos+1).
	// Each pass: increment decimalPos (= divide value by 10), increment e.
	while (m.digits >= 10n ** BigInt(m.decimalPos + 1)) {
		m = { digits: m.digits, decimalPos: m.decimalPos + 1 };
		e = e + 1n;
	}

	// Normalize exponent down while |m| < 1. Numerically: digits < 10^decimalPos.
	// Each pass: decrement decimalPos when possible (= multiply by 10), or
	// equivalently, divide digits by 10 if trailing zero. We keep digits
	// constant and decrement decimalPos when decimalPos > 0; otherwise we
	// can't go lower without scaling digits up. But digits >= 1, so once
	// decimalPos == 0, |m| >= 1 always.
	while (m.decimalPos > 0 && m.digits < 10n ** BigInt(m.decimalPos)) {
		m = { digits: m.digits, decimalPos: m.decimalPos - 1 };
		e = e - 1n;
	}

	return { mantissa: m, exponent: e };
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
 * Track D: supports decimal mantissas exactly via the `Mantissa` bigint
 * representation and `normalizeScientific`. No float drift.
 */
function applyMultiplyScientific(bindings: MatchBindings): MathNode | null {
	const left = bindingNode(bindings, 'l');
	const right = bindingNode(bindings, 'r');
	if (!left || !right) return null;
	const ls = asScientific(left);
	const rs = asScientific(right);
	if (!ls || !rs) return null;

	const lm = parseMantissa(ls.aLiteral);
	const rm = parseMantissa(rs.aLiteral);
	if (!lm || !rm) return null;

	const productMantissa = multiplyMantissas(lm, rm);
	if (productMantissa.digits === 0n) return null;

	const finalSign = (ls.aSign * rs.aSign === -1 ? -1 : 1) as 1 | -1;
	const baseExponent = ls.n + rs.n;
	const normalized = normalizeScientific(productMantissa, baseExponent);
	if (!normalized) return null;

	return scientificNode(formatMantissa(normalized.mantissa), finalSign, normalized.exponent);
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
 * `a × 10ⁿ + b × 10ⁿ → (a+b) × 10ⁿ`. Fires when exponents match.
 *
 * Track D: supports decimal mantissas exactly (signed bigint addition with
 * decimalPos alignment, then renormalization).
 */
function applyAddScientificSamePower(bindings: MatchBindings): MathNode | null {
	const left = bindingNode(bindings, 'l');
	const right = bindingNode(bindings, 'r');
	if (!left || !right) return null;
	const ls = asScientific(left);
	const rs = asScientific(right);
	if (!ls || !rs) return null;
	if (ls.n !== rs.n) return null;

	const lm = parseMantissa(ls.aLiteral);
	const rm = parseMantissa(rs.aLiteral);
	if (!lm || !rm) return null;

	const { mantissa, sign } = addSignedMantissas(lm, ls.aSign, rm, rs.aSign);
	if (sign === 0) return number('0');

	const normalized = normalizeScientific(mantissa, ls.n);
	if (!normalized) return number('0');

	return scientificNode(formatMantissa(normalized.mantissa), sign, normalized.exponent);
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
