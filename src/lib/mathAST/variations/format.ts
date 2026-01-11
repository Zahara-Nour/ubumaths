/**
 * Variation Table Formatting
 *
 * Provides functions to format variation study results for display.
 * Uses French notation and mathematical symbols for a pedagogical presentation.
 *
 * Output format example:
 * ```
 * Expression : x^3 - 3x
 * Derivee : 3x^2 - 3
 *
 * Domaine : R
 *
 * Points critiques :
 *   x = -1
 *   x = 1
 *
 * Signe de f'(x) :
 *   ]-inf, -1[ : +    (f croissante)
 *   {-1}       : 0
 *   ]-1, 1[    : -    (f decroissante)
 *   {1}        : 0
 *   ]1, +inf[  : +    (f croissante)
 *
 * Extrema :
 *   Maximum local : f(-1) = 2
 *   Minimum local : f(1) = -2
 * ```
 *
 * @module mathAST/variations/format
 */

import type { Interval } from '$lib/math/intervals/types';
import type { Domain } from '../domain/types';
import type { MathNode } from '../types';
import type {
	VariationResult,
	MonotonicInterval,
	ExtremumInfo,
	CriticalPointInfo,
	Monotonicity,
	ExtremumType,
	BoundaryLimit,
	LimitValue
} from './types';
import { toCustom } from '../custom-generator';
import { formatInterval as formatDomainInterval } from '../domain/format';
import { endpointToNumber } from '$lib/math/intervals/endpoint';

// =============================================================================
// Main Formatting Function
// =============================================================================

/**
 * Format a complete variation table for display.
 *
 * Returns a multi-line string with French notation containing:
 * - Expression and derivative
 * - Domain
 * - Critical points
 * - Sign of derivative and monotonicity
 * - Extrema
 * - Boundary limits (optional)
 *
 * @param result - The variation result to format
 * @returns A multi-line formatted string
 *
 * @example
 * const result = computeVariations(parseLatex('x^2'));
 * console.log(formatVariationTable(result));
 */
export function formatVariationTable(result: VariationResult): string {
	const v = result.variable;
	const lines: string[] = [];

	// Expression header
	lines.push(`Expression : ${toCustom(result.expression)}`);
	lines.push(`Derivee : f'(${v}) = ${toCustom(result.derivative)}`);
	lines.push('');

	// Domain
	lines.push(`Domaine : ${formatDomain(result.domain)}`);
	lines.push('');

	// Critical points
	lines.push(formatCriticalPoints(result.criticalPoints, v));
	lines.push('');

	// Sign of derivative and monotonicity
	lines.push(formatMonotonicIntervals(result.monotonicIntervals, v));
	lines.push('');

	// Extrema
	lines.push(formatExtrema(result.extrema));

	// Boundary limits (if available)
	if (result.boundaryLimits && result.boundaryLimits.length > 0) {
		lines.push('');
		lines.push(formatBoundaryLimits(result.boundaryLimits, v));
	}

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
// Section Formatting Functions
// =============================================================================

/**
 * Format critical points list.
 *
 * @param points - Array of critical point info
 * @param variable - The variable name
 * @returns Formatted string
 *
 * @example
 * formatCriticalPoints([{x: node(-1), ...}, {x: node(1), ...}], 'x')
 * // "Points critiques :\n  x = -1\n  x = 1"
 */
export function formatCriticalPoints(
	points: readonly CriticalPointInfo[],
	variable: string
): string {
	if (points.length === 0) {
		return 'Points critiques : aucun';
	}

	const lines: string[] = [];
	lines.push('Points critiques :');

	for (const point of points) {
		const xStr = toCustom(point.x);
		const nature = point.nature === 'derivative_zero' ? "(f'=0)" : "(f' non definie)";
		lines.push(`  ${variable} = ${xStr} ${nature}`);
	}

	return lines.join('\n');
}

/**
 * Format monotonic intervals with sign and monotonicity information.
 *
 * @param intervals - Array of monotonic intervals
 * @param variable - The variable name
 * @returns Formatted string
 *
 * @example
 * // "Signe de f'(x) :\n  ]-inf, 0[ : -  (f decroissante)\n  ...]"
 */
export function formatMonotonicIntervals(
	intervals: readonly MonotonicInterval[],
	variable: string
): string {
	if (intervals.length === 0) {
		return `Signe de f'(${variable}) : indetermine`;
	}

	const lines: string[] = [];
	lines.push(`Signe de f'(${variable}) :`);

	// Calculate max interval width for alignment
	const intervalStrs = intervals.map((mi) => formatSingleInterval(mi.interval));
	const maxWidth = Math.max(...intervalStrs.map((s) => s.length));

	for (let i = 0; i < intervals.length; i++) {
		const mi = intervals[i];
		const intervalStr = intervalStrs[i].padEnd(maxWidth);
		const signStr = getDerivativeSignSymbol(mi.derivativeSign);
		const monotonicityDesc = getMonotonicityShortDescription(mi.monotonicity);
		lines.push(`  ${intervalStr} : ${signStr}  (${monotonicityDesc})`);
	}

	return lines.join('\n');
}

/**
 * Format extrema list.
 *
 * @param extrema - Array of extremum info
 * @returns Formatted string
 *
 * @example
 * // "Extrema :\n  Minimum global : f(0) = 0"
 */
export function formatExtrema(extrema: readonly ExtremumInfo[]): string {
	if (extrema.length === 0) {
		return 'Extrema : aucun';
	}

	const lines: string[] = [];
	lines.push('Extrema :');

	for (const ext of extrema) {
		const typeStr = getExtremumTypeFr(ext.type);
		const xStr = toCustom(ext.x);
		const yStr = toCustom(ext.y);
		lines.push(`  ${typeStr} : f(${xStr}) = ${yStr}`);
	}

	return lines.join('\n');
}

/**
 * Format boundary limits.
 *
 * @param limits - Array of boundary limits
 * @param variable - The variable name
 * @returns Formatted string
 */
export function formatBoundaryLimits(limits: readonly BoundaryLimit[], variable: string): string {
	if (limits.length === 0) {
		return '';
	}

	const lines: string[] = [];
	lines.push('Limites aux bornes :');

	for (const bl of limits) {
		const pointStr = toCustom(bl.point);
		const limitStr = formatLimitValue(bl.limit);
		const dirStr = bl.direction === 'left' ? '^-' : bl.direction === 'right' ? '^+' : '';
		lines.push(`  lim_{${variable} -> ${pointStr}${dirStr}} f(${variable}) = ${limitStr}`);
	}

	return lines.join('\n');
}

// =============================================================================
// Symbol Functions
// =============================================================================

// Re-export getMonotonicitySymbol from monotonicity module
export { getMonotonicitySymbol } from './monotonicity';

/**
 * Get the sign symbol for derivative sign.
 *
 * @param sign - The derivative sign
 * @returns Sign symbol (+, -, 0, ?)
 */
export function getDerivativeSignSymbol(
	sign: 'positive' | 'negative' | 'zero' | 'unknown'
): string {
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
 * Get short French description of monotonicity.
 */
function getMonotonicityShortDescription(monotonicity: Monotonicity): string {
	switch (monotonicity) {
		case 'increasing':
			return 'f croissante';
		case 'decreasing':
			return 'f decroissante';
		case 'constant':
			return 'f constante';
		case 'unknown':
			return 'indetermine';
	}
}

/**
 * Get French extremum type description.
 */
function getExtremumTypeFr(type: ExtremumType): string {
	switch (type) {
		case 'local_minimum':
			return 'Minimum local';
		case 'local_maximum':
			return 'Maximum local';
		case 'global_minimum':
			return 'Minimum global';
		case 'global_maximum':
			return 'Maximum global';
	}
}

/**
 * Format a limit value for display.
 */
function formatLimitValue(value: LimitValue): string {
	if (value === 'infinity') return '+inf';
	if (value === 'negative_infinity') return '-inf';
	if (value === 'indeterminate') return 'indetermine';
	return toCustom(value);
}

// =============================================================================
// Compact Format (Single Line Summary)
// =============================================================================

/**
 * Format a compact one-line summary of variations.
 *
 * @param result - The variation result
 * @returns A single-line summary
 *
 * @example
 * formatVariationSummary(result)
 * // "f' = 2x ; croissante sur ]0, +inf[, decroissante sur ]-inf, 0[ ; min en x=0"
 */
export function formatVariationSummary(result: VariationResult): string {
	const parts: string[] = [];
	const v = result.variable;

	// Derivative
	parts.push(`f'(${v}) = ${toCustom(result.derivative)}`);

	// Monotonicity summary
	const monoParts: string[] = [];
	for (const mi of result.monotonicIntervals) {
		if (mi.monotonicity !== 'unknown') {
			const dir = mi.monotonicity === 'increasing' ? 'croissante' : 'decroissante';
			monoParts.push(`${dir} sur ${formatSingleInterval(mi.interval)}`);
		}
	}
	if (monoParts.length > 0) {
		parts.push(monoParts.join(', '));
	}

	// Extrema summary
	const extremaParts: string[] = [];
	for (const ext of result.extrema) {
		const type = ext.type.includes('minimum') ? 'min' : 'max';
		const global = ext.type.includes('global') ? ' global' : '';
		extremaParts.push(`${type}${global} en ${v}=${toCustom(ext.x)}`);
	}
	if (extremaParts.length > 0) {
		parts.push(extremaParts.join(', '));
	}

	return parts.join(' ; ');
}
