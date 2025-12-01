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
import { createUnit, multiplyUnits, divideUnits, powerUnit, dimensionlessUnit } from './operations';
import { resolveUnit } from './definitions';
import { tokenize, type Token } from './tokenizer';

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
 * Uses the tokenizer to break down the expression and builds the Unit
 * using operations (multiply, divide, power).
 *
 * Precedence rules:
 * - ^ (power) highest
 * - *, ., x (multiply)
 * - / (divide) - applies to next unit only: a/b.c = (a/b).c
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
 * parseUnitExpression('m/s^2') // m.s^-2
 */
export function parseUnitExpression(unitStr: string): Unit | null {
	if (!unitStr || unitStr.trim() === '') {
		return null;
	}

	// Normalize the string
	let normalized = unitStr.trim();

	// Convert Unicode superscripts to ^n notation
	normalized = normalizeSuperscripts(normalized);

	// Normalize multiplication operators
	normalized = normalized.replace(/\u00d7/g, '*'); // ×
	normalized = normalized.replace(/\u00b7/g, '*'); // ·
	normalized = normalized.replace(/\./g, '*'); // .

	try {
		// Use tokenizer to break down the expression
		const tokens = tokenize(normalized);
		return parseTokensToUnit(tokens);
	} catch {
		// Fallback: try simple parsing without tokenizer
		return parseUnitExpressionSimple(normalized);
	}
}

/**
 * Parse tokens into a Unit
 *
 * Implements operator precedence:
 * 1. ^ (power) - handled during token processing
 * 2. * (multiply) and / (divide)
 *
 * Division applies only to the immediately following term:
 * a/b*c = (a/b)*c, not a/(b*c)
 *
 * @param tokens - Array of tokens from tokenizer
 * @returns Parsed Unit
 */
function parseTokensToUnit(tokens: Token[]): Unit {
	// Filter out EOF tokens
	const filteredTokens = tokens.filter((t) => t.type !== 'EOF');

	if (filteredTokens.length === 0) {
		throw new Error('No valid unit tokens found');
	}

	let result = dimensionlessUnit();
	let pendingDivide = false;
	let i = 0;

	while (i < filteredTokens.length) {
		const token = filteredTokens[i];

		if (token.type === 'UNIT') {
			// Resolve and create unit from symbol
			const unitDef = resolveUnit(token.value);
			if (!unitDef) {
				throw new Error(`Unknown unit: ${token.value}`);
			}

			// Create unit directly from resolved definition (avoid redundant resolve call)
			let unit: Unit = {
				components: new Map([[unitDef.baseSymbol, 1]]),
				coefficient: unitDef.coefficient
			};

			// Check for following EXPONENT token (superscript) or ^ operator
			if (i + 1 < filteredTokens.length) {
				const nextToken = filteredTokens[i + 1];

				// Handle superscript exponent (EXPONENT token)
				if (nextToken.type === 'EXPONENT') {
					const exp = parseFloat(nextToken.value);
					if (isNaN(exp)) {
						throw new Error(`Invalid exponent: ${nextToken.value}`);
					}
					unit = powerUnit(unit, exp);
					i += 1; // Skip exponent
				}
				// Handle caret exponent (^ operator followed by NUMBER)
				else if (nextToken.type === 'OPERATOR' && nextToken.value === '^') {
					if (i + 2 < filteredTokens.length && filteredTokens[i + 2].type === 'NUMBER') {
						const exp = parseFloat(filteredTokens[i + 2].value);
						if (isNaN(exp)) {
							throw new Error(`Invalid exponent: ${filteredTokens[i + 2].value}`);
						}
						unit = powerUnit(unit, exp);
						i += 2; // Skip ^ and exponent
					}
				}
			}

			// Apply pending divide or multiply
			if (pendingDivide) {
				result = divideUnits(result, unit);
				pendingDivide = false;
			} else {
				result = multiplyUnits(result, unit);
			}
		} else if (token.type === 'OPERATOR' || token.type === 'DOT') {
			if (token.value === '/') {
				pendingDivide = true;
			} else if (
				token.value === '*' ||
				token.value === '.' ||
				token.value === '\u00b7' ||
				token.value === '\u00d7'
			) {
				pendingDivide = false;
			}
			// ^ is handled with units
		} else if (token.type === 'NUMBER') {
			// Standalone number (coefficient) - typically at the start
			// For now, ignore standalone numbers in unit expressions
		} else if (token.type === 'LPAREN') {
			// Find matching rparen and parse recursively
			const closingIndex = findMatchingParen(filteredTokens, i);
			if (closingIndex === -1) {
				throw new Error('Unmatched parenthesis');
			}

			const innerTokens = filteredTokens.slice(i + 1, closingIndex);
			let innerUnit = parseTokensToUnit(innerTokens);

			// Check for power after closing paren (EXPONENT or ^)
			if (closingIndex + 1 < filteredTokens.length) {
				const afterParen = filteredTokens[closingIndex + 1];

				if (afterParen.type === 'EXPONENT') {
					const exp = parseFloat(afterParen.value);
					if (isNaN(exp)) {
						throw new Error(`Invalid exponent: ${afterParen.value}`);
					}
					innerUnit = powerUnit(innerUnit, exp);
					i = closingIndex + 1;
				} else if (afterParen.type === 'OPERATOR' && afterParen.value === '^') {
					if (
						closingIndex + 2 < filteredTokens.length &&
						filteredTokens[closingIndex + 2].type === 'NUMBER'
					) {
						const exp = parseFloat(filteredTokens[closingIndex + 2].value);
						if (isNaN(exp)) {
							throw new Error(`Invalid exponent: ${filteredTokens[closingIndex + 2].value}`);
						}
						innerUnit = powerUnit(innerUnit, exp);
						i = closingIndex + 2;
					} else {
						i = closingIndex;
					}
				} else {
					i = closingIndex;
				}
			} else {
				i = closingIndex;
			}

			// Apply pending divide or multiply
			if (pendingDivide) {
				result = divideUnits(result, innerUnit);
				pendingDivide = false;
			} else {
				result = multiplyUnits(result, innerUnit);
			}
		}

		i++;
	}

	return result;
}

/**
 * Find the index of the matching closing parenthesis
 *
 * @param tokens - Token array
 * @param openIndex - Index of the opening parenthesis
 * @returns Index of matching closing paren, or -1 if not found
 */
function findMatchingParen(tokens: Token[], openIndex: number): number {
	let depth = 1;
	for (let i = openIndex + 1; i < tokens.length; i++) {
		if (tokens[i].type === 'LPAREN') {
			depth++;
		} else if (tokens[i].type === 'RPAREN') {
			depth--;
			if (depth === 0) {
				return i;
			}
		}
	}
	return -1;
}

/**
 * Simple fallback parser for unit expressions
 *
 * Used when tokenizer is not available or fails.
 * Handles basic patterns like "km/h", "m.s^-2".
 *
 * @param str - Normalized unit string
 * @returns Parsed Unit or null
 */
function parseUnitExpressionSimple(str: string): Unit | null {
	// Handle fraction: a/b
	if (str.includes('/')) {
		const slashIndex = str.indexOf('/');
		const numPart = str.slice(0, slashIndex).trim();
		const denPart = str.slice(slashIndex + 1).trim();

		const numerator = parseUnitProduct(numPart);
		const denominator = parseUnitProduct(denPart);

		if (!numerator || !denominator) {
			return null;
		}

		return divideUnits(numerator, denominator);
	}

	// Handle product: a*b or a.b
	return parseUnitProduct(str);
}

/**
 * Parse a product of units (e.g., 'kg*m*m' or 'kg.m.m')
 *
 * @param str - Unit product string
 * @returns Parsed Unit or null
 */
function parseUnitProduct(str: string): Unit | null {
	if (!str || str === '1') {
		return dimensionlessUnit();
	}

	// Remove parentheses
	str = str.replace(/^\(|\)$/g, '');

	// Split on multiplication operators
	const parts = str.split(/[*]/);
	let result = dimensionlessUnit();

	for (const part of parts) {
		const trimmed = part.trim();
		if (!trimmed) continue;

		const unit = parseUnitWithExponent(trimmed);
		if (!unit) {
			return null;
		}

		result = multiplyUnits(result, unit);
	}

	return result;
}

/**
 * Parse a single unit with optional exponent (e.g., 'm^2', 's^-1')
 *
 * @param str - Single unit string
 * @returns Parsed Unit or null
 */
function parseUnitWithExponent(str: string): Unit | null {
	// Check for exponent
	const caretIndex = str.indexOf('^');

	if (caretIndex !== -1) {
		const symbol = str.slice(0, caretIndex).trim();
		const expStr = str.slice(caretIndex + 1).trim();

		// Remove braces from exponent if present
		const cleanExp = expStr.replace(/^\{|\}$/g, '');
		const exponent = parseFloat(cleanExp);

		if (isNaN(exponent)) {
			return null;
		}

		// Validate unit symbol
		if (!resolveUnit(symbol)) {
			return null;
		}

		const baseUnit = createUnit(symbol);
		return powerUnit(baseUnit, exponent);
	}

	// No exponent - simple unit
	if (!resolveUnit(str)) {
		return null;
	}

	return createUnit(str);
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
