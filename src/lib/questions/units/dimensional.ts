/**
 * Unit System - Dimensional Analysis
 * ===================================
 *
 * This module provides dimensional analysis for detecting invalid expressions
 * like "m + kg" (adding length and mass).
 *
 * Features:
 * - Check dimensional consistency of expressions
 * - Analyze terms in addition/subtraction expressions
 * - Provide human-readable dimension names in French
 * - Detailed error reporting for educational feedback
 *
 * @module questions/units/dimensional
 */

import type { Quantity, DimensionMap, Dimension } from './types';
import { parseLatexQuantity } from './parser';
import { getDimensionalSignature, unitsAreCompatible } from './operations';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Type of dimensional error
 *
 * - addition_mismatch: Terms in addition/subtraction have different dimensions
 * - invalid_unit: A unit could not be parsed or is unknown
 * - mixed_dimensions: Expression contains incompatible dimensions
 */
export type DimensionalErrorType = 'addition_mismatch' | 'invalid_unit' | 'mixed_dimensions';

/**
 * Dimensional error with details
 *
 * Provides information about what went wrong for educational feedback.
 */
export interface DimensionalError {
	/** Type of error */
	type: DimensionalErrorType;

	/** Human-readable message (French) */
	message: string;

	/** The problematic terms (original strings) */
	terms?: string[];

	/** The conflicting dimensions */
	dimensions?: [DimensionMap, DimensionMap];
}

/**
 * An analyzed term from an expression
 *
 * Contains both the original string and parsed information.
 */
export interface AnalyzedTerm {
	/** Original term string */
	original: string;

	/** Parsed quantity if successful */
	quantity?: Quantity;

	/** Dimensional signature */
	dimension?: DimensionMap;

	/** Parse error if failed */
	error?: string;
}

/**
 * Result of dimensional consistency check
 *
 * Contains the overall result plus detailed information about each term.
 */
export interface DimensionalCheckResult {
	/** Whether the expression is dimensionally consistent */
	isConsistent: boolean;

	/** List of dimensional errors found */
	errors: DimensionalError[];

	/** The terms analyzed */
	terms: AnalyzedTerm[];
}

// ============================================================================
// DIMENSION NAMES (French)
// ============================================================================

/**
 * Known dimension signatures mapped to French names
 *
 * Uses a string key representation of the DimensionMap for lookup.
 */
const DIMENSION_NAMES: Map<string, string> = new Map([
	// SI Base quantities
	['length:1', 'longueur'],
	['mass:1', 'masse'],
	['time:1', 'temps'],
	['electric_current:1', 'courant electrique'],
	['temperature:1', 'temperature'],
	['amount:1', 'quantite de matiere'],
	['luminous_intensity:1', 'intensite lumineuse'],

	// Derived quantities - geometric
	['length:2', 'surface'],
	['length:3', 'volume'],
	['volume:1', 'volume'], // For liter-based volume

	// Derived quantities - kinematics
	['length:1,time:-1', 'vitesse'],
	['length:1,time:-2', 'acceleration'],

	// Derived quantities - mechanics
	['mass:1,length:1,time:-2', 'force'],
	['mass:1,length:2,time:-2', 'energie'],
	['mass:1,length:2,time:-3', 'puissance'],
	['mass:1,length:-1,time:-2', 'pression'],

	// Other
	['currency:1', 'monnaie'],
	['angle:1', 'angle'],

	// Dimensionless
	['', 'sans dimension']
]);

/**
 * Convert a DimensionMap to a string key for lookup
 *
 * Sorts dimensions alphabetically and formats as "dim:exp,dim:exp".
 *
 * @param dim - Dimension map
 * @returns String key
 *
 * @example
 * dimensionMapToKey({ length: 1, time: -1 }) // 'length:1,time:-1'
 */
function dimensionMapToKey(dim: DimensionMap): string {
	const entries = Object.entries(dim)
		.filter(([, exp]) => exp !== 0)
		.sort(([a], [b]) => a.localeCompare(b));

	return entries.map(([d, e]) => `${d}:${e}`).join(',');
}

/**
 * Get human-readable name for a dimension
 *
 * Returns a French name for known dimension combinations,
 * or a generic description for unknown ones.
 *
 * @param dimension - Dimension map
 * @returns Human-readable name in French
 *
 * @example Known dimensions
 * getDimensionName({ length: 1 }) // 'longueur'
 * getDimensionName({ length: 1, time: -1 }) // 'vitesse'
 * getDimensionName({ mass: 1, length: 2, time: -2 }) // 'energie'
 *
 * @example Unknown dimension
 * getDimensionName({ length: 4 }) // 'dimension inconnue (L^4)'
 */
export function getDimensionName(dimension: DimensionMap): string {
	const key = dimensionMapToKey(dimension);

	// Check known dimensions
	const known = DIMENSION_NAMES.get(key);
	if (known) {
		return known;
	}

	// Generate a description for unknown dimensions
	if (Object.keys(dimension).length === 0) {
		return 'sans dimension';
	}

	// Build a dimensional formula
	const formula = buildDimensionalFormula(dimension);
	return `dimension inconnue (${formula})`;
}

/**
 * Build a dimensional formula string
 *
 * Uses standard physics notation: L for length, M for mass, T for time, etc.
 *
 * @param dim - Dimension map
 * @returns Formula string like "L^2.T^-1"
 */
function buildDimensionalFormula(dim: DimensionMap): string {
	const symbols: Record<string, string> = {
		length: 'L',
		mass: 'M',
		time: 'T',
		electric_current: 'I',
		temperature: 'Theta',
		amount: 'N',
		luminous_intensity: 'J',
		volume: 'L^3', // Volume is derived from length
		currency: 'C',
		angle: 'rad'
	};

	const parts: string[] = [];

	// Sort dimensions for consistent output
	const sortedDims = Object.entries(dim)
		.filter(([, exp]) => exp !== 0)
		.sort(([a], [b]) => a.localeCompare(b));

	for (const [dimension, exponent] of sortedDims) {
		const symbol = symbols[dimension] ?? dimension;

		if (exponent === 1) {
			parts.push(symbol);
		} else {
			parts.push(`${symbol}^${exponent}`);
		}
	}

	return parts.join('.') || '1';
}

// ============================================================================
// EXPRESSION ANALYSIS
// ============================================================================

/**
 * Extract terms from an expression for dimensional analysis
 *
 * Splits an expression on addition and subtraction operators,
 * handling LaTeX formatting and parentheses grouping.
 *
 * @param expression - LaTeX expression string
 * @returns Array of term strings
 *
 * @example Simple addition
 * analyzeExpression('5\\text{ m } + 3\\text{ km }')
 * // ['5\\text{ m }', '3\\text{ km }']
 *
 * @example Subtraction
 * analyzeExpression('10\\text{ kg } - 2\\text{ kg }')
 * // ['10\\text{ kg }', '2\\text{ kg }']
 *
 * @example With \\pm
 * analyzeExpression('100\\text{ cm } \\pm 5\\text{ mm }')
 * // ['100\\text{ cm }', '5\\text{ mm }']
 */
export function analyzeExpression(expression: string): string[] {
	if (!expression || typeof expression !== 'string') {
		return [];
	}

	// Normalize the expression
	let normalized = expression.trim();

	// Handle edge case: empty string
	if (normalized === '') {
		return [];
	}

	// Replace LaTeX operators with a standard separator
	// \pm, \mp -> marker
	normalized = normalized.replace(/\\pm|\\mp/g, ' __PLUS_MINUS__ ');

	// Split on + and - but be careful with:
	// 1. Signs at the beginning (negative numbers)
	// 2. Signs in exponents (10^{-3})
	// 3. Signs inside braces

	const terms: string[] = [];
	let currentTerm = '';
	let braceDepth = 0;
	let i = 0;

	while (i < normalized.length) {
		const char = normalized[i];

		// Track brace depth
		if (char === '{') {
			braceDepth++;
			currentTerm += char;
			i++;
			continue;
		}

		if (char === '}') {
			braceDepth--;
			currentTerm += char;
			i++;
			continue;
		}

		// Only split at top level (outside braces)
		if (braceDepth === 0) {
			// Check for __PLUS_MINUS__ marker
			if (normalized.slice(i).startsWith('__PLUS_MINUS__')) {
				if (currentTerm.trim()) {
					terms.push(currentTerm.trim());
				}
				currentTerm = '';
				i += '__PLUS_MINUS__'.length;
				continue;
			}

			// Check for + or - operators
			if (char === '+' || char === '-') {
				// Don't split if:
				// 1. At the very beginning (leading sign)
				// 2. After an operator (scientific notation: 1e-5)
				// 3. Inside \times or \cdot context

				const trimmedCurrent = currentTerm.trim();

				// Check if this is a leading sign
				const isLeadingSign = trimmedCurrent === '' && terms.length === 0;

				// Check if previous char suggests this is part of a number
				const prevCharIsOperator =
					trimmedCurrent.endsWith('^') ||
					trimmedCurrent.endsWith('e') ||
					trimmedCurrent.endsWith('E') ||
					trimmedCurrent.endsWith('\\times') ||
					trimmedCurrent.endsWith('\\cdot');

				if (isLeadingSign || prevCharIsOperator) {
					currentTerm += char;
				} else {
					// This is an addition/subtraction operator
					if (trimmedCurrent) {
						terms.push(trimmedCurrent);
					}
					currentTerm = '';
					// Don't include the operator, but handle negative terms
					if (char === '-') {
						// Start next term with negative sign
						currentTerm = '-';
					}
				}
				i++;
				continue;
			}
		}

		// Regular character - add to current term
		currentTerm += char;
		i++;
	}

	// Add the last term
	if (currentTerm.trim()) {
		terms.push(currentTerm.trim());
	}

	return terms;
}

// ============================================================================
// DIMENSIONAL CONSISTENCY CHECK
// ============================================================================

/**
 * Check dimensional consistency of an expression
 *
 * Analyzes all terms in an addition/subtraction expression and verifies
 * they all have compatible dimensions.
 *
 * @param expression - LaTeX expression string
 * @returns Dimensional check result with details
 *
 * @example Consistent expression
 * checkDimensionalConsistency('5\\text{ m } + 3\\text{ km }')
 * // { isConsistent: true, errors: [], terms: [...] }
 *
 * @example Inconsistent expression
 * checkDimensionalConsistency('5\\text{ m } + 3\\text{ kg }')
 * // {
 * //   isConsistent: false,
 * //   errors: [{
 * //     type: 'addition_mismatch',
 * //     message: "Impossible d'additionner longueur et masse.",
 * //     terms: ['5\\text{ m }', '3\\text{ kg }'],
 * //     dimensions: [{ length: 1 }, { mass: 1 }]
 * //   }],
 * //   terms: [...]
 * // }
 *
 * @example Invalid unit
 * checkDimensionalConsistency('5\\text{ xyz }')
 * // {
 * //   isConsistent: false,
 * //   errors: [{
 * //     type: 'invalid_unit',
 * //     message: "Unite invalide: xyz"
 * //   }],
 * //   terms: [...]
 * // }
 */
export function checkDimensionalConsistency(expression: string): DimensionalCheckResult {
	// Handle null/undefined/empty
	if (!expression || typeof expression !== 'string' || expression.trim() === '') {
		return {
			isConsistent: true,
			errors: [],
			terms: []
		};
	}

	// Extract terms from the expression
	const termStrings = analyzeExpression(expression);

	// Handle single term or no terms
	if (termStrings.length === 0) {
		return {
			isConsistent: true,
			errors: [],
			terms: []
		};
	}

	// Analyze each term
	const analyzedTerms: AnalyzedTerm[] = [];
	const errors: DimensionalError[] = [];

	for (const termStr of termStrings) {
		const analyzed = analyzeTerm(termStr);
		analyzedTerms.push(analyzed);

		// Check for parse errors
		if (analyzed.error) {
			errors.push({
				type: 'invalid_unit',
				message: analyzed.error,
				terms: [termStr]
			});
		}
	}

	// If there were parse errors, return early
	if (errors.length > 0) {
		return {
			isConsistent: false,
			errors,
			terms: analyzedTerms
		};
	}

	// Check dimensional compatibility between all terms
	if (analyzedTerms.length >= 2) {
		const firstTerm = analyzedTerms[0];
		const firstDimension = firstTerm.dimension;

		if (firstDimension === undefined) {
			// First term has no dimension info - can't check
			return {
				isConsistent: true,
				errors: [],
				terms: analyzedTerms
			};
		}

		for (let i = 1; i < analyzedTerms.length; i++) {
			const currentTerm = analyzedTerms[i];
			const currentDimension = currentTerm.dimension;

			if (currentDimension === undefined) {
				continue; // Skip terms without dimension info
			}

			// Check if dimensions are compatible
			if (!dimensionsAreCompatible(firstDimension, currentDimension)) {
				const firstName = getDimensionName(firstDimension);
				const currentName = getDimensionName(currentDimension);

				errors.push({
					type: 'addition_mismatch',
					message: `Impossible d'additionner ${firstName} et ${currentName}.`,
					terms: [firstTerm.original, currentTerm.original],
					dimensions: [firstDimension, currentDimension]
				});
			}
		}
	}

	return {
		isConsistent: errors.length === 0,
		errors,
		terms: analyzedTerms
	};
}

/**
 * Analyze a single term to extract its quantity and dimension
 *
 * @param termStr - Term string
 * @returns Analyzed term
 */
function analyzeTerm(termStr: string): AnalyzedTerm {
	// Try to parse the term as a quantity
	const quantity = parseLatexQuantity(termStr);

	if (!quantity) {
		// Could not parse - try to give a meaningful error
		const unitMatch = termStr.match(/\\text\{\s*([^}]+)\s*\}|\\mathrm\{([^}]+)\}/);
		const unitStr = unitMatch?.[1] ?? unitMatch?.[2] ?? 'expression';

		return {
			original: termStr,
			error: `Unité invalide: ${unitStr}`
		};
	}

	// Get dimensional signature
	const dimension = getDimensionalSignature(quantity.unit);

	return {
		original: termStr,
		quantity,
		dimension
	};
}

/**
 * Check if two dimension maps are compatible
 *
 * Two dimensions are compatible if they have the same signature
 * (same dimensions with same exponents).
 *
 * @param dim1 - First dimension map
 * @param dim2 - Second dimension map
 * @returns True if dimensions are compatible
 */
function dimensionsAreCompatible(dim1: DimensionMap, dim2: DimensionMap): boolean {
	// Get all dimensions from both maps
	const allDimensions = new Set([...Object.keys(dim1), ...Object.keys(dim2)]);

	for (const dim of allDimensions) {
		const exp1 = dim1[dim as Dimension] ?? 0;
		const exp2 = dim2[dim as Dimension] ?? 0;

		if (Math.abs(exp1 - exp2) > 1e-10) {
			return false;
		}
	}

	return true;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick check if an expression is dimensionally valid
 *
 * Convenience wrapper around checkDimensionalConsistency.
 *
 * @param expression - LaTeX expression string
 * @returns True if expression is dimensionally consistent
 *
 * @example
 * isDimensionallyConsistent('5\\text{ m } + 3\\text{ km }') // true
 * isDimensionallyConsistent('5\\text{ m } + 3\\text{ kg }') // false
 */
export function isDimensionallyConsistent(expression: string): boolean {
	return checkDimensionalConsistency(expression).isConsistent;
}

/**
 * Get the first dimensional error message if any
 *
 * Convenience function for simple error reporting.
 *
 * @param expression - LaTeX expression string
 * @returns Error message or null if consistent
 *
 * @example
 * getDimensionalError('5\\text{ m } + 3\\text{ kg }')
 * // "Impossible d'additionner longueur et masse."
 */
export function getDimensionalError(expression: string): string | null {
	const result = checkDimensionalConsistency(expression);
	return result.errors.length > 0 ? result.errors[0].message : null;
}

/**
 * Check if two quantities have compatible dimensions
 *
 * Wrapper around unitsAreCompatible for quantity objects.
 *
 * @param q1 - First quantity
 * @param q2 - Second quantity
 * @returns True if quantities can be added/compared
 *
 * @example
 * const meters = parseLatexQuantity('5\\text{ m }');
 * const kilometers = parseLatexQuantity('3\\text{ km }');
 * const kilograms = parseLatexQuantity('2\\text{ kg }');
 *
 * quantitiesAreCompatible(meters, kilometers) // true
 * quantitiesAreCompatible(meters, kilograms) // false
 */
export function quantitiesAreCompatible(q1: Quantity, q2: Quantity): boolean {
	return unitsAreCompatible(q1.unit, q2.unit);
}
