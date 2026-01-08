/**
 * Interval formatting functions.
 *
 * Formats intervals for display using:
 * - French interval notation: ]a, b[
 * - Mathematical symbols: ℝ, ∪, ∞
 * - Exact algebraic bounds: √2, 3/2
 * - Condition notation: x > 0
 */

import type { IntervalDomain, Interval, EndpointValue, IntervalSet } from './types';
import { algebraicToNumber } from '$lib/mathAST/normal/algebraic';
import { isUniversal } from './algebra';

// =============================================================================
// Main API
// =============================================================================

/**
 * Format a domain as an interval notation string.
 *
 * Uses French notation: ]a, b[ for open intervals.
 *
 * @example
 * formatDomainInterval(positiveReals()) // → "]0, +∞["
 * formatDomainInterval(unitInterval()) // → "[-1, 1]"
 * formatDomainInterval(nonZeroReals()) // → "ℝ \\ {0}"
 */
export function formatDomainInterval(domain: IntervalDomain): string {
	switch (domain.kind) {
		case 'empty':
			return '∅';
		case 'universal':
			return 'ℝ';
		case 'interval_set':
			return formatIntervalSet(domain);
	}
}

/**
 * Format a domain as a condition string.
 *
 * @example
 * formatDomainCondition(positiveReals(), 'x') // → "x > 0"
 * formatDomainCondition(unitInterval(), 'x') // → "-1 ≤ x ≤ 1"
 */
export function formatDomainCondition(domain: IntervalDomain, variable: string = 'x'): string {
	switch (domain.kind) {
		case 'empty':
			return 'aucune valeur';
		case 'universal':
			return `${variable} ∈ ℝ`;
		case 'interval_set':
			return formatIntervalSetAsCondition(domain, variable);
	}
}

/**
 * Format both interval and condition representations.
 */
export function formatDomainFull(
	domain: IntervalDomain,
	variable: string = 'x'
): {
	interval: string;
	condition: string;
} {
	return {
		interval: formatDomainInterval(domain),
		condition: formatDomainCondition(domain, variable)
	};
}

// =============================================================================
// Interval Formatting
// =============================================================================

function formatIntervalSet(domain: IntervalSet): string {
	if (domain.intervals.length === 0) {
		return '∅';
	}

	const intervalStrs = domain.intervals.map(formatInterval);

	// Check for full real line
	if (intervalStrs.length === 1 && intervalStrs[0] === ']-∞, +∞[') {
		if (domain.excludedPoints.length === 0) {
			return 'ℝ';
		}
		return `ℝ \\ {${domain.excludedPoints.map((p) => formatEndpointValue(p.value)).join(', ')}}`;
	}

	let result = intervalStrs.join(' ∪ ');

	// Add excluded points if any
	if (domain.excludedPoints.length > 0) {
		const excludedStr = domain.excludedPoints.map((p) => formatEndpointValue(p.value)).join(', ');
		result += ` \\ {${excludedStr}}`;
	}

	return result;
}

function formatInterval(interval: Interval): string {
	const leftBracket = interval.lower.type === 'closed' ? '[' : ']';
	const rightBracket = interval.upper.type === 'closed' ? ']' : '[';
	const lower = formatEndpointValue(interval.lower.value);
	const upper = formatEndpointValue(interval.upper.value);

	return `${leftBracket}${lower}, ${upper}${rightBracket}`;
}

/**
 * Format an endpoint value as a string.
 *
 * - Infinity: "-∞" or "+∞"
 * - Algebraic: Formatted with algebraicToLatex (simplified for text)
 *
 * @example
 * formatEndpointValue({ kind: 'infinity', value: 'positive_infinity' }) // → "+∞"
 * formatEndpointValue({ kind: 'algebraic', value: ... }) // → "√2" or "3/2"
 */
export function formatEndpointValue(value: EndpointValue): string {
	if (value.kind === 'infinity') {
		return value.value === 'negative_infinity' ? '-∞' : '+∞';
	}

	// Algebraic value - try to format nicely
	const alg = value.value;

	// Simple case: single rational term (no radicals)
	if (alg.terms.length === 1) {
		const term = alg.terms[0];
		if (term.radicals.length === 0) {
			// Pure rational
			const { n, d } = term.rational;
			if (d === 1n) {
				return String(n);
			}
			return `${n}/${d}`;
		}

		// Single radical term: c * sqrt(r)
		if (term.radicals.length === 1 && term.radicals[0].index === 2n) {
			const { n, d } = term.rational;
			const radicand = term.radicals[0].radicand;

			// sqrt(r) with coefficient 1
			if (n === 1n && d === 1n) {
				return `√${radicand}`;
			}

			// -sqrt(r)
			if (n === -1n && d === 1n) {
				return `-√${radicand}`;
			}

			// c * sqrt(r) where c is integer
			if (d === 1n) {
				return `${n}√${radicand}`;
			}

			// (n/d) * sqrt(r)
			return `(${n}/${d})√${radicand}`;
		}
	}

	// Complex case: fall back to numeric approximation
	const num = algebraicToNumber(alg);
	if (Number.isInteger(num)) {
		return String(num);
	}
	// Format with reasonable precision
	return num.toFixed(4).replace(/\.?0+$/, '');
}

// =============================================================================
// Condition Formatting
// =============================================================================

function formatIntervalSetAsCondition(domain: IntervalSet, variable: string): string {
	if (domain.intervals.length === 0) {
		return 'aucune valeur';
	}

	// Check if it's the real line
	if (isUniversal(domain)) {
		return `${variable} ∈ ℝ`;
	}

	const conditions: string[] = [];

	for (const interval of domain.intervals) {
		const cond = formatIntervalAsCondition(interval, variable);
		if (cond) conditions.push(cond);
	}

	// Handle excluded points
	if (domain.excludedPoints.length > 0) {
		for (const ep of domain.excludedPoints) {
			conditions.push(`${variable} ≠ ${formatEndpointValue(ep.value)}`);
		}
	}

	if (conditions.length === 0) {
		return `${variable} ∈ ℝ`;
	}

	// Join with "et" (and) or "ou" (or) depending on structure
	if (domain.intervals.length > 1) {
		// Multiple disjoint intervals: use "ou"
		const intervalConds = domain.intervals.map((i) => formatIntervalAsCondition(i, variable));
		const excludedConds = domain.excludedPoints.map(
			(ep) => `${variable} ≠ ${formatEndpointValue(ep.value)}`
		);
		const allConds = [...intervalConds.filter(Boolean), ...excludedConds];
		return allConds.join(' ou ');
	}

	return conditions.join(' et ');
}

function formatIntervalAsCondition(interval: Interval, variable: string): string {
	const lower = interval.lower;
	const upper = interval.upper;

	const isLowerInf = lower.value.kind === 'infinity' && lower.value.value === 'negative_infinity';
	const isUpperInf = upper.value.kind === 'infinity' && upper.value.value === 'positive_infinity';

	if (isLowerInf && isUpperInf) {
		return `${variable} ∈ ℝ`;
	}

	if (isLowerInf) {
		const op = upper.type === 'closed' ? '≤' : '<';
		return `${variable} ${op} ${formatEndpointValue(upper.value)}`;
	}

	if (isUpperInf) {
		const op = lower.type === 'closed' ? '≥' : '>';
		return `${variable} ${op} ${formatEndpointValue(lower.value)}`;
	}

	// Bounded interval
	const lowerVal = formatEndpointValue(lower.value);
	const upperVal = formatEndpointValue(upper.value);
	const lowerOp = lower.type === 'closed' ? '≤' : '<';
	const upperOp = upper.type === 'closed' ? '≤' : '<';

	return `${lowerVal} ${lowerOp} ${variable} ${upperOp} ${upperVal}`;
}
