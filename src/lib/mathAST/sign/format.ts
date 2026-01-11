/**
 * Sign Analysis Formatting - French output for pedagogical display
 *
 * Provides functions to format sign analysis results for display.
 * Uses French notation and mathematical symbols for a pedagogical presentation.
 *
 * Output format example:
 * ```
 * Expression : x - 2
 * Variable : x
 *
 * Domaine : R
 *
 * Zeros :
 *   x = 2
 *
 * Tableau de signes :
 *   ]-inf, 2[ : -  (negatif)
 *   {2}       : 0  (zero)
 *   ]2, +inf[ : +  (positif)
 * ```
 *
 * @module mathAST/sign/format
 */

import type { Interval } from '$lib/math/intervals/types';
import type { Domain } from '../domain/types';
import type { MathNode } from '../types';
import type { SignAnalysisResult, SignedInterval, ZeroInfo, Sign } from './types';
import { toCustom } from '../custom-generator';
import { formatInterval as formatDomainInterval } from '../domain/format';
import { endpointToNumber } from '$lib/math/intervals/endpoint';

// =============================================================================
// Main Formatting Function
// =============================================================================

/**
 * Format a complete sign analysis result as a French text summary.
 *
 * Returns a multi-line string with French notation containing:
 * - Expression analyzed
 * - Variable
 * - Domain of definition
 * - Zeros
 * - Sign table showing sign on each interval
 *
 * @param result - The sign analysis result to format
 * @returns A multi-line formatted string
 *
 * @example
 * const result = analyzeSign(parse('x - 2'), { variable: 'x' });
 * console.log(formatSignAnalysis(result));
 */
export function formatSignAnalysis(result: SignAnalysisResult): string {
	const v = result.variable;
	const lines: string[] = [];

	// Expression header
	lines.push(`Expression : ${toCustom(result.expression)}`);
	lines.push(`Variable : ${v}`);
	lines.push('');

	// Domain
	lines.push(`Domaine : ${formatDomain(result.domain)}`);
	lines.push('');

	// Zeros
	lines.push(formatZeros(result.zeros, v));
	lines.push('');

	// Sign table
	lines.push(formatSignTable(result));

	// Warnings (if any)
	if (result.warnings && result.warnings.length > 0) {
		lines.push('');
		lines.push('Avertissements :');
		for (const warning of result.warnings) {
			lines.push(`  ! ${warning}`);
		}
	}

	return lines.join('\n');
}

// =============================================================================
// Sign Table Formatting
// =============================================================================

/**
 * Format a sign table for CLI display.
 *
 * Shows the sign of the expression on each interval in a tabular format:
 * ```
 *   ]-inf, 2[ : -  (negatif)
 *   {2}       : 0  (zero)
 *   ]2, +inf[ : +  (positif)
 * ```
 *
 * @param result - The sign analysis result
 * @returns Formatted sign table string
 *
 * @example
 * console.log(formatSignTable(analyzeSign(parse('x^2 - 4'))));
 */
export function formatSignTable(result: SignAnalysisResult): string {
	const v = result.variable;

	if (result.signedIntervals.length === 0) {
		return `Signe de f(${v}) : indetermine`;
	}

	const lines: string[] = [];
	lines.push(`Signe de f(${v}) :`);

	// Calculate max interval width for alignment
	const intervalStrs = result.signedIntervals.map((si) => formatSingleInterval(si.interval));
	const maxWidth = Math.max(...intervalStrs.map((s) => s.length));

	for (let i = 0; i < result.signedIntervals.length; i++) {
		const si = result.signedIntervals[i];
		const intervalStr = intervalStrs[i].padEnd(maxWidth);
		const signStr = getSignSymbol(si.sign);
		const signDesc = getSignDescription(si.sign);
		lines.push(`  ${intervalStr} : ${signStr}  (${signDesc})`);
	}

	return lines.join('\n');
}

/**
 * Format signed intervals as conditions in French.
 *
 * Shows each interval with the sign as a condition:
 * ```
 * sur ]-inf, 2[ : f(x) < 0
 * en x = 2 : f(x) = 0
 * sur ]2, +inf[ : f(x) > 0
 * ```
 *
 * @param intervals - Array of signed intervals
 * @param variable - The variable name
 * @returns Formatted string with conditions
 */
export function formatSignedIntervalsAsConditions(
	intervals: readonly SignedInterval[],
	variable: string
): string {
	if (intervals.length === 0) {
		return `Signe de f(${variable}) : indetermine`;
	}

	const lines: string[] = [];
	lines.push(`Signe de f(${variable}) :`);

	for (const si of intervals) {
		const intervalStr = formatSingleInterval(si.interval);
		const isPoint = isPointInterval(si.interval);

		if (isPoint) {
			// Point interval: "en x = a : f(x) = 0"
			const pointValue = formatEndpointValue(si.interval.lower.value);
			const condition = signToCondition(si.sign, variable);
			lines.push(`  en ${variable} = ${pointValue} : ${condition}`);
		} else {
			// Regular interval: "sur ]a, b[ : f(x) > 0"
			const condition = signToCondition(si.sign, variable);
			lines.push(`  sur ${intervalStr} : ${condition}`);
		}
	}

	return lines.join('\n');
}

// =============================================================================
// Zeros Formatting
// =============================================================================

/**
 * Format zeros list.
 *
 * @param zeros - Array of zero info
 * @param variable - The variable name
 * @returns Formatted string
 *
 * @example
 * formatZeros([{value: node(2), exact: true}], 'x')
 * // "Zeros :\n  x = 2"
 */
export function formatZeros(zeros: readonly ZeroInfo[], variable: string): string {
	if (zeros.length === 0) {
		return 'Zeros : aucun';
	}

	const lines: string[] = [];
	lines.push('Zeros :');

	for (const zero of zeros) {
		const valueStr = toCustom(zero.value);
		const exactStr = zero.exact ? '' : ' (approx.)';
		lines.push(`  ${variable} = ${valueStr}${exactStr}`);
	}

	return lines.join('\n');
}

// =============================================================================
// Symbol and Description Functions
// =============================================================================

/**
 * Get the sign symbol for a sign value.
 *
 * @param sign - The sign value
 * @returns Sign symbol (+, -, 0, ?)
 */
export function getSignSymbol(sign: Sign): string {
	switch (sign) {
		case 'positive':
			return '+';
		case 'negative':
			return '-';
		case 'zero':
			return '0';
		case 'unknown':
			return '?';
	}
}

/**
 * Get French description of a sign.
 *
 * @param sign - The sign value
 * @returns French description
 */
export function getSignDescription(sign: Sign): string {
	switch (sign) {
		case 'positive':
			return 'positif';
		case 'negative':
			return 'negatif';
		case 'zero':
			return 'nul';
		case 'unknown':
			return 'indetermine';
	}
}

/**
 * Convert a sign to a condition expression.
 *
 * @param sign - The sign value
 * @param variable - The variable name (used in f(x))
 * @returns Condition string like "f(x) > 0"
 */
export function signToCondition(sign: Sign, variable: string): string {
	switch (sign) {
		case 'positive':
			return `f(${variable}) > 0`;
		case 'negative':
			return `f(${variable}) < 0`;
		case 'zero':
			return `f(${variable}) = 0`;
		case 'unknown':
			return `signe de f(${variable}) indetermine`;
	}
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format a domain for display.
 */
function formatDomain(domain: Domain): string {
	switch (domain.kind) {
		case 'empty':
			return 'ensemble vide';
		case 'universal':
			return 'R (tous les reels)';
		case 'interval_set':
		case 'condition_domain':
		case 'periodic_exclusion':
			return formatDomainInterval(domain);
	}
}

/**
 * Format a single interval for display.
 */
function formatSingleInterval(interval: Interval): string {
	const lowerNum = endpointToNumber(interval.lower.value);
	const upperNum = endpointToNumber(interval.upper.value);

	// Check for point interval
	if (
		Number.isFinite(lowerNum) &&
		Number.isFinite(upperNum) &&
		Math.abs(lowerNum - upperNum) < 1e-10 &&
		interval.lower.type === 'closed' &&
		interval.upper.type === 'closed'
	) {
		return `{${formatEndpointValue(interval.lower.value)}}`;
	}

	const lowerBracket = interval.lower.type === 'closed' ? '[' : ']';
	const upperBracket = interval.upper.type === 'closed' ? ']' : '[';
	const lowerStr = formatEndpointValue(interval.lower.value);
	const upperStr = formatEndpointValue(interval.upper.value);

	return `${lowerBracket}${lowerStr}, ${upperStr}${upperBracket}`;
}

/**
 * Format an endpoint value for display.
 */
function formatEndpointValue(value: MathNode): string {
	if (value.type === 'infinity') {
		return value.sign === 'positive' ? '+inf' : '-inf';
	}
	return toCustom(value);
}

/**
 * Check if an interval is a point interval (singleton set).
 */
function isPointInterval(interval: Interval): boolean {
	const lowerNum = endpointToNumber(interval.lower.value);
	const upperNum = endpointToNumber(interval.upper.value);

	return (
		Number.isFinite(lowerNum) &&
		Number.isFinite(upperNum) &&
		Math.abs(lowerNum - upperNum) < 1e-10 &&
		interval.lower.type === 'closed' &&
		interval.upper.type === 'closed'
	);
}

// =============================================================================
// Compact Format (Single Line Summary)
// =============================================================================

/**
 * Format a compact one-line summary of sign analysis.
 *
 * @param result - The sign analysis result
 * @returns A single-line summary
 *
 * @example
 * formatSignSummary(result)
 * // "f(x) = x - 2 ; negatif sur ]-inf, 2[, nul en x=2, positif sur ]2, +inf["
 */
export function formatSignSummary(result: SignAnalysisResult): string {
	const v = result.variable;
	const parts: string[] = [];

	// Expression
	parts.push(`f(${v}) = ${toCustom(result.expression)}`);

	// Sign on intervals summary
	const signParts: string[] = [];
	for (const si of result.signedIntervals) {
		const signDesc = getSignDescription(si.sign);
		const intervalStr = formatSingleInterval(si.interval);
		const isPoint = isPointInterval(si.interval);

		if (isPoint) {
			const pointValue = formatEndpointValue(si.interval.lower.value);
			signParts.push(`${signDesc} en ${v}=${pointValue}`);
		} else {
			signParts.push(`${signDesc} sur ${intervalStr}`);
		}
	}

	if (signParts.length > 0) {
		parts.push(signParts.join(', '));
	}

	return parts.join(' ; ');
}
