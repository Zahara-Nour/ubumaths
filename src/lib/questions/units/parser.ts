/**
 * Unit System - Parser
 * ====================
 *
 * Parser for extracting quantities (value + unit) from LaTeX expressions.
 *
 * Features:
 * - Extract value and unit from LaTeX using \unit{} wrapper
 * - Parse composite unit expressions (km/h, m.s^-2)
 * - Handle fractions, decimals, scientific notation
 *
 * @module questions/units/parser
 */

import type { Unit, Quantity } from './types';
import { dimensionlessUnit } from './operations';
import { parse as parseUnit } from '$lib/mathAST/units/parser';

// ============================================================================
// LATEX PATTERNS
// ============================================================================

/**
 * Pattern for extracting units from \unit{} wrapper
 *
 * This is the ONLY supported format for units in LaTeX input.
 * MathLive is configured to output units using this macro.
 *
 * Supports nested braces for exponents like s^{-2}.
 *
 * @example
 * \unit{km} → 'km'
 * \unit{m/s} → 'm/s'
 * \unit{kg.m^{-2}} → 'kg.m^{-2}'
 */
const UNIT_PATTERN = /\\unit\{((?:[^{}]|\{[^{}]*\})+)\}/;

/**
 * Pattern for extracting numeric values from LaTeX
 *
 * Matches:
 * - Integers: 5, -10
 * - Decimals: 3.14, -0.5
 * - Fractions: \frac{3}{2}
 * - Scientific notation: 1.5 \times 10^{3}
 */
const VALUE_PATTERNS = {
	// Standard decimal/integer (with optional sign and LaTeX spacing)
	decimal: /(-?\d+(?:[.,]\d+)?)/,

	// LaTeX fraction: \frac{a}{b}
	fraction: /\\frac\{([^}]+)\}\{([^}]+)\}/,

	// Scientific notation: a \times 10^{b} or a \cdot 10^{b}
	scientific: /(-?\d+(?:[.,]\d+)?)\s*(?:\\times|\\cdot)\s*10\^?\{?(-?\d+)\}?/
};

// ============================================================================
// UNICODE SUPERSCRIPT CONVERSION
// ============================================================================

/**
 * Unicode superscript to ASCII digit mapping
 */
const SUPERSCRIPT_TO_DIGIT: Record<string, string> = {
	'\u2070': '0',
	'\u00b9': '1',
	'\u00b2': '2',
	'\u00b3': '3',
	'\u2074': '4',
	'\u2075': '5',
	'\u2076': '6',
	'\u2077': '7',
	'\u2078': '8',
	'\u2079': '9',
	'\u207b': '-'
};

/**
 * Convert Unicode superscripts to ASCII exponent notation
 *
 * @param str - String potentially containing Unicode superscripts
 * @returns String with superscripts converted to ^number format
 *
 * @example
 * normalizeSuperscripts('m\u00b2') // 'm^2'
 * normalizeSuperscripts('s\u207b\u00b2') // 's^-2'
 */
function normalizeSuperscripts(str: string): string {
	// Replace middle dot with standard multiplication dot
	let result = str.replace(/\u00b7/g, '*');

	// Replace superscript sequences with ^number
	const superscriptRegex = /([\u2070\u00b9\u00b2\u00b3\u2074-\u2079\u207b]+)/g;

	result = result.replace(superscriptRegex, (match) => {
		const digits = [...match].map((c) => SUPERSCRIPT_TO_DIGIT[c] ?? c).join('');
		return `^${digits}`;
	});

	return result;
}

// ============================================================================
// LATEX VALUE EXTRACTION
// ============================================================================

/**
 * Extract numeric value from a LaTeX string
 *
 * Handles various formats:
 * - Plain numbers: "5", "3.14", "-10"
 * - Fractions: "\frac{3}{2}"
 * - Scientific: "1.5 \times 10^{3}"
 * - Arithmetic expressions: "3+2", "5*3" (returned as string for CE evaluation)
 *
 * @param latex - LaTeX string containing a numeric value
 * @returns Extracted value as number or string (for unevaluated expressions), or null
 */
function extractValue(latex: string): number | string | null {
	// Trim and normalize
	let str = latex.trim();

	// Replace comma decimal separator with period
	str = str.replace(/,/g, '.');

	// Try scientific notation first
	const scientificMatch = str.match(VALUE_PATTERNS.scientific);
	if (scientificMatch) {
		const base = parseFloat(scientificMatch[1]);
		const exp = parseInt(scientificMatch[2], 10);
		return base * Math.pow(10, exp);
	}

	// Try fraction
	const fractionMatch = str.match(VALUE_PATTERNS.fraction);
	if (fractionMatch) {
		const numerator = extractValue(fractionMatch[1]);
		const denominator = extractValue(fractionMatch[2]);

		if (typeof numerator === 'number' && typeof denominator === 'number' && denominator !== 0) {
			return numerator / denominator;
		}

		// Return as string if we can't evaluate
		return `\\frac{${fractionMatch[1]}}{${fractionMatch[2]}}`;
	}

	// Check if string contains arithmetic operators (but not at the start for negative)
	// This includes expressions like "3+2", "5*3", "10-2"
	if (/[+\-*/]/.test(str.slice(1)) || str.includes('\\times') || str.includes('\\cdot')) {
		// Return as string for ComputeEngine to evaluate
		return str;
	}

	// Try decimal/integer
	const decimalMatch = str.match(VALUE_PATTERNS.decimal);
	if (decimalMatch) {
		return parseFloat(decimalMatch[1]);
	}

	// Check for just a number directly
	const num = parseFloat(str);
	if (!isNaN(num)) {
		return num;
	}

	return null;
}

// ============================================================================
// UNIT EXPRESSION PARSING
// ============================================================================

/**
 * Parse a unit expression string into a Unit type
 *
 * Une seule règle pour toute l'application : la lecture est déléguée à
 * `mathAST/units/parser.ts` (référence : `docs/ref/notation-unites.md`). Seuls
 * les exposants Unicode (`m²`, `s⁻¹`), que MathLive ou un clavier peuvent
 * produire, sont d'abord convertis en `^n`, ainsi que `·` et `×` en `*`.
 *
 * Portée du `/` : il porte sur le symbole qui le suit ou sur un groupe entre
 * parenthèses. `kg/m.s` est ambigu et REFUSÉ (`null`) : écrire `kg/(m.s)`.
 *
 * @param unitStr - Unit expression string (e.g., "km/h", "m.s^-2", "kg.m^2.s^-2")
 * @returns Parsed Unit or null if parsing fails
 *
 * @example Simple units
 * parseUnitExpression('m') // { components: Map{'m' => 1}, coefficient: 1 }
 * parseUnitExpression('km') // { components: Map{'m' => 1}, coefficient: 1000 }
 *
 * @example Composite units
 * parseUnitExpression('km/h') // km.h^-1
 * parseUnitExpression('m.s^-2') // m.s^-2
 * parseUnitExpression('m²') // m^2
 * parseUnitExpression('kg/m.s') // null (ambigu)
 */
export function parseUnitExpression(unitStr: string): Unit | null {
	if (!unitStr || unitStr.trim() === '') {
		return null;
	}

	// Exposants Unicode → ^n, `·` → `*` ; `×` → `*` (inconnu de mathAST)
	const normalized = normalizeSuperscripts(unitStr.trim()).replace(/\u00d7/g, '*');

	return parseUnit(normalized);
}

// ============================================================================
// LATEX UNIT EXTRACTION
// ============================================================================

/**
 * Extract unit string from \unit{} wrapper
 *
 * This is the ONLY supported format for units.
 *
 * @param latex - LaTeX string containing \unit{...}
 * @returns Extracted unit string or null
 *
 * @example
 * extractUnitFromLatex('5\\unit{km}') // 'km'
 * extractUnitFromLatex('3.14\\unit{m/s}') // 'm/s'
 * extractUnitFromLatex('42') // null (no unit)
 */
export function extractUnitFromLatex(latex: string): string | null {
	const match = latex.match(UNIT_PATTERN);
	return match?.[1]?.trim() ?? null;
}

// ============================================================================
// MAIN PARSING FUNCTION
// ============================================================================

/**
 * Parse a LaTeX string to extract value and unit
 *
 * This is the main entry point for parsing quantities from LaTeX input.
 * Expects format: <value>\unit{<unit>} or just <value> for dimensionless.
 *
 * @param latex - LaTeX string containing a quantity
 * @returns Quantity object or null if parsing fails
 *
 * @example
 * parseLatexQuantity('5\\unit{km}')
 * // { value: 5, unit: { components: Map{'m' => 1}, coefficient: 1000 } }
 *
 * parseLatexQuantity('\\frac{3}{2}\\unit{kg}')
 * // { value: 1.5, unit: { components: Map{'g' => 1}, coefficient: 1000 } }
 *
 * parseLatexQuantity('42')
 * // { value: 42, unit: dimensionless }
 */
export function parseLatexQuantity(latex: string): Quantity | null {
	if (!latex || typeof latex !== 'string') {
		return null;
	}

	const str = latex.trim();
	if (!str) {
		return null;
	}

	// Extract unit from \unit{} wrapper
	const unitStr = extractUnitFromLatex(str);

	// Remove \unit{...} to get value part
	const valueStr = str.replace(UNIT_PATTERN, '').trim();

	// Extract numeric value
	const value = valueStr ? extractValue(valueStr) : null;

	if (value === null) {
		return null;
	}

	// Parse unit or return dimensionless
	if (unitStr) {
		const unit = parseUnitExpression(unitStr);
		if (!unit) {
			return null; // Invalid unit expression
		}
		return { value, unit };
	}

	// No unit = dimensionless quantity
	return { value, unit: dimensionlessUnit() };
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Normalize a unit string by converting Unicode to ASCII
 *
 * Useful for comparing units or preparing them for parsing.
 *
 * @param str - Unit string potentially with Unicode
 * @returns Normalized string
 */
export function normalizeUnitString(str: string): string {
	return normalizeSuperscripts(str);
}
