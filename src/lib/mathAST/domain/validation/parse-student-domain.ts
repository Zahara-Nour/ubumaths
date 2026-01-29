/**
 * Student Domain Parser
 *
 * Parses student input into a Domain structure.
 * Supports multiple input formats:
 * - Interval notation: ]0, +∞[, [0, 1], ]-∞, 2[ ∪ ]3, +∞[
 * - Condition notation: x > 0, x >= 0 et x != 1, 0 < x <= 5
 * - Set notation: ℝ \ {0}, ℝ*, ℝ₊, ℝ*₊
 *
 * @module mathAST/domain/validation/parse-student-domain
 */

import type { Domain, Interval, EndpointValue } from '../types';
import type { ParseStudentDomainResult } from './types';
import {
	intervalDomain,
	emptyDomain,
	universalDomain,
	fromNumber,
	positiveInfinity,
	negativeInfinity,
	pi,
	e,
	sqrt2,
	sqrt3,
	openInterval,
	closedInterval,
	leftClosedInterval,
	rightClosedInterval,
	lessThan,
	lessThanOrEqual,
	greaterThan,
	greaterThanOrEqual
} from '../factory';
import { union, excludePoints } from '../algebra';

// =============================================================================
// Main API
// =============================================================================

/**
 * Parse a student's domain input into a Domain structure.
 *
 * Supports multiple formats:
 * - Interval: ]0, +∞[, [0, 1], ]-∞, 2[ ∪ ]3, +∞[
 * - Condition: x > 0, x >= 0 et x != 1, 0 < x <= 5
 * - Set notation: ℝ \ {0}, ℝ*, ℝ₊
 *
 * @param input - The student's answer string
 * @param variable - Expected variable name (default: 'x')
 * @returns ParseStudentDomainResult with success/failure and domain/error
 *
 * @example
 * ```typescript
 * parseStudentDomain(']0, +∞[');
 * // { success: true, domain: { kind: 'interval_set', ... }, format: 'interval' }
 *
 * parseStudentDomain('x > 0 et x ≠ 1', 'x');
 * // { success: true, domain: { kind: 'interval_set', ... }, format: 'condition' }
 *
 * parseStudentDomain('ℝ \\ {0}');
 * // { success: true, domain: { kind: 'interval_set', ... }, format: 'set_notation' }
 * ```
 */
export function parseStudentDomain(
	input: string,
	variable: string = 'x'
): ParseStudentDomainResult {
	// Normalize input: trim and normalize Unicode
	const normalizedInput = normalizeInput(input);

	if (normalizedInput.length === 0) {
		return { success: false, error: 'Réponse vide' };
	}

	// Try each parser in order of specificity
	const parsers: Array<() => ParseStudentDomainResult> = [
		() => parseSetNotation(normalizedInput),
		() => parseIntervalNotation(normalizedInput),
		() => parseConditionNotation(normalizedInput, variable)
	];

	for (const parser of parsers) {
		const result = parser();
		if (result.success) {
			return result;
		}
	}

	return {
		success: false,
		error:
			'Format non reconnu. Utilisez la notation intervalle (ex: ]0, +∞[), condition (ex: x > 0) ou ensemble (ex: ℝ \\ {0})'
	};
}

// =============================================================================
// Input Normalization
// =============================================================================

/**
 * Normalize input string for parsing.
 */
function normalizeInput(input: string): string {
	return (
		input
			.trim()
			// Normalize unicode
			.replace(/−/g, '-') // minus sign
			.replace(/×/g, '*') // multiplication
			.replace(/÷/g, '/') // division
			.replace(/∞/g, 'inf') // infinity
			.replace(/\+inf/gi, '+inf') // positive infinity
			.replace(/-inf/gi, '-inf') // negative infinity
			.replace(/\\infty/gi, 'inf') // LaTeX infinity
			.replace(/\\cup/g, '∪') // LaTeX union
			.replace(/\\cap/g, '∩') // LaTeX intersection
			.replace(/\\setminus/g, '\\') // LaTeX set minus
			.replace(/\\mathbb\{R\}/g, 'ℝ') // LaTeX reals
			.replace(/\\R/g, 'ℝ') // LaTeX reals shortcut
			.replace(/\\pi/g, 'π') // LaTeX pi
			.replace(/\\sqrt\{([^}]+)\}/g, '√$1') // LaTeX sqrt
			// Normalize comparison operators
			.replace(/≤/g, '<=')
			.replace(/≥/g, '>=')
			.replace(/≠/g, '!=')
			.replace(/<=/g, '<=')
			.replace(/>=/g, '>=')
			.replace(/!=/g, '!=')
			.replace(/\\leq?/g, '<=')
			.replace(/\\geq?/g, '>=')
			.replace(/\\neq?/g, '!=')
			// Normalize spaces
			.replace(/\s+/g, ' ')
			// Normalize French connectors
			.replace(/\bet\b/gi, 'et')
			.replace(/\bou\b/gi, 'ou')
			.replace(/\band\b/gi, 'et')
			.replace(/\bor\b/gi, 'ou')
	);
}

// =============================================================================
// Set Notation Parser
// =============================================================================

/**
 * Parse set notation: ℝ, ℝ*, ℝ₊, ℝ*₊, ℝ \ {0}, etc.
 */
function parseSetNotation(input: string): ParseStudentDomainResult {
	const trimmed = input.trim();

	// ℝ (universal)
	if (/^[ℝR]$/.test(trimmed)) {
		return { success: true, domain: universalDomain(), format: 'set_notation' };
	}

	// ℝ* (non-zero reals)
	if (/^[ℝR]\*$/.test(trimmed)) {
		return {
			success: true,
			domain: excludePoints(universalDomain(), [fromNumber(0)]),
			format: 'set_notation'
		};
	}

	// ℝ₊ or ℝ+ (non-negative reals)
	if (/^[ℝR][₊+]$/.test(trimmed)) {
		return {
			success: true,
			domain: intervalDomain([greaterThanOrEqual(fromNumber(0))]),
			format: 'set_notation'
		};
	}

	// ℝ*₊ or ℝ+* (positive reals)
	if (
		/^[ℝR][*₊+]{2}$/.test(trimmed) ||
		/^[ℝR]\*[₊+]$/.test(trimmed) ||
		/^[ℝR][₊+]\*$/.test(trimmed)
	) {
		return {
			success: true,
			domain: intervalDomain([greaterThan(fromNumber(0))]),
			format: 'set_notation'
		};
	}

	// ℝ₋ or ℝ- (non-positive reals)
	if (/^[ℝR][₋-]$/.test(trimmed)) {
		return {
			success: true,
			domain: intervalDomain([lessThanOrEqual(fromNumber(0))]),
			format: 'set_notation'
		};
	}

	// ℝ*₋ or ℝ-* (negative reals)
	if (
		/^[ℝR][*₋-]{2}$/.test(trimmed) ||
		/^[ℝR]\*[₋-]$/.test(trimmed) ||
		/^[ℝR][₋-]\*$/.test(trimmed)
	) {
		return {
			success: true,
			domain: intervalDomain([lessThan(fromNumber(0))]),
			format: 'set_notation'
		};
	}

	// ℝ \ {a, b, c} (reals minus points)
	const setMinusMatch = trimmed.match(/^[ℝR]\s*[\\∖]\s*\{([^}]+)\}$/);
	if (setMinusMatch) {
		const pointsStr = setMinusMatch[1];
		const pointsResult = parseExcludedPoints(pointsStr);
		if (pointsResult.success) {
			return {
				success: true,
				domain: excludePoints(universalDomain(), pointsResult.points),
				format: 'set_notation'
			};
		}
	}

	// ∅ or {} (empty set)
	if (/^[∅Ø]$/.test(trimmed) || /^\{\s*\}$/.test(trimmed)) {
		return { success: true, domain: emptyDomain(), format: 'set_notation' };
	}

	return { success: false, error: 'Not a set notation' };
}

/**
 * Parse a list of excluded points.
 */
function parseExcludedPoints(
	input: string
): { success: true; points: EndpointValue[] } | { success: false } {
	const parts = input
		.split(/[,;]/)
		.map((s) => s.trim())
		.filter(Boolean);
	const points: EndpointValue[] = [];

	for (const part of parts) {
		const value = parseEndpointValue(part);
		if (value === null) {
			return { success: false };
		}
		points.push(value);
	}

	return { success: true, points };
}

// =============================================================================
// Interval Notation Parser
// =============================================================================

/**
 * Parse interval notation: ]0, +∞[, [0, 1], ]-∞, 2[ ∪ ]3, +∞[
 */
function parseIntervalNotation(input: string): ParseStudentDomainResult {
	const trimmed = input.trim();

	// Check for union of intervals
	if (trimmed.includes('∪') || trimmed.includes('U')) {
		const parts = trimmed
			.split(/[∪U]/)
			.map((s) => s.trim())
			.filter(Boolean);
		let result: Domain = emptyDomain();

		for (const part of parts) {
			const intervalResult = parseSingleInterval(part);
			if (!intervalResult.success) {
				return intervalResult;
			}
			result = union(result, intervalResult.domain);
		}

		return { success: true, domain: result, format: 'interval' };
	}

	// Check for domain with excluded points: ]0, +∞[ \ {1}
	const withExcludedMatch = trimmed.match(/^(.+?)\s*[\\∖]\s*\{([^}]+)\}$/);
	if (withExcludedMatch) {
		const intervalPart = withExcludedMatch[1].trim();
		const pointsPart = withExcludedMatch[2];

		const intervalResult = parseSingleInterval(intervalPart);
		if (!intervalResult.success) {
			return intervalResult;
		}

		const pointsResult = parseExcludedPoints(pointsPart);
		if (!pointsResult.success) {
			return { success: false, error: 'Points exclus non reconnus' };
		}

		return {
			success: true,
			domain: excludePoints(intervalResult.domain, pointsResult.points),
			format: 'interval'
		};
	}

	return parseSingleInterval(trimmed);
}

/**
 * Parse a single interval.
 */
function parseSingleInterval(input: string): ParseStudentDomainResult {
	const trimmed = input.trim();

	// French notation: ]a, b[, [a, b], ]a, b], [a, b[
	// English notation: (a, b), [a, b], (a, b], [a, b)
	const frenchMatch = trimmed.match(/^([[\]])([^,]+),\s*([^[\]]+)([[\]])$/);
	const englishMatch = trimmed.match(/^([([])([^,]+),\s*([^)\]]+)([)\]])$/);

	const match = frenchMatch ?? englishMatch;
	if (!match) {
		return { success: false, error: 'Format intervalle non reconnu' };
	}

	const [, leftBracket, leftValueStr, rightValueStr, rightBracket] = match;

	// Parse endpoint values
	const leftValue = parseEndpointValue(leftValueStr.trim());
	const rightValue = parseEndpointValue(rightValueStr.trim());

	if (leftValue === null) {
		return { success: false, error: `Borne gauche non reconnue: ${leftValueStr}` };
	}
	if (rightValue === null) {
		return { success: false, error: `Borne droite non reconnue: ${rightValueStr}` };
	}

	// Determine if bounds are open/closed
	// French: ] means open, [ means closed on left
	// English: ( means open, [ means closed
	const leftOpen = leftBracket === ']' || leftBracket === '(';
	const rightOpen = rightBracket === '[' || rightBracket === ')';

	// Create the interval
	let interval: Interval;
	if (!leftOpen && !rightOpen) {
		interval = closedInterval(leftValue, rightValue);
	} else if (leftOpen && rightOpen) {
		interval = openInterval(leftValue, rightValue);
	} else if (!leftOpen && rightOpen) {
		interval = leftClosedInterval(leftValue, rightValue);
	} else {
		interval = rightClosedInterval(leftValue, rightValue);
	}

	return {
		success: true,
		domain: intervalDomain([interval]),
		format: 'interval'
	};
}

// =============================================================================
// Condition Notation Parser
// =============================================================================

/**
 * Parse condition notation: x > 0, x >= 0 et x != 1, 0 < x <= 5
 */
function parseConditionNotation(input: string, variable: string): ParseStudentDomainResult {
	const trimmed = input.trim();

	// Check for compound conditions (et/ou)
	if (/\bet\b/i.test(trimmed)) {
		const parts = trimmed
			.split(/\bet\b/i)
			.map((s) => s.trim())
			.filter(Boolean);
		let result: Domain = universalDomain();

		for (const part of parts) {
			const partResult = parseSingleCondition(part, variable);
			if (!partResult.success) {
				return partResult;
			}
			// "et" means intersection
			result = intersectDomains(result, partResult.domain);
		}

		return { success: true, domain: result, format: 'condition' };
	}

	if (/\bou\b/i.test(trimmed)) {
		const parts = trimmed
			.split(/\bou\b/i)
			.map((s) => s.trim())
			.filter(Boolean);
		let result: Domain = emptyDomain();

		for (const part of parts) {
			const partResult = parseSingleCondition(part, variable);
			if (!partResult.success) {
				return partResult;
			}
			// "ou" means union
			result = union(result, partResult.domain);
		}

		return { success: true, domain: result, format: 'condition' };
	}

	return parseSingleCondition(trimmed, variable);
}

/**
 * Parse a single condition.
 */
function parseSingleCondition(input: string, variable: string): ParseStudentDomainResult {
	const trimmed = input.trim();

	// Pattern: a < x <= b (double inequality)
	const doubleMatch = trimmed.match(/^([^<>=!]+)\s*(<|<=)\s*([a-zA-Z])\s*(<|<=)\s*([^<>=!]+)$/);
	if (doubleMatch) {
		const [, leftStr, op1, varName, op2, rightStr] = doubleMatch;
		if (varName !== variable) {
			return { success: false, error: `Variable attendue: ${variable}, trouvée: ${varName}` };
		}

		const leftValue = parseEndpointValue(leftStr.trim());
		const rightValue = parseEndpointValue(rightStr.trim());

		if (leftValue === null || rightValue === null) {
			return { success: false, error: 'Bornes non reconnues' };
		}

		const leftOpen = op1 === '<';
		const rightOpen = op2 === '<';

		let interval: Interval;
		if (!leftOpen && !rightOpen) {
			interval = closedInterval(leftValue, rightValue);
		} else if (leftOpen && rightOpen) {
			interval = openInterval(leftValue, rightValue);
		} else if (leftOpen && !rightOpen) {
			interval = rightClosedInterval(leftValue, rightValue);
		} else {
			interval = leftClosedInterval(leftValue, rightValue);
		}

		return {
			success: true,
			domain: intervalDomain([interval]),
			format: 'condition'
		};
	}

	// Pattern: x != a (exclusion)
	const neqMatch = trimmed.match(new RegExp(`^${variable}\\s*!=\\s*(.+)$`));
	if (neqMatch) {
		const valueStr = neqMatch[1].trim();
		const value = parseEndpointValue(valueStr);
		if (value === null) {
			return { success: false, error: `Valeur non reconnue: ${valueStr}` };
		}
		return {
			success: true,
			domain: excludePoints(universalDomain(), [value]),
			format: 'condition'
		};
	}

	// Pattern: x > a, x >= a, x < a, x <= a
	// Note: Match >= and <= before > and < to avoid partial matches
	const simpleMatch = trimmed.match(new RegExp(`^${variable}\\s*(>=|<=|>|<)\\s*(.+)$`));
	if (simpleMatch) {
		const [, op, valueStr] = simpleMatch;
		const value = parseEndpointValue(valueStr.trim());
		if (value === null) {
			return { success: false, error: `Valeur non reconnue: ${valueStr}` };
		}

		let interval: Interval;
		switch (op) {
			case '>':
				interval = greaterThan(value);
				break;
			case '>=':
				interval = greaterThanOrEqual(value);
				break;
			case '<':
				interval = lessThan(value);
				break;
			case '<=':
				interval = lessThanOrEqual(value);
				break;
			default:
				return { success: false, error: `Opérateur non reconnu: ${op}` };
		}

		return {
			success: true,
			domain: intervalDomain([interval]),
			format: 'condition'
		};
	}

	// Pattern: a > x (reversed)
	// Note: Match >= and <= before > and < to avoid partial matches
	const reversedMatch = trimmed.match(/^(.+?)\s*(>=|<=|>|<)\s*([a-zA-Z])$/);
	if (reversedMatch) {
		const [, valueStr, op, varName] = reversedMatch;
		if (varName !== variable) {
			return { success: false, error: `Variable attendue: ${variable}, trouvée: ${varName}` };
		}

		const value = parseEndpointValue(valueStr.trim());
		if (value === null) {
			return { success: false, error: `Valeur non reconnue: ${valueStr}` };
		}

		// Reverse the operator: a > x means x < a
		let interval: Interval;
		switch (op) {
			case '>':
				interval = lessThan(value);
				break;
			case '>=':
				interval = lessThanOrEqual(value);
				break;
			case '<':
				interval = greaterThan(value);
				break;
			case '<=':
				interval = greaterThanOrEqual(value);
				break;
			default:
				return { success: false, error: `Opérateur non reconnu: ${op}` };
		}

		return {
			success: true,
			domain: intervalDomain([interval]),
			format: 'condition'
		};
	}

	return { success: false, error: 'Format condition non reconnu' };
}

// =============================================================================
// Endpoint Value Parser
// =============================================================================

/**
 * Parse an endpoint value string into EndpointValue.
 */
function parseEndpointValue(input: string): EndpointValue | null {
	const trimmed = input.trim();

	// Infinity
	if (/^[+]?inf$/i.test(trimmed) || trimmed === '+∞') {
		return positiveInfinity();
	}
	if (/^-inf$/i.test(trimmed) || trimmed === '-∞') {
		return negativeInfinity();
	}

	// Special constants
	if (trimmed === 'π' || trimmed === 'pi') {
		return pi();
	}
	if (trimmed === 'e') {
		return e();
	}
	if (trimmed === '√2' || trimmed === 'sqrt(2)' || trimmed === 'sqrt2') {
		return sqrt2();
	}
	if (trimmed === '√3' || trimmed === 'sqrt(3)' || trimmed === 'sqrt3') {
		return sqrt3();
	}

	// Negative constants
	if (trimmed === '-π' || trimmed === '-pi') {
		return { kind: 'negative', value: pi() };
	}
	if (trimmed === '-e') {
		return { kind: 'negative', value: e() };
	}

	// Fractions of pi (π/2, π/3, etc.)
	const piFractionMatch = trimmed.match(/^([+-]?)π?\/?(\d+)?$/);
	if (piFractionMatch && trimmed.includes('π')) {
		// Handle π/2, 2π, etc. - simplified for common cases
		if (trimmed === 'π/2') {
			return { kind: 'symbolic', expression: 'π/2' };
		}
		if (trimmed === '-π/2') {
			return { kind: 'negative', value: { kind: 'symbolic', expression: 'π/2' } };
		}
	}

	// Numbers (including negative and decimal)
	const num = parseFloat(trimmed);
	if (!isNaN(num) && isFinite(num)) {
		return fromNumber(num);
	}

	// Fractions (a/b)
	const fractionMatch = trimmed.match(/^([+-]?\d+)\s*\/\s*(\d+)$/);
	if (fractionMatch) {
		const num = parseFloat(fractionMatch[1]);
		const den = parseFloat(fractionMatch[2]);
		if (!isNaN(num) && !isNaN(den) && den !== 0) {
			return fromNumber(num / den);
		}
	}

	return null;
}

// =============================================================================
// Helper: Intersection
// =============================================================================

import { intersect } from '../algebra';

function intersectDomains(a: Domain, b: Domain): Domain {
	return intersect(a, b);
}
